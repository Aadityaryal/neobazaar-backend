import mongoose, { Document, Schema } from "mongoose";

export interface IReferral extends Document {
    referralId: string;
    referrerUserId: string;
    referredUserId: string;
    code: string;
    status: "pending" | "qualified" | "rewarded" | "blocked";
    createdAt: Date;
    updatedAt: Date;
}

const ReferralSchema = new Schema<IReferral>(
    {
        referralId: { type: String, required: true, unique: true },
        referrerUserId: { type: String, required: true, index: true },
        referredUserId: { type: String, required: true, unique: true, index: true },
        code: { type: String, required: true, index: true },
        status: {
            type: String,
            required: true,
            enum: ["pending", "qualified", "rewarded", "blocked"],
            default: "pending",
        },
    },
    { timestamps: true }
);

export const ReferralModel = mongoose.model<IReferral>("Referral", ReferralSchema);
