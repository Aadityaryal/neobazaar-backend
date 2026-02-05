import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { Parser } from "json2csv";
import PDFDocument from "pdfkit";
import { TransactionModel } from "../models/transaction.model";
import { UserModel } from "../models/user.model";
import { ProductModel } from "../models/product.model";
import { AdminFlagModel } from "../models/admin-flag.model";
import { AuthenticatedRequest } from "../types/auth.type";
import { appendAuditLog, pruneAuditLogs, queryAuditLogs } from "../services/audit-log.service";
import { ModerationActionModel } from "../models/moderation-action.model";
import { ExportJobModel } from "../models/export-job.model";
import { DisputeModel } from "../models/dispute.model";
import { OrderModel } from "../models/order.model";
import { SOCKET_EVENTS } from "../core/socket-events";
import { emitRealtimeEvent } from "../services/realtime-event.service";
import { createInAppNotification } from "../services/notification.service";
import { resolveNotificationRoute } from "../core/notification-routes";

const locationCoordinates: Record<string, { lat: number; lng: number }> = {
    Kathmandu: { lat: 27.7172, lng: 85.3240 },
    Pokhara: { lat: 28.2096, lng: 83.9856 },
    Lalitpur: { lat: 27.6644, lng: 85.3188 },
    Bhaktapur: { lat: 27.6710, lng: 85.4298 },
};

export class AdminController {
    private splitName(name: string) {
        const parts = name.trim().split(/\s+/).filter(Boolean);
        const firstName = parts[0] ?? "";
        const lastName = parts.slice(1).join(" ");
        return { firstName, lastName };
    }

    private toAdminUserPayload(user: Record<string, unknown>) {
        const { firstName, lastName } = this.splitName(String(user.name ?? ""));
        return {
            _id: String(user._id ?? ""),
            userId: String(user.userId ?? ""),
            name: String(user.name ?? ""),
            firstName,
            lastName,
            email: String(user.email ?? ""),
            role: String(user.role ?? "user"),
            location: String(user.location ?? ""),
            createdAt: user.createdAt,
        };
    }

    private buildExportPayload = async () => {
        const [users, products, transactions] = await Promise.all([
            UserModel.find().lean(),
            ProductModel.find().lean(),
            TransactionModel.find().lean(),
        ]);

        return {
            users,
            products,
            transactions,
        };
    };

    private renderCsv = (payload: {
        users: unknown[];
        products: unknown[];
        transactions: unknown[];
    }) => {
        const parser = new Parser();
        return parser.parse([
            ...payload.users.map((item) => ({ type: "user", ...item as Record<string, unknown> })),
            ...payload.products.map((item) => ({ type: "product", ...item as Record<string, unknown> })),
            ...payload.transactions.map((item) => ({ type: "transaction", ...item as Record<string, unknown> })),
        ]);
    };

    private renderPdfBuffer = async (payload: {
        users: unknown[];
        products: unknown[];
        transactions: unknown[];
    }) => {
        return new Promise<Buffer>((resolve, reject) => {
            const doc = new PDFDocument({ margin: 40 });
            const chunks: Buffer[] = [];
            doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.on("error", reject);

            doc.fontSize(18).text("NeoBazaar Export Report", { underline: true });
            doc.moveDown();
            doc.fontSize(12).text(`Users: ${payload.users.length}`);
            doc.text(`Products: ${payload.products.length}`);
            doc.text(`Transactions: ${payload.transactions.length}`);
            doc.moveDown();
            doc.fontSize(10).text(JSON.stringify(payload, null, 2));
            doc.end();
        });
    };

    private async processExportJob(jobId: string) {
        const job = await ExportJobModel.findOne({ exportJobId: jobId });
        if (!job) {
            return;
        }

        try {
            job.status = "processing";
            job.progress = 10;
            await job.save();

            const payload = await this.buildExportPayload();
            job.progress = 60;
            await job.save();

            const exportsDir = path.resolve(__dirname, "../../uploads/exports");
            await fs.promises.mkdir(exportsDir, { recursive: true });

            const fileName = `${job.exportJobId}.${job.format}`;
            const filePath = path.join(exportsDir, fileName);

            if (job.format === "csv") {
                const csv = this.renderCsv(payload);
                await fs.promises.writeFile(filePath, csv, "utf8");
            } else {
                const pdfBuffer = await this.renderPdfBuffer(payload);
                await fs.promises.writeFile(filePath, pdfBuffer);
            }

            job.status = "completed";
            job.progress = 100;
            job.artifactPath = `/uploads/exports/${fileName}`;
            job.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            await job.save();
        } catch (error) {
            job.status = "failed";
            job.errorMessage = error instanceof Error ? error.message : "Export job failed";
            job.progress = 100;
            await job.save();
        }
    }

    async getHeatmap(req: Request, res: Response) {
        const [rows, activeUsers, completedTransactions, openFlags] = await Promise.all([
            TransactionModel.aggregate([
                { $match: { status: "completed" } },
                {
                    $lookup: {
                        from: "products",
                        localField: "productId",
                        foreignField: "productId",
                        as: "product",
                    },
                },
                { $unwind: "$product" },
                { $group: { _id: "$product.location", count: { $sum: 1 } } },
            ]),
            UserModel.countDocuments({}),
            TransactionModel.countDocuments({ status: "completed" }),
            AdminFlagModel.countDocuments({ resolved: false }),
        ]);

        const points = rows
            .filter((row) => typeof row._id === "string" && row._id.trim().isNotEmpty)
            .map((row) => ({
                location: row._id,
                lat: locationCoordinates[row._id]?.lat ?? 0,
                lng: locationCoordinates[row._id]?.lng ?? 0,
                count: row.count,
            }));

        return res.status(200).json({
            success: true,
            data: {
                activeUsers,
                transactions: completedTransactions,
                flags: openFlags,
                points,
            },
        });
    }

    async listUsers(req: Request, res: Response) {
        const page = Math.max(Number(req.query.page?.toString() ?? "1"), 1);
        const limit = Math.min(Math.max(Number(req.query.limit?.toString() ?? "20"), 1), 200);
        const search = req.query.search?.toString().trim();

        const query: Record<string, unknown> = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ];
        }

        const [rows, total] = await Promise.all([
            UserModel.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            UserModel.countDocuments(query),
        ]);

        return res.status(200).json({
            success: true,
            data: rows.map((row) => this.toAdminUserPayload(row as unknown as Record<string, unknown>)),
            meta: {
                page,
                limit,
                total,
                totalPages: Math.max(Math.ceil(total / limit), 1),
            },
        });
    }

    async getUserById(req: Request, res: Response) {
        const user = await UserModel.findOne({ userId: req.params.userId }).lean();
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({
            success: true,
            data: this.toAdminUserPayload(user as unknown as Record<string, unknown>),
        });
    }

    async createUser(req: AuthenticatedRequest, res: Response) {
        const actorUserId = req.auth?.userId;
        if (!actorUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const input = req.validatedBody as {
            firstName?: string;
            lastName?: string;
            name?: string;
            email: string;
            password: string;
            role?: "user" | "admin";
            location?: string;
        };

        const exists = await UserModel.findOne({ email: input.email }).lean();
        if (exists) {
            return res.status(409).json({ success: false, message: "Email already in use" });
        }

        const composedName = input.name?.trim()
            ? input.name.trim()
            : `${input.firstName?.trim() ?? ""} ${input.lastName?.trim() ?? ""}`.trim();

        const passwordHash = await bcrypt.hash(input.password, 10);
        const user = await UserModel.create({
            userId: randomUUID(),
            name: composedName,
            email: input.email,
            passwordHash,
            role: input.role ?? "user",
            location: input.location ?? "",
            emailVerified: false,
            kycStatus: "draft",
        });

        await appendAuditLog({
            actorUserId,
            action: "admin.user.create",
            entityType: "user",
            entityId: user.userId,
            payload: { role: user.role, email: user.email },
        });

        return res.status(201).json({
            success: true,
            data: this.toAdminUserPayload(user.toObject() as unknown as Record<string, unknown>),
        });
    }

    async updateUser(req: AuthenticatedRequest, res: Response) {
        const actorUserId = req.auth?.userId;
        if (!actorUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const targetUserId = req.params.userId;
        const input = req.validatedBody as {
            firstName?: string;
            lastName?: string;
            name?: string;
            email?: string;
            password?: string;
            role?: "user" | "admin";
            location?: string;
        };

        const current = await UserModel.findOne({ userId: targetUserId });
        if (!current) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (input.email && input.email !== current.email) {
            const taken = await UserModel.findOne({ email: input.email }).lean();
            if (taken) {
                return res.status(409).json({ success: false, message: "Email already in use" });
            }
            current.email = input.email;
        }

        if (input.name?.trim()) {
            current.name = input.name.trim();
        } else if (input.firstName?.trim()) {
            current.name = `${input.firstName.trim()} ${input.lastName?.trim() ?? ""}`.trim();
        }

        if (input.role) current.role = input.role;
        if (input.location !== undefined) current.location = input.location;
        if (input.password) {
            current.passwordHash = await bcrypt.hash(input.password, 10);
        }

        await current.save();

        await appendAuditLog({
            actorUserId,
            action: "admin.user.update",
            entityType: "user",
            entityId: current.userId,
            payload: { role: current.role, email: current.email },
        });

        return res.status(200).json({
            success: true,
            data: this.toAdminUserPayload(current.toObject() as unknown as Record<string, unknown>),
        });
    }

    async deleteUser(req: AuthenticatedRequest, res: Response) {
        const actorUserId = req.auth?.userId;
        if (!actorUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const targetUserId = req.params.userId;
        if (targetUserId === actorUserId) {
            return res.status(409).json({ success: false, message: "Cannot delete your own account" });
        }

        const deleted = await UserModel.findOneAndDelete({ userId: targetUserId }).lean();
        if (!deleted) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        await appendAuditLog({
            actorUserId,
            action: "admin.user.delete",
            entityType: "user",
            entityId: targetUserId,
            payload: { email: deleted.email },
        });

        return res.status(200).json({ success: true, data: { userId: targetUserId } });
    }

    async exportData(req: Request, res: Response) {
        const format = req.query.format?.toString() ?? "csv";
        const payload = await this.buildExportPayload();

        if (format === "csv") {
            const csv = this.renderCsv(payload);
            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", "attachment; filename=neobazaar-export.csv");
            return res.status(200).send(csv);
        }

        if (format === "pdf") {
            const pdfBuffer = await this.renderPdfBuffer(payload);
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", "attachment; filename=neobazaar-export.pdf");
            return res.status(200).send(pdfBuffer);
        }

        return res.status(400).json({ success: false, message: "Unsupported format" });
    }

    async createExportJob(req: AuthenticatedRequest, res: Response) {
        const actorUserId = req.auth?.userId;
        if (!actorUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const formatRaw = req.query.format?.toString() ?? "csv";
        const format = formatRaw === "pdf" ? "pdf" : "csv";
        const exportJobId = randomUUID();

        const job = await ExportJobModel.create({
            exportJobId,
            requestedByUserId: actorUserId,
            format,
            status: "queued",
            progress: 0,
        });

        await appendAuditLog({
            actorUserId,
            action: "admin.export.job.create",
            entityType: "export_job",
            entityId: exportJobId,
            payload: { format },
        });

        setTimeout(() => {
            void this.processExportJob(exportJobId);
        }, 0);

        return res.status(202).json({ success: true, data: job });
    }

    async getExportJob(req: Request, res: Response) {
        const job = await ExportJobModel.findOne({ exportJobId: req.params.exportJobId }).lean();
        if (!job) {
            return res.status(404).json({ success: false, message: "Export job not found" });
        }

        return res.status(200).json({ success: true, data: job });
    }

    async listAuditLogs(req: Request, res: Response) {
        const page = Math.max(Number(req.query.page?.toString() ?? "1"), 1);
        const limit = Math.min(Math.max(Number(req.query.limit?.toString() ?? "50"), 1), 200);
        const actorUserId = req.query.actorUserId?.toString();
        const action = req.query.action?.toString();
        const entityType = req.query.entityType?.toString();

        const { rows, total } = await queryAuditLogs({
            actorUserId,
            action,
            entityType,
            page,
            limit,
        });

        const retentionDays = Number(process.env.AUDIT_RETENTION_DAYS ?? "365");

        return res.status(200).json({
            success: true,
            data: rows,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.max(Math.ceil(total / limit), 1),
                retentionDays,
            },
        });
    }

    async runAuditRetention(req: AuthenticatedRequest, res: Response) {
        const actorUserId = req.auth?.userId;
        if (!actorUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const retentionDays = Number(process.env.AUDIT_RETENTION_DAYS ?? "365");
        const result = await pruneAuditLogs(retentionDays);

        await appendAuditLog({
            actorUserId,
            action: "admin.audit.retention.run",
            entityType: "audit_log",
            entityId: "retention-policy",
            payload: result,
        });

        return res.status(200).json({ success: true, data: result });
    }

    async listFlags(req: Request, res: Response) {
        const flags = await AdminFlagModel.find({ resolved: false }).sort({ detectedAt: -1 }).lean();
        return res.status(200).json({ success: true, data: flags });
    }

    async listDisputes(req: Request, res: Response) {
        const status = req.query.status?.toString();
        const page = Math.max(Number(req.query.page?.toString() ?? "1"), 1);
        const limit = Math.min(Math.max(Number(req.query.limit?.toString() ?? "20"), 1), 200);

        const query: Record<string, unknown> = {};
        if (status && ["open", "under_review", "resolved", "rejected"].includes(status)) {
            query.status = status;
        }

        const [rows, total] = await Promise.all([
            DisputeModel.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            DisputeModel.countDocuments(query),
        ]);

        return res.status(200).json({
            success: true,
            data: rows,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.max(Math.ceil(total / limit), 1),
            },
        });
    }

    async resolveFlag(req: AuthenticatedRequest, res: Response) {
        const flag = await AdminFlagModel.findOneAndUpdate(
            { flagId: req.params.flagId },
            { $set: { resolved: true } },
            { new: true }
        ).lean();

        if (!flag) {
            return res.status(404).json({ success: false, message: "Flag not found" });
        }

        const actorUserId = req.auth?.userId ?? "system";
        const moderationAction = await ModerationActionModel.create({
            actionId: randomUUID(),
            actorUserId,
            targetType: "admin_flag",
            targetId: flag.flagId,
            action: "resolve_flag",
            metadata: { previousResolved: false, nextResolved: true },
            undoUntil: new Date(Date.now() + 1000 * 60 * 60 * 24),
            undone: false,
        });

        await appendAuditLog({
            actorUserId,
            action: "admin.flag.resolve",
            entityType: "admin_flag",
            entityId: flag.flagId,
            payload: { moderationActionId: moderationAction.actionId },
        });

        const flagEventPayload = {
            flagId: flag.flagId,
            sellerId: flag.sellerId,
            resolved: true,
            reason: flag.reason,
            actionBy: actorUserId,
            updatedAt: new Date().toISOString(),
        };

        emitRealtimeEvent(SOCKET_EVENTS.ADMIN_FLAG_UPDATED, flagEventPayload);

        await createInAppNotification({
            userId: flag.sellerId,
            type: "admin_flag",
            title: "Account flag resolved",
            body: "An admin resolved a marketplace flag related to your account.",
            route: resolveNotificationRoute("profile"),
        });

        return res.status(200).json({ success: true, data: flag, meta: { moderationActionId: moderationAction.actionId } });
    }

    async decideDispute(req: AuthenticatedRequest, res: Response) {
        const actorUserId = req.auth?.userId;
        if (!actorUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const input = req.validatedBody as {
            outcome: "refund_buyer" | "release_seller";
            resolutionNote?: string;
        };

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const dispute = await DisputeModel.findOne({ disputeId: req.params.disputeId }).session(session);
            if (!dispute) {
                await session.abortTransaction();
                return res.status(404).json({ success: false, message: "Dispute not found" });
            }

            if (!["open", "under_review"].includes(dispute.status)) {
                await session.abortTransaction();
                return res.status(409).json({ success: false, message: "Dispute already finalized" });
            }

            const txn = await TransactionModel.findOne({ txnId: dispute.transactionId }).session(session);
            if (!txn) {
                await session.abortTransaction();
                return res.status(404).json({ success: false, message: "Transaction not found for dispute" });
            }

            const [buyer, seller] = await Promise.all([
                UserModel.findOne({ userId: txn.buyerId }).session(session),
                UserModel.findOne({ userId: txn.sellerId }).session(session),
            ]);

            if (!buyer || !seller) {
                await session.abortTransaction();
                return res.status(404).json({ success: false, message: "Dispute participants not found" });
            }

            const resolvedAt = new Date();
            const heldTokens = txn.heldTokens;

            let orderStatus: "completed" | "cancelled" = "completed";
            let timelineNote = "Dispute resolved by admin";

            if (input.outcome === "refund_buyer") {
                buyer.neoTokens += heldTokens;
                buyer.reputationScore += 2;
                seller.reputationScore = Math.max(0, seller.reputationScore - 2);
                txn.status = "refunded";
                orderStatus = "cancelled";
                timelineNote = "Dispute resolved: escrow refunded to buyer";
            } else {
                seller.neoTokens += heldTokens;
                seller.reputationScore += 2;
                buyer.reputationScore = Math.max(0, buyer.reputationScore - 2);
                txn.status = "completed";
                orderStatus = "completed";
                timelineNote = "Dispute resolved: escrow released to seller";
            }

            txn.heldTokens = 0;
            txn.confirmedAt = resolvedAt;

            dispute.status = "resolved";
            dispute.resolutionNote = input.resolutionNote ?? timelineNote;

            await Promise.all([
                buyer.save({ session }),
                seller.save({ session }),
                txn.save({ session }),
                dispute.save({ session }),
            ]);

            const order = await OrderModel.findOneAndUpdate(
                { transactionId: txn.txnId },
                {
                    $set: { status: orderStatus },
                    $push: {
                        timeline: {
                            at: resolvedAt,
                            status: orderStatus,
                            actor: actorUserId,
                            note: timelineNote,
                        },
                    },
                },
                { new: true, session }
            );

            await appendAuditLog({
                actorUserId,
                action: "admin.dispute.decide",
                entityType: "dispute",
                entityId: dispute.disputeId,
                payload: {
                    outcome: input.outcome,
                    transactionId: txn.txnId,
                    orderId: order?.orderId,
                    heldTokens,
                },
            });

            await session.commitTransaction();

            const disputeEventPayload = {
                disputeId: dispute.disputeId,
                transactionId: txn.txnId,
                orderId: order?.orderId,
                buyerId: txn.buyerId,
                sellerId: txn.sellerId,
                outcome: input.outcome,
                transactionStatus: txn.status,
                orderStatus,
                updatedAt: resolvedAt.toISOString(),
            };

            emitRealtimeEvent(SOCKET_EVENTS.ADMIN_DISPUTE_DECIDED, disputeEventPayload);

            const disputeNotificationRoute = resolveNotificationRoute("profile");
            await Promise.all([
                createInAppNotification({
                    userId: txn.buyerId,
                    type: "dispute_resolution",
                    title: "Dispute decision posted",
                    body: timelineNote,
                    route: disputeNotificationRoute,
                }),
                createInAppNotification({
                    userId: txn.sellerId,
                    type: "dispute_resolution",
                    title: "Dispute decision posted",
                    body: timelineNote,
                    route: disputeNotificationRoute,
                }),
            ]);

            return res.status(200).json({
                success: true,
                data: {
                    dispute,
                    transaction: txn,
                    order,
                },
                meta: {
                    outcome: input.outcome,
                },
            });
        } catch {
            await session.abortTransaction();
            return res.status(500).json({ success: false, message: "Failed to decide dispute" });
        } finally {
            session.endSession();
        }
    }

    async undoModeration(req: AuthenticatedRequest, res: Response) {
        const actorUserId = req.auth?.userId;
        if (!actorUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const action = await ModerationActionModel.findOne({ actionId: req.params.actionId });
        if (!action) {
            return res.status(404).json({ success: false, message: "Moderation action not found" });
        }
        if (action.undone) {
            return res.status(400).json({ success: false, message: "Action already undone" });
        }
        if (action.undoUntil.getTime() < Date.now()) {
            return res.status(400).json({ success: false, message: "Undo window expired" });
        }

        if (action.targetType === "admin_flag" && action.action === "resolve_flag") {
            const revertedFlag = await AdminFlagModel.findOneAndUpdate(
                { flagId: action.targetId },
                { $set: { resolved: false } },
                { new: true }
            ).lean();

            if (revertedFlag) {
                emitRealtimeEvent(SOCKET_EVENTS.ADMIN_FLAG_UPDATED, {
                    flagId: revertedFlag.flagId,
                    sellerId: revertedFlag.sellerId,
                    resolved: false,
                    reason: revertedFlag.reason,
                    actionBy: actorUserId,
                    updatedAt: new Date().toISOString(),
                });

                await createInAppNotification({
                    userId: revertedFlag.sellerId,
                    type: "admin_flag",
                    title: "Account flag reopened",
                    body: "A previously resolved marketplace flag has been reopened for review.",
                    route: resolveNotificationRoute("profile"),
                });
            }
        }

        action.undone = true;
        await action.save();

        await appendAuditLog({
            actorUserId,
            action: "admin.moderation.undo",
            entityType: action.targetType,
            entityId: action.targetId,
            payload: { actionId: action.actionId },
        });

        return res.status(200).json({ success: true, data: action });
    }
}
