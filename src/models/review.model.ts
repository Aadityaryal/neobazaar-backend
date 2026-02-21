import mongoose, { Document, Schema } from "mongoose";

export interface IReview extends Document {
    reviewId: string;
    transactionId: string;
    productId: string;
    reviewerId: string;
    revieweeId: string;
    rating: number;
    comment?: string;
    status: "visible" | "hidden" | "flagged";
    createdAt: Date;
    updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
    {
        reviewId: { type: String, required: true, unique: true },
        transactionId: { type: String, required: true, index: true },
        productId: { type: String, required: true, index: true },
        reviewerId: { type: String, required: true, index: true },
        revieweeId: { type: String, required: true, index: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String },
        status: {
            type: String,
            required: true,
            enum: ["visible", "hidden", "flagged"],
            default: "visible",
        },
    },
    { timestamps: true }
);

export const ReviewModel = mongoose.model<IReview>("Review", ReviewSchema);
