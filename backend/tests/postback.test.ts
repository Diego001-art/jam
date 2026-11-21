import { describe, expect, it } from "vitest";
import { openDb } from "../src/db";
import { handlePostback } from "../src/postback";

const MAP = JSON.stringify({ click_id: "sub", external_id: "oid", status: "st", amount: "sum", statusMap: { ok: "approved", wait: "pending", no: "rejected" } });
function setup(enabled = 1, map: string | null = MAP) {
  const db = openDb(":memory:");
  db.prepare("INSERT INTO networks (id,name,kind,postback_enabled,postback_secret,postback_map) VALUES ('n1','Сеть','cpa',?,?,?)").run(enabled, "s3cret", map);
  db.exec("INSERT INTO clicks (click_id, offer_id) VALUES ('c1','o1')");
  return db;
}
const conv = (db: ReturnType<typeof setup>) => db.prepare("SELECT status, amount, offer_id FROM conversions").all() as { status: string; amount: number | null; offer_id: string }[];

describe("postback", () => {
  it("закрыт, пока сеть не включена или нет маппинга", () => {
    expect(handlePostback(setup(0), "n1", { secret: "s3cret" }).status).toBe(404);
    expect(handlePostback(setup(1, null), "n1", { secret: "s3cret" }).status).toBe(404);
    expect(handlePostback(setup(), "other", {}).status).toBe(404);
  });
  it("неверный секрет — 403", () => {
    expect(handlePostback(setup(), "n1", { secret: "bad", sub: "c1", oid: "1", st: "ok" }).status).toBe(403);
  });
  it("записывает конверсию и обновляет статус повтором", () => {
    const db = setup();
    expect(handlePostback(db, "n1", { secret: "s3cret", sub: "c1", oid: "1", st: "wait", sum: "1 500".replace(" ", "") }).status).toBe(200);
    expect(conv(db)).toEqual([{ status: "pending", amount: 1500, offer_id: "o1" }]);
    handlePostback(db, "n1", { sub: "c1", oid: "1", st: "ok", sum: "1500,5" }, "s3cret");
    expect(conv(db)).toEqual([{ status: "approved", amount: 1500.5, offer_id: "o1" }]);
  });
  it("неизвестные статус и клик отклоняются", () => {
    const db = setup();
    expect(handlePostback(db, "n1", { secret: "s3cret", sub: "c1", oid: "1", st: "??" }).status).toBe(400);
    expect(handlePostback(db, "n1", { secret: "s3cret", sub: "nope", oid: "1", st: "ok" }).status).toBe(404);
    expect(conv(db)).toEqual([]);
  });
  it("оплаченная конверсия не понижается", () => {
    const db = setup();
    handlePostback(db, "n1", { secret: "s3cret", sub: "c1", oid: "1", st: "ok" });
    db.exec("UPDATE conversions SET status='paid'");
    handlePostback(db, "n1", { secret: "s3cret", sub: "c1", oid: "1", st: "no" });
    expect(conv(db)[0].status).toBe("paid");
  });
});
