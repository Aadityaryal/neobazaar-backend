import cron from "node-cron";
import { createHash, randomUUID } from "crypto";
import mongoose from "mongoose";
import { ProductModel } from "../models/product.model";
import { BidModel } from "../models/bid.model";
import { TransactionModel } from "../models/transaction.model";
import { UserModel } from "../models/user.model";

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

export async function settleEndedAuctions(): Promise<void> {
    const now = new Date();
    const products = await ProductModel.find({ mode: "auction", activeUntil: { $lte: now } });

    for (const product of products) {
        const existingTxn = await TransactionModel.findOne({ productId: product.productId });
        if (existingTxn) {
            product.activeUntil = undefined;
            await product.save();
            continue;
        }

        const highestBid = await BidModel.findOne({ productId: product.productId }).sort({ amount: -1, timestamp: 1 });
        if (!highestBid) {
            product.activeUntil = undefined;
            await product.save();
            continue;
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const buyer = await UserModel.findOne({ userId: highestBid.bidderId }).session(session);
            const seller = await UserModel.findOne({ userId: product.sellerId }).session(session);

            if (!buyer || !seller || buyer.neoTokens < highestBid.amount) {
                await session.abortTransaction();
                session.endSession();
                product.activeUntil = undefined;
                await product.save();
                continue;
            }

            buyer.neoTokens -= highestBid.amount;
            await buyer.save({ session });

            const txnId = randomUUID();
            const createdAt = new Date();
            const merkleHash = computeMerkleHash({
                txnId,
                buyerId: buyer.userId,
                sellerId: seller.userId,
                tokenAmount: highestBid.amount,
                createdAt,
            });

            await TransactionModel.create(
                [
                    {
                        txnId,
                        buyerId: buyer.userId,
                        sellerId: seller.userId,
                        productId: product.productId,
                        tokenAmount: highestBid.amount,
                        heldTokens: highestBid.amount,
                        mode: "auction",
                        status: "escrow",
                        buyerConfirmed: false,
                        sellerConfirmed: false,
                        merkleHash,
                        createdAt,
                    },
                ],
                { session }
            );

            await session.commitTransaction();
            product.activeUntil = undefined;
            await product.save();
        } catch {
            await session.abortTransaction();
        } finally {
            session.endSession();
        }
    }
}

export function startAuctionSettlementCron(): void {
    cron.schedule("*/1 * * * *", async () => {
        if (mongoose.connection.readyState !== 1) {
            console.warn(
                JSON.stringify({
                    job: "auction_settlement",
                    status: "skipped",
                    reason: "mongodb_not_connected",
                    readyState: mongoose.connection.readyState,
                })
            );
            return;
        }

        try {
            await settleEndedAuctions();
        } catch (error) {
            console.error("auction_settlement_failed", error);
        }
    });
}
