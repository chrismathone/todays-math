/** Full changed-domain browser evidence at the actual longest-extent sizes. */
import "./init-arithmetic-packs";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { typesetFigureSvg } from "../../src/components/unified/figure-editor/figureTypeset";
import type { addFigureMark } from "../../src/components/unified/figure-editor/figureMarks";
import { typesetArithmeticGeometrySvg } from "../../src/lib/arithmetic-v2/presentation/typography";
import { arithmeticGeometryNames } from "../../src/lib/arithmetic-v2/presentation/text";
import type {
  addFigureObject,
  editFigureObject,
} from "../../src/components/unified/figure-editor/figureSvgEditing";
import type { figureObjects } from "../../src/components/unified/figure-editor/figureSvgEditing";
import type { sampleFigurePath } from "../../src/components/unified/figure-editor/figureFlip";
import type { moveFigureHandle } from "../../src/components/unified/figure-editor/figureHandles";
import type { addMidLabel } from "../../src/components/unified/figure-editor/figureMidLabel";
import type { prepareFigureSvg } from "../../src/components/unified/figure-editor/figureSvgEditing";
import { chromium } from "playwright";
import { presentArithmeticDimensionSvg } from "../../src/lib/arithmetic-v2/presentation/dimensions";
import { dimensionPlans } from "./arithmetic-dimension-presentation-model";

async function main() {
  const family = process.argv.find((a) => a.startsWith("--family="))?.slice(9);
  const out = path.resolve(
    `tmp/arithmetic-dimension-presentation${family ? "-pilot" : ""}`,
  );
  const plans = dimensionPlans().filter((p) => !family || p.family === family);
  const svgs = JSON.parse(
    await readFile(path.join(out, "displays.json"), "utf8"),
  ) as Record<string, string>;
  for (const p of family ? [] : plans) {
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
  const buildEvidence = JSON.parse(
    await readFile(path.join(out, "build.json"), "utf8"),
  ) as { sha256: string; canonicalSha256: string };
  if (!family)
    assert.equal(
      JSON.parse(
        await readFile(
          "src/lib/arithmetic-v2/presentation/dimensions-assets-v1.json",
          "utf8",
        ),
      ).sha256,
      buildEvidence.sha256,
    );
  const browser = await chromium.launch({ headless: true });
  const evidence = {
    assetSha256: buildEvidence.sha256,
    canonicalSha256: buildEvidence.canonicalSha256,
    browser: browser.version(),
    scope: {
      figures: plans.length,
      families: new Set(plans.map((p) => p.family)).size,
      dimensions: plans.reduce((n, p) => n + p.dimensions.length, 0),
      inverseNetFigures: plans.filter((p) =>
        /cylinder-net-area-(radius|diameter)$/.test(p.family),
      ).length,
      exclusions: 0,
    },
  };
  await writeFile(
    path.join(out, "coverage.json"),
    JSON.stringify(
      Object.fromEntries(
        [...new Set(plans.map((p) => p.family))].map((f) => [
          f,
          plans.filter((p) => p.family === f).map((p) => p.id),
        ]),
      ),
      null,
      2,
    ) + "\n",
  );
  const failures: { id: string; mode: string; errors: string[] }[] = [];
  const modes: Record<string, unknown> = {};
  const style = (size: number) =>
    `<style>body{font:14px Arial,Malgun Gothic,sans-serif;margin:16px}main{display:grid;grid-template-columns:repeat(3,340px);gap:16px}article{border:1px solid #bbb;padding:12px;break-inside:avoid}svg{display:block;width:${size}px;height:${size}px;max-width:100%;margin:auto}h2{font-size:13px;font-weight:normal;overflow-wrap:anywhere}@media print{body{margin:0}main{grid-template-columns:repeat(2,85mm)}article{border:0}svg{width:74.083mm;height:74.083mm}}</style>`;
  try {
    let page = await browser.newPage({
      viewport: { width: 1120, height: 1000 },
    });
    await page.goto(pathToFileURL(path.join(out, "editor.html")).href);
    await page.addScriptTag({
      content: await readFile(path.join(out, "editor.js"), "utf8"),
    });
    await page.evaluate("globalThis.__name = (value) => value");
    let baselineFigures = 0,
      baselineDimensions = 0,
      defaultDimensions = 0,
      manualDimensions = 0,
      unresolvedDimensions = 0;
    for (let i = 0; i < plans.length; i += 100) {
      const rows = plans
        .slice(i, i + 100)
        .map((p) => ({ ...p, shown: svgs[p.id] }));
      const counts = await page.evaluate(async (rows) => {
        const editor = (
          window as unknown as {
            DimensionEditor: {
              typesetFigureSvg: typeof typesetFigureSvg;
              addFigureMark: typeof addFigureMark;
              prepareFigureSvg: typeof prepareFigureSvg;
              addFigureObject: typeof addFigureObject;
              editFigureObject: typeof editFigureObject;
              moveFigureHandle: typeof moveFigureHandle;
              CURVE_BEND_HANDLE: string;
              addMidLabel: typeof addMidLabel;
              figureObjects: typeof figureObjects;
              sampleFigurePath: typeof sampleFigurePath;

              typesetArithmeticGeometrySvg: typeof typesetArithmeticGeometrySvg;
            };
          }
        ).DimensionEditor;
        const parser = new DOMParser();
        let count = 0,
          defaults = 0,
          manual = 0,
          unresolved = 0;
        const signature = (n: Element) =>
          JSON.stringify({
            tag: n.tagName,
            attrs: [...n.attributes]
              .filter(
                (a) =>
                  a.name !== "mask" &&
                  a.name !== "xmlns" &&
                  a.name !== "data-object-id" &&
                  !a.name.startsWith("data-dimension-"),
              )
              .map((a) => [a.name, a.value])
              .sort(),
            text: n.textContent,
          });
        for (const p of rows) {
          let current = editor.prepareFigureSvg(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-200 -200 400 400" width="300" height="300">${p.geometry}</svg>`,
          );
          const shown = parser.parseFromString(p.shown, "image/svg+xml");
          const originals = [
            ...parser
              .parseFromString(
                `<svg xmlns="http://www.w3.org/2000/svg">${p.geometry}</svg>`,
                "image/svg+xml",
              )
              .querySelectorAll("path,circle"),
          ];
          const prepared = [
            ...parser
              .parseFromString(current, "image/svg+xml")
              .querySelectorAll("path,circle"),
          ];
          const displayed = [
            ...shown.querySelectorAll(
              "[data-dimension-source] path,[data-dimension-source] circle,[data-dimension-right]",
            ),
          ];
          for (let j = 0; j < originals.length; j++) {
            const n = originals[j];
            if (
              (n.getAttribute("fill") ??
                n.closest("[fill]")?.getAttribute("fill")) === "none"
            ) {
              const id = prepared[j].getAttribute("data-object-id")!;
              current = editor.editFigureObject(current, id, { fill: "none" });
              const edited = parser
                .parseFromString(current, "image/svg+xml")
                .querySelector(`[data-object-id="${id}"]`)!;
              if (
                displayed[j].getAttribute("fill") !==
                edited.getAttribute("fill")
              )
                throw new Error(`${p.id}: equivalent fill edit differs`);
            }
            for (const a of [...n.attributes])
              if (displayed[j].getAttribute(a.name) !== a.value)
                throw new Error(
                  `${p.id}: source geometry attribute changed: ${a.name}`,
                );
          }
          for (const d of p.dimensions) {
            const old = new Set(
              [
                ...parser
                  .parseFromString(current, "image/svg+xml")
                  .querySelectorAll("[data-object-id]"),
              ].map((n) => n.getAttribute("data-object-id")),
            );
            const initial = current;
            const group = shown.querySelector(`[data-dimension="${d.name}"]`)!;
            const result = editor.addFigureMark(
              current,
              {
                op: "addDimension",
                from: { x: d.endpoints[0][0], y: d.endpoints[0][1] },
                to: { x: d.endpoints[1][0], y: d.endpoints[1][1] },
                text: d.label,
                side:
                  group.getAttribute("data-editor-side") === "in" &&
                  !group.hasAttribute("data-editor-bend")
                    ? "in"
                    : "out",
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
              throw new Error(`${p.id}: baseline rejected ${result.reason}`);
            current = result.svg;
            if (
              group.getAttribute("data-editor-command") ===
              "curve+bend+midLabel"
            ) {
              const curve = editor.addFigureObject(
                initial,
                "curve",
                { x: d.endpoints[0][0], y: d.endpoints[0][1] },
                { x: d.endpoints[1][0], y: d.endpoints[1][1] },
              );
              current = editor.editFigureObject(curve.svg, curve.id, {
                stroke: "#111111",
                "stroke-width": "0.72",
                "stroke-dasharray": "5 3",
                "stroke-linecap": "round",
              });
              const [x, y] = group
                .getAttribute("data-editor-bend")!
                .split(" ")
                .map(Number);
              current = editor.moveFigureHandle(
                current,
                curve.id,
                editor.CURVE_BEND_HANDLE,
                { x, y },
              );
              const mid = editor.addMidLabel(current, curve.id, d.label);
              if (!mid) throw new Error("Manual editor baseline rejected");
              current = editor.editFigureObject(mid.svg, mid.id, {
                "font-size": group.getAttribute("data-editor-font")!,
              });
              const index = Number(
                group.getAttribute("data-editor-label-sample") ?? 10,
              );
              if (index !== 10) {
                const samples = editor.sampleFigurePath(
                  editor.figureObjects(current).find((o) => o.id === curve.id)!
                    .attrs.d,
                  20,
                )![0];
                current = editor.editFigureObject(current, mid.id, {
                  x: String(Number(samples[index][0].toFixed(3))),
                  y: String(Number(samples[index][1].toFixed(3))),
                });
              }
              manual++;
            } else {
              defaults++;
              if (
                group.getAttribute("data-editor-command") ===
                "addDimension-unresolved"
              )
                unresolved++;
            }
            const added = [
              ...parser
                .parseFromString(current, "image/svg+xml")
                .querySelectorAll("[data-object-id]"),
            ].filter((n) => !old.has(n.getAttribute("data-object-id")));
            const actual = [
              group.querySelector("[data-dimension-curve]")!,
              group.querySelector("[data-dimension-label]")!,
            ];
            if (
              added.length !== 2 ||
              added.some((n, j) => signature(n) !== signature(actual[j]))
            )
              throw new Error(
                `${p.id}/${d.name}: editor baseline differs ${added.map(signature).join(" ")} ACTUAL ${actual.map(signature).join(" ")}`,
              );
            count++;
          }
          const replay = parser.parseFromString(p.shown, "image/svg+xml");
          replay.querySelectorAll("defs").forEach((n) => n.remove());
          replay
            .querySelectorAll("[mask]")
            .forEach((n) => n.removeAttribute("mask"));
          const nodes = [
            ...replay.querySelectorAll(
              "path,line,polyline,polygon,circle,ellipse,rect,text",
            ),
          ].filter((n) => !n.closest("defs"));
          nodes.forEach((n, j) =>
            n.setAttribute("data-object-id", `dimension-audit-${j}`),
          );
          const rendered = parser.parseFromString(
            await editor.typesetFigureSvg(
              replay.documentElement.outerHTML,
              true,
            ),
            "image/svg+xml",
          );
          const masks = (doc: Document) =>
            [...doc.querySelectorAll("mask")].map((n) => n.outerHTML);
          if (JSON.stringify(masks(shown)) !== JSON.stringify(masks(rendered)))
            throw new Error(`${p.id}: exact typeset mask baseline differs`);
          const shownNodes = [
            ...shown.querySelectorAll(
              "path,line,polyline,polygon,circle,ellipse,rect,text",
            ),
          ].filter((n) => !n.closest("defs"));
          for (let j = 0; j < nodes.length; j++) {
            const n = rendered.querySelector(
              `[data-object-id="dimension-audit-${j}"]`,
            )!;
            if (n.getAttribute("mask") !== shownNodes[j].getAttribute("mask"))
              throw new Error(`${p.id}: exact mask attachment differs`);
          }
        }
        return { count, defaults, manual, unresolved };
      }, rows);
      baselineFigures += rows.length;
      baselineDimensions += counts.count;
      defaultDimensions += counts.defaults;
      manualDimensions += counts.manual;
      unresolvedDimensions += counts.unresolved;
    }
    assert.equal(
      unresolvedDimensions,
      0,
      "Unresolved dimension commands are not an exclusion",
    );
    modes.editorBaseline = {
      figures: baselineFigures,
      dimensions: baselineDimensions,
      defaultDimensions,
      manualDimensions,
      unresolvedDimensions,
      mismatches: 0,
      exclusions: 0,
    };
    console.log(JSON.stringify(modes.editorBaseline));
    // tsx preserves function names with this helper inside serialized callbacks.
    await page.evaluate("globalThis.__name = (value) => value");
    const displays = Object.fromEntries(
      Object.entries(svgs).map(([id, svg]) => [
        id,
        typesetArithmeticGeometrySvg(svg, {
          normalizeLabel: arithmeticGeometryNames,
        }),
      ]),
    );
    const cases = [
      ["raw", "screen-280", 280],
      ["raw", "screen-320", 320],
      ["raw", "print-280", 280],
      ["facade", "screen-280", 280],
      ["facade", "screen-320", 320],
      ["facade", "print-280", 280],
    ] as const;
    await page.close();
    const runMode = async ([variant, medium, size]: (typeof cases)[number]) => {
      const page = await browser.newPage({
        viewport: { width: 1120, height: 1000 },
      });
      try {
        await page.goto(pathToFileURL(path.join(out, "editor.html")).href);
        await page.addScriptTag({
          content: await readFile(path.join(out, "editor.js"), "utf8"),
        });
        await page.evaluate("globalThis.__name = (value) => value");
        const mode = `${variant}-${medium}`;
        await page.emulateMedia({
          media: medium.startsWith("print") ? "print" : "screen",
        });
        let minFont = Infinity,
          minShape = Infinity;
        let minFontId = "",
          minShapeId = "";
        let labels = 0,
          dimensions = 0;
        for (let i = 0; i < plans.length; i += 100) {
          const batch = plans.slice(i, i + 100);
          await page.setContent(
            `<html lang="ko"><meta charset="utf-8">${style(size)}<main>${batch.map((p) => `<article>${(variant === "raw" ? svgs[p.id] : displays[p.id]).replace("<svg ", `<svg data-audit-family="${p.family}" `)}</article>`).join("")}</main></html>`,
          );
          const checks = await page.locator("svg").evaluateAll(async (nodes) =>
            Promise.all(
              nodes.map(async (node) => {
                const svg = node as SVGSVGElement;
                const errors: string[] = [];
                const textNodes = [
                  ...svg.querySelectorAll(
                    "[data-dimension-label],[data-dimension-note]",
                  ),
                ] as SVGGraphicsElement[];
                const matrix = svg.getScreenCTM()!;
                const px = Math.hypot(matrix.a, matrix.b);
                const viewport = svg.viewBox.baseVal;
                const transform = (x: number, y: number, m: DOMMatrix) => ({
                  x: x * m.a + y * m.c + m.e,
                  y: x * m.b + y * m.d + m.f,
                });
                const labelText = (e: Element) =>
                  e.getAttribute("data-original-label") ?? e.textContent;
                const localMatrix = (e: SVGGraphicsElement) =>
                  svg.getCTM()!.inverse().multiply(e.getCTM()!);
                let font = Infinity;
                const geometry = [
                  ...svg.querySelectorAll(
                    "[data-dimension-source] path,[data-dimension-source] circle,[data-dimension-right]",
                  ),
                ] as SVGGeometryElement[];
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
                const inkBoxes = new Map<
                  SVGGraphicsElement,
                  { x: number; y: number; width: number; height: number }
                >();
                for (const label of textNodes)
                  inkBoxes.set(label, await inkBox(label));
                const geometrySamples = new Map<
                  SVGGeometryElement,
                  Map<number, { x: number; y: number }[]>
                >();
                const samples = (g: SVGGeometryElement, step: number) => {
                  let cache = geometrySamples.get(g);
                  if (!cache) {
                    cache = new Map();
                    geometrySamples.set(g, cache);
                  }
                  let points = cache.get(step);
                  if (!points) {
                    const length = g.getTotalLength();
                    if (g.hasAttribute("data-dimension-curve")) {
                      // Actual editor sampling of the returned Q, with a conservative
                      // density bound from four times its browser-measured arc length.
                      const shared = (
                        window as unknown as {
                          DimensionEditor: {
                            sampleFigurePath: typeof sampleFigurePath;
                          };
                        }
                      ).DimensionEditor.sampleFigurePath;
                      points = shared(
                        g.getAttribute("d")!,
                        Math.max(2, Math.ceil((4 * length) / step)),
                      )!
                        .flat()
                        .map(([x, y]) => ({ x, y }));
                    } else {
                      const count = Math.max(2, Math.ceil(length / step));
                      points = Array.from({ length: count + 1 }, (_, k) =>
                        g.getPointAtLength((length * k) / count),
                      );
                    }
                    cache.set(step, points);
                  }
                  return points;
                };
                const maskCache = new Map<
                  Element,
                  {
                    points: number[][];
                    left: number;
                    right: number;
                    top: number;
                    bottom: number;
                  }[]
                >();
                const hidden = (
                  g: Element,
                  p: { x: number; y: number },
                  radius = 0,
                ) => {
                  let holes = maskCache.get(g);
                  if (!holes) {
                    const id = /url\(#([^)]*)\)/.exec(
                      g.getAttribute("mask") ?? "",
                    )?.[1];
                    holes = id
                      ? [...svg.querySelectorAll(`mask[id="${id}"] polygon`)]
                          .map((n) =>
                            n
                              .getAttribute("points")!
                              .trim()
                              .split(/\s+/)
                              .map((p) => p.split(",").map(Number)),
                          )
                          .map((points) => ({
                            points,
                            left: Math.min(...points.map((p) => p[0])),
                            right: Math.max(...points.map((p) => p[0])),
                            top: Math.min(...points.map((p) => p[1])),
                            bottom: Math.max(...points.map((p) => p[1])),
                          }))
                      : [];
                    maskCache.set(g, holes);
                  }
                  return holes.some(
                    ({ points: poly, left, right, top, bottom }) => {
                      if (
                        p.x < left - radius ||
                        p.x > right + radius ||
                        p.y < top - radius ||
                        p.y > bottom + radius
                      )
                        return false;
                      let inside = false;
                      for (
                        let i = 0, j = poly.length - 1;
                        i < poly.length;
                        j = i++
                      ) {
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
                            ((p.x - x) * dx + (p.y - y) * dy) /
                              (dx * dx + dy * dy),
                          ),
                        );
                        return (
                          Math.hypot(p.x - x - t * dx, p.y - y - t * dy) <
                          radius
                        );
                      });
                    },
                  );
                };
                const family = svg.getAttribute("data-audit-family")!;
                const auxiliary = (g: Element) =>
                  !g.hasAttribute("data-dimension-right") &&
                  g.tagName === "path" &&
                  !/cuboid|cube-/.test(family) &&
                  (g.hasAttribute("stroke-dasharray") ||
                    family.includes("circle") ||
                    (family.includes("cylinder-net") &&
                      !/[zZ]/.test(g.getAttribute("d")!)));
                for (const g of geometry) {
                  if (auxiliary(g)) continue;
                  const strokeRadius =
                    parseFloat(getComputedStyle(g).strokeWidth) / 2 + 0.15;
                  for (const point of samples(g, 0.5))
                    if (hidden(g, point, strokeRadius)) {
                      errors.push("masked-protected-geometry");
                      break;
                    }
                }
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
                        const alpha =
                          raster.pixels[(y * raster.width + x) * 4 + 3];
                        if (fully ? alpha < 245 : alpha > 8) return !fully;
                      }
                  return fully && encountered;
                };
                for (const label of textNodes) {
                  const box = inkBoxes.get(label)!;
                  const m = localMatrix(label);
                  const halo =
                    label.getAttribute("stroke") === "#ffffff"
                      ? Number(label.getAttribute("stroke-width")) / 2
                      : 0;
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
                      errors.push(`clipped:${labelText(label)}`);
                  }
                  // Test actual geometry ink in label-local coordinates, handling
                  // rotated labels without false positives from their axis boxes.
                  for (const g of geometry) {
                    const intoLabel = label
                      .getCTM()!
                      .inverse()
                      .multiply(g.getCTM()!);
                    const protectedInk = !auxiliary(g);
                    const strokeRadius =
                      (parseFloat(getComputedStyle(g).strokeWidth) *
                        Math.hypot(intoLabel.a, intoLabel.b)) /
                      2;
                    for (const q of samples(
                      g,
                      halo && protectedInk ? 0.5 : 1.5,
                    )) {
                      const p = transform(q.x, q.y, intoLabel);
                      const margin = halo + strokeRadius;
                      if (
                        halo &&
                        protectedInk &&
                        p.x > box.x - margin &&
                        p.x < box.x + box.width + margin &&
                        p.y > box.y - margin &&
                        p.y < box.y + box.height + margin &&
                        (await haloCovers(label, p, strokeRadius))
                      ) {
                        errors.push(
                          `halo-protected-geometry:${labelText(label)}`,
                        );
                        break;
                      }
                      const clearance = protectedInk ? 1 : 0;
                      if (
                        p.x > box.x - clearance &&
                        p.x < box.x + box.width + clearance &&
                        p.y > box.y - clearance &&
                        p.y < box.y + box.height + clearance &&
                        (protectedInk ||
                          (!hidden(g, q) &&
                            !(
                              halo &&
                              (await haloCovers(label, p, strokeRadius, true))
                            )))
                      ) {
                        errors.push(`geometry-label:${labelText(label)}`);
                        break;
                      }
                    }
                  }
                }
                // Check only visible dimension ink. The editor masks may hide
                // and auxiliary strokes under labels. Protected source ink is checked above.
                for (const curve of [
                  ...svg.querySelectorAll("[data-dimension-curve]"),
                ] as SVGGeometryElement[]) {
                  for (const label of textNodes) {
                    const box = inkBoxes.get(label)!,
                      m = label.getCTM()!.inverse().multiply(curve.getCTM()!);
                    for (const local of samples(curve, 1.25)) {
                      const p = transform(local.x, local.y, m);
                      if (
                        p.x > box.x &&
                        p.x < box.x + box.width &&
                        p.y > box.y &&
                        p.y < box.y + box.height &&
                        !hidden(curve, local) &&
                        !(
                          label.getAttribute("stroke") === "#ffffff" &&
                          (await haloCovers(
                            label,
                            p,
                            Number(curve.getAttribute("stroke-width")) / 2,
                            true,
                          ))
                        )
                      ) {
                        errors.push(
                          `dimension-label:${curve.parentElement!.getAttribute("data-dimension")}/${labelText(label)}`,
                        );
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
                        `label-label:${labelText(textNodes[a])}/${labelText(textNodes[b])}`,
                      );
                  }
                const ds = [...svg.querySelectorAll("[data-dimension]")];
                for (const d of ds) {
                  const endpoints = d
                    .getAttribute("data-endpoints")!
                    .split(" ")
                    .map(Number);
                  const curve = d.querySelector(
                    "[data-dimension-curve]",
                  ) as SVGGeometryElement;
                  const label = d.querySelector("[data-dimension-label]")!;
                  if (
                    d.querySelector("[data-dimension-witness]") ||
                    d.hasAttribute("data-projected")
                  )
                    errors.push("fabricated-projection");
                  const manual = d.hasAttribute("data-editor-bend");
                  if (
                    label.hasAttribute("transform") ||
                    (!manual && label.hasAttribute("data-line-gap"))
                  )
                    errors.push("non-editor-dimension");
                  if (
                    manual &&
                    (!curve.hasAttribute("mask") ||
                      !label.hasAttribute("data-line-gap"))
                  )
                    errors.push("missing-editor-gap");
                  const parts = (curve.getAttribute("d") ?? "")
                    .trim()
                    .split(/(?=M)/)
                    .map((part) =>
                      (part.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number),
                    );
                  const tips =
                    parts.length === 2
                      ? parts.map((part) => part.slice(-2))
                      : [parts[0].slice(0, 2), parts[0].slice(-2)];
                  const length = Math.hypot(
                    endpoints[2] - endpoints[0],
                    endpoints[3] - endpoints[1],
                  );
                  const ux = (endpoints[2] - endpoints[0]) / length,
                    uy = (endpoints[3] - endpoints[1]) / length;
                  if (manual) {
                    if (
                      ![
                        [endpoints[0], endpoints[1]],
                        [endpoints[2], endpoints[3]],
                      ].every((p) =>
                        tips.some(
                          (q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.015,
                        ),
                      )
                    )
                      errors.push("dimension-endpoint");
                  } else {
                    const ordered = tips.sort(
                      (a, b) => (a[0] - b[0]) * ux + (a[1] - b[1]) * uy,
                    );
                    const along = ordered.map(
                      (p, j) =>
                        ((p[0] - endpoints[2 * j]) * ux +
                          (p[1] - endpoints[2 * j + 1]) * uy) *
                        (j ? -1 : 1),
                    );
                    if (
                      ordered.some(
                        (p, j) =>
                          Math.abs(
                            (p[0] - endpoints[2 * j]) * uy -
                              (p[1] - endpoints[2 * j + 1]) * ux,
                          ) > 0.002,
                      ) ||
                      along.some((n) => n < 1.49 || n > 9.002) ||
                      Math.abs(along[0] - along[1]) > 0.002
                    )
                      errors.push("dimension-endpoint");
                  }
                  if (parts.length !== 1 && parts.length !== 2)
                    errors.push("unexpected-editor-curve");
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
            ),
          );
          if (i % 1000 === 0)
            console.log(`${mode}: ${i + batch.length}/${plans.length}`);
          checks.forEach((c, j) => {
            if (c.font < minFont) minFontId = batch[j].id;
            if (c.shape < minShape) minShapeId = batch[j].id;
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
          minFontId,
          minShapeId,
          minFont,
          minShape,
          labels,
          dimensions,
        };
        await writeFile(
          path.join(out, "proof-progress.json"),
          JSON.stringify({ ...evidence, modes, failures }, null, 2),
        );
        console.log(
          JSON.stringify({
            mode,
            ...(modes[mode] as object),
            failures: failures.length,
          }),
        );
      } finally {
        await page.close();
      }
    };
    // Independent read-only browser modes; bounded concurrency avoids keeping
    // the editor replay DOM and all six audit pages alive at once.
    for (let i = 0; i < cases.length; i += 2)
      await Promise.all(cases.slice(i, i + 2).map(runMode));
    page = await browser.newPage({ viewport: { width: 1120, height: 1000 } });
    const representatives = [
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
      "age-e6-cylinder-net-area-v1-2-4-300-0",
      "age-e6-cylinder-net-area-v1-10-40-314-1",
      "age-e6-cylinder-net-area-height-v1-2-8-314-1",
      "age-e6-cylinder-net-area-radius-v1-2-4-300",
      "age-e6-cylinder-net-area-diameter-v1-10-40-314",
    ];
    const ids = family
      ? plans
          .filter((_, i) => i % Math.ceil(plans.length / 12) === 0)
          .map((p) => p.id)
      : representatives;
    assert.ok(
      ids.every((id) => svgs[id]),
      "representatives exist",
    );
    const html = `<html lang="ko"><meta charset="utf-8">${style(280)}<h1>Dimension presentation — 280 px longest extent</h1><main>${ids.map((id) => `<article><h2>${id}</h2>${displays[id]}</article>`).join("")}</main></html>`;
    await writeFile(path.join(out, "gallery.html"), html);
    await page.emulateMedia({ media: "screen" });
    await page.setContent(html);
    await page.screenshot({
      path: path.join(out, "gallery-280.png"),
      fullPage: true,
    });
    const rawHtml = `<html lang="ko"><meta charset="utf-8">${style(280)}<h1>Raw dimension presentation — 280 px longest extent</h1><main>${ids.map((id) => `<article><h2>${id}</h2>${svgs[id]}</article>`).join("")}</main></html>`;
    await page.setContent(rawHtml);
    await page.screenshot({
      path: path.join(out, "gallery-raw-280.png"),
      fullPage: true,
    });
    await page.setContent(html.replace("280px", "320px"));
    await page.screenshot({
      path: path.join(out, "gallery-320.png"),
      fullPage: true,
    });
    await page.setContent(html);
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
    const familyIds = [...new Set(plans.map((p) => p.family))].map((f) => {
      const rows = plans.filter((p) => p.family === f);
      return rows[Math.floor(rows.length / 2)].id;
    });
    await page.emulateMedia({ media: "screen" });
    for (let i = 0; i < familyIds.length; i += 14) {
      const sample = familyIds.slice(i, i + 14);
      await page.setContent(
        `<html lang="ko"><meta charset="utf-8">${style(280)}<main>${sample.map((id) => `<article><h2>${id}</h2>${displays[id]}</article>`).join("")}</main></html>`,
      );
      await page.screenshot({
        path: path.join(out, `families-${i / 14 + 1}-280.png`),
        fullPage: true,
      });
    }
    modes.representativeIds = ids;
    modes.familyRepresentativeIds = familyIds;
  } finally {
    await browser.close();
  }
  await writeFile(
    path.join(out, "proof.json"),
    JSON.stringify({ ...evidence, modes, failures }, null, 2) + "\n",
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
