import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { ensureBootstrapData } from "../src/services/bootstrapService.js";
import { signToken } from "../src/utils/auth.js";

export { prisma };
export const api = () => request(app);

/** Empties every table and restores the default departments, teams and categories. */
export async function resetDatabase() {
  const url = process.env.DATABASE_URL ?? "";
  if (!/test/i.test(url)) {
    throw new Error("Refusing to wipe a database whose URL does not contain 'test'. Set TEST_DATABASE_URL to a dedicated test database.");
  }
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "satisfaction_ratings", "ticket_attachments", "ticket_assignment_history", "ticket_status_history", "ticket_ai_analysis", "ticket_internal_notes", "ticket_messages", "tickets", "users", "categories", "support_units", "departments" RESTART IDENTITY CASCADE'
  );
  await ensureBootstrapData();
}

let counter = 0;
// One cheap hash reused for every test user keeps the suite fast.
const passwordHash = bcrypt.hashSync("Password123!", 4);

export async function createUser(role: Role, options: { supportUnit?: string; department?: string; name?: string } = {}) {
  counter += 1;
  const supportUnit = options.supportUnit ? await prisma.supportUnit.findUniqueOrThrow({ where: { name: options.supportUnit } }) : null;
  const department = options.department ? await prisma.department.findUniqueOrThrow({ where: { name: options.department } }) : null;
  const user = await prisma.user.create({
    data: {
      name: options.name ?? `Test ${role} ${counter}`,
      email: `user${counter}-${Date.now()}@test.local`,
      passwordHash,
      role,
      supportUnitId: supportUnit?.id ?? null,
      departmentId: department?.id ?? null
    }
  });
  const token = signToken({ userId: user.id, role: user.role });
  return { user, token, auth: { Authorization: `Bearer ${token}` } };
}

export async function categoryId(name: string) {
  return (await prisma.category.findUniqueOrThrow({ where: { name } })).id;
}

export async function supportUnitId(name: string) {
  return (await prisma.supportUnit.findUniqueOrThrow({ where: { name } })).id;
}

export const PRINTER_UNIT = "Yazıcı ve Tarayıcı Destek Ekibi";
export const NETWORK_UNIT = "Ağ ve İnternet Destek Ekibi";
export const PRINTER_CATEGORY = "Yazıcı / Tarayıcı";

export async function openPrinterTicket(auth: Record<string, string>, overrides: Record<string, unknown> = {}) {
  const res = await api()
    .post("/api/tickets")
    .set(auth)
    .send({
      title: "Yazıcı çıktı vermiyor",
      description: "Kattaki ortak yazıcı çıktı vermiyor, işler kuyrukta bekliyor.",
      categoryId: await categoryId(PRINTER_CATEGORY),
      location: "2. kat",
      ...overrides
    });
  if (res.status !== 201) throw new Error(`Ticket could not be created: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data as { id: string; ticketNumber: string; status: string; priority: string; supportUnitId: string; categoryId: string };
}
