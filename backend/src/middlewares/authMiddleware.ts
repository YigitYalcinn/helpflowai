import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { failure } from "../utils/apiResponse.js";
import { verifyToken } from "../utils/auth.js";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    return res.status(401).json(failure("Authentication required"));
  }

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, departmentId: true, supportUnitId: true }
    });

    if (!user) {
      return res.status(401).json(failure("Invalid token"));
    }

    req.user = user;
    return next();
  } catch {
    return res.status(401).json(failure("Invalid or expired token"));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json(failure("Forbidden"));
    }
    return next();
  };
}
