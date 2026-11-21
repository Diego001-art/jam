import { describe, expect, it } from "vitest";
import { openDb } from "../src/db";
import { buildTarget, cleanPath, handleGo, isHttps } from "../src/go";

const opts = { siteUrl: "https://site.example/" };
function setup() {
  const db = openDb(":memory:");
  db.exec(`INSERT INTO networks (id,name,kind) VALUES ('n1','Тест-сеть','cpa');
           INSERT INTO programs (id,network_id,name) VALUES ('p1','n1','Программа');
           INSERT INTO offers (id,program_id,tracking_url,fallback_url,status) VALUES
             ('live','p1','https://track.example/c?sub={click_id}','https://bank.example/card','active'),
             ('off','p1','https://track.example/c?sub={click_id}','https://bank.example/card','paused'),
             ('nofb','p1','https://track.example/c','', 'paused');`);
  return db;
}
const clicks = (db: ReturnType<typeof setup>) => (db.prepare("SELECT COUNT(*) AS n FROM clicks").get() as { n: number }).n;

describe("/go", () => {
  it("активный оффер: пишет клик и подставляет click_id", () => {
    const db = setup();
    const r = handleGo(db, "live", { from: "/kredity/karty/?x=1", utm_source: "yandex" }, opts);
    expect(r.clickId).toBeTruthy();
    expect(r.location).toBe("https://track.example/c?sub=" + r.clickId);
    const row = db.prepare("SELECT source_path, utm_source FROM clicks").get() as { source_path: string; utm_source: string };
    expect(row.source_path).toBe("/kredity/karty/");
    expect(row.utm_source).toBe("yandex");
  });
  it("отключённый оффер: на страницу банка, клик не пишется", () => {
    const db = setup();
    expect(handleGo(db, "off", {}, opts).location).toBe("https://bank.example/card");
    expect(clicks(db)).toBe(0);
  });
  it("неизвестный оффер и мусорный id: на главную сайта", () => {
    const db = setup();
    expect(handleGo(db, "nope", {}, opts).location).toBe(opts.siteUrl);
    expect(handleGo(db, "../etc", {}, opts).location).toBe(opts.siteUrl);
    expect(handleGo(db, "nofb", {}, opts).location).toBe(opts.siteUrl);
  });
  it("отключённая сеть отключает оффер", () => {
    const db = setup();
    db.exec("UPDATE networks SET status='disabled'");
    expect(handleGo(db, "live", {}, opts).location).toBe("https://bank.example/card");
  });
  it("роботы и HEAD не считаются кликами", () => {
    const db = setup();
    handleGo(db, "live", {}, { ...opts, userAgent: "Googlebot/2.1" });
    handleGo(db, "live", {}, { ...opts, method: "HEAD" });
    expect(clicks(db)).toBe(0);
  });
  it("небезопасные ссылки не используются", () => {
    const db = setup();
    db.exec("UPDATE offers SET tracking_url='http://insecure.example/' WHERE id='live'");
    expect(handleGo(db, "live", {}, opts).location).toBe("https://bank.example/card");
    expect(isHttps("javascript:alert(1)")).toBe(false);
  });
  it("from принимает только путь внутри сайта", () => {
    expect(cleanPath("//evil.example")).toBeNull();
    expect(cleanPath("https://evil.example")).toBeNull();
    expect(cleanPath("/a/b/?q=1#h")).toBe("/a/b/");
    expect(buildTarget("https://t.example/?s={click_id}", "a b")).toBe("https://t.example/?s=a%20b");
  });
});
