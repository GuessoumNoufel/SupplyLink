import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, logout, me } from "../controllers/adminAuthController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10 });

router.post("/login", loginLimiter, login);
router.post("/logout", logout);
router.get("/me", protect("admin"), me);

export default router;
