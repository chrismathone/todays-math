import { readEvidenceText } from "./arithmetic-full-figure-audit";
/** Independent final glyph/halo raster check at each recorded application aspect. */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { arithmeticGeometryCatalogSvg } from "../../src/lib/arithmetic-v2/geometry";
import { presentArithmeticGeometrySvg } from "../../src/lib/arithmetic-v2/presentation";
import { typesetArithmeticGeometrySvg } from "../../src/lib/arithmetic-v2/presentation/typography";
import { arithmeticGeometryNames } from "../../src/lib/arithmetic-v2/presentation/text";
import { output } from "./arithmetic-full-figure-audit";

async function main() {
  const baseline = process.argv.includes("--baseline");
  const dir =
    process.argv.find((a) => a.startsWith("--candidate="))?.slice(12) ??
    (baseline ? output : `${output}/remaining`);
  const entries = (
    baseline ? {} : JSON.parse(readEvidenceText(`${dir}/displays.json`, "utf8"))
  ) as Record<string, [string, string]>;
  const observations = JSON.parse(
    readEvidenceText(`${dir}/browser.json`, "utf8"),
  ) as {
    id: string;
    media: "screen" | "print";
    renderedWidth: number;
    renderedHeight: number;
  }[];
  const failures: unknown[] = [];
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.route("**/*", (r) => r.abort());
    await page.evaluate("globalThis.__name=(v)=>v");
    for (let offset = 0; offset < observations.length; offset += 30) {
      const batch = observations.slice(offset, offset + 30);
      await page.setContent(
        batch
          .map((r) => {
            const svg = entries[r.id]
              ? typesetArithmeticGeometrySvg(entries[r.id][1], {
                  normalizeLabel: arithmeticGeometryNames,
                })
              : presentArithmeticGeometrySvg(
                  r.id,
                  arithmeticGeometryCatalogSvg(r.id),
                );
            return `<article style="width:${r.renderedWidth}px;height:${r.renderedHeight}px">${svg}</article>`;
          })
          .join("") + "<style>article>svg{width:100%;height:100%}</style>",
      );
      const checks = await page
        .locator("article > svg")
        .evaluateAll(async (roots) =>
          Promise.all(
            roots.map(async (root) => {
              const svg = root as SVGSVGElement,
                frame = svg.getBoundingClientRect(),
                scale = 4;
              const geometry = [
                ...svg.querySelectorAll<SVGGeometryElement>(
                  "line,path,circle,ellipse,polygon,polyline,rect",
                ),
              ].filter(
                (n) =>
                  !n.closest(
                    "[data-label],text,defs,mask,clipPath,marker,pattern",
                  ),
              );
              const solid = geometry.filter((g) => {
                const style = getComputedStyle(g);
                return (
                  style.stroke !== "none" &&
                  style.strokeDasharray === "none" &&
                  !(
                    g.tagName === "path" &&
                    /[AQ]/i.test(g.getAttribute("d") ?? "") &&
                    parseFloat(style.strokeWidth) <= 0.86
                  )
                );
              });
              // Retain the actual inherited fonts/transforms and glyph/halo paint.
              // Remove only geometric ink, leaving defs and the complete label tree.
              const clone = svg.cloneNode(true) as SVGSVGElement;
              for (const g of clone.querySelectorAll(
                "line,path,circle,ellipse,polygon,polyline,rect",
              ))
                if (
                  !g.closest(
                    "[data-label],text,defs,mask,clipPath,marker,pattern",
                  )
                )
                  g.remove();
              clone.setAttribute("width", String(frame.width * scale));
              clone.setAttribute("height", String(frame.height * scale));
              clone.removeAttribute("style");
              const canvas = document.createElement("canvas");
              canvas.width = Math.ceil(frame.width * scale);
              canvas.height = Math.ceil(frame.height * scale);
              const ctx = canvas.getContext("2d", {
                  willReadFrequently: true,
                })!,
                img = new Image();
              img.src =
                "data:image/svg+xml;charset=utf-8," +
                encodeURIComponent(
                  new XMLSerializer().serializeToString(clone),
                );
              await img.decode();
              ctx.drawImage(
                img,
                0,
                0,
                frame.width * scale,
                frame.height * scale,
              );
              const pixels = ctx.getImageData(
                0,
                0,
                canvas.width,
                canvas.height,
              ).data;
              const painted = (x: number, y: number) => {
                const xx = Math.floor((x - frame.left) * scale),
                  yy = Math.floor((y - frame.top) * scale);
                return (
                  xx >= 0 &&
                  yy >= 0 &&
                  xx < canvas.width &&
                  yy < canvas.height &&
                  pixels[(yy * canvas.width + xx) * 4 + 3] > 8
                );
              };
              const hits: string[] = [];
              for (const g of solid) {
                const m = g.getScreenCTM()!,
                  radius =
                    (parseFloat(getComputedStyle(g).strokeWidth) *
                      Math.hypot(m.a, m.b)) /
                    2,
                  length = g.getTotalLength(),
                  count = Math.max(
                    2,
                    Math.ceil(length * Math.hypot(m.a, m.b) * 4),
                  );
                let hit = false;
                for (let k = 0; k <= count && !hit; k++) {
                  const p = g
                    .getPointAtLength((k * length) / count)
                    .matrixTransform(m);
                  for (let j = 0; j < 9; j++)
                    if (
                      painted(
                        p.x +
                          (j === 8 ? 0 : radius * Math.cos((j * Math.PI) / 4)),
                        p.y +
                          (j === 8 ? 0 : radius * Math.sin((j * Math.PI) / 4)),
                      )
                    ) {
                      hit = true;
                      break;
                    }
                }
                if (hit) hits.push(g.outerHTML);
              }
              return hits;
            }),
          ),
        );
      checks.forEach((hits, i) => {
        if (hits.length) failures.push({ ...batch[i], hits });
      });
      if (offset % 1200 === 0)
        console.log(
          `ink ${offset}/${observations.length}; failed observations ${failures.length}`,
        );
    }
    const result = {
      figures: new Set(observations.map((r) => r.id)).size,
      renders: observations.length,
      scale: 4,
      alphaThreshold: 8,
      strokeSamples:
        "0.25 CSS px centerline spacing, full half-width in eight radial directions plus center",
      failures,
    };
    writeFileSync(
      `${dir}/ink-proof.json`,
      JSON.stringify(result, null, 2) + "\n",
    );
    console.log(
      JSON.stringify({
        figures: result.figures,
        renders: result.renders,
        failures: failures.length,
      }),
    );
    if (!baseline) assert.deepEqual(failures, []);
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
