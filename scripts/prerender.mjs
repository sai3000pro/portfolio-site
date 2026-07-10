import { writeFile, copyFile, mkdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ssr = await import(join(__dirname, "../dist/server/_ssr/index.mjs")).then(
  (m) => m.default
);

async function findPublicDir() {
  const candidates = [
    join(__dirname, "../dist/public"),
    join(__dirname, "../dist/client"),
  ];
  for (const dir of candidates) {
    try {
      const s = await stat(dir);
      if (s.isDirectory()) return dir;
    } catch {
      // ignore
    }
  }
  return candidates[0];
}

const origin = "http://localhost:3000";
let url = origin + "/";
let response = await ssr.fetch(new Request(url));

// Follow any base-path redirect (TanStack Router redirects / to /<base>/).
if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
  url = new URL(response.headers.get("location"), origin).href;
  response = await ssr.fetch(new Request(url));
}

if (!response.ok) {
  console.error(`Prerender failed with status ${response.status} for ${url}`);
  process.exit(1);
}

const html = await response.text();
const publicDir = await findPublicDir();
await mkdir(publicDir, { recursive: true });
await writeFile(join(publicDir, "index.html"), html);
await copyFile(join(publicDir, "index.html"), join(publicDir, "404.html"));
console.log(`Prerendered ${url} → ${join(publicDir, "index.html")}`);
