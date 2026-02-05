import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
    userId: string;
    name: string;
    email: string;
    emailVerified: boolean;
    passwordHash: string;
    role: "user" | "admin";
    neoTokens: number;
    xp: number;
    reputationScore: number;
    kycVerified: boolean;
    kycStatus: "draft" | "submitted" | "verified" | "rejected";
    badges: string[];
    location: string;
    completedTransactions: number;
    completedQuests: number;
    createdAt: Date;
}

const UserSchema: Schema = new Schema<IUser>(
    {
        userId: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true, index: true },
        emailVerified: { type: Boolean, default: false },
        passwordHash: { type: String, required: true },
        role: { type: String, enum: ["user", "admin"], default: "user" },
        neoTokens: { type: Number, default: 500 },
        xp: { type: Number, default: 0 },
        reputationScore: { type: Number, default: 0 },
        kycVerified: { type: Boolean, default: false },
        kycStatus: { type: String, enum: ["draft", "submitted", "verified", "rejected"], default: "draft" },
        badges: { type: [String], default: [] },
        location: { type: String, default: "" },
        completedTransactions: { type: Number, default: 0 },
        completedQuests: { type: Number, default: 0 },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

export const UserModel = mongoose.model<IUser>("User", UserSchema);