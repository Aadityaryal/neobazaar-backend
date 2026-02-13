import { Request, Response } from "express";
import { AuthenticatedRequest } from "../types/auth.type";
import { suggestNLP, recommendProducts, detectWithAIProxy, priceWithAIProxy, fraudWithAIProxy } from "../utils/ai-proxy.util";
import { ProductModel } from "../models/product.model";
import { UserModel } from "../models/user.model";

export class ExtensionController {
    async detect(req: Request, res: Response) {
        const image = req.body?.image?.toString?.() ?? "";
        const productId = req.body?.productId?.toString?.() ?? "temp";
        if (!image) {
            return res.status(400).json({ success: false, message: "image is required" });
        }

        const result = await detectWithAIProxy(productId, image);
        return res.status(200).json({ success: true, ...result });
    }

    async price(req: Request, res: Response) {
        const productId = req.body?.productId?.toString?.() ?? "temp";
        const category = req.body?.category?.toString?.() ?? "";
        const condition = req.body?.condition?.toString?.() ?? "";
        const location = req.body?.location?.toString?.() ?? "";

        if (!category || !condition || !location) {
            return res.status(400).json({ success: false, message: "category, condition and location are required" });
        }

        const result = await priceWithAIProxy(productId, category, condition, location);
        return res.status(200).json({ success: true, ...result });
    }

    async fraud(req: Request, res: Response) {
        const productId = req.body?.productId?.toString?.() ?? "temp";
        const imageHash = req.body?.imageHash?.toString?.() ?? "";
        if (!imageHash) {
            return res.status(400).json({ success: false, message: "imageHash is required" });
        }

        const result = await fraudWithAIProxy(productId, imageHash);
        return res.status(200).json({ success: true, ...result });
    }

    async recommend(req: AuthenticatedRequest, res: Response) {
        const userId = req.auth?.userId ?? "guest";

        const recentViewsFromQuery = Array.isArray(req.query.recentViews)
            ? req.query.recentViews.map(String)
            : [];
        const recentViewsFromBody = Array.isArray(req.body?.recentViews)
            ? req.body.recentViews.map(String)
            : [];
        const recentViews = recentViewsFromBody.length > 0 ? recentViewsFromBody : recentViewsFromQuery;
        const productIds = await recommendProducts(userId, recentViews);

        let products = [];
        if (productIds.length > 0) {
            products = await ProductModel.find({ productId: { $in: productIds } }).lean();
        } else {
            products = await ProductModel.find().sort({ createdAt: -1 }).limit(10).lean();
        }

        return res.status(200).json({
            success: true,
            data: products,
            meta: {
                explainability: {
                    strategy: productIds.length > 0 ? "hybrid-history" : "fallback-recent",
                    signals: {
                        recentViewsUsed: recentViews.slice(0, 20),
                        rankingSourceCount: productIds.length,
                    },
                    confidence: productIds.length > 0 ? 0.72 : 0.4,
                },
            },
        });
    }

    async nlpSuggest(req: Request, res: Response) {
        const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
        const suggestionText = await suggestNLP(messages.slice(-5));
        return res.status(200).json({ success: true, suggestionText });
    }

    async syncResolve(req: Request, res: Response) {
        const records = Array.isArray(req.body?.records) ? req.body.records : [];
        if (records.length === 0) {
            return res.status(200).json({ success: true, data: [] });
        }

        const userIds = [...new Set(records.map((item: { userId?: string }) => item.userId).filter(Boolean))] as string[];
        const users = await UserModel.find({ userId: { $in: userIds } }).select("userId reputationScore").lean();
        const reputationByUser = new Map(users.map((user) => [user.userId, user.reputationScore]));

        const winners = new Map<string, { userId: string; record: unknown; score: number }>();
        for (const record of records) {
            const key = record.entityId ?? record.id ?? JSON.stringify(record);
            const userId = record.userId ?? "";
            const score = reputationByUser.get(userId) ?? 0;
            const existing = winners.get(key);
            if (!existing || score > existing.score) {
                winners.set(key, { userId, record, score });
            }
        }

        return res.status(200).json({
            success: true,
            data: Array.from(winners.values()).map((item) => item.record),
        });
    }
}
