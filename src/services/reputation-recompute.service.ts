import cron from "node-cron";
import mongoose from "mongoose";
import { ReviewModel } from "../models/review.model";
import { UserModel } from "../models/user.model";

export async function recomputeReputationScoreForUser(userId: string) {
    const aggregate = await ReviewModel.aggregate([
        { $match: { revieweeId: userId, status: "visible" } },
        { $group: { _id: "$revieweeId", avgRating: { $avg: "$rating" } } },
    ]);

    const avgRating = aggregate[0]?.avgRating ?? 0;
    const computedScore = avgRating > 0 ? Math.round((avgRating / 5) * 100) : 0;

    await UserModel.updateOne(
        { userId },
        { $set: { reputationScore: computedScore } }
    );

    return {
        userId,
        reputationScore: computedScore,
    };
}

export async function recomputeReputationScores() {
    const aggregates = await ReviewModel.aggregate([
        { $match: { status: "visible" } },
        { $group: { _id: "$revieweeId", avgRating: { $avg: "$rating" }, reviews: { $sum: 1 } } },
    ]);

    for (const item of aggregates) {
        const computedScore = Math.round((item.avgRating / 5) * 100);
        await UserModel.updateOne(
            { userId: item._id },
            { $set: { reputationScore: computedScore } }
        );
    }

    return {
        updatedUsers: aggregates.length,
    };
}

export function startReputationRecomputeCron() {
    cron.schedule("*/30 * * * *", async () => {
        if (mongoose.connection.readyState !== 1) {
            console.warn(
                JSON.stringify({
                    job: "reputation_recompute",
                    status: "skipped",
                    reason: "mongodb_not_connected",
                    readyState: mongoose.connection.readyState,
                })
            );
            return;
        }

        try {
            const result = await recomputeReputationScores();
            console.info(JSON.stringify({ job: "reputation_recompute", ...result }));
        } catch (error) {
            console.error("reputation_recompute_failed", error);
        }
    });
}
