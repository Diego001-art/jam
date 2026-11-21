import { describe, expect, it } from "vitest";
import { adminApi } from "../src/admin";
import { Sessions, hashPassword, verifyPassword } from "../src/auth";
import { openDb } from "../src/db";
import { handleGo } from "../src/go";
import { handlePostback } from "../src/postback";
import { offerStats } from "../src/stats";

const q = new URLSearchParams();
const put = (db: ReturnType<typeof openDb>, path: string, body: Record<string, unknown>) => adminApi(db, "PUT", path, body, q);
const MAP = JSON.stringify({ click_id: "sub", external_id: "oid", status: "st", statusMap: { ok: "approved" } });

describe("пароль и сессии", () => {
  it("хэш проверяется", () => {
    const h = hashPassword("очень-длинный-пароль");
    expect(verifyPassword("очень-длинный-пароль", h)).toBe(true);
    expect(verifyPassword("другой", h)).toBe(false);
    expect(verifyPassword("x", undefined)).toBe(false);
  });
  it("сессия живёт 12 часов, блокировка после 10 неудач", () => {
    let t = 0; const s = new Sessions(() => t); const h = hashPassword("очень-длинный-пароль");
    const tok = s.login("очень-длинный-пароль", h)!;
    expect(s.valid(tok)).toBe(true);
    t += 13 * 3600_000; expect(s.valid(tok)).toBe(false);
    for (let i = 0; i < 10; i++) s.login("bad", h);
    expect(s.locked()).toBe(true);
    expect(s.login("очень-длинный-пароль", h)).toBeNull();
    t += 11 * 60_000; expect(s.login("очень-длинный-пароль", h)).not.toBeNull();
  });
});

describe("админ-API", () => {
  it("полный цикл: сеть → программа → оффер → клик → postback → статистика; смена ссылки без пересборки", () => {
    const db = openDb(":memory:");
    expect(put(db, "/network", { id: "n1", name: "Сеть", kind: "cpa", postback_map: MAP, postback_enabled: true }).status).toBe(200);
    const sec = adminApi(db, "POST", "/network-secret", { id: "n1" }, q).json as { secret: string };
    expect(put(db, "/program", { id: "p1", name: "Прогр", network_id: "n1" }).status).toBe(200);
    expect(put(db, "/offer", { id: "o1", program_id: "p1", status: "active", tracking_url: "https://a.example/?s={click_id}", payout_type: "cpa", payout_amount: "1200" }).status).toBe(200);
    const r1 = handleGo(db, "o1", { from: "/kredity/" }, { siteUrl: "https://s/" });
    expect(r1.location.startsWith("https://a.example/")).toBe(true);
    // замена ссылки: следующий клик идёт по новой
    put(db, "/offer", { id: "o1", program_id: "p1", status: "active", tracking_url: "https://b.example/?s={click_id}" });
    expect(handleGo(db, "o1", {}, { siteUrl: "https://s/" }).location.startsWith("https://b.example/")).toBe(true);
    expect(handlePostback(db, "n1", { sub: r1.clickId!, oid: "7", st: "ok" }, sec.secret).status).toBe(200);
    const st = offerStats(db, "0000-01-01", "9999-12-31");
    expect(st).toHaveLength(1);
    expect(st[0]).toMatchObject({ offer_id: "o1", clicks: 2, conversions: 1, approved: 1 });
    expect(st[0].conversion_rate).toBe(0.5);
  });
  it("валидация: http-ссылка, активный без ссылки, postback без маппинга", () => {
    const db = openDb(":memory:");
    expect(put(db, "/offer", { id: "o1", status: "active", tracking_url: "http://x.example" }).status).toBe(400);
    expect(put(db, "/offer", { id: "o1", status: "active" }).status).toBe(400);
    expect(put(db, "/offer", { id: "o1", status: "paused", tracking_url: "javascript:alert(1)" }).status).toBe(400);
    expect(put(db, "/network", { id: "n1", name: "С", kind: "cpa", postback_enabled: true }).status).toBe(400);
    expect(put(db, "/network", { id: "n1", name: "С", kind: "cpa", postback_map: "{}" }).status).toBe(400);
  });
  it("статистика без данных пуста, а не выдумана", () => {
    expect(offerStats(openDb(":memory:"), "0000-01-01", "9999-12-31")).toEqual([]);
  });
});
