import { NextFunction, Request, Response } from "express";
import { createHash } from "crypto";
import { IdempotencyKeyModel } from "../models/idempotency-key.model";

const IDEMPOTENCY_HEADER = "idempotency-key";
const IDEMPOTENCY_TTL_MS = 1000 * 60 * 60 * 24;

function buildScope(req: Request): string {
    const userScope = (req as Request & { auth?: { userId?: string } }).auth?.userId ?? "anonymous";
    return `${userScope}:${req.method}:${req.baseUrl}${req.path}`;
}

function buildPayloadHash(req: Request): string {
    return createHash("sha256").update(JSON.stringify(req.body ?? {})).digest("hex");
}

export async function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
    const key = req.header(IDEMPOTENCY_HEADER)?.trim();
    if (!key) {
        return next();
    }

    const scope = `${buildScope(req)}:${buildPayloadHash(req)}`;

    const existing = await IdempotencyKeyModel.findOne({ key, scope }).lean();
    if (existing && existing.expiresAt.getTime() > Date.now()) {
        res.setHeader("x-idempotent-replay", "true");
        return res.status(existing.statusCode).json(existing.responseBody);
    }

    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
        if (res.statusCode < 500) {
            const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS);
            void IdempotencyKeyModel.updateOne(
                { key, scope },
                {
                    $set: {
                        key,
                        scope,
                        statusCode: res.statusCode,
                        responseBody: body,
                        expiresAt,
                    },
                },
                { upsert: true }
            );
        }

        return originalJson(body);
    }) as Response["json"];

    return next();
}
