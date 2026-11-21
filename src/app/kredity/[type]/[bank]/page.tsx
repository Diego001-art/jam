import { notFound } from "next/navigation";
import { TypeView } from "@/components/TypeView";
import { bankTypePairs, bankTypePath } from "@/lib/content";
import { lenderBlockers } from "@/lib/eligibility";
import { pageMeta } from "@/lib/seo";

/**
 * «Вид + банк»: создаётся только при наличии продукта этого вида у банка в данных.
 * Индексируется только при опубликованном продукте и проверенном банке.
 */
type P = { params: Promise<{ type: string; bank: string }> };
export const dynamicParams = false;
const pairs = () => bankTypePairs().filter((x) => x.type.id !== "deposit");
export function generateStaticParams() {
  return pairs().map((x) => ({ type: x.type.slug, bank: x.lender.slug }));
}
const find = async (params: P["params"]) => { const p = await params; return pairs().find((x) => x.type.slug === p.type && x.lender.slug === p.bank); };
export async function generateMetadata({ params }: P) {
  const x = await find(params);
  if (!x) return {};
  return pageMeta({
    title: x.type.name + " " + x.lender.name + " — условия и сравнение",
    description: x.type.name + " " + x.lender.name + ": опубликованные условия с источником и датой проверки, переход на официальный сайт банка.",
    path: bankTypePath(x.type, x.lender),
    indexable: x.published > 0 && lenderBlockers(x.lender).length === 0,
  });
}
export default async function BankTypePage({ params }: P) {
  const x = await find(params);
  if (!x) notFound();
  return <TypeView ty={x.type} lender={x.lender} />;
}
