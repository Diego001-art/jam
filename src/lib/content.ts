/**
 * Загрузка и проверка данных. Любая ошибка схемы останавливает сборку.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {
  AuthorsSchema, CitySchema, GuideSchema, LenderSchema, OfferSchema, ProductSchema, ProductTypeSchema, RegionsSchema, SiteSchema, TextsSchema,
  type City, type Guide, type Lender, type Offer, type Product, type ProductType, type Region, type Site,
} from "./schemas";
import { availableIn, isLenderVisible, isProductPublishable, today } from "./eligibility";
import { metrics } from "./format";
import { BASE_PATH } from "./paths";
import { z } from "zod";

const ROOT = process.cwd();
const read = (p: string) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
function load<T>(file: string, schema: z.ZodType<T>): T {
  const r = schema.safeParse(read(file));
  if (!r.success) throw new Error(file + ": " + r.error.issues.map((i) => i.path.join(".") + " — " + i.message).join("; "));
  return r.data;
}

export const site: Site = load("data/site.json", SiteSchema);
export const types: ProductType[] = load("data/product-types.json", z.array(ProductTypeSchema));
const reg = load("data/regions.json", RegionsSchema);
export const districts = reg.districts;
export const regions: Region[] = reg.regions;
export const cities: City[] = load("data/cities.json", z.array(CitySchema));
export const lenders: Lender[] = load("data/lenders.json", z.array(LenderSchema));
export const products: Product[] = load("data/products.json", z.array(ProductSchema));
export const partnerOffers: Offer[] = load("data/offers.json", z.array(OfferSchema));
export const texts: Record<string, string> = load("content/texts.json", TextsSchema);
export const authors = load("content/authors.json", AuthorsSchema);
export const guides: Guide[] = fs
  .readdirSync(path.join(ROOT, "content/guides"))
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => load("content/guides/" + f, GuideSchema));

export const t = (key: string) => {
  const v = texts[key];
  if (v == null) throw new Error("Нет текста: " + key);
  return v;
};

export const regionOf = (c: City) => regions.find((r) => r.id === c.regionId)!;
export const districtOf = (r: Region) => districts.find((d) => d.id === r.districtId)!;
export const cityPath = (c: City) => "/goroda/" + regionOf(c).slug + "/" + c.slug + "/";
export const lenderOf = (id: string) => lenders.find((l) => l.id === id);
export const visibleLenders = lenders.filter((l) => isLenderVisible(l, site));
export const publishedProducts = products.filter((p) => isProductPublishable(p, lenderOf(p.lenderId)));
export const typeById = (id: string) => types.find((x) => x.id === id)!;

export function offersInCity(c: City, type?: string) {
  const r = regionOf(c), d = r.districtId;
  return publishedProducts.filter((p) => (!type || p.productType === type) && availableIn(p, c.id, r.id, d));
}

/** Компактный каталог для браузера: только то, что прошло публикационный шлюз. */
export function catalog() {
  return {
    base: BASE_PATH,
    pageSize: 10,
    today: today(),
    types: types.map((x) => ({ id: x.id, slug: x.slug, name: x.name, one: x.one })),
    districts,
    regions: regions.map((r) => ({ id: r.id, slug: r.slug, name: r.name, districtId: r.districtId })),
    cities: cities
      .filter((c) => c.indexStatus !== "archived")
      .map((c) => ({ id: c.id, slug: c.slug, name: c.name, nameIn: c.nameIn, regionId: c.regionId, banner: c.banner, thumb: c.thumb, geo: c.geoMatch })),
    lenders: visibleLenders.map((l) => ({ id: l.id, slug: l.slug, name: l.name, url: l.officialUrl, domain: l.domain, c1: l.colors.c1, c2: l.colors.c2, logo: l.logo })),
    offers: publishedProducts.map((p) => ({
      id: p.id, lenderId: p.lenderId, type: p.productType, name: p.productName, url: p.url, affiliateUrl: p.affiliateUrl,
      metrics: metrics(p, typeById(p.productType)).map((m) => [m.label, m.value, m.sub ?? null]),
      tags: p.tags, checkedAt: p.checkedAt, validUntil: p.validUntil, sourceUrl: p.sourceUrl, disclosure: p.disclosure,
      regionIds: p.regionIds, hidden: p.hidden, sort: p.sortOrder,
    })),
  };
}
export type Catalog = ReturnType<typeof catalog>;

/** Тот же рендерер, что и в браузере (public/js/offers-render.js). */
type Renderer = {
  tabs(c: Catalog, city: string, type: string, bank: string | null, today: string): string;
  list(c: Catalog, city: string, type: string, bank: string | null, shown: number, today: string): { html: string; count: string; rest: number; more: string };
  banks(c: Catalog, city: string, bank: string | null, today: string): string;
  rail(c: Catalog, cur: string): string;
};
let renderer: Renderer | null = null;
export function render(): Renderer {
  if (!renderer) {
    const code = fs.readFileSync(path.join(ROOT, "public/js/offers-render.js"), "utf8");
    const ctx: { module: { exports: Partial<Renderer> } } = { module: { exports: {} } };
    vm.runInNewContext(code, ctx);
    renderer = ctx.module.exports as Renderer;
  }
  return renderer;
}
