import { Breadcrumbs } from "./Breadcrumbs";
import { Calculator } from "./Calculator";
import { Faq } from "./Faq";
import { PageHero } from "./Hero";
import { JsonLd } from "./JsonLd";
import { Offers } from "./Offers";
import { CatalogData } from "./Sections";
import { Shell } from "./Shell";
import { defaultCity } from "./Header";
import { bankTypePairs, bankTypePath, guides, lenderOf, publishedProducts, typePath } from "@/lib/content";
import { href } from "@/lib/paths";
import { productsLd, type Crumb } from "@/lib/seo";
import type { Lender, ProductType } from "@/lib/schemas";

const CREDIT = new Set(["cash", "auto", "pledge", "refi", "mortgage"]);
/** Страница вида продукта индексируется только при достаточном числе проверенных предложений. */
export const MIN_OFFERS = 3;

export const typeCrumbs = (ty: ProductType): Crumb[] =>
  ty.id === "deposit"
    ? [{ name: "Главная", path: "/" }, { name: ty.name, path: typePath(ty) }]
    : [{ name: "Главная", path: "/" }, { name: "Кредиты", path: "/kredity/" }, { name: ty.name, path: typePath(ty) }];

/** Страница вида продукта или пары «вид + банк». */
export function TypeView({ ty, lender }: { ty: ProductType; lender?: Lender }) {
  const c = defaultCity();
  const guide = guides.find((g) => g.status !== "archived");
  const own = publishedProducts.filter((p) => p.productType === ty.id && (!lender || p.lenderId === lender.id));
  const pairs = bankTypePairs().filter((x) => x.type.id === ty.id);
  const crumbs = lender ? [...typeCrumbs(ty), { name: lender.name, path: bankTypePath(ty, lender) }] : typeCrumbs(ty);
  const title = lender ? ty.name + " " + lender.name : ty.title;
  const dep = ty.id === "deposit";
  return (
    <Shell cityName={c.name}>
      <PageHero crumbs={<Breadcrumbs items={crumbs} />} title={title}
        text={dep
          ? "Сравните опубликованные условия вкладов. Перед открытием проверьте ставку, срок, пополнение, снятие и досрочное закрытие на официальном сайте банка."
          : "Сравните опубликованные условия. Перед оформлением проверьте ставку, ПСК и комиссии на официальном сайте банка."} />
      <main>
        <Offers cityId={c.id} type={ty.id} bank={lender?.id ?? null}
          title={<>{lender ? ty.name + " " + lender.name : ty.name} в&nbsp;<span data-city="loc" suppressHydrationWarning>{c.nameIn}</span></>} />
        {pairs.length ? (
          <section className="sec wrap">
            <div className="panel doc" data-reveal>
              <h2>{lender ? "Другие банки" : "По банкам"}</h2>
              <div className="link-chips">
                {pairs.filter((x) => x.lender.id !== lender?.id).map((x) => (
                  <a key={x.lender.id} className="chip" href={href(bankTypePath(ty, x.lender))}>{x.lender.name}{x.published ? <i>{x.published}</i> : null}</a>
                ))}
              </div>
              {lender ? <p className="meta-line"><a href={href("/banki/" + lender.slug + "/")}>Все продукты {lender.name}</a> · <a href={href(typePath(ty))}>Все {ty.name.toLowerCase()}</a></p> : null}
            </div>
          </section>
        ) : null}
        {lender ? null : (
          <section className="sec wrap">
            <div className="panel about" data-reveal>
              <h2>Как сравнивать</h2>
              <div className="about-txt">
                {dep ? (
                  <p>Смотрите не только на ставку: важны срок, возможность пополнения и снятия, порядок выплаты процентов и условия досрочного закрытия.</p>
                ) : (
                  <>
                    <p>Смотрите не только на ставку, но и на полную стоимость кредита (ПСК): она учитывает обязательные платежи по договору и выражается в процентах годовых и в рублях.</p>
                    <p>Уточните комиссии, стоимость дополнительных услуг и условия досрочного погашения. Ставка в карточке — диапазон из первичного источника; индивидуальные условия определяет банк.</p>
                  </>
                )}
                {guide ? <p><a href={href("/gid/" + guide.slug + "/")}>{guide.title}</a></p> : null}
              </div>
            </div>
          </section>
        )}
        {CREDIT.has(ty.id) && !lender ? <Calculator cityId={c.id} cityIn={c.nameIn} /> : null}
        {lender ? null : <Faq type={ty.id} />}
      </main>
      <JsonLd data={productsLd(own.map((p) => ({ p, lender: lenderOf(p.lenderId)! })), title)} />
      <CatalogData />
    </Shell>
  );
}
