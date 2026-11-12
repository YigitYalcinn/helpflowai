import { Prisma, Role, TicketPriority, TicketStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/errors.js";
import { AuthUser } from "../types.js";
import { analyzeTicket, TicketContext } from "./aiService.js";

/** Minimum AI confidence required to override the category the employee picked. */
export const AI_REROUTE_THRESHOLD = 0.8;

const FINAL_STATUSES: TicketStatus[] = [TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.CANCELLED];
const LOCKED_STATUSES: TicketStatus[] = [TicketStatus.CLOSED, TicketStatus.CANCELLED];

const userBrief = { select: { id: true, name: true, email: true } } as const;

const ticketInclude = {
  createdBy: userBrief,
  department: true,
  category: { include: { supportUnit: true } },
  supportUnit: true,
  assignedTo: userBrief,
  aiAnalysis: true,
  satisfactionRating: true
} satisfies Prisma.TicketInclude;

const ticketListInclude = {
  createdBy: userBrief,
  department: true,
  category: true,
  supportUnit: true,
  assignedTo: userBrief,
  satisfactionRating: { select: { score: true } },
  _count: { select: { messages: true, attachments: true } }
} satisfies Prisma.TicketInclude;

export const attachmentSelect = {
  id: true,
  fileName: true,
  mimeType: true,
  size: true,
  createdAt: true,
  uploadedBy: { select: { id: true, name: true } }
} satisfies Prisma.TicketAttachmentSelect;

export function ticketAccessWhere(user: AuthUser): Prisma.TicketWhereInput {
  if (user.role === Role.ADMIN) return {};
  if (user.role === Role.EMPLOYEE) return { createdById: user.id };
  return { OR: [{ supportUnitId: user.supportUnitId ?? "__none__" }, { assignedToId: user.id }] };
}

export async function listTickets(user: AuthUser) {
  return prisma.ticket.findMany({
    where: ticketAccessWhere(user),
    include: ticketListInclude,
    orderBy: { createdAt: "desc" }
  });
}

/** Loads the bare ticket row if the user may see it; used as the access check for every mutation. */
export async function findAccessibleTicket(id: string, user: AuthUser) {
  const ticket = await prisma.ticket.findFirst({ where: { AND: [{ id }, ticketAccessWhere(user)] } });
  if (!ticket) throw new AppError("Talep bulunamadı", 404);
  return ticket;
}

export async function getTicketDetail(id: string, user: AuthUser) {
  const ticket = await prisma.ticket.findFirst({
    where: { AND: [{ id }, ticketAccessWhere(user)] },
    include: {
      ...ticketInclude,
      messages: { include: { sender: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: "asc" } },
      internalNotes: user.role === Role.EMPLOYEE ? false : { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } },
      statusHistory: { include: { changedBy: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } },
      assignmentHistory: {
        include: { fromSupportUnit: true, toSupportUnit: true, changedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" }
      },
      attachments: { select: attachmentSelect, orderBy: { createdAt: "asc" } }
    }
  });
  if (!ticket) throw new AppError("Talep bulunamadı", 404);

  // Assignment history stores assignee ids without a relation; resolve names here.
  const assigneeIds = [...new Set(ticket.assignmentHistory.flatMap((item) => [item.fromAssignedToId, item.toAssignedToId]).filter((value): value is string => Boolean(value)))];
  const assignees = assigneeIds.length ? await prisma.user.findMany({ where: { id: { in: assigneeIds } }, select: { id: true, name: true } }) : [];
  const nameOf = (userId: string | null) => (userId ? assignees.find((item) => item.id === userId)?.name ?? null : null);

  return {
    ...ticket,
    assignmentHistory: ticket.assignmentHistory.map((item) => ({
      ...item,
      fromAssignedToName: nameOf(item.fromAssignedToId),
      toAssignedToName: nameOf(item.toAssignedToId)
    }))
  };
}

// Arbitrary constant identifying the "ticket number" advisory lock in Postgres.
const TICKET_NUMBER_LOCK = 48_151_623;

async function nextTicketNumber(tx: Prisma.TransactionClient) {
  const last = await tx.ticket.findFirst({ orderBy: { ticketNumber: "desc" }, select: { ticketNumber: true } });
  const current = last ? Number(last.ticketNumber.replace(/\D/g, "")) || 0 : 0;
  return `HF-${String(current + 1).padStart(6, "0")}`;
}

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function activeCategories() {
  return prisma.category.findMany({ where: { isActive: true }, include: { supportUnit: true }, orderBy: { name: "asc" } });
}

function analysisData(ai: Awaited<ReturnType<typeof analyzeTicket>>, extra: Record<string, unknown>) {
  return {
    summary: ai.summary,
    suggestedCategory: ai.category,
    suggestedSupportUnit: ai.supportUnit,
    suggestedPriority: ai.priority,
    impact: ai.impact,
    possibleCauses: ai.possibleCauses,
    suggestedSolutions: ai.suggestedSolutions,
    questionsToAsk: ai.questionsToAsk,
    confidenceScore: ai.confidenceScore,
    rawResponse: { ...ai, ...extra } as Prisma.InputJsonObject
  };
}

export async function createTicket(user: AuthUser, input: { title: string; description: string; categoryId: string; location?: string | null }) {
  const categories = await activeCategories();
  const category = categories.find((item) => item.id === input.categoryId);
  if (!category) throw new AppError("Kategori bulunamadı veya pasif", 404);

  const ai = await analyzeTicket({ title: input.title, description: input.description, categories, fallbackCategory: category.name });
  const suggested = categories.find((item) => item.name === ai.category);
  // The employee's choice wins unless the model is confident it belongs elsewhere.
  const rerouted = Boolean(suggested && suggested.id !== category.id && ai.confidenceScore >= AI_REROUTE_THRESHOLD);
  const routed = rerouted && suggested ? suggested : category;

  // Ticket numbers are sequential. The advisory lock makes concurrent requests
  // take their numbers one at a time; it is released when the transaction ends.
  // The unique index stays as a safety net, hence the single retry.
  const create = () =>
    prisma.$transaction(async (tx) => {
      // Cast to text: Prisma cannot deserialize the function's `void` result.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${TICKET_NUMBER_LOCK}::bigint)::text`;
      return tx.ticket.create({
        data: {
          ticketNumber: await nextTicketNumber(tx),
          title: input.title,
          description: input.description,
          createdById: user.id,
          departmentId: user.departmentId,
          categoryId: routed.id,
          supportUnitId: routed.supportUnitId,
          priority: ai.priority,
          location: input.location || null,
          aiAnalysis: { create: analysisData(ai, { requestedCategory: category.name, rerouted }) },
          statusHistory: { create: { newStatus: TicketStatus.OPEN, changedById: user.id } }
        },
        include: ticketInclude
      });
    });

  try {
    return await create();
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    return create();
  }
}

export async function reanalyzeTicket(id: string, user: AuthUser) {
  const ticket = await prisma.ticket.findFirst({ where: { AND: [{ id }, ticketAccessWhere(user)] }, include: { category: true } });
  if (!ticket) throw new AppError("Talep bulunamadı", 404);

  const categories = await activeCategories();
  const ai = await analyzeTicket({ title: ticket.title, description: ticket.description, categories, fallbackCategory: ticket.category.name });
  const data = analysisData(ai, { requestedCategory: ticket.category.name, rerouted: false, reanalyzedAt: new Date().toISOString() });
  await prisma.ticketAiAnalysis.upsert({ where: { ticketId: id }, update: data, create: { ticketId: id, ...data } });
  return getTicketDetail(id, user);
}

export async function updateTicketDetails(
  id: string,
  user: AuthUser,
  input: { title?: string; description?: string; categoryId?: string; location?: string | null }
) {
  const ticket = await findAccessibleTicket(id, user);
  if (user.role === Role.EMPLOYEE && FINAL_STATUSES.includes(ticket.status)) {
    throw new AppError("Çözülmüş veya kapatılmış talepler düzenlenemez", 422);
  }

  const data: Prisma.TicketUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.location !== undefined) data.location = input.location || null;

  if (input.categoryId && input.categoryId !== ticket.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!category || !category.isActive) throw new AppError("Kategori bulunamadı veya pasif", 404);
    data.category = { connect: { id: category.id } };

    // Changing the category re-routes the ticket to that category's team.
    if (category.supportUnitId !== ticket.supportUnitId) {
      data.supportUnit = { connect: { id: category.supportUnitId } };
      data.assignedTo = { disconnect: true };
      data.assignmentHistory = {
        create: {
          fromSupportUnitId: ticket.supportUnitId,
          toSupportUnitId: category.supportUnitId,
          fromAssignedToId: ticket.assignedToId,
          toAssignedToId: null,
          changedById: user.id,
          reason: `Kategori "${category.name}" olarak değiştirildi`
        }
      };
    }
  }

  return prisma.ticket.update({ where: { id }, data, include: ticketInclude });
}

async function applyStatus(ticket: { id: string; status: TicketStatus }, user: AuthUser, status: TicketStatus) {
  if (ticket.status === status) return prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id }, include: ticketInclude });

  const now = new Date();
  const reopening = !FINAL_STATUSES.includes(status);
  return prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status,
      ...(status === TicketStatus.RESOLVED ? { resolvedAt: now } : {}),
      ...(status === TicketStatus.CLOSED ? { closedAt: now } : {}),
      ...(reopening ? { resolvedAt: null, closedAt: null } : {}),
      statusHistory: { create: { oldStatus: ticket.status, newStatus: status, changedById: user.id } }
    },
    include: ticketInclude
  });
}

export async function changeStatus(id: string, user: AuthUser, status: TicketStatus) {
  const ticket = await findAccessibleTicket(id, user);
  return applyStatus(ticket, user, status);
}

/** The requester confirms the fix; staff may also close a resolved ticket. */
export async function closeTicket(id: string, user: AuthUser) {
  const ticket = await findAccessibleTicket(id, user);
  if (user.role === Role.EMPLOYEE && ticket.status !== TicketStatus.RESOLVED) {
    throw new AppError("Yalnızca çözüldü olarak işaretlenen talepler kapatılabilir", 422);
  }
  return applyStatus(ticket, user, TicketStatus.CLOSED);
}

export async function cancelTicket(id: string, user: AuthUser) {
  const ticket = await findAccessibleTicket(id, user);
  if (FINAL_STATUSES.includes(ticket.status)) throw new AppError("Bu talep artık iptal edilemez", 422);
  return applyStatus(ticket, user, TicketStatus.CANCELLED);
}

export async function reopenTicket(id: string, user: AuthUser) {
  const ticket = await findAccessibleTicket(id, user);
  if (!FINAL_STATUSES.includes(ticket.status)) throw new AppError("Talep zaten açık", 422);
  if (user.role === Role.EMPLOYEE && ticket.status === TicketStatus.CANCELLED) {
    throw new AppError("İptal edilen talepler yeniden açılamaz, yeni bir talep oluşturun", 422);
  }
  return applyStatus(ticket, user, ticket.assignedToId ? TicketStatus.IN_PROGRESS : TicketStatus.OPEN);
}

export async function listAssignees(id: string, user: AuthUser) {
  const ticket = await findAccessibleTicket(id, user);
  return prisma.user.findMany({
    where: { role: Role.IT_STAFF, supportUnitId: ticket.supportUnitId },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" }
  });
}

export async function assignTicket(id: string, user: AuthUser, assignedToId?: string | null) {
  const ticket = await findAccessibleTicket(id, user);
  if (LOCKED_STATUSES.includes(ticket.status)) throw new AppError("Kapatılmış veya iptal edilmiş taleplere atama yapılamaz", 422);

  // No id means "assign to me"; an explicit null unassigns.
  const target = assignedToId === undefined ? user.id : assignedToId;
  if (target === ticket.assignedToId) return prisma.ticket.findUniqueOrThrow({ where: { id }, include: ticketInclude });

  if (target) {
    const assignee = await prisma.user.findUnique({ where: { id: target } });
    if (!assignee || assignee.role === Role.EMPLOYEE) throw new AppError("Talep yalnızca BT personeline atanabilir", 422);
    if (assignee.role === Role.IT_STAFF && assignee.supportUnitId !== ticket.supportUnitId) {
      throw new AppError("Personel bu talebin destek ekibinde değil; önce talebi ilgili ekibe transfer edin", 422);
    }
  }

  const startWork = Boolean(target) && ticket.status === TicketStatus.OPEN;
  return prisma.ticket.update({
    where: { id },
    data: {
      assignedTo: target ? { connect: { id: target } } : { disconnect: true },
      ...(startWork
        ? { status: TicketStatus.IN_PROGRESS, statusHistory: { create: { oldStatus: ticket.status, newStatus: TicketStatus.IN_PROGRESS, changedById: user.id } } }
        : {}),
      assignmentHistory: {
        create: {
          fromSupportUnitId: ticket.supportUnitId,
          toSupportUnitId: ticket.supportUnitId,
          fromAssignedToId: ticket.assignedToId,
          toAssignedToId: target ?? null,
          changedById: user.id,
          reason: target ? "Talep atandı" : "Atama kaldırıldı"
        }
      }
    },
    include: ticketInclude
  });
}

export async function transferTicket(id: string, user: AuthUser, supportUnitId: string, reason?: string) {
  const ticket = await findAccessibleTicket(id, user);
  if (LOCKED_STATUSES.includes(ticket.status)) throw new AppError("Kapatılmış veya iptal edilmiş talepler transfer edilemez", 422);
  if (supportUnitId === ticket.supportUnitId) throw new AppError("Talep zaten bu destek ekibinde", 422);

  const supportUnit = await prisma.supportUnit.findUnique({ where: { id: supportUnitId } });
  if (!supportUnit || !supportUnit.isActive) throw new AppError("Destek ekibi bulunamadı veya pasif", 404);

  // The new team starts from a clean slate: unassigned and back in the queue.
  const requeue = ticket.status === TicketStatus.IN_PROGRESS;
  return prisma.ticket.update({
    where: { id },
    data: {
      supportUnit: { connect: { id: supportUnitId } },
      assignedTo: { disconnect: true },
      ...(requeue ? { status: TicketStatus.OPEN, statusHistory: { create: { oldStatus: ticket.status, newStatus: TicketStatus.OPEN, changedById: user.id } } } : {}),
      assignmentHistory: {
        create: {
          fromSupportUnitId: ticket.supportUnitId,
          toSupportUnitId: supportUnitId,
          fromAssignedToId: ticket.assignedToId,
          toAssignedToId: null,
          changedById: user.id,
          reason: reason?.trim() || null
        }
      }
    },
    include: ticketInclude
  });
}

export async function changePriority(id: string, user: AuthUser, priority: TicketPriority) {
  await findAccessibleTicket(id, user);
  return prisma.ticket.update({ where: { id }, data: { priority }, include: ticketInclude });
}

export async function addMessage(id: string, user: AuthUser, message: string) {
  const ticket = await findAccessibleTicket(id, user);
  if (LOCKED_STATUSES.includes(ticket.status)) throw new AppError("Kapatılmış veya iptal edilmiş taleplere mesaj yazılamaz", 422);

  const created = await prisma.ticketMessage.create({
    data: { ticketId: id, senderId: user.id, message },
    include: { sender: { select: { id: true, name: true, role: true } } }
  });

  // When the requester answers a "waiting for user" ticket, hand it back to IT.
  if (user.role === Role.EMPLOYEE && ticket.status === TicketStatus.WAITING_USER) {
    await applyStatus(ticket, user, ticket.assignedToId ? TicketStatus.IN_PROGRESS : TicketStatus.OPEN);
  }
  return created;
}

export async function addInternalNote(id: string, user: AuthUser, note: string) {
  await findAccessibleTicket(id, user);
  return prisma.ticketInternalNote.create({
    data: { ticketId: id, authorId: user.id, note },
    include: { author: { select: { id: true, name: true } } }
  });
}

export async function rateTicket(id: string, user: AuthUser, input: { score: number; comment?: string | null }) {
  const ticket = await findAccessibleTicket(id, user);
  if (ticket.createdById !== user.id) throw new AppError("Yalnızca talebi açan kişi değerlendirme yapabilir", 403);
  if (ticket.status !== TicketStatus.RESOLVED && ticket.status !== TicketStatus.CLOSED) {
    throw new AppError("Değerlendirme yalnızca çözülen talepler için yapılabilir", 422);
  }

  const data = { score: input.score, comment: input.comment?.trim() || null };
  return prisma.satisfactionRating.upsert({
    where: { ticketId: id },
    update: data,
    create: { ticketId: id, userId: user.id, ...data }
  });
}

/** Everything the AI helpers need to write about a ticket, already access-checked. */
export async function buildTicketContext(id: string, user: AuthUser): Promise<TicketContext> {
  const ticket = await prisma.ticket.findFirst({
    where: { AND: [{ id }, ticketAccessWhere(user)] },
    include: {
      createdBy: { select: { name: true } },
      category: true,
      supportUnit: true,
      aiAnalysis: true,
      messages: { include: { sender: { select: { name: true, role: true } } }, orderBy: { createdAt: "asc" } },
      internalNotes: { orderBy: { createdAt: "desc" }, take: 10 }
    }
  });
  if (!ticket) throw new AppError("Talep bulunamadı", 404);

  return {
    ticketNumber: ticket.ticketNumber,
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    category: ticket.category.name,
    supportUnit: ticket.supportUnit.name,
    requesterName: ticket.createdBy.name,
    messages: ticket.messages.slice(-30).map((item) => ({ senderName: item.sender.name, fromStaff: item.sender.role !== Role.EMPLOYEE, message: item.message })),
    internalNotes: ticket.internalNotes.map((item) => item.note),
    analysis: ticket.aiAnalysis
  };
}
