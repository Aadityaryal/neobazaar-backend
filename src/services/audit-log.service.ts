import { randomUUID } from "crypto";
import { AuditLogModel } from "../models/audit-log.model";

export async function appendAuditLog(input: {
    actorUserId: string;
    action: string;
    entityType: string;
    entityId: string;
    payload?: Record<string, unknown>;
}) {
    return AuditLogModel.create({
        auditId: randomUUID(),
        actorUserId: input.actorUserId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        payload: input.payload ?? {},
    });
}

export async function queryAuditLogs(input: {
    actorUserId?: string;
    action?: string;
    entityType?: string;
    page: number;
    limit: number;
}) {
    const query: Record<string, unknown> = {};
    if (input.actorUserId) query.actorUserId = input.actorUserId;
    if (input.action) query.action = input.action;
    if (input.entityType) query.entityType = input.entityType;

    const [rows, total] = await Promise.all([
        AuditLogModel.find(query)
            .sort({ createdAt: -1 })
            .skip((input.page - 1) * input.limit)
            .limit(input.limit)
            .lean(),
        AuditLogModel.countDocuments(query),
    ]);

    return {
        rows,
        total,
    };
}

export async function pruneAuditLogs(retentionDays: number) {
    const safeRetentionDays = Math.max(retentionDays, 1);
    const threshold = new Date(Date.now() - safeRetentionDays * 24 * 60 * 60 * 1000);
    const result = await AuditLogModel.deleteMany({ createdAt: { $lt: threshold } });

    return {
        retentionDays: safeRetentionDays,
        threshold,
        deletedCount: result.deletedCount ?? 0,
    };
}
