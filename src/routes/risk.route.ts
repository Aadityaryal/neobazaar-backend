import { Router } from "express";
import { RiskController } from "../controllers/risk.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requireCapability } from "../middleware/policy.middleware";

const router = Router();
const controller = new RiskController();

router.get("/score/users/:userId", requireAuth, requireCapability("risk.score"), controller.scoreUser.bind(controller));

export default router;
