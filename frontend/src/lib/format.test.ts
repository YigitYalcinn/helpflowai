import { describe, expect, it } from "vitest";
import { formatFileSize, formatHours, matchesQuery, timeAgo, toCsv } from "./format";

describe("matchesQuery", () => {
  it("handles Turkish dotted and dotless i", () => {
    expect(matchesQuery("İNTERNET bağlantısı", "internet")).toBe(true);
    expect(matchesQuery("YAZICI arızası", "yazıcı")).toBe(true);
    expect(matchesQuery("Yazıcı", "tarayıcı")).toBe(false);
  });

  it("ignores surrounding whitespace in the query", () => {
    expect(matchesQuery("HF-000012 Monitör", "  hf-000012 ")).toBe(true);
  });
});

describe("formatHours", () => {
  it("picks a readable unit", () => {
    expect(formatHours(null)).toBe("-");
    expect(formatHours(0.5)).toBe("30 dk");
    expect(formatHours(5.5)).toBe("5,5 sa");
    expect(formatHours(72)).toBe("3 gün");
  });
});

describe("formatFileSize", () => {
  it("formats bytes, kilobytes and megabytes", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2 KB");
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe("1,5 MB");
  });
});

describe("timeAgo", () => {
  it("describes recent moments relative to now", () => {
    const now = new Date("2026-01-10T12:00:00Z").getTime();
    expect(timeAgo("2026-01-10T11:59:40Z", now)).toBe("az önce");
    expect(timeAgo("2026-01-10T09:00:00Z", now)).toBe("3 saat önce");
    expect(timeAgo("2026-01-08T12:00:00Z", now)).toBe("2 gün önce");
  });
});

describe("toCsv", () => {
  it("quotes separators and neutralises spreadsheet formulas", () => {
    const csv = toCsv([["No", "Başlık"], ["HF-1", 'Ekran; "mavi"'], ["HF-2", "=HYPERLINK(1)"], ["HF-3", null]]);
    expect(csv.startsWith("﻿")).toBe(true);
    const lines = csv.slice(1).split("\r\n");
    expect(lines[1]).toBe('HF-1;"Ekran; ""mavi"""');
    expect(lines[2]).toBe("HF-2;'=HYPERLINK(1)");
    expect(lines[3]).toBe("HF-3;");
  });
});
