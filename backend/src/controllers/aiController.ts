import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { analyzeTicket, buildSimpleReplySuggestion } from "../services/aiService.js";
import { success } from "../utils/apiResponse.js";

export async function analyze(req: Request, res: Response) {
  const categories = await prisma.category.findMany({ where: { isActive: true }, include: { supportUnit: true } });
  const result = await analyzeTicket({ title: req.body.title ?? "", description: req.body.description ?? "", categories });
  res.json(success(result));
}

export async function suggestReply(req: Request, res: Response) {
  res.json(success(buildSimpleReplySuggestion(req.body.description ?? "")));
}

export async function summarizeTicket(req: Request, res: Response) {
  res.json(success({ summary: `Ticket özeti: ${(req.body.description ?? "").slice(0, 240)}` }));
}

export async function closingSummary(req: Request, res: Response) {
  res.json(success({ summary: "Talep çözüme ulaştırıldı. Yapılan işlem ve kullanıcı onayı kapanış notuna eklenmelidir." }));
}
