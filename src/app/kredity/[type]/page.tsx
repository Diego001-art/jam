import { notFound } from "next/navigation";
import { MIN_OFFERS, TypeView } from "@/components/TypeView";
import { publishedProducts, typePath, types } from "@/lib/content";
import { pageMeta } from "@/lib/seo";

type P = { params: Promise<{ type: string }> };
export const dynamicParams = false;
/** Вклады — отдельный раздел /vklady/. */
const credits = () => types.filter((x) => x.id !== "deposit");
export function generateStaticParams() {
  return credits().map((x) => ({ type: x.slug }));
}
export async function generateMetadata({ params }: P) {
  const slug = (await params).type;
  const ty = credits().find((x) => x.slug === slug);
  if (!ty) return {};
  const n = publishedProducts.filter((p) => p.productType === ty.id).length;
  return pageMeta({ title: ty.title + " — сравнение условий банков", description: ty.title + ": ставка, ПСК, сумма и срок по опубликованным условиям банков с датой проверки.", path: typePath(ty), indexable: n >= MIN_OFFERS });
}
export default async function TypePage({ params }: P) {
  const slug = (await params).type;
  const ty = credits().find((x) => x.slug === slug);
  if (!ty) notFound();
  return <TypeView ty={ty} />;
}
