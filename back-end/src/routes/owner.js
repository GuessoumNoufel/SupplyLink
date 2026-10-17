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

const router = Router();

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 40 });

router.post("/verify-code", limiter, verifyCode);
router.post("/activate", limiter, activate);
router.post("/login", limiter, login);
router.post("/logout", logout);
router.get("/me", protect("owner"), me);

router.post("/send-email-code", limiter, sendEmailCode);
router.post("/verify-email", limiter, verifyEmail);

export default router;
