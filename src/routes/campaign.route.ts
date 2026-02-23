import { Router } from "express";
import { CampaignController } from "../controllers/campaign.controller";
import { createCampaignSchema, updateCampaignStatusSchema } from "../dtos/mvp.dto";
import { requireAuth } from "../middleware/auth.middleware";
import { idempotencyMiddleware } from "../middleware/idempotency.middleware";
import { validateBody } from "../middleware/validation.middleware";

const router = Router();
const controller = new CampaignController();

router.get("/", requireAuth, controller.listCampaigns.bind(controller));
router.post("/", requireAuth, idempotencyMiddleware, validateBody(createCampaignSchema), controller.createCampaign.bind(controller));
router.patch("/:campaignId/status", requireAuth, idempotencyMiddleware, validateBody(updateCampaignStatusSchema), controller.updateCampaignStatus.bind(controller));

export default router;
