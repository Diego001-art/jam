import { cities, cityPath, t, typePath, types } from "@/lib/content";
import { href } from "@/lib/paths";
import { Logo } from "./Logo";
import { disclosureText } from "./Disclosure";

export function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand"><Logo /><p data-t="footer.brand">{t("footer.brand")}</p></div>
          <div><h4>Продукты</h4><ul>
            {types.map((x) => (
              <li key={x.id}><a href={href(typePath(x))} data-type={x.id}>{x.name}</a></li>
            ))}
          </ul></div>
          <div><h4>Города</h4><ul className="foot-cities">
            {cities.filter((c) => c.indexStatus !== "archived").slice(0, 13).map((c) => (
              <li key={c.id}><a href={href(cityPath(c))}>{c.name}</a></li>
            ))}
            <li><a href={href("/goroda/")}>Показать все</a></li>
          </ul></div>
          <div><h4>Сервис</h4><ul>
            <li><a href={href("/kredity/")}>Каталог</a></li>
            <li><a href={href("/banki/")}>Банки</a></li>
            <li><a href={href("/kalkulyator/")}>Калькулятор</a></li>
            <li><a href={href("/sravnenie/")}>Сравнение</a></li>
            <li><a href={href("/voprosy/")}>Вопросы и ответы</a></li>
            <li><a href={href("/gid/")}>Гид</a></li>
            <li><a href={href("/o-proekte/")}>О проекте</a></li>
            <li><a href={href("/kontakty/")}>Контакты</a></li>
            <li><a href={href("/pravovaya-informatsiya/")}>Правовая информация</a></li>
          </ul></div>
        </div>
        <div className="foot-bottom">
          <p>Сервис не является банком и не выдаёт кредиты. {disclosureText()}</p>
          <span>© 2026</span>
        </div>
      </div>
    </footer>
  );
}
