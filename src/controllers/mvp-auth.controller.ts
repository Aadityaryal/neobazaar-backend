import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { UserModel } from "../models/user.model";
import {
    AUTH_JWT_EXPIRES_IN_SECONDS,
    AUTH_REVOKED_TOKEN_RETENTION_MS,
    JWT_SECRET,
} from "../config";
import { clearAuthCookie, parseCookieHeader, setAuthCookie } from "../utils/cookie.util";
import { AUTH_COOKIE_NAME } from "../config";
import { RevokedTokenModel } from "../models/revoked-token.model";
import { AuthenticatedRequest } from "../types/auth.type";
import { VerificationChallengeModel } from "../models/verification-challenge.model";
import { toPublicUser } from "../core/user-profile";

const roleScopes: Record<"user" | "admin", string[]> = {
    user: [],
    admin: ["admin.view", "admin.export", "admin.moderate", "admin.audit", "risk.score"],
};

export class MVPAuthController {
    private extractTokenFromRequest(req: Request): string | null {
        const cookies = parseCookieHeader(req.headers.cookie);
        const cookieToken = cookies[AUTH_COOKIE_NAME];
        if (cookieToken) {
            return cookieToken;
        }

        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return null;
        }

        const [scheme, token] = authHeader.split(" ");
        if (scheme?.toLowerCase() !== "bearer" || !token) {
            return null;
        }

        return token.trim();
    }

    private buildToken(payload: { userId: string; email: string; role: "user" | "admin"; scopes: string[] }) {
        return jwt.sign(payload, JWT_SECRET, { expiresIn: AUTH_JWT_EXPIRES_IN_SECONDS });
    }

    private computeRevocationExpiry(token: string): Date {
        const fallback = new Date(Date.now() + AUTH_REVOKED_TOKEN_RETENTION_MS);
        const decoded = jwt.decode(token) as { exp?: number } | null;

        if (!decoded?.exp) {
            return fallback;
        }

        const tokenExpiry = new Date(decoded.exp * 1000);
        return tokenExpiry.getTime() > Date.now() ? tokenExpiry : fallback;
    }

    private extractStoredPasswordHash(user: { passwordHash?: unknown; toObject: () => Record<string, unknown> }) {
        if (typeof user.passwordHash === "string" && user.passwordHash.length > 0) {
            return { hash: user.passwordHash, fromLegacyField: false };
        }

        const raw = user.toObject();
        const legacyPassword = raw.password;
        if (typeof legacyPassword === "string" && legacyPassword.length > 0) {
            return { hash: legacyPassword, fromLegacyField: true };
        }

        return { hash: "", fromLegacyField: false };
    }

    async register(req: Request, res: Response) {
        const input = req.validatedBody as {
            name: string;
            email: string;
            password: string;
            location?: string;
        };

        const exists = await UserModel.findOne({ email: input.email }).lean();
        if (exists) {
            return res.status(409).json({ success: false, message: "Email already in use" });
        }

        const passwordHash = await bcrypt.hash(input.password, 10);
        const user = await UserModel.create({
            userId: randomUUID(),
            name: input.name,
            email: input.email,
            emailVerified: false,
            passwordHash,
            location: input.location ?? "",
            kycStatus: "draft",
        });

        const payload = { userId: user.userId, email: user.email, role: user.role, scopes: roleScopes[user.role] };
    const token = this.buildToken(payload);
        setAuthCookie(res, token);

        return res.status(201).json({
            success: true,
            message: "Registration successful",
            token,
            data: {
                ...toPublicUser(user.toObject()),
                token,
            },
        });
    }

    async login(req: Request, res: Response) {
        const input = req.validatedBody as {
            email: string;
            password: string;
        };

        const user = await UserModel.findOne({ email: input.email });
        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const { hash: storedHash, fromLegacyField } = this.extractStoredPasswordHash(user);
        if (!storedHash) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const valid = await bcrypt.compare(input.password, storedHash);
        if (!valid) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        if (fromLegacyField) {
            await UserModel.updateOne(
                { _id: user._id },
                {
                    $set: { passwordHash: storedHash },
                    $unset: { password: 1 },
                }
            );
            user.passwordHash = storedHash;
        }

        const payload = { userId: user.userId, email: user.email, role: user.role, scopes: roleScopes[user.role] };
        const token = this.buildToken(payload);
        setAuthCookie(res, token);

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            data: {
                ...toPublicUser(user.toObject()),
                token,
            },
        });
    }

    async me(req: AuthenticatedRequest, res: Response) {
        if (!req.auth?.userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const user = await UserModel.findOne({ userId: req.auth.userId }).lean();
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        return res.status(200).json({ success: true, data: toPublicUser(user) });
    }

    async logout(req: Request, res: Response) {
        const cookies = parseCookieHeader(req.headers.cookie);
        const token = cookies[AUTH_COOKIE_NAME];

        if (token) {
            const expiresAt = this.computeRevocationExpiry(token);
            await RevokedTokenModel.updateOne(
                { token },
                { $set: { token, expiresAt } },
                { upsert: true }
            );
        }

        clearAuthCookie(res);

        return res.status(200).json({ success: true, message: "Logout successful" });
    }

    async revokeSession(req: Request, res: Response) {
        const token = this.extractTokenFromRequest(req);

        if (!token) {
            clearAuthCookie(res);
            return res.status(200).json({ success: true, message: "No active session" });
        }

        const expiresAt = this.computeRevocationExpiry(token);
        await RevokedTokenModel.updateOne(
            { token },
            { $set: { token, expiresAt } },
            { upsert: true }
        );

        clearAuthCookie(res);

        return res.status(200).json({ success: true, message: "Session revoked" });
    }

    async listSessions(req: AuthenticatedRequest, res: Response) {
        const userId = req.auth?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const token = this.extractTokenFromRequest(req);
        if (!token) {
            return res.status(200).json({ success: true, data: [] });
        }

        try {
            const decoded = jwt.decode(token) as { iat?: number; exp?: number } | null;
            const session = {
                id: token.slice(0, 16),
                ip: req.ip ?? null,
                userAgent: req.headers["user-agent"]?.toString() ?? "unknown-device",
                createdAt: decoded?.iat ? new Date(decoded.iat * 1000).toISOString() : null,
                expiresAt: decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : null,
                current: true,
            };

            return res.status(200).json({ success: true, data: [session] });
        } catch {
            return res.status(200).json({ success: true, data: [] });
        }
    }

    async revokeAllSessions(req: AuthenticatedRequest, res: Response) {
        return this.revokeSession(req, res);
    }

    async issueVerificationChallenge(req: AuthenticatedRequest, res: Response) {
        const userId = req.auth?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const input = req.validatedBody as { channel: "email" };
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const challengeId = randomUUID();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await VerificationChallengeModel.create({
            challengeId,
            userId,
            channel: input.channel,
            code,
            expiresAt,
            attempts: 0,
        });

        return res.status(201).json({
            success: true,
            data: {
                challengeId,
                channel: input.channel,
                expiresAt: expiresAt.toISOString(),
                devCode: process.env.NODE_ENV === "production" ? undefined : code,
            },
        });
    }

    async verifyChallenge(req: AuthenticatedRequest, res: Response) {
        const userId = req.auth?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const input = req.validatedBody as { challengeId: string; code: string };
        const challenge = await VerificationChallengeModel.findOne({ challengeId: input.challengeId, userId });
        if (!challenge) {
            return res.status(404).json({ success: false, message: "Challenge not found" });
        }

        if (challenge.consumedAt) {
            return res.status(409).json({ success: false, message: "Challenge already used" });
        }

        if (challenge.expiresAt.getTime() <= Date.now()) {
            return res.status(410).json({ success: false, message: "Challenge expired" });
        }

        if (challenge.code !== input.code) {
            challenge.attempts += 1;
            await challenge.save();
            return res.status(400).json({ success: false, message: "Invalid challenge code" });
        }

        challenge.consumedAt = new Date();
        await challenge.save();

        await UserModel.updateOne(
            { userId },
            {
                $set: {
                    emailVerified: true,
                },
            }
        );

        return res.status(200).json({ success: true, message: "Verification successful" });
    }
}
