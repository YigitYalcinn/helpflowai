import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { loginSchema, registerSchema } from "../validators/authValidators.js";
import { AppError } from "../utils/errors.js";
import { signToken } from "../utils/auth.js";
import { success } from "../utils/apiResponse.js";
import { ensureBootstrapData } from "../services/bootstrapService.js";

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  departmentId: true,
  supportUnitId: true,
  department: true,
  supportUnit: true
};

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new AppError("Email already registered", 409);

  await ensureBootstrapData();
  const department = await prisma.department.findFirst({
    where: { OR: [{ id: input.departmentId }, { name: input.departmentId }] }
  });
  if (!department) throw new AppError("Department not found", 404);

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, passwordHash, role: Role.EMPLOYEE, departmentId: department.id },
    select: publicUserSelect
  });
  const token = signToken({ userId: user.id, role: user.role });
  res.status(201).json(success({ user, token }, "Registered"));
}

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email }, include: { department: true, supportUnit: true } });
  if (!user) throw new AppError("Invalid credentials", 401);

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new AppError("Invalid credentials", 401);

  const token = signToken({ userId: user.id, role: user.role });
  const { passwordHash: _passwordHash, ...safeUser } = user;
  res.json(success({ user: safeUser, token }, "Logged in"));
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id }, select: publicUserSelect });
  res.json(success(user));
}

export async function logout(_req: Request, res: Response) {
  res.json(success(null, "Logged out"));
}
