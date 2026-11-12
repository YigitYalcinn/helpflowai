/**
 * Measures how often triage picks the expected category on hand-labelled tickets.
 *
 *   npm run eval:triage            -> rule-based engine only (no API key or database needed)
 *   npm run eval:triage -- --ai    -> also evaluates the OpenAI path (needs OPENAI_API_KEY)
 */
import { env } from "../src/config/env.js";
import { analyzeWithRules } from "../src/services/aiRules.js";
import { analyzeTicket } from "../src/services/aiService.js";
import { categoryMappings } from "../src/services/bootstrapService.js";
import { holdoutTickets, sampleTickets, type LabeledTicket } from "./sampleTickets.js";

const categories = categoryMappings.map(([name, unit]) => ({ name, supportUnit: { name: unit } }));

type Classifier = (ticket: LabeledTicket) => Promise<string>;

const ruleClassifier: Classifier = async (ticket) => analyzeWithRules({ title: ticket.title, description: ticket.description, categories }).category;
const aiClassifier: Classifier = async (ticket) => {
  const result = await analyzeTicket({ title: ticket.title, description: ticket.description, categories });
  // A failed request silently falls back to the rules; do not count that as a model answer.
  if (result.source !== "openai") throw new Error("OpenAI request failed; aborting so rule-based answers are not reported as model accuracy.");
  return result.category;
};

async function evaluate(name: string, tickets: LabeledTicket[], classify: Classifier, showMisses = true) {
  let correct = 0;
  const misses: string[] = [];

  for (const ticket of tickets) {
    const predicted = await classify(ticket);
    if (predicted === ticket.expectedCategory) correct += 1;
    else misses.push(`  - "${ticket.title}": expected "${ticket.expectedCategory}", got "${predicted}"`);
  }

  console.log(`${name}: ${correct}/${tickets.length} (${((correct / tickets.length) * 100).toFixed(1)}%)`);
  if (showMisses && misses.length > 0) console.log(misses.join("\n"));
  console.log("");
}

const all = [...sampleTickets, ...holdoutTickets];

console.log("== Rule-based engine ==");
await evaluate("Set A", sampleTickets, ruleClassifier);
await evaluate("Set B", holdoutTickets, ruleClassifier);
await evaluate("All tickets", all, ruleClassifier, false);

if (process.argv.includes("--ai")) {
  if (!env.OPENAI_API_KEY) {
    console.log("Skipping AI evaluation: OPENAI_API_KEY is not set.");
  } else {
    console.log(`== OpenAI (${env.OPENAI_MODEL}) ==`);
    await evaluate("All tickets", all, aiClassifier);
  }
}
process.exit(0);
