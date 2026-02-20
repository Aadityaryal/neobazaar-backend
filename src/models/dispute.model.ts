import mongoose, { Document, Schema } from "mongoose";

export interface IDispute extends Document {
    disputeId: string;
    transactionId: string;
    orderId?: string;
    openedByUserId: string;
    againstUserId: string;
    reason: string;
    evidenceUrls: string[];
    status: "open" | "under_review" | "resolved" | "rejected";
    resolutionNote?: string;
    createdAt: Date;
    updatedAt: Date;
}

const DisputeSchema = new Schema<IDispute>(
    {
        disputeId: { type: String, required: true, unique: true },
        transactionId: { type: String, required: true, index: true },
        orderId: { type: String, index: true },
        openedByUserId: { type: String, required: true, index: true },
        againstUserId: { type: String, required: true, index: true },
        reason: { type: String, required: true },
        evidenceUrls: { type: [String], default: [] },
        status: {
            type: String,
            required: true,
            enum: ["open", "under_review", "resolved", "rejected"],
            default: "open",
        },
        resolutionNote: { type: String },
    },
    { timestamps: true }
);

export const DisputeModel = mongoose.model<IDispute>("Dispute", DisputeSchema);
