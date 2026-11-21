import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { hashPassword } from "../src/auth";

let server: Server, base: string, cookie = "";
beforeAll(async () => {
  process.env.ADMIN_PASSWORD_HASH = hashPassword("очень-длинный-пароль");
  const { createServer } = await import("../src/server");
  const { openDb } = await import("../src/db");
  server = createServer(openDb(":memory:"));
  await new Promise<void>((r) => server.listen(0, r));
  base = "http://localhost:" + (server.address() as AddressInfo).port;
});
afterAll(() => { server.close(); });
const H = { "content-type": "application/json", "x-requested-with": "admin" };

describe("HTTP админки", () => {
  it("без входа API закрыт", async () => {
    expect((await fetch(base + "/admin/api/state")).status).toBe(401);
  });
  it("изменяющий запрос без служебного заголовка отклоняется (CSRF)", async () => {
    const r = await fetch(base + "/admin/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    expect(r.status).toBe(403);
  });
  it("неверный пароль — 401, верный — cookie HttpOnly SameSite=Strict", async () => {
    expect((await fetch(base + "/admin/api/login", { method: "POST", headers: H, body: JSON.stringify({ password: "нет" }) })).status).toBe(401);
    const r = await fetch(base + "/admin/api/login", { method: "POST", headers: H, body: JSON.stringify({ password: "очень-длинный-пароль" }) });
    expect(r.status).toBe(200);
    const c = r.headers.get("set-cookie")!;
    expect(c).toMatch(/HttpOnly/); expect(c).toMatch(/SameSite=Strict/);
    cookie = c.split(";")[0];
  });
  it("после входа API работает, страница админки закрыта от индексации", async () => {
    const s = await fetch(base + "/admin/api/state", { headers: { cookie } });
    expect(s.status).toBe(200);
    expect(await s.json()).toEqual({ networks: [], programs: [], offers: [] });
    const p = await fetch(base + "/admin/");
    expect(p.headers.get("x-robots-tag")).toMatch(/noindex/);
  });
});
