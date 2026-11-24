// Копирует собранный сайт (dist/client) в desktop/web, откуда его берёт Electron.
import fs from "node:fs";
import path from "node:path";

const from = path.resolve("dist/client");
const to = path.resolve("desktop/web");

if (!fs.existsSync(path.join(from, "index.html"))) {
  console.error("Нет dist/client/index.html. Сначала выполните: npm run build:mobile");
  process.exit(1);
}
fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true });
console.log(`Сайт скопирован в ${path.relative(process.cwd(), to)}`);
