import mongoose, { Document, Schema } from "mongoose";

export interface IChat extends Document {
    chatId: string;
    buyerId: string;
    sellerId: string;
    productId: string;
    createdAt: Date;
}

export interface IMessage extends Document {
    messageId: string;
    chatId: string;
    senderId: string;
    content: string;
    isAISuggestion: boolean;
    deliveredTo: string[];
    readBy: string[];
    timestamp: Date;
}

const ChatSchema = new Schema<IChat>(
    {
        chatId: { type: String, required: true, unique: true },
        buyerId: { type: String, required: true, index: true },
        sellerId: { type: String, required: true, index: true },
        productId: { type: String, required: true, index: true },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

const MessageSchema = new Schema<IMessage>(
    {
        messageId: { type: String, required: true, unique: true },
        chatId: { type: String, required: true, index: true },
        senderId: { type: String, required: true, index: true },
        content: { type: String, required: true },
        isAISuggestion: { type: Boolean, required: true, default: false },
        deliveredTo: { type: [String], required: true, default: [] },
        readBy: { type: [String], required: true, default: [] },
        timestamp: { type: Date, required: true, default: Date.now },
    },
    {
        timestamps: false,
    }
);

export const ChatModel = mongoose.model<IChat>("Chat", ChatSchema);
export const MessageModel = mongoose.model<IMessage>("Message", MessageSchema);
