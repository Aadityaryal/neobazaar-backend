import dotenv from "dotenv";
dotenv.config();

function parseNumberEnv(name: string, fallback: number): number {
    const raw = process.env[name];
    if (!raw) {
        return fallback;
    }
    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
}

function parseBooleanEnv(name: string, fallback = false): boolean {
    const raw = process.env[name];
    if (!raw) {
        return fallback;
    }
    return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

export const PORT: number = 
    process.env.PORT ? parseInt(process.env.PORT) : 3000;
export const MONGODB_URI: string = 
    process.env.MONGODB_URI || 'mongodb://localhost:27017/defaultdb';

export const MONGODB_SERVER_SELECTION_TIMEOUT_MS: number =
    parseNumberEnv("MONGODB_SERVER_SELECTION_TIMEOUT_MS", 15000);
export const MONGODB_CONNECT_TIMEOUT_MS: number =
    parseNumberEnv("MONGODB_CONNECT_TIMEOUT_MS", 15000);
export const MONGODB_SOCKET_TIMEOUT_MS: number =
    parseNumberEnv("MONGODB_SOCKET_TIMEOUT_MS", 45000);
export const MONGODB_MAX_POOL_SIZE: number =
    parseNumberEnv("MONGODB_MAX_POOL_SIZE", 20);
export const MONGODB_MIN_POOL_SIZE: number =
    parseNumberEnv("MONGODB_MIN_POOL_SIZE", 0);
export const MONGODB_DNS_FAMILY: 4 | 6 =
    parseNumberEnv("MONGODB_DNS_FAMILY", 4) === 6 ? 6 : 4;
export const MONGODB_FORCE_TLS: boolean =
    parseBooleanEnv("MONGODB_FORCE_TLS", false);
export const MONGODB_TLS_ALLOW_INVALID_CERTIFICATES: boolean =
    parseBooleanEnv("MONGODB_TLS_ALLOW_INVALID_CERTIFICATES", false);
export const MONGODB_TLS_ALLOW_INVALID_HOSTNAMES: boolean =
    parseBooleanEnv("MONGODB_TLS_ALLOW_INVALID_HOSTNAMES", false);
// Application level constants, with fallbacks 
// if .env variables are not set

export const JWT_SECRET: string = 
    process.env.JWT_SECRET || 'default'

export const AUTH_COOKIE_NAME: string =
    process.env.AUTH_COOKIE_NAME || 'neobazaar_session';

export const AUTH_SESSION_TTL_DAYS: number =
    parseNumberEnv("AUTH_SESSION_TTL_DAYS", 90);

export const AUTH_COOKIE_MAX_AGE_MS: number =
    AUTH_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

export const AUTH_JWT_EXPIRES_IN_SECONDS: number =
    AUTH_SESSION_TTL_DAYS * 24 * 60 * 60;

export const AUTH_REVOKED_TOKEN_RETENTION_DAYS: number =
    parseNumberEnv("AUTH_REVOKED_TOKEN_RETENTION_DAYS", AUTH_SESSION_TTL_DAYS + 7);

export const AUTH_REVOKED_TOKEN_RETENTION_MS: number =
    AUTH_REVOKED_TOKEN_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export const AI_SERVICE_URL: string =
    process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const REDIS_URL: string =
    process.env.REDIS_URL || 'redis://localhost:6379';

export const CACHE_TTL_SECONDS: number = 60 * 60;

// Email configuration
export const EMAIL_HOST: string =
    process.env.EMAIL_HOST || 'smtp.gmail.com';
export const EMAIL_PORT: number =
    process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 587;
export const EMAIL_USER: string =
    process.env.EMAIL_USER || '';
export const EMAIL_PASSWORD: string =
    process.env.EMAIL_PASSWORD || '';
export const EMAIL_FROM: string =
    process.env.EMAIL_FROM || 'noreply@neobazaar.com';
export const FRONTEND_URL: string =
    process.env.FRONTEND_URL || 'http://localhost:3000';