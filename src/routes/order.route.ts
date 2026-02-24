import { Router } from "express";
import { OrderController } from "../controllers/order.controller";
import { orderTimelineEventSchema } from "../dtos/mvp.dto";
import { requireAuth } from "../middleware/auth.middleware";
import { idempotencyMiddleware } from "../middleware/idempotency.middleware";
import { validateBody } from "../middleware/validation.middleware";

const router = Router();
const controller = new OrderController();

router.get("/", requireAuth, controller.listOrders.bind(controller));
router.get("/:orderId/timeline", requireAuth, controller.getOrderTimeline.bind(controller));
router.post("/:orderId/timeline", requireAuth, idempotencyMiddleware, validateBody(orderTimelineEventSchema), controller.appendOrderTimeline.bind(controller));

export default router;
