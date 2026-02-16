export const notificationRouteKeys = [
    "dashboard",
    "quests",
    "leaderboard",
    "product_detail",
    "chat_detail",
    "order_timeline",
    "buyer_inbox",
    "profile",
    "admin_dashboard",
    "admin_users",
    "admin_user_detail",
    "admin_flag_triage",
    "admin_dispute_board",
] as const;

export type NotificationRouteKey = (typeof notificationRouteKeys)[number];

export type NotificationRouteParams = {
    productId?: string;
    chatId?: string;
    orderId?: string;
    userId?: string;
    flagId?: string;
    disputeId?: string;
};

export function resolveNotificationRoute(key: NotificationRouteKey, params: NotificationRouteParams = {}): string {
    switch (key) {
        case "dashboard":
            return "/dashboard";
        case "quests":
            return "/dashboard/quests";
        case "leaderboard":
            return "/dashboard/leaderboard";
        case "product_detail":
            if (!params.productId) {
                throw new Error("routeParams.productId is required for product_detail notifications");
            }
            return `/dashboard/products/${params.productId}`;
        case "chat_detail":
            if (!params.chatId) {
                throw new Error("routeParams.chatId is required for chat_detail notifications");
            }
            return `/dashboard/chat/${params.chatId}`;
        case "order_timeline":
            if (!params.orderId) {
                throw new Error("routeParams.orderId is required for order_timeline notifications");
            }
            return `/dashboard/orders/${params.orderId}`;
        case "buyer_inbox":
            return "/dashboard/inbox";
        case "profile":
            return "/user/profile";
        case "admin_dashboard":
            return "/admin/dashboard";
        case "admin_users":
            return "/admin/users";
        case "admin_user_detail":
            if (!params.userId) {
                throw new Error("routeParams.userId is required for admin_user_detail notifications");
            }
            return `/admin/users/${params.userId}`;
        case "admin_flag_triage":
            if (!params.flagId) {
                throw new Error("routeParams.flagId is required for admin_flag_triage notifications");
            }
            return `/admin/flags/${params.flagId}`;
        case "admin_dispute_board":
            if (!params.disputeId) {
                throw new Error("routeParams.disputeId is required for admin_dispute_board notifications");
            }
            return `/admin/disputes/${params.disputeId}`;
        default:
            return "/dashboard";
    }
}