import { Request, Response } from "express";
import { Role, TicketStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { success } from "../utils/apiResponse.js";
import { AppError } from "../utils/errors.js";
import { routeParam } from "../utils/request.js";
import {
  assignTicket,
  changePriority,
  changeStatus,
  createTicket,
  getTicketOrThrow,
  listTickets,
  transferTicket,
  updateTicket
} from "../services/ticketService.js";
import {
  assignSchema,
  createTicketSchema,
  messageSchema,
  noteSchema,
  prioritySchema,
  statusSchema,
  transferSchema,
  updateTicketSchema
} from "../validators/ticketValidators.js";

export async function index(req: Request, res: Response) {
  res.json(success(await listTickets(req.user!)));
}

export async function show(req: Request, res: Response) {
  res.json(success(await getTicketOrThrow(routeParam(req, "id"), req.user!)));
}

export async function store(req: Request, res: Response) {
  const input = createTicketSchema.parse(req.body);
  res.status(201).json(success(await createTicket(req.user!, input), "Ticket created"));
}

export async function update(req: Request, res: Response) {
  const input = updateTicketSchema.parse(req.body);
  if (req.user!.role === Role.EMPLOYEE) {
    const allowed = updateTicketSchema.pick({ title: true, description: true, categoryId: true, location: true }).parse(req.body);
    return res.json(success(await updateTicket(routeParam(req, "id"), req.user!, allowed)));
  }
  res.json(success(await updateTicket(routeParam(req, "id"), req.user!, input)));
}

export async function destroy(req: Request, res: Response) {
  const id = routeParam(req, "id");
  await getTicketOrThrow(id, req.user!);
  await prisma.ticket.delete({ where: { id } });
  res.json(success(null, "Ticket deleted"));
}

export async function assign(req: Request, res: Response) {
  const input = assignSchema.parse(req.body);
  res.json(success(await assignTicket(routeParam(req, "id"), req.user!, input.assignedToId)));
}

export async function status(req: Request, res: Response) {
  const input = statusSchema.parse(req.body);
  res.json(success(await changeStatus(routeParam(req, "id"), req.user!, input.status)));
}

export async function priority(req: Request, res: Response) {
  const input = prioritySchema.parse(req.body);
  res.json(success(await changePriority(routeParam(req, "id"), req.user!, input.priority)));
}

export async function category(req: Request, res: Response) {
  const input = updateTicketSchema.pick({ categoryId: true }).required().parse(req.body);
  res.json(success(await updateTicket(routeParam(req, "id"), req.user!, input)));
}

export async function transfer(req: Request, res: Response) {
  const input = transferSchema.parse(req.body);
  res.json(success(await transferTicket(routeParam(req, "id"), req.user!, input.supportUnitId, input.reason)));
}

export async function resolve(req: Request, res: Response) {
  res.json(success(await changeStatus(routeParam(req, "id"), req.user!, TicketStatus.RESOLVED)));
}

export async function close(req: Request, res: Response) {
  const id = routeParam(req, "id");
  const ticket = await getTicketOrThrow(id, req.user!);
  if (req.user!.role === Role.EMPLOYEE && ticket.createdById !== req.user!.id) throw new AppError("Forbidden", 403);
  res.json(success(await changeStatus(id, req.user!, TicketStatus.CLOSED)));
}

export async function reopen(req: Request, res: Response) {
  res.json(success(await changeStatus(routeParam(req, "id"), req.user!, TicketStatus.OPEN)));
}

export async function messages(req: Request, res: Response) {
  const id = routeParam(req, "id");
  await getTicketOrThrow(id, req.user!);
  const rows = await prisma.ticketMessage.findMany({
    where: { ticketId: id },
    include: { sender: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "asc" }
  });
  res.json(success(rows));
}

export async function addMessage(req: Request, res: Response) {
  const input = messageSchema.parse(req.body);
  const id = routeParam(req, "id");
  await getTicketOrThrow(id, req.user!);
  const message = await prisma.ticketMessage.create({
    data: { ticketId: id, senderId: req.user!.id, message: input.message },
    include: { sender: { select: { id: true, name: true, role: true } } }
  });
  res.status(201).json(success(message, "Message added"));
}

export async function internalNotes(req: Request, res: Response) {
  const id = routeParam(req, "id");
  await getTicketOrThrow(id, req.user!);
  const rows = await prisma.ticketInternalNote.findMany({
    where: { ticketId: id },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" }
  });
  res.json(success(rows));
}

export async function addInternalNote(req: Request, res: Response) {
  const input = noteSchema.parse(req.body);
  const id = routeParam(req, "id");
  await getTicketOrThrow(id, req.user!);
  const note = await prisma.ticketInternalNote.create({
    data: { ticketId: id, authorId: req.user!.id, note: input.note },
    include: { author: { select: { id: true, name: true } } }
  });
  res.status(201).json(success(note, "Internal note added"));
}
