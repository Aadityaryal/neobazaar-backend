import { NextFunction, Request, Response } from "express";

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function withMeta(meta: unknown, requestId: string) {
    if (isPlainObject(meta)) {
        return { requestId, ...meta };
    }
    return { requestId };
}

export function responseEnvelopeMiddleware(req: Request, res: Response, next: NextFunction) {
    const originalJson = res.json.bind(res);

    res.json = ((body: unknown) => {
        if (!isPlainObject(body)) {
            return originalJson(body);
        }

        const requestId = req.requestId;
        const status = res.statusCode;
        const knownMessage = typeof body.message === "string" ? body.message : undefined;
        const success = typeof body.success === "boolean" ? body.success : status < 400;

        const normalizedData =
            body.data !== undefined
                ? body.data
                : Object.fromEntries(
                      Object.entries(body).filter(
                          ([key]) => !["success", "message", "meta", "errors", "error"].includes(key)
                      )
                  );

        if (success) {
            return originalJson({
                success: true,
                message: knownMessage ?? "OK",
                data: normalizedData,
                meta: withMeta(body.meta, requestId),
                errors: [],
            });
        }

        const errorMessageFromBody =
            typeof body.error === "string"
                ? body.error
                : knownMessage ??
                  (Array.isArray(body.errors) && body.errors.length > 0
                      ? String((body.errors[0] as Record<string, unknown>).detail ?? "Request failed")
                      : "Request failed");

        const normalizedErrors = Array.isArray(body.errors)
            ? body.errors
            : [{ code: "REQUEST_ERROR", detail: errorMessageFromBody }];

        return originalJson({
            success: false,
            message: errorMessageFromBody,
            data: null,
            meta: withMeta(body.meta, requestId),
            errors: normalizedErrors,
        });
    }) as Response["json"];

    next();
}
