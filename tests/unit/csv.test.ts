import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "@/lib/csv";
import { exportProducts, importProducts } from "@/lib/products-csv";
import { ProductSchema, type Lender, type Product } from "@/lib/schemas";

const base = (o: Partial<Product> = {}): Product => ProductSchema.parse({
  id: "b-cash", lenderId: "b", productName: "Кредит", productType: "cash", url: null, affiliateUrl: null, amountMin: null, amountMax: null, termMin: null, termMax: null,
  rateMin: null, rateMax: null, pskMin: null, pskMax: null, gracePeriodDays: null, downPaymentMin: null, cashback: null, depositRate: null, fee: null, eligibility: [], conditions: null,
  tags: [], regionIds: ["*"], hidden: { districts: [], regions: [], cities: [] }, sourceUrl: null, checkedAt: null, validUntil: null, status: "draft", disclosure: null, approvedBy: null, sortOrder: 0, ...o,
});
const lenders = [{ id: "b" }] as Lender[];

describe("CSV", () => {
  it("кавычки, разделители и переводы строк переживают круг", () => {
    const csv = toCsv(["a", "b"], [["x;y", 'он сказал "да"\nещё'], [1.5, null]]);
    expect(parseCsv(csv).rows).toEqual([{ a: "x;y", b: 'он сказал "да"\nещё' }, { a: "1.5", b: "" }]);
  });
  it("формулы Excel нейтрализуются", () => {
    expect(toCsv(["a"], [["=1+1"], ["@cmd"]])).toContain("'=1+1");
  });
  it("запятая и табуляция как разделитель определяются сами", () => {
    expect(parseCsv("a,b\n1,2").rows).toEqual([{ a: "1", b: "2" }]);
    expect(parseCsv("a\tb\n1\t2").rows).toEqual([{ a: "1", b: "2" }]);
  });
});

describe("импорт продуктов", () => {
  it("круг экспорт → импорт не меняет данные", () => {
    const p = base({ rateMin: 10.5, pskMin: 11, pros: ["А", "Б"], regionIds: ["msk", "spb"] });
    const { products, report } = importProducts([p], lenders, exportProducts([p]));
    expect(report.errors).toEqual([]);
    expect(products[0]).toEqual(p);
  });
  it("новый продукт создаётся черновиком и без подтверждения", () => {
    const { products, report } = importProducts([], lenders, "id;lenderId;productName;productType;rateMin\nn1;b;Новый;cash;12,5");
    expect(report.created).toBe(1);
    expect(products[0]).toMatchObject({ status: "draft", approvedBy: null, rateMin: 12.5, affiliateUrl: null });
  });
  it("опубликованный продукт с изменёнными условиями возвращается на проверку", () => {
    const p = base({ status: "published", approvedBy: "Редактор", rateMin: 10, pskMin: 11 });
    const { products, report } = importProducts([p], lenders, "id;lenderId;productName;productType;rateMin\nb-cash;b;Кредит;cash;9");
    expect(report.backToReview).toEqual(["b-cash"]);
    expect(products[0]).toMatchObject({ status: "review", approvedBy: null });
  });
  it("импорт без изменения условий не снимает публикацию, а статус через CSV не меняется", () => {
    const p = base({ status: "published", approvedBy: "Редактор" });
    const { products } = importProducts([p], lenders, "id;lenderId;productName;productType;status;approvedBy\nb-cash;b;Кредит;cash;draft;Другой");
    expect(products[0]).toMatchObject({ status: "published", approvedBy: "Редактор" });
  });
  it("любая ошибка отменяет весь импорт", () => {
    const p = base();
    const csv = "id;lenderId;productName;productType;rateMin\nb-cash;b;Кредит;cash;5\nx;unknown;Т;cash;1\ny;b;Т;cash;abc";
    const { products, report } = importProducts([p], lenders, csv);
    expect(report.errors).toHaveLength(2);
    expect(products).toEqual([p]);
  });
});
