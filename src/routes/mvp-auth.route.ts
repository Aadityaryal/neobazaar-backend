import { Router } from "express";
import { MVPAuthController } from "../controllers/mvp-auth.controller";
import {
	loginSchema,
	registerSchema,
	verificationChallengeSchema,
	verificationSubmitSchema,
} from "../dtos/mvp.dto";
import { requireAuth } from "../middleware/auth.middleware";
import { idempotencyMiddleware } from "../middleware/idempotency.middleware";
import { validateBody } from "../middleware/validation.middleware";

const router = Router();
const controller = new MVPAuthController();

router.post("/register", idempotencyMiddleware, validateBody(registerSchema), controller.register.bind(controller));
router.post("/login", idempotencyMiddleware, validateBody(loginSchema), controller.login.bind(controller));
router.get("/me", requireAuth, controller.me.bind(controller));
router.post("/logout", idempotencyMiddleware, controller.logout.bind(controller));
router.get("/sessions", requireAuth, controller.listSessions.bind(controller));
router.post("/sessions/revoke", requireAuth, idempotencyMiddleware, controller.revokeSession.bind(controller));
router.post("/sessions/revoke-all", requireAuth, idempotencyMiddleware, controller.revokeAllSessions.bind(controller));
router.post(
	"/verification/challenge",
	requireAuth,
	idempotencyMiddleware,
	validateBody(verificationChallengeSchema),
	controller.issueVerificationChallenge.bind(controller)
);
router.post(
	"/verification/submit",
	requireAuth,
	idempotencyMiddleware,
	validateBody(verificationSubmitSchema),
	controller.verifyChallenge.bind(controller)
);

export default router;
