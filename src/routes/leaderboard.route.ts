import { Router } from "express";
import { LeaderboardController } from "../controllers/leaderboard.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();
const controller = new LeaderboardController();

router.get("/", requireAuth, controller.getLeaderboard.bind(controller));

export default router;
