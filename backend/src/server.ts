/**
 * HTTP-сервер бэкенда. Без внешних зависимостей (node:http).
 * Настройки — переменными окружения (см. backend/.env.example), секретов в репозитории нет.
 */
import http from "node:http";
import { openDb } from "./db";
import { handleGo } from "./go";
import { handlePostback } from "./postback";

const PORT = Number(process.env.PORT ?? 8787);
const DB_FILE = process.env.DB_FILE ?? "backend/data/app.db";
const SITE_URL = process.env.SITE_URL ?? "https://diego001-art.github.io/jam/";

export function createServer(db = openDb(DB_FILE)) {
  return http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
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
