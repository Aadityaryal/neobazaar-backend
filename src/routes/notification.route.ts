import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller";
import { createNotificationSchema } from "../dtos/mvp.dto";
import { requireAuth } from "../middleware/auth.middleware";
import { idempotencyMiddleware } from "../middleware/idempotency.middleware";
import { validateBody } from "../middleware/validation.middleware";

const router = Router();
const controller = new NotificationController();

router.get("/", requireAuth, controller.listMine.bind(controller));
router.post("/", requireAuth, idempotencyMiddleware, validateBody(createNotificationSchema), controller.create.bind(controller));
router.post("/:notificationId/read", requireAuth, idempotencyMiddleware, controller.markRead.bind(controller));

export default router;
