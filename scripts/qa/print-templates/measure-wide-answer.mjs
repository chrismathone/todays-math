// Consensus 2026-10-20 Q1 in a real browser: an unbreakable answer either
// shrinks (>= 80%) and stays inside its five-cell key cell, or stops the
// export with a numbered message. jsdom has no layout, so only this sees it.
// Run: node scripts/qa/print-templates/measure-wide-answer.mjs
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { chromium } from "@playwright/test";
import { mkdir, writeFile, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { freemem } from "node:os";

async function memoryGate(stage) {
  while (freemem() < 3 * 2 ** 30) {
    console.log(
      `Waiting for 3GiB before ${stage}; ${(freemem() / 2 ** 30).toFixed(2)}GiB free`,
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

const root = process.cwd();
const out = path.join(
  root,
  "docs/planning/tracks/reports/print-t2-details-consensus-20261020",
);
await mkdir(out, { recursive: true });
await memoryGate("Vite");
const server = await createServer({
  configFile: false,
  root: path.join(root, "scripts/qa/print-templates"),
  publicDir: path.join(root, "public"),
  cacheDir: path.join(root, ".qa-artifacts/print-templates-cache"),
  plugins: [
    {
      name: "limit-tailwind-scan-to-production-renderers",
      enforce: "pre",
      async load(id) {
        if (id.replaceAll("\\", "/").endsWith("/src/app/globals.css")) {
          return (await readFile(id, "utf8")).replace(
            '@import "tailwindcss";',
            '@import "tailwindcss" source(none);\n@source "../components/math";\n@source "../components/unified/UnifiedProblem.tsx";\n@source "../components/unified/NativeProblem.tsx";\n@source "../lib/math/choiceLayout.ts";\n@source "../lib/figure/figureSvgFrame.ts";',
          );
        }
      },
    },
    react({ exclude: /node_modules|cache|\.qa-artifacts/ }),
  ],
  resolve: { alias: { "@": path.join(root, "src") } },
  optimizeDeps: { entries: ["wide-answer.html"] },
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
  await memoryGate("Chromium");
  browser = await chromium.launch({ args: ["--disable-lcd-text"] });
  const page = await browser.newPage({
    viewport: { width: 1100, height: 1300 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.route("**/api/**", (route) => {
    errors.push(route.request().url());
    return route.abort();
  });
  for (const terms of [12, 19, 20, 21, 22, 23, 24, 25, 26, 40]) {
    await page.goto(
      `${server.resolvedUrls.local[0]}wide-answer.html?terms=${terms}`,
    );
    await page.waitForFunction(
      () =>
        document.documentElement.dataset.ready === "true" ||
        !!document.querySelector('[role="alert"]'),
      null,
      { timeout: 60000 },
    );
    await page.evaluate(() => document.fonts.ready);
    const result = await page.evaluate(() => {
      const alert = document.querySelector('[role="alert"]')?.textContent;
      if (alert) return { outcome: "stopped", alert };
      const cell = document.querySelector(
        '[data-mathgen-document] [data-unified-paper] [data-answer-key] [data-answer-number="3"]',
      );
      const value = cell?.querySelector("[data-answer-value]");
      if (!value) return { outcome: "missing" };
      const r = value.getBoundingClientRect();
      const outside = [...value.querySelectorAll(".katex-html")].some((ink) => {
        const b = ink.getBoundingClientRect();
        return b.left < r.left - 1 || b.right > r.right + 1;
      });
      const shrunk = value.querySelector("[data-answer-scale]");
      return {
        outcome: shrunk ? "shrunk" : "full",
        span: cell.getAttribute("data-answer-span"),
        scale: shrunk ? Number(shrunk.getAttribute("data-answer-scale")) : 1,
        inside: value.scrollWidth <= value.clientWidth + 1 && !outside,
        fontSize: getComputedStyle(value.querySelector(".katex") ?? value)
          .fontSize,
      };
    });
    results.push({ terms, ...result });
    console.log(JSON.stringify({ terms, ...result }));
  }
  await writeFile(
    path.join(out, "wide-answer.json"),
    JSON.stringify(
      {
        browser: browser.version(),
        capturedAt: new Date().toISOString(),
        results,
        errors,
      },
      null,
      2,
    ),
  );
  const bad = results.filter(
    (r) =>
      r.outcome === "missing" ||
      ((r.outcome === "shrunk" || r.outcome === "full") && !r.inside) ||
      (r.outcome === "shrunk" && r.scale < 0.8) ||
      (r.outcome === "stopped" &&
        !/^3번 정답이 채점표 폭보다 넓습니다/.test(r.alert)),
  );
  if (errors.length || bad.length)
    throw Error(JSON.stringify({ errors, bad }, null, 2));
} finally {
  try {
    await browser?.close();
  } finally {
    await server.close();
    console.log("Chromium and Vite closed");
  }
}
