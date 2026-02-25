import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();
const controller = new UserController();

router.get("/topups", requireAuth, controller.listWalletTopups.bind(controller));
router.post("/topup", requireAuth, controller.walletTopup.bind(controller));

export default router;
