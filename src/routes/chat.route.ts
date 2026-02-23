import { Router } from "express";
import { ChatController } from "../controllers/chat.controller";
import { createChatSchema, sendMessageSchema } from "../dtos/mvp.dto";
import { attachAuthIfPresent, requireAuth } from "../middleware/auth.middleware";
import { idempotencyMiddleware } from "../middleware/idempotency.middleware";
import { validateBody } from "../middleware/validation.middleware";

const router = Router();
const controller = new ChatController();

router.get("/", requireAuth, controller.listMine.bind(controller));
router.get("/replay", attachAuthIfPresent, controller.replayEvents.bind(controller));
router.post("/", requireAuth, idempotencyMiddleware, validateBody(createChatSchema), controller.createChat.bind(controller));
router.get("/:chatId/messages", requireAuth, controller.listMessages.bind(controller));
router.post("/:chatId/messages", requireAuth, idempotencyMiddleware, validateBody(sendMessageSchema), controller.sendMessage.bind(controller));
router.post("/:chatId/messages/:messageId/read", requireAuth, idempotencyMiddleware, controller.markMessageRead.bind(controller));

export default router;
