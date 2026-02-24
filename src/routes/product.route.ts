import { Router } from "express";
import { ProductController } from "../controllers/product.controller";
import { productCreateSchema } from "../dtos/mvp.dto";
import { requireAuth } from "../middleware/auth.middleware";
import { idempotencyMiddleware } from "../middleware/idempotency.middleware";
import { productImageUpload } from "../middleware/upload.middleware";
import { validateBody } from "../middleware/validation.middleware";

const router = Router();
const controller = new ProductController();

router.get("/", controller.listProducts.bind(controller));
router.post(
	"/upload",
	requireAuth,
	idempotencyMiddleware,
	productImageUpload.single("image"),
	controller.uploadProductImage.bind(controller)
);
router.get("/saved", requireAuth, controller.listSaved.bind(controller));
router.get("/recent/viewed", requireAuth, controller.listRecentViewed.bind(controller));
router.post("/:productId/view", requireAuth, idempotencyMiddleware, controller.recordView.bind(controller));
router.post("/:productId/save", requireAuth, idempotencyMiddleware, controller.saveProduct.bind(controller));
router.delete("/:productId/save", requireAuth, controller.unsaveProduct.bind(controller));
router.get("/:productId", controller.getProductById.bind(controller));
router.get("/:productId/public", controller.getPublicProductPayload.bind(controller));
router.post("/", requireAuth, idempotencyMiddleware, validateBody(productCreateSchema), controller.createProduct.bind(controller));

export default router;
