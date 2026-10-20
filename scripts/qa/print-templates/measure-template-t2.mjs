import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { chromium } from "@playwright/test";
import { mkdir, writeFile, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { freemem } from "node:os";

async function memoryGate(stage) {
  while (freemem() < 3 * 2 ** 30) {
    console.log(
      `Waiting for 3GiB before ${stage}; ${(freemem() / 2 ** 30).toFixed(2)}GiB free`,
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  console.log(
    `Memory gate ${stage}: ${(freemem() / 2 ** 30).toFixed(2)}GiB free`,
  );
}
async function bounded(promise, stage, ms = 60000) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${stage} exceeded ${ms}ms`)),
          ms,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

const root = process.cwd();
const out = path.join(
  root,
  "docs/planning/tracks/reports/template-a-t2-20261020",
  process.argv[2] || "before",
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
  optimizeDeps: { entries: ["t2.html"] },
  server: {
    host: "127.0.0.1",
    port: 0,
    fs: { allow: [root, await realpath(path.join(root, "node_modules"))] },
  },
});
let browser;
const stage = process.argv[2] || "before",
  results = [];
if (!["before", "after"].includes(stage))
  throw Error("Stage must be before or after");
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
  for (const template of [
    "pyeongga",
    "jeongtong",
    "modern",
    "workbook",
    "jaseup",
    "yuhyung",
  ])
    for (const columns of [1, 2]) {
      const name = `${template}-${columns}col`;
      await page.emulateMedia({ media: "screen" });
      await page.goto(
        `${server.resolvedUrls.local[0]}t2.html?template=${template}&columns=${columns}`,
      );
      await page.waitForFunction(
        () =>
          document.documentElement.dataset.ready === "true" ||
          !!document.querySelector('[role="alert"]'),
        null,
        { timeout: 60000 },
      );
      if (await page.locator('[role="alert"]').count())
        throw Error(await page.locator('[role="alert"]').textContent());
      await page.evaluate(() => document.fonts.ready);
      await page.emulateMedia({ media: "print" });
      const metrics = await page.evaluate(() => {
        const pages = [
          ...document.querySelectorAll(
            "[data-mathgen-document] [data-unified-paper]",
          ),
        ];
        const failures = [],
          numbers = [];
        const geometry = pages.map((sheet, index) => {
          const body = sheet.querySelector(".measure-body"),
            r = body.getBoundingClientRect(),
            bs = getComputedStyle(body);
          const bottom = r.bottom - (parseFloat(bs.paddingBottom) || 0);
          const items = [...sheet.querySelectorAll("[data-measure-idx]")];
          items.forEach((item) => {
            const number = Number(
                item.querySelector("[data-question-number]")?.textContent,
              ),
              b = item.getBoundingClientRect();
            numbers.push(number);
            if (
              b.left < r.left - 1 ||
              b.right > r.right + 1 ||
              b.top < r.top - 1 ||
              b.bottom > bottom + 1
            )
              failures.push({
                page: index + 1,
                number,
                kind: "bounds",
                bottom: b.bottom - bottom,
              });
            if (item.scrollWidth > item.clientWidth + 1)
              failures.push({ page: index + 1, number, kind: "width" });
            for (const math of item.querySelectorAll(".katex-html")) {
              const m = math.getBoundingClientRect(),
                limit = math
                  .closest("[data-problem-body]")
                  .getBoundingClientRect();
              if (m.left < limit.left - 1 || m.right > limit.right + 1)
                failures.push({ page: index + 1, number, kind: "math" });
            }
          });
          return {
            items: items.length,
            headerHeight:
              sheet
                .querySelector("[data-print-header]")
                ?.getBoundingClientRect().height ?? 0,
            bodyHeight: r.height,
            width: sheet.getBoundingClientRect().width,
            height: sheet.getBoundingClientRect().height,
          };
        });
        return { pages: pages.length, numbers, failures, geometry };
      });
      if (
        metrics.numbers.join(",") !==
        Array.from({ length: 25 }, (_, i) => i + 1).join(",")
      )
        throw Error(`${name}: missing or reordered questions`);
      await page.evaluate(() => {
        const doc = document
          .querySelector("[data-mathgen-document]")
          .cloneNode(true);
        document.body.replaceChildren(doc);
      });
      await page.addStyleTag({
        content:
          "body{margin:0!important;padding:0!important}[data-mathgen-document]{position:static!important}[data-unified-paper]{box-shadow:none!important}",
      });
      const sheets = page.locator("[data-unified-paper]");
      for (const [label, index] of [
        ["first", 0],
        ["last", metrics.pages - 1],
      ])
        await sheets
          .nth(index)
          .screenshot({ path: path.join(out, `${name}-${label}.png`) });
      results.push({ template, columns, ...metrics });
      console.log(
        stage,
        name,
        metrics.pages,
        "pages;",
        metrics.failures.length,
        "overflow",
      );
      await writeFile(
        path.join(out, "measurements.json"),
        JSON.stringify(
          { browser: browser.version(), stage, results, errors },
          null,
          2,
        ),
      );
      if (stage === "after" && metrics.failures.length)
        throw Error(`${name}: ${JSON.stringify(metrics.failures)}`);
    }
  const files = execFileSync(
    "rg",
    ["--files", "src/components/unified/print"],
    { encoding: "utf8" },
  )
    .trim()
    .split(/\r?\n/);
  const sourceSha256 = Object.fromEntries(
    await Promise.all(
      files.map(async (file) => [
        file.replaceAll("\\", "/"),
        createHash("sha256")
          .update(await readFile(file))
          .digest("hex"),
      ]),
    ),
  );
  await writeFile(
    path.join(out, "measurements.json"),
    JSON.stringify(
      {
        browser: browser.version(),
        stage,
        capturedAt: new Date().toISOString(),
        commit: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim(),
        sourceSha256,
        results,
        errors,
      },
      null,
      2,
    ),
  );
  if (errors.length) throw Error(errors.join("\n"));
} finally {
  try {
    await browser?.close();
  } finally {
    await server.close();
    console.log("Chromium and Vite closed");
  }
}
