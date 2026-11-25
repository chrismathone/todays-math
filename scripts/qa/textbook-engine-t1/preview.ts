/**
 * T1 review artifacts, with the existing middle CLI preview and real Chromium.
 * Reads only local engines/review ledgers. No DB, API, application build or writes
 * outside the requested preview directory and the in-repository evidence file.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import katex from "katex";
import { middlePreviewHtml } from "../../middle/preview";
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../../src/lib/middle/generate";
import { launchExportBrowser } from "../../../src/lib/export/pdfServer";
import { createRng } from "../../../src/lib/elementary/rng";

const OUT = "/Volumes/새 볼륨/today-backups/textbook-engine-t1-preview";
const EVIDENCE = "docs/planning/tracks/reports/textbook-engine-t1";
const seeds = [20261125, 173, 9049];
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const keys = new Set(
  registeredTypes()
    .filter((e) => e.rpmMinor === "교과서 수와 연산")
    .map((e) => e.key),
);
for (const file of readdirSync(EVIDENCE).filter(
  (f) => f.endsWith("-review.json") && !f.startsWith("._"),
)) {
  const review = JSON.parse(
    readFileSync(path.join(EVIDENCE, file), "utf8"),
  ) as { rows: { typeKey: string }[] };
  for (const row of review.rows) keys.add(row.typeKey);
}
// Embed the installed KaTeX version and actual local fonts; never rely on a CDN.
const katexDir = path.resolve("node_modules/katex/dist");
const css = readFileSync(path.join(katexDir, "katex.min.css"), "utf8").replace(
  /url\((fonts\/[^)]+)\)/g,
  (_, file: string) =>
    `url(data:font/${file.endsWith("woff2") ? "woff2" : "woff"};base64,${readFileSync(path.join(katexDir, file)).toString("base64")})`,
);
const bodyFont = readFileSync("public/fonts/NotoSerifKR-subset.woff2").toString(
  "base64",
);
const fontCss = `@font-face{font-family:"TM Noto Serif KR";src:url(data:font/woff2;base64,${bodyFont}) format("woff2");font-weight:100 900} .content,.ans,.sol{font-family:"TM Noto Serif KR",serif;word-break:keep-all;overflow-wrap:anywhere}`;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await launchExportBrowser();
  const page = await browser.newPage();
  const results = [];
  const links: string[] = [];
  try {
    for (const key of [...keys].sort()) {
      const items = seeds.map((seed) => generateMiddleProblem(key, seed));
      let strictErrors = 0;
      for (const p of items)
        for (const text of [p.content, p.answer, p.solution]) {
          for (const m of text.matchAll(/\$([^$]+)\$/g)) {
            try {
              katex.renderToString(m[1]!, {
                throwOnError: true,
                strict: "error",
              });
            } catch {
              strictErrors++;
            }
          }
        }
      const { html, figureErrors } = await middlePreviewHtml(items, seeds[0]!);
      const filename = `${key.split("|").at(-1)}-${hash(key).slice(0, 8)}.html`;
      let sampleIndex = 0;
      const local = html
        .replace(
          /<link rel="stylesheet" href="https:[^"]+"\/>/,
          `<style>${css}\n${fontCss}</style>`,
        )
        .replaceAll(`(seed ${seeds[0]})`, `(seeds ${seeds.join(", ")})`)
        .replace(
          /<div class="meta">/g,
          () => `<div class="meta">seed ${seeds[sampleIndex++]} · `,
        );
      writeFileSync(path.join(OUT, filename), local);
      links.push(`<li><a href="${filename}">${key}</a></li>`);
      await page.goto(pathToFileURL(path.join(OUT, filename)).href, {
        waitUntil: "load",
      });
      await page.evaluate(async () => {
        await document.fonts.load('15px "TM Noto Serif KR"');
        await document.fonts.ready;
      });
      const measurements = [];
      for (const width of [800, 390]) {
        await page.setViewport({ width, height: 1000, deviceScaleFactor: 1 });
        const measure = await page.evaluate(() => {
          const blocks = [
            ...document.querySelectorAll<HTMLElement>(".content,.ans,.sol"),
          ];
          const overflows = blocks.flatMap((block, i) => {
            const r = block.getBoundingClientRect();
            const walker = document.createTreeWalker(
              block,
              NodeFilter.SHOW_TEXT,
            );
            let text: Node | null;
            let right = r.left;
            let left = r.right;
            while ((text = walker.nextNode())) {
              const parent = text.parentElement;
              if (parent?.closest(".katex-mathml")) continue;
              const range = document.createRange();
              range.selectNodeContents(text);
              for (const rect of range.getClientRects()) {
                right = Math.max(right, rect.right);
                left = Math.min(left, rect.left);
              }
            }
            for (const e of block.querySelectorAll<HTMLElement>(
              ".katex-html .base,svg",
            )) {
              const box = e.getBoundingClientRect();
              right = Math.max(right, box.right);
              left = Math.min(left, box.left);
            }
            return right > r.right + 1 || left < r.left - 1
              ? [
                  {
                    block: i,
                    overflowPx: Math.max(right - r.right, r.left - left),
                    text: block.textContent?.slice(0, 100),
                  },
                ]
              : [];
          });
          return {
            items: document.querySelectorAll(".item").length,
            katexErrors: document.querySelectorAll(
              '.katex-error,[style*="color:#cc0000"],[style*="color: rgb(204, 0, 0)"]',
            ).length,
            fontsFailed: [...document.fonts]
              .filter((f) => f.status === "error")
              .map((f) => f.family),
            bodyFontLoaded:
              [...document.fonts].some(
                (f) =>
                  f.family === '"TM Noto Serif KR"' && f.status === "loaded",
              ) ||
              [...document.fonts].some(
                (f) => f.family === "TM Noto Serif KR" && f.status === "loaded",
              ),
            overflows,
          };
        });
        measurements.push({ width, ...measure });
      }
      const entry = registeredTypes().find((e) => e.key === key)!;
      results.push({
        key,
        title: entry.rpmTitle,
        unitSection: entry.unitSection,
        declaredDifficulty: entry.handler(createRng(1)).difficulty,
        publicDifficulties: [...new Set(items.map((p) => p.difficulty))],
        seeds,
        file: filename,
        contentSha256: hash(JSON.stringify(items)),
        strictErrors,
        figureErrors,
        measurements,
      });
      if (
        key.endsWith("C07") ||
        key.endsWith("O01") ||
        key.endsWith("N05") ||
        key.endsWith("F04")
      ) {
        await page.setViewport({
          width: 800,
          height: 1000,
          deviceScaleFactor: 1,
        });
        await page.screenshot({
          path: path.join(OUT, `${key.split("|").at(-1)}.png`),
          fullPage: true,
        });
      }
    }
  } finally {
    await browser.close();
  }
  writeFileSync(
    path.join(OUT, "index.html"),
    `<!doctype html><meta charset="utf-8"><title>T1 검수용 미리보기</title><h1>T1 검수용 미리보기</h1><p>씨앗 ${seeds.join(", ")} · 실제 인쇄 검수와 별도</p><ul>${links.join("\n")}</ul>`,
  );
  const summary = {
    types: results.length,
    samples: results.length * seeds.length,
    seeds,
    viewportWidths: [800, 390],
    strictKatexErrors: results.reduce((n, r) => n + r.strictErrors, 0),
    figureErrors: results.flatMap((r) => r.figureErrors).length,
    renderKatexErrors: results.reduce(
      (n, r) => n + r.measurements.reduce((a, m) => a + m.katexErrors, 0),
      0,
    ),
    horizontalOverflows: results.reduce(
      (n, r) => n + r.measurements.reduce((a, m) => a + m.overflows.length, 0),
      0,
    ),
    fontErrors: results.reduce(
      (n, r) =>
        n +
        r.measurements.filter(
          (m) => !m.bodyFontLoaded || m.fontsFailed.length > 0,
        ).length,
      0,
    ),
  };
  writeFileSync(
    path.join(EVIDENCE, "preview.json"),
    JSON.stringify({ summary, results }, null, 2) + "\n",
  );
  console.log(JSON.stringify(summary));
  if (
    summary.strictKatexErrors ||
    summary.renderKatexErrors ||
    summary.horizontalOverflows ||
    summary.figureErrors ||
    summary.fontErrors
  )
    process.exitCode = 1;
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
