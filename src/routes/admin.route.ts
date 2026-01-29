import { Router } from "express";
import { AdminController } from "../controllers/admin.controller";
import { requireAdmin } from "../middleware/admin.middleware";
import { userImageUpload } from "../middleware/upload.middleware";

const router = Router();
const adminController = new AdminController();

router.use(requireAdmin);

router.post("/users", userImageUpload.single("image"), adminController.createUser);
router.get("/users", adminController.getAllUsers);
router.get("/users/:id", adminController.getUserById);
router.put("/users/:id", userImageUpload.single("image"), adminController.updateUser);
router.delete("/users/:id", adminController.deleteUser);

export default router;
