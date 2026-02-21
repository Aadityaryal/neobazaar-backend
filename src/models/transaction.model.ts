import mongoose, { Document, Schema } from "mongoose";

export interface ITransaction extends Document {
    txnId: string;
    buyerId: string;
    sellerId: string;
    productId: string;
    tokenAmount: number;
    heldTokens: number;
    mode: string;
    status: string;
    buyerConfirmed: boolean;
    sellerConfirmed: boolean;
    merkleHash: string;
    createdAt: Date;
    confirmedAt?: Date;
    disputedAt?: Date;
}

const TransactionSchema = new Schema<ITransaction>(
    {
        txnId: { type: String, required: true, unique: true },
        buyerId: { type: String, required: true, index: true },
        sellerId: { type: String, required: true, index: true },
        productId: { type: String, required: true, index: true },
        tokenAmount: { type: Number, required: true },
        heldTokens: { type: Number, required: true, default: 0 },
        mode: { type: String, required: true },
        status: { type: String, required: true, enum: ["pending", "escrow", "completed", "disputed", "refunded"], default: "escrow" },
        buyerConfirmed: { type: Boolean, required: true, default: false },
        sellerConfirmed: { type: Boolean, required: true, default: false },
        merkleHash: { type: String, required: true, default: "" },
        confirmedAt: { type: Date },
        disputedAt: { type: Date },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

export const TransactionModel = mongoose.model<ITransaction>("Transaction", TransactionSchema);
