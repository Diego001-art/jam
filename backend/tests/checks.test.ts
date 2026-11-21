import { describe, expect, it } from "vitest";
import { checkLinks, notify, type Fetcher } from "../src/checks";
import { openDb } from "../src/db";

function setup() {
  const db = openDb(":memory:");
  db.exec(`INSERT INTO networks (id,name,kind,status) VALUES ('n1','С','cpa','active'),('n2','С2','cpa','disabled');
    INSERT INTO programs (id,network_id,name) VALUES ('p1','n1','П'),('p2','n2','П2');
    INSERT INTO offers (id,program_id,tracking_url,fallback_url,status) VALUES
      ('ok','p1','https://t.example/?s={click_id}','https://bank.example/ok','active'),
      ('dead','p1','https://t.example/','https://bank.example/dead','active'),
      ('nofb','p1','https://t.example/',NULL,'active'),
      ('net','p2','https://t.example/','https://bank.example/ok','active'),
      ('paused','p1','https://t.example/','https://bank.example/dead','paused');`);
  return db;
}
const calls: string[] = [];
const fetcher: Fetcher = async (url) => { calls.push(url); if (url.includes("dead")) return { status: 404 }; return { status: 200 }; };

describe("проверка ссылок", () => {
  it("находит недоступную страницу, отсутствие страницы банка, отключённую сеть; трекер не трогает по умолчанию", async () => {
    calls.length = 0;
    const db = setup();
    const p = await checkLinks(db, fetcher);
    const kinds = p.map((x) => x.offer_id + ":" + x.kind);
    expect(kinds).toContain("dead:страница банка недоступна");
    expect(kinds).toContain("nofb:нет страницы банка");
    expect(kinds).toContain("net:сеть отключена");
    expect(kinds.some((k) => k.startsWith("paused"))).toBe(false);
    expect(calls.some((u) => u.includes("t.example"))).toBe(false);
  });
  it("трекер проверяется только по явному флагу, без click_id", async () => {
    calls.length = 0;
    await checkLinks(setup(), fetcher, { tracking: true });
    expect(calls).toContain("https://t.example/?s=");
  });
  it("уведомления уходят только при настройках", async () => {
    const posts: string[] = [];
    const post = async (u: string) => { posts.push(u); };
    expect(await notify([{ offer_id: "o", kind: "k", detail: "d" }], {}, post)).toEqual([]);
    expect(await notify([{ offer_id: "o", kind: "k", detail: "d" }], { TELEGRAM_BOT_TOKEN: "x", TELEGRAM_CHAT_ID: "1", NOTIFY_WEBHOOK_URL: "https://h.example/" }, post)).toEqual(["telegram", "webhook"]);
    expect(await notify([], { TELEGRAM_BOT_TOKEN: "x", TELEGRAM_CHAT_ID: "1" }, post)).toEqual([]);
    expect(posts).toHaveLength(2);
  });
});
