/**
 * /go/{offerId}: проверка оффера, запись клика, 302 на партнёрскую ссылку.
 * Нет тупиков: оффер отключён или не найден — на официальную страницу продукта или на главную сайта.
 */
import { randomUUID } from "node:crypto";
import type { Db } from "./db";

export type GoResult = { status: 302; location: string; clickId?: string };

const BOT = /bot|crawl|spider|slurp|preview|monitor|curl|wget|python-requests|headless/i;
const ID = /^[a-z0-9-]{1,80}$/;
const clip = (v: string | null | undefined, n = 100) => (v ? v.slice(0, n) : null);

/** Из параметра from берём только путь внутри сайта, без домена и параметров. */
export function cleanPath(v: string | null | undefined): string | null {
  if (!v || !v.startsWith("/") || v.startsWith("//")) return null;
  return v.split(/[?#]/)[0].slice(0, 200);
}

export function isHttps(u: string | null | undefined): u is string {
  if (!u) return false;
  try { return new URL(u).protocol === "https:"; } catch { return false; }
}

/** Подставляет click_id в шаблон ссылки. Без плейсхолдера ссылка остаётся как есть. */
export function buildTarget(template: string, clickId: string): string {
  return template.replace(/\{click_id\}/g, encodeURIComponent(clickId));
}

type OfferRow = { status: string; tracking_url: string | null; fallback_url: string | null; network_status: string | null };

export function handleGo(
  db: Db,
  offerId: string,
  q: { from?: string | null; utm_source?: string | null; utm_medium?: string | null; utm_campaign?: string | null },
  opts: { siteUrl: string; method?: string; userAgent?: string },
): GoResult {
  const home = opts.siteUrl;
  if (!ID.test(offerId)) return { status: 302, location: home };
  const o = db.prepare(
    `SELECT o.status, o.tracking_url, o.fallback_url, n.status AS network_status
       FROM offers o LEFT JOIN programs p ON p.id = o.program_id LEFT JOIN networks n ON n.id = p.network_id
      WHERE o.id = ?`,
  ).get(offerId) as OfferRow | undefined;
  if (!o) return { status: 302, location: home };
  const fallback = isHttps(o.fallback_url) ? o.fallback_url : home;
  const live = o.status === "active" && o.network_status !== "disabled" && isHttps(o.tracking_url);
  if (!live) return { status: 302, location: fallback };

  // Роботы и HEAD-запросы не считаются кликами и не получают click_id.
  const skip = opts.method === "HEAD" || (opts.userAgent != null && BOT.test(opts.userAgent));
  if (skip) return { status: 302, location: o.tracking_url!.replace(/\{click_id\}/g, "") };

  const clickId = randomUUID().replace(/-/g, "");
  db.prepare("INSERT INTO clicks (click_id, offer_id, source_path, utm_source, utm_medium, utm_campaign) VALUES (?,?,?,?,?,?)")
    .run(clickId, offerId, cleanPath(q.from), clip(q.utm_source), clip(q.utm_medium), clip(q.utm_campaign));
  return { status: 302, location: buildTarget(o.tracking_url!, clickId), clickId };
}
