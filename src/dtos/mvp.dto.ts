import z from "zod";
import { notificationRouteKeys } from "../core/notification-routes";

export const registerSchema = z.object({
    name: z.string().min(1),
    email: z.email(),
    password: z.string().min(6),
    location: z.string().optional().default(""),
});

export const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(6),
});

export const verificationChallengeSchema = z.object({
    channel: z.enum(["email"]).default("email"),
});

export const verificationSubmitSchema = z.object({
    challengeId: z.string().min(1),
    code: z.string().length(6),
});

export const productCreateSchema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    category: z.string().min(1),
    images: z.array(z.string()).default([]),
    priceListed: z.number().int().nonnegative(),
    mode: z.enum(["buy_now", "auction", "donate"]),
    location: z.string().min(1),
    activeUntil: z.coerce.date().optional(),
});

export const productListQuerySchema = z.object({
    sellerId: z.string().optional(),
    category: z.string().optional(),
    location: z.string().optional(),
    mode: z.enum(["buy_now", "auction", "donate"]).optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    sort: z.enum(["newest", "oldest", "price_asc", "price_desc"]).optional().default("newest"),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const transactionCreateSchema = z.object({
    productId: z.string().min(1),
    tokenAmount: z.number().int().positive().optional(),
});

export const bidCreateSchema = z.object({
    productId: z.string().min(1),
    amount: z.number().int().positive(),
});

export const createChatSchema = z.object({
    buyerId: z.string().min(1),
    sellerId: z.string().min(1),
    productId: z.string().min(1),
});

export const sendMessageSchema = z.object({
    content: z.string().min(1),
});

export const confirmTransactionSchema = z.object({
    actor: z.enum(["buyer", "seller"]),
});

export const disputeTransactionSchema = z.object({
    reason: z.string().min(3).max(300),
    evidenceUrls: z.array(z.string().min(1)).optional().default([]),
});

export const disputeEvidenceAppendSchema = z.object({
    evidenceUrls: z.array(z.string().min(1)).min(1),
});

export const createQuestSchema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    rewardTokens: z.number().int().positive(),
    rewardXP: z.number().int().positive(),
    activeUntil: z.coerce.date(),
});

export const leaderboardTabSchema = z.object({
    tab: z.enum(["global", "local"]),
});

export const patchUserSchema = z
    .object({
        name: z.string().min(1).optional(),
        location: z.string().optional(),
        kycVerified: z.boolean().optional(),
    })
    .refine((data) => data.name !== undefined || data.location !== undefined || data.kycVerified !== undefined, {
        message: "At least one field is required",
    });

export const submitKycSchema = z.object({
    note: z.string().max(300).optional(),
});

export const reviewKycSchema = z.object({
    status: z.enum(["verified", "rejected"]),
    reason: z.string().max(300).optional(),
});

export const createOfferSchema = z.object({
    productId: z.string().min(1),
    amount: z.number().int().positive(),
    expiresAt: z.coerce.date().optional(),
});

export const counterOfferSchema = z.object({
    counterAmount: z.number().int().positive(),
});

export const createReviewSchema = z.object({
    transactionId: z.string().min(1),
    productId: z.string().min(1),
    revieweeId: z.string().min(1),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(500).optional(),
});

export const orderTimelineEventSchema = z.object({
    status: z.enum(["created", "paid", "in_transit", "delivered", "completed", "cancelled", "disputed"]),
    note: z.string().max(500).optional(),
});

export const createCampaignSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    budgetTokens: z.number().int().nonnegative(),
});

export const updateCampaignStatusSchema = z.object({
    status: z.enum(["draft", "active", "paused", "ended"]),
});

export const bulkImportListingSchema = z.object({
    items: z.array(
        z.object({
            title: z.string().min(1),
            description: z.string().min(1),
            category: z.string().min(1),
            location: z.string().min(1),
            mode: z.enum(["buy_now", "auction", "donate"]),
            priceListed: z.number().int().nonnegative(),
            images: z.array(z.string()).optional().default([]),
        })
    ),
});

export const createNotificationSchema = z.object({
    userId: z.string().min(1),
    type: z.string().min(1),
    title: z.string().min(1),
    body: z.string().min(1),
    routeKey: z.enum(notificationRouteKeys),
    routeParams: z
        .object({
            productId: z.string().min(1).optional(),
            chatId: z.string().min(1).optional(),
            orderId: z.string().min(1).optional(),
            userId: z.string().min(1).optional(),
            flagId: z.string().min(1).optional(),
            disputeId: z.string().min(1).optional(),
        })
        .optional()
        .default({}),
});

export const createReferralAttributionSchema = z.object({
    code: z.string().min(3),
    referredUserId: z.string().min(1),
});

export const adminDisputeDecisionSchema = z.object({
    outcome: z.enum(["refund_buyer", "release_seller"]),
    resolutionNote: z.string().max(500).optional(),
});

export const adminCreateUserSchema = z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().optional(),
    name: z.string().min(1).optional(),
    email: z.email(),
    password: z.string().min(6),
    role: z.enum(["user", "admin"]).optional().default("user"),
    location: z.string().optional(),
}).refine((data) => Boolean(data.name?.trim()) || Boolean(data.firstName?.trim()), {
    message: "Either name or firstName is required",
});

export const adminUpdateUserSchema = z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().optional(),
    name: z.string().min(1).optional(),
    email: z.email().optional(),
    password: z.string().min(6).optional(),
    role: z.enum(["user", "admin"]).optional(),
    location: z.string().optional(),
}).refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
});
