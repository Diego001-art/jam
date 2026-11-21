/**
 * Публикационный шлюз (ТЗ, разделы 3, 4, 11).
 * Ничего не показывается как действующее условие без источника, даты проверки,
 * срока актуальности и подтверждения редактора.
 */
import type { City, Guide, Lender, Offer, Product, Site } from "./schemas";

export const today = (d = new Date()) => d.toISOString().slice(0, 10);

/** Есть ли у продукта хотя бы одно содержательное условие. */
export function hasConditions(p: Product): boolean {
  return [p.amountMin, p.amountMax, p.termMin, p.termMax, p.rateMin, p.rateMax, p.pskMin, p.pskMax, p.gracePeriodDays, p.downPaymentMin, p.cashback, p.depositRate]
    .some((v) => v != null) || !!p.fee;
}

/** Причины, по которым продукт нельзя показывать. Пустой массив — можно. */
export function productBlockers(p: Product, lender: Lender | undefined, now = today()): string[] {
  const r: string[] = [];
  if (p.status !== "published") r.push("статус не «published»");
  if (!lender) r.push("кредитор не найден");
  else if (lender.status !== "published") r.push("кредитор не опубликован");
  if (!p.sourceUrl) r.push("нет первичного источника");
  if (!p.checkedAt) r.push("нет даты проверки");
  if (!p.validUntil) r.push("нет срока актуальности");
  else if (p.validUntil < now) r.push("истёк срок актуальности");
  if (!p.approvedBy) r.push("нет подтверждения редактора");
  if (!hasConditions(p)) r.push("нет ни одного условия");
  if ((p.rateMin != null || p.rateMax != null) && p.pskMin == null && p.pskMax == null)
    r.push("указана ставка без диапазона ПСК (ст. 28 закона о рекламе)");
  if (p.affiliateUrl && !p.disclosure) r.push("партнёрская ссылка без раскрытия");
  return r;
}

export const isProductPublishable = (p: Product, l: Lender | undefined, now = today()) =>
  productBlockers(p, l, now).length === 0;

/** Причины, по которым кнопку оффера (/go/{id}) нельзя показывать. Пустой массив — можно. */
export function offerBlockers(o: Offer, product: Product | undefined, lender: Lender | undefined, now = today()): string[] {
  const r: string[] = [];
  if (o.status !== "published") r.push("статус оффера не «published»");
  if (!product) r.push("продукт не найден");
  else r.push(...productBlockers(product, lender, now).filter((b) => b !== "партнёрская ссылка без раскрытия"));
  if (!o.disclosure) r.push("нет раскрытия партнёрского характера ссылки");
  if (!o.advertiser) r.push("не указан рекламодатель для маркировки");
  if (!o.approvedBy) r.push("нет подтверждения редактора");
  return r;
}

/** Кредитор виден на сайте: в production — только опубликованные, в preview — кроме архивных. */
export function isLenderVisible(l: Lender, site: Pick<Site, "mode">): boolean {
  if (l.status === "archived") return false;
  return site.mode === "preview" || l.status === "published";
}

export function lenderBlockers(l: Lender): string[] {
  const r: string[] = [];
  if (l.status !== "published") r.push("статус не «published»");
  if (!l.checkedAt) r.push("нет даты проверки");
  if (!l.approvedBy) r.push("нет подтверждения редактора");
  if (!l.sources.length) r.push("нет официальных источников");
  return r;
}

/** Доступен ли продукт в городе с учётом регионов и скрытий. */
export function availableIn(p: Pick<Product, "regionIds" | "hidden">, cityId: string, regionId: string, districtId: string): boolean {
  if (!p.regionIds.includes("*") && !p.regionIds.includes(regionId)) return false;
  const h = p.hidden;
  return !(h.cities.includes(cityId) || h.regions.includes(regionId) || h.districts.includes(districtId));
}

/** Шлюз индексации городской страницы. */
export function cityBlockers(c: City, publishedOffersInCity: number): string[] {
  const r: string[] = [];
  if (c.indexStatus !== "published") r.push("статус не «published»");
  if (!c.editor) r.push("нет редактора");
  if (!c.reviewedAt) r.push("нет даты редакционной проверки");
  if (!c.searchEvidence) r.push("нет подтверждения спроса");
  if (c.localFacts.length === 0) r.push("нет проверенных локальных фактов");
  if (publishedOffersInCity === 0) r.push("нет опубликованных предложений, доступных в городе");
  return r;
}

export const isCityIndexable = (c: City, offers: number, site: Pick<Site, "indexing">) =>
  site.indexing && c.indexable && cityBlockers(c, offers).length === 0;

export function guideBlockers(g: Guide): string[] {
  const r: string[] = [];
  if (g.status !== "published") r.push("статус не «published»");
  if (!g.author) r.push("нет автора");
  if (!g.editor) r.push("нет редактора");
  if (!g.publishedAt) r.push("нет даты публикации");
  if (!g.sources.length) r.push("нет источников");
  return r;
}

export const isGuideIndexable = (g: Guide, site: Pick<Site, "indexing">) =>
  site.indexing && g.indexable && guideBlockers(g).length === 0;
