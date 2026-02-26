import { Request } from "express";

export interface AuthPayload {
    userId: string;
    email: string;
    role: "user" | "admin";
    scopes?: string[];
}

export interface AuthenticatedRequest extends Request {
    auth?: AuthPayload;
}
