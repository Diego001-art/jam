import { describe, expect, it } from "vitest";
import { catalog, cities, lenders, products, regions } from "@/lib/content";
import { sitemapPaths } from "@/lib/sitemap-urls";

describe("данные проекта", () => {
  it("все продукты ссылаются на существующих кредиторов", () => {
    const ids = new Set(lenders.map((l) => l.id));
    products.forEach((p) => expect(ids.has(p.lenderId)).toBe(true));
  });
  it("у каждого города есть регион", () => {
    const ids = new Set(regions.map((r) => r.id));
    cities.forEach((c) => expect(ids.has(c.regionId)).toBe(true));
  });
  it("в каталог для браузера не попадают непроверенные условия", () => {
    expect(catalog().offers.every((o) => o.sourceUrl && o.checkedAt && o.validUntil)).toBe(true);
  });
  it("старые партнёрские ссылки без маркировки на сайт не попадают", () => {
    expect(catalog().offers.every((o) => o.affiliateUrl === null)).toBe(true);
  });
  it("пока индексация выключена, sitemap пустой", () => {
    expect(sitemapPaths()).toEqual([]);
  });
});
