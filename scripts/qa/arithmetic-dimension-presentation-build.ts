/** Offline display pack, built by the actual editor commands in Chromium.
 * Exact defaults are preferred; recorded editor handle/label edits resolve collisions.
 * Raw labels retain the facade contract; masks come from typesetFigureSvg verbatim.
 * --write publishes; default verifies deterministic reproduction.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { deflateSync, strToU8 } from "fflate";
import { chromium } from "playwright";
import { build, normalizePath } from "vite";
import {
  dimensionPlans,
  escapeXml,
} from "./arithmetic-dimension-presentation-model";
import type { typesetFigureSvg } from "../../src/components/unified/figure-editor/figureTypeset";
import type { addFigureMark } from "../../src/components/unified/figure-editor/figureMarks";
import type {
  addFigureObject,
  editFigureObject,
  figureObjects,
} from "../../src/components/unified/figure-editor/figureSvgEditing";
import type { sampleFigurePath } from "../../src/components/unified/figure-editor/figureFlip";
import type { moveFigureHandle } from "../../src/components/unified/figure-editor/figureHandles";
import type { addMidLabel } from "../../src/components/unified/figure-editor/figureMidLabel";
import type { typesetArithmeticGeometrySvg } from "../../src/lib/arithmetic-v2/presentation/typography";
import type { prepareFigureSvg } from "../../src/components/unified/figure-editor/figureSvgEditing";

const pilotFamily = process.argv
  .find((a) => a.startsWith("--family="))
  ?.slice(9);
const out = path.resolve(
  `tmp/arithmetic-dimension-presentation${pilotFamily ? "-pilot" : ""}`,
);
const assetPath =
  "src/lib/arithmetic-v2/presentation/dimensions-assets-v1.json";

async function main() {
  await mkdir(out, { recursive: true });
  const allPlans = dimensionPlans();
  assert.equal(allPlans.length, 7754);
  assert.equal(new Set(allPlans.map((p) => p.family)).size, 56);
  const plans = pilotFamily
    ? allPlans.filter((p) => p.family === pilotFamily)
    : allPlans;
  assert.ok(plans.length);
  assert.ok(
    !pilotFamily || !process.argv.includes("--write"),
    "Pilots cannot publish a partial pack",
  );
  const require = createRequire("C:/Creative/testautocreator/package.json");
  const entry = path.join(out, "editor-entry.ts");
  await writeFile(
    entry,
    `export { typesetFigureSvg } from "../../src/components/unified/figure-editor/figureTypeset";
    export { addFigureMark } from "../../src/components/unified/figure-editor/figureMarks";
    export { prepareFigureSvg, addFigureObject, editFigureObject, figureObjects } from "../../src/components/unified/figure-editor/figureSvgEditing";
    export { sampleFigurePath } from "../../src/components/unified/figure-editor/figureFlip";
    export { moveFigureHandle, CURVE_BEND_HANDLE } from "../../src/components/unified/figure-editor/figureHandles";
    export { addMidLabel } from "../../src/components/unified/figure-editor/figureMidLabel";
    export { typesetArithmeticGeometrySvg } from "../../src/lib/arithmetic-v2/presentation/typography";`,
  );
  const bundle = await build({
    configFile: false,
    logLevel: "error",
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    resolve: { alias: { "@": path.resolve("src") } },
    plugins: [
      {
        name: "existing-dimension-dependencies",
        enforce: "pre",
        resolveId(id) {
          if (id === "fflate")
            return normalizePath(
              path.resolve(require.resolve("fflate"), "../../esm/browser.js"),
            );
          if (
            id.startsWith(".") ||
            id.startsWith("/") ||
            id.includes(":") ||
            id.startsWith("@/")
          )
            return;
          try {
            return normalizePath(require.resolve(id));
          } catch {
            return;
          }
        },
      },
    ],
    build: {
      write: false,
      minify: true,
      lib: { entry, name: "DimensionEditor", formats: ["iife"] },
    },
  });
  const outputs = Array.isArray(bundle)
    ? bundle.flatMap((r) => r.output)
    : "output" in bundle
      ? bundle.output
      : [];
  const code = outputs.find((o) => o.type === "chunk")?.code;
  assert.ok(code);
  await writeFile(
    path.join(out, "editor.html"),
    '<html><meta charset="utf-8"><body></body></html>',
  );
  await writeFile(path.join(out, "editor.js"), code);
  const browser = await chromium.launch({ headless: true });
  const svgs: string[] = [];
  try {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 900 },
    });
    page.on("pageerror", (error) => console.error("Editor browser:", error));
    await page.goto(pathToFileURL(path.join(out, "editor.html")).href);
    await page.addScriptTag({ content: code });
    await page.evaluate("globalThis.__name = (value) => value");
    for (let i = 0; i < plans.length; i += 100) {
      const rows = plans.slice(i, i + 100).map((plan) => {
        const top = Math.min(...plan.shape.map((p) => p[1]));
        const notes = plan.notes
          .map(
            (n, j) =>
              `<text data-dimension-note="true" x="0" y="${Number((top - (plan.family.includes("cylinder-net") ? 75 : 45) - 26 * (plan.notes.length - 1 - j)).toFixed(3))}" font-family="Arial,Malgun Gothic,sans-serif" font-size="18" text-anchor="middle" dominant-baseline="central" fill="#111">${escapeXml(n)}</text>`,
          )
          .join("");
        return { ...plan, noteSvg: notes };
      });
      const rendered = await page.evaluate(async (rows) => {
        const editor = (
          window as unknown as {
            DimensionEditor: {
              typesetFigureSvg: typeof typesetFigureSvg;
              addFigureMark: typeof addFigureMark;
              prepareFigureSvg: typeof prepareFigureSvg;
              addFigureObject: typeof addFigureObject;
              editFigureObject: typeof editFigureObject;
              figureObjects: typeof figureObjects;
              moveFigureHandle: typeof moveFigureHandle;
              sampleFigurePath: typeof sampleFigurePath;
              CURVE_BEND_HANDLE: string;
              addMidLabel: typeof addMidLabel;

              typesetArithmeticGeometrySvg: typeof typesetArithmeticGeometrySvg;
            };
          }
        ).DimensionEditor;
        const ns = "http://www.w3.org/2000/svg";
        const parser = new DOMParser();
        const cacheHost = globalThis as unknown as {
          dimensionDisplayCache?: Map<string, string>;
        };
        const cache = (cacheHost.dimensionDisplayCache ??= new Map<
          string,
          string
        >());
        const outputs: string[] = [];
        for (const plan of rows) {
          const key = JSON.stringify([
            plan.geometry,
            plan.dimensions,
            plan.noteSvg,
          ]);
          const cached = cache.get(key);
          if (cached) {
            outputs.push(cached);
            continue;
          }
          const header = `<svg xmlns="${ns}" viewBox="-200 -200 400 400" width="300" height="300">`;
          let current = editor.prepareFigureSvg(
            `${header}${plan.geometry}</svg>`,
          );
          const geometryDoc = parser.parseFromString(
            `${header}${plan.geometry}</svg>`,
            "image/svg+xml",
          );
          const originalShapes = [
            ...geometryDoc.querySelectorAll("path,circle"),
          ];
          const preparedShapes = [
            ...parser
              .parseFromString(current, "image/svg+xml")
              .querySelectorAll("path,circle"),
          ];
          for (let j = 0; j < originalShapes.length; j++) {
            const node = originalShapes[j];
            if (
              (node.getAttribute("fill") ??
                node.closest("[fill]")?.getAttribute("fill")) !== "none"
            )
              continue;
            const id = preparedShapes[j].getAttribute("data-object-id")!;
            current = editor.editFigureObject(current, id, { fill: "none" });
            const edited = parser
              .parseFromString(current, "image/svg+xml")
              .querySelector(`[data-object-id="${id}"]`)!;
            node.setAttribute("fill", edited.getAttribute("fill")!);
            node.setAttribute("data-editor-fill", "none");
          }
          const geometry = geometryDoc.documentElement.innerHTML;
          // Preserve raw labels for the facade. All mask definitions and attachments
          // are extracted verbatim from the editor's real asynchronous render.
          const masksFromEditor = async (raw: string) => {
            const doc = parser.parseFromString(raw, "image/svg+xml");
            const nodes = [
              ...doc.querySelectorAll(
                "path,line,polyline,polygon,circle,ellipse,rect,text",
              ),
            ].filter((n) => !n.closest("defs"));
            nodes.forEach((n, j) =>
              n.setAttribute("data-object-id", `dimension-audit-${j}`),
            );
            const rendered = parser.parseFromString(
              await editor.typesetFigureSvg(
                doc.documentElement.outerHTML,
                true,
              ),
              "image/svg+xml",
            );
            const defs =
              rendered.querySelector(":scope > svg > defs") ??
              rendered.documentElement.querySelector(":scope > defs");
            if (defs) doc.documentElement.prepend(doc.importNode(defs, true));
            nodes.forEach((n) => {
              const exact = rendered.querySelector(
                `[data-object-id="${n.getAttribute("data-object-id")}"]`,
              )!;
              if (exact.hasAttribute("mask"))
                n.setAttribute("mask", exact.getAttribute("mask")!);
              n.removeAttribute("data-object-id");
            });
            return doc.documentElement.outerHTML;
          };
          const groups: string[] = [];
          const probe = document.createElement("div");
          document.body.append(probe);
          probe.innerHTML = `${header}${geometry}</svg>`;
          const sourceSvg = probe.querySelector("svg")!;
          const sourceInk: {
            x: number;
            y: number;
            auxiliary: boolean;
            radius: number;
          }[] = [];
          for (const g of [
            ...sourceSvg.querySelectorAll(
              "[data-dimension-source] path,[data-dimension-source] circle,[data-dimension-right]",
            ),
          ] as SVGGeometryElement[]) {
            const m = sourceSvg.getCTM()!.inverse().multiply(g.getCTM()!);
            const length = g.getTotalLength(),
              count = Math.ceil(length / 0.5);
            const radius =
              (parseFloat(getComputedStyle(g).strokeWidth) / 2 + 0.15) *
              Math.hypot(m.a, m.b);
            for (let k = 0; k <= count; k++) {
              const p = g
                .getPointAtLength((length * k) / count)
                .matrixTransform(m);
              sourceInk.push({
                x: p.x,
                y: p.y,
                radius,
                auxiliary:
                  !g.hasAttribute("data-dimension-right") &&
                  g.tagName === "path" &&
                  !/cuboid|cube-/.test(plan.family) &&
                  (g.hasAttribute("stroke-dasharray") ||
                    plan.family.includes("circle") ||
                    (plan.family.includes("cylinder-net") &&
                      !/[zZ]/.test(g.getAttribute("d")!))),
              });
            }
          }
          const parts = (svg: string, known: Set<string | null>) =>
            [
              ...parser
                .parseFromString(svg, "image/svg+xml")
                .querySelectorAll("[data-object-id]"),
            ].filter((n) => !known.has(n.getAttribute("data-object-id")));
          const clean = (nodes: Element[]) =>
            nodes
              .map((node, j) => {
                const copy = node.cloneNode(true) as Element;
                copy.removeAttribute("data-object-id");
                copy.setAttribute(
                  j === 0 ? "data-dimension-curve" : "data-dimension-label",
                  "true",
                );
                return copy.outerHTML;
              })
              .join("");
          const inkCache = new Map<
            string,
            { x: number; y: number; width: number; height: number }
          >();
          const inkBox = async (label: SVGGraphicsElement) => {
            const b = label.getBBox();
            if (label.tagName !== "text") return b;
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
                top = b.y - y - pad;
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
          const haloRasters = new Map<
            SVGGraphicsElement,
            {
              left: number;
              top: number;
              width: number;
              height: number;
              pixels: Uint8ClampedArray;
            }
          >();
          const haloCovers = async (
            label: SVGGraphicsElement,
            p: { x: number; y: number },
            radius: number,
            fully = false,
          ) => {
            let raster = haloRasters.get(label);
            if (!raster) {
              const b = label.getBBox(),
                left = b.x - 10,
                top = b.y - 10,
                width = Math.ceil((b.width + 20) * 4),
                height = Math.ceil((b.height + 20) * 4);
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
                  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${left} ${top} ${width / 4} ${height / 4}">${label.outerHTML}</svg>`,
                );
              await img.decode();
              ctx.drawImage(img, 0, 0);
              raster = {
                left,
                top,
                width,
                height,
                pixels: ctx.getImageData(0, 0, width, height).data,
              };
              haloRasters.set(label, raster);
            }
            const cx = (p.x - raster.left) * 4,
              cy = (p.y - raster.top) * 4,
              r = radius * 4;
            let encountered = false;
            for (
              let y = Math.max(0, Math.floor(cy - r));
              y <= Math.min(raster.height - 1, Math.ceil(cy + r));
              y++
            )
              for (
                let x = Math.max(0, Math.floor(cx - r));
                x <= Math.min(raster.width - 1, Math.ceil(cx + r));
                x++
              )
                if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r + 0.5) {
                  encountered = true;
                  const alpha = raster.pixels[(y * raster.width + x) * 4 + 3];
                  if (fully ? alpha < 245 : alpha > 8) return !fully;
                }
            return fully && encountered;
          };
          const intersects = async (candidate: string, minFont = 0) => {
            const raw = `${header}${geometry}${groups.join("")}<g data-probe="true">${candidate}</g>${plan.noteSvg}</svg>`;
            // Cheap rejection before invoking the asynchronous editor renderer.
            for (const variant of [
              raw,
              editor.typesetArithmeticGeometrySvg(raw),
            ]) {
              probe.innerHTML = variant;
              const svg = probe.querySelector("svg")!;
              const label = svg.querySelector(
                "[data-probe] [data-dimension-label]",
              ) as SVGGraphicsElement;
              const b = label.getBBox();
              if (
                sourceInk.some(
                  (p) =>
                    !p.auxiliary &&
                    p.x > b.x - 3 &&
                    p.x < b.x + b.width + 3 &&
                    p.y > b.y - 3 &&
                    p.y < b.y + b.height + 3,
                )
              )
                return true;
              for (const other of [
                ...svg.querySelectorAll(
                  "[data-dimension-label],[data-dimension-note]",
                ),
              ] as SVGGraphicsElement[]) {
                if (other === label) continue;
                const o = other.getBBox();
                if (
                  o.x < b.x + b.width + 3 &&
                  o.x + o.width > b.x - 3 &&
                  o.y < b.y + b.height + 3 &&
                  o.y + o.height > b.y - 3
                )
                  return true;
              }
              const extent = svg.getBBox(),
                pad = Math.max(
                  10,
                  Math.max(extent.width, extent.height) * 0.04,
                );
              if (
                (Number(label.getAttribute("font-size")) * 280) /
                  (Math.max(extent.width, extent.height) + 2 * pad) <
                minFont
              )
                return true;
            }
            const masked = await masksFromEditor(raw);
            for (const typeset of [false, true]) {
              probe.innerHTML = typeset
                ? editor.typesetArithmeticGeometrySvg(masked)
                : masked;
              const svg = probe.querySelector("svg")!;
              const label = svg.querySelector(
                "[data-probe] [data-dimension-label]",
              ) as SVGGraphicsElement;
              const box = await inkBox(label);
              const into = (g: SVGGraphicsElement) =>
                label.getCTM()!.inverse().multiply(g.getCTM()!);
              const bounds = new Map<number[][], number[]>();
              const contains = (
                poly: number[][],
                p: { x: number; y: number },
                radius = 0,
              ) => {
                let b = bounds.get(poly);
                if (!b) {
                  b = [
                    Math.min(...poly.map((p) => p[0])),
                    Math.min(...poly.map((p) => p[1])),
                    Math.max(...poly.map((p) => p[0])),
                    Math.max(...poly.map((p) => p[1])),
                  ];
                  bounds.set(poly, b);
                }
                if (
                  p.x < b[0] - radius ||
                  p.y < b[1] - radius ||
                  p.x > b[2] + radius ||
                  p.y > b[3] + radius
                )
                  return false;
                let inside = false;
                for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
                  const [x, y] = poly[i],
                    [xx, yy] = poly[j];
                  if (
                    y > p.y !== yy > p.y &&
                    p.x < ((xx - x) * (p.y - y)) / (yy - y) + x
                  )
                    inside = !inside;
                }
                if (inside || radius === 0) return inside;
                return poly.some(([x, y], i) => {
                  const [xx, yy] = poly[(i + 1) % poly.length],
                    dx = xx - x,
                    dy = yy - y;
                  const t = Math.max(
                    0,
                    Math.min(
                      1,
                      ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy),
                    ),
                  );
                  return (
                    Math.hypot(p.x - x - t * dx, p.y - y - t * dy) < radius
                  );
                });
              };
              // Every protected stroke must survive the actual mask, including
              // its padding. Auxiliary ink may disappear only in a real mask.
              const rootMask = svg
                .querySelector("[data-probe] [mask]")
                ?.getAttribute("mask");
              const maskId = /url\(#([^)]*)\)/.exec(rootMask ?? "")?.[1];
              const rootHoles = maskId
                ? [...svg.querySelectorAll(`mask[id="${maskId}"] polygon`)].map(
                    (n) =>
                      n
                        .getAttribute("points")!
                        .split(/\s+/)
                        .map((p) => p.split(",").map(Number)),
                  )
                : [];
              for (const p of sourceInk) {
                const margin = p.auxiliary ? 0.5 : 3;
                const hit =
                  p.x > box.x - margin &&
                  p.x < box.x + box.width + margin &&
                  p.y > box.y - margin &&
                  p.y < box.y + box.height + margin;
                if (
                  !p.auxiliary &&
                  (hit || rootHoles.some((poly) => contains(poly, p, p.radius)))
                )
                  return true;
                if (
                  p.auxiliary &&
                  hit &&
                  !rootHoles.some((poly) => contains(poly, p)) &&
                  !(
                    label.getAttribute("stroke") === "#ffffff" &&
                    (await haloCovers(label, p, p.radius, true))
                  )
                )
                  return true;
              }
              for (const other of [
                ...svg.querySelectorAll(
                  "[data-dimension-label],[data-dimension-note]",
                ),
              ] as SVGGraphicsElement[]) {
                if (other === label) continue;
                const b = other.getBBox(),
                  m = into(other);
                const p = new DOMPoint(b.x, b.y).matrixTransform(m),
                  q = new DOMPoint(
                    b.x + b.width,
                    b.y + b.height,
                  ).matrixTransform(m);
                if (
                  Math.min(p.x, q.x) < box.x + box.width + 3 &&
                  Math.max(p.x, q.x) > box.x - 3 &&
                  Math.min(p.y, q.y) < box.y + box.height + 3 &&
                  Math.max(p.y, q.y) > box.y - 3
                )
                  return true;
              }
              // Dimension ink must not run through another label. This also
              // prevents a large bend from escaping past an annotation row.
              const newCurve = svg.querySelector(
                "[data-probe] [data-dimension-curve]",
              ) as SVGGeometryElement;
              for (const other of [
                ...svg.querySelectorAll(
                  "[data-dimension-label],[data-dimension-note]",
                ),
              ] as SVGGraphicsElement[]) {
                const b = await inkBox(other),
                  m = other.getCTM()!.inverse().multiply(newCurve.getCTM()!);
                const samples = editor
                  .sampleFigurePath(newCurve.getAttribute("d")!, 100)!
                  .flat();
                for (const [x, y] of samples) {
                  const p = new DOMPoint(x, y).matrixTransform(m);
                  if (
                    p.x > b.x &&
                    p.x < b.x + b.width &&
                    p.y > b.y &&
                    p.y < b.y + b.height &&
                    !rootHoles.some((poly) => contains(poly, { x, y })) &&
                    !(
                      other.getAttribute("stroke") === "#ffffff" &&
                      (await haloCovers(
                        other,
                        p,
                        Number(newCurve.getAttribute("stroke-width")) / 2,
                        true,
                      ))
                    )
                  )
                    return true;
                }
              }
              const extent = svg.getBBox();
              const pad = Math.max(
                10,
                Math.max(extent.width, extent.height) * 0.04,
              );
              if (
                (Number(label.getAttribute("font-size")) * 280) /
                  (Math.max(extent.width, extent.height) + 2 * pad) <
                minFont
              )
                return true;
            }
            return false;
          };
          for (const dimension of plan.dimensions) {
            const initial = current;
            const known = new Set(
              [
                ...parser
                  .parseFromString(current, "image/svg+xml")
                  .querySelectorAll("[data-object-id]"),
              ].map((n) => n.getAttribute("data-object-id")),
            );
            const [a, b] = dimension.endpoints,
              from = { x: a[0], y: a[1] },
              to = { x: b[0], y: b[1] };
            const result = editor.addFigureMark(
              current,
              {
                op: "addDimension",
                from,
                to,
                text: dimension.label,
                side: "out",
              },
              {
                resolve: (ref) => {
                  if (typeof ref === "string")
                    throw new Error("Unexpected name");
                  return ref;
                },
                names: [],
                nameOf: () => undefined,
              },
            );
            if ("reason" in result)
              throw new Error(`${plan.id}/${dimension.name}: ${result.reason}`);
            let chosen = result.svg,
              added = parts(chosen, known),
              trace = "addDimension",
              bend = "",
              font = "",
              labelSample = "",
              chosenSide = "out";
            if (added.length !== 2)
              throw new Error("Unexpected dimension objects");
            const internal =
              dimension.name.includes("diagonal") ||
              dimension.name === "radius" ||
              dimension.name === "diameter" ||
              (dimension.name === "height" &&
                !/cuboid|cube-|cylinder-net/.test(plan.family));
            if (internal && (await intersects(clean(added), 12.1))) {
              const inside = editor.addFigureMark(
                initial,
                {
                  op: "addDimension",
                  from,
                  to,
                  text: dimension.label,
                  side: "in",
                },
                {
                  resolve: (ref) => {
                    if (typeof ref === "string")
                      throw new Error("Unexpected name");
                    return ref;
                  },
                  names: [],
                  nameOf: () => undefined,
                },
              );
              if (
                !("reason" in inside) &&
                !(await intersects(clean(parts(inside.svg, known)), 12.1))
              ) {
                chosen = inside.svg;
                added = parts(chosen, known);
                chosenSide = "in";
              }
            }
            if (await intersects(clean(added), 12.1)) {
              const length = Math.hypot(b[0] - a[0], b[1] - a[1]),
                nx = -(b[1] - a[1]) / length,
                ny = (b[0] - a[0]) / length;
              const mx = (a[0] + b[0]) / 2,
                my = (a[1] + b[1]) / 2;
              const lx = Number(added[1].getAttribute("x")),
                ly =
                  Number(added[1].getAttribute("y")) -
                  0.32 * Number(added[1].getAttribute("font-size"));
              const sign = (lx - mx) * nx + (ly - my) * ny < 0 ? -1 : 1;
              // These are ordinary editor handle drags. No path/control-point
              // formula, projected endpoint or witness is constructed here.
              let found = false;
              for (const direction of internal ? [sign, -sign] : [sign]) {
                for (const fs of [16.8, 18, 20]) {
                  for (const offset of [
                    14, 18, 22, 26, 30, 36, 42, 50, 60, 72, 88,
                  ]) {
                    const curve = editor.addFigureObject(
                      initial,
                      "curve",
                      from,
                      to,
                    );
                    let next = editor.editFigureObject(curve.svg, curve.id, {
                      stroke: "#111111",
                      "stroke-width": "0.72",
                      "stroke-dasharray": "5 3",
                      "stroke-linecap": "round",
                    });
                    const handle = {
                      x: Number((mx + direction * nx * offset).toFixed(2)),
                      y: Number((my + direction * ny * offset).toFixed(2)),
                    };
                    next = editor.moveFigureHandle(
                      next,
                      curve.id,
                      editor.CURVE_BEND_HANDLE,
                      handle,
                    );
                    const mid = editor.addMidLabel(
                      next,
                      curve.id,
                      dimension.label,
                    );
                    if (!mid)
                      throw new Error("Editor midpoint rejected its curve");
                    next = editor.editFigureObject(mid.svg, mid.id, {
                      "font-size": String(fs),
                    });
                    const samples = editor.sampleFigurePath(
                      editor.figureObjects(next).find((o) => o.id === curve.id)!
                        .attrs.d,
                      20,
                    )![0];
                    for (const index of [
                      10, 7, 13, 5, 15, 4, 16, 3, 17, 2, 18,
                    ]) {
                      const moved =
                        index === 10
                          ? next
                          : editor.editFigureObject(next, mid.id, {
                              x: String(Number(samples[index][0].toFixed(3))),
                              y: String(Number(samples[index][1].toFixed(3))),
                            });
                      const candidate = parts(moved, known);
                      if (!(await intersects(clean(candidate), 12.1))) {
                        chosen = moved;
                        added = candidate;
                        trace = "curve+bend+midLabel";
                        bend = `${handle.x} ${handle.y}`;
                        font = String(fs);
                        labelSample = String(index);
                        chosenSide = direction === sign ? "out" : "in";
                        found = true;
                        break;
                      }
                    }
                    if (found) break;
                  }
                  if (found) break;
                }
                if (found) break;
              }
              if (!found) trace = "addDimension-unresolved";
            }
            current = chosen;
            groups.push(
              `<g data-dimension="${dimension.name}" data-endpoints="${dimension.endpoints.flat().join(" ")}" data-editor-command="${trace}" data-editor-side="${chosenSide}"${bend ? ` data-editor-bend="${bend}" data-editor-font="${font}" data-editor-label-sample="${labelSample}"` : ""}>${clean(added)}</g>`,
            );
          }
          probe.remove();
          const host = document.createElement("div");
          host.innerHTML = `${header}<desc>arithmetic-geometry-drill-dimensions-v1</desc><g data-dimension-content="true">${geometry}${groups.join("")}${plan.noteSvg}</g></svg>`;
          document.body.append(host);
          const svg = host.querySelector("svg")!;
          const rawBox = (
            svg.querySelector("[data-dimension-content]") as SVGGElement
          ).getBBox();
          const box = rawBox;
          // Same saved-editor fit policy: 4% of the longest extent, at least 10.
          const pad = Math.max(10, Math.max(box.width, box.height) * 0.04);
          const frame = [
            box.x - pad,
            box.y - pad,
            box.width + 2 * pad,
            box.height + 2 * pad,
          ].map((n) => Number(n.toFixed(3)));
          svg.setAttribute("viewBox", frame.join(" "));
          svg.setAttribute(
            "height",
            String(Number(((300 * frame[3]) / frame[2]).toFixed(3))),
          );
          const output = await masksFromEditor(svg.outerHTML);
          host.remove();
          cache.set(key, output);
          outputs.push(output);
        }
        return outputs;
      }, rows);
      svgs.push(...rendered);
      if (i % 1000 === 0)
        console.log(`Actual editor dimensions: ${svgs.length}/${plans.length}`);
    }
  } finally {
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
  await writeFile(path.join(out, "plans.json"), JSON.stringify(plans));
  await writeFile(
    path.join(out, "displays.json"),
    JSON.stringify(Object.fromEntries(plans.map((p, i) => [p.id, svgs[i]]))),
  );
  const summary = {
    count: plans.length,
    dimensions: plans.reduce((n, p) => n + p.dimensions.length, 0),
    pipeline:
      "addFigureMark; collision fallback: addFigureObject/moveFigureHandle/addMidLabel/editFigureObject",
    projectedEndpoints: 0,
    witnessLines: 0,
    defaultDimensions: svgs.reduce(
      (n, s) =>
        n + (s.match(/data-editor-command="addDimension"/g)?.length ?? 0),
      0,
    ),
    manualDimensions: svgs.reduce(
      (n, s) =>
        n +
        (s.match(/data-editor-command="curve\+bend\+midLabel"/g)?.length ?? 0),
      0,
    ),
    unresolvedIds: plans
      .filter((_, i) => svgs[i].includes("addDimension-unresolved"))
      .map((p) => p.id),
    canonicalSha256: createHash("sha256")
      .update(JSON.stringify(plans.map((p) => [p.id, p.source])))
      .digest("hex"),
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
  assert.equal(
    summary.unresolvedIds.length,
    0,
    "Unresolved editor dimensions; see build.json",
  );
  if (process.argv.includes("--write")) await writeFile(assetPath, serialized);
  else if (!pilotFamily)
    assert.equal(
      (await readFile(assetPath, "utf8")).replace(/\r\n/g, "\n"),
      serialized,
      "Display pack reproduction changed; review generator/font/engine changes before publishing a new version",
    );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
