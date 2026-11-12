import { Role } from "@prisma/client";
import { beforeAll, describe, expect, it } from "vitest";
import { api, categoryId, createUser, openPrinterTicket, PRINTER_CATEGORY, PRINTER_UNIT, resetDatabase, supportUnitId } from "./helpers.js";

type TestUser = Awaited<ReturnType<typeof createUser>>;

let admin: TestUser;
let employee: TestUser;
let staff: TestUser;

beforeAll(async () => {
  await resetDatabase();
  admin = await createUser(Role.ADMIN);
  employee = await createUser(Role.EMPLOYEE, { department: "Mali Hizmetler" });
  staff = await createUser(Role.IT_STAFF, { supportUnit: PRINTER_UNIT });
});

describe("user management", () => {
  it("is admin only", async () => {
    expect((await api().get("/api/users").set(employee.auth)).status).toBe(403);
    expect((await api().get("/api/users").set(staff.auth)).status).toBe(403);
    expect((await api().post("/api/departments").set(staff.auth).send({ name: "Yeni birim" })).status).toBe(403);
  });

  it("creates IT staff with a support unit and lets them log in", async () => {
    const missingUnit = await api().post("/api/users").set(admin.auth).send({ name: "Yeni Personel", email: "yeni@test.local", password: "Password123!", role: "IT_STAFF" });
    expect(missingUnit.status).toBe(422);

    const created = await api().post("/api/users").set(admin.auth).send({ name: "Yeni Personel", email: "Yeni@test.local", password: "Password123!", role: "IT_STAFF", supportUnitId: await supportUnitId(PRINTER_UNIT) });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ email: "yeni@test.local", role: "IT_STAFF" });
    expect(created.body.data.passwordHash).toBeUndefined();

    const login = await api().post("/api/auth/login").send({ email: "yeni@test.local", password: "Password123!" });
    expect(login.status).toBe(200);

    const duplicate = await api().post("/api/users").set(admin.auth).send({ name: "Kopya", email: "yeni@test.local", password: "Password123!", role: "EMPLOYEE" });
    expect(duplicate.status).toBe(409);
  });

  it("protects the admin's own account and users with ticket history", async () => {
    expect((await api().delete(`/api/users/${admin.user.id}`).set(admin.auth)).status).toBe(422);
    expect((await api().patch(`/api/users/${admin.user.id}`).set(admin.auth).send({ role: "EMPLOYEE" })).status).toBe(422);

    await openPrinterTicket(employee.auth);
    expect((await api().delete(`/api/users/${employee.user.id}`).set(admin.auth)).status).toBe(409);
  });
});

describe("resources", () => {
  it("creates, updates and deletes a department", async () => {
    const created = await api().post("/api/departments").set(admin.auth).send({ name: "Park ve Bahçeler", description: "Test" });
    expect(created.status).toBe(201);
    const updated = await api().patch(`/api/departments/${created.body.data.id}`).set(admin.auth).send({ name: "Park ve Bahçeler Müdürlüğü" });
    expect(updated.body.data.name).toBe("Park ve Bahçeler Müdürlüğü");
    expect((await api().delete(`/api/departments/${created.body.data.id}`).set(admin.auth)).status).toBe(200);
    expect((await api().delete(`/api/departments/${created.body.data.id}`).set(admin.auth)).status).toBe(404);
  });

  it("refuses duplicates and deleting records that are in use", async () => {
    expect((await api().post("/api/departments").set(admin.auth).send({ name: "Mali Hizmetler" })).status).toBe(409);
    expect((await api().delete(`/api/categories/${await categoryId(PRINTER_CATEGORY)}`).set(admin.auth)).status).toBe(409);
  });

  it("rejects tickets for inactive categories", async () => {
    const id = await categoryId("Sunucu / Sistem");
    await api().patch(`/api/categories/${id}`).set(admin.auth).send({ isActive: false });
    const res = await api().post("/api/tickets").set(employee.auth).send({ title: "Sunucu sorunu", description: "Sunucuya erişilemiyor, lütfen bakın.", categoryId: id });
    expect(res.status).toBe(404);
  });
});

describe("dashboard, reports and AI helpers", () => {
  it("returns role-scoped dashboard numbers", async () => {
    const ticket = await openPrinterTicket(employee.auth);
    await api().post(`/api/tickets/${ticket.id}/resolve`).set(staff.auth);
    await api().post(`/api/tickets/${ticket.id}/rating`).set(employee.auth).send({ score: 4 });

    const res = await api().get("/api/dashboard").set(employee.auth);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.resolved).toBe(1);
    expect(res.body.data.open).toBe(1);
    expect(res.body.data.satisfaction).toEqual({ average: 4, count: 1 });
    expect(res.body.data.trend).toHaveLength(14);
    expect(res.body.data.trend.at(-1)).toMatchObject({ created: 2, resolved: 1 });
    expect(res.body.data.recent.length).toBe(2);

    const stranger = await createUser(Role.EMPLOYEE);
    expect((await api().get("/api/dashboard").set(stranger.auth)).body.data.total).toBe(0);
  });

  it("builds the report overview for staff and hides it from employees", async () => {
    expect((await api().get("/api/reports/overview").set(employee.auth)).status).toBe(403);
    const res = await api().get("/api/reports/overview?days=30").set(admin.auth);
    expect(res.status).toBe(200);
    expect(res.body.data.kpis.total).toBe(2);
    expect(res.body.data.kpis.aiAccuracy).toBe(100);
    expect(res.body.data.byCategory[0]).toEqual({ label: PRINTER_CATEGORY, count: 2 });
    expect(res.body.data.byDepartment[0]).toEqual({ label: "Mali Hizmetler", count: 2 });
    expect(res.body.data.trend).toHaveLength(30);

    const legacy = await api().get("/api/reports/tickets-by-priority").set(admin.auth);
    expect(legacy.body.data).toHaveLength(4);
  });

  it("previews an analysis and drafts replies without an API key", async () => {
    const preview = await api().post("/api/ai/analyze-ticket").set(employee.auth).send({ title: "Wi-Fi kopuyor", description: "Kablosuz ağ sürekli kopuyor, bağlanamıyorum." });
    expect(preview.status).toBe(200);
    expect(preview.body.data).toMatchObject({ category: "Wi-Fi Sorunu", source: "rules" });
    expect((await api().post("/api/ai/analyze-ticket").set(employee.auth).send({ title: "", description: "" })).status).toBe(422);

    const ticket = await openPrinterTicket(employee.auth);
    expect((await api().post(`/api/ai/tickets/${ticket.id}/suggest-reply`).set(employee.auth)).status).toBe(403);

    const reply = await api().post(`/api/ai/tickets/${ticket.id}/suggest-reply`).set(staff.auth);
    expect(reply.status).toBe(200);
    expect(reply.body.data.source).toBe("rules");
    expect(reply.body.data.reply).toContain(ticket.ticketNumber);

    const summary = await api().post(`/api/ai/tickets/${ticket.id}/summary`).set(staff.auth);
    expect(summary.body.data.summary).toContain("Sorun:");
    const closing = await api().post(`/api/ai/tickets/${ticket.id}/closing-summary`).set(staff.auth);
    expect(closing.body.data.summary).toContain(ticket.ticketNumber);

    const reanalyzed = await api().post(`/api/ai/tickets/${ticket.id}/reanalyze`).set(staff.auth);
    expect(reanalyzed.status).toBe(200);
    expect(reanalyzed.body.data.aiAnalysis.rawResponse.reanalyzedAt).toBeTruthy();

    const status = await api().get("/api/ai/status").set(employee.auth);
    expect(status.body.data.provider).toBe("rules");
  });
});
