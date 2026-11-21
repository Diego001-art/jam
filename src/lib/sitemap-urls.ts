import { bankTypePairs, bankTypePath, cities, cityPath, guides, lenders, offersInCity, publishedProducts, site, typePath, types } from "./content";
import { isCityIndexable, isGuideIndexable, lenderBlockers } from "./eligibility";

/**
 * Только канонические индексируемые страницы. Пока site.indexing = false — пусто.
 * Формы, фильтры, параметры, черновики и тонкие страницы не включаются.
 */
export function sitemapPaths(): string[] {
  if (!site.indexing) return [];
  const out = ["/", "/kredity/", "/banki/", "/goroda/", "/gid/", "/kalkulyator/", "/o-proekte/", "/kontakty/", "/pravovaya-informatsiya/", "/voprosy/"];
  types.forEach((t) => { if (publishedProducts.filter((p) => p.productType === t.id).length >= 3) out.push(typePath(t)); });
  bankTypePairs().forEach((x) => { if (x.published > 0 && lenderBlockers(x.lender).length === 0) out.push(bankTypePath(x.type, x.lender)); });
  lenders.forEach((l) => { if (lenderBlockers(l).length === 0) out.push("/banki/" + l.slug + "/"); });
  cities.forEach((c) => { if (isCityIndexable(c, offersInCity(c).length, site)) out.push(cityPath(c)); });
  guides.forEach((g) => { if (isGuideIndexable(g, site)) out.push("/gid/" + g.slug + "/"); });
  return out;
}
