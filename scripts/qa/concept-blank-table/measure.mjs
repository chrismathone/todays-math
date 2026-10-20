// Owner 2026-10-20 «움직이나마나한 스크롤»: the concept blank form table must not
// scroll sideways while its columns can still give way. Measures the real
// component and CSS in Chromium at several card widths.
// Run: node scripts/qa/concept-blank-table/measure.mjs
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { chromium } from "@playwright/test";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { freemem } from "node:os";

while (freemem() < 2 * 2 ** 30) {
  console.log(`Waiting for 2GiB; ${(freemem() / 2 ** 30).toFixed(2)}GiB free`);
  await new Promise((resolve) => setTimeout(resolve, 5000));
}
const root = process.cwd();
const server = await createServer({
  configFile: false,
  root: path.join(root, "scripts/qa/concept-blank-table"),
  publicDir: path.join(root, "public"),
  cacheDir: path.join(root, ".qa-artifacts/concept-blank-table-cache"),
  plugins: [
    {
      name: "limit-tailwind-scan",
      enforce: "pre",
      async load(id) {
        if (id.replaceAll("\\", "/").endsWith("/src/app/globals.css"))
          return (await readFile(id, "utf8")).replace(
            '@import "tailwindcss";',
            '@import "tailwindcss" source(none);\n@source "../components/concept-blank";',
          );
      },
    },
    react({ exclude: /node_modules|cache|\.qa-artifacts/ }),
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
const results = [];
try {
  await server.listen();
  browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  for (const width of [1240, 1100, 1000, 900, 800, 720, 600, 390]) {
    await page.goto(`${server.resolvedUrls.local[0]}?width=${width}`);
    await page.waitForFunction(
      () => document.documentElement.dataset.ready === "true",
    );
    await page.evaluate(() => document.fonts.ready);
    const result = await page.evaluate(() => {
      const scroller = document.querySelector('[role="region"]');
      const inputs = [...document.querySelectorAll("input")].map(
        (input) => input.getBoundingClientRect().width,
      );
      return {
        overflow: scroller.scrollWidth - scroller.clientWidth,
        scrollerWidth: scroller.clientWidth,
        tableWidth: scroller.querySelector("table").getBoundingClientRect()
          .width,
        narrowestInput: Math.round(Math.min(...inputs)),
      };
    });
    if (process.env.SHOTS)
      await page.locator("[data-frame]").screenshot({
        path: path.join(root, `.qa-artifacts/concept-blank-table/${width}.png`),
      });
    results.push({ width, ...result });
    console.log(JSON.stringify({ width, ...result }));
  }
  if (errors.length) throw Error(errors.join("\n"));
} finally {
  await browser?.close();
  await server.close();
}
