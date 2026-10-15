/** Full changed-domain browser evidence at the actual longest-extent sizes. */
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { presentArithmeticDimensionSvg } from "../../src/lib/arithmetic-v2/presentation/dimensions";
import { dimensionPlans } from "./arithmetic-dimension-presentation-model";

async function main() {
  const out = path.resolve("tmp/arithmetic-dimension-presentation");
  const plans = dimensionPlans();
  const svgs = JSON.parse(
    await readFile(path.join(out, "displays.json"), "utf8"),
  ) as Record<string, string>;
  for (const p of plans) {
    assert.equal(
      presentArithmeticDimensionSvg(p.id, p.source),
      svgs[p.id],
      p.id,
    );
    assert.equal(
      presentArithmeticDimensionSvg(p.id, p.source + " "),
      undefined,
      "exact canonical bytes required",
    );
  }
  const browser = await chromium.launch({ headless: true });
  const failures: { id: string; mode: string; errors: string[] }[] = [];
  const modes: Record<string, unknown> = {};
  const style = (size: number) =>
    `<style>body{font:14px Arial,Malgun Gothic,sans-serif;margin:16px}main{display:grid;grid-template-columns:repeat(3,340px);gap:16px}article{border:1px solid #bbb;padding:12px;break-inside:avoid}svg{display:block;width:${size}px;height:${size}px;max-width:100%;margin:auto}h2{font-size:13px;font-weight:normal;overflow-wrap:anywhere}@media print{body{margin:0}main{grid-template-columns:repeat(2,85mm)}article{border:0}svg{width:74.083mm;height:74.083mm}}</style>`;
  try {
    const page = await browser.newPage({
      viewport: { width: 1120, height: 1000 },
    });
    // tsx preserves function names with this helper inside serialized callbacks.
    await page.evaluate("globalThis.__name = (value) => value");
    for (const [mode, size] of [
      ["screen-280", 280],
      ["screen-320", 320],
      ["print-280", 280],
    ] as const) {
      await page.emulateMedia({
        media: mode.startsWith("print") ? "print" : "screen",
      });
      let minFont = Infinity,
        minShape = Infinity;
      let labels = 0,
        dimensions = 0;
      for (let i = 0; i < plans.length; i += 100) {
        const batch = plans.slice(i, i + 100);
        await page.setContent(
          `<html lang="ko"><meta charset="utf-8">${style(size)}<main>${batch.map((p) => `<article>${svgs[p.id]}</article>`).join("")}</main></html>`,
        );
        const checks = await page.locator("svg").evaluateAll((nodes) =>
          nodes.map((node) => {
            const svg = node as SVGSVGElement;
            const errors: string[] = [];
            const textNodes = [...svg.querySelectorAll("text")];
            const matrix = svg.getScreenCTM()!;
            const px = Math.hypot(matrix.a, matrix.b);
            const viewport = svg.viewBox.baseVal;
            const transform = (x: number, y: number, m: DOMMatrix) => ({
              x: x * m.a + y * m.c + m.e,
              y: x * m.b + y * m.d + m.f,
            });
            const localMatrix = (e: SVGGraphicsElement) =>
              svg.getCTM()!.inverse().multiply(e.getCTM()!);
            let font = Infinity;
            const geometry = [
              ...svg.querySelectorAll(
                "[data-dimension-source] path,[data-dimension-source] circle,[data-dimension-right]",
              ),
            ] as SVGGeometryElement[];
            for (const label of textNodes) {
              const box = label.getBBox();
              const m = localMatrix(label);
              font = Math.min(
                font,
                parseFloat(getComputedStyle(label).fontSize) * px,
              );
              for (const [x, y] of [
                [box.x, box.y],
                [box.x + box.width, box.y],
                [box.x + box.width, box.y + box.height],
                [box.x, box.y + box.height],
              ]) {
                const p = transform(x, y, m);
                if (
                  p.x < viewport.x + 1 ||
                  p.y < viewport.y + 1 ||
                  p.x > viewport.x + viewport.width - 1 ||
                  p.y > viewport.y + viewport.height - 1
                )
                  errors.push(`clipped:${label.textContent}`);
              }
              // Test actual geometry ink in label-local coordinates, handling
              // rotated labels without false positives from their axis boxes.
              for (const g of geometry) {
                const intoLabel = label
                  .getCTM()!
                  .inverse()
                  .multiply(g.getCTM()!);
                const length = g.getTotalLength();
                const count = Math.max(2, Math.ceil(length / 1.5));
                for (let k = 0; k <= count; k++) {
                  const q = g.getPointAtLength((length * k) / count);
                  const p = transform(q.x, q.y, intoLabel);
                  if (
                    p.x > box.x - 1 &&
                    p.x < box.x + box.width + 1 &&
                    p.y > box.y - 1 &&
                    p.y < box.y + box.height + 1
                  ) {
                    errors.push(`geometry-label:${label.textContent}`);
                    break;
                  }
                }
              }
            }
            // Separating-axis test for the rotated text rectangles.
            const corners = textNodes.map((text) => {
              const b = text.getBBox(),
                m = localMatrix(text);
              return [
                [b.x - 1, b.y - 1],
                [b.x + b.width + 1, b.y - 1],
                [b.x + b.width + 1, b.y + b.height + 1],
                [b.x - 1, b.y + b.height + 1],
              ].map(([x, y]) => transform(x, y, m));
            });
            for (let a = 0; a < corners.length; a++)
              for (let b = a + 1; b < corners.length; b++) {
                const A = corners[a],
                  B = corners[b];
                const separated = [A, B].some((poly) =>
                  poly.some((p, j) => {
                    const q = poly[(j + 1) % 4],
                      nx = -(q.y - p.y),
                      ny = q.x - p.x;
                    const aa = A.map((r) => r.x * nx + r.y * ny),
                      bb = B.map((r) => r.x * nx + r.y * ny);
                    return (
                      Math.max(...aa) <= Math.min(...bb) ||
                      Math.max(...bb) <= Math.min(...aa)
                    );
                  }),
                );
                if (!separated)
                  errors.push(
                    `label-label:${textNodes[a].textContent}/${textNodes[b].textContent}`,
                  );
              }
            const ds = [...svg.querySelectorAll("[data-dimension]")];
            for (const d of ds) {
              const projected = d
                .getAttribute("data-projected")!
                .split(" ")
                .map(Number);
              const endpoints = d
                .getAttribute("data-endpoints")!
                .split(" ")
                .map(Number);
              const curve = d.querySelector(
                "[data-dimension-curve]",
              ) as SVGGeometryElement;
              if (!curve.getAttribute("mask"))
                errors.push("missing-editor-gap");
              const values = [
                curve.getPointAtLength(0),
                curve.getPointAtLength(curve.getTotalLength()),
              ];
              values.forEach((p, j) => {
                if (
                  Math.abs(
                    Math.hypot(
                      p.x - projected[2 * j],
                      p.y - projected[2 * j + 1],
                    ) - 1.5,
                  ) > 0.12
                )
                  errors.push("dimension-endpoint");
                if (
                  projected[2 * j] !== endpoints[2 * j] ||
                  projected[2 * j + 1] !== endpoints[2 * j + 1]
                ) {
                  const witness = d.querySelector(
                    `[data-dimension-witness="${j}"]`,
                  ) as SVGGeometryElement;
                  if (!witness) errors.push("missing-witness");
                  else {
                    const start = witness.getPointAtLength(0),
                      end = witness.getPointAtLength(witness.getTotalLength());
                    if (
                      Math.hypot(
                        start.x - endpoints[2 * j],
                        start.y - endpoints[2 * j + 1],
                      ) > 0.01 ||
                      Math.hypot(
                        end.x - projected[2 * j],
                        end.y - projected[2 * j + 1],
                      ) > 0.01
                    )
                      errors.push("witness-endpoint");
                  }
                }
              });
            }
            const shapeBox = (
              svg.querySelector("[data-dimension-source]") as SVGGElement
            ).getBoundingClientRect();
            const shape = Math.max(shapeBox.width, shapeBox.height);
            if (font < 12) errors.push(`small-font:${font.toFixed(2)}`);
            if (shape < 150) errors.push(`small-shape:${shape.toFixed(2)}`);
            return {
              errors: [...new Set(errors)],
              font,
              shape,
              labels: textNodes.length,
              dimensions: ds.length,
            };
          }),
        );
        checks.forEach((c, j) => {
          minFont = Math.min(minFont, c.font);
          minShape = Math.min(minShape, c.shape);
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
        labels,
        dimensions,
      };
      console.log(
        JSON.stringify({
          mode,
          ...(modes[mode] as object),
          failures: failures.length,
        }),
      );
    }
    const ids = [
      "age-e5-rectangle-area-v1-4-3",
      "age-e5-rectangle-area-side-v1-4-3",
      "age-e5-square-area-side-v1-5",
      "age-e5-triangle-area-height-v1-8-6",
      "age-e5-parallelogram-area-base-v1-8-6",
      "age-e5-trapezoid-area-top-v1-4-10-6",
      "age-e5-rhombus-area-diagonal-v1-8-6",
      "age-e5-triangle-perimeter-v1-8-6-4",
      "age-e5-regular-polygon-perimeter-v1-7-8",
      "age-e3-circle-diameter-v1-4",
      "age-e6-circle-radius-area-v1-4-314",
      "age-e6-cuboid-volume-height-v1-4-3-5",
    ];
    assert.ok(
      ids.every((id) => svgs[id]),
      "representatives exist",
    );
    const html = `<html lang="ko"><meta charset="utf-8">${style(280)}<h1>Dimension presentation — 280 px longest extent</h1><main>${ids.map((id) => `<article><h2>${id}</h2>${svgs[id]}</article>`).join("")}</main></html>`;
    await writeFile(path.join(out, "gallery.html"), html);
    await page.emulateMedia({ media: "screen" });
    await page.setContent(html);
    await page.screenshot({
      path: path.join(out, "gallery-280.png"),
      fullPage: true,
    });
    await page.emulateMedia({ media: "print" });
    await page.pdf({
      path: path.join(out, "gallery-print.pdf"),
      format: "A4",
      printBackground: true,
    });
    await page.screenshot({
      path: path.join(out, "gallery-print.png"),
      fullPage: true,
    });
  } finally {
    await browser.close();
  }
  await writeFile(
    path.join(out, "proof.json"),
    JSON.stringify({ modes, failures }, null, 2) + "\n",
  );
  assert.equal(
    failures.length,
    0,
    `${failures.length} dimension display failures; see proof.json`,
  );
}
main().catch((error) => {
  console.error(String(error));
  process.exitCode = 1;
});
