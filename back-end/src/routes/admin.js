import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, logout, me } from "../controllers/adminAuthController.js";
import { protect } from "../middleware/auth.js";
import {
  createOwner,
  listOwners,
  setOwnerStatus,
  deleteOwner,
} from "../controllers/adminOwnersController.js";

const router = Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10 });

router.post("/login", loginLimiter, login);
router.post("/logout", logout);

router.get("/me", protect("admin"), me);

router.post("/owners", protect("admin"), createOwner);
router.get("/owners", protect("admin"), listOwners);
router.patch("/owners/:id/status", protect("admin"), setOwnerStatus);
router.delete("/owners/:id", protect("admin"), deleteOwner);

export default router;
