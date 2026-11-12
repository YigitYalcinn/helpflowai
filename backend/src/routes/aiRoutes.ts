import { Router } from "express";
import { Role } from "@prisma/client";
import { analyzePreview, closing, reanalyze, reply, status, summary } from "../controllers/aiController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";
import { rateLimit } from "../middlewares/securityMiddleware.js";
import { wrap } from "../utils/asyncHandler.js";

export const aiRoutes = Router();

const staff = requireRole(Role.IT_STAFF, Role.ADMIN);

aiRoutes.use(requireAuth);
// Model calls cost money; keep them well below the global request limit.
aiRoutes.use(rateLimit({ windowMs: 60_000, max: 30, name: "ai" }));
aiRoutes.get("/status", wrap(status));
aiRoutes.post("/analyze-ticket", wrap(analyzePreview));
aiRoutes.post("/tickets/:id/reanalyze", staff, wrap(reanalyze));
aiRoutes.post("/tickets/:id/suggest-reply", staff, wrap(reply));
aiRoutes.post("/tickets/:id/summary", staff, wrap(summary));
aiRoutes.post("/tickets/:id/closing-summary", staff, wrap(closing));
