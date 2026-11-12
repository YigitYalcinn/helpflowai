import { Role } from "@prisma/client";
import { beforeAll, describe, expect, it } from "vitest";
import { api, createUser, openPrinterTicket, PRINTER_UNIT, resetDatabase } from "./helpers.js";

type TestUser = Awaited<ReturnType<typeof createUser>>;

let employee: TestUser;
let otherEmployee: TestUser;
let staff: TestUser;

// 1x1 transparent PNG
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

beforeAll(async () => {
  await resetDatabase();
  employee = await createUser(Role.EMPLOYEE);
  otherEmployee = await createUser(Role.EMPLOYEE);
  staff = await createUser(Role.IT_STAFF, { supportUnit: PRINTER_UNIT });
});

describe("attachments", () => {
  it("uploads, lists, downloads and deletes a file", async () => {
    const ticket = await openPrinterTicket(employee.auth);
    const upload = await api().post(`/api/tickets/${ticket.id}/attachments`).set(employee.auth).send({ fileName: "../../hata ekranı.png", mimeType: "image/png", dataBase64: PNG });
    expect(upload.status).toBe(201);
    expect(upload.body.data).toMatchObject({ fileName: "hata ekranı.png", mimeType: "image/png", size: Buffer.from(PNG, "base64").length });
    expect(upload.body.data.data).toBeUndefined();

    const detail = await api().get(`/api/tickets/${ticket.id}`).set(staff.auth);
    expect(detail.body.data.attachments).toHaveLength(1);
    expect(detail.body.data.attachments[0].data).toBeUndefined();

    const download = await api().get(`/api/tickets/${ticket.id}/attachments/${upload.body.data.id}`).set(staff.auth).buffer(true).parse((res, done) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => done(null, Buffer.concat(chunks)));
    });
    expect(download.status).toBe(200);
    expect(download.headers["content-type"]).toBe("image/png");
    expect(download.headers["content-disposition"]).toContain("attachment");
    expect((download.body as Buffer).toString("base64")).toBe(PNG);

    expect((await api().get(`/api/tickets/${ticket.id}/attachments/${upload.body.data.id}`).set(otherEmployee.auth)).status).toBe(404);
    expect((await api().delete(`/api/tickets/${ticket.id}/attachments/${upload.body.data.id}`).set(employee.auth)).status).toBe(200);
    expect((await api().get(`/api/tickets/${ticket.id}/attachments/${upload.body.data.id}`).set(employee.auth)).status).toBe(404);
  });

  it("rejects unsupported types, oversized files and strangers", async () => {
    const ticket = await openPrinterTicket(employee.auth);
    const exe = await api().post(`/api/tickets/${ticket.id}/attachments`).set(employee.auth).send({ fileName: "virus.exe", mimeType: "application/x-msdownload", dataBase64: PNG });
    expect(exe.status).toBe(415);

    const big = Buffer.alloc(3 * 1024 * 1024 + 1, 1).toString("base64");
    const tooBig = await api().post(`/api/tickets/${ticket.id}/attachments`).set(employee.auth).send({ fileName: "big.png", mimeType: "image/png", dataBase64: big });
    expect(tooBig.status).toBe(413);

    const stranger = await api().post(`/api/tickets/${ticket.id}/attachments`).set(otherEmployee.auth).send({ fileName: "a.png", mimeType: "image/png", dataBase64: PNG });
    expect(stranger.status).toBe(404);
  });

  it("limits the number of files per ticket and protects other people's uploads", async () => {
    const ticket = await openPrinterTicket(employee.auth);
    const staffUpload = await api().post(`/api/tickets/${ticket.id}/attachments`).set(staff.auth).send({ fileName: "rapor.png", mimeType: "image/png", dataBase64: PNG });
    expect(staffUpload.status).toBe(201);
    expect((await api().delete(`/api/tickets/${ticket.id}/attachments/${staffUpload.body.data.id}`).set(employee.auth)).status).toBe(403);

    for (let index = 0; index < 4; index += 1) {
      const res = await api().post(`/api/tickets/${ticket.id}/attachments`).set(employee.auth).send({ fileName: `f${index}.png`, mimeType: "image/png", dataBase64: PNG });
      expect(res.status).toBe(201);
    }
    const sixth = await api().post(`/api/tickets/${ticket.id}/attachments`).set(employee.auth).send({ fileName: "f6.png", mimeType: "image/png", dataBase64: PNG });
    expect(sixth.status).toBe(422);
  });
});
