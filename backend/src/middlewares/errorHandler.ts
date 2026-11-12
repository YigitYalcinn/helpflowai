import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { failure } from "../utils/apiResponse.js";
import { AppError } from "../utils/errors.js";

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(`Adres bulunamadı: ${req.method} ${req.originalUrl}`, 404));
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    const first = error.issues[0];
    const message = first?.message && first.message !== "Required" ? first.message : "Girilen bilgiler geçersiz";
    return res.status(422).json(failure(message, error.flatten()));
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json(failure(error.message));
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return res.status(409).json(failure("Bu değerle kayıtlı başka bir kayıt var"));
    if (error.code === "P2003") return res.status(409).json(failure("Kayıt başka kayıtlar tarafından kullanıldığı için bu işlem yapılamıyor"));
    if (error.code === "P2025") return res.status(404).json(failure("Kayıt bulunamadı"));
  }

  // Errors raised by express.json(): oversized or malformed request bodies.
  const bodyError = error as { type?: string; status?: number };
  if (bodyError?.type === "entity.too.large") return res.status(413).json(failure("Gönderilen veri çok büyük"));
  if (bodyError?.type === "entity.parse.failed") return res.status(400).json(failure("Geçersiz JSON gövdesi"));

  console.error(error);
  return res.status(500).json(failure("Sunucu hatası oluştu"));
}
