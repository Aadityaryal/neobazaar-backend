import mongoose, { Document, Schema } from "mongoose";

export interface IQuest extends Document {
    questId: string;
    title: string;
    description: string;
    rewardTokens: number;
    rewardXP: number;
    activeUntil: Date;
}

export interface IUserQuest extends Document {
    userQuestId: string;
    userId: string;
    questId: string;
    completedAt: Date;
    rewarded: boolean;
}

const QuestSchema = new Schema<IQuest>(
    {
        questId: { type: String, required: true, unique: true },
        title: { type: String, required: true },
        description: { type: String, required: true },
        rewardTokens: { type: Number, required: true },
        rewardXP: { type: Number, required: true },
        activeUntil: { type: Date, required: true },
    },
    { timestamps: false }
);

const UserQuestSchema = new Schema<IUserQuest>(
    {
        userQuestId: { type: String, required: true, unique: true },
        userId: { type: String, required: true, index: true },
        questId: { type: String, required: true, index: true },
        completedAt: { type: Date, required: true, default: Date.now },
        rewarded: { type: Boolean, required: true, default: false },
    },
    { timestamps: false }
);

UserQuestSchema.index({ userId: 1, questId: 1 }, { unique: true });

export const QuestModel = mongoose.model<IQuest>("Quest", QuestSchema);
export const UserQuestModel = mongoose.model<IUserQuest>("UserQuest", UserQuestSchema);
