import { randomUUID } from "crypto";
import { NotificationModel } from "../models/notification.model";

export async function createInAppNotification(input: {
    userId: string;
    type: string;
    title: string;
    body: string;
    route: string;
}) {
    const notification = await NotificationModel.create({
        notificationId: randomUUID(),
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        route: input.route,
    });

    console.info(
        JSON.stringify({
            hook: "notification_email_push",
            userId: input.userId,
            type: input.type,
            title: input.title,
        })
    );

    return notification;
}
