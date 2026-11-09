/**
 * Measures how often triage picks the expected category.
 *
 *   npm run eval:triage            -> rule-based fallback only (no API key needed)
 *   npm run eval:triage -- --ai    -> also evaluates the OpenAI path (needs OPENAI_API_KEY)
 *
 * - Development set: used while writing the keyword rules (optimistic).
 * - Held-out set: written after the rules were frozen (the honest number).
 */
import { env } from "../config/env.js";
import { analyzeTicket } from "../services/aiService.js";
import { classifyByRules } from "../services/triageRules.js";
import { holdoutTickets, sampleTickets, type LabeledTicket } from "./sampleTickets.js";

// Same mapping as prisma/seed.ts (copied so the eval runs without a database).
const categoryMappings: [string, string][] = [
  ["Yazıcı / Tarayıcı", "Yazıcı ve Tarayıcı Destek Ekibi"],
  ["İnternet Bağlantısı", "Ağ ve İnternet Destek Ekibi"],
  ["Wi-Fi Sorunu", "Ağ ve İnternet Destek Ekibi"],
  ["IP / DNS Sorunu", "Ağ ve İnternet Destek Ekibi"],
  ["Bilgisayar Donanımı", "Donanım Destek Ekibi"],
  ["Bilgisayar Performansı", "Donanım Destek Ekibi"],
  ["Monitör / Klavye / Mouse", "Donanım Destek Ekibi"],
  ["Kamera Sistemi", "Kamera ve Güvenlik Sistemleri Ekibi"],
  ["Güvenlik Kayıt Cihazı", "Kamera ve Güvenlik Sistemleri Ekibi"],
  ["Kurumsal Yazılım", "Yazılım ve Otomasyon Destek Ekibi"],
  ["Belediye Otomasyon Sistemi", "Yazılım ve Otomasyon Destek Ekibi"],
  ["E-posta / Outlook", "E-posta ve Hesap Yönetimi Ekibi"],
  ["Kullanıcı Hesabı / Şifre", "E-posta ve Hesap Yönetimi Ekibi"],
  ["Dosya Paylaşımı / Ortak Klasör", "Sistem ve Sunucu Yönetimi Ekibi"],
  ["Sunucu / Sistem", "Sistem ve Sunucu Yönetimi Ekibi"],
  ["Web Sitesi / Kurumsal Uygulama", "Yazılım ve Otomasyon Destek Ekibi"],
  ["Bilgi Güvenliği", "Sistem ve Sunucu Yönetimi Ekibi"],
  ["Diğer", "Genel BT Destek Ekibi"]
];
const categories = categoryMappings.map(([name, unit]) => ({ name, supportUnit: { name: unit } }));

type Classifier = (ticket: LabeledTicket) => Promise<string>;

const ruleClassifier: Classifier = async (ticket) => classifyByRules(ticket.title, ticket.description).category;
const aiClassifier: Classifier = async (ticket) =>
  (await analyzeTicket({ title: ticket.title, description: ticket.description, categories })).category;

async function evaluate(name: string, tickets: LabeledTicket[], classify: Classifier) {
  let correct = 0;
  const misses: string[] = [];

  for (const ticket of tickets) {
    const predicted = await classify(ticket);
    if (predicted === ticket.expectedCategory) correct += 1;
    else misses.push(`  - "${ticket.title}": expected "${ticket.expectedCategory}", got "${predicted}"`);
  }

  const accuracy = ((correct / tickets.length) * 100).toFixed(1);
  console.log(`${name}: ${correct}/${tickets.length} (${accuracy}%)`);
  if (misses.length > 0) console.log(misses.join("\n"));
  console.log("");
}

console.log("== Rule-based fallback ==");
await evaluate("Development set", sampleTickets, ruleClassifier);
await evaluate("Held-out set", holdoutTickets, ruleClassifier);

if (process.argv.includes("--ai")) {
  if (!env.OPENAI_API_KEY) {
    console.log("Skipping AI evaluation: OPENAI_API_KEY is not set.");
  } else {
    console.log(`== OpenAI (${env.OPENAI_MODEL}) ==`);
    await evaluate("All samples", [...sampleTickets, ...holdoutTickets], aiClassifier);
  }
}
