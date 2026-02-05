import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../types/auth.type";
import { UserModel } from "../models/user.model";

export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if (!req.auth?.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await UserModel.findOne({ userId: req.auth.userId }).lean();
    if (!user || user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Forbidden" });
    }

    return next();
}
