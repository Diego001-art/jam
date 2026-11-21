import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHero } from "@/components/Hero";
import { CatalogData } from "@/components/Sections";
import { Shell } from "@/components/Shell";
import { defaultCity } from "@/components/Header";
import { Disclosure } from "@/components/Disclosure";
import { pageMeta } from "@/lib/seo";

/** Сравнение выбранных предложений. Состав — в адресе после #, на сервер и в хранилище не уходит. Не индексируется. */
export const metadata = pageMeta({
  title: "Сравнение предложений банков",
  description: "Сравнение выбранных предложений банков: ставка, сумма, срок, требования, преимущества и недостатки.",
  path: "/sravnenie/",
  indexable: false,
});

export default function ComparePage() {
  const c = defaultCity();
  return (
    <Shell cityName={c.name}>
      <PageHero crumbs={<Breadcrumbs items={[{ name: "Главная", path: "/" }, { name: "Сравнение", path: "/sravnenie/" }]} />} title="Сравнение предложений"
        text="Выберите в списке предложений два-четыре варианта и нажмите «Сравнить». Различия в условиях будут выделены." />
      <main>
        <section className="sec wrap">
          <div id="cmp"><div className="empty-box">Выберите минимум два предложения в списке и нажмите «Сравнить».</div></div>
          <Disclosure />
        </section>
      </main>
      <CatalogData />
    </Shell>
  );
}
