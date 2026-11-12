import { beforeAll, describe, expect, it } from "vitest";
import { api, prisma, resetDatabase } from "./helpers.js";

beforeAll(resetDatabase);

async function departmentId() {
  return (await prisma.department.findFirstOrThrow()).id;
}

describe("auth", () => {
  it("registers an employee and returns a usable token", async () => {
    const res = await api().post("/api/auth/register").send({ name: "Ada Lovelace", email: "Ada@Example.com", password: "Password123!", departmentId: await departmentId() });
    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ email: "ada@example.com", role: "EMPLOYEE" });
    expect(res.body.data.user.passwordHash).toBeUndefined();

    const me = await api().get("/api/auth/me").set("Authorization", `Bearer ${res.body.data.token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe("ada@example.com");
  });

  it("rejects a duplicate e-mail regardless of letter case", async () => {
    const res = await api().post("/api/auth/register").send({ name: "Ada Again", email: "ADA@example.com", password: "Password123!", departmentId: await departmentId() });
    expect(res.status).toBe(409);
  });

  it("answers validation errors with 422 instead of hanging", async () => {
    const res = await api().post("/api/auth/register").send({ name: "A", email: "not-an-email", password: "short" });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it("logs in case-insensitively and rejects a wrong password", async () => {
    const ok = await api().post("/api/auth/login").send({ email: "ADA@EXAMPLE.COM", password: "Password123!" });
    expect(ok.status).toBe(200);
    expect(ok.body.data.token).toBeTruthy();
    expect(ok.body.data.user.passwordHash).toBeUndefined();

    const bad = await api().post("/api/auth/login").send({ email: "ada@example.com", password: "wrong-password" });
    expect(bad.status).toBe(401);
  });

  it("requires a valid token", async () => {
    expect((await api().get("/api/auth/me")).status).toBe(401);
    expect((await api().get("/api/tickets").set("Authorization", "Bearer not-a-token")).status).toBe(401);
  });

  it("does not reveal unknown API routes to anonymous callers and rejects malformed JSON", async () => {
    expect((await api().get("/api/nope")).status).toBe(401);
    const malformed = await api().post("/api/auth/login").set("Content-Type", "application/json").send("{oops");
    expect(malformed.status).toBe(400);
  });
});
