import { Response } from "express";
import { NotificationModel } from "../models/notification.model";
import { AuthenticatedRequest } from "../types/auth.type";
import { createInAppNotification } from "../services/notification.service";
import { NotificationRouteKey, NotificationRouteParams, resolveNotificationRoute } from "../core/notification-routes";

export class NotificationController {
    async listMine(req: AuthenticatedRequest, res: Response) {
        const userId = req.auth?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const notifications = await NotificationModel.find({ userId }).sort({ createdAt: -1 }).lean();
        return res.status(200).json({ success: true, data: notifications });
    }

    async create(req: AuthenticatedRequest, res: Response) {
        if (req.auth?.role !== "admin") {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }

        const input = req.validatedBody as {
            userId: string;
            type: string;
            title: string;
            body: string;
            routeKey: NotificationRouteKey;
            routeParams?: NotificationRouteParams;
        };

        const route = resolveNotificationRoute(input.routeKey, input.routeParams ?? {});

        const notification = await createInAppNotification({
            userId: input.userId,
            type: input.type,
            title: input.title,
            body: input.body,
            route,
        });
        return res.status(201).json({ success: true, data: notification });
    }

    async markRead(req: AuthenticatedRequest, res: Response) {
        const userId = req.auth?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const notification = await NotificationModel.findOne({ notificationId: req.params.notificationId });
        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }
        if (notification.userId !== userId) {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }

        notification.readAt = new Date();
        await notification.save();

        return res.status(200).json({ success: true, data: notification });
    }
}
