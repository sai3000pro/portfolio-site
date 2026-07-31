import { writeFile, copyFile, mkdir, stat } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// pathToFileURL: on Windows a bare "C:\..." path is not a valid ESM specifier.
const ssr = await import(pathToFileURL(join(__dirname, "../dist/server/_ssr/index.mjs")).href).then(
  (m) => m.default,
);

async function findPublicDir() {
  const candidates = [join(__dirname, "../dist/public"), join(__dirname, "../dist/client")];
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

// Keep in sync with nitro.prerender.routes in vite.config.ts.
const ROUTES = ["/", "/hobbies"];

const origin = "http://localhost:3000";
const publicDir = await findPublicDir();
await mkdir(publicDir, { recursive: true });

for (const route of ROUTES) {
  let url = origin + route;
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
  const outDir = route === "/" ? publicDir : join(publicDir, route);
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "index.html"), html);

  // GitHub Pages serves 404.html for unknown paths; the landing page doubles as the
  // SPA fallback so client-side routes still resolve.
  if (route === "/") {
    await copyFile(join(outDir, "index.html"), join(publicDir, "404.html"));
  }

  console.log(`Prerendered ${url} → ${join(outDir, "index.html")}`);
}
