import { Router } from "express";
import { SellerController } from "../controllers/seller.controller";
import { bulkImportListingSchema } from "../dtos/mvp.dto";
import { requireAuth } from "../middleware/auth.middleware";
import { idempotencyMiddleware } from "../middleware/idempotency.middleware";
import { validateBody } from "../middleware/validation.middleware";

const router = Router();
const controller = new SellerController();

router.get("/analytics/listings", requireAuth, controller.listingPerformance.bind(controller));
router.post("/bulk-import", requireAuth, idempotencyMiddleware, validateBody(bulkImportListingSchema), controller.bulkImportListings.bind(controller));
router.get("/payouts/ledger", requireAuth, controller.payoutLedger.bind(controller));

export default router;
