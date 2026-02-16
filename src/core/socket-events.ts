export const SOCKET_EVENTS = {
    CHAT_MESSAGE_CREATED: "chat:message.created.v1",
    CHAT_AI_SUGGESTION_CREATED: "chat:suggestion.created.v1",
    CHAT_MESSAGE_RECEIPT_UPDATED: "chat:message.receipt.updated.v1",
    AUCTION_BID_PLACED: "auction:bid.placed.v1",
    ADMIN_FLAG_UPDATED: "admin:flag.updated.v1",
    ADMIN_DISPUTE_DECIDED: "admin:dispute.decided.v1",
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
