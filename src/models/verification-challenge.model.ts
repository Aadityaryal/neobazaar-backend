import mongoose, { Document, Schema } from "mongoose";

export interface IVerificationChallenge extends Document {
    challengeId: string;
    userId: string;
    channel: "email";
    code: string;
    expiresAt: Date;
    attempts: number;
    consumedAt?: Date;
}

const VerificationChallengeSchema = new Schema<IVerificationChallenge>(
    {
        challengeId: { type: String, required: true, unique: true, index: true },
        userId: { type: String, required: true, index: true },
        channel: { type: String, enum: ["email"], default: "email" },
        code: { type: String, required: true },
        expiresAt: { type: Date, required: true, index: true },
        attempts: { type: Number, default: 0 },
        consumedAt: { type: Date },
    },
    {
        timestamps: true,
    }
);

export const VerificationChallengeModel = mongoose.model<IVerificationChallenge>(
    "VerificationChallenge",
    VerificationChallengeSchema
);
