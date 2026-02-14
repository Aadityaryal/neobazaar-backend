import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { userImageUpload } from "../middleware/upload.middleware";

let authController = new AuthController();
const router = Router();

router.post("/register", authController.register)
router.post("/login", authController.login)
router.post("/forgot-password", authController.forgotPassword)
router.post("/reset-password", authController.resetPassword)
router.put("/:id", userImageUpload.single("image"), authController.updateUser)
// add remaning routes like login, logout, etc.

export default router;