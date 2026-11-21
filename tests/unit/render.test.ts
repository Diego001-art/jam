import { describe, expect, it } from "vitest";
import { render } from "@/lib/content";

const cat = {
  base: "/jam", pageSize: 10, today: "2026-11-22", types: [{ id: "cash", slug: "potrebitelskiy", name: "Кредиты", one: "Кредит наличными" }],
  regions: [{ id: "msk", slug: "moskva", name: "Москва", districtId: "cfo" }],
  cities: [{ id: "moscow", slug: "moskva", name: "Москва", nameIn: "Москве", regionId: "msk", banner: "", thumb: "", geo: "" }],
  lenders: [{ id: "b1", slug: "b1", name: "Банк 1", url: "https://b1.example/", domain: "b1.example", c1: "#111111", c2: "#222222", logo: null },
            { id: "b2", slug: "b2", name: "Банк 2", url: "https://b2.example/", domain: "b2.example", c1: "#111111", c2: "#222222", logo: null }],
  offers: [
    { id: "p1", lenderId: "b1", type: "cash", name: "Кредит А", url: "https://b1.example/a", affiliateUrl: null, goUrl: "https://go.example/go/o1/?erid=2Vtzq1", ad: { advertiser: "ООО «Рекламодатель», ИНН 7700000000", erid: "2Vtzq1" }, pros: ["Без залога"], cons: [], eligibility: ["Паспорт РФ"],
      metrics: [["Ставка", "от 10%", "ПСК 11%"], ["Сумма", "до 1 000 000 ₽", null], ["Срок", "до 5 лет", null]], tags: [], checkedAt: "2026-11-01", validUntil: "2027-01-01", sourceUrl: "https://b1.example/s", regionIds: ["*"], hidden: { districts: [], regions: [], cities: [] }, sort: 0 },
    { id: "p2", lenderId: "b2", type: "cash", name: "Кредит Б", url: "https://b2.example/b", affiliateUrl: null, goUrl: null, pros: [], cons: ["Комиссия"], eligibility: ["Паспорт РФ"],
      metrics: [["Ставка", "от 12%", null], ["Сумма", "до 1 000 000 ₽", null], ["Срок", "до 7 лет", null]], tags: [], checkedAt: "2026-11-02", validUntil: "2027-01-01", sourceUrl: "https://b2.example/s", regionIds: ["*"], hidden: { districts: [], regions: [], cities: [] }, sort: 1 },
  ],
};

describe("рендер предложений", () => {
  const R = render() as unknown as { list: Function; compare: Function };
  it("кнопка ведёт на /go/, помечена как партнёрская, есть «Сравнить» и плюсы/минусы", () => {
    const html = R.list(cat, "moscow", "cash", null, 10, "2026-11-22").html as string;
    expect(html).toContain('href="https://go.example/go/o1/?erid=2Vtzq1"');
    expect(html).toContain("Реклама. ООО «Рекламодатель», ИНН 7700000000. erid: 2Vtzq1");
    expect(html).toContain('data-go="1"');
    expect(html).toContain("sponsored nofollow");
    expect(html).toContain('data-cmp="p1"');
    expect(html).toContain("Без залога");
    // без бэкенда — прямая ссылка на банк, без пометок партнёрской
    expect(html).toContain('href="https://b2.example/b"');
  });
  it("сравнение выделяет различия и экранирует данные", () => {
    const html = R.compare(cat, ["p1", "p2"]) as string;
    expect(html).toContain('class="diff"');
    expect(html).toContain("Кредит А");
    expect(html).toContain("Реклама. ООО «Рекламодатель»");
    const evil = JSON.parse(JSON.stringify(cat)); evil.offers[0].name = "<script>x</script>";
    expect(R.compare(evil, ["p1", "p2"]) as string).not.toContain("<script>");
  });
  it("меньше двух предложений — подсказка, неизвестные id игнорируются", () => {
    expect(R.compare(cat, ["p1", "nope"]) as string).toContain("минимум два");
    expect(R.compare(cat, []) as string).toContain("минимум два");
  });
});
