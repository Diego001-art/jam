import { faq } from "@/lib/content";
import { faqLd } from "@/lib/seo";
import { JsonLd } from "./JsonLd";

export const faqFor = (type?: string) => faq.filter((x) => !type || x.types.includes("*") || x.types.includes(type));

/** Блок вопросов и ответов с разметкой FAQPage. */
export function Faq({ type, title = "Вопросы и ответы", ld = true }: { type?: string; title?: string; ld?: boolean }) {
  const items = faqFor(type);
  if (!items.length) return null;
  return (
    <section className="sec wrap">
      <div className="panel doc faq" data-reveal>
        <h2>{title}</h2>
        {items.map((x) => (
          <details key={x.q}><summary>{x.q}</summary><p>{x.a}</p></details>
        ))}
      </div>
      {ld ? <JsonLd data={faqLd(items)} /> : null}
    </section>
  );
}
