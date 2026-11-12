import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { failure } from "../utils/apiResponse.js";
import { JwtPayload, verifyToken } from "../utils/auth.js";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    return res.status(401).json(failure("Oturum açmanız gerekiyor"));
  }

  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json(failure("Oturumun süresi dolmuş, lütfen yeniden giriş yapın"));
  }

  try {
    // The role and team are read from the database on every request, so a
    // role change or deleted account takes effect immediately.
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, departmentId: true, supportUnitId: true }
    });

    if (!user) {
      return res.status(401).json(failure("Oturum geçersiz"));
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json(failure("Bu işlem için yetkiniz yok"));
    }
    return next();
  };
}
