import { Request, Response } from "express";
import { TicketStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { success } from "../utils/apiResponse.js";
import { routeParam } from "../utils/request.js";
import { addAttachment, deleteAttachment, getAttachmentFile } from "../services/attachmentService.js";
import {
  addInternalNote,
  addMessage,
  assignTicket,
  cancelTicket,
  changePriority,
  changeStatus,
  closeTicket,
  createTicket,
  findAccessibleTicket,
  getTicketDetail,
  listAssignees,
  listTickets,
  rateTicket,
  reopenTicket,
  transferTicket,
  updateTicketDetails
} from "../services/ticketService.js";
import {
  assignSchema,
  attachmentSchema,
  categorySchema,
  createTicketSchema,
  messageSchema,
  noteSchema,
  prioritySchema,
  ratingSchema,
  statusSchema,
  transferSchema,
  updateTicketSchema
} from "../validators/ticketValidators.js";

const id = (req: Request) => routeParam(req, "id");

export async function index(req: Request, res: Response) {
  res.json(success(await listTickets(req.user!)));
}

export async function show(req: Request, res: Response) {
  res.json(success(await getTicketDetail(id(req), req.user!)));
}

export async function store(req: Request, res: Response) {
  const input = createTicketSchema.parse(req.body);
  res.status(201).json(success(await createTicket(req.user!, input), "Talep oluşturuldu"));
}

export async function update(req: Request, res: Response) {
  const input = updateTicketSchema.parse(req.body);
  res.json(success(await updateTicketDetails(id(req), req.user!, input), "Talep güncellendi"));
}

export async function destroy(req: Request, res: Response) {
  await findAccessibleTicket(id(req), req.user!);
  await prisma.ticket.delete({ where: { id: id(req) } });
  res.json(success(null, "Talep silindi"));
}

export async function assignees(req: Request, res: Response) {
  res.json(success(await listAssignees(id(req), req.user!)));
}

export async function assign(req: Request, res: Response) {
  const input = assignSchema.parse(req.body ?? {});
  res.json(success(await assignTicket(id(req), req.user!, input.assignedToId)));
}

export async function status(req: Request, res: Response) {
  const input = statusSchema.parse(req.body);
  res.json(success(await changeStatus(id(req), req.user!, input.status)));
}

export async function priority(req: Request, res: Response) {
  const input = prioritySchema.parse(req.body);
  res.json(success(await changePriority(id(req), req.user!, input.priority)));
}

export async function category(req: Request, res: Response) {
  const input = categorySchema.parse(req.body);
  res.json(success(await updateTicketDetails(id(req), req.user!, input)));
}

export async function transfer(req: Request, res: Response) {
  const input = transferSchema.parse(req.body);
  res.json(success(await transferTicket(id(req), req.user!, input.supportUnitId, input.reason), "Talep transfer edildi"));
}

export async function resolve(req: Request, res: Response) {
  res.json(success(await changeStatus(id(req), req.user!, TicketStatus.RESOLVED)));
}

export async function close(req: Request, res: Response) {
  res.json(success(await closeTicket(id(req), req.user!)));
}

export async function cancel(req: Request, res: Response) {
  res.json(success(await cancelTicket(id(req), req.user!)));
}

export async function reopen(req: Request, res: Response) {
  res.json(success(await reopenTicket(id(req), req.user!)));
}

export async function messages(req: Request, res: Response) {
  await findAccessibleTicket(id(req), req.user!);
  const rows = await prisma.ticketMessage.findMany({
    where: { ticketId: id(req) },
    include: { sender: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "asc" }
  });
  res.json(success(rows));
}

export async function storeMessage(req: Request, res: Response) {
  const input = messageSchema.parse(req.body);
  res.status(201).json(success(await addMessage(id(req), req.user!, input.message), "Mesaj eklendi"));
}

export async function internalNotes(req: Request, res: Response) {
  await findAccessibleTicket(id(req), req.user!);
  const rows = await prisma.ticketInternalNote.findMany({
    where: { ticketId: id(req) },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" }
  });
  res.json(success(rows));
}

export async function storeInternalNote(req: Request, res: Response) {
  const input = noteSchema.parse(req.body);
  res.status(201).json(success(await addInternalNote(id(req), req.user!, input.note), "İç not eklendi"));
}

export async function rate(req: Request, res: Response) {
  const input = ratingSchema.parse(req.body);
  res.json(success(await rateTicket(id(req), req.user!, input), "Değerlendirmeniz kaydedildi"));
}

export async function storeAttachment(req: Request, res: Response) {
  const input = attachmentSchema.parse(req.body);
  res.status(201).json(success(await addAttachment(id(req), req.user!, input), "Dosya eklendi"));
}

export async function downloadAttachment(req: Request, res: Response) {
  const file = await getAttachmentFile(id(req), routeParam(req, "attachmentId"), req.user!);
  const data = Buffer.from(file.data);
  res.setHeader("Content-Type", file.mimeType);
  res.setHeader("Content-Length", String(data.length));
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
  res.setHeader("Cache-Control", "private, no-store");
  res.end(data);
}

export async function destroyAttachment(req: Request, res: Response) {
  await deleteAttachment(id(req), routeParam(req, "attachmentId"), req.user!);
  res.json(success(null, "Dosya silindi"));
}
