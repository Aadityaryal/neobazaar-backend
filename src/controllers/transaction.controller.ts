import { Request, Response } from "express";
import mongoose from "mongoose";
import { createHash, randomUUID } from "crypto";
import { ProductModel } from "../models/product.model";
import { TransactionModel } from "../models/transaction.model";
import { UserModel } from "../models/user.model";
import { BidModel } from "../models/bid.model";
import { AuthenticatedRequest } from "../types/auth.type";
import { AdminFlagModel } from "../models/admin-flag.model";
import { OrderModel } from "../models/order.model";
import { DisputeModel } from "../models/dispute.model";
import { applyTransactionProgress } from "../services/progression.service";
import { SOCKET_EVENTS } from "../core/socket-events";
import { emitRealtimeEvent } from "../services/realtime-event.service";

function isWithin48Hours(createdAt: Date): boolean {
    return Date.now() - createdAt.getTime() <= 1000 * 60 * 60 * 48;
}

function computeMerkleHash(input: {
    txnId: string;
    buyerId: string;
    sellerId: string;
    tokenAmount: number;
    createdAt: Date;
}): string {
    return createHash("sha256")
        .update(`${input.txnId}${input.buyerId}${input.sellerId}${input.tokenAmount}${input.createdAt.toISOString()}`)
        .digest("hex");
}

export class TransactionController {
    async createTransaction(req: AuthenticatedRequest, res: Response) {
        const input = req.validatedBody as {
            productId: string;
            tokenAmount?: number;
        };

        const buyerId = req.auth?.userId;
        if (!buyerId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const product = await ProductModel.findOne({ productId: input.productId }).lean();
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const sellerId = product.sellerId;
        if (!sellerId) {
            return res.status(400).json({ success: false, message: "Invalid seller ownership" });
        }

        if (sellerId === buyerId) {
            return res.status(409).json({ success: false, message: "Cannot purchase your own listing" });
        }

        // Buy-now price must come from the listing to prevent client-side amount drift.
        let tokenAmount: number;
        if (product.mode === "buy_now") {
            tokenAmount = product.priceListed;
        } else {
            const requestAmount = input.tokenAmount;
            if (typeof requestAmount !== "number" || !Number.isFinite(requestAmount) || requestAmount <= 0) {
                return res.status(400).json({ success: false, message: "Token amount must be a positive number" });
            }
            tokenAmount = requestAmount;
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const buyer = await UserModel.findOne({ userId: buyerId }).session(session);
            const seller = await UserModel.findOne({ userId: sellerId }).session(session);

            if (!buyer || !seller) {
                await session.abortTransaction();
                return res.status(404).json({ success: false, message: "User not found" });
            }

            if (buyer.neoTokens < tokenAmount) {
                await session.abortTransaction();
                return res.status(400).json({ success: false, message: "Insufficient NeoTokens" });
            }

            buyer.neoTokens -= tokenAmount;

            await buyer.save({ session });

            const txnId = randomUUID();
            const createdAt = new Date();
            const merkleHash = computeMerkleHash({
                txnId,
                buyerId,
                sellerId,
                tokenAmount,
                createdAt,
            });

            const [transaction] = await TransactionModel.create(
                [
                    {
                        txnId,
                        buyerId,
                        sellerId,
                        productId: input.productId,
                        tokenAmount,
                        heldTokens: tokenAmount,
                        mode: product.mode,
                        status: "escrow",
                        buyerConfirmed: false,
                        sellerConfirmed: false,
                        merkleHash,
                        createdAt,
                    },
                ],
                { session }
            );

            await OrderModel.create(
                [
                    {
                        orderId: randomUUID(),
                        buyerId,
                        sellerId,
                        productId: input.productId,
                        transactionId: txnId,
                        status: "paid",
                        timeline: [
                            {
                                at: createdAt,
                                status: "created",
                                actor: buyerId,
                                note: "Order created from transaction",
                            },
                            {
                                at: createdAt,
                                status: "paid",
                                actor: buyerId,
                                note: "Funds moved into escrow",
                            },
                        ],
                    },
                ],
                { session }
            );

            await session.commitTransaction();

            return res.status(201).json({
                success: true,
                data: transaction,
                balances: {
                    buyerId,
                    buyerNeoTokens: buyer.neoTokens,
                    sellerId,
                    sellerNeoTokens: seller.neoTokens,
                },
            });
        } catch (error) {
            await session.abortTransaction();
            return res.status(500).json({ success: false, message: "Transaction failed" });
        } finally {
            session.endSession();
        }
    }

    async listTransactions(req: AuthenticatedRequest, res: Response) {
        const actorUserId = req.auth?.userId;
        if (!actorUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const requestedUserId = req.query.userId?.toString();
        const isAdmin = req.auth?.role === "admin";
        const effectiveUserId = isAdmin && requestedUserId ? requestedUserId : actorUserId;

        const query = { $or: [{ buyerId: effectiveUserId }, { sellerId: effectiveUserId }] };
        const transactions = await TransactionModel.find(query).sort({ createdAt: -1 }).lean();
        return res.status(200).json({ success: true, data: transactions });
    }

    async confirmTransaction(req: AuthenticatedRequest, res: Response) {
        const input = req.validatedBody as {
            actor: "buyer" | "seller";
        };

        const actorUserId = req.auth?.userId;
        if (!actorUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const txn = await TransactionModel.findOne({ txnId: req.params.txnId }).session(session);
            if (!txn) {
                await session.abortTransaction();
                return res.status(404).json({ success: false, message: "Transaction not found" });
            }

            if (txn.status !== "escrow") {
                await session.abortTransaction();
                return res.status(400).json({ success: false, message: "Transaction not in escrow" });
            }

            if (input.actor === "buyer" && txn.buyerId !== actorUserId) {
                await session.abortTransaction();
                return res.status(403).json({ success: false, message: "Forbidden" });
            }
            if (input.actor === "seller" && txn.sellerId !== actorUserId) {
                await session.abortTransaction();
                return res.status(403).json({ success: false, message: "Forbidden" });
            }

            if (input.actor === "buyer") txn.buyerConfirmed = true;
            if (input.actor === "seller") txn.sellerConfirmed = true;

            if (txn.buyerConfirmed && txn.sellerConfirmed) {
                const seller = await UserModel.findOne({ userId: txn.sellerId }).session(session);
                const buyer = await UserModel.findOne({ userId: txn.buyerId }).session(session);
                if (!seller || !buyer) {
                    await session.abortTransaction();
                    return res.status(404).json({ success: false, message: "User not found" });
                }

                seller.neoTokens += txn.heldTokens;
                seller.xp += 10;
                buyer.xp += 10;

                txn.status = "completed";
                txn.heldTokens = 0;
                txn.confirmedAt = new Date();

                await seller.save({ session });
                await buyer.save({ session });

                await applyTransactionProgress(txn.buyerId, session);
                await applyTransactionProgress(txn.sellerId, session);

                await txn.save({ session });

                await OrderModel.updateOne(
                    { transactionId: txn.txnId },
                    {
                        $set: { status: "completed" },
                        $push: {
                            timeline: {
                                at: new Date(),
                                status: "completed",
                                actor: "system",
                                note: "Escrow released to seller",
                            },
                        },
                    },
                    { session }
                );

                await session.commitTransaction();
                return res.status(200).json({
                    success: true,
                    data: txn,
                    balances: {
                        buyerId: buyer.userId,
                        buyerNeoTokens: buyer.neoTokens,
                        sellerId: seller.userId,
                        sellerNeoTokens: seller.neoTokens,
                    },
                });
            }

            await txn.save({ session });
            await session.commitTransaction();
            return res.status(200).json({ success: true, data: txn });
        } catch {
            await session.abortTransaction();
            return res.status(500).json({ success: false, message: "Confirmation failed" });
        } finally {
            session.endSession();
        }
    }

    async disputeTransaction(req: AuthenticatedRequest, res: Response) {
        const actorUserId = req.auth?.userId;
        if (!actorUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const input = req.validatedBody as {
            reason: string;
            evidenceUrls: string[];
        };

        const txn = await TransactionModel.findOne({ txnId: req.params.txnId });
        if (!txn) {
            return res.status(404).json({ success: false, message: "Transaction not found" });
        }
        if (txn.buyerId !== actorUserId && txn.sellerId !== actorUserId) {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }
        if (!isWithin48Hours(txn.createdAt)) {
            return res.status(400).json({ success: false, message: "Dispute window expired" });
        }

        const existingDispute = await DisputeModel.findOne({ transactionId: txn.txnId, status: { $in: ["open", "under_review"] } }).lean();
        if (existingDispute) {
            return res.status(409).json({ success: false, message: "Dispute already open for transaction" });
        }

        txn.status = "disputed";
        txn.disputedAt = new Date();
        await txn.save();

        const order = await OrderModel.findOne({ transactionId: txn.txnId }).lean();
        const againstUserId = actorUserId === txn.buyerId ? txn.sellerId : txn.buyerId;

        const dispute = await DisputeModel.create({
            disputeId: randomUUID(),
            transactionId: txn.txnId,
            orderId: order?.orderId,
            openedByUserId: actorUserId,
            againstUserId,
            reason: input.reason,
            evidenceUrls: input.evidenceUrls ?? [],
            status: "open",
        });

        await OrderModel.updateOne(
            { transactionId: txn.txnId },
            {
                $set: { status: "disputed" },
                $push: {
                    timeline: {
                        at: new Date(),
                        status: "disputed",
                        actor: actorUserId,
                        note: "Dispute opened",
                    },
                },
            }
        );

        await AdminFlagModel.create({
            flagId: randomUUID(),
            productId: txn.productId,
            sellerId: txn.sellerId,
            reason: "transaction_dispute",
            detectedAt: new Date(),
            resolved: false,
        });

        return res.status(200).json({ success: true, data: { transaction: txn, dispute } });
    }

    async appendDisputeEvidence(req: AuthenticatedRequest, res: Response) {
        const actorUserId = req.auth?.userId;
        if (!actorUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const input = req.validatedBody as {
            evidenceUrls: string[];
        };

        const txn = await TransactionModel.findOne({ txnId: req.params.txnId }).lean();
        if (!txn) {
            return res.status(404).json({ success: false, message: "Transaction not found" });
        }

        if (txn.buyerId !== actorUserId && txn.sellerId !== actorUserId) {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }

        const dispute = await DisputeModel.findOneAndUpdate(
            {
                transactionId: req.params.txnId,
                status: { $in: ["open", "under_review"] },
            },
            {
                $addToSet: {
                    evidenceUrls: { $each: input.evidenceUrls },
                },
            },
            { new: true }
        ).lean();

        if (!dispute) {
            return res.status(404).json({ success: false, message: "Active dispute not found" });
        }

        return res.status(200).json({ success: true, data: dispute });
    }

    async placeBid(req: AuthenticatedRequest, res: Response) {
        const input = req.validatedBody as {
            productId: string;
            amount: number;
        };

        const bidderId = req.auth?.userId;
        if (!bidderId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const product = await ProductModel.findOne({ productId: input.productId }).lean();
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        if (product.mode !== "auction") {
            return res.status(400).json({ success: false, message: "Bids allowed only for auction mode" });
        }

        const bid = await BidModel.create({
            bidId: randomUUID(),
            productId: input.productId,
            bidderId,
            amount: input.amount,
            timestamp: new Date(),
        });

        const bids = await BidModel.find({ productId: input.productId }).sort({ amount: -1, timestamp: 1 }).lean();

        emitRealtimeEvent(SOCKET_EVENTS.AUCTION_BID_PLACED, { productId: input.productId, bid });

        return res.status(201).json({ success: true, data: { bid, bids } });
    }
}
