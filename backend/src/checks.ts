/**
 * Проверка живости ссылок офферов и уведомления.
 * По умолчанию проверяется только страница банка (fallback_url). Партнёрскую ссылку можно проверять
 * лишь с CHECK_TRACKING=1: запрос к трекеру сети может засчитаться как клик и нарушить правила сети —
 * включайте только если сеть это разрешает.
 */
import type { Db } from "./db";
import { isHttps } from "./go";

export type Fetcher = (url: string, init: { method: string; redirect: "manual" | "follow"; signal: AbortSignal }) => Promise<{ status: number }>;
export type Problem = { offer_id: string; kind: string; detail: string };

async function probe(fetcher: Fetcher, url: string, follow: boolean): Promise<{ ok: boolean; status: number | null; note: string | null }> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 10_000);
  try {
    let r = await fetcher(url, { method: "HEAD", redirect: follow ? "follow" : "manual", signal: ctl.signal });
    if (r.status === 405 || r.status === 403) r = await fetcher(url, { method: "GET", redirect: follow ? "follow" : "manual", signal: ctl.signal });
    return { ok: r.status >= 200 && r.status < 400, status: r.status, note: null };
  } catch (e) {
    return { ok: false, status: null, note: (e as Error).name === "AbortError" ? "таймаут" : "ошибка соединения" };
  } finally { clearTimeout(t); }
}

type Row = { id: string; status: string; tracking_url: string | null; fallback_url: string | null; network_status: string | null };

export async function checkLinks(db: Db, fetcher: Fetcher, opts: { tracking?: boolean } = {}): Promise<Problem[]> {
  const rows = db.prepare(
    `SELECT o.id, o.status, o.tracking_url, o.fallback_url, n.status AS network_status
       FROM offers o LEFT JOIN programs p ON p.id = o.program_id LEFT JOIN networks n ON n.id = p.network_id
      WHERE o.status = 'active'`,
  ).all() as Row[];
  const problems: Problem[] = [];
  const save = db.prepare("INSERT INTO link_checks (offer_id, target, ok, http_status, note) VALUES (?,?,?,?,?)");
  for (const o of rows) {
    if (o.network_status === "disabled") problems.push({ offer_id: o.id, kind: "сеть отключена", detail: "оффер активен, но его сеть отключена — переходы идут на страницу банка" });
    if (!isHttps(o.fallback_url)) problems.push({ offer_id: o.id, kind: "нет страницы банка", detail: "при отключении оффера посетитель попадёт на главную сайта" });
    else {
      const r = await probe(fetcher, o.fallback_url, true);
      save.run(o.id, "fallback", r.ok ? 1 : 0, r.status, r.note);
      if (!r.ok) problems.push({ offer_id: o.id, kind: "страница банка недоступна", detail: (r.status ?? r.note) + " — " + o.fallback_url });
    }
    if (opts.tracking && isHttps(o.tracking_url)) {
      const r = await probe(fetcher, o.tracking_url.replace(/\{click_id\}/g, ""), false);
      save.run(o.id, "tracking", r.ok ? 1 : 0, r.status, r.note);
      if (!r.ok) problems.push({ offer_id: o.id, kind: "партнёрская ссылка не отвечает", detail: String(r.status ?? r.note) });
    }
  }
  // Офферы без кликов 14 дней при активном статусе — повод проверить, не отключила ли сеть программу.
  const quiet = db.prepare(
    `SELECT o.id FROM offers o WHERE o.status='active' AND o.updated_at < datetime('now','-14 days')
       AND NOT EXISTS (SELECT 1 FROM clicks c WHERE c.offer_id = o.id AND c.ts >= datetime('now','-14 days'))`,
  ).all() as { id: string }[];
  quiet.forEach((q) => problems.push({ offer_id: q.id, kind: "нет переходов 14 дней", detail: "проверьте в кабинете сети, что программа не остановлена" }));
  return problems;
}

/** Уведомление: Telegram-бот (официальный Bot API) и/или произвольный webhook. Без настроек — только вывод в консоль. */
export async function notify(problems: Problem[], env: Record<string, string | undefined>, post: (url: string, body: string, type: string) => Promise<unknown>) {
  if (!problems.length) return [];
  const text = "Jam: проблемы с офферами (" + problems.length + ")\n" + problems.map((p) => `• ${p.offer_id}: ${p.kind} — ${p.detail}`).join("\n");
  const sent: string[] = [];
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    await post(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: text.slice(0, 4000) }), "application/json");
    sent.push("telegram");
  }
  if (env.NOTIFY_WEBHOOK_URL && isHttps(env.NOTIFY_WEBHOOK_URL)) {
    await post(env.NOTIFY_WEBHOOK_URL, JSON.stringify({ text, problems }), "application/json");
    sent.push("webhook");
  }
  return sent;
}
