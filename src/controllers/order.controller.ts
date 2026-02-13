import { Response } from "express";
import { OrderModel } from "../models/order.model";
import { AuthenticatedRequest } from "../types/auth.type";

export class OrderController {
    async listOrders(req: AuthenticatedRequest, res: Response) {
        const userId = req.auth?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const orders = await OrderModel.find({ $or: [{ buyerId: userId }, { sellerId: userId }] })
            .sort({ updatedAt: -1 })
            .lean();

        return res.status(200).json({ success: true, data: orders });
    }

    async getOrderTimeline(req: AuthenticatedRequest, res: Response) {
        const userId = req.auth?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const order = await OrderModel.findOne({ orderId: req.params.orderId }).lean();
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        if (order.buyerId !== userId && order.sellerId !== userId) {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }

        return res.status(200).json({ success: true, data: order.timeline, meta: { orderStatus: order.status } });
    }

    async appendOrderTimeline(req: AuthenticatedRequest, res: Response) {
        const userId = req.auth?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const input = req.validatedBody as { status: string; note?: string };

        const order = await OrderModel.findOne({ orderId: req.params.orderId });
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        if (order.buyerId !== userId && order.sellerId !== userId) {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }

        order.status = input.status as typeof order.status;
        order.timeline.push({
            at: new Date(),
            status: input.status,
            actor: userId,
            note: input.note,
        });
        await order.save();

        return res.status(200).json({ success: true, data: order });
    }
}
