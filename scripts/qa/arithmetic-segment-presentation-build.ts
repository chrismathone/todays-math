/** Offline engine/editor prebuild. Runtime imports only the generated family packs. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { deflateSync, strToU8 } from "fflate";
import { chromium } from "playwright";
import { applyEditorDimensionGap } from "./arithmetic-segment-presentation-editor";
import { typesetArithmeticGeometrySvg as typeset } from "../../src/lib/arithmetic-v2/presentation/typography";
import {
  segmentPlans,
  escapeXml,
  type Segment,
} from "./arithmetic-segment-presentation-model";
import {
  dimensions,
  place,
  assemble,
  type Metric,
} from "./arithmetic-segment-presentation-layout";

const out = path.resolve("tmp/arithmetic-segment-presentation");
const assetPath = "src/lib/arithmetic-v2/presentation/segments-assets-v1.json";
const { JSDOM } = createRequire(import.meta.url)("jsdom") as {
  JSDOM: new (html: string) => {
    window: {
      DOMParser: typeof DOMParser;
      XMLSerializer: typeof XMLSerializer;
      close(): void;
    };
  };
};
const round = (n: number) => Number(n.toFixed(4));
async function main() {
  await mkdir(out, { recursive: true });
  const all = segmentPlans(),
    plans = process.argv.includes("--pilot")
      ? all.filter((p, i) => all.findIndex((q) => q.family === p.family) === i)
      : all;
  const browser = await chromium.launch({ headless: true });
  let dom = new JSDOM("");
  const bindDom = () =>
    Object.assign(globalThis, {
      DOMParser: dom.window.DOMParser,
      XMLSerializer: dom.window.XMLSerializer,
    });
  bindDom();
  const stats: Record<
    string,
    { count: number; rawBytes: number; deflateBytes: number }
  > = {};
  try {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 900 },
    });
    await page.evaluate("globalThis.__name=(value)=>value");
    const texts = [
      ...new Set(
        plans.flatMap((p) => [p.given.text, ...p.labels.map((l) => l.text)]),
      ),
    ];
    const metricSvgs = texts.map(
      (text) =>
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100"><text data-metric="${text}" x="0" y="0" text-anchor="middle" dominant-baseline="central" font-family="Arial, sans-serif" font-size="16" fill="black" stroke="none">${escapeXml(text)}</text></svg>`,
    );
    const metrics: Record<string, Metric> = {};
    for (const typed of [false, true]) {
      await page.setContent(
        `<html><body>${metricSvgs.map((s) => (typed ? typeset(s) : s)).join("")}</body></html>`,
      );
      const ms = await page.locator("[data-metric]").evaluateAll((nodes) =>
        nodes.map((node) => {
          const b = (node as SVGGraphicsElement).getBBox();
          return {
            text: node.getAttribute("data-metric")!,
            x: b.x,
            y: b.y,
            width: b.width,
            height: b.height,
          };
        }),
      );
      for (const m of ms) {
        const old = metrics[m.text];
        if (!old)
          metrics[m.text] = {
            x: m.x,
            y: m.y,
            width: m.width,
            height: m.height,
          };
        else {
          const x = Math.min(old.x, m.x),
            y = Math.min(old.y, m.y);
          metrics[m.text] = {
            x,
            y,
            width: Math.max(old.x + old.width, m.x + m.width) - x,
            height: Math.max(old.y + old.height, m.y + m.height) - y,
          };
        }
      }
    }
    const uniqueGeometry = [...new Set(plans.map((p) => p.geometry))],
      geometry = new Map<string, Segment[]>();
    for (let i = 0; i < uniqueGeometry.length; i += 80) {
      await page.setContent(
        `<html><body>${uniqueGeometry
          .slice(i, i + 80)
          .map(
            (g) =>
              `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-180 -180 360 360">${g}</svg>`,
          )
          .join("")}</body></html>`,
      );
      const samples = await page.locator("svg").evaluateAll((nodes) =>
        nodes.map((node) => {
          const svg = node as SVGSVGElement;
          const result: number[][][] = [];
          for (const el of svg.querySelectorAll<SVGGeometryElement>(
            "[data-segment-source] line,[data-segment-source] path,[data-segment-source] circle",
          )) {
            const matrix = svg.getCTM()!.inverse().multiply(el.getCTM()!);
            const total = el.getTotalLength(),
              count =
                el.localName === "line"
                  ? 1
                  : Math.max(2, Math.ceil(total * 1.5));
            let last: number[] | undefined;
            for (let j = 0; j <= count; j++) {
              const p = el.getPointAtLength((total * j) / count),
                q = [
                  matrix.a * p.x + matrix.c * p.y + matrix.e,
                  matrix.b * p.x + matrix.d * p.y + matrix.f,
                ];
              if (last) result.push([last, q]);
              last = q;
            }
          }
          return result;
        }),
      );
      samples.forEach((s, j) =>
        geometry.set(uniqueGeometry[i + j], s as Segment[]),
      );
    }
    async function editorOptions(
      rows: typeof plans,
      bend?: number,
      labelFraction = 0.5,
    ) {
      const result: ReturnType<typeof dimensions>[] = [];
      for (let i = 0; i < rows.length; i++) {
        result.push(dimensions(rows[i], bend, labelFraction));
        // JSDOM queues mutation cleanup until the next event-loop turn. Yield
        // between batches so full finite-domain generation has bounded live DOM.
        if ((i + 1) % 20 === 0) {
          await new Promise<void>((resolve) => setImmediate(resolve));
          dom.window.close();
          dom = new JSDOM("");
          bindDom();
          if ((i + 1) % 200 === 0)
            console.log(
              JSON.stringify({
                phase: "editor-commands",
                count: i + 1,
                total: rows.length,
                bend,
                labelFraction,
              }),
            );
        }
      }
      return result;
    }
    const options = await editorOptions(plans);
    await writeFile(
      path.join(out, "editor-default-options.json"),
      JSON.stringify(options),
    );
    let commandCount = options.flat().length;
    async function measure(editorDimensions: ReturnType<typeof dimensions>) {
      for (let i = 0; i < editorDimensions.length; i += 80) {
        const batch = editorDimensions.slice(i, i + 80);
        await page.setContent(
          `<html><body>${batch
            .flatMap((d) => {
              const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-180 -180 360 360">${d.sourceGeometry}${d.label.replace("<text ", '<text data-measured-dimension="true" ')}</svg>`;
              return [svg, typeset(svg)];
            })
            .join("")}</body></html>`,
        );
        const boxes = await page
          .locator("[data-measured-dimension]")
          .evaluateAll(async (nodes) =>
            Promise.all(
              nodes.map(async (n) => {
                const label = n as SVGGraphicsElement,
                  b = label.getBBox();
                const scale = 4,
                  pad = 10,
                  left = b.x - pad,
                  top = b.y - pad;
                const width = Math.ceil((b.width + pad * 2) * scale),
                  height = Math.ceil((b.height + pad * 2) * scale);
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const context = canvas.getContext("2d", {
                  willReadFrequently: true,
                })!;
                const image = new Image();
                image.src =
                  "data:image/svg+xml;charset=utf-8," +
                  encodeURIComponent(
                    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${left} ${top} ${width / scale} ${height / scale}">${label.outerHTML}</svg>`,
                  );
                await image.decode();
                context.drawImage(image, 0, 0);
                const pixels = context.getImageData(0, 0, width, height).data;
                const painted = (x: number, y: number) => {
                  const xx = Math.floor((x - left) * scale),
                    yy = Math.floor((y - top) * scale);
                  // Reserve one raster pixel (0.25 SVG units) for the final
                  // fitted viewport's subpixel phase. This changes candidate
                  // acceptance only; editor paths, halos and masks stay exact.
                  for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                      const px = xx + dx,
                        py = yy + dy;
                      if (
                        px >= 0 &&
                        py >= 0 &&
                        px < width &&
                        py < height &&
                        pixels[(py * width + px) * 4 + 3] > 8
                      )
                        return true;
                    }
                  }
                  return false;
                };
                let sourceInkClear = true;
                for (const geometry of label.ownerSVGElement!.querySelectorAll<SVGGeometryElement>(
                  "[data-segment-source] line,[data-segment-source] path,[data-segment-source] circle",
                )) {
                  const m = label
                    .getCTM()!
                    .inverse()
                    .multiply(geometry.getCTM()!);
                  const radius =
                    (parseFloat(getComputedStyle(geometry).strokeWidth) *
                      Math.hypot(m.a, m.b)) /
                    2;
                  const length = geometry.getTotalLength(),
                    steps = Math.ceil(length * 2);
                  for (let step = 0; step <= steps && sourceInkClear; step++) {
                    const p = geometry.getPointAtLength(
                        (length * step) / steps,
                      ),
                      x = m.a * p.x + m.c * p.y + m.e,
                      y = m.b * p.x + m.d * p.y + m.f;
                    if (
                      x < left - radius ||
                      x > left + width / scale + radius ||
                      y < top - radius ||
                      y > top + height / scale + radius
                    )
                      continue;
                    for (let point = 0; point < 9; point++) {
                      const r = point === 8 ? 0 : radius,
                        angle = (point * Math.PI) / 4;
                      if (
                        painted(
                          x + r * Math.cos(angle),
                          y + r * Math.sin(angle),
                        )
                      ) {
                        sourceInkClear = false;
                        break;
                      }
                    }
                  }
                  if (!sourceInkClear) break;
                }
                return {
                  x: b.x,
                  y: b.y,
                  width: b.width,
                  height: b.height,
                  sourceInkClear,
                };
              }),
            ),
          );
        assert.equal(boxes.length, batch.length * 2);
        batch.forEach((d, j) => {
          const a = boxes[j * 2],
            b = boxes[j * 2 + 1];
          const x = Math.min(a.x, b.x),
            y = Math.min(a.y, b.y);
          d.sourceInkClear = a.sourceInkClear && b.sourceInkClear;
          d.box = {
            x: x - d.at[0],
            y: y - d.at[1],
            width: Math.max(a.x + a.width, b.x + b.width) - x,
            height: Math.max(a.y + a.height, b.y + b.height) - y,
          };
        });
      }
    }
    await measure(options.flat());
    const layouts = plans.map((p, i) => {
      try {
        return place(p, geometry.get(p.geometry)!, metrics, options[i]);
      } catch {
        return undefined;
      }
    });
    console.log(
      JSON.stringify({
        phase: "editor-default",
        figures: plans.length,
        needsBend: layouts.filter((l) => !l).length,
      }),
    );
    for (const [bend, labelFraction] of [16, 20, 24, 28, 36, 48, 60].flatMap(
      (b) => [0.5, 0.35, 0.65].map((t) => [b, t]),
    )) {
      const missing = plans.flatMap((p, i) => (layouts[i] ? [] : [{ p, i }]));
      if (!missing.length) break;
      const next = await editorOptions(
        missing.map(({ p }) => p),
        bend,
        labelFraction,
      );
      commandCount += next.flat().length;
      await measure(next.flat());
      missing.forEach(({ p, i }, j) => {
        try {
          layouts[i] = place(p, geometry.get(p.geometry)!, metrics, next[j]);
        } catch {
          /* try next editor bend */
        }
      });
      console.log(
        JSON.stringify({
          phase: "editor-bend",
          bend,
          labelFraction,
          remaining: layouts.filter((l) => !l).length,
        }),
      );
    }
    const failures = plans.flatMap((p, i) => (layouts[i] ? [] : [p.id]));
    await writeFile(
      path.join(out, "layout-failures.json"),
      JSON.stringify(failures, null, 2),
    );
    assert.deepEqual(failures, []);
    const svgs = plans.map((p, i) => assemble(p, layouts[i]!));
    console.log(
      JSON.stringify({
        phase: "layout",
        count: plans.length,
        uniqueGeometry: uniqueGeometry.length,
        editorCommands: commandCount,
      }),
    );
    // Fit to the union of actual plain and typeset ink, not estimated font widths.
    for (let i = 0; i < plans.length; i += 80) {
      await page.setContent(
        `<html><body>${svgs
          .slice(i, i + 80)
          .flatMap((s) => [s, typeset(s)])
          .join("")}</body></html>`,
      );
      const boxes = await page
        .locator("[data-segment-content]")
        .evaluateAll((nodes) =>
          nodes.map((n) => {
            const b = (n as SVGGraphicsElement).getBBox();
            return { x: b.x, y: b.y, width: b.width, height: b.height };
          }),
        );
      for (let j = 0; j < Math.min(80, plans.length - i); j++) {
        const a = boxes[2 * j],
          b = boxes[2 * j + 1],
          x = Math.min(a.x, b.x) - 8,
          y = Math.min(a.y, b.y) - 8,
          w = Math.max(a.x + a.width, b.x + b.width) - x + 8,
          h = Math.max(a.y + a.height, b.y + b.height) - y + 8;
        const doc = new dom.window.DOMParser().parseFromString(
            svgs[i + j],
            "image/svg+xml",
          ),
          root = doc.documentElement;
        root.setAttribute("viewBox", [x, y, w, h].map(round).join(" "));
        root.setAttribute("width", String(round((280 * w) / Math.max(w, h))));
        root.setAttribute("height", String(round((280 * h) / Math.max(w, h))));
        if (layouts[i + j]!.dimension.bend !== undefined) {
          await applyEditorDimensionGap(doc);
        }
        svgs[i + j] = root.outerHTML;
      }
    }
    await writeFile(path.join(out, "plans.json"), JSON.stringify(plans));
    await writeFile(path.join(out, "layouts.json"), JSON.stringify(layouts));
    await writeFile(
      path.join(out, "displays.json"),
      JSON.stringify(Object.fromEntries(plans.map((p, i) => [p.id, svgs[i]]))),
    );
    const families: Record<string, string> = {};
    for (const family of [...new Set(plans.map((p) => p.family))]) {
      const rows = Object.fromEntries(
        plans.flatMap((p, i) =>
          p.family === family ? [[p.tuple, [p.source, svgs[i]]]] : [],
        ),
      );
      const raw = JSON.stringify(rows),
        packed = deflateSync(strToU8(raw), { level: 9 });
      families[family] = Buffer.from(packed).toString("base64");
      stats[family] = {
        count: Object.keys(rows).length,
        rawBytes: Buffer.byteLength(raw),
        deflateBytes: packed.length,
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
    if (!process.argv.includes("--pilot")) {
      if (process.argv.includes("--write"))
        await writeFile(assetPath, serialized);
      else
        assert.ok(
          (await readFile(assetPath, "utf8")).replace(/\r\n/g, "\n") ===
            serialized,
          "Generated segment asset differs; review the display proof before using --write",
        );
    }
    const summary = {
      figures: plans.length,
      families: Object.keys(families).length,
      rawBytes: Object.values(stats).reduce((n, s) => n + s.rawBytes, 0),
      deflateBytes: Object.values(stats).reduce(
        (n, s) => n + s.deflateBytes,
        0,
      ),
      jsonBytes: Buffer.byteLength(serialized),
      gzipJsonBytes: gzipSync(serialized).length,
      maxFamilyRawBytes: Math.max(
        ...Object.values(stats).map((s) => s.rawBytes),
      ),
      sha256: digest,
      stats,
    };
    await writeFile(
      path.join(out, "build.json"),
      JSON.stringify(summary, null, 2) + "\n",
    );
    console.log(JSON.stringify(summary));
  } finally {
    dom.window.close();
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
