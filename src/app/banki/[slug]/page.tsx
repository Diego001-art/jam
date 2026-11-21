import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHero } from "@/components/Hero";
import { Offers } from "@/components/Offers";
import { CatalogData } from "@/components/Sections";
import { Shell } from "@/components/Shell";
import { defaultCity } from "@/components/Header";
import { bankTypePairs, bankTypePath, publishedProducts, site, types, visibleLenders } from "@/lib/content";
import { href } from "@/lib/paths";
import { lenderBlockers } from "@/lib/eligibility";
import { dateRu } from "@/lib/format";
import { pageMeta } from "@/lib/seo";

type P = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() {
  return visibleLenders.map((l) => ({ slug: l.slug }));
}
export async function generateMetadata({ params }: P) {
  const prm = await params;
  const l = visibleLenders.find((x) => x.slug === prm.slug);
  if (!l) return {};
  return pageMeta({ title: l.name + " — кредиты и условия, официальный сайт", description: l.name + ": опубликованные условия продуктов с источником и датой проверки, ссылка на официальный сайт.", path: "/banki/" + l.slug + "/", indexable: lenderBlockers(l).length === 0 });
}

export default async function Lender({ params }: P) {
  const prm = await params;
  const l = visibleLenders.find((x) => x.slug === prm.slug);
  if (!l) notFound();
  const c = defaultCity();
  const own = publishedProducts.filter((p) => p.lenderId === l.id);
  const firstType = own[0]?.productType ?? "cash";
  const verified = lenderBlockers(l).length === 0;
  return (
    <Shell cityName={c.name}>
      <PageHero crumbs={<Breadcrumbs items={[{ name: "Главная", path: "/" }, { name: "Банки", path: "/banki/" }, { name: l.name, path: "/banki/" + l.slug + "/" }]} />} title={l.name}
        text={<>Официальный сайт: <a href={l.officialUrl} target="_blank" rel="noopener">{l.domain}</a>. Сайт сравнения не является официальным сайтом банка.</>} />
      <main>
        <Offers cityId={c.id} type={firstType} bank={l.id} title={<>Продукты {l.name}</>} text="Только продукты с проверенными условиями. Наличие в вашем городе уточняйте у банка." />
        <section className="sec wrap">
          <div className="panel doc" data-reveal>
            <h2>Сведения о кредиторе</h2>
            {verified ? null : <p className="draft-note">Сведения о банке ещё не проверены редакцией. До проверки показываются только название и ссылка на официальный сайт.</p>}
            <div className="tbl-wrap"><table><tbody>
              <tr><th>Полное наименование</th><td>{l.legalName ?? <span className="pend">не указано</span>}</td></tr>
              <tr><th>Лицензия Банка России</th><td>{l.cbrLicense ?? <span className="pend">не указано</span>}</td></tr>
              <tr><th>Официальный сайт</th><td><a href={l.officialUrl} target="_blank" rel="noopener">{l.domain}</a></td></tr>
              <tr><th>Партнёрство с сайтом</th><td>{l.partnership === "none" ? "нет" : site.commercial.disclosure ?? "есть"}</td></tr>
              <tr><th>Проверено</th><td>{l.checkedAt ? dateRu(l.checkedAt) + (l.approvedBy ? ", " + l.approvedBy : "") : "—"}</td></tr>
              <tr><th>Виды продуктов</th><td>{[...new Set(own.map((p) => types.find((t) => t.id === p.productType)!.name))].join(", ") || "—"}</td></tr>
            </tbody></table></div>
            {bankTypePairs().some((x) => x.lender.id === l.id) ? (<><h3>Разделы по видам продуктов</h3><div className="link-chips">{bankTypePairs().filter((x) => x.lender.id === l.id).map((x) => <a key={x.type.id} className="chip" href={href(bankTypePath(x.type, x.lender))}>{x.type.name}</a>)}</div></>) : null}
            {l.sources.length ? (<><h3>Источники</h3><ul>{l.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener nofollow">{s.title}</a>, {dateRu(s.checkedAt)}</li>)}</ul></>) : null}
          </div>
        </section>
      </main>
      <CatalogData />
    </Shell>
  );
}
