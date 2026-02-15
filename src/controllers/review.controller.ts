import { Response } from "express";
import { randomUUID } from "crypto";
import { ReviewModel } from "../models/review.model";
import { TransactionModel } from "../models/transaction.model";
import { AuthenticatedRequest } from "../types/auth.type";
import { recomputeReputationScoreForUser } from "../services/reputation-recompute.service";

export class ReviewController {
    async createReview(req: AuthenticatedRequest, res: Response) {
        const reviewerId = req.auth?.userId;
        if (!reviewerId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const input = req.validatedBody as {
            transactionId: string;
            productId: string;
            revieweeId: string;
            rating: number;
            comment?: string;
        };

        const transaction = await TransactionModel.findOne({ txnId: input.transactionId }).lean();
        if (!transaction || transaction.status !== "completed") {
            return res.status(400).json({ success: false, message: "Review allowed only for completed transactions" });
        }

        const isParticipant = transaction.buyerId === reviewerId || transaction.sellerId === reviewerId;
        if (!isParticipant) {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }

        const existing = await ReviewModel.findOne({ transactionId: input.transactionId, reviewerId }).lean();
        if (existing) {
            return res.status(409).json({ success: false, message: "Review already submitted" });
        }

        const review = await ReviewModel.create({
            reviewId: randomUUID(),
            transactionId: input.transactionId,
            productId: input.productId,
            reviewerId,
            revieweeId: input.revieweeId,
            rating: input.rating,
            comment: input.comment,
            status: "visible",
        });

        await recomputeReputationScoreForUser(input.revieweeId);

        return res.status(201).json({ success: true, data: review });
    }

    async listByProduct(req: AuthenticatedRequest, res: Response) {
        const reviews = await ReviewModel.find({ productId: req.params.productId, status: "visible" })
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({ success: true, data: reviews });
    }

    async flagReview(req: AuthenticatedRequest, res: Response) {
        if (req.auth?.role !== "admin") {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }

        const review = await ReviewModel.findOne({ reviewId: req.params.reviewId });
        if (!review) {
            return res.status(404).json({ success: false, message: "Review not found" });
        }

        review.status = "flagged";
        await review.save();

        await recomputeReputationScoreForUser(review.revieweeId);

        return res.status(200).json({ success: true, data: review });
    }
}
