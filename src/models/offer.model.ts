import mongoose, { Document, Schema } from "mongoose";

export interface IOffer extends Document {
    offerId: string;
    productId: string;
    buyerId: string;
    sellerId: string;
    amount: number;
    status: "pending" | "accepted" | "rejected" | "countered" | "expired";
    counterAmount?: number;
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const OfferSchema = new Schema<IOffer>(
    {
        offerId: { type: String, required: true, unique: true },
        productId: { type: String, required: true, index: true },
        buyerId: { type: String, required: true, index: true },
        sellerId: { type: String, required: true, index: true },
        amount: { type: Number, required: true },
        status: {
            type: String,
            required: true,
            enum: ["pending", "accepted", "rejected", "countered", "expired"],
            default: "pending",
        },
        counterAmount: { type: Number },
        expiresAt: { type: Date },
    },
    { timestamps: true }
);

export const OfferModel = mongoose.model<IOffer>("Offer", OfferSchema);
