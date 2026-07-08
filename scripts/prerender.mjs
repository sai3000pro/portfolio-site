import { writeFile, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ssr = await import(join(__dirname, "../dist/server/_ssr/index.mjs")).then(
  (m) => m.default
);

const request = new Request("http://localhost:3000/");
const response = await ssr.fetch(request);
const html = await response.text();

if (!response.ok) {
  console.error(`Prerender failed with status ${response.status}`);
  process.exit(1);
}

const publicDir = join(__dirname, "../dist/public");
await writeFile(join(publicDir, "index.html"), html);
await copyFile(join(publicDir, "index.html"), join(publicDir, "404.html"));
console.log("Prerendered dist/public/index.html and dist/public/404.html");
