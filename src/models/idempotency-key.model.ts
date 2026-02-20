import mongoose, { Document, Schema } from "mongoose";

export interface IIdempotencyKey extends Document {
    key: string;
    scope: string;
    statusCode: number;
    responseBody: unknown;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const IdempotencyKeySchema = new Schema<IIdempotencyKey>(
    {
        key: { type: String, required: true },
        scope: { type: String, required: true },
        statusCode: { type: Number, required: true },
        responseBody: { type: Schema.Types.Mixed, required: true },
        expiresAt: { type: Date, required: true, index: { expires: 0 } },
    },
    { timestamps: true }
);

IdempotencyKeySchema.index({ key: 1, scope: 1 }, { unique: true });

export const IdempotencyKeyModel = mongoose.model<IIdempotencyKey>("IdempotencyKey", IdempotencyKeySchema);
