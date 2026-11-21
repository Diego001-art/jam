/** JSON-API админки. Вызывается только после проверки сессии (см. server.ts). */
import { randomBytes } from "node:crypto";
import type { Db } from "./db";
import { isHttps } from "./go";
import { parseMap } from "./postback";
import { offerStats, sourceStats } from "./stats";
import { parseCsv, toCsv } from "../../src/lib/csv";

export type ApiResult = { status: number; json: unknown; csv?: { name: string; text: string } };
const ok = (json: unknown = { ok: true }): ApiResult => ({ status: 200, json });
const bad = (error: string, status = 400): ApiResult => ({ status, json: { error } });
const ID = /^[a-z0-9-]{1,80}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: unknown, max = 500) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const num = (v: unknown) => (v == null || v === "" ? null : Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : NaN);

type Body = Record<string, unknown>;
const OFFER_COLS = ["id", "program_id", "tracking_url", "fallback_url", "payout_type", "payout_amount", "payout_conditions", "status"];

export function adminApi(db: Db, method: string, path: string, body: Body, q: URLSearchParams): ApiResult {
  if (method === "GET" && path === "/state") {
    return ok({
      networks: db.prepare("SELECT id,name,kind,website,status,notes,postback_enabled,postback_map, (postback_secret IS NOT NULL) AS has_secret FROM networks ORDER BY name").all(),
      programs: db.prepare("SELECT * FROM programs ORDER BY name").all(),
      offers: db.prepare("SELECT * FROM offers ORDER BY id").all(),
      failedChecks: db.prepare(
        `SELECT c.offer_id, c.target, c.http_status, c.note, c.ts FROM link_checks c
          WHERE c.ok = 0 AND c.id = (SELECT MAX(id) FROM link_checks x WHERE x.offer_id = c.offer_id AND x.target = c.target)
          ORDER BY c.ts DESC`).all(),
    });
  }
  if (method === "GET" && path === "/stats") {
    const from = q.get("from") ?? "0000-01-01", to = q.get("to") ?? "9999-12-31";
    if (!DATE.test(from) || !DATE.test(to)) return bad("даты в формате ГГГГ-ММ-ДД");
    return ok({ offers: offerStats(db, from, to), sources: sourceStats(db, from, to) });
  }
  if (method === "GET" && path.startsWith("/export/")) {
    const kind = path.slice("/export/".length), from = q.get("from") ?? "0000-01-01", to = q.get("to") ?? "9999-12-31";
    if (!DATE.test(from) || !DATE.test(to)) return bad("даты в формате ГГГГ-ММ-ДД");
    const csv = (name: string, header: string[], rows: Record<string, unknown>[]): ApiResult =>
      ({ status: 200, json: null, csv: { name, text: toCsv(header, rows.map((r) => header.map((h) => r[h]))) } });
    if (kind === "stats.csv") {
      const h = ["offer_id", "clicks", "conversions", "pending", "approved", "rejected", "paid", "amount_pending", "amount_approved", "amount_paid", "conversion_rate"];
      return csv("stats.csv", h, offerStats(db, from, to) as unknown as Record<string, unknown>[]);
    }
    if (kind === "clicks.csv") return csv("clicks.csv", ["click_id", "offer_id", "ts", "source_path", "utm_source", "utm_medium", "utm_campaign"],
      db.prepare("SELECT * FROM clicks WHERE date(ts) BETWEEN ? AND ? ORDER BY ts").all(from, to) as Record<string, unknown>[]);
    if (kind === "conversions.csv") return csv("conversions.csv", ["id", "click_id", "offer_id", "network_id", "external_id", "status", "amount", "ts"],
      db.prepare("SELECT * FROM conversions WHERE date(ts) BETWEEN ? AND ? ORDER BY ts").all(from, to) as Record<string, unknown>[]);
    if (kind === "offers.csv") return csv("offers.csv", OFFER_COLS, db.prepare("SELECT * FROM offers ORDER BY id").all() as Record<string, unknown>[]);
    return bad("не найдено", 404);
  }
  if (method === "POST" && path === "/import/offers") {
    // Строки проверяются теми же правилами, что и форма оффера. Любая ошибка — импорт отменяется целиком.
    const { header, rows } = parseCsv(String(body.csv ?? ""));
    if (!header.includes("id") || !header.includes("status")) return bad("нужны колонки id и status");
    const errors: string[] = [];
    db.exec("BEGIN");
    try {
      rows.forEach((r, i) => {
        const res = adminApi(db, "PUT", "/offer", { ...r }, q);
        if (res.status !== 200) errors.push(`строка ${i + 2} (${r.id}): ${(res.json as { error: string }).error}`);
      });
      if (errors.length) { db.exec("ROLLBACK"); return { status: 400, json: { error: "импорт отменён", errors } }; }
      db.exec("COMMIT");
    } catch (e) { db.exec("ROLLBACK"); throw e; }
    return ok({ imported: rows.length });
  }
  if (method === "PUT" && path === "/network") {
    const id = str(body.id, 80), name = str(body.name, 200), kind = body.kind;
    if (!id || !ID.test(id)) return bad("id: латиница, цифры и дефис");
    if (!name) return bad("нужно название");
    if (kind !== "cpa" && kind !== "direct") return bad("тип: cpa или direct");
    const enabled = body.postback_enabled ? 1 : 0;
    const map = str(body.postback_map, 5000);
    if (map && !parseMap(map)) return bad("postback_map: неверный формат (см. backend/src/postback.ts)");
    if (enabled && !map) return bad("нельзя включить postback без маппинга из документации сети");
    if (body.website != null && body.website !== "" && !isHttps(String(body.website))) return bad("сайт сети: нужна ссылка https");
    db.prepare(
      `INSERT INTO networks (id,name,kind,website,status,notes,postback_enabled,postback_map) VALUES (?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, kind=excluded.kind, website=excluded.website, status=excluded.status, notes=excluded.notes,
         postback_enabled=excluded.postback_enabled, postback_map=excluded.postback_map`,
    ).run(id, name, kind, str(body.website), body.status === "disabled" ? "disabled" : "active", str(body.notes, 2000), enabled, map);
    return ok();
  }
  if (method === "POST" && path === "/network-secret") {
    const id = str(body.id, 80);
    const secret = randomBytes(24).toString("hex");
    const r = db.prepare("UPDATE networks SET postback_secret = ? WHERE id = ?").run(secret, id);
    return r.changes ? ok({ secret }) : bad("сеть не найдена", 404);
  }
  if (method === "PUT" && path === "/program") {
    const id = str(body.id, 80), name = str(body.name, 200), net = str(body.network_id, 80);
    if (!id || !ID.test(id) || !name || !net) return bad("нужны id, название и сеть");
    if (!db.prepare("SELECT 1 FROM networks WHERE id = ?").get(net)) return bad("сеть не найдена");
    db.prepare("INSERT INTO programs (id,network_id,name,notes) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET network_id=excluded.network_id, name=excluded.name, notes=excluded.notes")
      .run(id, net, name, str(body.notes, 2000));
    return ok();
  }
  if (method === "PUT" && path === "/offer") {
    const id = str(body.id, 80), program = str(body.program_id, 80), status = body.status;
    if (!id || !ID.test(id)) return bad("id оффера должен совпадать с id в data/offers.json");
    if (status !== "active" && status !== "paused" && status !== "archived") return bad("статус: active, paused или archived");
    const tracking = str(body.tracking_url, 2000), fallback = str(body.fallback_url, 2000);
    if (tracking && !isHttps(tracking)) return bad("партнёрская ссылка: нужна https-ссылка");
    if (fallback && !isHttps(fallback)) return bad("страница банка: нужна https-ссылка");
    if (status === "active" && !tracking) return bad("нельзя включить оффер без партнёрской ссылки");
    if (program && !db.prepare("SELECT 1 FROM programs WHERE id = ?").get(program)) return bad("программа не найдена");
    const payoutType = body.payout_type || null, amount = num(body.payout_amount);
    if (payoutType != null && payoutType !== "cpa" && payoutType !== "revshare") return bad("вознаграждение: cpa или revshare");
    if (Number.isNaN(amount)) return bad("сумма вознаграждения: неотрицательное число");
    db.prepare(
      `INSERT INTO offers (id,program_id,tracking_url,fallback_url,payout_type,payout_amount,payout_conditions,status,updated_at)
       VALUES (?,?,?,?,?,?,?,?,datetime('now'))
       ON CONFLICT(id) DO UPDATE SET program_id=excluded.program_id, tracking_url=excluded.tracking_url, fallback_url=excluded.fallback_url,
         payout_type=excluded.payout_type, payout_amount=excluded.payout_amount, payout_conditions=excluded.payout_conditions,
         status=excluded.status, updated_at=datetime('now')`,
    ).run(id, program, tracking, fallback, payoutType as string | null, amount, str(body.payout_conditions, 2000), status);
    return ok();
  }
  return bad("не найдено", 404);
}
