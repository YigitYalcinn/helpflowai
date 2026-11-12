import { Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AuthUser } from "../types.js";
import { AppError } from "../utils/errors.js";
import { attachmentSelect, findAccessibleTicket } from "./ticketService.js";

// Files live in Postgres so the app needs no external object storage. The cap
// keeps base64-encoded uploads under serverless request-body limits (~4.5 MB).
export const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_TICKET = 5;

export const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
];

function sanitizeFileName(name: string) {
  const base = name.split(/[\\/]/).pop() ?? "dosya";
  const clean = base.replace(/[\u0000-\u001f"<>|:*?]/g, "_").trim();
  return (clean || "dosya").slice(0, 120);
}

export async function addAttachment(ticketId: string, user: AuthUser, input: { fileName: string; mimeType: string; dataBase64: string }) {
  const ticket = await findAccessibleTicket(ticketId, user);
  if (ticket.status === "CLOSED" || ticket.status === "CANCELLED") {
    throw new AppError("Kapatılmış veya iptal edilmiş taleplere dosya eklenemez", 422);
  }
  if (!ALLOWED_MIME_TYPES.includes(input.mimeType)) {
    throw new AppError("Bu dosya türü desteklenmiyor (PNG, JPG, WEBP, GIF, PDF, TXT, CSV, DOCX, XLSX)", 415);
  }

  const data = Buffer.from(input.dataBase64, "base64");
  if (data.length === 0) throw new AppError("Dosya boş veya okunamadı", 422);
  if (data.length > MAX_ATTACHMENT_BYTES) throw new AppError("Dosya en fazla 3 MB olabilir", 413);

  const count = await prisma.ticketAttachment.count({ where: { ticketId } });
  if (count >= MAX_ATTACHMENTS_PER_TICKET) throw new AppError(`Bir talebe en fazla ${MAX_ATTACHMENTS_PER_TICKET} dosya eklenebilir`, 422);

  return prisma.ticketAttachment.create({
    data: { ticketId, uploadedById: user.id, fileName: sanitizeFileName(input.fileName), mimeType: input.mimeType, size: data.length, data },
    select: attachmentSelect
  });
}

export async function getAttachmentFile(ticketId: string, attachmentId: string, user: AuthUser) {
  await findAccessibleTicket(ticketId, user);
  const attachment = await prisma.ticketAttachment.findFirst({ where: { id: attachmentId, ticketId } });
  if (!attachment) throw new AppError("Dosya bulunamadı", 404);
  return attachment;
}

export async function deleteAttachment(ticketId: string, attachmentId: string, user: AuthUser) {
  await findAccessibleTicket(ticketId, user);
  const attachment = await prisma.ticketAttachment.findFirst({ where: { id: attachmentId, ticketId }, select: { id: true, uploadedById: true } });
  if (!attachment) throw new AppError("Dosya bulunamadı", 404);
  if (user.role === Role.EMPLOYEE && attachment.uploadedById !== user.id) {
    throw new AppError("Yalnızca kendi yüklediğiniz dosyayı silebilirsiniz", 403);
  }
  await prisma.ticketAttachment.delete({ where: { id: attachmentId } });
}
