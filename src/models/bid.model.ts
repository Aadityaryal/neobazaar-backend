import mongoose, { Document, Schema } from "mongoose";

export interface IBid extends Document {
    bidId: string;
    productId: string;
    bidderId: string;
    amount: number;
    timestamp: Date;
}

const BidSchema = new Schema<IBid>(
    {
        bidId: { type: String, required: true, unique: true },
        productId: { type: String, required: true, index: true },
        bidderId: { type: String, required: true, index: true },
        amount: { type: Number, required: true },
        timestamp: { type: Date, required: true, default: Date.now },
    },
    {
        timestamps: false,
    }
);

export const BidModel = mongoose.model<IBid>("Bid", BidSchema);
