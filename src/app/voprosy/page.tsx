import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Faq } from "@/components/Faq";
import { PageHero } from "@/components/Hero";
import { Shell } from "@/components/Shell";
import { defaultCity } from "@/components/Header";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Вопросы и ответы о сервисе сравнения", description: "Как работает сайт сравнения банковских продуктов, откуда берутся условия, что означает пометка «Реклама» и как сравнить предложения.", path: "/voprosy/" });

export default function Questions() {
  const c = defaultCity();
  return (
    <Shell cityName={c.name}>
      <PageHero crumbs={<Breadcrumbs items={[{ name: "Главная", path: "/" }, { name: "Вопросы и ответы", path: "/voprosy/" }]} />} title="Вопросы и ответы" />
      <main><Faq title="Частые вопросы" /></main>
    </Shell>
  );
}
