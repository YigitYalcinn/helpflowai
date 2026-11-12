import { describe, expect, it } from "vitest";
import { analyzeWithRules, normalize } from "../src/services/aiRules.js";
import { AI_REROUTE_THRESHOLD } from "../src/services/ticketService.js";

const categories = [
  "Yazıcı / Tarayıcı",
  "İnternet Bağlantısı",
  "Wi-Fi Sorunu",
  "Bilgisayar Donanımı",
  "E-posta / Outlook",
  "Kullanıcı Hesabı / Şifre",
  "Bilgi Güvenliği",
  "Diğer"
].map((name) => ({ name, supportUnit: { name: `${name} ekibi` } }));

const analyze = (title: string, description: string, fallbackCategory?: string) => analyzeWithRules({ title, description, categories, fallbackCategory });

describe("normalize", () => {
  it("strips Turkish diacritics and case", () => {
    expect(normalize("YAZICI Çıktı Şifre Öğle")).toBe("yazici cikti sifre ogle");
  });
});

describe("analyzeWithRules", () => {
  it("picks the category from keywords and routes to its support unit", () => {
    const result = analyze("Yazıcı çıktı vermiyor", "Kattaki yazıcı toner uyarısı veriyor.");
    expect(result.category).toBe("Yazıcı / Tarayıcı");
    expect(result.supportUnit).toBe("Yazıcı / Tarayıcı ekibi");
    expect(result.suggestedSolutions.length).toBeGreaterThan(0);
  });

  it("falls back to the category the user picked when nothing matches", () => {
    const result = analyze("Bir sorunum var", "Detayları telefonda anlatacağım.", "Bilgisayar Donanımı");
    expect(result.category).toBe("Bilgisayar Donanımı");
    expect(result.confidenceScore).toBeLessThan(0.5);
  });

  it("falls back to 'Diğer' when there is no user choice", () => {
    expect(analyze("Bir sorunum var", "Detayları telefonda anlatacağım.").category).toBe("Diğer");
  });

  it("does not treat 'açılmıyor' as the word 'acil'", () => {
    const result = analyze("Outlook açılmıyor", "Outlook programı açılmıyor, hata vermeden kapanıyor.");
    expect(result.category).toBe("E-posta / Outlook");
    expect(result.priority).not.toBe("URGENT");
  });

  it("marks explicitly urgent tickets as URGENT", () => {
    expect(analyze("ACİL: internet yok", "İnternet bağlantısı kesildi.").priority).toBe("URGENT");
  });

  it("treats 'acil değil' as low priority", () => {
    expect(analyze("Şifre değişikliği", "Şifremi değiştirmek istiyorum, acil değil.").priority).toBe("LOW");
  });

  it("escalates outages that affect a whole unit", () => {
    const result = analyze("İnternet yok", "Tüm birimde internet yok, hiç kimse çalışamıyor.");
    expect(result.priority).toBe("URGENT");
    expect(result.impact).toMatch(/Birden fazla/);
  });

  it("treats security incidents as urgent", () => {
    const result = analyze("Şüpheli e-posta", "Oltalama olduğunu düşündüğüm bir bağlantıya tıkladım.");
    expect(result.category).toBe("Bilgi Güvenliği");
    expect(result.priority).toBe("URGENT");
  });

  it("never reaches the confidence needed to override the user's category", () => {
    const result = analyze("Yazıcı yazıcı toner kartuş çıktı", "yazıcı tarayıcı toner kartuş çıktı fotokopi yazdır");
    expect(result.confidenceScore).toBeLessThan(AI_REROUTE_THRESHOLD);
  });
});
