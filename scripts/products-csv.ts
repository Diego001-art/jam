/** npm run products:export [файл.csv]   |   npm run products:import -- файл.csv */
import fs from "node:fs";
import { lenders, products } from "../src/lib/content";
import { exportProducts, importProducts } from "../src/lib/products-csv";

const [cmd, file] = process.argv.slice(2);
if (cmd === "export") {
  const out = file ?? "products.csv";
  fs.writeFileSync(out, exportProducts(products));
  console.log(`Экспортировано продуктов: ${products.length} → ${out}`);
} else if (cmd === "import" && file) {
  const { products: next, report } = importProducts(products, lenders, fs.readFileSync(file, "utf8"));
  if (report.errors.length) { console.error("Импорт отменён, файл не изменён:\n" + report.errors.map((e) => "  ✗ " + e).join("\n")); process.exit(1); }
  fs.writeFileSync("data/products.json", JSON.stringify(next, null, 2) + "\n");
  console.log(`Создано: ${report.created}, обновлено: ${report.updated}.`);
  if (report.backToReview.length) console.log("Возвращены на проверку (изменились условия): " + report.backToReview.join(", "));
  console.log("Все импортированные продукты остаются неопубликованными до подтверждения редактором. Проверьте: npm run validate");
} else { console.error("Использование: products:export [файл] | products:import -- файл.csv"); process.exit(1); }
