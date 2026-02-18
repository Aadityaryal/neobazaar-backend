import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest, AuthPayload } from "../types/auth.type";
import { parseCookieHeader } from "../utils/cookie.util";
import { AUTH_COOKIE_NAME, JWT_SECRET } from "../config";
import { RevokedTokenModel } from "../models/revoked-token.model";

function isPublicRecommendationPath(path: string): boolean {
    const normalized = path.toLowerCase();
    return normalized === "/recommend" || normalized === "/ai/recommend";
}

function getTokenFromRequest(req: AuthenticatedRequest): string | undefined {
    const cookies = parseCookieHeader(req.headers.cookie);
    const cookieToken = cookies[AUTH_COOKIE_NAME];
    if (cookieToken) {
        return cookieToken;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return undefined;
    }

    const [scheme, token] = authHeader.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) {
        return undefined;
    }

    return token.trim();
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        // Recommendation endpoints are intentionally public with optional auth context.
        if (isPublicRecommendationPath(req.path)) {
            return next();
        }

        const token = getTokenFromRequest(req);

        if (!token) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const revokedToken = await RevokedTokenModel.findOne({ token }).lean();
        if (revokedToken) {
            return res.status(401).json({ success: false, message: "Session expired" });
        }

        const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
        if (!payload?.userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        req.auth = payload;
        return next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Invalid token" });
    }
}

// Best-effort auth parser: attach req.auth when a valid session exists,
// but never block anonymous requests.
export async function attachAuthIfPresent(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
    try {
        const token = getTokenFromRequest(req);

        if (!token) {
            return next();
        }

        const revokedToken = await RevokedTokenModel.findOne({ token }).lean();
        if (revokedToken) {
            return next();
        }

        const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
        if (payload?.userId) {
            req.auth = payload;
        }
    } catch {
        // Ignore invalid/expired token for optional auth paths.
    }

    return next();
}
