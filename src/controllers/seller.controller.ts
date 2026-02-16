import { Response } from "express";
import { randomUUID } from "crypto";
import { ProductModel } from "../models/product.model";
import { TransactionModel } from "../models/transaction.model";
import { AuthenticatedRequest } from "../types/auth.type";

export class SellerController {
    async listingPerformance(req: AuthenticatedRequest, res: Response) {
        const sellerId = req.auth?.userId;
        if (!sellerId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const [products, completedTransactions] = await Promise.all([
            ProductModel.find({ sellerId }).lean(),
            TransactionModel.find({ sellerId, status: "completed" }).lean(),
        ]);

        const byProduct = products.map((product) => {
            const transactions = completedTransactions.filter((txn) => txn.productId === product.productId);
            const revenue = transactions.reduce((sum, txn) => sum + txn.tokenAmount, 0);
            return {
                _id: product._id,
                productId: product.productId,
                sellerId: product.sellerId,
                title: product.title,
                description: product.description,
                category: product.category,
                location: product.location,
                images: product.images,
                imageHash: product.imageHash,
                flagged: product.flagged,
                mode: product.mode,
                aiCondition: product.aiCondition,
                aiConfidence: product.aiConfidence,
                aiSuggestedPrice: product.aiSuggestedPrice,
                aiVerified: product.aiVerified,
                createdAt: product.createdAt,
                salesCount: transactions.length,
                revenueTokens: revenue,
                priceListed: product.priceListed,
                listedPrice: product.priceListed,
            };
        });

        return res.status(200).json({
            success: true,
            data: {
                totals: {
                    listings: products.length,
                    completedTransactions: completedTransactions.length,
                    revenueTokens: completedTransactions.reduce((sum, txn) => sum + txn.tokenAmount, 0),
                },
                byProduct,
            },
        });
    }

    async bulkImportListings(req: AuthenticatedRequest, res: Response) {
        const sellerId = req.auth?.userId;
        if (!sellerId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const input = req.validatedBody as {
            items: Array<{
                title: string;
                description: string;
                category: string;
                location: string;
                mode: "buy_now" | "auction" | "donate";
                priceListed: number;
                images?: string[];
            }>;
        };

        const validItems: typeof input.items = [];
        const rejected: Array<{ index: number; reason: string }> = [];

        input.items.forEach((item, index) => {
            if (!item.title.trim()) {
                rejected.push({ index, reason: "title is required" });
                return;
            }
            if (item.priceListed < 0) {
                rejected.push({ index, reason: "priceListed must be >= 0" });
                return;
            }
            validItems.push(item);
        });

        const created = await ProductModel.insertMany(
            validItems.map((item) => ({
                productId: randomUUID(),
                sellerId,
                title: item.title,
                description: item.description,
                category: item.category,
                images: item.images ?? [],
                priceListed: item.priceListed,
                aiSuggestedPrice: item.priceListed,
                aiCondition: "unknown",
                aiVerified: false,
                aiConfidence: 0,
                imageHash: `${sellerId}-${item.title}-${Date.now()}`,
                mode: item.mode,
                flagged: false,
                location: item.location,
            }))
        );

        return res.status(201).json({
            success: true,
            data: {
                createdCount: created.length,
                rejectedCount: rejected.length,
                rejected,
            },
        });
    }

    async payoutLedger(req: AuthenticatedRequest, res: Response) {
        const sellerId = req.auth?.userId;
        if (!sellerId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const transactions = await TransactionModel.find({ sellerId, status: "completed" }).sort({ confirmedAt: -1 }).lean();
        const ledger = transactions.map((txn) => ({
            ledgerId: txn.txnId,
            type: "settlement",
            transactionId: txn.txnId,
            amountTokens: txn.tokenAmount,
            settledAt: txn.confirmedAt ?? txn.createdAt,
        }));

        return res.status(200).json({
            success: true,
            data: {
                totalSettledTokens: ledger.reduce((sum, item) => sum + item.amountTokens, 0),
                entries: ledger,
            },
        });
    }
}
