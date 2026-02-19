import mongoose, { Document, Schema } from "mongoose";

export interface IAdminFlag extends Document {
    flagId: string;
    productId: string;
    sellerId: string;
    reason: "duplicate_image" | "transaction_dispute";
    detectedAt: Date;
    resolved: boolean;
}

const AdminFlagSchema = new Schema<IAdminFlag>(
    {
        flagId: { type: String, required: true, unique: true },
        productId: { type: String, required: true },
        sellerId: { type: String, required: true },
        reason: { type: String, required: true, enum: ["duplicate_image", "transaction_dispute"] },
        detectedAt: { type: Date, required: true, default: Date.now },
        resolved: { type: Boolean, required: true, default: false },
    },
    { timestamps: false }
);

export const AdminFlagModel = mongoose.model<IAdminFlag>("AdminFlag", AdminFlagSchema);
