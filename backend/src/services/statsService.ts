import { Prisma, TicketStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";

export const ACTIVE_STATUSES: TicketStatus[] = [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.WAITING_USER];

const dayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: env.APP_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" });

/** Calendar day (YYYY-MM-DD) in the organisation's time zone, so "today" matches what users see. */
export function dayKey(date: Date) {
  return dayFormatter.format(date);
}

export function daysAgo(days: number, from = new Date()) {
  return new Date(from.getTime() - days * 24 * 60 * 60 * 1000);
}

export async function ticketTrend(where: Prisma.TicketWhereInput, days: number) {
  const since = daysAgo(days);
  const rows = await prisma.ticket.findMany({
    where: { AND: [where, { OR: [{ createdAt: { gte: since } }, { resolvedAt: { gte: since } }] }] },
    select: { createdAt: true, resolvedAt: true }
  });

  const buckets = new Map<string, { date: string; created: number; resolved: number }>();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = dayKey(daysAgo(offset));
    buckets.set(date, { date, created: 0, resolved: 0 });
  }
  for (const row of rows) {
    const created = buckets.get(dayKey(row.createdAt));
    if (created) created.created += 1;
    const resolved = row.resolvedAt ? buckets.get(dayKey(row.resolvedAt)) : undefined;
    if (resolved) resolved.resolved += 1;
  }
  return [...buckets.values()];
}

export async function averageResolutionHours(where: Prisma.TicketWhereInput) {
  const rows = await prisma.ticket.findMany({
    where: { AND: [where, { resolvedAt: { not: null } }] },
    select: { createdAt: true, resolvedAt: true }
  });
  if (!rows.length) return null;
  const totalMs = rows.reduce((sum, row) => sum + (row.resolvedAt!.getTime() - row.createdAt.getTime()), 0);
  return Math.round((totalMs / rows.length / 3_600_000) * 10) / 10;
}

export async function satisfaction(where: Prisma.TicketWhereInput) {
  const result = await prisma.satisfactionRating.aggregate({ where: { ticket: where }, _avg: { score: true }, _count: { _all: true } });
  return {
    average: result._avg.score === null ? null : Math.round(result._avg.score * 10) / 10,
    count: result._count._all
  };
}

/** Share of tickets whose final category matches what the AI suggested. */
export async function aiAccuracy(where: Prisma.TicketWhereInput) {
  const rows = await prisma.ticket.findMany({
    where: { AND: [where, { aiAnalysis: { isNot: null } }] },
    select: { category: { select: { name: true } }, aiAnalysis: { select: { suggestedCategory: true } } }
  });
  if (!rows.length) return { analyzed: 0, accuracy: null };
  const matches = rows.filter((row) => row.aiAnalysis?.suggestedCategory === row.category.name).length;
  return { analyzed: rows.length, accuracy: Math.round((matches / rows.length) * 100) };
}
