import { Router } from "express";
import { login, logout, me, register } from "../controllers/authController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { rateLimit } from "../middlewares/securityMiddleware.js";
import { wrap } from "../utils/asyncHandler.js";

export const authRoutes = Router();

// Slows down password guessing and scripted sign-ups.
const authLimit = rateLimit({ windowMs: 60_000, max: 15, name: "auth" });

authRoutes.post("/register", authLimit, wrap(register));
authRoutes.post("/login", authLimit, wrap(login));
authRoutes.get("/me", requireAuth, wrap(me));
authRoutes.post("/logout", requireAuth, wrap(logout));
