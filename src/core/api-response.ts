import { Response } from "express";

export interface ApiErrorItem {
    code: string;
    field?: string;
    detail: string;
}

export interface ApiSuccessEnvelope<T = unknown> {
    success: true;
    message: string;
    data: T;
    meta?: Record<string, unknown>;
    errors: [];
}

export interface ApiErrorEnvelope {
    success: false;
    message: string;
    data: null;
    meta?: Record<string, unknown>;
    errors: ApiErrorItem[];
}

export function sendSuccess<T>(
    res: Response,
    status: number,
    message: string,
    data: T,
    meta?: Record<string, unknown>
) {
    return res.status(status).json({
        success: true,
        message,
        data,
        meta,
        errors: [],
    } satisfies ApiSuccessEnvelope<T>);
}

export function sendError(
    res: Response,
    status: number,
    message: string,
    errors: ApiErrorItem[] = [],
    meta?: Record<string, unknown>
) {
    return res.status(status).json({
        success: false,
        message,
        data: null,
        meta,
        errors,
    } satisfies ApiErrorEnvelope);
}
