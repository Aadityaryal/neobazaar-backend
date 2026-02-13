import { Response } from "express";
import { leaderboardTabSchema } from "../dtos/mvp.dto";
import { AuthenticatedRequest } from "../types/auth.type";
import { UserModel } from "../models/user.model";

export class LeaderboardController {
    async getLeaderboard(req: AuthenticatedRequest, res: Response) {
        const parsed = leaderboardTabSchema.safeParse({ tab: req.query.tab?.toString() ?? "global" });
        if (!parsed.success) {
            return res.status(400).json({ success: false, message: "Invalid tab" });
        }

        let query: Record<string, unknown> = {};
        if (parsed.data.tab === "local") {
            const requestUser = await UserModel.findOne({ userId: req.auth?.userId }).lean();
            if (!requestUser) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            query = { location: requestUser.location };
        }

        const users = await UserModel.find(query)
            .select("userId name xp reputationScore location badges")
            .sort({ xp: -1, reputationScore: -1 })
            .lean();

        return res.status(200).json({ success: true, data: users });
    }
}
