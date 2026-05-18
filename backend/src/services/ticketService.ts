import { Prisma, Role, TicketPriority, TicketStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/errors.js";
import { AuthUser } from "../types.js";
import { analyzeTicket } from "./aiService.js";

const ticketInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  department: true,
  category: { include: { supportUnit: true } },
  supportUnit: true,
  assignedTo: { select: { id: true, name: true, email: true } },
  aiAnalysis: true
} satisfies Prisma.TicketInclude;

export function ticketAccessWhere(user: AuthUser): Prisma.TicketWhereInput {
  if (user.role === Role.ADMIN) return {};
  if (user.role === Role.EMPLOYEE) return { createdById: user.id };
  return { supportUnitId: user.supportUnitId ?? "__none__" };
}

export async function listTickets(user: AuthUser) {
  return prisma.ticket.findMany({
    where: ticketAccessWhere(user),
    include: ticketInclude,
    orderBy: { createdAt: "desc" }
  });
}

export async function getTicketOrThrow(id: string, user: AuthUser) {
  const ticket = await prisma.ticket.findFirst({
    where: { id, ...ticketAccessWhere(user) },
    include: {
      ...ticketInclude,
      messages: { include: { sender: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: "asc" } },
      internalNotes: user.role === Role.EMPLOYEE ? false : { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } },
      statusHistory: { orderBy: { createdAt: "desc" } },
      assignmentHistory: { include: { fromSupportUnit: true, toSupportUnit: true }, orderBy: { createdAt: "desc" } }
    }
  });

  if (!ticket) throw new AppError("Ticket not found", 404);
  return ticket;
}

export async function createTicket(user: AuthUser, input: { title: string; description: string; categoryId: string; location?: string }) {
  const category = await prisma.category.findUnique({ where: { id: input.categoryId }, include: { supportUnit: true } });
  if (!category || !category.isActive) throw new AppError("Category not found", 404);

  const categories = await prisma.category.findMany({ where: { isActive: true }, include: { supportUnit: true } });
  const ai = await analyzeTicket({ title: input.title, description: input.description, categories });
  const suggestedCategory = categories.find((item) => item.name === ai.category);
  const routedCategory = suggestedCategory ?? category;
  const count = await prisma.ticket.count();
  const ticketNumber = `HF-${String(count + 1).padStart(6, "0")}`;

  return prisma.ticket.create({
    data: {
      ticketNumber,
      title: input.title,
      description: input.description,
      createdById: user.id,
      departmentId: user.departmentId,
      categoryId: routedCategory.id,
      supportUnitId: routedCategory.supportUnitId,
      priority: ai.priority,
      location: input.location,
      aiAnalysis: {
        create: {
          summary: ai.summary,
          suggestedCategory: ai.category,
          suggestedSupportUnit: ai.supportUnit,
          suggestedPriority: ai.priority,
          impact: ai.impact,
          possibleCauses: ai.possibleCauses,
          suggestedSolutions: ai.suggestedSolutions,
          questionsToAsk: ai.questionsToAsk,
          confidenceScore: ai.confidenceScore,
          rawResponse: ai
        }
      },
      statusHistory: { create: { newStatus: TicketStatus.OPEN, changedById: user.id } }
    },
    include: ticketInclude
  });
}

export async function updateTicket(id: string, user: AuthUser, input: Prisma.TicketUpdateInput & { categoryId?: string }) {
  const ticket = await getTicketOrThrow(id, user);
  if (user.role === Role.EMPLOYEE && ["RESOLVED", "CLOSED", "CANCELLED"].includes(ticket.status)) {
    throw new AppError("Closed or resolved tickets cannot be edited by employee", 422);
  }
  const data: Prisma.TicketUpdateInput = { ...input };

  if (input.categoryId) {
    const category = await prisma.category.findUniqueOrThrow({ where: { id: input.categoryId } });
    data.category = { connect: { id: category.id } };
    data.supportUnit = { connect: { id: category.supportUnitId } };
    delete (data as { categoryId?: string }).categoryId;
  }

  return prisma.ticket.update({ where: { id }, data, include: ticketInclude });
}

export async function changeStatus(id: string, user: AuthUser, status: TicketStatus) {
  const ticket = await getTicketOrThrow(id, user);
  const now = new Date();
  return prisma.ticket.update({
    where: { id },
    data: {
      status,
      resolvedAt: status === TicketStatus.RESOLVED ? now : ticket.resolvedAt,
      closedAt: status === TicketStatus.CLOSED ? now : ticket.closedAt,
      statusHistory: { create: { oldStatus: ticket.status, newStatus: status, changedById: user.id } }
    },
    include: ticketInclude
  });
}

export async function assignTicket(id: string, user: AuthUser, assignedToId?: string) {
  const ticket = await getTicketOrThrow(id, user);
  const targetAssignee = assignedToId ?? user.id;
  return prisma.ticket.update({
    where: { id },
    data: {
      assignedToId: targetAssignee,
      status: ticket.status === TicketStatus.OPEN ? TicketStatus.IN_PROGRESS : ticket.status,
      assignmentHistory: {
        create: {
          fromSupportUnitId: ticket.supportUnitId,
          toSupportUnitId: ticket.supportUnitId,
          fromAssignedToId: ticket.assignedToId,
          toAssignedToId: targetAssignee,
          changedById: user.id,
          reason: "Ticket assigned"
        }
      }
    },
    include: ticketInclude
  });
}

export async function transferTicket(id: string, user: AuthUser, supportUnitId: string, reason?: string) {
  const ticket = await getTicketOrThrow(id, user);
  const supportUnit = await prisma.supportUnit.findUnique({ where: { id: supportUnitId } });
  if (!supportUnit) throw new AppError("Support unit not found", 404);

  return prisma.ticket.update({
    where: { id },
    data: {
      supportUnitId,
      assignedToId: null,
      assignmentHistory: {
        create: {
          fromSupportUnitId: ticket.supportUnitId,
          toSupportUnitId: supportUnitId,
          fromAssignedToId: ticket.assignedToId,
          toAssignedToId: null,
          changedById: user.id,
          reason
        }
      }
    },
    include: ticketInclude
  });
}

export async function changePriority(id: string, user: AuthUser, priority: TicketPriority) {
  await getTicketOrThrow(id, user);
  return prisma.ticket.update({ where: { id }, data: { priority }, include: ticketInclude });
}
