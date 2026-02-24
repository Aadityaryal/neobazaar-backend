import { Router } from "express";
import { ReviewController } from "../controllers/review.controller";
import { createReviewSchema } from "../dtos/mvp.dto";
import { requireAuth } from "../middleware/auth.middleware";
import { idempotencyMiddleware } from "../middleware/idempotency.middleware";
import { validateBody } from "../middleware/validation.middleware";

const router = Router();
const controller = new ReviewController();

router.post("/", requireAuth, idempotencyMiddleware, validateBody(createReviewSchema), controller.createReview.bind(controller));
router.get("/products/:productId", requireAuth, controller.listByProduct.bind(controller));
router.patch("/:reviewId/flag", requireAuth, idempotencyMiddleware, controller.flagReview.bind(controller));

export default router;
