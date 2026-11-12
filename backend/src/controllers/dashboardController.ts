import { Request, Response } from "express";
import { Prisma, Role, TicketPriority, TicketStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { success } from "../utils/apiResponse.js";
import { ticketAccessWhere } from "../services/ticketService.js";
import { ACTIVE_STATUSES, aiAccuracy, averageResolutionHours, daysAgo, satisfaction, ticketTrend } from "../services/statsService.js";

const userBrief = { select: { id: true, name: true } } as const;

export async function dashboard(req: Request, res: Response) {
  const user = req.user!;
  const where = ticketAccessWhere(user);
  const active: Prisma.TicketWhereInput = { AND: [where, { status: { in: ACTIVE_STATUSES } }] };

  const [statusRows, priorityRows, unassigned, assignedToMe, recent, trend, avgResolutionHours, rating] = await Promise.all([
    prisma.ticket.groupBy({ by: ["status"], where, _count: { _all: true } }),
    prisma.ticket.groupBy({ by: ["priority"], where: active, _count: { _all: true } }),
    prisma.ticket.count({ where: { AND: [active, { assignedToId: null }] } }),
    prisma.ticket.count({ where: { AND: [active, { assignedToId: user.id }] } }),
    prisma.ticket.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { category: true, supportUnit: true, assignedTo: userBrief, createdBy: userBrief }
    }),
    ticketTrend(where, 14),
    averageResolutionHours({ AND: [where, { resolvedAt: { gte: daysAgo(90) } }] }),
    satisfaction(where)
  ]);

  const byStatus = Object.values(TicketStatus).map((status) => ({ status, count: statusRows.find((row) => row.status === status)?._count._all ?? 0 }));
  const openByPriority = Object.values(TicketPriority).map((priority) => ({ priority, count: priorityRows.find((row) => row.priority === priority)?._count._all ?? 0 }));
  const count = (status: TicketStatus) => byStatus.find((row) => row.status === status)?.count ?? 0;

  res.json(success({
    role: user.role,
    total: byStatus.reduce((sum, row) => sum + row.count, 0),
    open: count(TicketStatus.OPEN),
    inProgress: count(TicketStatus.IN_PROGRESS),
    waitingUser: count(TicketStatus.WAITING_USER),
    resolved: count(TicketStatus.RESOLVED),
    closed: count(TicketStatus.CLOSED),
    urgent: openByPriority.find((row) => row.priority === TicketPriority.URGENT)?.count ?? 0,
    unassigned,
    assignedToMe,
    avgResolutionHours,
    satisfaction: rating,
    byStatus,
    openByPriority,
    trend,
    recent
  }));
}

type Group = { label: string; count: number };

async function groupReports(where: Prisma.TicketWhereInput) {
  const [categoryRows, unitRows, departmentRows, priorityRows, statusRows] = await Promise.all([
    prisma.ticket.groupBy({ by: ["categoryId"], where, _count: { _all: true } }),
    prisma.ticket.groupBy({ by: ["supportUnitId"], where, _count: { _all: true } }),
    prisma.ticket.groupBy({ by: ["departmentId"], where, _count: { _all: true } }),
    prisma.ticket.groupBy({ by: ["priority"], where, _count: { _all: true } }),
    prisma.ticket.groupBy({ by: ["status"], where, _count: { _all: true } })
  ]);
  const [categories, units, departments] = await Promise.all([
    prisma.category.findMany({ where: { id: { in: categoryRows.map((row) => row.categoryId) } }, select: { id: true, name: true } }),
    prisma.supportUnit.findMany({ where: { id: { in: unitRows.map((row) => row.supportUnitId) } }, select: { id: true, name: true } }),
    prisma.department.findMany({ where: { id: { in: departmentRows.map((row) => row.departmentId).filter((value): value is string => Boolean(value)) } }, select: { id: true, name: true } })
  ]);

  const sorted = (rows: Group[]) => rows.sort((a, b) => b.count - a.count);
  return {
    byCategory: sorted(categoryRows.map((row) => ({ label: categories.find((item) => item.id === row.categoryId)?.name ?? "Bilinmiyor", count: row._count._all }))),
    bySupportUnit: sorted(unitRows.map((row) => ({ label: units.find((item) => item.id === row.supportUnitId)?.name ?? "Bilinmiyor", count: row._count._all }))),
    byDepartment: sorted(departmentRows.map((row) => ({ label: departments.find((item) => item.id === row.departmentId)?.name ?? "Departman yok", count: row._count._all }))),
    byPriority: Object.values(TicketPriority).map((priority) => ({ label: priority, count: priorityRows.find((row) => row.priority === priority)?._count._all ?? 0 })),
    byStatus: Object.values(TicketStatus).map((status) => ({ label: status, count: statusRows.find((row) => row.status === status)?._count._all ?? 0 }))
  };
}

function reportScope(req: Request): Prisma.TicketWhereInput {
  const base = req.user!.role === Role.ADMIN ? {} : ticketAccessWhere(req.user!);
  const days = Number(req.query.days);
  if (!Number.isFinite(days) || days <= 0) return base;
  return { AND: [base, { createdAt: { gte: daysAgo(Math.min(days, 3650)) } }] };
}

export async function reportOverview(req: Request, res: Response) {
  const where = reportScope(req);
  const days = Number(req.query.days);
  const trendDays = Number.isFinite(days) && days > 0 ? Math.min(days, 90) : 30;

  const [groups, total, avgResolutionHours, rating, ai, trend, staffRows] = await Promise.all([
    groupReports(where),
    prisma.ticket.count({ where }),
    averageResolutionHours(where),
    satisfaction(where),
    aiAccuracy(where),
    ticketTrend(where, trendDays),
    prisma.ticket.groupBy({
      by: ["assignedToId"],
      where: { AND: [where, { assignedToId: { not: null }, status: { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] } }] },
      _count: { _all: true }
    })
  ]);

  const staff = await prisma.user.findMany({ where: { id: { in: staffRows.map((row) => row.assignedToId).filter((value): value is string => Boolean(value)) } }, select: { id: true, name: true } });
  const byStaff = staffRows
    .map((row) => ({ label: staff.find((item) => item.id === row.assignedToId)?.name ?? "Bilinmiyor", count: row._count._all }))
    .sort((a, b) => b.count - a.count);

  res.json(success({
    ...groups,
    byStaff,
    trend,
    kpis: {
      total,
      avgResolutionHours,
      satisfaction: rating,
      aiAccuracy: ai.accuracy,
      aiAnalyzed: ai.analyzed
    }
  }));
}

const reportGroups = {
  "tickets-by-category": "byCategory",
  "tickets-by-support-unit": "bySupportUnit",
  "tickets-by-department": "byDepartment",
  "tickets-by-priority": "byPriority",
  "tickets-by-status": "byStatus"
} as const;

/** Single-dimension report kept for API compatibility; the UI uses the overview. */
export async function report(req: Request, res: Response) {
  const key = reportGroups[req.params.group as keyof typeof reportGroups] ?? "byPriority";
  const groups = await groupReports(reportScope(req));
  res.json(success(groups[key]));
}
