import mongoose, { Document, Schema } from "mongoose";

export interface IOrder extends Document {
    orderId: string;
    buyerId: string;
    sellerId: string;
    productId: string;
    transactionId: string;
    status: "created" | "paid" | "in_transit" | "delivered" | "completed" | "cancelled" | "disputed";
    timeline: Array<{ at: Date; status: string; actor: string; note?: string }>;
    createdAt: Date;
    updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
    {
        orderId: { type: String, required: true, unique: true },
        buyerId: { type: String, required: true, index: true },
        sellerId: { type: String, required: true, index: true },
        productId: { type: String, required: true, index: true },
        transactionId: { type: String, required: true, index: true },
        status: {
            type: String,
            required: true,
            enum: ["created", "paid", "in_transit", "delivered", "completed", "cancelled", "disputed"],
            default: "created",
        },
        timeline: {
            type: [
                {
                    at: { type: Date, required: true },
                    status: { type: String, required: true },
                    actor: { type: String, required: true },
                    note: { type: String },
                },
            ],
            default: [],
        },
    },
    { timestamps: true }
);

export const OrderModel = mongoose.model<IOrder>("Order", OrderSchema);
