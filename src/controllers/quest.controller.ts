import { Request, Response } from "express";
import { randomUUID } from "crypto";
import mongoose from "mongoose";
import { QuestModel, UserQuestModel } from "../models/quest.model";
import { AuthenticatedRequest } from "../types/auth.type";
import { UserModel } from "../models/user.model";
import { applyQuestProgress } from "../services/progression.service";

export class QuestController {
    async createQuest(req: Request, res: Response) {
        const input = req.validatedBody as {
            title: string;
            description: string;
            rewardTokens: number;
            rewardXP: number;
            activeUntil: Date;
        };

        const quest = await QuestModel.create({
            questId: randomUUID(),
            ...input,
        });

        return res.status(201).json({ success: true, data: quest });
    }

    async listActiveQuests(req: Request, res: Response) {
        const quests = await QuestModel.find({ activeUntil: { $gt: new Date() } }).sort({ activeUntil: 1 }).lean();
        return res.status(200).json({ success: true, data: quests });
    }

    async completeQuest(req: AuthenticatedRequest, res: Response) {
        const userId = req.auth?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const quest = await QuestModel.findOne({ questId: req.params.questId }).session(session);
            if (!quest) {
                await session.abortTransaction();
                return res.status(404).json({ success: false, message: "Quest not found" });
            }
            if (quest.activeUntil.getTime() <= Date.now()) {
                await session.abortTransaction();
                return res.status(400).json({ success: false, message: "Quest expired" });
            }

            const existing = await UserQuestModel.findOne({ userId, questId: quest.questId }).session(session).lean();
            if (existing) {
                await session.abortTransaction();
                return res.status(400).json({ success: false, message: "Quest already completed" });
            }

            const [userQuest] = await UserQuestModel.create(
                [
                    {
                        userQuestId: randomUUID(),
                        userId,
                        questId: quest.questId,
                        completedAt: new Date(),
                        rewarded: true,
                    },
                ],
                { session }
            );

            const rewardUpdate = await UserModel.findOneAndUpdate(
                { userId },
                { $inc: { neoTokens: quest.rewardTokens, xp: quest.rewardXP } },
                { new: true, session }
            );

            if (!rewardUpdate) {
                await session.abortTransaction();
                return res.status(404).json({ success: false, message: "User not found" });
            }

            await applyQuestProgress(userId, session);

            const user = await UserModel.findOne({ userId }).session(session).lean();

            await session.commitTransaction();
            return res.status(200).json({ success: true, data: { userQuest, user } });
        } catch (error) {
            const mongoError = error as { code?: number };
            if (mongoError.code === 11000) {
                await session.abortTransaction();
                return res.status(400).json({ success: false, message: "Quest already completed" });
            }
            await session.abortTransaction();
            return res.status(500).json({ success: false, message: "Quest completion failed" });
        } finally {
            session.endSession();
        }
    }
}
