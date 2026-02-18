import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../types/auth.type";

type Capability = "admin.view" | "admin.export" | "admin.moderate" | "admin.audit" | "risk.score";

const roleCapabilities: Record<string, Capability[]> = {
    admin: ["admin.view", "admin.export", "admin.moderate", "admin.audit", "risk.score"],
    user: [],
};

export function requireCapability(capability: Capability) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const role = req.auth?.role ?? "user";
        const allowed = roleCapabilities[role] ?? [];
        const tokenScopes = req.auth?.scopes;

        if (Array.isArray(tokenScopes) && tokenScopes.length > 0) {
            if (!tokenScopes.includes(capability)) {
                return res.status(403).json({ success: false, message: "Forbidden" });
            }

            return next();
        }

        if (!allowed.includes(capability)) {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }

        next();
    };
}
