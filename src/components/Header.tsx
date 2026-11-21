import { cities, t, typeById, typePath as tp } from "@/lib/content";
import { asset, href } from "@/lib/paths";
import { SiteLogo } from "./Logo";

const NAV: [string, string][] = [["cash", "Кредиты"], ["card", "Карты"], ["mortgage", "Ипотека"], ["auto", "Автокредиты"], ["deposit", "Вклады"]];
const typePath = (id: string) => href(tp(typeById(id)));

/** Город в шапке до работы скрипта — Москва либо город страницы. */
export function Header({ cityName }: { cityName: string }) {
  const logo = t("logo");
  return (
    <>
      <header className="top" id="top">
        <div className="wrap top-in">
          <a className="logo" href={href("/")} aria-label="На главную" data-i="logo">
            <SiteLogo src={logo ? asset(logo) : ""} />
          </a>
          <nav className="nav" aria-label="Основное меню">
            {NAV.map(([id, name]) => (
              <a key={id} href={typePath(id)} data-type={id}>{name}</a>
            ))}
            <a href={href("/banki/")} data-anchor="banks">Банки</a>
            <a href={href("/kalkulyator/")} data-anchor="calc">Калькулятор</a>
          </nav>
          <div className="top-act">
            <button type="button" className="city-chip" id="cityBtn" aria-label="Выбрать город">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 22s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></svg>
              <span data-city="name" suppressHydrationWarning>{cityName}</span>
            </button>
            <button type="button" className="burger" id="burger" aria-label="Открыть меню" aria-expanded="false" aria-controls="mnav"><span></span><span></span></button>
          </div>
        </div>
      </header>
      <div className="mnav" id="mnav" aria-hidden="true">
        <nav aria-label="Мобильное меню">
          {NAV.map(([id, name]) => (
            <a key={id} href={typePath(id)} data-type={id}>{name}</a>
          ))}
          <a href={href("/banki/")} data-anchor="banks">Банки</a>
          <a href={href("/kalkulyator/")} data-anchor="calc">Калькулятор</a>
          <a href={href("/goroda/")} data-anchor="cities">Города</a>
        </nav>
        <div className="mnav-foot"><button type="button" className="pill pill-soft" id="mCity">Город: <span data-city="name" suppressHydrationWarning>{cityName}</span></button></div>
      </div>
    </>
  );
}
export const defaultCity = () => cities.find((c) => c.id === "moscow") ?? cities[0];
