import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "../config";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = authHeader.slice("Bearer ".length).trim();
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        if (!decoded || typeof decoded !== "object" || decoded.role !== "admin") {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }
        return next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Invalid token" });
    }
}
