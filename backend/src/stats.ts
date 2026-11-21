/** Статистика из реальных данных базы. Нет данных — нули, а не оценки. */
import type { Db } from "./db";

export type OfferStat = {
  offer_id: string; clicks: number; conversions: number; pending: number; approved: number; rejected: number; paid: number;
  amount_pending: number; amount_approved: number; amount_paid: number; conversion_rate: number | null;
};

/** from/to — даты ГГГГ-ММ-ДД включительно. */
export function offerStats(db: Db, from: string, to: string): OfferStat[] {
  const rows = db.prepare(
    `WITH c AS (SELECT offer_id, COUNT(*) AS clicks FROM clicks WHERE date(ts) BETWEEN ?1 AND ?2 GROUP BY offer_id),
          v AS (SELECT offer_id,
                  COUNT(*) AS conversions,
                  SUM(status='pending') AS pending, SUM(status='approved') AS approved, SUM(status='rejected') AS rejected, SUM(status='paid') AS paid,
                  COALESCE(SUM(CASE WHEN status='pending' THEN amount END),0) AS amount_pending,
                  COALESCE(SUM(CASE WHEN status='approved' THEN amount END),0) AS amount_approved,
                  COALESCE(SUM(CASE WHEN status='paid' THEN amount END),0) AS amount_paid
                FROM conversions WHERE date(ts) BETWEEN ?1 AND ?2 GROUP BY offer_id)
     SELECT COALESCE(c.offer_id, v.offer_id) AS offer_id, COALESCE(c.clicks,0) AS clicks, COALESCE(v.conversions,0) AS conversions,
            COALESCE(v.pending,0) AS pending, COALESCE(v.approved,0) AS approved, COALESCE(v.rejected,0) AS rejected, COALESCE(v.paid,0) AS paid,
            COALESCE(v.amount_pending,0) AS amount_pending, COALESCE(v.amount_approved,0) AS amount_approved, COALESCE(v.amount_paid,0) AS amount_paid
       FROM c LEFT JOIN v ON v.offer_id = c.offer_id
     UNION
     SELECT v.offer_id, 0, v.conversions, v.pending, v.approved, v.rejected, v.paid, v.amount_pending, v.amount_approved, v.amount_paid
       FROM v WHERE v.offer_id NOT IN (SELECT offer_id FROM c)
     ORDER BY clicks DESC, offer_id`,
  ).all(from, to) as Omit<OfferStat, "conversion_rate">[];
  return rows.map((r) => ({ ...r, conversion_rate: r.clicks ? r.conversions / r.clicks : null }));
}

export function sourceStats(db: Db, from: string, to: string) {
  return db.prepare(
    `SELECT COALESCE(utm_source,'(нет)') AS utm_source, COALESCE(source_path,'(нет)') AS source_path, COUNT(*) AS clicks
       FROM clicks WHERE date(ts) BETWEEN ? AND ? GROUP BY 1, 2 ORDER BY clicks DESC LIMIT 100`,
  ).all(from, to);
}
