import { Request, Response } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { success } from "../utils/apiResponse.js";
import { ticketAccessWhere } from "../services/ticketService.js";

export async function dashboard(req: Request, res: Response) {
  const where = ticketAccessWhere(req.user!);
  const [total, open, inProgress, resolved, urgent] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.count({ where: { ...where, status: "OPEN" } }),
    prisma.ticket.count({ where: { ...where, status: "IN_PROGRESS" } }),
    prisma.ticket.count({ where: { ...where, status: "RESOLVED" } }),
    prisma.ticket.count({ where: { ...where, priority: "URGENT" } })
  ]);

  res.json(success({ total, open, inProgress, resolved, urgent, role: req.user!.role }));
}

export async function report(req: Request, res: Response) {
  const group = req.params.group;
  const where = req.user!.role === Role.ADMIN ? {} : ticketAccessWhere(req.user!);

  if (group === "tickets-by-category") {
    const rows = await prisma.ticket.groupBy({ by: ["categoryId"], where, _count: { _all: true } });
    const categories = await prisma.category.findMany({ where: { id: { in: rows.map((row) => row.categoryId) } } });
    return res.json(success(rows.map((row) => ({ label: categories.find((item) => item.id === row.categoryId)?.name ?? "Unknown", count: row._count._all }))));
  }

  if (group === "tickets-by-support-unit") {
    const rows = await prisma.ticket.groupBy({ by: ["supportUnitId"], where, _count: { _all: true } });
    const units = await prisma.supportUnit.findMany({ where: { id: { in: rows.map((row) => row.supportUnitId) } } });
    return res.json(success(rows.map((row) => ({ label: units.find((item) => item.id === row.supportUnitId)?.name ?? "Unknown", count: row._count._all }))));
  }

  if (group === "tickets-by-department") {
    const rows = await prisma.ticket.groupBy({ by: ["departmentId"], where, _count: { _all: true } });
    const departments = await prisma.department.findMany({ where: { id: { in: rows.map((row) => row.departmentId).filter(Boolean) as string[] } } });
    return res.json(success(rows.map((row) => ({ label: departments.find((item) => item.id === row.departmentId)?.name ?? "No department", count: row._count._all }))));
  }

  const rows = await prisma.ticket.groupBy({ by: ["priority"], where, _count: { _all: true } });
  return res.json(success(rows.map((row) => ({ label: row.priority, count: row._count._all }))));
}
