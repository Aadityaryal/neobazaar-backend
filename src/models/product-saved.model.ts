import mongoose, { Document, Schema } from "mongoose";

export interface IProductSaved extends Document {
    savedId: string;
    userId: string;
    productId: string;
    savedAt: Date;
}

const ProductSavedSchema = new Schema<IProductSaved>(
    {
        savedId: { type: String, required: true, unique: true },
        userId: { type: String, required: true, index: true },
        productId: { type: String, required: true, index: true },
        savedAt: { type: Date, required: true, default: Date.now, index: true },
    },
    {
        timestamps: false,
    }
);

ProductSavedSchema.index({ userId: 1, productId: 1 }, { unique: true });

export const ProductSavedModel = mongoose.model<IProductSaved>("ProductSaved", ProductSavedSchema);
