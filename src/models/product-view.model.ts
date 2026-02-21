import mongoose, { Document, Schema } from "mongoose";

export interface IProductView extends Document {
    viewId: string;
    userId: string;
    productId: string;
    viewedAt: Date;
}

const ProductViewSchema = new Schema<IProductView>(
    {
        viewId: { type: String, required: true, unique: true },
        userId: { type: String, required: true, index: true },
        productId: { type: String, required: true, index: true },
        viewedAt: { type: Date, required: true, default: Date.now, index: true },
    },
    {
        timestamps: false,
    }
);

ProductViewSchema.index({ userId: 1, productId: 1 }, { unique: true });

export const ProductViewModel = mongoose.model<IProductView>("ProductView", ProductViewSchema);
