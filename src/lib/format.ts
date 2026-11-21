import type { Product, ProductType } from "./schemas";

const nf = new Intl.NumberFormat("ru-RU");
export const rub = (n: number) => nf.format(Math.round(n)) + " ₽";
export const pct = (n: number) => String(Math.round(n * 1000) / 1000).replace(".", ",") + "%";

export function plural(n: number, one: string, few: string, many: string) {
  const m = n % 10, h = n % 100;
  return m === 1 && h !== 11 ? one : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? few : many;
}

export function months(m: number) {
  if (m % 12 === 0) { const y = m / 12; return y + " " + plural(y, "год", "года", "лет"); }
  return m + " " + plural(m, "месяц", "месяца", "месяцев");
}

function range(min: number | null, max: number | null, f: (n: number) => string) {
  if (min != null && max != null) return min === max ? f(min) : "от " + f(min) + " до " + f(max);
  if (min != null) return "от " + f(min);
  if (max != null) return "до " + f(max);
  return null;
}
function rangePct(min: number | null, max: number | null) {
  if (min != null && max != null) return min === max ? pct(min) : pct(min).replace("%", "") + "–" + pct(max);
  if (min != null) return "от " + pct(min);
  if (max != null) return "до " + pct(max);
  return null;
}

export const dateRu = (iso: string | null) => (iso ? iso.split("-").reverse().join(".") : "");

export type Metric = { label: string; value: string | null; sub?: string | null };

/** Три показателя карточки в зависимости от вида продукта. */
export function metrics(p: Product, t: ProductType): Metric[] {
  const rate: Metric = { label: "Ставка", value: rangePct(p.rateMin, p.rateMax), sub: rangePct(p.pskMin, p.pskMax) ? "ПСК " + rangePct(p.pskMin, p.pskMax) : null };
  const amount: Metric = { label: "Сумма", value: range(p.amountMin, p.amountMax, rub) };
  const term: Metric = { label: "Срок", value: range(p.termMin, p.termMax, months) };
  switch (t.id) {
    case "card":
      return [
        { label: "Кредитный лимит", value: range(p.amountMin, p.amountMax, rub) },
        { label: "Льготный период", value: p.gracePeriodDays != null ? "до " + p.gracePeriodDays + " дн." : null, sub: rangePct(p.pskMin, p.pskMax) ? "ПСК " + rangePct(p.pskMin, p.pskMax) : null },
        { label: "Обслуживание", value: p.fee },
      ];
    case "mortgage":
      return [rate, { label: "Первый взнос", value: p.downPaymentMin != null ? "от " + pct(p.downPaymentMin) : null }, term];
    case "deposit":
      return [{ label: "Ставка", value: rangePct(p.rateMin, p.rateMax) }, { label: "Сумма", value: range(p.amountMin, p.amountMax, rub) }, term];
    case "debit":
      return [
        { label: "Кешбэк", value: p.cashback != null ? "до " + pct(p.cashback) : null },
        { label: "Процент на остаток", value: p.depositRate != null ? "до " + pct(p.depositRate) : null },
        { label: "Обслуживание", value: p.fee },
      ];
    default:
      return [rate, amount, term];
  }
}
