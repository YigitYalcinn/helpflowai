import { TicketPriority } from "@prisma/client";

/**
 * Rule-based ticket triage.
 *
 * Used when no OpenAI API key is configured or the AI request fails, so the
 * app always returns a useful category, support unit and priority instead of
 * an empty placeholder. Keywords cover Turkish and English wording.
 */

type CategoryRule = { category: string; keywords: string[] };

export const CATEGORY_RULES: CategoryRule[] = [
  { category: "Yazıcı / Tarayıcı", keywords: ["yazıcı", "yazici", "printer", "tarayıcı", "tarayici", "scanner", "toner", "kartuş", "çıktı", "cikti", "yazdır", "kağıt sıkış", "paper jam", "tarama", "taramak"] },
  { category: "Wi-Fi Sorunu", keywords: ["wi-fi", "wifi", "kablosuz", "wireless", "modem"] },
  { category: "IP / DNS Sorunu", keywords: ["ip adres", "ip çakış", "ip ", "ping", "dns", "dhcp", "ip conflict", "ip address"] },
  { category: "İnternet Bağlantısı", keywords: ["internet", "bağlantı yok", "baglanti yok", "ağ bağlantısı", "network", "ethernet", "kablo", "connection"] },
  { category: "Bilgisayar Performansı", keywords: ["yavaş", "yavas", "donuyor", "kasıyor", "slow", "freeze", "takılıyor", "performans"] },
  { category: "Monitör / Klavye / Mouse", keywords: ["monitör", "monitor", "ekran", "klavye", "keyboard", "mouse", "fare"] },
  { category: "Bilgisayar Donanımı", keywords: ["mavi ekran", "blue screen", "disk", "ram", "fan", "güç", "power", "bilgisayar bozuk", "laptop", "kasa"] },
  { category: "Güvenlik Kayıt Cihazı", keywords: ["nvr", "dvr", "kayıt cihazı", "kayit cihazi", "görüntü kaydı", "recorder"] },
  { category: "Kamera Sistemi", keywords: ["kamera", "camera", "cctv", "görüntü gelmiyor"] },
  { category: "Belediye Otomasyon Sistemi", keywords: ["otomasyon", "ebys", "ruhsat", "modül", "e-belediye", "belediye sistemi", "evrak sistemi"] },
  { category: "Kurumsal Yazılım", keywords: ["program", "yazılım", "yazilim", "uygulama hata", "lisans", "software", "excel", "word", "office", "güncelleme"] },
  { category: "E-posta / Outlook", keywords: ["e-posta", "eposta", "mail", "outlook", "email", "gelen kutusu", "inbox"] },
  { category: "Kullanıcı Hesabı / Şifre", keywords: ["şifre", "sifre", "parola", "password", "hesap kilit", "kilitlendi", "kilitli", "giriş yapamıyorum", "giris yapamiyorum", "kullanıcı adı", "login", "locked"] },
  { category: "Dosya Paylaşımı / Ortak Klasör", keywords: ["ortak klasör", "ortak klasor", "paylaşım", "paylasim", "shared folder", "dosya erişim", "dosyaya erişemiyorum", "network drive", "sürücü", "ağ sürücüsü", "z:"] },
  { category: "Sunucu / Sistem", keywords: ["sunucu", "server", "sistem çöktü", "sistem cokt", "veritabanı", "database", "yedek", "backup"] },
  { category: "Web Sitesi / Kurumsal Uygulama", keywords: ["web sitesi", "website", "site açılmıyor", "sitesi", "online başvuru", "portal", "sayfa açılmıyor", "web app"] },
  { category: "Bilgi Güvenliği", keywords: ["virüs", "virus", "malware", "phishing", "oltalama", "şüpheli mail", "supheli", "fidye", "ransomware", "hack", "güvenlik ihlali", "antivirüs", "antivirus", "tehdit", "şifrelendi", "fidye notu", "linke tıkladım", "zararlı"] }
];

const FALLBACK_CATEGORY = "Diğer";

const URGENT_KEYWORDS = ["acil", "urgent", "tüm birim", "tum birim", "herkes", "hiç kimse", "fidye", "ransomware", "sistem çöktü", "server down", "kritik"];
const HIGH_KEYWORDS = ["çalışmıyor", "calismiyor", "açılmıyor", "acilmiyor", "erişemiyorum", "yapamıyorum", "not working", "birim", "departman", "ödeme", "veri kaybı", "virüs", "virus", "phishing"];
const LOW_KEYWORDS = ["talep", "talebi", "istek", "istiyoruz", "rica", "yeni kurulum", "bilgi almak", "request", "nasıl", "ne zaman"];

function normalize(text: string) {
  return text.toLocaleLowerCase("tr-TR");
}

const LETTER = "a-z0-9çğıöşüâîû";

/**
 * Matches a keyword only at the start of a word, so Turkish suffixes still match
 * ("yazıcıya" -> "yazıcı") but short keywords do not fire inside other words
 * ("ram" must not match "program" or "tarama").
 */
function hasKeyword(text: string, keyword: string) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^${LETTER}])${escaped}`, "u").test(text);
}

/** Multi-word phrases ("mavi ekran") are more specific than single words, so they weigh more. */
function keywordWeight(keyword: string) {
  return keyword.trim().split(/\s+/).length;
}

function scoreMatches(text: string, keywords: string[]) {
  return keywords.reduce((total, keyword) => (hasKeyword(text, keyword) ? total + keywordWeight(keyword) : total), 0);
}

function countMatches(text: string, keywords: string[]) {
  return keywords.filter((keyword) => hasKeyword(text, keyword)).length;
}

export type RuleTriageResult = {
  category: string;
  priority: TicketPriority;
  matchedKeywords: string[];
  confidenceScore: number;
};

export function classifyByRules(title: string, description: string): RuleTriageResult {
  // Title words are weighted twice: users usually name the problem there.
  const titleText = normalize(title);
  const bodyText = normalize(description);

  let best: { category: string; score: number; matched: string[] } = { category: FALLBACK_CATEGORY, score: 0, matched: [] };

  for (const rule of CATEGORY_RULES) {
    const titleHits = scoreMatches(titleText, rule.keywords);
    const bodyHits = scoreMatches(bodyText, rule.keywords);
    const score = titleHits * 2 + bodyHits;
    if (score > best.score) {
      const matched = rule.keywords.filter((keyword) => hasKeyword(titleText, keyword) || hasKeyword(bodyText, keyword));
      best = { category: rule.category, score, matched };
    }
  }

  const fullText = `${titleText} ${bodyText}`;
  let priority: TicketPriority = TicketPriority.MEDIUM;
  if (countMatches(fullText, URGENT_KEYWORDS) > 0) priority = TicketPriority.URGENT;
  else if (countMatches(fullText, HIGH_KEYWORDS) > 0) priority = TicketPriority.HIGH;
  else if (countMatches(fullText, LOW_KEYWORDS) > 0) priority = TicketPriority.LOW;

  const confidenceScore = best.score === 0 ? 0.2 : Math.min(0.85, 0.4 + best.score * 0.15);

  return { category: best.category, priority, matchedKeywords: best.matched, confidenceScore };
}
