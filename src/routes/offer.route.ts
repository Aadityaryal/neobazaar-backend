import { Router } from "express";
import { OfferController } from "../controllers/offer.controller";
import { counterOfferSchema, createOfferSchema } from "../dtos/mvp.dto";
import { requireAuth } from "../middleware/auth.middleware";
import { idempotencyMiddleware } from "../middleware/idempotency.middleware";
import { validateBody } from "../middleware/validation.middleware";

const router = Router();
const controller = new OfferController();

router.get("/", requireAuth, controller.listOffers.bind(controller));
router.post("/", requireAuth, idempotencyMiddleware, validateBody(createOfferSchema), controller.createOffer.bind(controller));
router.post("/:offerId/counter", requireAuth, idempotencyMiddleware, validateBody(counterOfferSchema), controller.counterOffer.bind(controller));
router.post("/:offerId/accept", requireAuth, idempotencyMiddleware, controller.acceptOffer.bind(controller));
router.post("/:offerId/reject", requireAuth, idempotencyMiddleware, controller.rejectOffer.bind(controller));

export default router;
