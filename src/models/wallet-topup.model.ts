import mongoose, { Document, Schema } from "mongoose";

export interface IWalletTopUp extends Document {
    topUpId: string;
    userId: string;
    provider: "esewa" | "khalti" | "imepay";
    tokensCredited: number;
    createdAt: Date;
}

const WalletTopUpSchema = new Schema<IWalletTopUp>(
    {
        topUpId: { type: String, required: true, unique: true },
        userId: { type: String, required: true, index: true },
        provider: { type: String, required: true, enum: ["esewa", "khalti", "imepay"] },
        tokensCredited: { type: Number, required: true, default: 100 },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

export const WalletTopUpModel = mongoose.model<IWalletTopUp>("WalletTopUp", WalletTopUpSchema);
