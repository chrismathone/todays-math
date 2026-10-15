/** All accepted display SVGs, before/after typography, at screen 280/320 and print 280. */
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { typesetArithmeticGeometrySvg as typeset } from "../../src/lib/arithmetic-v2/presentation/typography";
import type { SegmentPlan } from "./arithmetic-segment-presentation-model";

const out = path.resolve("tmp/arithmetic-segment-presentation");
const style = (size: number) =>
  `<style>body{font:13px Arial;margin:16px}main{display:grid;grid-template-columns:repeat(3,${size + 24}px);gap:16px}article{padding:8px;border:1px solid #ddd;break-inside:avoid}h2{font-size:12px;font-weight:normal;overflow-wrap:anywhere;height:32px}svg{display:block;width:${size}px;height:${size}px;max-width:100%;margin:auto}@media print{main{grid-template-columns:repeat(2,84mm)}svg{width:74.083333mm;height:74.083333mm}article{border:0}}</style>`;
async function main() {
  const plans = JSON.parse(
    await readFile(path.join(out, "plans.json"), "utf8"),
  ) as SegmentPlan[];
  const displays = JSON.parse(
    await readFile(path.join(out, "displays.json"), "utf8"),
  ) as Record<string, string>;
  const browser = await chromium.launch({ headless: true }),
    failures: { id: string; mode: string; errors: string[] }[] = [];
  const modes: Record<string, unknown> = {};
  try {
    const page = await browser.newPage({
      viewport: { width: 1100, height: 1100 },
    });
    await page.evaluate("globalThis.__name=(value)=>value");
    for (const typed of [false, true])
      for (const [media, size] of [
        ["screen", 280],
        ["screen", 320],
        ["print", 280],
      ] as const) {
        await page.emulateMedia({ media });
        const mode = `${typed ? "typeset" : "plain"}-${media}-${size}`;
        let minFont = Infinity,
          minShape = Infinity,
          maxPointDistance = 0,
          labels = 0,
          dimensions = 0;
        for (let i = 0; i < plans.length; i += 70) {
          const batch = plans.slice(i, i + 70);
          await page.setContent(
            `<html><meta charset="utf-8">${style(size)}<main>${batch.map((p) => `<article>${typed ? typeset(displays[p.id]) : displays[p.id]}</article>`).join("")}</main></html>`,
          );
          const checks = await page.locator("svg").evaluateAll((nodes) =>
            nodes.map((node) => {
              const svg = node as SVGSVGElement,
                matrix = svg.getScreenCTM()!,
                px = Math.hypot(matrix.a, matrix.b),
                viewport = svg.viewBox.baseVal;
              const errors: string[] = [],
                textNodes = [
                  ...svg.querySelectorAll<SVGGraphicsElement>(
                    "[data-drill-label]",
                  ),
                ];
              const transform = (x: number, y: number, m: DOMMatrix) => ({
                x: x * m.a + y * m.c + m.e,
                y: x * m.b + y * m.d + m.f,
              });
              const local = (e: SVGGraphicsElement) =>
                svg.getCTM()!.inverse().multiply(e.getCTM()!);
              const geometry = [
                ...svg.querySelectorAll<SVGGeometryElement>(
                  "[data-segment-source] line,[data-segment-source] path,[data-segment-source] circle",
                ),
              ];
              let font = Infinity,
                pointDistance = 0;
              const corners = textNodes.map((label) => {
                const b = label.getBBox(),
                  m = local(label);
                if (b.width <= 0 || b.height <= 0)
                  errors.push(
                    "invisible:" + label.getAttribute("data-drill-label"),
                  );
                font = Math.min(font, 16 * px);
                const corners = [
                  [b.x - 1, b.y - 1],
                  [b.x + b.width + 1, b.y - 1],
                  [b.x + b.width + 1, b.y + b.height + 1],
                  [b.x - 1, b.y + b.height + 1],
                ].map(([x, y]) => transform(x, y, m));
                if (
                  corners.some(
                    (p) =>
                      p.x < viewport.x + 1 ||
                      p.y < viewport.y + 1 ||
                      p.x > viewport.x + viewport.width - 1 ||
                      p.y > viewport.y + viewport.height - 1,
                  )
                )
                  errors.push(
                    "clipped:" + label.getAttribute("data-drill-label"),
                  );
                for (const g of geometry) {
                  const into = label.getCTM()!.inverse().multiply(g.getCTM()!),
                    length = g.getTotalLength(),
                    count = Math.max(2, Math.ceil(length * 1.5));
                  for (let k = 0; k <= count; k++) {
                    const q = g.getPointAtLength((length * k) / count),
                      p = transform(q.x, q.y, into);
                    if (
                      p.x > b.x - 1 &&
                      p.x < b.x + b.width + 1 &&
                      p.y > b.y - 1 &&
                      p.y < b.y + b.height + 1
                    ) {
                      errors.push(
                        "geometry-label:" +
                          label.getAttribute("data-drill-label"),
                      );
                      break;
                    }
                  }
                }
                const point = label.getAttribute("data-segment-point");
                if (point) {
                  const [x, y] = point.split(" ").map(Number);
                  pointDistance = Math.max(
                    pointDistance,
                    Math.hypot(
                      Number(label.getAttribute("x")) - x,
                      Number(label.getAttribute("y")) - y,
                    ) * px,
                  );
                }
                return corners;
              });
              for (let i = 0; i < corners.length; i++)
                for (let j = i + 1; j < corners.length; j++) {
                  const A = corners[i],
                    B = corners[j];
                  const separate = [A, B].some((poly) =>
                    poly.some((p, k) => {
                      const q = poly[(k + 1) % 4],
                        nx = p.y - q.y,
                        ny = q.x - p.x,
                        aa = A.map((r) => r.x * nx + r.y * ny),
                        bb = B.map((r) => r.x * nx + r.y * ny);
                      return (
                        Math.max(...aa) <= Math.min(...bb) ||
                        Math.max(...bb) <= Math.min(...aa)
                      );
                    }),
                  );
                  if (!separate)
                    errors.push(
                      `label-label:${textNodes[i].getAttribute("data-drill-label")}/${textNodes[j].getAttribute("data-drill-label")}`,
                    );
                }
              const dims = [
                ...svg.querySelectorAll("[data-segment-dimension]"),
              ];
              for (const dim of dims) {
                const endpoints = dim
                    .getAttribute("data-endpoints")!
                    .split(" ")
                    .map(Number),
                  projected = dim
                    .getAttribute("data-projected")!
                    .split(" ")
                    .map(Number),
                  curve = dim.querySelector<SVGGeometryElement>(
                    "[data-segment-curve]",
                  )!;
                if (!curve.hasAttribute("mask"))
                  errors.push("missing-editor-gap");
                const ends = [
                  curve.getPointAtLength(0),
                  curve.getPointAtLength(curve.getTotalLength()),
                ];
                ends.forEach((p, j) => {
                  if (
                    Math.abs(
                      Math.hypot(
                        p.x - projected[2 * j],
                        p.y - projected[2 * j + 1],
                      ) - 1.5,
                    ) > 0.13
                  )
                    errors.push("dimension-endpoint");
                  if (
                    Math.hypot(
                      projected[2 * j] - endpoints[2 * j],
                      projected[2 * j + 1] - endpoints[2 * j + 1],
                    ) > 0.01
                  ) {
                    const witness = dim.querySelector<SVGGeometryElement>(
                      `[data-segment-witness="${j}"]`,
                    );
                    if (!witness) errors.push("missing-witness");
                    else {
                      const first = witness.getPointAtLength(0),
                        last = witness.getPointAtLength(
                          witness.getTotalLength(),
                        );
                      if (
                        Math.hypot(
                          first.x - endpoints[2 * j],
                          first.y - endpoints[2 * j + 1],
                        ) > 0.01 ||
                        Math.hypot(
                          last.x - projected[2 * j],
                          last.y - projected[2 * j + 1],
                        ) > 0.01
                      )
                        errors.push("witness-endpoint");
                    }
                  }
                });
              }
              if (svg.querySelector("[data-segment-source] [mask]"))
                errors.push("masked-source-geometry");
              const shapeBox = svg
                  .querySelector<SVGGraphicsElement>("[data-segment-source]")!
                  .getBoundingClientRect(),
                shape = Math.max(shapeBox.width, shapeBox.height);
              if (font < 12) errors.push(`small-font:${font}`);
              if (shape < 150) errors.push(`small-shape:${shape}`);
              return {
                errors: [...new Set(errors)],
                font,
                shape,
                pointDistance,
                labels: textNodes.length,
                dimensions: dims.length,
              };
            }),
          );
          checks.forEach((c, j) => {
            minFont = Math.min(minFont, c.font);
            minShape = Math.min(minShape, c.shape);
            maxPointDistance = Math.max(maxPointDistance, c.pointDistance);
            labels += c.labels;
            dimensions += c.dimensions;
            if (c.errors.length)
              failures.push({ id: batch[j].id, mode, errors: c.errors });
          });
        }
        modes[mode] = {
          count: plans.length,
          minFont,
          minShape,
          maxPointDistance,
          labels,
          dimensions,
        };
        console.log(JSON.stringify({ mode, ...(modes[mode] as object) }));
      }
    await writeFile(
      path.join(out, "proof.json"),
      JSON.stringify({ modes, failures }, null, 2),
    );
    const keys = [
      "circum-equal-radii",
      "incenter-part-area",
      "centroid-vertex-from-short",
      "centroid-median-from-vertex",
      "midsegment-to-base",
      "similarity-length-reduce",
      "pythagoras-rhombus-side-integer",
      "pythagoras-isosceles-height-surd",
      "external-bisector-part",
      "three-parallel-segments",
      "parallelogram-diagonal-half",
      "right-altitude-product",
    ];
    const representatives = keys.map((key) =>
      plans.find((p) => p.family.endsWith(key))!,
    );
    for (let part = 0; part < 2; part++) {
      const html = `<html lang="ko"><meta charset="utf-8">${style(280)}<main>${representatives
        .slice(part * 6, part * 6 + 6)
        .map(
          (p) =>
            `<article><h2>${p.id}</h2>${typeset(displays[p.id])}</article>`,
        )
        .join("")}</main></html>`;
      await writeFile(path.join(out, `gallery-${part + 1}.html`), html);
      await page.setContent(html);
      await page.emulateMedia({ media: "screen" });
      await page.screenshot({
        path: path.join(out, `gallery-280-${part + 1}.png`),
        fullPage: true,
      });
      await page.emulateMedia({ media: "print" });
      await page.screenshot({
        path: path.join(out, `gallery-print-${part + 1}.png`),
        fullPage: true,
      });
      await page.pdf({
        path: path.join(out, `gallery-${part + 1}.pdf`),
        format: "A4",
        printBackground: true,
      });
    }
    assert.deepEqual(failures, []);
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
