import { Router } from "express";
import { TransactionController } from "../controllers/transaction.controller";
import { bidCreateSchema } from "../dtos/mvp.dto";
import { requireAuth } from "../middleware/auth.middleware";
import { idempotencyMiddleware } from "../middleware/idempotency.middleware";
import { validateBody } from "../middleware/validation.middleware";

const router = Router();
const controller = new TransactionController();

router.post("/", requireAuth, idempotencyMiddleware, validateBody(bidCreateSchema), controller.placeBid.bind(controller));

export default router;
