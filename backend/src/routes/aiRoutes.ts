import { Router } from "express";
import { analyze, closingSummary, summarizeTicket, suggestReply } from "../controllers/aiController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

export const aiRoutes = Router();

aiRoutes.use(requireAuth);
aiRoutes.post("/analyze-ticket", analyze);
aiRoutes.post("/suggest-reply", suggestReply);
aiRoutes.post("/summarize-ticket", summarizeTicket);
aiRoutes.post("/closing-summary", closingSummary);
