import { notFound } from "next/navigation";
import { TypeView } from "@/components/TypeView";
import { bankTypePairs, bankTypePath } from "@/lib/content";
import { lenderBlockers } from "@/lib/eligibility";
import { absolute, pageMeta } from "@/lib/seo";
import { href } from "@/lib/paths";

type P = { params: Promise<{ bank: string }> };
export const dynamicParams = false;
const pairs = () => bankTypePairs().filter((x) => x.type.id === "deposit");
/** Next требует хотя бы один параметр при статической сборке; при отсутствии вкладов — служебная заглушка 404. */
export function generateStaticParams() {
  const p = pairs().map((x) => ({ bank: x.lender.slug }));
  return p.length ? p : [{ bank: "_" }];
}
const find = async (params: P["params"]) => { const b = (await params).bank; return pairs().find((x) => x.lender.slug === b); };
export async function generateMetadata({ params }: P) {
  const x = await find(params);
  if (!x) return { title: "Вклады — раздел банка", robots: { index: false, follow: true }, alternates: { canonical: absolute("/vklady/") } };
  return pageMeta({
    title: "Вклады " + x.lender.name + " — условия и сравнение",
    description: "Вклады " + x.lender.name + ": опубликованные условия с источником и датой проверки, переход на официальный сайт банка.",
    path: bankTypePath(x.type, x.lender),
    indexable: x.published > 0 && lenderBlockers(x.lender).length === 0,
  });
}
export default async function DepositBank({ params }: P) {
  const x = await find(params);
  const b = (await params).bank;
  if (!x && b === "_") return (
    <main className="redir"><meta httpEquiv="refresh" content={"0; url=" + href("/vklady/")} /><p><a href={href("/vklady/")}>Все вклады</a></p></main>
  );
  if (!x) notFound();
  return <TypeView ty={x.type} lender={x.lender} />;
}
