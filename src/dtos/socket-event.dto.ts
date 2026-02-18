import z from "zod";

export const chatMessageEventSchema = z.object({
    messageId: z.string(),
    chatId: z.string(),
    senderId: z.string(),
    content: z.string(),
    isAISuggestion: z.boolean(),
    timestamp: z.coerce.date(),
});

export const auctionBidPlacedEventSchema = z.object({
    productId: z.string(),
    bid: z.object({
        bidId: z.string(),
        bidderId: z.string(),
        amount: z.number(),
        timestamp: z.coerce.date(),
    }),
});
