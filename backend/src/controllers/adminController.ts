import { Request, Response } from "express";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { success } from "../utils/apiResponse.js";
import { categorySchema, nameDescriptionSchema, updateUserSchema } from "../validators/adminValidators.js";
import { routeParam } from "../utils/request.js";
import { AppError } from "../utils/errors.js";

function modelName(type: "department" | "supportUnit" | "category") {
  return prisma[type];
}

export async function users(_req: Request, res: Response) {
  const rows = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, departmentId: true, supportUnitId: true, department: true, supportUnit: true, createdAt: true },
    orderBy: { createdAt: "desc" }
  });
  res.json(success(rows));
}

export async function updateUser(req: Request, res: Response) {
  const id = routeParam(req, "id");
  const input = updateUserSchema.parse(req.body);

  if (input.role === Role.IT_STAFF && !input.supportUnitId) {
    throw new AppError("IT staff users must have a support unit", 422);
  }

  const data: Prisma.UserUpdateInput = {
    name: input.name,
    email: input.email,
    role: input.role,
    department: input.departmentId === undefined ? undefined : input.departmentId ? { connect: { id: input.departmentId } } : { disconnect: true },
    supportUnit: input.supportUnitId === undefined ? undefined : input.supportUnitId ? { connect: { id: input.supportUnitId } } : { disconnect: true }
  };

  if (input.role === Role.EMPLOYEE) data.supportUnit = { disconnect: true };
  if (input.role === Role.ADMIN) {
    data.department = { disconnect: true };
    data.supportUnit = { disconnect: true };
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, departmentId: true, supportUnitId: true, department: true, supportUnit: true, createdAt: true }
  });

  res.json(success(user, "User updated"));
}

export async function deleteUser(req: Request, res: Response) {
  const id = routeParam(req, "id");
  if (id === req.user!.id) throw new AppError("You cannot delete your own account", 422);
  await prisma.user.delete({ where: { id } });
  res.json(success(null, "User deleted"));
}

export async function listResource(req: Request, res: Response) {
  const type = req.params.resource as "department" | "supportUnit" | "category";
  const rows = await (modelName(type) as any).findMany({ orderBy: { createdAt: "desc" }, include: type === "category" ? { supportUnit: true } : undefined });
  res.json(success(rows));
}

export async function createResource(req: Request, res: Response) {
  const type = req.params.resource as "department" | "supportUnit" | "category";
  const input = type === "category" ? categorySchema.parse(req.body) : nameDescriptionSchema.parse(req.body);
  const row = await (modelName(type) as any).create({ data: input });
  res.status(201).json(success(row, "Created"));
}

export async function updateResource(req: Request, res: Response) {
  const type = req.params.resource as "department" | "supportUnit" | "category";
  const input = type === "category" ? categorySchema.partial().parse(req.body) : nameDescriptionSchema.partial().parse(req.body);
  const row = await (modelName(type) as any).update({ where: { id: routeParam(req, "id") }, data: input });
  res.json(success(row, "Updated"));
}

export async function deleteResource(req: Request, res: Response) {
  const type = req.params.resource as "department" | "supportUnit" | "category";
  await (modelName(type) as any).delete({ where: { id: routeParam(req, "id") } });
  res.json(success(null, "Deleted"));
}
