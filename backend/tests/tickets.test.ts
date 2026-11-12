import { Role } from "@prisma/client";
import { beforeAll, describe, expect, it } from "vitest";
import { api, categoryId, createUser, NETWORK_UNIT, openPrinterTicket, PRINTER_CATEGORY, PRINTER_UNIT, prisma, resetDatabase, supportUnitId } from "./helpers.js";

type TestUser = Awaited<ReturnType<typeof createUser>>;

let employee: TestUser;
let otherEmployee: TestUser;
let printerStaff: TestUser;
let printerStaff2: TestUser;
let networkStaff: TestUser;
let admin: TestUser;

beforeAll(async () => {
  await resetDatabase();
  employee = await createUser(Role.EMPLOYEE, { department: "Mali Hizmetler", name: "Ayşe Yılmaz" });
  otherEmployee = await createUser(Role.EMPLOYEE, { department: "Zabıta" });
  printerStaff = await createUser(Role.IT_STAFF, { supportUnit: PRINTER_UNIT });
  printerStaff2 = await createUser(Role.IT_STAFF, { supportUnit: PRINTER_UNIT });
  networkStaff = await createUser(Role.IT_STAFF, { supportUnit: NETWORK_UNIT });
  admin = await createUser(Role.ADMIN);
});

describe("creating tickets", () => {
  it("creates a ticket with a number, AI analysis and the employee's category", async () => {
    const ticket = await openPrinterTicket(employee.auth);
    expect(ticket.ticketNumber).toMatch(/^HF-\d{6}$/);
    expect(ticket.status).toBe("OPEN");

    const detail = await api().get(`/api/tickets/${ticket.id}`).set(employee.auth);
    expect(detail.status).toBe(200);
    expect(detail.body.data.category.name).toBe(PRINTER_CATEGORY);
    expect(detail.body.data.supportUnit.name).toBe(PRINTER_UNIT);
    expect(detail.body.data.aiAnalysis.suggestedCategory).toBe(PRINTER_CATEGORY);
    expect(detail.body.data.aiAnalysis.rawResponse.source).toBe("rules");
    expect(detail.body.data.statusHistory).toHaveLength(1);
  });

  it("keeps the category the employee chose when the AI is not confident", async () => {
    // The text points at the printer team, the employee picked "Diğer".
    const ticket = await openPrinterTicket(employee.auth, { categoryId: await categoryId("Diğer") });
    const detail = await api().get(`/api/tickets/${ticket.id}`).set(employee.auth);
    expect(detail.body.data.category.name).toBe("Diğer");
    expect(detail.body.data.aiAnalysis.suggestedCategory).toBe(PRINTER_CATEGORY);
    expect(detail.body.data.aiAnalysis.rawResponse.rerouted).toBe(false);
  });

  it("gives concurrent tickets unique numbers", async () => {
    const created = await Promise.all(Array.from({ length: 6 }, () => openPrinterTicket(employee.auth)));
    expect(new Set(created.map((ticket) => ticket.ticketNumber)).size).toBe(6);
  });

  it("keeps numbering unique after a ticket is deleted", async () => {
    const first = await openPrinterTicket(employee.auth);
    const second = await openPrinterTicket(employee.auth);
    expect((await api().delete(`/api/tickets/${first.id}`).set(admin.auth)).status).toBe(200);
    const third = await openPrinterTicket(employee.auth);
    expect(third.ticketNumber).not.toBe(second.ticketNumber);
  });

  it("validates input", async () => {
    const res = await api().post("/api/tickets").set(employee.auth).send({ title: "x", description: "kısa", categoryId: "" });
    expect(res.status).toBe(422);
    const missing = await api().post("/api/tickets").set(employee.auth).send({ title: "Geçerli başlık", description: "Yeterince uzun bir açıklama.", categoryId: "does-not-exist" });
    expect(missing.status).toBe(404);
  });
});

describe("visibility", () => {
  it("hides tickets from other employees and other support teams", async () => {
    const ticket = await openPrinterTicket(employee.auth);

    expect((await api().get(`/api/tickets/${ticket.id}`).set(otherEmployee.auth)).status).toBe(404);
    expect((await api().get(`/api/tickets/${ticket.id}`).set(networkStaff.auth)).status).toBe(404);
    expect((await api().get(`/api/tickets/${ticket.id}`).set(printerStaff.auth)).status).toBe(200);
    expect((await api().get(`/api/tickets/${ticket.id}`).set(admin.auth)).status).toBe(200);

    const otherList = await api().get("/api/tickets").set(otherEmployee.auth);
    expect(otherList.body.data).toHaveLength(0);
    const networkList = await api().get("/api/tickets").set(networkStaff.auth);
    expect(networkList.body.data).toHaveLength(0);
  });

  it("keeps internal notes away from employees", async () => {
    const ticket = await openPrinterTicket(employee.auth);
    const note = await api().post(`/api/tickets/${ticket.id}/internal-notes`).set(printerStaff.auth).send({ note: "Toner siparişi verildi." });
    expect(note.status).toBe(201);

    const asEmployee = await api().get(`/api/tickets/${ticket.id}`).set(employee.auth);
    expect(asEmployee.body.data.internalNotes).toBeUndefined();
    expect((await api().get(`/api/tickets/${ticket.id}/internal-notes`).set(employee.auth)).status).toBe(403);
    expect((await api().post(`/api/tickets/${ticket.id}/internal-notes`).set(employee.auth).send({ note: "x" })).status).toBe(403);

    const asStaff = await api().get(`/api/tickets/${ticket.id}`).set(printerStaff.auth);
    expect(asStaff.body.data.internalNotes).toHaveLength(1);
  });
});

describe("staff workflow", () => {
  it("assigning to yourself starts work and records history", async () => {
    const ticket = await openPrinterTicket(employee.auth);
    const res = await api().patch(`/api/tickets/${ticket.id}/assign`).set(printerStaff.auth).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("IN_PROGRESS");
    expect(res.body.data.assignedTo.id).toBe(printerStaff.user.id);

    const detail = await api().get(`/api/tickets/${ticket.id}`).set(printerStaff.auth);
    expect(detail.body.data.statusHistory.map((item: { newStatus: string }) => item.newStatus)).toEqual(["IN_PROGRESS", "OPEN"]);
    expect(detail.body.data.assignmentHistory[0].toAssignedToName).toBe(printerStaff.user.name);
  });

  it("lists teammates and only lets tickets be assigned inside the team", async () => {
    const ticket = await openPrinterTicket(employee.auth);
    const assignees = await api().get(`/api/tickets/${ticket.id}/assignees`).set(printerStaff.auth);
    expect(assignees.body.data.map((item: { id: string }) => item.id).sort()).toEqual([printerStaff.user.id, printerStaff2.user.id].sort());

    const teammate = await api().patch(`/api/tickets/${ticket.id}/assign`).set(printerStaff.auth).send({ assignedToId: printerStaff2.user.id });
    expect(teammate.status).toBe(200);
    expect(teammate.body.data.assignedTo.id).toBe(printerStaff2.user.id);

    const outsider = await api().patch(`/api/tickets/${ticket.id}/assign`).set(admin.auth).send({ assignedToId: networkStaff.user.id });
    expect(outsider.status).toBe(422);
    const toEmployee = await api().patch(`/api/tickets/${ticket.id}/assign`).set(admin.auth).send({ assignedToId: employee.user.id });
    expect(toEmployee.status).toBe(422);

    const unassign = await api().patch(`/api/tickets/${ticket.id}/assign`).set(printerStaff.auth).send({ assignedToId: null });
    expect(unassign.body.data.assignedTo).toBeNull();
  });

  it("transfers a ticket to another team, unassigned and back in the queue", async () => {
    const ticket = await openPrinterTicket(employee.auth);
    await api().patch(`/api/tickets/${ticket.id}/assign`).set(printerStaff.auth).send({});

    const res = await api().patch(`/api/tickets/${ticket.id}/transfer`).set(printerStaff.auth).send({ supportUnitId: await supportUnitId(NETWORK_UNIT), reason: "Sorun ağ kaynaklı" });
    expect(res.status).toBe(200);
    expect(res.body.data.supportUnit.name).toBe(NETWORK_UNIT);
    expect(res.body.data.assignedTo).toBeNull();
    expect(res.body.data.status).toBe("OPEN");

    // The old team no longer sees it, the new team does.
    expect((await api().get(`/api/tickets/${ticket.id}`).set(printerStaff.auth)).status).toBe(404);
    const detail = await api().get(`/api/tickets/${ticket.id}`).set(networkStaff.auth);
    expect(detail.status).toBe(200);
    expect(detail.body.data.assignmentHistory[0].reason).toBe("Sorun ağ kaynaklı");

    const same = await api().patch(`/api/tickets/${ticket.id}/transfer`).set(networkStaff.auth).send({ supportUnitId: await supportUnitId(NETWORK_UNIT) });
    expect(same.status).toBe(422);
  });

  it("re-routes the ticket when staff change its category", async () => {
    const ticket = await openPrinterTicket(employee.auth);
    const res = await api().patch(`/api/tickets/${ticket.id}/category`).set(printerStaff.auth).send({ categoryId: await categoryId("Wi-Fi Sorunu") });
    expect(res.status).toBe(200);
    expect(res.body.data.supportUnit.name).toBe(NETWORK_UNIT);
  });

  it("blocks employees from staff-only actions", async () => {
    const ticket = await openPrinterTicket(employee.auth);
    for (const [method, path, body] of [
      ["patch", "assign", {}],
      ["patch", "status", { status: "RESOLVED" }],
      ["patch", "priority", { priority: "URGENT" }],
      ["patch", "transfer", { supportUnitId: "x" }],
      ["post", "resolve", {}]
    ] as const) {
      const res = await api()[method](`/api/tickets/${ticket.id}/${path}`).set(employee.auth).send(body);
      expect(res.status, `${method} ${path}`).toBe(403);
    }
    expect((await api().delete(`/api/tickets/${ticket.id}`).set(printerStaff.auth)).status).toBe(403);
  });

  it("does not let PATCH smuggle in status, priority or assignee", async () => {
    const ticket = await openPrinterTicket(employee.auth);
    const res = await api().patch(`/api/tickets/${ticket.id}`).set(employee.auth).send({ title: "Yeni başlık burada", status: "CLOSED", priority: "URGENT", assignedToId: employee.user.id });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ title: "Yeni başlık burada", status: "OPEN", priority: ticket.priority, assignedTo: null });
  });
});

describe("lifecycle", () => {
  it("runs resolve -> close by requester -> reopen, with timestamps", async () => {
    const ticket = await openPrinterTicket(employee.auth);

    const early = await api().post(`/api/tickets/${ticket.id}/close`).set(employee.auth);
    expect(early.status).toBe(422);

    await api().patch(`/api/tickets/${ticket.id}/assign`).set(printerStaff.auth).send({});
    const resolved = await api().post(`/api/tickets/${ticket.id}/resolve`).set(printerStaff.auth);
    expect(resolved.body.data.status).toBe("RESOLVED");
    expect(resolved.body.data.resolvedAt).toBeTruthy();

    const locked = await api().patch(`/api/tickets/${ticket.id}`).set(employee.auth).send({ title: "Artık değişmemeli" });
    expect(locked.status).toBe(422);

    const closed = await api().post(`/api/tickets/${ticket.id}/close`).set(employee.auth);
    expect(closed.body.data.status).toBe("CLOSED");
    expect(closed.body.data.closedAt).toBeTruthy();

    const message = await api().post(`/api/tickets/${ticket.id}/messages`).set(employee.auth).send({ message: "Kapalı talebe mesaj" });
    expect(message.status).toBe(422);

    const reopened = await api().post(`/api/tickets/${ticket.id}/reopen`).set(employee.auth);
    expect(reopened.body.data.status).toBe("IN_PROGRESS");
    expect(reopened.body.data.resolvedAt).toBeNull();
    expect(reopened.body.data.closedAt).toBeNull();

    expect((await api().post(`/api/tickets/${ticket.id}/reopen`).set(employee.auth)).status).toBe(422);
  });

  it("lets the requester cancel an open ticket but not reopen it", async () => {
    const ticket = await openPrinterTicket(employee.auth);
    const cancelled = await api().post(`/api/tickets/${ticket.id}/cancel`).set(employee.auth);
    expect(cancelled.body.data.status).toBe("CANCELLED");
    expect((await api().post(`/api/tickets/${ticket.id}/cancel`).set(employee.auth)).status).toBe(422);
    expect((await api().post(`/api/tickets/${ticket.id}/reopen`).set(employee.auth)).status).toBe(422);
    expect((await api().post(`/api/tickets/${ticket.id}/reopen`).set(printerStaff.auth)).body.data.status).toBe("OPEN");
  });

  it("hands a waiting ticket back to IT when the requester replies", async () => {
    const ticket = await openPrinterTicket(employee.auth);
    await api().patch(`/api/tickets/${ticket.id}/assign`).set(printerStaff.auth).send({});
    await api().patch(`/api/tickets/${ticket.id}/status`).set(printerStaff.auth).send({ status: "WAITING_USER" });

    const staffMessage = await api().post(`/api/tickets/${ticket.id}/messages`).set(printerStaff.auth).send({ message: "Hata kodunu paylaşır mısınız?" });
    expect(staffMessage.status).toBe(201);
    expect((await api().get(`/api/tickets/${ticket.id}`).set(employee.auth)).body.data.status).toBe("WAITING_USER");

    await api().post(`/api/tickets/${ticket.id}/messages`).set(employee.auth).send({ message: "E-502 yazıyor." });
    const detail = await api().get(`/api/tickets/${ticket.id}`).set(employee.auth);
    expect(detail.body.data.status).toBe("IN_PROGRESS");
    expect(detail.body.data.messages).toHaveLength(2);
  });

  it("does not add history when the status does not change", async () => {
    const ticket = await openPrinterTicket(employee.auth);
    await api().patch(`/api/tickets/${ticket.id}/status`).set(printerStaff.auth).send({ status: "OPEN" });
    expect(await prisma.ticketStatusHistory.count({ where: { ticketId: ticket.id } })).toBe(1);
  });
});

describe("satisfaction rating", () => {
  it("accepts one rating from the requester once the ticket is resolved", async () => {
    const ticket = await openPrinterTicket(employee.auth);
    expect((await api().post(`/api/tickets/${ticket.id}/rating`).set(employee.auth).send({ score: 5 })).status).toBe(422);

    await api().post(`/api/tickets/${ticket.id}/resolve`).set(printerStaff.auth);
    expect((await api().post(`/api/tickets/${ticket.id}/rating`).set(employee.auth).send({ score: 9 })).status).toBe(422);
    expect((await api().post(`/api/tickets/${ticket.id}/rating`).set(printerStaff.auth).send({ score: 5 })).status).toBe(403);
    expect((await api().post(`/api/tickets/${ticket.id}/rating`).set(otherEmployee.auth).send({ score: 5 })).status).toBe(404);

    const first = await api().post(`/api/tickets/${ticket.id}/rating`).set(employee.auth).send({ score: 4, comment: "Hızlıydı" });
    expect(first.status).toBe(200);
    const second = await api().post(`/api/tickets/${ticket.id}/rating`).set(employee.auth).send({ score: 2 });
    expect(second.status).toBe(200);

    expect(await prisma.satisfactionRating.count({ where: { ticketId: ticket.id } })).toBe(1);
    const detail = await api().get(`/api/tickets/${ticket.id}`).set(employee.auth);
    expect(detail.body.data.satisfactionRating).toMatchObject({ score: 2, comment: null });
  });
});
