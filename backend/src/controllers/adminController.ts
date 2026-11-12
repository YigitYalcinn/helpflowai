import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { success } from "../utils/apiResponse.js";
import { categorySchema, createUserSchema, nameDescriptionSchema, updateUserSchema } from "../validators/adminValidators.js";
import { routeParam } from "../utils/request.js";
import { AppError } from "../utils/errors.js";

export type ResourceType = "department" | "supportUnit" | "category";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  departmentId: true,
  supportUnitId: true,
  department: true,
  supportUnit: true,
  createdAt: true
} satisfies Prisma.UserSelect;

function delegate(type: ResourceType) {
  // The three resources share the same CRUD shape; Prisma's delegates do not
  // share a common type, hence the cast.
  return prisma[type] as any;
}

function resourceType(req: Request) {
  return req.params.resource as ResourceType;
}

export async function users(_req: Request, res: Response) {
  res.json(success(await prisma.user.findMany({ select: userSelect, orderBy: { createdAt: "desc" } })));
}

export async function createUser(req: Request, res: Response) {
  const input = createUserSchema.parse(req.body);
  if (input.role === Role.IT_STAFF && !input.supportUnitId) throw new AppError("BT personeli için destek ekibi seçilmelidir", 422);

  const existing = await prisma.user.findFirst({ where: { email: { equals: input.email, mode: "insensitive" } } });
  if (existing) throw new AppError("Bu e-posta adresi zaten kayıtlı", 409);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, 10),
      role: input.role,
      departmentId: input.role === Role.EMPLOYEE ? input.departmentId || null : null,
      supportUnitId: input.role === Role.IT_STAFF ? input.supportUnitId || null : null
    },
    select: userSelect
  });
  res.status(201).json(success(user, "Kullanıcı oluşturuldu"));
}

export async function updateUser(req: Request, res: Response) {
  const id = routeParam(req, "id");
  const input = updateUserSchema.parse(req.body);
  const current = await prisma.user.findUnique({ where: { id } });
  if (!current) throw new AppError("Kullanıcı bulunamadı", 404);

  const role = input.role ?? current.role;
  const supportUnitId = input.supportUnitId === undefined ? current.supportUnitId : input.supportUnitId;
  if (role === Role.IT_STAFF && !supportUnitId) throw new AppError("BT personeli için destek ekibi seçilmelidir", 422);

  if (id === req.user!.id && role !== Role.ADMIN) throw new AppError("Kendi yönetici yetkinizi kaldıramazsınız", 422);

  const data: Prisma.UserUpdateInput = {
    name: input.name,
    email: input.email,
    role: input.role,
    department: input.departmentId === undefined ? undefined : input.departmentId ? { connect: { id: input.departmentId } } : { disconnect: true },
    supportUnit: input.supportUnitId === undefined ? undefined : input.supportUnitId ? { connect: { id: input.supportUnitId } } : { disconnect: true }
  };
  if (input.password) data.passwordHash = await bcrypt.hash(input.password, 10);

  if (role === Role.EMPLOYEE) data.supportUnit = { disconnect: true };
  if (role === Role.IT_STAFF) data.department = { disconnect: true };
  if (role === Role.ADMIN) {
    data.department = { disconnect: true };
    data.supportUnit = { disconnect: true };
  }

  res.json(success(await prisma.user.update({ where: { id }, data, select: userSelect }), "Kullanıcı güncellendi"));
}

export async function deleteUser(req: Request, res: Response) {
  const id = routeParam(req, "id");
  if (id === req.user!.id) throw new AppError("Kendi hesabınızı silemezsiniz", 422);

  const [tickets, messages] = await Promise.all([
    prisma.ticket.count({ where: { OR: [{ createdById: id }, { assignedToId: id }] } }),
    prisma.ticketMessage.count({ where: { senderId: id } })
  ]);
  if (tickets > 0 || messages > 0) {
    throw new AppError("Bu kullanıcının talep geçmişi var; silmek yerine rolünü veya ekibini değiştirin", 409);
  }

  await prisma.user.delete({ where: { id } });
  res.json(success(null, "Kullanıcı silindi"));
}

export async function listResource(req: Request, res: Response) {
  const type = resourceType(req);
  const rows = await delegate(type).findMany({ orderBy: { name: "asc" }, include: type === "category" ? { supportUnit: true } : undefined });
  res.json(success(rows));
}

export async function createResource(req: Request, res: Response) {
  const type = resourceType(req);
  const input = type === "category" ? categorySchema.parse(req.body) : nameDescriptionSchema.parse(req.body);
  const data = type === "department" ? { name: input.name, description: input.description } : input;
  res.status(201).json(success(await delegate(type).create({ data }), "Kayıt oluşturuldu"));
}

export async function updateResource(req: Request, res: Response) {
  const type = resourceType(req);
  const input = type === "category" ? categorySchema.partial().parse(req.body) : nameDescriptionSchema.partial().parse(req.body);
  const data: Record<string, unknown> = { ...input };
  if (type === "department") delete data.isActive;
  res.json(success(await delegate(type).update({ where: { id: routeParam(req, "id") }, data }), "Kayıt güncellendi"));
}

export async function deleteResource(req: Request, res: Response) {
  await delegate(resourceType(req)).delete({ where: { id: routeParam(req, "id") } });
  res.json(success(null, "Kayıt silindi"));
}
