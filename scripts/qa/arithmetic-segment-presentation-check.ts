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
          const checks = await page
            .locator("svg")
            .evaluateAll(async (nodes) => {
              const inkCache = new Map<
                string,
                { x: number; y: number; width: number; height: number }
              >();
              return Promise.all(
                nodes.map(async (node) => {
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
                      "[data-segment-source] line,[data-segment-source] path,[data-segment-source] circle,[data-segment-curve]",
                    ),
                  ];
                  let font = Infinity,
                    pointDistance = 0;
                  // SVG text getBBox includes the font ascender/descender whitespace.
                  // Measure painted glyphs so a nearby line in that empty space is not
                  // reported as a collision. Path-based typography already has ink bounds.
                  const inkBox = async (label: SVGGraphicsElement) => {
                    const b = label.getBBox();
                    if (label.localName !== "text") return b;
                    const x = Number(label.getAttribute("x") ?? 0),
                      y = Number(label.getAttribute("y") ?? 0);
                    const clone = label.cloneNode(true) as Element;
                    clone.setAttribute("x", "0");
                    clone.setAttribute("y", "0");
                    clone.setAttribute("stroke", "none");
                    clone.removeAttribute("transform");
                    const key = clone.outerHTML;
                    let box = inkCache.get(key);
                    if (!box) {
                      const scale = 4,
                        pad = 8,
                        left = b.x - x - pad,
                        top = b.y - y - pad,
                        width = Math.ceil((b.width + pad * 2) * scale),
                        height = Math.ceil((b.height + pad * 2) * scale);
                      const canvas = document.createElement("canvas");
                      canvas.width = width;
                      canvas.height = height;
                      const ctx = canvas.getContext("2d", {
                        willReadFrequently: true,
                      })!;
                      const img = new Image();
                      img.src =
                        "data:image/svg+xml;charset=utf-8," +
                        encodeURIComponent(
                          `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${left} ${top} ${width / scale} ${height / scale}">${clone.outerHTML}</svg>`,
                        );
                      await img.decode();
                      ctx.drawImage(img, 0, 0);
                      const pixels = ctx.getImageData(0, 0, width, height).data;
                      let minX = width,
                        minY = height,
                        maxX = 0,
                        maxY = 0;
                      for (let yy = 0; yy < height; yy++)
                        for (let xx = 0; xx < width; xx++)
                          if (pixels[(yy * width + xx) * 4 + 3] > 8) {
                            minX = Math.min(minX, xx);
                            minY = Math.min(minY, yy);
                            maxX = Math.max(maxX, xx + 1);
                            maxY = Math.max(maxY, yy + 1);
                          }
                      box = {
                        x: left + minX / scale,
                        y: top + minY / scale,
                        width: (maxX - minX) / scale,
                        height: (maxY - minY) / scale,
                      };
                      inkCache.set(key, box);
                    }
                    return {
                      x: x + box.x,
                      y: y + box.y,
                      width: box.width,
                      height: box.height,
                    };
                  };
                  const inkBoxes = await Promise.all(textNodes.map(inkBox));
                  const corners = textNodes.map((label, labelIndex) => {
                    const b = inkBoxes[labelIndex],
                      m = local(label);
                    if (b.width <= 0 || b.height <= 0)
                      errors.push(
                        "invisible:" + label.getAttribute("data-drill-label"),
                      );
                    font = Math.min(
                      font,
                      Number(label.getAttribute("font-size") ?? 16) * px,
                    );
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
                      // Only the dimension's own numeric label is intentionally
                      // gapped/haloed. A curve must never cross a point annotation.
                      if (
                        g.hasAttribute("data-segment-curve") &&
                        label.hasAttribute("data-segment-number")
                      )
                        continue;
                      const into = label
                          .getCTM()!
                          .inverse()
                          .multiply(g.getCTM()!),
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
                      curve = dim.querySelector<SVGGeometryElement>(
                        "[data-segment-curve]",
                      )!;
                    const manual = dim.hasAttribute("data-editor-bend");
                    if (manual && !curve.hasAttribute("mask"))
                      errors.push("missing-editor-gap");
                    if (
                      dim.hasAttribute("data-projected") ||
                      dim.querySelector("[data-segment-witness]")
                    )
                      errors.push("invented-projection");
                    const paths = [
                      ...curve
                        .getAttribute("d")!
                        .matchAll(
                          /M\s+([-\d.]+)\s+([-\d.]+)\s+Q\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/g,
                        ),
                    ];
                    const ends = paths.flatMap((m) => [
                      [Number(m[1]), Number(m[2])],
                      [Number(m[5]), Number(m[6])],
                    ]);
                    for (let j = 0; j < 2; j++) {
                      const a = endpoints.slice(2 * j, 2 * j + 2),
                        b = endpoints.slice(2 * (1 - j), 2 * (1 - j) + 2);
                      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
                      const inset = manual ? 0 : (3 * 16) / 16.8;
                      const x = a[0] + (inset * (b[0] - a[0])) / len,
                        y = a[1] + (inset * (b[1] - a[1])) / len;
                      if (
                        !ends.some((p) => Math.hypot(p[0] - x, p[1] - y) < 0.02)
                      )
                        errors.push("dimension-endpoint");
                    }
                    const numeric = svg.querySelector(
                      '[data-segment-number="true"]',
                    );
                    if (numeric?.hasAttribute("transform"))
                      errors.push("rotated-dimension-label");
                  }
                  if (svg.querySelector("[data-segment-source] [mask]"))
                    errors.push("masked-source-geometry");
                  const shapeBox = svg
                      .querySelector<SVGGraphicsElement>(
                        "[data-segment-source]",
                      )!
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
            });
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
      "trapezoid-parallel-section",
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
    const everyType = [...new Set(plans.map((p) => p.family))].map((family) =>
      plans.find((p) => p.family === family)!,
    );
    for (let i = 0; i < everyType.length; i += 6) {
      await page.emulateMedia({ media: "screen" });
      await page.setContent(
        `<html lang="ko"><meta charset="utf-8">${style(280)}<main>${everyType
          .slice(i, i + 6)
          .map(
            (p) =>
              `<article><h2>${p.id}</h2>${typeset(displays[p.id])}</article>`,
          )
          .join("")}</main></html>`,
      );
      await page.screenshot({
        path: path.join(out, `all-types-${i / 6 + 1}.png`),
        fullPage: true,
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
