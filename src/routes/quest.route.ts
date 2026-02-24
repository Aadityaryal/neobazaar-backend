import { Router } from "express";
import { QuestController } from "../controllers/quest.controller";
import { createQuestSchema } from "../dtos/mvp.dto";
import { requireAuth } from "../middleware/auth.middleware";
import { requireAdmin } from "../middleware/admin.middleware";
import { idempotencyMiddleware } from "../middleware/idempotency.middleware";
import { validateBody } from "../middleware/validation.middleware";

const router = Router();
const controller = new QuestController();

router.get("/", requireAuth, controller.listActiveQuests.bind(controller));
router.post("/", requireAuth, requireAdmin, idempotencyMiddleware, validateBody(createQuestSchema), controller.createQuest.bind(controller));
router.post("/:questId/complete", requireAuth, idempotencyMiddleware, controller.completeQuest.bind(controller));

export default router;
