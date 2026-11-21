/** npm run backend:check — запускать по расписанию (cron на сервере), например раз в сутки. */
import { openDb } from "./db";
import { checkLinks, notify } from "./checks";

const db = openDb(process.env.DB_FILE ?? "backend/data/app.db");
const problems = await checkLinks(db, (u, i) => fetch(u, i), { tracking: process.env.CHECK_TRACKING === "1" });
problems.forEach((p) => console.log(`✗ ${p.offer_id}: ${p.kind} — ${p.detail}`));
const sent = await notify(problems, process.env, (url, body, type) => fetch(url, { method: "POST", headers: { "content-type": type }, body }));
console.log(problems.length ? `Проблем: ${problems.length}. Уведомления: ${sent.join(", ") || "не настроены"}` : "Проблем нет.");
