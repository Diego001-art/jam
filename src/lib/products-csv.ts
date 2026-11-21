/**
 * Импорт и экспорт продуктов в CSV. Импорт НЕ публикует: статус, подтверждение редактора,
 * раскрытие, партнёрская ссылка и скрытие по регионам через CSV не меняются.
 * Опубликованный продукт с изменёнными условиями возвращается на проверку (status → review).
 */
import { parseCsv, toCsv } from "./csv";
import { ProductSchema, type Lender, type Product } from "./schemas";

const NUM = ["amountMin", "amountMax", "termMin", "termMax", "rateMin", "rateMax", "pskMin", "pskMax", "gracePeriodDays", "downPaymentMin", "cashback", "depositRate", "sortOrder"] as const;
const LIST = ["pros", "cons", "eligibility", "tags", "regionIds"] as const;
const TEXT = ["url", "fee", "conditions", "sourceUrl", "checkedAt", "validUntil", "image"] as const;
export const COLUMNS = ["id", "lenderId", "productName", "productType", ...TEXT, ...NUM, ...LIST] as const;
/** Поля, изменение которых требует повторной проверки редактором. */
const CONDITION_FIELDS = [...NUM.filter((k) => k !== "sortOrder"), "fee", "conditions", "sourceUrl", "productType", "regionIds"] as const;

export function exportProducts(products: Product[]): string {
  return toCsv([...COLUMNS], products.map((p) => COLUMNS.map((c) => {
    const v = (p as Record<string, unknown>)[c];
    return Array.isArray(v) ? v.join("|") : v;
  })));
}

export type ImportReport = { created: number; updated: number; backToReview: string[]; errors: string[] };

export function importProducts(existing: Product[], lenders: Lender[], csv: string): { products: Product[]; report: ImportReport } {
  const { header, rows } = parseCsv(csv);
  const report: ImportReport = { created: 0, updated: 0, backToReview: [], errors: [] };
  const missing = ["id", "lenderId", "productName", "productType"].filter((c) => !header.includes(c));
  if (missing.length) { report.errors.push("нет обязательных колонок: " + missing.join(", ")); return { products: existing, report }; }
  const byId = new Map(existing.map((p) => [p.id, p]));
  const result = new Map(byId);
  const lenderIds = new Set(lenders.map((l) => l.id));
  const seen = new Set<string>();

  rows.forEach((r, i) => {
    const line = i + 2;
    const id = r.id;
    if (seen.has(id)) { report.errors.push(`строка ${line}: повтор id «${id}»`); return; }
    seen.add(id);
    if (!lenderIds.has(r.lenderId)) { report.errors.push(`строка ${line}: нет кредитора «${r.lenderId}»`); return; }
    const prev = byId.get(id);
    const next: Record<string, unknown> = prev ? { ...prev } : {
      affiliateUrl: null, hidden: { districts: [], regions: [], cities: [] }, status: "draft", disclosure: null, approvedBy: null, sortOrder: 0,
      url: null, fee: null, conditions: null, sourceUrl: null, checkedAt: null, validUntil: null, image: null,
      ...Object.fromEntries(NUM.filter((k) => k !== "sortOrder").map((k) => [k, null])),
      pros: [], cons: [], eligibility: [], tags: [], regionIds: ["*"],
    };
    next.id = id; next.lenderId = r.lenderId; next.productName = r.productName; next.productType = r.productType;
    let bad = false;
    for (const k of TEXT) if (k in r) next[k] = r[k] === "" ? null : r[k];
    for (const k of NUM) if (k in r) {
      if (r[k] === "") { next[k] = k === "sortOrder" ? 0 : null; continue; }
      const n = Number(r[k].replace(/\s/g, "").replace(",", "."));
      if (!Number.isFinite(n)) { report.errors.push(`строка ${line}: «${k}» не число: ${r[k]}`); bad = true; } else next[k] = n;
    }
    for (const k of LIST) if (k in r) { const l = r[k].split("|").map((s) => s.trim()).filter(Boolean); next[k] = k === "regionIds" && !l.length ? ["*"] : l; }
    if (bad) return;
    if (prev && prev.status === "published" && CONDITION_FIELDS.some((k) => JSON.stringify(prev[k]) !== JSON.stringify(next[k]))) {
      next.status = "review"; next.approvedBy = null; report.backToReview.push(id);
    }
    const parsed = ProductSchema.safeParse(next);
    if (!parsed.success) { report.errors.push(`строка ${line} (${id}): ` + parsed.error.issues.map((x) => x.path.join(".") + " — " + x.message).join("; ")); return; }
    result.set(id, parsed.data);
    if (prev) report.updated++; else report.created++;
  });
  return { products: report.errors.length ? existing : [...result.values()], report };
}
