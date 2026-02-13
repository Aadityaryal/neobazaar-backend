import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { ChatModel, MessageModel } from "../models/chat.model";
import { ProductModel } from "../models/product.model";
import { UserModel } from "../models/user.model";
import { AuthenticatedRequest } from "../types/auth.type";
import { SOCKET_EVENTS } from "../core/socket-events";
import { emitRealtimeEvent, getRealtimeReplay } from "../services/realtime-event.service";

export class ChatController {
    async listMine(req: AuthenticatedRequest, res: Response) {
        const userId = req.auth?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const chats = await ChatModel.find({ $or: [{ buyerId: userId }, { sellerId: userId }] })
            .sort({ createdAt: -1 })
            .lean();

        const productIds = [...new Set(chats.map((chat) => chat.productId))];
        const participantIds = [
            ...new Set(
                chats.map((chat) => (chat.buyerId === userId ? chat.sellerId : chat.buyerId))
            ),
        ];

        const [products, participants] = await Promise.all([
            ProductModel.find({ productId: { $in: productIds } })
                .select("productId title")
                .lean(),
            UserModel.find({ userId: { $in: participantIds } })
                .select("userId name")
                .lean(),
        ]);

        const productTitleById = new Map(products.map((product) => [product.productId, product.title]));
        const participantNameById = new Map(participants.map((participant) => [participant.userId, participant.name]));

        const data = await Promise.all(
            chats.map(async (chat) => {
                const [lastHumanMessage, lastMessage, unreadCount] = await Promise.all([
                    MessageModel.findOne({ chatId: chat.chatId, isAISuggestion: false })
                        .sort({ timestamp: -1 })
                        .lean(),
                    MessageModel.findOne({ chatId: chat.chatId }).sort({ timestamp: -1 }).lean(),
                    MessageModel.countDocuments({
                        chatId: chat.chatId,
                        senderId: { $ne: userId },
                        readBy: { $ne: userId },
                    }),
                ]);

                return {
                    ...chat,
                    title: productTitleById.get(chat.productId) ?? undefined,
                    participantName: participantNameById.get(chat.buyerId === userId ? chat.sellerId : chat.buyerId) ?? undefined,
                    lastMessage,
                    lastHumanMessage,
                    unreadCount,
                };
            })
        );

        return res.status(200).json({ success: true, data });
    }

    async createChat(req: AuthenticatedRequest, res: Response) {
        const authUserId = req.auth?.userId;
        if (!authUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const input = req.validatedBody as {
            buyerId: string;
            sellerId: string;
            productId: string;
        };

        if (input.buyerId !== authUserId && input.sellerId !== authUserId) {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }

        const existing = await ChatModel.findOne({
            buyerId: input.buyerId,
            sellerId: input.sellerId,
            productId: input.productId,
        }).lean();

        if (existing) {
            return res.status(200).json({ success: true, data: existing });
        }

        const chat = await ChatModel.create({
            chatId: randomUUID(),
            buyerId: input.buyerId,
            sellerId: input.sellerId,
            productId: input.productId,
        });

        return res.status(201).json({ success: true, data: chat });
    }

    async sendMessage(req: AuthenticatedRequest, res: Response) {
        const input = req.validatedBody as {
            content: string;
        };

        const senderId = req.auth?.userId;
        if (!senderId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const chat = await ChatModel.findOne({ chatId: req.params.chatId }).lean();
        if (!chat) {
            return res.status(404).json({ success: false, message: "Chat not found" });
        }

        const isParticipant = chat.buyerId === senderId || chat.sellerId === senderId;
        if (!isParticipant) {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }

        const message = await MessageModel.create({
            messageId: randomUUID(),
            chatId: req.params.chatId,
            senderId,
            content: input.content,
            isAISuggestion: false,
            deliveredTo: [senderId],
            readBy: [senderId],
            timestamp: new Date(),
        });

        emitRealtimeEvent(SOCKET_EVENTS.CHAT_MESSAGE_CREATED, message);

        return res.status(201).json({ success: true, data: message });
    }

    async listMessages(req: AuthenticatedRequest, res: Response) {
        const userId = req.auth?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const chat = await ChatModel.findOne({ chatId: req.params.chatId }).lean();
        if (!chat) {
            return res.status(404).json({ success: false, message: "Chat not found" });
        }

        const isParticipant = chat.buyerId === userId || chat.sellerId === userId;
        if (!isParticipant) {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }

        const messages = await MessageModel.find({ chatId: req.params.chatId }).sort({ timestamp: 1 }).lean();
        return res.status(200).json({ success: true, data: messages });
    }

    async replayEvents(req: Request, res: Response) {
        const sinceRaw = req.query.since?.toString();
        const limitRaw = req.query.limit?.toString();

        const since = sinceRaw ? new Date(sinceRaw) : undefined;
        const limit = limitRaw ? Number(limitRaw) : 100;
        const replay = getRealtimeReplay(since, Number.isFinite(limit) ? limit : 100);

        return res.status(200).json({
            success: true,
            data: replay,
            meta: {
                replayCount: replay.length,
                since: since?.toISOString(),
            },
        });
    }

    async markMessageRead(req: AuthenticatedRequest, res: Response) {
        const userId = req.auth?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const chat = await ChatModel.findOne({ chatId: req.params.chatId }).lean();
        if (!chat) {
            return res.status(404).json({ success: false, message: "Chat not found" });
        }

        const isParticipant = chat.buyerId === userId || chat.sellerId === userId;
        if (!isParticipant) {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }

        const updated = await MessageModel.findOneAndUpdate(
            {
                chatId: req.params.chatId,
                messageId: req.params.messageId,
            },
            {
                $addToSet: {
                    deliveredTo: userId,
                    readBy: userId,
                },
            },
            { new: true }
        ).lean();

        if (!updated) {
            return res.status(404).json({ success: false, message: "Message not found" });
        }

        const receiptPayload = {
            chatId: req.params.chatId,
            messageId: req.params.messageId,
            deliveredTo: updated.deliveredTo,
            readBy: updated.readBy,
            updatedAt: new Date().toISOString(),
        };

        emitRealtimeEvent(SOCKET_EVENTS.CHAT_MESSAGE_RECEIPT_UPDATED, receiptPayload);

        return res.status(200).json({ success: true, data: receiptPayload });
    }
}
