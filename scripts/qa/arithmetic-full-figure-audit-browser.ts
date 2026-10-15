import { readEvidenceText } from "./arithmetic-full-figure-audit";
/** Offline full-domain browser evidence. All network requests are aborted. */
import { writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { arithmeticGeometryCatalogSvg } from "../../src/lib/arithmetic-v2/geometry";
import {
  presentArithmeticGeometrySvg,
  arithmeticGeometryDisplaySize,
} from "../../src/lib/arithmetic-v2/presentation";
import { arithmeticGeometryNames } from "../../src/lib/arithmetic-v2/presentation/text";
import {
  figureSvgUrlPrintMm,
  figureWidthStyle,
} from "../../src/lib/figurePrintSize";
import { angleEntries } from "./arithmetic-angle-presentation-specs";
import { checkAnglePresentation } from "./arithmetic-angle-presentation-proof";
import { output, hash, type census } from "./arithmetic-full-figure-audit";
import { typesetArithmeticGeometrySvg } from "../../src/lib/arithmetic-v2/presentation/typography";

const data = JSON.parse(
  readEvidenceText(`${output}/census.json`, "utf8"),
) as ReturnType<typeof census>;
const candidatePath = process.argv
  .find((a) => a.startsWith("--candidate="))
  ?.slice(12);
const candidate: Record<string, [string, string]> | undefined = candidatePath
  ? JSON.parse(readEvidenceText(`${candidatePath}/displays.json`, "utf8"))
  : undefined;
const evidence = candidatePath ?? output;
const allOwned = process.argv.includes("--all-owned");
const rows = data.rows
  .filter((r) =>
    candidate && !allOwned ? candidate[r.id] : r.owner === "full-audit-worker",
  )
  .map((r) => ({
    ...r,
    svg: candidate?.[r.id]
      ? typesetArithmeticGeometrySvg(candidate[r.id][1], {
          normalizeLabel: arithmeticGeometryNames,
        }).replace(
          /(<svg\b[^>]*>)/,
          "$1<desc>arithmetic-geometry-presentation-v1</desc>",
        )
      : presentArithmeticGeometrySvg(r.id, arithmeticGeometryCatalogSvg(r.id)),
  }));
if (!candidate || allOwned) {
  const angleProof = angleEntries().map((e) =>
    checkAnglePresentation(e, rows.find((r) => r.id === e.id)!.svg),
  );
  writeFileSync(
    `${evidence}/angle-proof.json`,
    JSON.stringify(angleProof) + "\n",
  );
}
const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const card = (r: (typeof rows)[number]) => {
  const screen = arithmeticGeometryDisplaySize(r.svg);
  const print = figureSvgUrlPrintMm(
    `data:image/svg+xml,${encodeURIComponent(r.svg)}`,
  )!;
  const printWidth = figureWidthStyle(print.widthMm, print.maxWidthMm)!.width;
  const printHeight = `${(parseFloat(printWidth) * print.height) / print.width}mm`;
  return `<article style="--screen-w:${screen.width}px;--screen-h:${screen.height}px;--print-w:${printWidth};--print-h:${printHeight}"><small>${r.id}</small>${r.svg}<p>${escape(r.prompt)}<br>${escape(r.instruction)}</p></article>`;
};
const html = (batch: typeof rows) =>
  `<!doctype html><meta charset="utf-8"><style>body{margin:16px;font:12px Arial}main{display:grid;grid-template-columns:repeat(3,300px);gap:12px}article{border:1px solid #ddd;padding:8px;break-inside:avoid}small{display:block;height:38px;overflow-wrap:anywhere}svg{display:block;width:var(--screen-w);height:var(--screen-h)}p{height:64px;margin:4px 0}@media print{svg{width:var(--print-w);height:var(--print-h)}}</style><main>${batch.map(card).join("")}</main>`;
async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1000, height: 1000 },
  });
  await page.route("**/*", (route) => route.abort());
  await page.evaluate("globalThis.__name=(v)=>v");
  const checks: unknown[] = [];
  try {
    for (const media of ["screen", "print"] as const) {
      await page.emulateMedia({ media });
      for (let offset = 0; offset < rows.length; offset += 60) {
        const batch = rows.slice(offset, offset + 60);
        await page.setContent(html(batch));
        const result = await page
          .locator("article > svg")
          .evaluateAll((roots) =>
            roots.map((root) => {
              const svg = root as SVGSVGElement,
                frame = svg.getBoundingClientRect();
              type Box = [number, number, number, number];
              const box = (el: SVGGraphicsElement): Box => {
                const b = el.getBoundingClientRect();
                return [b.left, b.top, b.right, b.bottom];
              };
              const clipped = (b: Box) =>
                b[0] < frame.left - 0.2 ||
                b[1] < frame.top - 0.2 ||
                b[2] > frame.right + 0.2 ||
                b[3] > frame.bottom + 0.2;
              const overlap = (a: Box, b: Box) =>
                a[0] < b[2] - 0.2 &&
                a[2] > b[0] + 0.2 &&
                a[1] < b[3] - 0.2 &&
                a[3] > b[1] + 0.2;
              const nodes = [
                ...svg.querySelectorAll<SVGGraphicsElement>(
                  "[data-label],text",
                ),
              ].filter(
                (n) => n.matches("[data-label]") || !n.closest("[data-label]"),
              );
              const labels = nodes.map((n) => {
                const m = n.getScreenCTM()!,
                  style = getComputedStyle(n),
                  scale = Math.hypot(m.a, m.b);
                // Engine data-fs is in root units; typography's group CTM includes 1/1000 glyph scaling.
                const px = n.hasAttribute("data-fs")
                  ? Number(n.getAttribute("data-fs")) *
                    Math.hypot(svg.getScreenCTM()!.a, svg.getScreenCTM()!.b)
                  : parseFloat(style.fontSize) * scale;
                return {
                  text: n.getAttribute("data-label") ?? n.textContent ?? "",
                  box: box(n),
                  fontPx: px,
                  plain: n.tagName === "text",
                  rotation: (Math.atan2(m.b, m.a) * 180) / Math.PI,
                };
              });
              const geometry = [
                ...svg.querySelectorAll<SVGGeometryElement>(
                  "line,path,polygon,polyline,circle,ellipse,rect",
                ),
              ].filter(
                (n) =>
                  !n.closest(
                    "[data-label],defs,clipPath,mask,marker,pattern",
                  ) && getComputedStyle(n).stroke !== "none",
              );
              const geometryHits: {
                label: number;
                geometry: number;
                kind: string;
                dash: string;
              }[] = [];
              const haloIntersections: { label: number; geometry: number }[] =
                [];
              const maskedOutlineHits: { label: number; geometry: number }[] =
                [];
              const haloOutlineHits: { geometry: number; label: number }[] = [];
              const halos = nodes.flatMap((label, index) =>
                [
                  ...label.querySelectorAll<SVGGeometryElement>(
                    "path,rect,polygon",
                  ),
                ].flatMap((node) => {
                  const style = getComputedStyle(node);
                  if (
                    !["rgb(255, 255, 255)", "white", "#ffffff"].includes(
                      style.stroke,
                    )
                  )
                    return [];
                  const m = node.getScreenCTM()!,
                    b = box(node),
                    pad =
                      (parseFloat(style.strokeWidth) * Math.hypot(m.a, m.b)) /
                      2;
                  return [
                    {
                      node,
                      label: index,
                      inverse: m.inverse(),
                      box: [
                        b[0] - pad,
                        b[1] - pad,
                        b[2] + pad,
                        b[3] + pad,
                      ] as Box,
                    },
                  ];
                }),
              );
              let maskedSamples = 0;
              const geometryClipped: number[] = [];
              const semanticErrors: string[] = [];
              for (const [index, g] of geometry.entries()) {
                const m = g.getScreenCTM()!,
                  scale = Math.hypot(m.a, m.b),
                  b = box(g),
                  style = getComputedStyle(g);
                const stroke = (parseFloat(style.strokeWidth) * scale) / 2;
                if (
                  g.tagName === "path" &&
                  !/[zZ]/.test(g.getAttribute("d") ?? "") &&
                  style.fill !== "none"
                ) {
                  const start = g.getPointAtLength(0),
                    end = g.getPointAtLength(g.getTotalLength());
                  if (Math.hypot(start.x - end.x, start.y - end.y) > 1e-5)
                    semanticErrors.push(`filled open stroke path ${index}`);
                }
                if (
                  clipped([
                    b[0] - stroke,
                    b[1] - stroke,
                    b[2] + stroke,
                    b[3] + stroke,
                  ])
                )
                  geometryClipped.push(index);
                const possible = labels
                  .map((l, i) =>
                    overlap(l.box, [b[0] - 1, b[1] - 1, b[2] + 1, b[3] + 1])
                      ? i
                      : -1,
                  )
                  .filter((i) => i >= 0);
                const length = g.getTotalLength(),
                  samples = Math.max(2, Math.ceil((length * scale) / 0.4));
                const maskId = /url\(["']?#([^"')]+)["']?\)/.exec(
                  g.getAttribute("mask") ?? "",
                )?.[1];
                const holes = maskId
                  ? [
                      ...svg.querySelectorAll<SVGPolygonElement>(
                        `mask[id="${maskId}"] polygon`,
                      ),
                    ].map((n) => [...n.points].map((p) => [p.x, p.y]))
                  : [];
                // Actual halo outlines, not expanded label bounding boxes. Thin
                // angle arcs/curved leaders are recorded separately as the
                // editor's intentional halo convention; right squares and all
                // solid structural/tick/parallel strokes remain protected.
                const protectedStroke =
                  style.strokeDasharray === "none" &&
                  !(
                    g.tagName === "path" &&
                    /[AQ]/i.test(g.getAttribute("d") ?? "") &&
                    parseFloat(style.strokeWidth) <= 0.86
                  );
                const nearbyHalos = protectedStroke
                  ? halos.filter(
                      (h) =>
                        overlap(h.box, [
                          b[0] - stroke,
                          b[1] - stroke,
                          b[2] + stroke,
                          b[3] + stroke,
                        ]) &&
                        !!(
                          g.compareDocumentPosition(h.node) &
                          Node.DOCUMENT_POSITION_FOLLOWING
                        ),
                    )
                  : [];
                if (!possible.length && !holes.length && !nearbyHalos.length)
                  continue;
                const inside = (x: number, y: number, polygon: number[][]) => {
                  let yes = false;
                  for (
                    let i = 0, j = polygon.length - 1;
                    i < polygon.length;
                    j = i++
                  ) {
                    const a = polygon[i],
                      b = polygon[j];
                    if (
                      a[1] > y !== b[1] > y &&
                      x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
                    )
                      yes = !yes;
                  }
                  return yes;
                };
                const hit = new Set<number>();
                const lost = new Set<number>();
                const haloLost = new Set<number>();
                for (let k = 0; k <= samples; k++) {
                  const p = g.getPointAtLength((k * length) / samples),
                    x = m.a * p.x + m.c * p.y + m.e,
                    y = m.b * p.x + m.d * p.y + m.f;
                  const localRadius = parseFloat(style.strokeWidth) / 2;
                  if (
                    style.strokeDasharray === "none" &&
                    holes.some((h) =>
                      Array.from({ length: 9 }, (_, i) =>
                        i === 8
                          ? [p.x, p.y]
                          : [
                              p.x + localRadius * Math.cos((i * Math.PI) / 4),
                              p.y + localRadius * Math.sin((i * Math.PI) / 4),
                            ],
                      ).some(([sx, sy]) => inside(sx, sy, h)),
                    )
                  )
                    lost.add(possible[0] ?? -1);
                  if (holes.some((h) => inside(p.x, p.y, h))) {
                    maskedSamples++;
                    // Actual editor gaps may interrupt dashed auxiliary ink. They
                    // must not erase any solid outline or right-angle square.
                    if (style.strokeDasharray === "none")
                      lost.add(possible[0] ?? -1);
                    continue;
                  }
                  for (const h of nearbyHalos) {
                    if (
                      haloLost.has(h.label) ||
                      x < h.box[0] - stroke ||
                      x > h.box[2] + stroke ||
                      y < h.box[1] - stroke ||
                      y > h.box[3] + stroke
                    )
                      continue;
                    if (
                      [
                        [x, y],
                        [x - stroke, y],
                        [x + stroke, y],
                        [x, y - stroke],
                        [x, y + stroke],
                      ].some(([sx, sy]) =>
                        h.node.isPointInStroke(
                          new DOMPoint(sx, sy).matrixTransform(h.inverse),
                        ),
                      )
                    )
                      haloLost.add(h.label);
                  }
                  for (const i of possible) {
                    const b = labels[i].box;
                    if (
                      x >= b[0] - stroke &&
                      x <= b[2] + stroke &&
                      y >= b[1] - stroke &&
                      y <= b[3] + stroke
                    )
                      hit.add(i);
                  }
                }
                for (const i of hit) {
                  // The actual editor deliberately gives angle values a white halo.
                  // Keep these thin mark/leader bbox intersections visible in evidence;
                  // do not conflate them with a structural edge through a label.
                  const halo =
                    nodes[i].querySelector(
                      '[stroke="#ffffff"],[stroke="white"]',
                    ) ||
                    ["white", "#ffffff"].includes(
                      nodes[i].getAttribute("stroke") ?? "",
                    );
                  if (
                    halo &&
                    labels[i].text.includes("°") &&
                    parseFloat(style.strokeWidth) <= 0.73 &&
                    style.strokeDasharray === "none"
                  )
                    haloIntersections.push({ label: i, geometry: index });
                  else
                    geometryHits.push({
                      label: i,
                      geometry: index,
                      kind: g.tagName,
                      dash: style.strokeDasharray,
                    });
                }
                for (const i of lost)
                  maskedOutlineHits.push({ label: i, geometry: index });
                for (const label of haloLost)
                  haloOutlineHits.push({ label, geometry: index });
              }
              for (const n of svg.querySelectorAll(
                "[data-drill-angle],[data-drill-right]",
              )) {
                const p = (n.getAttribute("data-points") ?? "")
                  .match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)
                  ?.map(Number);
                if (!p || p.length !== 6) continue;
                const [ax, ay, ox, oy, bx, by] = p,
                  ux = ax - ox,
                  uy = ay - oy,
                  vx = bx - ox,
                  vy = by - oy;
                const measured =
                  (Math.atan2(Math.abs(ux * vy - uy * vx), ux * vx + uy * vy) *
                    180) /
                  Math.PI;
                const given = n.hasAttribute("data-drill-right")
                  ? 90
                  : Number(n.getAttribute("data-given"));
                if (
                  (n.hasAttribute("data-given") ||
                    n.hasAttribute("data-drill-right")) &&
                  Math.abs(measured - given) > 0.02
                )
                  semanticErrors.push(
                    `angle ${measured.toFixed(5)} versus ${given}`,
                  );
              }
              const labelHits = labels.flatMap((a, i) =>
                labels
                  .slice(i + 1)
                  .flatMap((b, j) =>
                    overlap(a.box, b.box) ? [[i, i + j + 1]] : [],
                  ),
              );
              return {
                renderedWidth: frame.width,
                renderedHeight: frame.height,
                labelCount: labels.length,
                labels: labels.map(({ box: b, ...l }) => ({
                  ...l,
                  width: b[2] - b[0],
                  height: b[3] - b[1],
                })),
                labelClipped: labels.flatMap((l, i) =>
                  clipped(l.box) ? [i] : [],
                ),
                labelHits,
                geometryHits,
                haloIntersections,
                maskedSamples,
                maskedOutlineHits,
                haloOutlineHits,
                geometryClipped,
                semanticErrors,
                geometryCount: geometry.length,
              };
            }),
          );
        result.forEach((r, i) =>
          checks.push({
            id: batch[i].id,
            family: batch[i].family,
            svgSha256: hash(batch[i].svg),
            media,
            ...r,
          }),
        );
        if (offset % 1200 === 0)
          console.log(`${media} ${offset}/${rows.length}`);
      }
      const representatives = process.argv.includes("--representative-all")
        ? rows
        : data.families
            .filter((f) => rows.some((r) => r.family === f.family))
            .flatMap((f) => {
              const family = rows.filter((r) => r.family === f.family);
              return process.argv.includes("--extremes")
                ? [...new Set([family[0], family.at(-1)!])]
                : [family.at(-1)!];
            });
      writeFileSync(
        `${evidence}/visual-manifest-${media}.json`,
        JSON.stringify(
          representatives.map((r, i) => ({
            id: r.id,
            family: r.family,
            svgSha256: hash(r.svg),
            page: Math.floor(i / 12) + 1,
          })),
        ) + "\n",
      );
      for (let i = 0; i < representatives.length; i += 12) {
        await page.setContent(html(representatives.slice(i, i + 12)));
        await page.screenshot({
          path: `${evidence}/representatives-${media}-${i / 12 + 1}.png`,
          fullPage: true,
        });
      }
    }
    writeFileSync(`${evidence}/browser.json`, JSON.stringify(checks) + "\n");
    console.log(`Recorded ${checks.length} full-domain checks`);
    const fields = [
      "geometryHits",
      "labelHits",
      "labelClipped",
      "geometryClipped",
      "maskedOutlineHits",
      "haloOutlineHits",
      "semanticErrors",
    ];
    const failures = (checks as Record<string, unknown>[]).filter((r) =>
      fields.some((k) => (r[k] as unknown[])?.length),
    );
    writeFileSync(
      `${evidence}/browser-summary.json`,
      JSON.stringify(
        {
          figures: rows.length,
          renders: checks.length,
          failures: failures.length,
          ids: [...new Set(failures.map((r) => r.id))],
          counts: Object.fromEntries(
            fields.map((k) => [
              k,
              (checks as Record<string, unknown>[]).reduce(
                (s, r) => s + ((r[k] as unknown[])?.length ?? 0),
                0,
              ),
            ]),
          ),
        },
        null,
        2,
      ) + "\n",
    );
    if (process.argv.includes("--require-clear"))
      assert.equal(
        failures.length,
        0,
        `${failures.length} failed browser observations`,
      );
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
