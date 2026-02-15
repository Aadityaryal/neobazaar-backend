import { Request, Response } from "express";
import { randomUUID } from "crypto";
import mongoose from "mongoose";
import { ProductModel } from "../models/product.model";
import { AuthenticatedRequest } from "../types/auth.type";
import { analyzeProductWithAI, computeImageHash, fraudWithAIProxy } from "../utils/ai-proxy.util";
import { AdminFlagModel } from "../models/admin-flag.model";
import { productListQuerySchema } from "../dtos/mvp.dto";
import { ProductViewModel } from "../models/product-view.model";
import { ProductSavedModel } from "../models/product-saved.model";

export class ProductController {
    private buildProductLookupFilter(productParam: string) {
        if (mongoose.Types.ObjectId.isValid(productParam)) {
            return {
                $or: [
                    { productId: productParam },
                    { _id: new mongoose.Types.ObjectId(productParam) },
                ],
            };
        }

        return { productId: productParam };
    }

    async listSaved(req: AuthenticatedRequest, res: Response) {
        const userId = req.auth?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const limitRaw = Number(req.query.limit?.toString() ?? "50");
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;

        const savedEntries = await ProductSavedModel.find({ userId })
            .sort({ savedAt: -1 })
            .limit(limit)
            .lean();

        const productIds = savedEntries.map((entry) => entry.productId);
        if (productIds.length === 0) {
            return res.status(200).json({ success: true, data: [] });
        }

        const products = await ProductModel.find({ productId: { $in: productIds } }).lean();
        const productById = new Map(products.map((product) => [product.productId, product]));

        const data = savedEntries
            .map((entry) => {
                const product = productById.get(entry.productId);
                if (!product) {
                    return null;
                }

                return {
                    ...product,
                    savedAt: entry.savedAt,
                };
            })
            .filter((item): item is NonNullable<typeof item> => Boolean(item));

        return res.status(200).json({ success: true, data });
    }

    async saveProduct(req: AuthenticatedRequest, res: Response) {
        const userId = req.auth?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const productId = req.params.productId;
        const productExists = await ProductModel.exists({ productId });
        if (!productExists) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const savedAt = new Date();

        const saved = await ProductSavedModel.findOneAndUpdate(
            { userId, productId },
            {
                $set: { savedAt },
                $setOnInsert: { savedId: randomUUID() },
            },
            { new: true, upsert: true }
        ).lean();

        return res.status(200).json({ success: true, data: saved });
    }

    async unsaveProduct(req: AuthenticatedRequest, res: Response) {
        const userId = req.auth?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const productId = req.params.productId;
        const deleted = await ProductSavedModel.findOneAndDelete({ userId, productId }).lean();

        if (!deleted) {
            return res.status(404).json({ success: false, message: "Saved item not found" });
        }

        return res.status(200).json({ success: true, data: deleted });
    }

    async listRecentViewed(req: AuthenticatedRequest, res: Response) {
        const userId = req.auth?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const limitRaw = Number(req.query.limit?.toString() ?? "20");
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20;

        const views = await ProductViewModel.find({ userId })
            .sort({ viewedAt: -1 })
            .limit(limit)
            .lean();

        const productIds = views.map((view) => view.productId);
        if (productIds.length === 0) {
            return res.status(200).json({ success: true, data: [] });
        }

        const products = await ProductModel.find({ productId: { $in: productIds } }).lean();
        const productById = new Map(products.map((product) => [product.productId, product]));

        const data = views
            .map((view) => {
                const product = productById.get(view.productId);
                if (!product) {
                    return null;
                }

                return {
                    ...product,
                    viewedAt: view.viewedAt,
                };
            })
            .filter((item): item is NonNullable<typeof item> => Boolean(item));

        return res.status(200).json({ success: true, data });
    }

    async recordView(req: AuthenticatedRequest, res: Response) {
        const userId = req.auth?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const productId = req.params.productId;
        const productExists = await ProductModel.exists({ productId });
        if (!productExists) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const viewedAt = new Date();

        const view = await ProductViewModel.findOneAndUpdate(
            { userId, productId },
            {
                $set: { viewedAt },
                $setOnInsert: { viewId: randomUUID() },
            },
            { new: true, upsert: true }
        ).lean();

        return res.status(200).json({ success: true, data: view });
    }

    async createProduct(req: AuthenticatedRequest, res: Response) {
        const input = req.validatedBody as {
            title: string;
            description: string;
            category: string;
            images: string[];
            priceListed: number;
            mode: "buy_now" | "auction" | "donate";
            location: string;
            activeUntil?: Date;
        };

        if (!req.auth?.userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const productId = randomUUID();
        const imageSource = input.images[0] ?? "";
        const imageHash = computeImageHash(imageSource);
        const fraudResult = await fraudWithAIProxy(productId, imageHash);
        const duplicate = await ProductModel.findOne({ imageHash }).lean();

        if (duplicate || fraudResult.isDuplicate) {
            await AdminFlagModel.create({
                flagId: randomUUID(),
                productId,
                sellerId: req.auth.userId,
                reason: "duplicate_image",
                detectedAt: new Date(),
                resolved: false,
            });
            return res.status(400).json({ error: "Duplicate Listing Detected" });
        }

        const ai = await analyzeProductWithAI(productId, input.category, input.location, imageSource);
        const aiVerified = ai.confidence > 0.9;

        const product = await ProductModel.create({
            productId,
            sellerId: req.auth.userId,
            ...input,
            aiSuggestedPrice: ai.aiSuggestedPrice,
            aiCondition: ai.condition,
            aiVerified,
            aiConfidence: ai.confidence,
            imageHash,
        });

        return res.status(201).json({ success: true, data: product, aiFallback: ai.fallbackUsed });
    }

    async uploadProductImage(req: AuthenticatedRequest, res: Response) {
        const userId = req.auth?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const file = (req as Request & { file?: Express.Multer.File }).file;
        if (!file) {
            return res.status(400).json({ success: false, message: "Image file is required" });
        }

        const publicPath = `/uploads/products/${file.filename}`;
        const publicUrl = `${req.protocol}://${req.get("host")}${publicPath}`;

        return res.status(201).json({
            success: true,
            data: {
                path: publicPath,
                url: publicUrl,
                fileName: file.filename,
                uploadedBy: userId,
            },
        });
    }

    async listProducts(req: Request, res: Response) {
        const parsedQuery = productListQuerySchema.safeParse({
            sellerId: req.query.sellerId?.toString(),
            category: req.query.category?.toString(),
            location: req.query.location?.toString(),
            mode: req.query.mode?.toString(),
            minPrice: req.query.minPrice?.toString(),
            maxPrice: req.query.maxPrice?.toString(),
            sort: req.query.sort?.toString(),
            page: req.query.page?.toString(),
            limit: req.query.limit?.toString(),
        });

        if (!parsedQuery.success) {
            return res.status(400).json({ success: false, message: "Invalid product list query" });
        }

        const normalized = parsedQuery.data;
        const query: Record<string, unknown> = {};
        const sellerId = normalized.sellerId;
        const category = normalized.category;
        const location = normalized.location;
        const mode = normalized.mode;
        const minPrice = normalized.minPrice;
        const maxPrice = normalized.maxPrice;
        const sort = normalized.sort;
        const page = normalized.page;
        const limit = normalized.limit;

        if (sellerId) query.sellerId = sellerId;
        if (category) query.category = category;
        if (location) query.location = location;
        if (mode) query.mode = mode;
        if (minPrice || maxPrice) {
            query.priceListed = {
                ...(minPrice !== undefined ? { $gte: minPrice } : {}),
                ...(maxPrice !== undefined ? { $lte: maxPrice } : {}),
            };
        }

        const sortMap: Record<string, Record<string, 1 | -1>> = {
            newest: { createdAt: -1 },
            oldest: { createdAt: 1 },
            price_asc: { priceListed: 1 },
            price_desc: { priceListed: -1 },
        };

        const sortBy = sortMap[sort] ?? sortMap.newest;

        const [products, total, categoryFacets, locationFacets, modeFacets] = await Promise.all([
            ProductModel.find(query)
                .sort(sortBy)
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            ProductModel.countDocuments(query),
            ProductModel.aggregate([
                { $match: query },
                { $group: { _id: "$category", count: { $sum: 1 } } },
            ]),
            ProductModel.aggregate([
                { $match: query },
                { $group: { _id: "$location", count: { $sum: 1 } } },
            ]),
            ProductModel.aggregate([
                { $match: query },
                { $group: { _id: "$mode", count: { $sum: 1 } } },
            ]),
        ]);

        return res.status(200).json({
            success: true,
            data: products,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.max(Math.ceil(total / limit), 1),
                sort,
                facets: {
                    category: categoryFacets.map((item) => ({ value: item._id, count: item.count })),
                    location: locationFacets.map((item) => ({ value: item._id, count: item.count })),
                    mode: modeFacets.map((item) => ({ value: item._id, count: item.count })),
                },
            },
        });
    }

    async getProductById(req: Request, res: Response) {
        const product = await ProductModel.findOne(
            this.buildProductLookupFilter(req.params.productId)
        ).lean();
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        return res.status(200).json({ success: true, data: product });
    }

    async getPublicProductPayload(req: Request, res: Response) {
        const product = await ProductModel.findOne(
            this.buildProductLookupFilter(req.params.productId)
        ).lean();
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const seoSlug = product.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .trim()
            .replace(/\s+/g, "-");

        return res.status(200).json({
            success: true,
            data: {
                productId: product.productId,
                title: product.title,
                description: product.description,
                category: product.category,
                location: product.location,
                mode: product.mode,
                priceListed: product.priceListed,
                images: product.images,
                createdAt: product.createdAt,
            },
            meta: {
                seo: {
                    slug: seoSlug,
                    title: `${product.title} | NeoBazaar`,
                    description: product.description.slice(0, 160),
                    canonicalPath: `/products/${product.productId}/${seoSlug}`,
                    openGraphImage: product.images[0] ?? null,
                },
            },
        });
    }
}
