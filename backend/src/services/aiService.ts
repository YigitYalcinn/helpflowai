import { OpenAI } from "openai";
import { TicketPriority } from "@prisma/client";
import { z } from "zod";
import { env } from "../config/env.js";

const aiAnalysisSchema = z.object({
  summary: z.string(),
  category: z.string(),
  supportUnit: z.string(),
  priority: z.nativeEnum(TicketPriority),
  impact: z.string(),
  possibleCauses: z.array(z.string()),
  suggestedSolutions: z.array(z.string()),
  questionsToAsk: z.array(z.string()),
  confidenceScore: z.number().min(0).max(1)
});

export type AiAnalysis = z.infer<typeof aiAnalysisSchema>;

function fallbackAnalysis(reason: string): AiAnalysis {
  return {
    summary: `AI analysis fallback used: ${reason}`,
    category: "Diger",
    supportUnit: "Genel BT Destek Ekibi",
    priority: TicketPriority.MEDIUM,
    impact: "User level",
    possibleCauses: ["The issue scope and technical details are not clear yet."],
    suggestedSolutions: ["Ask for the error message, device name/IP address, affected users, and start time."],
    questionsToAsk: ["When did the issue start?", "Is there an error message or screenshot?", "Does it affect only one user or the whole department?"],
    confidenceScore: 0.25
  };
}

export async function analyzeTicket(input: { title: string; description: string; categories: { name: string; supportUnit: { name: string } }[] }) {
  if (!env.OPENAI_API_KEY) {
    return fallbackAnalysis("OPENAI_API_KEY is not configured");
  }

  try {
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const categories = input.categories.map((item) => `${item.name} -> ${item.supportUnit.name}`).join("\n");

    const response = await client.chat.completions.create({
      model: env.OPENAI_MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an IT helpdesk triage assistant. Return only valid JSON with summary, category, supportUnit, priority, impact, possibleCauses, suggestedSolutions, questionsToAsk, confidenceScore. Use only one of the provided category mappings."
        },
        {
          role: "user",
          content: `Available category mappings:\n${categories}\n\nTicket title: ${input.title}\nTicket description: ${input.description}`
        }
      ]
    });

    const content = response.choices[0]?.message.content ?? "{}";
    return aiAnalysisSchema.parse(JSON.parse(content));
  } catch (error) {
    console.error("AI analysis failed", error);
    return fallbackAnalysis("OpenAI request or JSON validation failed");
  }
}

export function buildSimpleReplySuggestion(description: string) {
  return {
    reply: `Talebiniz alinmistir. Inceleme icin hata mesaji, cihaz adi/IP bilgisi ve sorunun basladigi zamani paylasabilir misiniz?\n\nOzetlenen sorun: ${description.slice(0, 180)}`
  };
}
