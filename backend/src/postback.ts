/**
 * Универсальный приём postback от CPA-сетей и прямых программ.
 * Формат у каждой сети свой, поэтому здесь НЕТ готовых шаблонов под конкретные сети:
 * владелец вносит параметры из официальной документации в networks.postback_map.
 * Пока postback_enabled = 0 или маппинг пуст — приём закрыт (404).
 *
 * postback_map (JSON):
 * {
 *   "click_id":    "имя параметра с нашим click_id",
 *   "external_id": "имя параметра с id конверсии у сети",
 *   "status":      "имя параметра со статусом",
 *   "amount":      "имя параметра с суммой (необязательно)",
 *   "statusMap":   { "значение у сети": "pending|approved|rejected|paid" }
 * }
 * Запрос подтверждается секретом (?secret=… или заголовок x-postback-secret).
 */
import { timingSafeEqual } from "node:crypto";
import type { Db } from "./db";

export type PostbackMap = { click_id: string; external_id: string; status: string; amount?: string; statusMap: Record<string, string> };
const STATUSES = new Set(["pending", "approved", "rejected", "paid"]);

export function parseMap(raw: string | null): PostbackMap | null {
  if (!raw) return null;
  try {
    const m = JSON.parse(raw) as PostbackMap;
    if (!m.click_id || !m.external_id || !m.status || !m.statusMap || typeof m.statusMap !== "object") return null;
    if (!Object.values(m.statusMap).every((v) => STATUSES.has(v))) return null;
    return m;
  } catch { return null; }
}

function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

type NetRow = { id: string; postback_enabled: number; postback_secret: string | null; postback_map: string | null };

export function handlePostback(db: Db, networkId: string, params: Record<string, string>, headerSecret = ""): { status: number; body: string } {
  const n = db.prepare("SELECT id, postback_enabled, postback_secret, postback_map FROM networks WHERE id = ?").get(networkId) as NetRow | undefined;
  const map = n ? parseMap(n.postback_map) : null;
  if (!n || !n.postback_enabled || !n.postback_secret || !map) return { status: 404, body: "not found" };
  const given = headerSecret || params.secret || "";
  if (!sameSecret(given, n.postback_secret)) return { status: 403, body: "forbidden" };

  const clickId = params[map.click_id], externalId = params[map.external_id], rawStatus = params[map.status];
  if (!clickId || !externalId || !rawStatus) return { status: 400, body: "missing fields" };
  const status = map.statusMap[rawStatus];
  if (!status) return { status: 400, body: "unknown status" };
  const click = db.prepare("SELECT offer_id FROM clicks WHERE click_id = ?").get(clickId) as { offer_id: string } | undefined;
  if (!click) return { status: 404, body: "unknown click" };
  const amount = map.amount && params[map.amount] != null ? Number(String(params[map.amount]).replace(",", ".")) : null;
  if (amount != null && !Number.isFinite(amount)) return { status: 400, body: "bad amount" };

  // Повтор того же postback обновляет конверсию; оплаченную не понижаем.
  db.prepare(
    `INSERT INTO conversions (click_id, offer_id, network_id, external_id, status, amount) VALUES (?,?,?,?,?,?)
     ON CONFLICT (network_id, external_id) DO UPDATE SET
       status = CASE WHEN conversions.status = 'paid' THEN 'paid' ELSE excluded.status END,
       amount = COALESCE(excluded.amount, conversions.amount)`,
  ).run(clickId, click.offer_id, networkId, externalId, status, amount);
  return { status: 200, body: "OK" };
}
