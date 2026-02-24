import { Router } from "express";
import { ReferralController } from "../controllers/referral.controller";
import { createReferralAttributionSchema } from "../dtos/mvp.dto";
import { requireAuth } from "../middleware/auth.middleware";
import { idempotencyMiddleware } from "../middleware/idempotency.middleware";
import { validateBody } from "../middleware/validation.middleware";

const router = Router();
const controller = new ReferralController();

router.get("/", requireAuth, controller.listMine.bind(controller));
router.post("/", requireAuth, idempotencyMiddleware, validateBody(createReferralAttributionSchema), controller.createAttribution.bind(controller));
router.post("/:referralId/qualify", requireAuth, idempotencyMiddleware, controller.markQualified.bind(controller));

export default router;
