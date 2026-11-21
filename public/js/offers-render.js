/*
 * Отрисовка предложений, банков и городов.
 * Один и тот же код используется при сборке страниц (HTML для поисковиков)
 * и в браузере при смене города/вида продукта — разметка всегда совпадает.
 */
(function (root) {
  "use strict";
  var esc = function (t) {
    return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };
  function plural(n, a, b, c) { var m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c; }
  function dateRu(iso) { return iso ? iso.split("-").reverse().join(".") : ""; }
  function find(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }

  function place(cat, cityId) {
    var c = find(cat.cities, cityId) || cat.cities[0];
    var r = find(cat.regions, c.regionId) || {};
    return { city: c.id, region: r.id || "", district: r.districtId || "" };
  }
  function available(o, pl, today) {
    if (o.validUntil && today && o.validUntil < today) return false;
    if (o.regionIds.indexOf("*") < 0 && o.regionIds.indexOf(pl.region) < 0) return false;
    var h = o.hidden;
    return !(h.cities.indexOf(pl.city) > -1 || h.regions.indexOf(pl.region) > -1 || h.districts.indexOf(pl.district) > -1);
  }
  function offersOf(cat, cityId, type, bankId, today) {
    var pl = place(cat, cityId), out = [];
    cat.offers.forEach(function (o) {
      if (o.type !== type) return;
      if (bankId && o.lenderId !== bankId) return;
      if (!find(cat.lenders, o.lenderId)) return;
      if (available(o, pl, today)) out.push(o);
    });
    out.sort(function (a, b) { return a.sort - b.sort; });
    return out;
  }
  function thumb(l, base) {
    return l.logo
      ? '<span class="oc-thumb logo" aria-hidden="true"><img src="' + esc(/^(https?:|data:)/.test(l.logo) ? l.logo : base + "/" + l.logo) + '" alt=""></span>'
      : '<span class="oc-thumb" style="--c1:' + esc(l.c1) + ";--c2:" + esc(l.c2) + '" aria-hidden="true"><b>' + esc(l.name) + "</b><i></i></span>";
  }
  /** Маркировка рекламы: «Реклама», рекламодатель, ERID. */
  function adLabel(o) {
    var a = o.ad || {};
    return '<span class="hl">Реклама' + (a.advertiser ? ". " + esc(a.advertiser) : "") + (a.erid ? ". erid: " + esc(a.erid) : "") + "</span>";
  }
  function tabs(cat, cityId, type, bankId, today) {
    return cat.types.map(function (t) {
      var n = offersOf(cat, cityId, t.id, bankId, today).length, on = t.id === type;
      return '<button type="button" class="chip' + (on ? " on" : "") + '" role="tab" aria-selected="' + on + '" data-type="' + t.id + '">' + esc(t.name) + (n ? " <i>" + n + "</i>" : "") + "</button>";
    }).join("");
  }
  function row(cat, o, l, t, hidden, base) {
    var mets, go, tags = [];
    if (o) {
      var have = o.metrics.some(function (m) { return m[1]; });
      mets = have
        ? '<div class="oc-mets">' + o.metrics.map(function (m) {
            return '<div class="oc-m"><span>' + esc(m[0]) + "</span><b>" + (m[1] ? esc(m[1]) : "—") + "</b>" + (m[2] ? "<small>" + esc(m[2]) + "</small>" : "") + "</div>";
          }).join("") + "</div>"
        : '<div class="oc-note">Условия — на сайте банка</div>';
      var paid = o.goUrl || o.affiliateUrl, href = o.goUrl || o.affiliateUrl || o.url || l.url;
      go = '<a class="pill pill-ink oc-go" href="' + esc(href) + '"' + (o.goUrl ? ' data-go="1"' : "") + ' target="_blank" rel="noopener' + (paid ? " sponsored nofollow" : "") + '">Перейти на сайт банка</a>';
      if (paid) tags.push(adLabel(o));
      if (o.checkedAt) tags.push("<span>Проверено " + dateRu(o.checkedAt) + "</span>");
      if (o.sourceUrl) tags.push('<a class="tag-link" href="' + esc(o.sourceUrl) + '" target="_blank" rel="noopener nofollow">Источник ↗</a>');
      o.tags.forEach(function (x) { tags.push("<span>" + esc(x) + "</span>"); });
      tags.push("<span>Сайт: " + esc(l.domain) + "</span>");
    } else {
      mets = '<div class="oc-note">Условия и ставки — на сайте ' + esc(l.domain) + "</div>";
      go = '<a class="pill pill-ink oc-go" href="' + esc(l.url) + '" target="_blank" rel="noopener">На сайт банка</a>';
    }
    var extra = "";
    if (o) {
      var pros = o.pros || [], cons = o.cons || [], sel = (cat.sel || []).indexOf(o.id) > -1;
      if (pros.length || cons.length) {
        extra += '<details class="oc-more"><summary>Преимущества и недостатки</summary><div class="oc-pc">' +
          (pros.length ? "<div><b>Преимущества</b><ul>" + pros.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>" : "") +
          (cons.length ? "<div><b>Недостатки</b><ul>" + cons.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>" : "") +
          "</div></details>";
      }
      extra += '<label class="oc-cmp"><input type="checkbox" data-cmp="' + esc(o.id) + '"' + (sel ? " checked" : "") + "> Сравнить</label>";
    }
    return '<article class="oc"' + (o ? ' data-offer="' + esc(o.id) + '"' : "") + (hidden ? " hidden" : "") + '><div class="oc-main">' + thumb(l, base) +
      '<div class="oc-id"><h3>' + esc(o ? o.name : l.name) + "</h3><p>" + esc(o ? l.name : t.one) + "</p></div>" + mets + go +
      '</div><div class="oc-tags">' + tags.join("") + "</div>" + (extra ? '<div class="oc-act">' + extra + "</div>" : "") + "</article>";
  }
  /** Список предложений. Если условий ещё нет — список банков со ссылкой на их сайт. */
  function list(cat, cityId, type, bankId, shown, today) {
    var t = find(cat.types, type) || cat.types[0], items = offersOf(cat, cityId, t.id, bankId, today), fallback = false, rows = [];
    if (items.length) {
      items.forEach(function (o, n) { rows.push(row(cat, o, find(cat.lenders, o.lenderId), t, n >= shown, cat.base)); });
    } else {
      fallback = true;
      var pl = place(cat, cityId), ls = [];
      cat.lenders.forEach(function (l) {
        if (bankId && l.id !== bankId) return;
        var own = cat.offers.filter(function (o) { return o.lenderId === l.id && o.type === t.id; });
        if (own.length && own.every(function (o) { return !available(o, pl, today); })) return;
        ls.push(l);
      });
      ls.forEach(function (l, n) { rows.push(row(cat, null, l, t, n >= shown, cat.base)); });
    }
    var total = rows.length, rest = total - shown;
    return {
      html: total ? rows.join("") : '<div class="empty-box">В этом городе пока нет предложений этого вида. Посмотрите другие продукты.</div>',
      count: fallback ? (total ? "Банков: " + total : "") : "Найдено " + total + " " + plural(total, "предложение", "предложения", "предложений"),
      rest: rest,
      more: "Показать ещё " + Math.min(rest, cat.pageSize),
    };
  }
  function banks(cat, cityId, bankId, today) {
    var pl = place(cat, cityId);
    return cat.lenders.map(function (l) {
      var n = cat.offers.filter(function (o) { return o.lenderId === l.id && available(o, pl, today); }).length;
      return '<button type="button" class="bt' + (bankId === l.id ? " on" : "") + '" data-bank="' + l.id + '">' +
        (l.logo ? '<span class="mini logo"><img src="' + esc(cat.base + "/" + l.logo) + '" alt=""></span>' : '<span class="mini" style="--c1:' + esc(l.c1) + ";--c2:" + esc(l.c2) + '"></span>') +
        "<span><b>" + esc(l.name) + "</b><small>" + (n ? n + " " + plural(n, "предложение", "предложения", "предложений") : "Перейти к банку") + "</small></span></button>";
    }).join("");
  }
  /** Сравнение выбранных предложений: таблица с подсветкой различий. Нет данных — пустое состояние. */
  function compare(cat, ids) {
    var items = [];
    ids.forEach(function (id) { var o = find(cat.offers, id); if (o && find(cat.lenders, o.lenderId)) items.push(o); });
    if (items.length < 2) return '<div class="empty-box">Выберите минимум два предложения в списке и нажмите «Сравнить».</div>';
    var labels = [];
    items.forEach(function (o) { o.metrics.forEach(function (m) { if (labels.indexOf(m[0]) < 0) labels.push(m[0]); }); });
    function metric(o, label) { var m = o.metrics.filter(function (x) { return x[0] === label; })[0]; return m && m[1] ? m[1] + (m[2] ? " (" + m[2] + ")" : "") : ""; }
    function list(a) { return a && a.length ? "<ul>" + a.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : ""; }
    var rows = [];
    labels.forEach(function (lb) { rows.push([lb, items.map(function (o) { return esc(metric(o, lb)); }), items.map(function (o) { return metric(o, lb); })]); });
    rows.push(["Требования к заёмщику", items.map(function (o) { return list(o.eligibility); }), items.map(function (o) { return (o.eligibility || []).join("|"); })]);
    rows.push(["Преимущества", items.map(function (o) { return list(o.pros); }), items.map(function (o) { return (o.pros || []).join("|"); })]);
    rows.push(["Недостатки", items.map(function (o) { return list(o.cons); }), items.map(function (o) { return (o.cons || []).join("|"); })]);
    rows.push(["Проверено", items.map(function (o) { return esc(dateRu(o.checkedAt)); }), items.map(function (o) { return o.checkedAt || ""; })]);
    var head = "<tr><th></th>" + items.map(function (o) { var l = find(cat.lenders, o.lenderId); return "<th><b>" + esc(o.name) + "</b><br><span>" + esc(l.name) + "</span></th>"; }).join("") + "</tr>";
    var body = rows.map(function (r) {
      var diff = r[2].some(function (v) { return v !== r[2][0]; });
      return '<tr' + (diff ? ' class="diff"' : "") + "><th scope=\"row\">" + esc(r[0]) + "</th>" + r[1].map(function (c) { return "<td>" + (c || "—") + "</td>"; }).join("") + "</tr>";
    }).join("");
    var go = "<tr><th></th>" + items.map(function (o) {
      var l = find(cat.lenders, o.lenderId), paid = o.goUrl || o.affiliateUrl, href = o.goUrl || o.affiliateUrl || o.url || l.url;
      return '<td><a class="pill pill-ink oc-go" href="' + esc(href) + '"' + (o.goUrl ? ' data-go="1"' : "") + ' target="_blank" rel="noopener' + (paid ? " sponsored nofollow" : "") + '">Перейти на сайт банка</a>' + (paid ? '<p class="cmp-ad">' + adLabel(o).replace(/<\/?span[^>]*>/g, "") + "</p>" : "") + "</td>";
    }).join("") + "</tr>";
    return '<div class="cmp-scroll"><table class="cmp"><thead>' + head + "</thead><tbody>" + body + go + "</tbody></table></div>" +
      '<p class="src">Строки с различиями выделены. Условия — по первичным источникам на дату проверки; итоговые условия определяет банк.</p>';
  }
  function cityUrl(cat, c) { var r = find(cat.regions, c.regionId); return cat.base + "/goroda/" + r.slug + "/" + c.slug + "/"; }
  function rail(cat, cur) {
    return cat.cities.map(function (c) {
      return '<a href="' + esc(cityUrl(cat, c)) + '" class="ccard' + (c.id === cur ? " cur" : "") + '" data-id="' + c.id + '" draggable="false"><img src="' + esc(cat.base + "/" + c.thumb) + '" alt="" loading="lazy" draggable="false"><span class="n">' + esc(c.name) + '</span><span class="k">Кредиты в ' + esc(c.nameIn) + "</span></a>";
    }).join("");
  }
  var api = { compare: compare, esc: esc, plural: plural, offersOf: offersOf, tabs: tabs, list: list, banks: banks, rail: rail, cityUrl: cityUrl, place: place };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.OffersRender = api;
})(typeof self !== "undefined" ? self : this);
