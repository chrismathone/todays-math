/** Offline all-domain SVG layout check. No dev server, network, DB or env file.
 * node <tool-root>/node_modules/tsx/dist/cli.mjs scripts/qa/geometry-elementary-browser.ts <tool-root> <evidence-dir>
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ELEMENTARY_GEOMETRY_DEFINITIONS as definitions,
  ELEMENTARY_GEOMETRY_FIGURES as figures,
} from "../../src/lib/arithmetic-v2/families/geometryElementary";

async function main() {
  const root = path.resolve(process.argv[2] ?? "."),
    out = path.resolve(process.argv[3] ?? "tmp/geometry-elementary-20261015");
  const requireTools = createRequire(path.join(root, "package.json"));
  const { chromium } = requireTools(
    "@playwright/test",
  ) as typeof import("@playwright/test");
  await mkdir(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1200, height: 1000 },
  });
  await page.route("**/*", (route) => route.abort());
  const rows = definitions.flatMap((d) =>
    Array.from({ length: d.domainSize }, (_, i) => {
      const c = d.problemAt(i);
      if (c.prompt.layout !== "math") throw new Error("math expected");
      return {
        id: c.prompt.figureId!,
        type: d.id,
        index: i,
        instruction: c.prompt.instruction!,
        answer: c.answer.text,
      };
    }),
  );
  const failures: unknown[] = [];
  const document = (ids: { id: string; instruction: string }[]) =>
    `<!doctype html><meta charset="utf-8"><style>body{margin:20px;background:white;color:black;font-family:Arial,'Malgun Gothic',sans-serif}main{display:grid;grid-template-columns:repeat(4,260px);gap:18px}article{border:1px solid #aaa;padding:10px}svg{display:block;width:216px;height:216px;margin:auto}p{font-size:13px;min-height:45px}small{font-size:10px}</style><main>${ids.map((r) => `<article data-id="${r.id}"><small>${r.id}</small><p>${r.instruction}</p>${figures[r.id]}</article>`).join("")}</main>`;
  try {
    for (let offset = 0; offset < rows.length; offset += 180) {
      await page.setContent(document(rows.slice(offset, offset + 180)));
      await page.evaluate(() => window.document.fonts.ready);
      const batch = await page.evaluate(() => {
        const failures: { id: string; reason: string; text?: string }[] = [];
        for (const card of window.document.querySelectorAll("article")) {
          const id = card.getAttribute("data-id")!;
          const svg = card.querySelector("svg")!,
            box = svg.getBoundingClientRect();
          const labels = [
            ...svg.querySelectorAll<SVGTextElement>("[data-drill-label]"),
          ];
          for (const t of labels) {
            const b = t.getBoundingClientRect();
            const size =
              (parseFloat(getComputedStyle(t).fontSize) * box.width) / 240;
            if (size < 16)
              failures.push({
                id,
                reason: "font below 16px",
                text: t.textContent ?? "",
              });
            if (
              b.left < box.left + 1 ||
              b.right > box.right - 1 ||
              b.top < box.top + 1 ||
              b.bottom > box.bottom - 1
            )
              failures.push({
                id,
                reason: "label outside SVG",
                text: t.textContent ?? "",
              });
          }
          for (let i = 0; i < labels.length; i++)
            for (let j = i + 1; j < labels.length; j++) {
              const a = labels[i].getBoundingClientRect(),
                b = labels[j].getBoundingClientRect();
              if (
                Math.min(a.right, b.right) > Math.max(a.left, b.left) + 0.1 &&
                Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) + 0.1
              )
                failures.push({
                  id,
                  reason: "label overlap",
                  text: `${labels[i].textContent} / ${labels[j].textContent}`,
                });
            }
          for (const shape of svg.querySelectorAll<SVGGraphicsElement>(
            "path,circle,ellipse",
          )) {
            const b = shape.getBoundingClientRect();
            if (
              b.left < box.left + 1 ||
              b.right > box.right - 1 ||
              b.top < box.top + 1 ||
              b.bottom > box.bottom - 1
            )
              failures.push({ id, reason: "geometry outside SVG" });
            for (const t of labels) {
              const textBox = t.getBoundingClientRect();
              if (
                Math.min(textBox.right, b.right) <=
                  Math.max(textBox.left, b.left) ||
                Math.min(textBox.bottom, b.bottom) <=
                  Math.max(textBox.top, b.top)
              )
                continue;
              const geometry = shape as SVGGeometryElement,
                matrix = geometry.getScreenCTM()!;
              const length = geometry.getTotalLength();
              for (let s = 0; s <= length; s += 1) {
                const sample = geometry
                  .getPointAtLength(s)
                  .matrixTransform(matrix);
                if (
                  sample.x > textBox.left - 0.5 &&
                  sample.x < textBox.right + 0.5 &&
                  sample.y > textBox.top - 0.5 &&
                  sample.y < textBox.bottom + 0.5
                ) {
                  failures.push({
                    id,
                    reason: "stroke crosses label",
                    text: t.textContent ?? "",
                  });
                  break;
                }
              }
            }
          }
        }
        return failures;
      });
      failures.push(...batch);
    }
    const representative = definitions.flatMap((d) =>
      [0, Math.floor(d.domainSize / 2), d.domainSize - 1].map((i) =>
        rows.find((r) => r.type === d.id && r.index === i)!,
      ),
    );
    // One readable sheet per 12 samples, with all families and domain endpoints.
    for (let start = 0; start < representative.length; start += 12) {
      const html = document(representative.slice(start, start + 12));
      const stem = `representative-${String(start / 12 + 1).padStart(2, "0")}`;
      await writeFile(path.join(out, `${stem}.html`), html);
      await page.setContent(html);
      await page.evaluate(() => window.document.fonts.ready);
      await page.screenshot({
        path: path.join(out, `${stem}.png`),
        fullPage: true,
      });
    }
    await page.emulateMedia({ media: "print" });
    await page.setContent(
      document(
        representative
          .filter((r) => /angle|trapezoid|cuboid|circle/.test(r.type))
          .slice(0, 12),
      ),
    );
    await page.screenshot({
      path: path.join(out, "print-representatives.png"),
      fullPage: true,
    });
    const report = {
      types: definitions.length,
      candidates: rows.length,
      viewBox: "0 0 240 240",
      renderedWidth: 216,
      labelFontPx: 18,
      failures,
      representativeScreenshots: Math.ceil(representative.length / 12) + 1,
    };
    await writeFile(
      path.join(out, "browser-report.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(
      JSON.stringify({
        ...report,
        failures: failures.slice(0, 15),
        totalFailures: failures.length,
      }),
    );
    assert.equal(
      failures.length,
      0,
      "All finite diagrams must pass the browser layout check",
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
