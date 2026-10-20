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
  "docs/design/mockups/answer-quick-key-h2-production-20261020",
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
  optimizeDeps: { entries: ["h2.html"] },
  server: {
    host: "127.0.0.1",
    port: 0,
    fs: { allow: [root, await realpath(path.join(root, "node_modules"))] },
  },
});
let browser;
const results = [];
const sourceFiles = execFileSync(
  "git",
  ["ls-files", "src/components/unified/print"],
  { encoding: "utf8" },
)
  .trim()
  .split(/\r?\n/);
sourceFiles.push(
  "src/components/unified/print/AnswerPage.module.css",
  "src/components/unified/print/EnglishAnswerPage.tsx",
  "src/components/unified/print/useMeasuredAnswerPages.tsx",
);
const sourceSha256 = Object.fromEntries(
  await Promise.all(
    [...new Set(sourceFiles)].map(async (file) => [
      file,
      createHash("sha256")
        .update(await readFile(file))
        .digest("hex"),
    ]),
  ),
);
try {
  await bounded(server.listen(), "Vite listen");
  await memoryGate("Chromium");
  browser = await chromium.launch();
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
  for (const count of [25, 50, 100])
    for (const columns of [1, 2])
      for (const quick of [false, true]) {
        const name = `${count}-${columns}col-${quick ? "key" : "solutions"}`;
        await page.emulateMedia({ media: "screen" });
        await page.goto(
          `${server.resolvedUrls.local[0]}h2.html?count=${count}&columns=${columns}&quick=${quick}`,
        );
        await page.waitForFunction(
          () =>
            document.documentElement.dataset.ready === "true" ||
            !!document.querySelector('[role="alert"]'),
          null,
          { timeout: 60000 },
        );
        if (await page.locator('[role="alert"]').count())
          throw Error(await page.locator('[role="alert"]').allTextContents());
        await page.evaluate(() => document.fonts.ready);
        await page.emulateMedia({ media: "print" });
        const result = await page.evaluate(() => {
          const sheets = [
            ...document.querySelectorAll(
              "[data-mathgen-document] [data-answer-page]",
            ),
          ];
          const numbers = sheets.flatMap((s) =>
            [...s.querySelectorAll("[data-answer-number]")].map((c) =>
              Number(c.dataset.answerNumber),
            ),
          );
          const solutions = sheets.flatMap((s) =>
            [...s.querySelectorAll("[data-answer-solution]")].map((c) =>
              Number(c.dataset.answerSolution),
            ),
          );
          const failures = [];
          const colors = new Set();
          const spans = [];
          sheets.forEach((sheet, i) => {
            const body = sheet
              .querySelector("[data-answer-body]")
              .getBoundingClientRect();
            for (const item of sheet.querySelectorAll(
              "[data-answer-number],[data-answer-solution]",
            )) {
              const r = item.getBoundingClientRect();
              if (
                r.top < body.top - 1 ||
                r.bottom > body.bottom + 1 ||
                r.left < body.left - 1 ||
                r.right > body.right + 1
              )
                failures.push(
                  `page ${i + 1} bounds ${item.dataset.answerNumber || item.dataset.answerSolution}`,
                );
            }
            for (const cell of sheet.querySelectorAll("[data-answer-number]")) {
              const v = cell.querySelector("[data-answer-value]"),
                r = v.getBoundingClientRect();
              if (v.scrollWidth > v.clientWidth + 1)
                failures.push(`cell ${cell.dataset.answerNumber} scroll`);
              for (const ink of v.querySelectorAll(".katex-html")) {
                const b = ink.getBoundingClientRect();
                if (b.left < r.left - 1 || b.right > r.right + 1)
                  failures.push(`cell ${cell.dataset.answerNumber} math`);
              }
              spans.push({
                number: Number(cell.dataset.answerNumber),
                span: Number(cell.dataset.answerSpan),
                height: r.height,
              });
              const walker = document.createTreeWalker(v, NodeFilter.SHOW_TEXT);
              while (walker.nextNode())
                if (
                  walker.currentNode.textContent.trim() &&
                  !walker.currentNode.parentElement.closest(".katex-mathml")
                )
                  colors.add(
                    getComputedStyle(walker.currentNode.parentElement).color,
                  );
            }
          });
          return {
            pages: sheets.length,
            numbers,
            solutions,
            failures,
            colors: [...colors],
            spans,
          };
        });
        const expected = Array.from({ length: count }, (_, i) => i + 1).join(
          ",",
        );
        if (
          result.numbers.join(",") !== expected ||
          result.solutions.join(",") !== (quick ? "" : expected) ||
          result.failures.length
        )
          throw Error(`${name}: ${JSON.stringify(result)}`);
        await page.evaluate(() => {
          const doc = document
            .querySelector("[data-mathgen-document]")
            .cloneNode(true);
          document.body.replaceChildren(doc);
        });
        await page.addStyleTag({
          content:
            "body{margin:0!important;padding:0!important} [data-mathgen-document]{position:static!important} [data-unified-paper]{box-shadow:none!important}",
        });
        const sheets = page.locator("[data-answer-page]");
        if (columns === 2)
          for (const [label, index] of [
            ["first", 0],
            ["last", result.pages - 1],
          ]) {
            await sheets
              .nth(index)
              .screenshot({ path: path.join(out, `${name}-${label}.png`) });
          }
        results.push({ name, count, columns, quick, ...result });
        await writeFile(
          path.join(out, "measurements.json"),
          JSON.stringify(
            {
              browser: browser.version(),
              capturedAt: new Date().toISOString(),
              sourceSha256,
              results,
              errors,
            },
            null,
            2,
          ),
        );
        console.log(
          name,
          result.pages,
          "pages; overflow 0; colors",
          result.colors.join(","),
        );
      }
  if (errors.length) throw Error(errors.join("\n"));
} finally {
  try {
    await browser?.close();
  } finally {
    await server.close();
    console.log("Chromium and Vite closed");
  }
}
