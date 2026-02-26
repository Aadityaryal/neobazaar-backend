import axios from "axios";
import { createHash } from "crypto";
import Redis from "ioredis";
import { AI_SERVICE_URL, CACHE_TTL_SECONDS, REDIS_URL } from "../config";
import { getDummyAIForCategory } from "./dummy-ai.util";

const inMemoryCache = new Map<string, { expiresAt: number; value: string }>();

let redisClient: Redis | null = null;
try {
    redisClient = new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
    redisClient.on("error", () => {
    });
    redisClient.connect().catch(() => null);
} catch {
    redisClient = null;
}

async function cacheGet(key: string): Promise<string | null> {
    if (redisClient) {
        try {
            return await redisClient.get(key);
        } catch {
        }
    }

    const value = inMemoryCache.get(key);
    if (!value) {
        return null;
    }
    if (Date.now() > value.expiresAt) {
        inMemoryCache.delete(key);
        return null;
    }
    return value.value;
}

async function cacheSet(key: string, value: string): Promise<void> {
    if (redisClient) {
        try {
            await redisClient.set(key, value, "EX", CACHE_TTL_SECONDS);
            return;
        } catch {
        }
    }

    inMemoryCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000 });
}

export interface AIAnalyzeResult {
    condition: string;
    confidence: number;
    aiSuggestedPrice: number;
    fallbackUsed: boolean;
}

export interface AIDetectResult {
    condition: string;
    confidence: number;
    fallbackUsed: boolean;
}

export interface AIPriceResult {
    aiSuggestedPrice: number;
    fallbackUsed: boolean;
}

export interface AIFraudResult {
    isDuplicate: boolean;
    fallbackUsed: boolean;
}

export async function detectWithAIProxy(productId: string, image: string): Promise<AIDetectResult> {
    const cacheKey = `ai:${productId}:detect`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
        return JSON.parse(cached) as AIDetectResult;
    }

    try {
        const response = await axios.post(`${AI_SERVICE_URL}/detect`, { image }, { timeout: 8000 });
        const result: AIDetectResult = {
            condition: response.data.condition,
            confidence: Number(response.data.confidence),
            fallbackUsed: false,
        };
        await cacheSet(cacheKey, JSON.stringify(result));
        return result;
    } catch {
        const fallback: AIDetectResult = {
            condition: "good",
            confidence: 0,
            fallbackUsed: true,
        };
        return fallback;
    }
}

export async function priceWithAIProxy(productId: string, category: string, condition: string, location: string): Promise<AIPriceResult> {
    const cacheKey = `ai:${productId}:price`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
        return JSON.parse(cached) as AIPriceResult;
    }

    try {
        const response = await axios.post(
            `${AI_SERVICE_URL}/price`,
            { category, condition, location },
            { timeout: 8000 }
        );
        const result: AIPriceResult = {
            aiSuggestedPrice: Number(response.data.aiSuggestedPrice),
            fallbackUsed: false,
        };
        await cacheSet(cacheKey, JSON.stringify(result));
        return result;
    } catch {
        const dummy = getDummyAIForCategory(category);
        const fallback: AIPriceResult = {
            aiSuggestedPrice: dummy.aiSuggestedPrice,
            fallbackUsed: true,
        };
        return fallback;
    }
}

export async function fraudWithAIProxy(productId: string, imageHash: string): Promise<AIFraudResult> {
    const cacheKey = `ai:${productId}:fraud`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
        return JSON.parse(cached) as AIFraudResult;
    }

    try {
        const response = await axios.post(`${AI_SERVICE_URL}/fraud`, { imageHash }, { timeout: 5000 });
        const result: AIFraudResult = {
            isDuplicate: Boolean(response.data.isDuplicate),
            fallbackUsed: false,
        };
        await cacheSet(cacheKey, JSON.stringify(result));
        return result;
    } catch {
        const fallback: AIFraudResult = {
            isDuplicate: false,
            fallbackUsed: true,
        };
        return fallback;
    }
}

export async function analyzeProductWithAI(productId: string, category: string, location: string, image: string): Promise<AIAnalyzeResult> {
    const cacheKey = `ai:${productId}:analyze`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
        return JSON.parse(cached) as AIAnalyzeResult;
    }

    try {
        const detectResult = await detectWithAIProxy(productId, image);
        const priceResult = await priceWithAIProxy(productId, category, detectResult.condition, location);

        const result: AIAnalyzeResult = {
            condition: detectResult.condition,
            confidence: detectResult.confidence,
            aiSuggestedPrice: priceResult.aiSuggestedPrice,
            fallbackUsed: detectResult.fallbackUsed || priceResult.fallbackUsed,
        };
        await cacheSet(cacheKey, JSON.stringify(result));
        return result;
    } catch {
        const dummy = getDummyAIForCategory(category);
        const result: AIAnalyzeResult = {
            condition: dummy.aiCondition,
            confidence: 0,
            aiSuggestedPrice: dummy.aiSuggestedPrice,
            fallbackUsed: true,
        };
        return result;
    }
}

export async function suggestNLP(messages: Array<{ content: string; senderId: string }>): Promise<string> {
    try {
        const response = await axios.post(`${AI_SERVICE_URL}/nlp/suggest`, { messages }, { timeout: 5000 });
        return response.data.suggestionText ?? "Could you offer a fair price?";
    } catch {
        return "Could you offer a fair price?";
    }
}

export async function recommendProducts(userId: string, recentViews: string[]): Promise<string[]> {
    try {
        const response = await axios.post(`${AI_SERVICE_URL}/recommend`, { userId, recentViews }, { timeout: 5000 });
        return Array.isArray(response.data.productIds) ? response.data.productIds : [];
    } catch {
        return [];
    }
}

export function computeImageHash(image: string): string {
    return createHash("sha256").update(image).digest("hex");
}
