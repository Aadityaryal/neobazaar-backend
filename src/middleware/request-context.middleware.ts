import { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";
import { recordHttpMetric } from "../services/observability.service";

const REQUEST_ID_HEADER = "x-request-id";

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction) {
    const incomingRequestId = req.header(REQUEST_ID_HEADER);
    const requestId = incomingRequestId && incomingRequestId.trim().length > 0 ? incomingRequestId : randomUUID();

    req.requestId = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);

    const start = Date.now();
    res.on("finish", () => {
        const durationMs = Date.now() - start;
        recordHttpMetric(res.statusCode, durationMs);
        console.info(
            JSON.stringify({
                requestId,
                method: req.method,
                path: req.originalUrl,
                status: res.statusCode,
                durationMs,
            })
        );
    });

    next();
}
