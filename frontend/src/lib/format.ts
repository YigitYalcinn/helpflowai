import { Role, TicketPriority, TicketStatus } from "../types";

export const statusLabels: Record<TicketStatus, string> = {
  OPEN: "Açık",
  IN_PROGRESS: "İşlemde",
  WAITING_USER: "Kullanıcı bekleniyor",
  RESOLVED: "Çözüldü",
  CLOSED: "Kapatıldı",
  CANCELLED: "İptal edildi"
};

export const priorityLabels: Record<TicketPriority, string> = {
  LOW: "Düşük",
  MEDIUM: "Orta",
  HIGH: "Yüksek",
  URGENT: "Acil"
};

export const roleLabels: Record<Role, string> = {
  EMPLOYEE: "Çalışan",
  IT_STAFF: "BT Personeli",
  ADMIN: "Yönetici"
};

export const statuses = Object.keys(statusLabels) as TicketStatus[];
export const priorities = Object.keys(priorityLabels) as TicketPriority[];
export const activeStatuses: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_USER"];

const dateTime = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const dateOnly = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
const dayMonth = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" });
const relative = new Intl.RelativeTimeFormat("tr-TR", { numeric: "always" });

export function formatDateTime(value?: string | null) {
  return value ? dateTime.format(new Date(value)) : "-";
}

export function formatDate(value?: string | null) {
  return value ? dateOnly.format(new Date(value)) : "-";
}

/** "2024-05-17" -> "17 May" for chart axes. */
export function formatDayKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return dayMonth.format(new Date(year, month - 1, day));
}

export function timeAgo(value: string, now = Date.now()) {
  const seconds = Math.round((new Date(value).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return "az önce";
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return relative.format(Math.round(seconds / 3600), "hour");
  if (abs < 30 * 86_400) return relative.format(Math.round(seconds / 86_400), "day");
  return formatDate(value);
}

export function formatHours(hours: number | null | undefined) {
  if (hours === null || hours === undefined) return "-";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} dk`;
  if (hours < 48) return `${hours.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} sa`;
  return `${(hours / 24).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} gün`;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} MB`;
}

/** Case-insensitive search that understands Turkish casing (İ/i, I/ı). */
export function matchesQuery(text: string, query: string) {
  const fold = (value: string) => value.toLocaleLowerCase("tr-TR");
  return fold(text).includes(fold(query.trim()));
}

export function toCsv(rows: (string | number | null | undefined)[][]) {
  const escape = (value: string | number | null | undefined) => {
    let text = value === null || value === undefined ? "" : String(value);
    // Neutralise spreadsheet formulas in user-supplied text.
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  // Semicolons and a BOM make the file open correctly in Turkish-locale Excel.
  return `﻿${rows.map((row) => row.map(escape).join(";")).join("\r\n")}`;
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
