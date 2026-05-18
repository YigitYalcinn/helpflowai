import { TicketPriority, TicketStatus } from "@prisma/client";
import { z } from "zod";

export const createTicketSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  categoryId: z.string().min(1),
  location: z.string().optional()
});

export const updateTicketSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  categoryId: z.string().optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  status: z.nativeEnum(TicketStatus).optional(),
  assignedToId: z.string().nullable().optional(),
  location: z.string().nullable().optional()
});

export const statusSchema = z.object({ status: z.nativeEnum(TicketStatus) });
export const prioritySchema = z.object({ priority: z.nativeEnum(TicketPriority) });
export const assignSchema = z.object({ assignedToId: z.string().optional() });
export const transferSchema = z.object({ supportUnitId: z.string(), reason: z.string().optional() });
export const messageSchema = z.object({ message: z.string().min(1) });
export const noteSchema = z.object({ note: z.string().min(1) });
