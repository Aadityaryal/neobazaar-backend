import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";

let authController = new AuthController();
const router = Router();

router.post("/register", authController.register)
router.post("/login", authController.login)
// add remaning routes like login, logout, etc.

export default router;