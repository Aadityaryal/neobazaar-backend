import { Response } from "express";
import { AUTH_COOKIE_MAX_AGE_MS, AUTH_COOKIE_NAME } from "../config";

function isProduction(): boolean {
    return process.env.NODE_ENV === "production";
}

function authCookieOptions() {
    const secure = isProduction();
    return {
        httpOnly: true,
        secure,
        sameSite: secure ? "strict" as const : "lax" as const,
        path: "/",
    };
}

export function parseCookieHeader(cookieHeader?: string): Record<string, string> {
    if (!cookieHeader) {
        return {};
    }

    return cookieHeader.split(";").reduce<Record<string, string>>((acc, rawPart) => {
        const part = rawPart.trim();
        if (!part) {
            return acc;
        }
        const separatorIndex = part.indexOf("=");
        if (separatorIndex < 0) {
            return acc;
        }
        const key = decodeURIComponent(part.slice(0, separatorIndex).trim());
        const value = decodeURIComponent(part.slice(separatorIndex + 1).trim());
        acc[key] = value;
        return acc;
    }, {});
}

export function setAuthCookie(res: Response, token: string): void {
    res.cookie(AUTH_COOKIE_NAME, token, {
        ...authCookieOptions(),
        maxAge: AUTH_COOKIE_MAX_AGE_MS,
    });
}

export function clearAuthCookie(res: Response): void {
    res.clearCookie(AUTH_COOKIE_NAME, authCookieOptions());
}
