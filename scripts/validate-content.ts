/**
 * Проверка контента перед сборкой (ТЗ, разделы 4 и 11).
 * Ошибка → сборка останавливается. Предупреждения только печатаются.
 */
import fs from "node:fs";
import path from "node:path";
import { cities, guides, lenders, products, partnerOffers, regions, districts, site, texts, types, offersInCity } from "../src/lib/content";
import { cityBlockers, guideBlockers, lenderBlockers, offerBlockers, productBlockers, today } from "../src/lib/eligibility";

const errors: string[] = [];
const warns: string[] = [];
const err = (m: string) => errors.push(m);

function unique(name: string, values: string[]) {
  const seen = new Set<string>();
  for (const v of values) { if (seen.has(v)) err(`${name}: повтор «${v}»`); seen.add(v); }
}
unique("регионы.id", regions.map((r) => r.id));
unique("регионы.slug", regions.map((r) => r.slug));
unique("города.id", cities.map((c) => c.id));
unique("города.slug внутри региона", cities.map((c) => c.regionId + "/" + c.slug));
unique("кредиторы.id", lenders.map((l) => l.id));
unique("кредиторы.slug", lenders.map((l) => l.slug));
unique("продукты.id", products.map((p) => p.id));
unique("офферы.id", partnerOffers.map((o) => o.id));
unique("гид.slug", guides.map((g) => g.slug));
unique("виды.slug", types.map((t) => t.slug));

// Корневые адреса, которые не должны совпадать с id городов (старые редиректы /kazan/)
const reserved = new Set(["kredity", "banki", "goroda", "gid", "kalkulyator", "o-proekte", "kontakty", "pravovaya-informatsiya", "admin", "img", "js", "vendor"]);
cities.forEach((c) => { if (reserved.has(c.id)) err(`город ${c.id}: id совпадает с разделом сайта`); });

const regionIds = new Set(regions.map((r) => r.id));
const districtIds = new Set(districts.map((d) => d.id));
const cityIds = new Set(cities.map((c) => c.id));
regions.forEach((r) => { if (!districtIds.has(r.districtId)) err(`регион ${r.id}: нет округа ${r.districtId}`); });
cities.forEach((c) => { if (!regionIds.has(c.regionId)) err(`город ${c.id}: нет региона ${c.regionId}`); });

const pub = (p: string) => path.join("public", p);
cities.forEach((c) => {
  for (const f of [c.banner, c.thumb]) if (!fs.existsSync(pub(f))) err(`город ${c.id}: нет файла ${f}`);
});
Object.entries(texts).forEach(([k, v]) => {
  if ((k.endsWith(".img") || k === "logo") && v && !fs.existsSync(pub(v))) err(`текст ${k}: нет файла ${v}`);
});

const now = today();
products.forEach((p) => {
  const l = lenders.find((x) => x.id === p.lenderId);
  if (!l) err(`продукт ${p.id}: нет кредитора ${p.lenderId}`);
  p.regionIds.forEach((r) => { if (r !== "*" && !regionIds.has(r)) err(`продукт ${p.id}: нет региона ${r}`); });
  p.hidden.districts.forEach((d) => { if (!districtIds.has(d)) err(`продукт ${p.id}: скрыт в неизвестном округе ${d}`); });
  p.hidden.regions.forEach((r) => { if (!regionIds.has(r)) err(`продукт ${p.id}: скрыт в неизвестном регионе ${r}`); });
  p.hidden.cities.forEach((c) => { if (!cityIds.has(c)) err(`продукт ${p.id}: скрыт в неизвестном городе ${c}`); });
  if (p.image && !fs.existsSync(pub(p.image))) err(`продукт ${p.id}: нет файла изображения ${p.image}`);
  if (p.amountMin != null && p.amountMax != null && p.amountMin > p.amountMax) err(`продукт ${p.id}: сумма от > до`);
  if (p.termMin != null && p.termMax != null && p.termMin > p.termMax) err(`продукт ${p.id}: срок от > до`);
  if (p.rateMin != null && p.rateMax != null && p.rateMin > p.rateMax) err(`продукт ${p.id}: ставка от > до`);
  if (p.pskMin != null && p.pskMax != null && p.pskMin > p.pskMax) err(`продукт ${p.id}: ПСК от > до`);
  if (p.status === "published") {
    const b = productBlockers(p, l, now);
    if (b.length) err(`продукт ${p.id} опубликован, но: ${b.join("; ")}`);
  }
});
const publishedPerProduct = new Map<string, number>();
partnerOffers.forEach((o) => {
  const p = products.find((x) => x.id === o.productId);
  if (!p) err(`оффер ${o.id}: нет продукта ${o.productId}`);
  if (o.status === "published") {
    publishedPerProduct.set(o.productId, (publishedPerProduct.get(o.productId) ?? 0) + 1);
    const b = offerBlockers(o, p, lenders.find((l) => l.id === p?.lenderId), now);
    if (b.length) err(`оффер ${o.id} опубликован, но: ${b.join("; ")}`);
  }
});
publishedPerProduct.forEach((n, id) => { if (n > 1) err(`продукт ${id}: опубликовано офферов ${n}, допустим один`); });
products.forEach((p) => { if (p.affiliateUrl) warns.push(`продукт ${p.id}: поле affiliateUrl устарело — ссылки хранятся в бэкенде, репозиторий публичный`); });

lenders.forEach((l) => {
  if (l.status === "published") { const b = lenderBlockers(l); if (b.length) err(`кредитор ${l.id} опубликован, но: ${b.join("; ")}`); }
});
cities.forEach((c) => {
  if (c.indexable) { const b = cityBlockers(c, offersInCity(c).length); if (b.length) err(`город ${c.id} помечен индексируемым, но: ${b.join("; ")}`); }
  c.localFacts.forEach((f, i) => { if (!f.source.url) err(`город ${c.id}: факт ${i + 1} без источника`); });
});
guides.forEach((g) => {
  if (g.status === "published") { const b = guideBlockers(g); if (b.length) err(`материал ${g.slug} опубликован, но: ${b.join("; ")}`); }
});

if (site.indexing) {
  const o = site.operator;
  if (!o.name || !o.inn || (o.type !== "самозанятый" && !o.ogrn) || !o.email) err("индексация включена, но реквизиты оператора не заполнены (ТЗ, раздел 6)");
  if (site.mode !== "production") err("индексация включена в режиме preview");
}
if (site.commercial.affiliateLinks && !site.commercial.disclosure) err("включены партнёрские ссылки без текста раскрытия");

const count = (s: string) => products.filter((p) => p.status === s).length;
warns.push(`продукты: опубликовано ${count("published")}, черновиков ${count("draft")}, на проверке ${count("review")}`);
warns.push(`кредиторы опубликованы: ${lenders.filter((l) => l.status === "published").length} из ${lenders.length}`);
warns.push(`индексация: ${site.indexing ? "включена" : "выключена (noindex на всех страницах)"}`);

warns.forEach((w) => console.log("• " + w));
if (errors.length) {
  console.error("\nОшибки контента (" + errors.length + "):");
  errors.forEach((e) => console.error("  ✗ " + e));
  process.exit(1);
}
console.log("Контент в порядке.");
