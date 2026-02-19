import mongoose, { Document, Schema } from "mongoose";

export interface ICampaign extends Document {
    campaignId: string;
    ownerUserId: string;
    title: string;
    description?: string;
    status: "draft" | "active" | "paused" | "ended";
    startsAt: Date;
    endsAt: Date;
    budgetTokens: number;
    spendTokens: number;
    createdAt: Date;
    updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
    {
        campaignId: { type: String, required: true, unique: true },
        ownerUserId: { type: String, required: true, index: true },
        title: { type: String, required: true },
        description: { type: String },
        status: {
            type: String,
            required: true,
            enum: ["draft", "active", "paused", "ended"],
            default: "draft",
        },
        startsAt: { type: Date, required: true },
        endsAt: { type: Date, required: true },
        budgetTokens: { type: Number, required: true, default: 0 },
        spendTokens: { type: Number, required: true, default: 0 },
    },
    { timestamps: true }
);

export const CampaignModel = mongoose.model<ICampaign>("Campaign", CampaignSchema);
