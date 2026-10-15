/** Protect source stroke ink from the actual numeric label and editor halo. */
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { typesetArithmeticGeometrySvg } from "../../src/lib/arithmetic-v2/presentation/typography";

async function main() {
  const out = "tmp/arithmetic-segment-presentation";
  const displays = JSON.parse(
    await readFile(`${out}/displays.json`, "utf8"),
  ) as Record<string, string>;
  const entries = Object.entries(displays);
  const failures: unknown[] = [];
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.evaluate("globalThis.__name=(v)=>v");
    for (const typed of [false, true]) {
      for (let i = 0; i < entries.length; i += 50) {
        const batch = entries.slice(i, i + 50);
        await page.setContent(
          batch
            .map(([, svg]) => (typed ? typesetArithmeticGeometrySvg(svg) : svg))
            .join(""),
        );
        const checks = await page.locator("svg").evaluateAll(async (nodes) =>
          Promise.all(
            nodes.map(async (node) => {
              const svg = node as SVGSVGElement;
              const label = svg.querySelector<SVGGraphicsElement>(
                "[data-segment-number]",
              )!;
              const b = label.getBBox(),
                pad = 10,
                scale = 4,
                left = b.x - pad,
                top = b.y - pad;
              const width = Math.ceil((b.width + pad * 2) * scale),
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
                  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${left} ${top} ${width / scale} ${height / scale}">${label.outerHTML}</svg>`,
                );
              await img.decode();
              ctx.drawImage(img, 0, 0);
              const pixels = ctx.getImageData(0, 0, width, height).data;
              const painted = (x: number, y: number) => {
                const xx = Math.floor((x - left) * scale),
                  yy = Math.floor((y - top) * scale);
                return (
                  xx >= 0 &&
                  yy >= 0 &&
                  xx < width &&
                  yy < height &&
                  pixels[(yy * width + xx) * 4 + 3] > 8
                );
              };
              const hits: string[] = [];
              for (const path of svg.querySelectorAll<SVGPathElement>(
                "[data-segment-source] path,[data-segment-curve]",
              )) {
                if (
                  !/[zZ]/.test(path.getAttribute("d") ?? "") &&
                  getComputedStyle(path).fill !== "none"
                )
                  hits.push(`filled-open-path:${path.outerHTML}`);
              }
              for (const g of svg.querySelectorAll<SVGGeometryElement>(
                "[data-segment-source] line,[data-segment-source] path,[data-segment-source] circle",
              )) {
                const matrix = label.getCTM()!.inverse().multiply(g.getCTM()!);
                const radius =
                  (parseFloat(getComputedStyle(g).strokeWidth) *
                    Math.hypot(matrix.a, matrix.b)) /
                  2;
                const length = g.getTotalLength(),
                  count = Math.ceil(length * 2);
                let hit = false;
                for (let k = 0; k <= count && !hit; k++) {
                  const p = g.getPointAtLength((length * k) / count),
                    x = matrix.a * p.x + matrix.c * p.y + matrix.e,
                    y = matrix.b * p.x + matrix.d * p.y + matrix.f;
                  if (
                    x < left - radius ||
                    x > left + width / scale + radius ||
                    y < top - radius ||
                    y > top + height / scale + radius
                  )
                    continue;
                  for (let j = 0; j < 9; j++) {
                    const r = j === 8 ? 0 : radius,
                      angle = (j * Math.PI) / 4;
                    if (
                      painted(x + r * Math.cos(angle), y + r * Math.sin(angle))
                    ) {
                      hit = true;
                      break;
                    }
                  }
                }
                if (hit) hits.push(g.outerHTML);
              }
              return hits;
            }),
          ),
        );
        checks.forEach((hits, j) => {
          if (hits.length) failures.push({ id: batch[j][0], typed, hits });
        });
      }
      console.log(
        JSON.stringify({
          typed,
          figures: entries.length,
          failures: failures.length,
        }),
      );
    }
    await writeFile(
      `${out}/ink-proof.json`,
      JSON.stringify(
        { figures: entries.length, renders: entries.length * 2, failures },
        null,
        2,
      ),
    );
    assert.deepEqual(failures, []);
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
