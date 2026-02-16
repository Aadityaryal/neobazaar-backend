import { Response } from "express";
import { randomUUID } from "crypto";
import { UserModel } from "../models/user.model";
import { WalletTopUpModel } from "../models/wallet-topup.model";
import { AuthenticatedRequest } from "../types/auth.type";
import { toPublicUser } from "../core/user-profile";

export class UserController {
    async listWalletTopups(req: AuthenticatedRequest, res: Response) {
        const userId = req.auth?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const topups = await WalletTopUpModel.find({ userId }).sort({ createdAt: -1 }).lean();
        return res.status(200).json({ success: true, data: topups });
    }

    async patchUser(req: AuthenticatedRequest, res: Response) {
        const authUserId = req.auth?.userId;
        const targetUserId = req.params.userId;

        if (!authUserId || authUserId !== targetUserId) {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }

        const input = req.validatedBody as {
            name?: string;
            location?: string;
            kycVerified?: boolean;
        };

        const nextFields: Record<string, unknown> = { ...input };
        if (typeof input.kycVerified === "boolean") {
            nextFields.kycStatus = input.kycVerified ? "verified" : "draft";
        }

        const updated = await UserModel.findOneAndUpdate(
            { userId: targetUserId },
            { $set: nextFields },
            { new: true }
        ).lean();

        if (!updated) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({ success: true, data: toPublicUser(updated) });
    }

    async submitKyc(req: AuthenticatedRequest, res: Response) {
        const authUserId = req.auth?.userId;
        const targetUserId = req.params.userId;

        if (!authUserId || authUserId !== targetUserId) {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }

        const current = await UserModel.findOne({ userId: targetUserId }).lean();
        if (!current) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (current.kycStatus === "submitted") {
            return res.status(409).json({ success: false, message: "KYC already submitted" });
        }

        if (current.kycStatus === "verified") {
            return res.status(409).json({ success: false, message: "KYC already verified" });
        }

        const updated = await UserModel.findOneAndUpdate(
            { userId: targetUserId },
            { $set: { kycStatus: "submitted", kycVerified: false } },
            { new: true }
        ).lean();

        if (!updated) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({ success: true, data: toPublicUser(updated) });
    }

    async reviewKyc(req: AuthenticatedRequest, res: Response) {
        const reviewerRole = req.auth?.role;
        if (reviewerRole !== "admin") {
            return res.status(403).json({ success: false, message: "Admin role required" });
        }

        const targetUserId = req.params.userId;
        const input = req.validatedBody as { status: "verified" | "rejected"; reason?: string };

        const current = await UserModel.findOne({ userId: targetUserId }).lean();
        if (!current) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (current.kycStatus !== "submitted") {
            return res.status(409).json({ success: false, message: "KYC review is allowed only from submitted state" });
        }

        const updated = await UserModel.findOneAndUpdate(
            { userId: targetUserId },
            { $set: { kycStatus: input.status, kycVerified: input.status === "verified" } },
            { new: true }
        ).lean();

        if (!updated) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({
            success: true,
            data: toPublicUser(updated),
            meta: input.reason ? { reason: input.reason } : undefined,
        });
    }

    async walletTopup(req: AuthenticatedRequest, res: Response) {
        const userId = req.auth?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const providerRaw = req.body?.provider?.toString?.() ?? "esewa";
        const provider = providerRaw === "khalti" || providerRaw === "imepay" ? providerRaw : "esewa";

        const amountInput = Number(req.body?.amount);
        const tokensCredited = Number.isFinite(amountInput) && amountInput > 0 ? Math.floor(amountInput) : 100;

        const updated = await UserModel.findOneAndUpdate(
            { userId },
            { $inc: { neoTokens: tokensCredited } },
            { new: true }
        ).lean();

        if (!updated) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        await WalletTopUpModel.create({
            topUpId: randomUUID(),
            userId,
            provider,
            tokensCredited,
        });

        return res.status(200).json({ success: true, data: toPublicUser(updated) });
    }
}
