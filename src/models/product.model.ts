import mongoose, { Document, Schema } from "mongoose";

export type ProductMode = "buy_now" | "auction" | "donate";

export interface IProduct extends Document {
    productId: string;
    sellerId: string;
    title: string;
    description: string;
    category: string;
    images: string[];
    priceListed: number;
    aiSuggestedPrice: number;
    aiCondition: string;
    aiVerified: boolean;
    aiConfidence: number;
    imageHash: string;
    mode: ProductMode;
    flagged: boolean;
    activeUntil?: Date;
    location: string;
    createdAt: Date;
}

const ProductSchema = new Schema<IProduct>(
    {
        productId: { type: String, required: true, unique: true },
        sellerId: { type: String, required: true, index: true },
        title: { type: String, required: true },
        description: { type: String, required: true },
        category: { type: String, required: true },
        images: { type: [String], required: true, default: [] },
        priceListed: { type: Number, required: true },
        aiSuggestedPrice: { type: Number, required: true },
        aiCondition: { type: String, required: true },
        aiVerified: { type: Boolean, required: true, default: true },
        aiConfidence: { type: Number, required: true, default: 1 },
        imageHash: { type: String, required: true, index: true },
        mode: {
            type: String,
            enum: ["buy_now", "auction", "donate"],
            required: true,
        },
        flagged: { type: Boolean, required: true, default: false },
        activeUntil: { type: Date },
        location: { type: String, required: true },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

export const ProductModel = mongoose.model<IProduct>("Product", ProductSchema);
