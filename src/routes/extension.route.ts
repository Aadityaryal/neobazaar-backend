import { Router } from "express";
import { ExtensionController } from "../controllers/extension.controller";
import { attachAuthIfPresent, requireAuth } from "../middleware/auth.middleware";

const router = Router();
const controller = new ExtensionController();

router.post("/detect", requireAuth, controller.detect.bind(controller));
router.post("/price", requireAuth, controller.price.bind(controller));
router.post("/fraud", requireAuth, controller.fraud.bind(controller));
router.get("/recommend", attachAuthIfPresent, controller.recommend.bind(controller));
router.post("/nlp/suggest", requireAuth, controller.nlpSuggest.bind(controller));
router.post("/sync/resolve", requireAuth, controller.syncResolve.bind(controller));

router.post("/ai/detect", requireAuth, controller.detect.bind(controller));
router.post("/ai/price", requireAuth, controller.price.bind(controller));
router.post("/ai/recommend", attachAuthIfPresent, controller.recommend.bind(controller));

export default router;
