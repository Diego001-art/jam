import { DocPage, LEGAL_DRAFT } from "@/components/DocPage";
import { browserStorage, thirdParties } from "@/lib/privacy";
import { pageMeta } from "@/lib/seo";
import { site } from "@/lib/content";

export const metadata = pageMeta({ title: "Cookies, хранилище браузера и сторонние сервисы", description: "Что сайт хранит в браузере и к каким сторонним сервисам обращается.", path: "/pravovaya-informatsiya/cookies/", indexable: false });

export default function Cookies() {
  const tp = thirdParties();
  return (
    <DocPage crumbs={[{ name: "Главная", path: "/" }, { name: "Правовая информация", path: "/pravovaya-informatsiya/" }, { name: "Cookies", path: "/pravovaya-informatsiya/cookies/" }]} title="Cookies и сторонние сервисы" draft={LEGAL_DRAFT}>
      <h2>Cookies и аналитика</h2>
      {site.metrikaId
        ? <p>Сайт использует Яндекс Метрику только после вашего согласия в баннере. Без согласия счётчик не загружается и cookies аналитики не устанавливаются. Изменить выбор: <button type="button" className="pill pill-line" id="consentReset">сбросить выбор</button></p>
        : <p>Сайт не устанавливает cookies и не подключает системы аналитики. Шрифты и скрипты загружаются с этого же сайта.</p>}
      <h2>Хранилище браузера</h2>
      <div className="tbl-wrap"><table><thead><tr><th>Ключ</th><th>Назначение</th><th>Где</th><th>Срок</th></tr></thead><tbody>
        {browserStorage.map((s) => <tr key={s.key}><td>{s.key}</td><td>{s.purpose}</td><td>{s.where}</td><td>{s.expires}</td></tr>)}
      </tbody></table></div>
      <h2>Сторонние сервисы</h2>
      {tp.length ? (
        <div className="tbl-wrap"><table><thead><tr><th>Сервис</th><th>Назначение</th><th>Данные</th><th>Когда</th><th>Размещение</th></tr></thead><tbody>
          {tp.map((s) => <tr key={s.name}><td>{s.name}</td><td>{s.purpose}</td><td>{s.data}</td><td>{s.when}</td><td>{s.country}</td></tr>)}
        </tbody></table></div>
      ) : <p>Сайт не обращается к сторонним сервисам.</p>}
    </DocPage>
  );
}
