import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { aiEnabled, analyzeTicket, closingSummary, suggestReply, summarizeTicket } from "../services/aiService.js";
import { buildTicketContext, reanalyzeTicket } from "../services/ticketService.js";
import { success } from "../utils/apiResponse.js";
import { routeParam } from "../utils/request.js";
import { analyzePreviewSchema } from "../validators/ticketValidators.js";

export async function status(_req: Request, res: Response) {
  res.json(success({ provider: aiEnabled() ? "openai" : "rules" }));
}

/** Live preview while an employee is still writing the ticket. Nothing is stored. */
export async function analyzePreview(req: Request, res: Response) {
  const input = analyzePreviewSchema.parse(req.body);
  const categories = await prisma.category.findMany({ where: { isActive: true }, include: { supportUnit: true } });
  res.json(success(await analyzeTicket({ ...input, categories })));
}

export async function reanalyze(req: Request, res: Response) {
  res.json(success(await reanalyzeTicket(routeParam(req, "id"), req.user!), "AI analizi yenilendi"));
}

export async function reply(req: Request, res: Response) {
  res.json(success(await suggestReply(await buildTicketContext(routeParam(req, "id"), req.user!))));
}

export async function summary(req: Request, res: Response) {
  res.json(success(await summarizeTicket(await buildTicketContext(routeParam(req, "id"), req.user!))));
}

export async function closing(req: Request, res: Response) {
  res.json(success(await closingSummary(await buildTicketContext(routeParam(req, "id"), req.user!))));
}
