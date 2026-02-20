import mongoose, { Document, Schema } from "mongoose";

export interface IModerationAction extends Document {
    actionId: string;
    actorUserId: string;
    targetType: string;
    targetId: string;
    action: string;
    metadata: Record<string, unknown>;
    undone: boolean;
    undoUntil: Date;
    createdAt: Date;
}

const ModerationActionSchema = new Schema<IModerationAction>(
    {
        actionId: { type: String, required: true, unique: true },
        actorUserId: { type: String, required: true, index: true },
        targetType: { type: String, required: true, index: true },
        targetId: { type: String, required: true, index: true },
        action: { type: String, required: true, index: true },
        metadata: { type: Schema.Types.Mixed, default: {} },
        undone: { type: Boolean, required: true, default: false },
        undoUntil: { type: Date, required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

export const ModerationActionModel = mongoose.model<IModerationAction>("ModerationAction", ModerationActionSchema);
