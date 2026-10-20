import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { chromium } from "@playwright/test";
import { mkdir, writeFile, realpath } from "node:fs/promises";
import { freemem } from "node:os";
import { execFileSync } from "node:child_process";
import path from "node:path";
function gate(stage) {
  if (freemem() < 3 * 2 ** 30) throw Error(`${stage}: need 3GiB free`);
  const processes = execFileSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -match 'tsc.*--noEmit' } | Select-Object -ExpandProperty ProcessId",
    ],
    { encoding: "utf8" },
  );
  if (processes.trim()) throw Error(`${stage}: tsc is running`);
}
const root = process.cwd();
const out = path.join(
  root,
  "docs/planning/tracks/reports/srs-e5-guide-screens-20261020",
);
await mkdir(out, { recursive: true });
gate("Vite");
const server = await createServer({
  configFile: false,
  root: path.join(root, "scripts/qa/srs-e5-guide"),
  publicDir: path.join(root, "public"),
  cacheDir: path.join(root, ".qa-artifacts/srs-e5-guide-cache"),
  plugins: [
    {
      name: "qa-next-client",
      enforce: "pre",
      resolveId(id) {
        if (id === "next/dynamic" || id === "next/link") return `\0qa:${id}`;
      },
      load(id) {
        if (id === "\0qa:next/dynamic")
          return 'import React from "react"; export default function dynamic(loader) { const C=React.lazy(() => loader().then(mod => ({default: mod.default ?? mod}))); return function Dynamic(props) { return React.createElement(React.Suspense,{fallback:null},React.createElement(C,props)); }; }';
        if (id === "\0qa:next/link")
          return 'import React from "react"; export default function Link(props) { return React.createElement("a",props); }';
      },
      async transform(code, id) {
        if (id.replaceAll("\\", "/").endsWith("/src/app/globals.css"))
          return code.replace(
            '@import "tailwindcss";',
            '@import "tailwindcss" source(none);',
          );
      },
    },
    react(),
  ],
  resolve: { alias: { "@": path.join(root, "src") } },
  optimizeDeps: { entries: ["index.html"] },
  server: {
    host: "127.0.0.1",
    port: 0,
    fs: { allow: [root, await realpath(path.join(root, "node_modules"))] },
  },
});
let browser;
const results = [],
  errors = [];
try {
  await server.listen();
  gate("Chromium");
  browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  let scene = "picker";
  await page.route("**/api/**", (route) => {
    if (!route.request().url().endsWith("/api/learn/math-srs/guide")) {
      errors.push(route.request().url());
      return route.abort();
    }
    return route.fulfill({
      json: {
        data: {
          guide:
            scene === "picker"
              ? null
              : { id: "paper-swallow", chosenAt: "2026-10-20T00:00:00Z" },
        },
      },
    });
  });
  for (const theme of ["classic", "sky", "sea", "space", "forest", "shapes"])
    for (const width of [1280, 1440, 390])
      for (scene of ["picker", "home", "done", "relearn"]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(
          `${server.resolvedUrls.local[0]}?theme=${theme}&scene=${scene}`,
        );
        if (scene === "picker")
          await page
            .getByRole("heading", { name: "함께할 길잡이를 골라요" })
            .waitFor();
        else if (scene === "home")
          await page
            .getByRole("button", { name: "길잡이 바꾸기: 종이 제비" })
            .waitFor();
        else if (scene === "done")
          await page.getByAltText("종이 제비의 보상").waitFor();
        else {
          await page.getByRole("button", { name: "개념 다시 보기" }).waitFor();
          await page.getByText("12 이상인 수를 골라 보세요.").waitFor();
          await page.getByRole("button", { name: /^1\s*10$/ }).waitFor();
        }
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(
            [...document.images].map((i) => i.decode().catch(() => {})),
          );
        });
        const check = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth,
          broken: [...document.images]
            .filter((i) => !i.complete || !i.naturalWidth)
            .map((i) => i.src),
        }));
        const file = `${theme}-${width}-${scene}.png`;
        await page.screenshot({ path: path.join(out, file), fullPage: true });
        results.push({ theme, width, scene, file, ...check });
      }
  await writeFile(
    path.join(out, "browser-checks.json"),
    JSON.stringify({ browser: browser.version(), results, errors }, null, 2),
  );
  if (errors.length || results.some((r) => r.overflow || r.broken.length))
    throw Error(
      JSON.stringify({
        errors,
        failed: results.filter((r) => r.overflow || r.broken.length),
      }),
    );
  console.log(`PASS ${results.length} browser screens`);
} finally {
  await browser?.close();
  await server.close();
}
