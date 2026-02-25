import { Router } from "express";
import { TransactionController } from "../controllers/transaction.controller";
import {
	confirmTransactionSchema,
	disputeEvidenceAppendSchema,
	disputeTransactionSchema,
	transactionCreateSchema,
} from "../dtos/mvp.dto";
import { requireAuth } from "../middleware/auth.middleware";
import { idempotencyMiddleware } from "../middleware/idempotency.middleware";
import { validateBody } from "../middleware/validation.middleware";

const router = Router();
const controller = new TransactionController();

router.post("/", requireAuth, idempotencyMiddleware, validateBody(transactionCreateSchema), controller.createTransaction.bind(controller));
router.get("/", requireAuth, controller.listTransactions.bind(controller));
router.post("/:txnId/confirm", requireAuth, idempotencyMiddleware, validateBody(confirmTransactionSchema), controller.confirmTransaction.bind(controller));
router.post("/:txnId/dispute", requireAuth, idempotencyMiddleware, validateBody(disputeTransactionSchema), controller.disputeTransaction.bind(controller));
router.post("/:txnId/dispute/evidence", requireAuth, idempotencyMiddleware, validateBody(disputeEvidenceAppendSchema), controller.appendDisputeEvidence.bind(controller));

export default router;
