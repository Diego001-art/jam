import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHero } from "@/components/Hero";
import { Offers } from "@/components/Offers";
import { CatalogData } from "@/components/Sections";
import { Shell } from "@/components/Shell";
import { defaultCity } from "@/components/Header";
import { publishedProducts, typePath, types } from "@/lib/content";
import { href } from "@/lib/paths";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Каталог кредитных предложений банков", description: "Кредиты наличными, кредитные карты, ипотека и автокредиты: опубликованные условия банков с источником и датой проверки.", path: "/kredity/" });

export default function Catalog() {
  const c = defaultCity();
  return (
    <Shell cityName={c.name}>
      <PageHero crumbs={<Breadcrumbs items={[{ name: "Главная", path: "/" }, { name: "Кредиты", path: "/kredity/" }]} />} title="Каталог кредитных предложений"
        text="Условия публикуются только с первичным источником и датой проверки. Решение о кредите и итоговую ставку определяет банк.">
        <div className="hero-cta" data-hero>
          {types.filter((x) => x.id !== "deposit").map((x) => <a key={x.id} className="pill pill-soft" href={href(typePath(x))}>{x.name}</a>)}
        </div>
      </PageHero>
      <main>
        <Offers cityId={c.id} type="cash" title={<>Предложения в&nbsp;<span data-city="loc" suppressHydrationWarning>{c.nameIn}</span></>} />
        {publishedProducts.length === 0 ? (
          <section className="sec wrap"><div className="panel doc" data-reveal><p className="pend">Проверенных условий пока нет: показаны банки со ссылкой на их официальные сайты. Условия появятся после редакционной проверки.</p></div></section>
        ) : null}
      </main>
      <CatalogData />
    </Shell>
  );
}
