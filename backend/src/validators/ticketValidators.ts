import { TicketPriority, TicketStatus } from "@prisma/client";
import { z } from "zod";

const title = z.string().trim().min(3, "Başlık en az 3 karakter olmalı").max(160, "Başlık en fazla 160 karakter olabilir");
const description = z.string().trim().min(10, "Açıklama en az 10 karakter olmalı").max(5000, "Açıklama en fazla 5000 karakter olabilir");
const location = z.string().trim().max(160).nullable().optional();

export const createTicketSchema = z.object({
  title,
  description,
  categoryId: z.string().min(1, "Kategori seçin"),
  location
});

export const updateTicketSchema = z.object({
  title: title.optional(),
  description: description.optional(),
  categoryId: z.string().min(1).optional(),
  location
});

export const analyzePreviewSchema = z.object({ title, description });
export const categorySchema = z.object({ categoryId: z.string().min(1) });
export const statusSchema = z.object({ status: z.nativeEnum(TicketStatus) });
export const prioritySchema = z.object({ priority: z.nativeEnum(TicketPriority) });
export const assignSchema = z.object({ assignedToId: z.string().min(1).nullable().optional() });
export const transferSchema = z.object({ supportUnitId: z.string().min(1), reason: z.string().trim().max(500).optional() });
export const messageSchema = z.object({ message: z.string().trim().min(1, "Mesaj boş olamaz").max(4000) });
export const noteSchema = z.object({ note: z.string().trim().min(1, "Not boş olamaz").max(4000) });
export const ratingSchema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).nullable().optional()
});
export const attachmentSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120),
  dataBase64: z.string().min(1)
});
