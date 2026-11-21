import type { Metadata } from "next";
import { site } from "./content";
import { href } from "./paths";

const origin = () => new URL(site.siteUrl).origin;
/** Абсолютный канонический адрес страницы. */
export const absolute = (path: string) => origin() + href(path);

type PageMeta = { title: string; description: string; path: string; indexable?: boolean; type?: "website" | "article" };

/**
 * Метаданные страницы. Пока site.indexing = false, все страницы закрыты noindex
 * независимо от флага страницы (ТЗ: проект не запущен).
 */
export function pageMeta({ title, description, path, indexable = true, type = "website" }: PageMeta): Metadata {
  const index = site.indexing && indexable;
  return {
    title,
    description,
    alternates: { canonical: absolute(path) },
    robots: index ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: { title, description, url: absolute(path), siteName: site.siteName, locale: "ru_RU", type },
  };
}

export type Crumb = { name: string; path: string };

export function breadcrumbLd(items: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: absolute(c.path) })),
  };
}

/** Organization — только когда реквизиты оператора заполнены. */
export function organizationLd() {
  const o = site.operator;
  if (!o.name || !o.inn) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: o.name,
    url: absolute("/"),
    ...(o.email ? { email: o.email } : {}),
    ...(o.address ? { address: o.address } : {}),
    taxID: o.inn,
  };
}

/** Schema.org для опубликованных продуктов (только прошедшие шлюз). Пусто — разметки нет. */
export function productsLd(items: { p: import("./schemas").Product; lender: import("./schemas").Lender }[], name: string) {
  if (!items.length) return null;
  const range = (min: number | null, max: number | null, extra: Record<string, unknown>) =>
    min == null && max == null ? undefined : { "@type": "QuantitativeValue", ...(min != null ? { minValue: min } : {}), ...(max != null ? { maxValue: max } : {}), ...extra };
  const credit = new Set(["cash", "card", "mortgage", "auto", "refi", "pledge"]);
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: items.map(({ p, lender }, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": credit.has(p.productType) ? "LoanOrCredit" : p.productType === "deposit" ? "DepositAccount" : "FinancialProduct",
        name: p.productName,
        provider: { "@type": "BankOrCreditUnion", name: lender.name, url: lender.officialUrl },
        ...(p.url ? { url: p.url } : {}),
        ...(range(p.rateMin, p.rateMax, { unitText: "%" }) ? { interestRate: range(p.rateMin, p.rateMax, { unitText: "%" }) } : {}),
        ...(credit.has(p.productType) && range(p.pskMin, p.pskMax, { unitText: "%" }) ? { annualPercentageRate: range(p.pskMin, p.pskMax, { unitText: "%" }) } : {}),
        ...(p.amountMin != null || p.amountMax != null ? { amount: { "@type": "MonetaryAmount", currency: "RUB", ...(p.amountMin != null ? { minValue: p.amountMin } : {}), ...(p.amountMax != null ? { maxValue: p.amountMax } : {}) } } : {}),
        ...(credit.has(p.productType) && range(p.termMin, p.termMax, { unitCode: "MON" }) ? { loanTerm: range(p.termMin, p.termMax, { unitCode: "MON" }) } : {}),
      },
    })),
  };
}

export function faqLd(items: { q: string; a: string }[]) {
  if (!items.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })),
  };
}
