import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  verifyCode,
  activate,
  login,
  logout,
  me,
} from "../controllers/ownerAuthController.js";
import {
  sendEmailCode,
  verifyEmail,
} from "../controllers/ownerAuthController.js";
import { protect } from "../middleware/auth.js";
import { renew } from "../controllers/ownerAuthController.js";
import { requireSubscription } from "../middleware/subscription.js";
import {
  lockGuard,
  codeKey,
  renewKey,
  ownerLoginKey,
} from "../middleware/attemptGuard.js";

const router = Router();

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 40 });

router.post("/renew", protect("owner"), limiter, lockGuard(renewKey), renew);

// temporary test route: proves the subscription check works
router.get("/ping", protect("owner"), requireSubscription, (req, res) =>
  res.json({ ok: true, subscription: req.subscription }),
);

router.post("/verify-code", limiter, lockGuard(codeKey), verifyCode);
router.post("/activate", limiter, lockGuard(codeKey), activate);
router.post("/login", limiter, lockGuard(ownerLoginKey), login);
router.post("/logout", logout);
router.get("/me", protect("owner"), me);

router.post("/send-email-code", limiter, lockGuard(codeKey), sendEmailCode);
router.post("/verify-email", limiter, verifyEmail);

export default router;
