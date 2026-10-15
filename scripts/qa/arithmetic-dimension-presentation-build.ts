/** Local-only prebuild: engine dimensions + editor geometry, then real Chromium
 * layout for every SVG. Run from the checkout using its normal tsx toolchain.
 * --write publishes the new display pack; otherwise verifies reproducibility.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { deflateSync, strToU8 } from "fflate";
import { chromium } from "playwright";
import { curveMidpoint } from "../../src/components/unified/figure-editor/figureHandles";
import {
  applyLineGaps,
  gapPolygon,
} from "../../src/components/unified/figure-editor/figureMidLabel";
import {
  dimensionPlans,
  escapeXml,
  type Plan,
} from "./arithmetic-dimension-presentation-model";

const out = path.resolve("tmp/arithmetic-dimension-presentation");
// jsdom is an existing QA dependency without @types/jsdom in this project.
// Only its DOM parser is needed; browser geometry still comes from Chromium.
const { JSDOM } = createRequire(import.meta.url)("jsdom") as {
  JSDOM: new (html: string) => {
    window: { DOMParser: typeof DOMParser; close(): void };
  };
};
const assetPath =
  "src/lib/arithmetic-v2/presentation/dimensions-assets-v1.json";
const round = (n: number) => Number(n.toFixed(3));

function assemble(plan: Plan, curves: string[]) {
  const dimensions = plan.dimensions
    .map((d, i) => {
      const curve = curves[i];
      const midpoint = curveMidpoint(/\bd="([^"]+)"/.exec(curve)![1]);
      assert.ok(midpoint, `${plan.id}: editor must recognize the engine curve`);
      let angle =
        (Math.atan2(
          d.projected[1][1] - d.projected[0][1],
          d.projected[1][0] - d.projected[0][0],
        ) *
          180) /
        Math.PI;
      if (angle > 90) angle -= 180;
      if (angle <= -90) angle += 180;
      const witness = d.endpoints
        .map((p, j) => {
          const q = d.projected[j];
          return p[0] === q[0] && p[1] === q[1]
            ? ""
            : `<path data-dimension-witness="${j}" d="M${p.join(" ")} L${q.join(" ")}" fill="none" stroke="#555" stroke-width=".65" stroke-dasharray="3 3"/>`;
        })
        .join("");
      return `<g data-dimension="${d.name}" data-endpoints="${d.endpoints.flat().join(" ")}" data-projected="${d.projected.flat().join(" ")}">${witness}${curve.replace("<path ", '<path data-dimension-curve="true" ')}<text data-dimension-label="true" data-line-gap="1" x="${round(midpoint.x)}" y="${round(midpoint.y)}" transform="rotate(${round(angle)} ${round(midpoint.x)} ${round(midpoint.y)})" font-family="Arial,Malgun Gothic,sans-serif" font-size="16" text-anchor="middle" dominant-baseline="central" fill="#111" paint-order="stroke" stroke="#fff" stroke-width="4" stroke-linejoin="round">${escapeXml(d.label)}</text></g>`;
    })
    .join("");
  const top = Math.min(...plan.shape.map((p) => p[1]));
  const notes = plan.notes
    .map(
      (n, i) =>
        `<text data-dimension-note="true" x="0" y="${round(top - 45 - 21 * (plan.notes.length - 1 - i))}" font-family="Arial,Malgun Gothic,sans-serif" font-size="15" text-anchor="middle" dominant-baseline="central" fill="#111">${escapeXml(n)}</text>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-200 -200 400 400" width="300" height="300"><desc>arithmetic-geometry-drill-dimensions-v1</desc><g data-dimension-content="true">${plan.geometry}${dimensions}${notes}</g></svg>`;
}

async function main() {
  await mkdir(out, { recursive: true });
  const plans = dimensionPlans();
  const requests = plans.flatMap((p) =>
    p.dimensions.map((d) => [...d.projected[0], ...d.projected[1], d.offset]),
  );
  const generated = spawnSync(
    "python",
    ["scripts/qa/arithmetic-dimension-presentation-engine.py"],
    {
      input: JSON.stringify(requests),
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      windowsHide: true,
    },
  );
  assert.equal(generated.status, 0, generated.stderr);
  const curves = JSON.parse(generated.stdout) as string[];
  assert.equal(curves.length, requests.length);
  let cursor = 0;
  const svgs = plans.map((p) => {
    const part = curves.slice(cursor, cursor + p.dimensions.length);
    cursor += part.length;
    return assemble(p, part);
  });
  const browser = await chromium.launch({ headless: true });
  const dom = new JSDOM("");
  const glyphMetrics = new Map<string, { width: number; height: number }>();
  try {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 900 },
    });
    // Fit using actual glyph bounds, including rotated Korean unknown labels.
    for (let i = 0; i < plans.length; i += 120) {
      await page.setContent(
        `<html><meta charset="utf-8"><body>${svgs.slice(i, i + 120).join("")}</body></html>`,
      );
      const fitted = await page.locator("svg").evaluateAll((nodes) =>
        nodes.map((node) => {
          const svg = node as SVGSVGElement;
          const box = (
            svg.querySelector("[data-dimension-content]") as SVGGElement
          ).getBBox();
          const frame = [
            box.x - 10,
            box.y - 10,
            box.width + 20,
            box.height + 20,
          ].map((n) => Number(n.toFixed(3)));
          svg.setAttribute("viewBox", frame.join(" "));
          svg.setAttribute(
            "height",
            String(Number(((300 * frame[3]) / frame[2]).toFixed(3))),
          );
          const gaps = [...svg.querySelectorAll("[data-dimension-label]")].map(
            (label) => {
              const text = label as SVGTextElement;
              const b = text.getBBox();
              // Labels have only their own rotation. Reading that matrix directly
              // avoids page-position cancellation noise in mask hashes/rounding.
              const m = text.transform.baseVal.consolidate()?.matrix;
              return {
                key: `${text.getAttribute("font-size")}:${text.textContent}`,
                center: [
                  Number(text.getAttribute("x")),
                  Number(text.getAttribute("y")),
                ],
                box: {
                  x: b.x - 2,
                  y: b.y - 2,
                  width: b.width + 4,
                  height: b.height + 4,
                },
                matrix: m ? [m.a, m.b, m.c, m.d, m.e, m.f] : [1, 0, 0, 1, 0, 0],
              };
            },
          );
          return { svg: svg.outerHTML, gaps };
        }),
      );
      fitted.forEach(({ svg, gaps }, j) => {
        const doc = new dom.window.DOMParser().parseFromString(
          svg,
          "image/svg+xml",
        );
        // The editor's real gap implementation cuts only dimension strokes,
        // using actual browser glyph bounds. Geometry is never erased to hide
        // a collision. The editable curves themselves remain continuous.
        applyLineGaps(
          doc,
          [...doc.querySelectorAll("[data-dimension-curve]")],
          gaps.map((g) =>
            gapPolygon(
              (() => {
                // Browser getBBox can differ at the final float bit after
                // translating identical text. Share origin-independent glyph
                // metrics, rather than letting that bit alter mask IDs.
                let metrics = glyphMetrics.get(g.key);
                if (!metrics) {
                  metrics = {
                    width: round(g.box.width),
                    height: round(g.box.height),
                  };
                  glyphMetrics.set(g.key, metrics);
                }
                return {
                  x: g.center[0] - metrics.width / 2,
                  y: g.center[1] - metrics.height / 2,
                  ...metrics,
                };
              })(),
              g.matrix as [number, number, number, number, number, number],
            ).map(([x, y]) => [round(x), round(y)]),
          ),
        );
        svgs[i + j] = doc.documentElement.outerHTML;
      });
    }
  } finally {
    dom.window.close();
    await browser.close();
  }
  const families: Record<string, string> = {};
  let rawBytes = 0;
  const stats: Record<
    string,
    { count: number; rawBytes: number; deflateBytes: number }
  > = {};
  for (const family of [...new Set(plans.map((p) => p.family))]) {
    const rows = Object.fromEntries(
      plans.flatMap((p, i) =>
        p.family === family
          ? [[p.id.split("-v1-")[1], [p.source, svgs[i]]]]
          : [],
      ),
    );
    const raw = JSON.stringify(rows);
    const compressed = deflateSync(strToU8(raw), { level: 9 });
    families[family] = Buffer.from(compressed).toString("base64");
    rawBytes += Buffer.byteLength(raw);
    stats[family] = {
      count: Object.keys(rows).length,
      rawBytes: Buffer.byteLength(raw),
      deflateBytes: compressed.length,
    };
  }
  const digest = createHash("sha256")
    .update(JSON.stringify(families))
    .digest("hex");
  const serialized =
    JSON.stringify(
      {
        version: 1,
        codec: "deflate-base64-per-family",
        sha256: digest,
        families,
      },
      null,
      2,
    ) + "\n";
  if (process.argv.includes("--write")) await writeFile(assetPath, serialized);
  else
    assert.equal(
      (await readFile(assetPath, "utf8")).replace(/\r\n/g, "\n"),
      serialized,
      "Display pack reproduction changed; review generator/font/engine changes before publishing a new version",
    );
  await writeFile(path.join(out, "plans.json"), JSON.stringify(plans));
  await writeFile(
    path.join(out, "displays.json"),
    JSON.stringify(Object.fromEntries(plans.map((p, i) => [p.id, svgs[i]]))),
  );
  const summary = {
    count: plans.length,
    dimensions: requests.length,
    familyCount: Object.keys(families).length,
    rawBytes,
    assetBytes: Buffer.byteLength(serialized),
    deflateBytes: Object.values(stats).reduce((n, s) => n + s.deflateBytes, 0),
    gzipAssetBytes: (await import("node:zlib")).gzipSync(serialized).length,
    sha256: digest,
    families: stats,
  };
  await writeFile(
    path.join(out, "build.json"),
    JSON.stringify(summary, null, 2) + "\n",
  );
  console.log(JSON.stringify(summary));
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
