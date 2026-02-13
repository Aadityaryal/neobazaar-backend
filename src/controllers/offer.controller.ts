import { Response } from "express";
import { randomUUID } from "crypto";
import { OfferModel } from "../models/offer.model";
import { ProductModel } from "../models/product.model";
import { AuthenticatedRequest } from "../types/auth.type";

export class OfferController {
    async createOffer(req: AuthenticatedRequest, res: Response) {
        const buyerId = req.auth?.userId;
        if (!buyerId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const input = req.validatedBody as {
            productId: string;
            amount: number;
            expiresAt?: Date;
        };

        const product = await ProductModel.findOne({ productId: input.productId }).lean();
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const offer = await OfferModel.create({
            offerId: randomUUID(),
            productId: input.productId,
            buyerId,
            sellerId: product.sellerId,
            amount: input.amount,
            status: "pending",
            expiresAt: input.expiresAt,
        });

        return res.status(201).json({ success: true, data: offer });
    }

    async listOffers(req: AuthenticatedRequest, res: Response) {
        const userId = req.auth?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const offers = await OfferModel.find({ $or: [{ buyerId: userId }, { sellerId: userId }] }).sort({ createdAt: -1 }).lean();
        return res.status(200).json({ success: true, data: offers });
    }

    async counterOffer(req: AuthenticatedRequest, res: Response) {
        const sellerId = req.auth?.userId;
        if (!sellerId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const input = req.validatedBody as { counterAmount: number };
        const offer = await OfferModel.findOne({ offerId: req.params.offerId });
        if (!offer) {
            return res.status(404).json({ success: false, message: "Offer not found" });
        }

        if (offer.sellerId !== sellerId) {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }

        offer.status = "countered";
        offer.counterAmount = input.counterAmount;
        await offer.save();

        return res.status(200).json({ success: true, data: offer });
    }

    async acceptOffer(req: AuthenticatedRequest, res: Response) {
        const sellerId = req.auth?.userId;
        if (!sellerId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const offer = await OfferModel.findOne({ offerId: req.params.offerId });
        if (!offer) {
            return res.status(404).json({ success: false, message: "Offer not found" });
        }

        if (offer.sellerId !== sellerId) {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }

        offer.status = "accepted";
        await offer.save();

        return res.status(200).json({ success: true, data: offer });
    }

    async rejectOffer(req: AuthenticatedRequest, res: Response) {
        const sellerId = req.auth?.userId;
        if (!sellerId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const offer = await OfferModel.findOne({ offerId: req.params.offerId });
        if (!offer) {
            return res.status(404).json({ success: false, message: "Offer not found" });
        }

        if (offer.sellerId !== sellerId) {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }

        offer.status = "rejected";
        await offer.save();

        return res.status(200).json({ success: true, data: offer });
    }
}
