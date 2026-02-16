import { Request, Response } from "express";
import { AdminFlagModel } from "../models/admin-flag.model";
import { TransactionModel } from "../models/transaction.model";

export class RiskController {
    async scoreUser(req: Request, res: Response) {
        const userId = req.params.userId;

        const [flags, disputes, completed] = await Promise.all([
            AdminFlagModel.countDocuments({ sellerId: userId, resolved: false }),
            TransactionModel.countDocuments({ $or: [{ buyerId: userId }, { sellerId: userId }], status: "disputed" }),
            TransactionModel.countDocuments({ $or: [{ buyerId: userId }, { sellerId: userId }], status: "completed" }),
        ]);

        const rawScore = Math.min(100, flags * 30 + disputes * 15 - Math.min(completed, 20));
        const score = Math.max(rawScore, 0);

        return res.status(200).json({
            success: true,
            data: {
                userId,
                score,
                factors: {
                    openFlags: flags,
                    disputes,
                    completedTransactions: completed,
                },
                band: score >= 70 ? "high" : score >= 40 ? "medium" : "low",
            },
        });
    }
}
