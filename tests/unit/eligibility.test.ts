import { describe, expect, it } from "vitest";
import { availableIn, cityBlockers, isProductPublishable, productBlockers } from "@/lib/eligibility";
import { ProductSchema, type Lender, type Product, type City } from "@/lib/schemas";

const lender: Lender = {
  id: "bank", slug: "bank", name: "Банк", legalName: null, cbrLicense: null, officialUrl: "https://bank.example/", domain: "bank.example",
  colors: { c1: "#000000", c2: "#111111" }, logo: null, partnership: "none", status: "published", checkedAt: "2026-11-01", approvedBy: "Редактор",
  sources: [{ url: "https://bank.example/", title: "Сайт", checkedAt: "2026-11-01" }], notes: null,
};
const base: Product = ProductSchema.parse({
  id: "bank-cash", lenderId: "bank", productName: "Кредит", productType: "cash", url: "https://bank.example/cash", affiliateUrl: null,
  amountMin: 30000, amountMax: 5000000, termMin: 12, termMax: 60, rateMin: 19.9, rateMax: 34.9, pskMin: 20.1, pskMax: 35.5,
  gracePeriodDays: null, downPaymentMin: null, cashback: null, depositRate: null, fee: null, eligibility: [], conditions: null, tags: [],
  regionIds: ["*"], hidden: { districts: [], regions: [], cities: [] }, sourceUrl: "https://bank.example/cash", checkedAt: "2026-11-01",
  validUntil: "2026-12-31", status: "published", disclosure: null, approvedBy: "Редактор", sortOrder: 0,
});

describe("публикационный шлюз продукта", () => {
  it("пропускает полностью заполненный продукт", () => {
    expect(productBlockers(base, lender, "2026-11-20")).toEqual([]);
  });
  it("скрывает просроченное условие", () => {
    expect(isProductPublishable(base, lender, "2027-01-01")).toBe(false);
  });
  it("не пропускает ставку без ПСК", () => {
    expect(productBlockers({ ...base, pskMin: null, pskMax: null }, lender, "2026-11-20").join()).toMatch(/ПСК/);
  });
  it("не пропускает без источника и редактора", () => {
    const b = productBlockers({ ...base, sourceUrl: null, approvedBy: null }, lender, "2026-11-20");
    expect(b).toContain("нет первичного источника");
    expect(b).toContain("нет подтверждения редактора");
  });
  it("не пропускает неопубликованного кредитора", () => {
    expect(isProductPublishable(base, { ...lender, status: "draft" }, "2026-11-20")).toBe(false);
  });
  it("требует раскрытие для партнёрской ссылки", () => {
    expect(productBlockers({ ...base, affiliateUrl: "https://aff.example/x" }, lender, "2026-11-20").join()).toMatch(/раскрыти/);
  });
});

describe("доступность по регионам", () => {
  it("вся Россия", () => expect(availableIn(base, "kazan", "tat", "pfo")).toBe(true));
  it("скрыт во всём округе", () => expect(availableIn({ ...base, hidden: { districts: ["pfo"], regions: [], cities: [] } }, "kazan", "tat", "pfo")).toBe(false));
  it("скрыт в одном городе региона", () => {
    const p = { ...base, hidden: { districts: [], regions: [], cities: ["sochi"] } };
    expect(availableIn(p, "sochi", "krd", "yufo")).toBe(false);
    expect(availableIn(p, "krasnodar", "krd", "yufo")).toBe(true);
  });
  it("доступен только в указанных регионах", () => {
    const p = { ...base, regionIds: ["msk"] };
    expect(availableIn(p, "moscow", "msk", "cfo")).toBe(true);
    expect(availableIn(p, "kazan", "tat", "pfo")).toBe(false);
  });
});

describe("шлюз городской страницы", () => {
  const city: City = {
    id: "kazan", slug: "kazan", name: "Казань", nameIn: "Казани", regionId: "tat", geoMatch: "kazan", banner: "b", thumb: "t",
    indexStatus: "published", indexable: true, population: null, searchEvidence: "Вордстат", localFacts: [], contentVersion: 1, editor: "Редактор", reviewedAt: "2026-11-01",
  };
  it("одного названия города недостаточно", () => {
    expect(cityBlockers(city, 3)).toContain("нет проверенных локальных фактов");
    expect(cityBlockers({ ...city, localFacts: [{ text: "Факт", source: { url: "https://x.example/", title: "Источник", checkedAt: "2026-11-01" } }] }, 0)).toContain("нет опубликованных предложений, доступных в городе");
  });
});

import { offerBlockers } from "@/lib/eligibility";
import { OfferSchema } from "@/lib/schemas";
import { partnerOffers } from "@/lib/content";

describe("партнёрские офферы", () => {
  const offer = OfferSchema.parse({ id: "o1", productId: "p1", status: "published", advertiser: null, erid: null, disclosure: null, approvedBy: null });
  it("оффер без продукта и раскрытия не проходит шлюз", () => {
    const b = offerBlockers(offer, undefined, undefined);
    expect(b).toContain("продукт не найден");
    expect(b).toContain("нет раскрытия партнёрского характера ссылки");
    expect(b).toContain("не указан рекламодатель для маркировки");
  });
  it("черновик оффера не публикуется", () => {
    expect(offerBlockers({ ...offer, status: "draft" }, undefined, undefined)).toContain("статус оффера не «published»");
  });
  it("в публичном репозитории нет ссылок и сумм вознаграждения", () => {
    partnerOffers.forEach((o) => expect(Object.keys(o).sort()).toEqual(["advertiser", "approvedBy", "disclosure", "erid", "id", "productId", "status"]));
  });
});
