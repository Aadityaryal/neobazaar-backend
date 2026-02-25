import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { patchUserSchema, reviewKycSchema, submitKycSchema } from "../dtos/mvp.dto";
import { requireAuth } from "../middleware/auth.middleware";
import { idempotencyMiddleware } from "../middleware/idempotency.middleware";
import { validateBody } from "../middleware/validation.middleware";

const router = Router();
const controller = new UserController();

router.patch("/:userId", requireAuth, idempotencyMiddleware, validateBody(patchUserSchema), controller.patchUser.bind(controller));
router.post("/wallet/topup", requireAuth, idempotencyMiddleware, controller.walletTopup.bind(controller));
router.post("/:userId/kyc/submit", requireAuth, idempotencyMiddleware, validateBody(submitKycSchema), controller.submitKyc.bind(controller));
router.post("/:userId/kyc/review", requireAuth, idempotencyMiddleware, validateBody(reviewKycSchema), controller.reviewKyc.bind(controller));

export default router;
