import request from "supertest";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import app from "../../app";
import { UserModel } from "../../models/user.model";
import { ProductModel } from "../../models/product.model";
import { TransactionModel } from "../../models/transaction.model";
import { OrderModel } from "../../models/order.model";
import { AUTH_COOKIE_NAME, JWT_SECRET } from "../../config";

jest.setTimeout(30000);

describe("Transaction API Integration Tests", () => {
    const suffix = randomUUID().slice(0, 8);
    const buyerEmail = `txn-buyer-${suffix}@example.com`;
    const sellerEmail = `txn-seller-${suffix}@example.com`;
    const password = "password123";

    const buyNowProductId = `txn-buy-now-${suffix}`;
    const auctionProductId = `txn-auction-${suffix}`;
    const buyNowPrice = 120;

    let buyerUserId = "";
    let sellerUserId = "";
    let buyerCookie = "";

    const buildAuthCookie = (userId: string, email: string, role: "user" | "admin") => {
        const token = jwt.sign({ userId, email, role, scopes: role === "admin" ? ["admin.view"] : [] }, JWT_SECRET, {
            expiresIn: "7d",
        });
        return `${AUTH_COOKIE_NAME}=${token}`;
    };

    beforeAll(async () => {
        await UserModel.deleteMany({ email: { $in: [buyerEmail, sellerEmail] } });
        await ProductModel.deleteMany({ productId: { $in: [buyNowProductId, auctionProductId] } });
        await TransactionModel.deleteMany({ productId: { $in: [buyNowProductId, auctionProductId] } });
        await OrderModel.deleteMany({ productId: { $in: [buyNowProductId, auctionProductId] } });

        const sellerRegister = await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "Txn Seller",
                email: sellerEmail,
                password,
                location: "Kathmandu",
            });

        expect(sellerRegister.statusCode).toBe(201);

        const buyerRegister = await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "Txn Buyer",
                email: buyerEmail,
                password,
                location: "Pokhara",
            });

        expect(buyerRegister.statusCode).toBe(201);

        const seller = await UserModel.findOne({ email: sellerEmail }).lean();
        const buyer = await UserModel.findOne({ email: buyerEmail }).lean();

        if (!seller || !buyer) {
            throw new Error("Failed to bootstrap transaction test users");
        }

        sellerUserId = seller.userId;
        buyerUserId = buyer.userId;
        buyerCookie = buildAuthCookie(buyer.userId, buyer.email, buyer.role);

        await ProductModel.create({
            productId: buyNowProductId,
            sellerId: sellerUserId,
            title: "Buy Now Test Listing",
            description: "Buy now listing for transaction regression",
            category: "electronics",
            images: [],
            priceListed: buyNowPrice,
            aiSuggestedPrice: buyNowPrice,
            aiCondition: "good",
            aiVerified: true,
            aiConfidence: 1,
            imageHash: `hash-buy-now-${suffix}`,
            mode: "buy_now",
            flagged: false,
            location: "Kathmandu",
        });

        await ProductModel.create({
            productId: auctionProductId,
            sellerId: sellerUserId,
            title: "Auction Test Listing",
            description: "Auction listing for validation check",
            category: "books",
            images: [],
            priceListed: 75,
            aiSuggestedPrice: 75,
            aiCondition: "fair",
            aiVerified: true,
            aiConfidence: 1,
            imageHash: `hash-auction-${suffix}`,
            mode: "auction",
            flagged: false,
            location: "Lalitpur",
        });
    });

    afterAll(async () => {
        await OrderModel.deleteMany({ productId: { $in: [buyNowProductId, auctionProductId] } });
        await TransactionModel.deleteMany({ productId: { $in: [buyNowProductId, auctionProductId] } });
        await ProductModel.deleteMany({ productId: { $in: [buyNowProductId, auctionProductId] } });
        await UserModel.deleteMany({ email: { $in: [buyerEmail, sellerEmail] } });
    });

    test("POST /api/v1/transactions buy-now uses listing price for escrow and buyer debit", async () => {
        const buyerBefore = await UserModel.findOne({ userId: buyerUserId }).lean();
        const sellerBefore = await UserModel.findOne({ userId: sellerUserId }).lean();

        expect(buyerBefore).toBeTruthy();
        expect(sellerBefore).toBeTruthy();

        const createRes = await request(app)
            .post("/api/v1/transactions")
            .set("Cookie", buyerCookie)
            .send({
                productId: buyNowProductId,
                tokenAmount: 1,
            });

        expect(createRes.statusCode).toBe(201);
        expect(createRes.body.success).toBe(true);

        const txn = await TransactionModel.findOne({ productId: buyNowProductId }).lean();
        expect(txn).toBeTruthy();
        expect(txn?.status).toBe("escrow");
        expect(txn?.tokenAmount).toBe(buyNowPrice);
        expect(txn?.heldTokens).toBe(buyNowPrice);

        const order = await OrderModel.findOne({ productId: buyNowProductId }).lean();
        expect(order).toBeTruthy();
        expect(order?.transactionId).toBe(txn?.txnId);
        expect(order?.status).toBe("paid");
        expect(order?.timeline.map((entry) => entry.status)).toEqual(expect.arrayContaining(["created", "paid"]));

        const buyerAfter = await UserModel.findOne({ userId: buyerUserId }).lean();
        const sellerAfter = await UserModel.findOne({ userId: sellerUserId }).lean();

        expect(buyerAfter?.neoTokens).toBe((buyerBefore?.neoTokens ?? 0) - buyNowPrice);
        expect(sellerAfter?.neoTokens).toBe(sellerBefore?.neoTokens);
    });

    test("POST /api/v1/transactions auction rejects missing tokenAmount", async () => {
        const createRes = await request(app)
            .post("/api/v1/transactions")
            .set("Cookie", buyerCookie)
            .send({
                productId: auctionProductId,
            });

        expect(createRes.statusCode).toBe(400);
        expect(createRes.body.success).toBe(false);
        expect(createRes.body.message).toContain("Token amount");
    });
});
