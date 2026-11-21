import { t, typePath, types } from "@/lib/content";
import { asset, href } from "@/lib/paths";

const ORDER = ["cash", "card", "mortgage", "auto", "refi", "debit", "pledge"];

export function Tiles() {
  return (
    <>
      <div className="tiles-head" data-hero><h2 data-t="tiles.title">{t("tiles.title")}</h2></div>
      <div className="tiles" id="tiles">
        {ORDER.map((id) => {
          const ty = types.find((x) => x.id === id)!;
          const big = id === "cash";
          return (
            <a key={id} href={href(typePath(ty))} className={"tile" + (big ? " big" : "")} data-type={id}>
              {big ? (
                <div><div className="t" data-t={"tiles." + id + ".t"}>{t("tiles." + id + ".t")}</div><div className="s" data-t={"tiles." + id + ".s"}>{t("tiles." + id + ".s")}</div></div>
              ) : (
                <><div className="t" data-t={"tiles." + id + ".t"}>{t("tiles." + id + ".t")}</div><div className="s" data-t={"tiles." + id + ".s"}>{t("tiles." + id + ".s")}</div></>
              )}
              {big ? <span className="pill pill-ink" data-t="tiles.cash.btn">{t("tiles.cash.btn")}</span> : null}
              <img src={asset(t("tiles." + id + ".img"))} alt="" loading="lazy" data-i={"tiles." + id + ".img"} />
            </a>
          );
        })}
      </div>
    </>
  );
}
