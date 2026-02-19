import { NextFunction, Request, Response } from "express";
import { ZodType } from "zod";
import { sendError } from "../core/api-response";

export function validateBody<T>(schema: ZodType<T>) {
    return (req: Request, res: Response, next: NextFunction) => {
        const parsed = schema.safeParse(req.body);

        if (!parsed.success) {
            return sendError(res, 400, parsed.error.issues[0]?.message ?? "Invalid input", [
                {
                    code: "VALIDATION_ERROR",
                    field: parsed.error.issues[0]?.path?.join("."),
                    detail: parsed.error.issues[0]?.message ?? "Invalid input",
                },
            ]);
        }

        req.validatedBody = parsed.data;
        next();
    };
}
