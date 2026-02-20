import mongoose, { Document, Schema } from "mongoose";

export interface INotification extends Document {
    notificationId: string;
    userId: string;
    type: string;
    title: string;
    body: string;
    route: string;
    readAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
    {
        notificationId: { type: String, required: true, unique: true },
        userId: { type: String, required: true, index: true },
        type: { type: String, required: true },
        title: { type: String, required: true },
        body: { type: String, required: true },
        route: { type: String, required: true },
        readAt: { type: Date },
    },
    { timestamps: true }
);

export const NotificationModel = mongoose.model<INotification>("Notification", NotificationSchema);
