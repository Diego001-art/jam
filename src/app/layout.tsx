import type { Metadata, Viewport } from "next";
import "@fontsource/onest/cyrillic-400.css";
import "@fontsource/onest/cyrillic-500.css";
import "@fontsource/onest/cyrillic-600.css";
import "@fontsource/onest/cyrillic-700.css";
import "@fontsource/onest/latin-400.css";
import "@fontsource/onest/latin-500.css";
import "@fontsource/onest/latin-600.css";
import "@fontsource/onest/latin-700.css";
import "@/styles/site.css";
import "@/styles/pages.css";
import { site } from "@/lib/content";
import { BASE_PATH, asset } from "@/lib/paths";
import { organizationLd } from "@/lib/seo";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/JsonLd";
import { SiteInit } from "@/components/SiteInit";

export const metadata: Metadata = {
  metadataBase: new URL(new URL(site.siteUrl).origin),
  title: { default: "Сравнение кредитов банков России по городам", template: "%s" },
  icons: { icon: asset("logo-bird.svg") },
  robots: site.indexing ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#FFFFFF" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" data-base={BASE_PATH} data-geo={site.geoLookup ? "1" : "0"} data-metrika={site.metrikaId ?? undefined}>
      <body>
        {children}
        <Footer />
        {site.metrikaId ? (
          <div className="consent" id="consent" role="dialog" aria-label="Согласие на аналитику" hidden>
            <p>Мы хотим использовать Яндекс Метрику, чтобы понимать, какие разделы полезны. Счётчик включится только с вашего согласия. <a href={asset("pravovaya-informatsiya/cookies/")}>Подробнее</a></p>
            <div><button type="button" className="pill pill-ink" id="consentYes">Разрешить</button><button type="button" className="pill pill-line" id="consentNo">Отказаться</button></div>
          </div>
        ) : null}
        <JsonLd data={organizationLd()} />
        <SiteInit />
        <script defer src={asset("vendor/gsap.min.js")} />
        <script defer src={asset("vendor/ScrollTrigger.min.js")} />
        <script defer src={asset("js/offers-render.js")} />
        <script defer src={asset("js/site.js")} />
      </body>
    </html>
  );
}
