import { MIN_OFFERS, TypeView } from "@/components/TypeView";
import { publishedProducts, typeById, typePath } from "@/lib/content";
import { pageMeta } from "@/lib/seo";

const ty = typeById("deposit");
export const metadata = pageMeta({
  title: ty.title + " — сравнение условий банков",
  description: "Банковские вклады: ставка, срок и сумма по опубликованным условиям банков с датой проверки.",
  path: typePath(ty),
  indexable: publishedProducts.filter((p) => p.productType === "deposit").length >= MIN_OFFERS,
});
export default function Deposits() {
  return <TypeView ty={ty} />;
}
