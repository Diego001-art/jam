import { DocPage } from "@/components/DocPage";
import { disclosureText } from "@/components/Disclosure";
import { href } from "@/lib/paths";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Правовая информация", description: "Раскрытие информации об операторе, политика обработки персональных данных, согласие и cookies.", path: "/pravovaya-informatsiya/" });

export default function Legal() {
  return (
    <DocPage crumbs={[{ name: "Главная", path: "/" }, { name: "Правовая информация", path: "/pravovaya-informatsiya/" }]} title="Правовая информация">
      <h2>Раскрытие</h2>
      <p>{disclosureText()}</p>
      <p>Сайт не является банком или иной финансовой организацией, не оказывает банковских услуг и не является официальным сайтом кредиторов. Названия банков используются для указания на источник информации.</p>
      <h2>Документы</h2>
      <ul>
        <li><a href={href("/pravovaya-informatsiya/soglashenie/")}>Пользовательское соглашение</a></li>
        <li><a href={href("/pravovaya-informatsiya/privacy/")}>Политика обработки персональных данных</a></li>
        <li><a href={href("/pravovaya-informatsiya/consent/")}>Согласие на обработку персональных данных</a></li>
        <li><a href={href("/pravovaya-informatsiya/cookies/")}>Cookies, хранилище браузера и сторонние сервисы</a></li>
      </ul>
    </DocPage>
  );
}
