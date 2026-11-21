import { site } from "@/lib/content";
import { dateRu } from "@/lib/format";

/** Обязательное раскрытие (ТЗ, раздел 6). Незаполненные реквизиты не выдумываются. */
export function operatorLine() {
  const o = site.operator;
  if (!o.name) return "Сайт [оператор и реквизиты будут указаны]";
  const ids = [o.inn ? "ИНН " + o.inn : null, o.ogrn && o.type !== "самозанятый" ? (o.type === "ИП" ? "ОГРНИП " : "ОГРН ") + o.ogrn : null].filter(Boolean).join(", ");
  return "Сайт " + [o.type, o.name].filter(Boolean).join(" ") + (ids ? ", " + ids : "");
}

export function disclosureText() {
  const parts = [
    operatorLine() + ".",
    "Мы помогаем сравнить информацию и направляем на сайты кредиторов.",
    "Кредитный договор вы заключаете с выбранной кредитной организацией. Решение, доступность, ставка и ПСК определяются кредитором индивидуально.",
    site.conditionsCheckedAt
      ? "Условия проверены " + dateRu(site.conditionsCheckedAt) + "; проверяйте актуальные условия на официальном сайте кредитора."
      : "Проверяйте актуальные условия на официальном сайте кредитора.",
  ];
  if (site.commercial.affiliateLinks) parts.push(site.commercial.disclosure ?? "Возможны партнёрские ссылки и вознаграждение.");
  return parts.join(" ");
}

export function Disclosure() {
  return <p className="src">{disclosureText()}</p>;
}
