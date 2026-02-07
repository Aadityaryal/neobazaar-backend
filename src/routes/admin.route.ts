import { Router } from "express";
import { AdminController } from "../controllers/admin.controller";
import { adminCreateUserSchema, adminDisputeDecisionSchema, adminUpdateUserSchema } from "../dtos/mvp.dto";
import { requireAuth } from "../middleware/auth.middleware";
import { requireAdmin } from "../middleware/admin.middleware";
import { idempotencyMiddleware } from "../middleware/idempotency.middleware";
import { requireCapability } from "../middleware/policy.middleware";
import { validateBody } from "../middleware/validation.middleware";

const router = Router();
const controller = new AdminController();

router.get("/heatmap", requireAuth, requireAdmin, requireCapability("admin.view"), controller.getHeatmap.bind(controller));
router.get("/export", requireAuth, requireAdmin, requireCapability("admin.export"), controller.exportData.bind(controller));
router.post("/export/jobs", requireAuth, requireAdmin, requireCapability("admin.export"), controller.createExportJob.bind(controller));
router.get("/export/jobs/:exportJobId", requireAuth, requireAdmin, requireCapability("admin.export"), controller.getExportJob.bind(controller));
router.get("/flags", requireAuth, requireAdmin, requireCapability("admin.view"), controller.listFlags.bind(controller));
router.get("/disputes", requireAuth, requireAdmin, requireCapability("admin.view"), controller.listDisputes.bind(controller));
router.patch("/flags/:flagId", requireAuth, requireAdmin, requireCapability("admin.moderate"), controller.resolveFlag.bind(controller));
router.patch("/disputes/:disputeId/decide", requireAuth, requireAdmin, requireCapability("admin.moderate"), idempotencyMiddleware, validateBody(adminDisputeDecisionSchema), controller.decideDispute.bind(controller));
router.post("/moderation/:actionId/undo", requireAuth, requireAdmin, requireCapability("admin.moderate"), controller.undoModeration.bind(controller));
router.get("/audit/logs", requireAuth, requireAdmin, requireCapability("admin.audit"), controller.listAuditLogs.bind(controller));
router.post("/audit/retention/run", requireAuth, requireAdmin, requireCapability("admin.audit"), controller.runAuditRetention.bind(controller));
router.get("/users", requireAuth, requireAdmin, requireCapability("admin.view"), controller.listUsers.bind(controller));
router.get("/users/:userId", requireAuth, requireAdmin, requireCapability("admin.view"), controller.getUserById.bind(controller));
router.post("/users", requireAuth, requireAdmin, requireCapability("admin.moderate"), idempotencyMiddleware, validateBody(adminCreateUserSchema), controller.createUser.bind(controller));
router.patch("/users/:userId", requireAuth, requireAdmin, requireCapability("admin.moderate"), idempotencyMiddleware, validateBody(adminUpdateUserSchema), controller.updateUser.bind(controller));
router.delete("/users/:userId", requireAuth, requireAdmin, requireCapability("admin.moderate"), idempotencyMiddleware, controller.deleteUser.bind(controller));

export default router;
