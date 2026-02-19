import mongoose, { Document, Schema } from "mongoose";

export interface IAuditLog extends Document {
    auditId: string;
    actorUserId: string;
    action: string;
    entityType: string;
    entityId: string;
    payload: Record<string, unknown>;
    createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
    {
        auditId: { type: String, required: true, unique: true },
        actorUserId: { type: String, required: true, index: true },
        action: { type: String, required: true, index: true },
        entityType: { type: String, required: true, index: true },
        entityId: { type: String, required: true, index: true },
        payload: { type: Schema.Types.Mixed, required: true, default: {} },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

export const AuditLogModel = mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
