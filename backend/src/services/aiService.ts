import { OpenAI } from "openai";
import { TicketPriority } from "@prisma/client";
import { z } from "zod";
import { env } from "../config/env.js";
import { classifyByRules } from "./triageRules.js";

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

type TriageInput = { title: string; description: string; categories: { name: string; supportUnit: { name: string } }[] };

/**
 * Used when OpenAI is not configured or the request fails.
 * Instead of an empty placeholder, it runs keyword-based triage so the ticket
 * still gets a sensible category, support unit and priority.
 */
function fallbackAnalysis(reason: string, input: TriageInput): AiAnalysis {
  const rules = classifyByRules(input.title, input.description);
  const mapping = input.categories.find((item) => item.name === rules.category);
  const matched = rules.matchedKeywords.length > 0 ? ` Matched keywords: ${rules.matchedKeywords.join(", ")}.` : "";

  return {
    summary: `Rule-based triage (${reason}).${matched}`,
    category: mapping?.name ?? "Diğer",
    supportUnit: mapping?.supportUnit.name ?? "Genel BT Destek Ekibi",
    priority: rules.priority,
    impact: rules.priority === TicketPriority.URGENT || rules.priority === TicketPriority.HIGH ? "Department level" : "User level",
    possibleCauses: ["Determined from keywords in the request; an IT staff member should confirm the root cause."],
    suggestedSolutions: ["Ask for the error message, device name/IP address, affected users, and start time."],
    questionsToAsk: ["When did the issue start?", "Is there an error message or screenshot?", "Does it affect only one user or the whole department?"],
    confidenceScore: rules.confidenceScore
  };
}

export async function analyzeTicket(input: TriageInput) {
  if (!env.OPENAI_API_KEY) {
    return fallbackAnalysis("OpenAI API key is not configured", input);
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
    return fallbackAnalysis("OpenAI request or JSON validation failed", input);
  }
}

export function buildSimpleReplySuggestion(description: string) {
  return {
    reply: `Talebiniz alinmistir. Inceleme icin hata mesaji, cihaz adi/IP bilgisi ve sorunun basladigi zamani paylasabilir misiniz?\n\nOzetlenen sorun: ${description.slice(0, 180)}`
  };
}
