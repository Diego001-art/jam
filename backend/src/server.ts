/**
 * HTTP-сервер бэкенда. Без внешних зависимостей (node:http).
 * Настройки — переменными окружения (см. backend/.env.example), секретов в репозитории нет.
 */
import http from "node:http";
import { openDb } from "./db";
import { handleGo } from "./go";
import { handlePostback } from "./postback";
import fs from "node:fs";
import { adminApi } from "./admin";
import { Sessions } from "./auth";

const PORT = Number(process.env.PORT ?? 8787);
const DB_FILE = process.env.DB_FILE ?? "backend/data/app.db";
const ADMIN_HASH = process.env.ADMIN_PASSWORD_HASH;
const SECURE = process.env.COOKIE_SECURE === "1";
const SITE_URL = process.env.SITE_URL ?? "https://diego001-art.github.io/jam/";

const cookieOf = (req: http.IncomingMessage) => /(?:^|;\s*)sid=([a-f0-9]+)/.exec(String(req.headers.cookie ?? ""))?.[1];
const json = (res: http.ServerResponse, status: number, body: unknown, extra: Record<string, string> = {}) => {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow", ...extra });
  res.end(JSON.stringify(body));
};

export function createServer(db = openDb(DB_FILE), sessions = new Sessions()) {
  const adminPage = () => fs.readFileSync("backend/admin/index.html", "utf8");
  return http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    if (url.pathname === "/admin" || url.pathname === "/admin/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow", "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'" });
      res.end(adminPage()); return;
    }
    if (url.pathname.startsWith("/admin/api/")) {
      const path = url.pathname.slice("/admin/api".length);
      let raw = "";
      req.on("data", (c) => { raw += c; if (raw.length > 50_000) req.destroy(); });
      req.on("end", () => {
        // Защита от CSRF: SameSite=Strict + обязательный служебный заголовок для изменяющих запросов.
        if (req.method !== "GET" && req.headers["x-requested-with"] !== "admin") return json(res, 403, { error: "forbidden" });
        let body: Record<string, unknown> = {};
        if (raw) { try { body = JSON.parse(raw); } catch { return json(res, 400, { error: "bad json" }); } }
        if (path === "/login" && req.method === "POST") {
          if (!ADMIN_HASH) return json(res, 503, { error: "ADMIN_PASSWORD_HASH не задан" });
          if (sessions.locked()) return json(res, 429, { error: "слишком много попыток, подождите 10 минут" });
          const t = sessions.login(String(body.password ?? ""), ADMIN_HASH);
          if (!t) return json(res, 401, { error: "неверный пароль" });
          return json(res, 200, { ok: true }, { "set-cookie": `sid=${t}; HttpOnly; SameSite=Strict; Path=/admin; Max-Age=43200${SECURE ? "; Secure" : ""}` });
        }
        if (path === "/logout" && req.method === "POST") { sessions.logout(cookieOf(req)); return json(res, 200, { ok: true }, { "set-cookie": "sid=; HttpOnly; SameSite=Strict; Path=/admin; Max-Age=0" }); }
        if (!sessions.valid(cookieOf(req))) return json(res, 401, { error: "нужен вход" });
        try {
          const r = adminApi(db, req.method ?? "GET", path, body, url.searchParams);
          if (r.csv) { res.writeHead(200, { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${r.csv.name}"`, "cache-control": "no-store", "x-robots-tag": "noindex" }); res.end(r.csv.text); }
          else json(res, r.status, r.json);
        }
        catch (e) { console.error(e); json(res, 500, { error: "внутренняя ошибка" }); }
      });
      return;
    }
    if (url.pathname === "/healthz") { res.writeHead(200, { "content-type": "text/plain" }); res.end("ok"); return; }
    const m = /^\/go\/([^/]+)\/?$/.exec(url.pathname);
    if (m && (req.method === "GET" || req.method === "HEAD")) {
      const q = url.searchParams;
      const r = handleGo(db, m[1], { from: q.get("from"), utm_source: q.get("utm_source"), utm_medium: q.get("utm_medium"), utm_campaign: q.get("utm_campaign") }, {
        siteUrl: SITE_URL, method: req.method, userAgent: String(req.headers["user-agent"] ?? ""),
      });
      // noindex: служебные адреса не должны попадать в поиск; sponsored — для ссылок-реклам.
      res.writeHead(r.status, { location: r.location, "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" });
      res.end();
      return;
    }
    const pb = /^\/postback\/([^/]+)\/?$/.exec(url.pathname);
    if (pb && (req.method === "GET" || req.method === "POST")) {
      let body = "";
      req.on("data", (c) => { body += c; if (body.length > 10_000) req.destroy(); });
      req.on("end", () => {
        const params: Record<string, string> = Object.fromEntries(url.searchParams);
        if (req.method === "POST" && body) { try { Object.assign(params, Object.fromEntries(new URLSearchParams(body))); } catch { /* игнор */ } }
        const r = handlePostback(db, pb[1], params, String(req.headers["x-postback-secret"] ?? ""));
        res.writeHead(r.status, { "content-type": "text/plain", "cache-control": "no-store" }); res.end(r.body);
      });
      return;
    }
    res.writeHead(404, { "content-type": "text/plain" }); res.end("not found");
  });
}

if (process.argv[1]?.endsWith("server.ts")) {
  import("node:fs").then((fs) => fs.mkdirSync("backend/data", { recursive: true }));
  createServer().listen(PORT, () => console.log("backend: http://localhost:" + PORT));
}
