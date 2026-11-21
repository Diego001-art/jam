/** Минимальный CSV: разделитель «;» (как в русском Excel), UTF-8 с BOM, кавычки по RFC 4180. */

/** Защита от формул в Excel: ячейка, начинающаяся с = + - @, получает префикс. */
function safe(v: string): string {
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
}
const cell = (v: unknown): string => {
  if (v == null) return "";
  const s = typeof v === "number" ? String(v) : safe(String(v));
  return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

export function toCsv(header: string[], rows: unknown[][]): string {
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";
}

/** Разбор CSV. Разделитель определяется по первой строке (; , или табуляция). Пустые строки пропускаются. */
export function parseCsv(text: string): { header: string[]; rows: Record<string, string>[] } {
  const src = text.replace(/^﻿/, "");
  const first = src.split(/\r?\n/, 1)[0] ?? "";
  const delim = [";", "\t", ","].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const out: string[][] = [];
  let row: string[] = [], cur = "", q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"') { if (src[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && src[i + 1] === "\n") i++; row.push(cur); cur = ""; out.push(row); row = []; }
    else cur += c;
  }
  if (cur !== "" || row.length) { row.push(cur); out.push(row); }
  const rows = out.filter((r) => r.some((x) => x.trim() !== ""));
  const header = (rows.shift() ?? []).map((h) => h.trim());
  return { header, rows: rows.map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()]))) };
}
