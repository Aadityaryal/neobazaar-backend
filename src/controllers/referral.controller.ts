import { Response } from "express";
import { randomUUID } from "crypto";
import { ReferralModel } from "../models/referral.model";
import { UserModel } from "../models/user.model";
import { AuthenticatedRequest } from "../types/auth.type";

export class ReferralController {
    async createAttribution(req: AuthenticatedRequest, res: Response) {
        const referrerUserId = req.auth?.userId;
        if (!referrerUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const input = req.validatedBody as { code: string; referredUserId: string };

        if (input.referredUserId === referrerUserId) {
            return res.status(400).json({ success: false, message: "Self-referrals are not allowed" });
        }

        const existingForReferred = await ReferralModel.findOne({ referredUserId: input.referredUserId }).lean();
        if (existingForReferred) {
            return res.status(409).json({ success: false, message: "Referral already attributed for this user" });
        }

        const referral = await ReferralModel.create({
            referralId: randomUUID(),
            referrerUserId,
            referredUserId: input.referredUserId,
            code: input.code,
            status: "pending",
        });

        return res.status(201).json({ success: true, data: referral });
    }

    async listMine(req: AuthenticatedRequest, res: Response) {
        const userId = req.auth?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const referrals = await ReferralModel.find({ referrerUserId: userId }).sort({ createdAt: -1 }).lean();
        return res.status(200).json({ success: true, data: referrals });
    }

    async markQualified(req: AuthenticatedRequest, res: Response) {
        if (req.auth?.role !== "admin") {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }

        const referral = await ReferralModel.findOne({ referralId: req.params.referralId });
        if (!referral) {
            return res.status(404).json({ success: false, message: "Referral not found" });
        }

        referral.status = "qualified";
        await referral.save();

        await UserModel.updateOne({ userId: referral.referrerUserId }, { $inc: { neoTokens: 50, xp: 20 } });

        return res.status(200).json({ success: true, data: referral });
    }
}
