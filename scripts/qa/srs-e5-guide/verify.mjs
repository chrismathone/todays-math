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
const pickerOnly = process.argv.includes("--picker-only");
const measureOnly = process.argv.includes("--measure-only");
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
      for (scene of pickerOnly
        ? ["picker"]
        : ["picker", "home", "done", "relearn"]) {
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
        if (scene === "picker") {
          check.picker = await page.evaluate(() => {
            const grid = document.querySelector('[aria-label="길잡이 고르기"]');
            const images = [...grid.querySelectorAll("img")].map((img) => {
              const rect = img.getBoundingClientRect();
              const canvas = document.createElement("canvas");
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0);
              const data = ctx.getImageData(
                0,
                0,
                canvas.width,
                canvas.height,
              ).data;
              let top = canvas.height,
                bottom = -1;
              for (let y = 0; y < canvas.height; y++)
                for (let x = 0; x < canvas.width; x++)
                  if (data[(y * canvas.width + x) * 4 + 3] > 32) {
                    top = Math.min(top, y);
                    bottom = Math.max(bottom, y);
                  }
              const scale = Math.min(
                rect.width / canvas.width,
                rect.height / canvas.height,
              );
              return {
                width: rect.width,
                height: rect.height,
                inkHeight: (bottom - top + 1) * scale,
                attributeWidth: img.getAttribute("width"),
                attributeHeight: img.getAttribute("height"),
              };
            });
            const start = [...document.querySelectorAll("button")]
              .find((b) => b.textContent.trim() === "이 친구와 시작")
              .getBoundingClientRect();
            const rows = [...grid.querySelectorAll("button")].map((b) =>
              Math.round(b.getBoundingClientRect().top),
            );
            return {
              images,
              rows,
              gridBottom: grid.getBoundingClientRect().bottom,
              startTop: start.top,
              startBottom: start.bottom,
              startHeight: start.height,
            };
          });
          const p = check.picker;
          check.sizePass =
            p.images.length === 5 &&
            p.images.every(
              (img) =>
                img.inkHeight >= 90 &&
                img.inkHeight <= 115 &&
                Math.abs(img.width / img.height - 200 / 152) < 0.01 &&
                img.attributeWidth === "200" &&
                img.attributeHeight === "152",
            ) &&
            p.gridBottom + 16 <= p.startTop &&
            p.startHeight >= 56 &&
            (width === 390 ||
              (p.startBottom <= 750 &&
                p.rows[0] === p.rows[2] &&
                p.rows[3] === p.rows[4] &&
                p.rows[3] > p.rows[0]));
        }
        const file = `${theme}-${width}-${scene}.png`;
        if (!measureOnly)
          await page.screenshot({ path: path.join(out, file), fullPage: true });
        results.push({ theme, width, scene, file, ...check });
      }
  await writeFile(
    path.join(
      out,
      pickerOnly
        ? measureOnly
          ? "picker-size-red.json"
          : "picker-checks.json"
        : "browser-checks.json",
    ),
    JSON.stringify({ browser: browser.version(), results, errors }, null, 2),
  );
  if (
    errors.length ||
    results.some((r) => r.overflow || r.broken.length || r.sizePass === false)
  )
    throw Error(
      JSON.stringify({
        errors,
        failed: results
          .filter((r) => r.overflow || r.broken.length || r.sizePass === false)
          .map((r) => ({
            theme: r.theme,
            width: r.width,
            sizePass: r.sizePass,
            inkHeights: r.picker?.images.map((i) => i.inkHeight),
          })),
      }),
    );
  console.log(`PASS ${results.length} browser screens`);
} finally {
  await browser?.close();
  await server.close();
}
