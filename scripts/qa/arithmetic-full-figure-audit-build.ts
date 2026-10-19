import {
  readEvidenceText,
  evidenceExists,
} from "./arithmetic-full-figure-audit";
/** Calls the actual public editor operations. No dimension/path implementation. */
import assert from "node:assert/strict";
import { writeFileSync, renameSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { setImmediate } from "node:timers/promises";
import { deflateSync, strToU8 } from "fflate";
import {
  prepareFigureSvg,
  figureObjects,
  editFigureObject,
} from "../../src/components/unified/figure-editor/figureSvgEditing";
import { relocateFigureLabel } from "../../src/components/unified/figure-editor/figureLabelOps";
import type { FigureEditCommand } from "../../src/lib/dev-ai/figure-edit-contract";
import { CENTER_SPECS } from "../../src/lib/arithmetic-v2/families/geometryTriangles/centers";
import { RELATIONSHIP_SPECS } from "../../src/lib/arithmetic-v2/families/geometryTriangles/relationships";
import { PROPORTION_SPECS } from "../../src/lib/arithmetic-v2/families/geometryTriangles/proportions";
import { PYTHAGORAS_SPECS } from "../../src/lib/arithmetic-v2/families/geometryTriangles/pythagoras";
import { arithmeticGeometryCatalogSvg } from "../../src/lib/arithmetic-v2/geometry";
import { arithmeticGeometryNames } from "../../src/lib/arithmetic-v2/presentation/text";
import { applyFigureEdits } from "../../src/components/unified/figure-editor/figureEditApply";
import { chromium } from "playwright";
import {
  dimension,
  editorTypeset,
  isolatedAngles,
  editorHash,
} from "./arithmetic-full-figure-audit-editor";
import { output, hash, type census } from "./arithmetic-full-figure-audit";
import { adjustAngleLabels } from "./arithmetic-full-figure-audit-labels";

const { JSDOM } = createRequire("C:/Creative/testautocreator/package.json")(
  "jsdom",
);
let dom = new JSDOM("");
function bindDom() {
  Object.assign(globalThis, {
    DOMParser: dom.window.DOMParser,
    XMLSerializer: dom.window.XMLSerializer,
  });
}
bindDom();
export async function recycleAuditDom() {
  await setImmediate();
  dom.window.close();
  dom = new JSDOM("");
  bindDom();
}
type Point = [number, number];
type Dimension = { from: Point; to: Point; text: string };
type Angle = {
  at: Point;
  from: Point;
  to: Point;
  text?: string;
  right?: boolean;
};
const num = (s: string) =>
  (s.match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
const data = JSON.parse(
  readEvidenceText(`${output}/census.json`, "utf8"),
) as ReturnType<typeof census>;
const parse = (s: string): Document =>
  new dom.window.DOMParser().parseFromString(s, "image/svg+xml");
const serialize = (d: Document) =>
  new dom.window.XMLSerializer().serializeToString(d.documentElement) as string;
const xy = (n: Element, a: string, b: string): Point => [
  Number(n.getAttribute(a)),
  Number(n.getAttribute(b)),
];
const linePoints = (n: Element): [Point, Point] => [
  xy(n, "x1", "y1"),
  xy(n, "x2", "y2"),
];
const point = ([x, y]: Point) => ({ x, y });
const specs = new Map(
  [
    ...CENTER_SPECS,
    ...RELATIONSHIP_SPECS,
    ...PROPORTION_SPECS,
    ...PYTHAGORAS_SPECS,
  ].map((s) => [`${s.grade === "중3" ? "m3" : "m2"}-${s.key}`, s]),
);

export function plan(row: (typeof data.rows)[number]) {
  if (row.route !== "raw") return undefined;
  if (
    !row.id.startsWith("gt1-") &&
    !row.id.startsWith("gm-") &&
    !/^e2-length-(sum|difference|broken)$/.test(row.family)
  )
    return undefined;
  const source = arithmeticGeometryCatalogSvg(row.id),
    doc = parse(source),
    root = doc.documentElement;
  const dimensions: Dimension[] = [],
    angles: Angle[] = [],
    commands: FigureEditCommand[] = [],
    edits: { d: string; attrs: Record<string, string> }[] = [],
    texts = [...doc.querySelectorAll("text")];
  const add = (from: Point, to: Point, text: string) =>
    dimensions.push({ from, to, text });
  const remove = (n: Element) => n.remove();
  const lines = [...doc.querySelectorAll("line")];
  const removeLineAt = (x: number, y?: number) =>
    lines
      .filter(
        (n) =>
          Number(n.getAttribute("x1")) === x &&
          (y === undefined || Number(n.getAttribute("y1")) === y),
      )
      .forEach(remove);
  if (row.id.startsWith("gt1-")) {
    assert.equal(row.route, "raw");
    const task = specs.get(row.family)!.task(row.parameters),
      model = task.model;
    const values = Object.values(model.points),
      xs = values.map((p) => p[0]),
      ys = values.map((p) => p[1]);
    const minX = Math.min(...xs),
      maxX = Math.max(...xs),
      minY = Math.min(...ys),
      maxY = Math.max(...ys),
      scale = Math.min(144 / (maxX - minX), 132 / (maxY - minY));
    const points: Record<string, Point> = Object.fromEntries(
      Object.entries(model.points).map(([k, p]) => [
        k,
        [
          Number((120 + (p[0] - (minX + maxX) / 2) * scale).toFixed(5)),
          Number((116 - (p[1] - (minY + maxY) / 2) * scale).toFixed(5)),
        ],
      ]),
    );
    for (const edge of lines.filter((l) => l.hasAttribute("data-segment"))) {
      const [a, b] = edge.getAttribute("data-segment")!,
        [p, q] = linePoints(edge);
      assert.deepEqual(points[a], p);
      assert.deepEqual(points[b], q);
    }
    assert.deepEqual(
      Object.keys(points).sort(),
      Object.keys(model.points).sort(),
      row.id,
    );
    doc.querySelectorAll("line:not([data-segment]),path,text").forEach(remove);
    for (const [index, group] of (model.equal ?? []).entries())
      for (const key of group)
        commands.push({
          op: "addTick",
          from: point(points[key[0]]),
          to: point(points[key[1]]),
          count: index + 1,
        });
    for (const group of model.parallel ?? [])
      for (const key of group)
        commands.push({
          op: "addParallelMark",
          from: point(points[key[0]]),
          to: point(points[key[1]]),
        });
    const angleGivens = new Map(
      texts
        .filter((t) => t.getAttribute("data-drill-label")?.startsWith("angle-"))
        .map((t) => [
          t.getAttribute("data-drill-label")!.slice(6),
          t.textContent!,
        ]),
    );
    const keys = new Set([
      ...(model.right ?? []),
      ...(model.arcs ?? []),
      ...angleGivens.keys(),
    ]);
    for (const key of keys)
      angles.push({
        at: points[key[1]],
        from: points[key[0]],
        to: points[key[2]],
        ...(model.right?.includes(key) || angleGivens.get(key) === "90°"
          ? { right: true }
          : {}),
        ...(angleGivens.has(key) && angleGivens.get(key) !== "90°"
          ? { text: angleGivens.get(key) }
          : {}),
      });
    // These raw families do not expose any individual numeric edge givens.
    // The one measured public segment omitted by the legacy renderer is ID,
    // the inradius. Aggregate areas, perimeters and ratios remain prompt givens.
    const radius = /내접원 반지름=(\d+) cm/.exec(row.prompt);
    if (radius) {
      assert.ok(points.I && points.D);
      add(points.I, points.D, `${radius[1]} cm`);
    }
    for (const [text, at] of Object.entries(points))
      commands.push({
        op: "addLabel",
        at: point(at),
        text,
        ...((text === "E" &&
          /midsegment-area|midpoint-triangle|centroid-median-sum/.test(
            row.family,
          )) ||
        (text === "G" && row.family === "m2-centroid-median-sum")
          ? { position: "NE" as const }
          : {}),
      });
  } else if (/^e2-length-(sum|difference|broken)$/.test(row.family)) {
    const paths = [...doc.querySelectorAll("path")];
    if (row.family.endsWith("broken")) {
      const p = num(paths[0].getAttribute("d")!);
      add([p[0], p[1]], [p[2], p[3]], texts[0].textContent!);
      add([p[2], p[3]], [p[4], p[5]], texts[1].textContent!);
    } else
      paths.forEach((p, i) => {
        const n = num(p.getAttribute("d")!);
        add([n[0], n[1]], [n[2], n[3]], texts[i].textContent!);
      });
    texts.forEach(remove);
  } else if (
    /^m3-trig-(ratio|special-length|triangle-area)$/.test(row.family)
  ) {
    const polygon = doc.querySelector("polygon")!,
      n = num(polygon.getAttribute("points")!);
    const [A, B, C] = [
      [n[0], n[1]],
      [n[2], n[3]],
      [n[4], n[5]],
    ] as Point[];
    if (row.family === "m3-trig-triangle-area") {
      const [a, b] = row.parameters;
      add(A, B, `${a} cm`);
      add(A, C, `${b} cm`);
      texts.filter((t) => /cm$/.test(t.textContent!)).forEach(remove);
      const leader = [...doc.querySelectorAll("line")].find(
        (l) => l.getAttribute("x1") === "105",
      );
      assert.ok(leader);
      leader.remove();
    } else
      for (const t of texts) {
        if (
          t.getAttribute("data-drill-label") !== "given" ||
          t.textContent!.includes("°")
        )
          continue;
        const x = Number(t.getAttribute("x")),
          y = Number(t.getAttribute("y"));
        if (x === 205) add(B, C, t.textContent!);
        else if (y === 193) add(A, B, t.textContent!);
        else if (y === 31) {
          add(A, C, t.textContent!);
          const leader = [...doc.querySelectorAll("line")].find(
            (l) => l.getAttribute("x1") === "98",
          );
          assert.ok(leader);
          leader.remove();
        } else throw new Error(`Unknown trig label ${row.id}`);
        t.remove();
      }
  } else if (row.family === "m3-circle-equal-tangents") {
    const lines = [...doc.querySelectorAll("line")],
      tangent = lines[2];
    add(...linePoints(tangent), `${row.parameters[0]} cm`);
    texts.filter((t) => /cm$/.test(t.textContent!)).forEach(remove);
    lines.at(-1)!.remove();
  } else if (/^m1-(circle|sector)-/.test(row.family)) {
    const radial = lines.find(
      (l) =>
        Number(l.getAttribute("x1")) === 120 &&
        Number(l.getAttribute("y1")) === 117 &&
        Number(l.getAttribute("x2")) === 190,
    );
    assert.ok(radial, row.id);
    if (row.family.startsWith("m1-sector-")) {
      const inner = [...doc.querySelectorAll("path")].find((n) =>
        / A20,20 /.test(n.getAttribute("d") ?? ""),
      );
      assert.ok(inner, row.id);
      // Keep the authored 180/240/270-degree sweeps; minor-angle replacement
      // would be semantically wrong. This is an actual editor stroke edit.
      edits.push({
        d: inner.getAttribute("d")!,
        attrs: { stroke: "#111111", "stroke-width": "0.72" },
      });
    }
    const radius = texts.find((t) => /^(r =|반지름 r)/.test(t.textContent!));
    if (radius) {
      add(
        ...linePoints(radial),
        radius.textContent!.startsWith("r =")
          ? radius.textContent!.replace(/^r = /, "")
          : "r",
      );
      radius.remove();
      removeLineAt(158, 198);
    }
  } else if (/^m3-circle-chord-/.test(row.family)) {
    const [r, h] = row.parameters;
    add(...linePoints(lines[2]), `${r} cm`);
    add(
      ...linePoints(lines[row.family.endsWith("distance") ? 0 : 1]),
      `${row.family.endsWith("distance") ? 2 * h : h} cm`,
    );
    texts
      .filter((t) => t.getAttribute("data-drill-label") === "given")
      .forEach(remove);
    texts
      .filter((t) => t.getAttribute("data-drill-label") === "vertex")
      .forEach(remove);
    const [A, B] = linePoints(lines[0]),
      [O, M] = linePoints(lines[1]);
    for (const [text, at, position] of [
      ["O", O, "NW"],
      ["A", A, "SW"],
      ["B", B, "SE"],
      ["M", M, "S"],
    ] as const)
      commands.push({ op: "addLabel", text, at: point(at), position });
  } else if (
    row.id.startsWith("gm-") &&
    /^m1-(prism|pyramid|cylinder|cone|sphere)-/.test(row.family)
  ) {
    const kind = row.family.split("-")[1];
    // Public prompt values, never inferred from the answer or an inverse target.
    const value = (symbol: string) =>
      new RegExp(
        `(?:${symbol}\\s*=|${symbol === "r" ? "반지름" : symbol === "h" ? "높이" : "__"})\\s*(\\d+)\\s*cm(?![²³])`,
      ).exec(row.prompt)?.[1];
    const named = (symbol: string) =>
      value(symbol) ? `${value(symbol)} cm` : symbol;
    if (kind === "prism") {
      add([153, 51], [153, 141], named("h"));
      lines
        .filter((n) => [171, 176].includes(Number(n.getAttribute("x1"))))
        .forEach(remove);
    } else if (kind === "cylinder") {
      add([98, 69], [154, 69], named("r"));
      add([154, 69], [154, 163], named("h"));
      lines
        .filter((n) => [171, 176, 187].includes(Number(n.getAttribute("x1"))))
        .forEach(remove);
    } else if (kind === "cone") {
      add([99, 164], [160, 164], named("r"));
      const slant = texts.some((t) => t.textContent === "l");
      add([99, 54], slant ? [160, 164] : [99, 164], named(slant ? "l" : "h"));
      removeLineAt(182, 170);
    } else if (kind === "sphere") {
      add([120, 118], [185, 118], named("r"));
      removeLineAt(195, 102);
    } else {
      const slant = texts.some((t) => t.textContent === "s");
      add([100, 54], slant ? [78, 170] : [100, 151], named(slant ? "s" : "h"));
      if (value("a")) add([38, 161], [118, 179], named("a"));
      removeLineAt(slant ? 36 : 184, slant ? 107 : 100);
    }
    texts
      .filter(
        (t) =>
          t.getAttribute("data-drill-label") === "dimension" ||
          /^(?:반지름 |r\s*=|h\s*=|l\s*=|높이 h=|밑변 a\s*=|옆면 높이 s\s*=)/.test(
            t.textContent!,
          ),
      )
      .forEach(remove);
  } else if (
    !row.id.startsWith("gm-") ||
    !doc.querySelector("[data-drill-angle]")
  )
    return undefined;

  // All data-marked GM angles/right angles are reconstructed by addAngle itself.
  // Degree captions and their authored straight leaders are replaced together.
  if (row.id.startsWith("gm-")) {
    for (const n of doc.querySelectorAll(
      "[data-drill-angle],[data-drill-right]",
    )) {
      const p = num(n.getAttribute("data-points") ?? "");
      if (p.length !== 6) continue;
      angles.push({
        at: [p[2], p[3]],
        from: [p[0], p[1]],
        to: [p[4], p[5]],
        ...(n.hasAttribute("data-given")
          ? { text: `${n.getAttribute("data-given")}°` }
          : {}),
        ...(n.hasAttribute("data-drill-right") ? { right: true } : {}),
      });
      n.remove();
    }
    if (angles.length) {
      texts
        .filter((t) => /^\d+(?:\.\d+)?°$/.test(t.textContent!))
        .forEach(remove);
      if (row.family.startsWith("m3-trig-")) {
        removeLineAt(44, 146);
        removeLineAt(42, 142);
      } else if (row.family === "m1-parallel-angle") lines.at(-1)!.remove();
      else if (row.family.startsWith("m1-triangle-")) {
        removeLineAt(37, 193);
        removeLineAt(198, 140);
      } else if (
        /^m3-circle-(inscribed|central|same-arc|cyclic-opposite|tangent-angle|tangent-chord)$/.test(
          row.family,
        )
      )
        lines.at(-1)!.remove();
    }
  }
  if (!dimensions.length && !angles.length && !commands.length && !edits.length)
    return undefined;
  // A CSS text rule would override editor-added halo/font attributes. Source
  // geometry is retained verbatim; the old text-only rule and blank background go.
  doc.querySelectorAll("style").forEach(remove);
  root.setAttribute("font-size", "16.8");
  for (const t of doc.querySelectorAll("text")) {
    t.setAttribute("font-size", "16.8");
    t.setAttribute("font-family", "Arial, 'Malgun Gothic', sans-serif");
    t.textContent = arithmeticGeometryNames(t.textContent ?? "");
  }
  return {
    id: row.id,
    family: row.family,
    source,
    base: prepareFigureSvg(serialize(doc)),
    dimensions,
    angles,
    commands,
    edits,
  };
}

async function build() {
  if (process.argv.includes("--inventory")) {
    const rows: {
      id: string;
      family: string;
      route: string;
      updated: boolean;
      dimensions: number;
      angles: number;
    }[] = [];
    for (const row of data.rows.filter(
      (r) => r.owner === "full-audit-worker",
    )) {
      if (rows.length % 20 === 0) await recycleAuditDom();
      const p = plan(row);
      rows.push({
        id: row.id,
        family: row.family,
        route: row.route,
        updated: !!p,
        dimensions: p?.dimensions.length ?? 0,
        angles: p?.angles.length ?? 0,
      });
    }
    const families = [...new Set(rows.map((r) => r.family))].map((family) => {
      const group = rows.filter((r) => r.family === family);
      return {
        family,
        figures: group.length,
        updated: group.filter((r) => r.updated).length,
        dimensions: group.reduce((n, r) => n + r.dimensions, 0),
        angles: group.reduce((n, r) => n + r.angles, 0),
      };
    });
    writeFileSync(
      `${output}/remaining-scope.json`,
      JSON.stringify({ rows, families }) + "\n",
    );
    console.log(
      JSON.stringify(
        {
          owned: rows.length,
          updated: rows.filter((r) => r.updated).length,
          unchangedFamilies: families.filter((f) => !f.updated),
        },
        null,
        2,
      ),
    );
    return;
  }
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.route("**/*", (r) => r.abort());
  await page.evaluate("globalThis.__name=(v)=>v");
  const pilot = process.argv.includes("--pilot");
  const dir =
    process.argv.find((a) => a.startsWith("--out="))?.slice(6) ??
    `${output}/${pilot ? "pilot" : "remaining"}`;
  mkdirSync(dir, { recursive: true });
  const rows = data.rows.filter((r) => r.owner === "full-audit-worker");
  const entries: Record<string, [string, string]> = {},
    proofs: {
      id: string;
      family: string;
      dimensions: Dimension[];
      steps: unknown[];
      outputSha256: string;
      recipeSha256: string;
    }[] = [],
    rejected: unknown[] = [];
  const cache = new Map<string, { display: string; steps: unknown[] }>();
  const repairedRecipes = new Set<string>();
  const refusedIds = new Set<string>();
  const progress: Record<string, string> = evidenceExists(
    `${dir}/repair-progress.json`,
  )
    ? JSON.parse(readEvidenceText(`${dir}/repair-progress.json`, "utf8"))
    : {};
  const dimensionHints = new Map<string, { offset: number; t: number }>();
  const hintKey = (p: NonNullable<ReturnType<typeof plan>>, di: number) =>
    JSON.stringify([
      p.family,
      di,
      p.dimensions.map((d) => d.text.replace(/\d/g, "#")),
    ]);
  const pilotProof: {
    family: string;
    dimensions: Dimension[];
    steps: { command?: FigureEditCommand; offset?: number; t?: number }[];
  }[] = !pilot
    ? ["pilot", "pilot-gt", "pilot-chord", "pilot-chord-distance"].flatMap(
        (name) =>
          evidenceExists(`${output}/${name}/proof.json`)
            ? JSON.parse(
                readEvidenceText(`${output}/${name}/proof.json`, "utf8"),
              ).proofs
            : [],
      )
    : [];
  if (
    !pilot &&
    ["--resume", "--refresh", "--repair"].some((flag) =>
      process.argv.includes(flag),
    ) &&
    evidenceExists(`${dir}/proof.json`)
  ) {
    const saved = JSON.parse(readEvidenceText(`${dir}/proof.json`, "utf8"));
    if (saved.rejected.length) {
      assert.ok(
        process.argv.includes("--refresh") || process.argv.includes("--repair"),
        "Use --refresh to regenerate refused rows",
      );
      if (!evidenceExists(`${dir}/rejected-before-repair.json`))
        writeFileSync(
          `${dir}/rejected-before-repair.json`,
          JSON.stringify(saved.rejected) + "\n",
        );
      saved.rejected.forEach((r: { id: string }) => refusedIds.add(r.id));
    }
    Object.assign(
      entries,
      JSON.parse(readEvidenceText(`${dir}/displays.json`, "utf8")),
    );
    proofs.push(...saved.proofs);
  }
  const save = () => {
    writeFileSync(`${dir}/displays.json.tmp`, JSON.stringify(entries) + "\n");
    renameSync(`${dir}/displays.json.tmp`, `${dir}/displays.json`);
    writeFileSync(
      `${dir}/proof.json.tmp`,
      JSON.stringify({
        hashBasis: "SVG excluding session-local data-object-id",
        proofs,
        rejected,
      }) + "\n",
    );
    renameSync(`${dir}/proof.json.tmp`, `${dir}/proof.json`);
    writeFileSync(
      `${dir}/repair-progress.json.tmp`,
      JSON.stringify(progress) + "\n",
    );
    renameSync(
      `${dir}/repair-progress.json.tmp`,
      `${dir}/repair-progress.json`,
    );
  };
  let changed = 0;
  const checkpoint = (id: string) => {
    changed++;
    if (changed % 25 === 0) save();
    if (pilot || changed % 25 === 0)
      console.log(`Updated ${changed}; ${proofs.length} complete: ${id}`);
  };
  const filter = process.argv.find((a) => a.startsWith("--id="))?.slice(5);
  const repair = process.argv.includes("--repair")
    ? new Set<string>(
        JSON.parse(readEvidenceText(`${dir}/browser.json`, "utf8"))
          .filter(
            (r: Record<string, unknown>) =>
              r.media === "screen" &&
              [
                "geometryHits",
                "labelHits",
                "labelClipped",
                "geometryClipped",
                "maskedOutlineHits",
                "haloOutlineHits",
                "semanticErrors",
              ].some((k) => (r[k] as unknown[] | undefined)?.length),
          )
          .map((r: { id: string }) => r.id),
      )
    : new Set<string>();
  if (
    process.argv.includes("--repair") &&
    evidenceExists(`${dir}/ink-proof.json`)
  ) {
    for (const row of JSON.parse(
      readEvidenceText(`${dir}/ink-proof.json`, "utf8"),
    ).failures)
      repair.add(row.id);
  }
  if (process.argv.includes("--new-repair-pass"))
    for (const id of repair) delete progress[id];
  const selected = filter
    ? rows.filter((r) => filter.split(",").includes(r.id))
    : pilot
      ? rows.filter(
          (r) =>
            r.id === "gm-m3-trig-special-length-30-20-2" ||
            r.id === "gm-m3-trig-special-length-30-20-5" ||
            data.families.find((f) => f.family === r.family)?.last === r.id,
        )
      : rows;
  assert.ok(selected.length, "No registered ID selected");
  let visited = 0;
  for (const row of selected) {
    if (visited++ % 20 === 0) await recycleAuditDom();
    if (process.argv.includes("--gt-only") && !row.id.startsWith("gt1-"))
      continue;
    const p = plan(row);
    if (!p) continue;
    const pointNudge: { text: string; dx: number; dy: number } | undefined = [
      "gt1-m2-circum-central-angle-80",
      "gt1-m2-circum-base-central-angle-80",
    ].includes(row.id)
      ? { text: "O", dx: -12, dy: -8 }
      : [
            "gm-m3-circle-chord-length-6-3",
            "gm-m3-circle-chord-length-7-3",
            "gm-m3-circle-chord-distance-5-2",
            "gm-m3-circle-chord-distance-5-3",
            "gm-m3-circle-chord-distance-6-3",
            "gm-m3-circle-chord-distance-7-3",
            "gm-m3-circle-chord-distance-7-4",
            "gm-m3-circle-chord-distance-8-3",
            "gm-m3-circle-chord-distance-8-4",
            "gm-m3-circle-chord-distance-8-5",
            "gm-m3-circle-chord-distance-9-4",
            "gm-m3-circle-chord-distance-10-4",
            "gm-m3-circle-chord-distance-10-5",
            "gm-m3-circle-chord-distance-10-6",
            "gm-m3-circle-chord-distance-11-4",
            "gm-m3-circle-chord-distance-11-5",
            "gm-m3-circle-chord-distance-11-6",
            "gm-m3-circle-chord-distance-11-7",
            "gm-m3-circle-chord-distance-12-5",
            "gm-m3-circle-chord-distance-12-6",
            "gm-m3-circle-chord-distance-12-7",
            "gm-m3-circle-chord-distance-13-5",
            "gm-m3-circle-chord-distance-13-6",
            "gm-m3-circle-chord-distance-13-7",
            "gm-m3-circle-chord-distance-13-8",
          ].includes(row.id)
        ? { text: "M", dx: -22, dy: -5 }
        : row.id === "gt1-m2-circum-three-base-angles-65-45"
          ? { text: "O", dx: -5, dy: -7 }
          : row.id === "gt1-m2-circum-three-base-angles-65-55"
            ? { text: "O", dx: -11, dy: -11 }
            : [
                  "gt1-m2-rhombus-diagonal-angle-44",
                  "gt1-m2-rhombus-diagonal-angle-48",
                ].includes(row.id)
              ? { text: "O", dx: 13, dy: 12 }
              : [
                    "gm-m3-circle-chord-length-5-2",
                    "gm-m3-circle-chord-length-10-4",
                  ].includes(row.id)
                ? { text: "M", dx: -14, dy: 20 }
                : undefined;
    const layoutFont = [
      "gt1-m2-iso-bisector-angle-24",
      "gt1-m2-iso-bisector-angle-28",
      "gt1-m2-circum-base-central-angle-52",
      "gt1-m2-parallelogram-adjacent-50",
      "gm-m3-circle-inscribed-55",
      "gm-m3-circle-central-50",
      "gm-m3-circle-cyclic-opposite-50",
      "gm-m3-trig-triangle-area-2-6-30",
      "gm-m3-trig-triangle-area-4-10-30",
      "gm-m3-trig-triangle-area-2-4-30",
      "gm-m3-trig-triangle-area-2-4-45",
      "gm-m3-trig-triangle-area-2-6-45",
      "gm-m3-trig-triangle-area-2-6-60",
      "gm-m3-trig-triangle-area-2-8-45",
      "gm-m3-trig-triangle-area-2-8-60",
      "gm-m3-trig-triangle-area-2-10-30",
      "gm-m3-trig-triangle-area-2-10-45",
      "gm-m3-trig-triangle-area-2-10-60",
      "gm-m3-trig-triangle-area-4-6-30",
      "gm-m3-trig-triangle-area-4-8-30",
      "gm-m3-trig-triangle-area-4-8-45",
      "gm-m3-trig-triangle-area-4-10-45",
      "gm-m3-trig-triangle-area-6-8-30",
      "gm-m3-trig-triangle-area-6-10-30",
      "gm-m3-circle-tangent-chord-0-60",
    ].includes(row.id)
      ? row.id === "gt1-m2-iso-bisector-angle-28"
        ? 24
        : 20
      : undefined;
    const earlyPoint = pointNudge?.text === "M" && pointNudge.dx === -22;
    const isolated =
      !!layoutFont ||
      [
        "m1-parallel-angle",
        "m1-triangle-exterior",
        "m1-triangle-interior-exterior",
        "m2-rhombus-diagonal-angle",
      ].includes(p.family);
    const recipe = JSON.stringify([
        p.base,
        p.angles,
        p.commands,
        p.dimensions,
        ...(p.edits.length ? [p.edits] : []),
        ...(pointNudge ? [pointNudge] : []),
        ...(earlyPoint
          ? [
              p.family === "m3-circle-chord-length"
                ? "local-M-before-dimensions-v2"
                : "local-M-before-dimensions-v1",
            ]
          : []),
        ...(isolated ? ["isolated-editor-angles-v2"] : []),
        ...(p.angles.length
          ? ["explicit-open-leader-fill-v1", layoutFont ?? null]
          : []),
      ]),
      recipeSha256 = hash(recipe);
    const previous = proofs.find((v) => v.id === row.id);
    if (previous && progress[row.id] === previous.outputSha256) {
      (
        previous.steps as {
          command?: { op: string };
          offset?: number;
          t?: number;
        }[]
      )
        .filter((s) => s.command?.op === "addDimension")
        .forEach((s, di) => {
          if (s.offset !== undefined)
            dimensionHints.set(hintKey(p, di), {
              offset: s.offset,
              t: s.t ?? 50,
            });
        });
    }
    if (previous) {
      if (
        previous.recipeSha256 === recipeSha256 &&
        (!repair.has(row.id) || progress[row.id] === previous.outputSha256) &&
        !refusedIds.has(row.id)
      ) {
        cache.set(recipe, { display: entries[p.id][1], steps: previous.steps });
        continue;
      }
      assert.ok(
        process.argv.includes("--refresh") || process.argv.includes("--repair"),
        `Changed recipe ${row.id}; use --refresh`,
      );
      proofs.splice(proofs.indexOf(previous), 1);
      delete entries[row.id];
    }
    const cached =
      (repair.has(row.id) || refusedIds.has(row.id)) &&
      !repairedRecipes.has(recipe)
        ? undefined
        : cache.get(recipe);
    if (cached) {
      entries[p.id] = [p.source, cached.display];
      proofs.push({
        id: p.id,
        family: p.family,
        dimensions: p.dimensions,
        steps: cached.steps,
        outputSha256: hash(cached.display),
        recipeSha256,
      });
      checkpoint(p.id);
      continue;
    }
    let svg = p.base;
    const steps = [];
    for (const edit of p.edits) {
      const object = figureObjects(svg).find(
        (o) => o.type === "path" && o.attrs.d === edit.d,
      )!;
      assert.ok(object);
      const next = editFigureObject(svg, object.id, edit.attrs);
      steps.push({
        operation: "editFigureObject",
        d: edit.d,
        attrs: edit.attrs,
        inputSha256: editorHash(svg),
        outputSha256: editorHash(next),
      });
      svg = next;
    }
    const addAngles = () => {
      if (isolated) {
        const commands: FigureEditCommand[] = p.angles.map((a) => ({
          op: "addAngle",
          at: point(a.at),
          from: point(a.from),
          to: point(a.to),
          ...(a.text ? { text: a.text } : {}),
          ...(a.right ? { right: true } : {}),
        }));
        const next = isolatedAngles(svg, commands, layoutFont);
        steps.push({
          operation: "isolatedAngles",
          commands,
          layoutFont,
          inputSha256: editorHash(svg),
          outputSha256: editorHash(next),
        });
        svg = next;
        return;
      }
      for (const a of p.angles) {
        const command: FigureEditCommand = {
          op: "addAngle",
          at: point(a.at),
          from: point(a.from),
          to: point(a.to),
          ...(a.text ? { text: a.text } : {}),
          ...(a.right ? { right: true } : {}),
        };
        const beforeIds = new Set(figureObjects(svg).map((o) => o.id));
        const result = applyFigureEdits(svg, [command]);
        if (result.rejected.length)
          rejected.push({ id: p.id, command, reason: result.rejected });
        steps.push({
          command,
          inputSha256: editorHash(svg),
          outputSha256: editorHash(result.svg),
        });
        svg = result.svg;
        if (
          a.text &&
          ["m2-circum-three-base-angles", "m2-iso-bisector-angle"].includes(
            p.family,
          )
        ) {
          const added = figureObjects(svg).filter((o) => !beforeIds.has(o.id));
          const label = added.find((o) => o.type === "text");
          if (
            label &&
            !added.some((o) => o.type === "path" && /Q/i.test(o.attrs.d ?? ""))
          ) {
            const u = a.from.map((n, i) => n - a.at[i]),
              v = a.to.map((n, i) => n - a.at[i]),
              lu = Math.hypot(...u),
              lv = Math.hypot(...v);
            const b = [u[0] / lu + v[0] / lv, u[1] / lu + v[1] / lv],
              lb = Math.hypot(...b);
            const attrs = {
              x: String(Number(label.attrs.x) + (3 * b[0]) / lb),
              y: String(Number(label.attrs.y) + (3 * b[1]) / lb),
            };
            const next = editFigureObject(svg, label.id, attrs);
            steps.push({
              operation: "editFigureObject",
              text: a.text,
              attrs,
              inputSha256: editorHash(svg),
              outputSha256: editorHash(next),
            });
            svg = next;
          }
        }
      }
    };
    if (!p.id.startsWith("gt1-")) addAngles();
    for (const command of p.commands.filter((c) => c.op !== "addLabel")) {
      const result = applyFigureEdits(svg, [command]);
      if (result.rejected.length)
        rejected.push({ id: p.id, command, reason: result.rejected });
      steps.push({
        command,
        inputSha256: editorHash(svg),
        outputSha256: editorHash(result.svg),
      });
      svg = result.svg;
    }
    if (earlyPoint) {
      const command = p.commands.find(
        (c) => c.op === "addLabel" && c.text === "M",
      )!;
      assert.ok(command.op === "addLabel");
      const result = applyFigureEdits(svg, [command]);
      assert.deepEqual(result.rejected, []);
      steps.push({
        command,
        inputSha256: editorHash(svg),
        outputSha256: editorHash(result.svg),
      });
      svg = result.svg;
      const label = figureObjects(svg).find(
        (o) => o.type === "text" && o.text === "M",
      )!;
      const lengthFoot = p.family === "m3-circle-chord-length";
      const attrs = {
        "font-size": "16.8",
        x: String(Number(label.attrs["data-px"]) - (lengthFoot ? 14 : 16)),
        y: String(Number(label.attrs["data-py"]) + (lengthFoot ? 20 : -8)),
      };
      const placed = editFigureObject(svg, label.id, attrs);
      steps.push({
        operation: "editFigureObject",
        text: "M",
        attrs,
        inputSha256: editorHash(svg),
        outputSha256: editorHash(placed),
      });
      svg = placed;
    }
    let dimensionsAdded = 0;
    for (const [di, d] of p.dimensions.entries()) {
      const command = {
        op: "addDimension" as const,
        from: { x: d.from[0], y: d.from[1] },
        to: { x: d.to[0], y: d.to[1] },
        text: d.text,
        side: "out" as const,
      };
      const pilotRow = pilotProof.filter((q) => q.family === p.family).at(-1);
      const pilotStep = pilotRow?.steps.filter(
        (s) => s.command?.op === "addDimension",
      )[di];
      const replay =
        repair.has(row.id) || layoutFont || earlyPoint
          ? undefined
          : pilotStep?.offset === undefined
            ? undefined
            : { offset: pilotStep.offset, t: pilotStep.t ?? 50 };
      const result = await dimension(
        page,
        svg,
        d,
        replay,
        dimensionHints.get(hintKey(p, di)),
      );
      if ("reason" in result) {
        rejected.push({
          id: row.id,
          dimension: d,
          reason: result.reason,
          checks: "checked" in result ? result.checked : undefined,
        });
        break;
      }
      steps.push({
        command,
        inputSha256: editorHash(svg),
        outputSha256: editorHash(result.svg),
        operation: result.operation,
        offset: result.offset,
        t: result.t,
        handle: result.handle,
        frameBounds: result.frameBounds,
      });
      svg = result.svg;
      if (result.checked.length)
        dimensionHints.set(hintKey(p, di), {
          offset: result.offset,
          t: result.t,
        });
      dimensionsAdded++;
    }
    if (dimensionsAdded !== p.dimensions.length) continue;
    for (const command of p.commands.filter(
      (c) => c.op === "addLabel" && !(earlyPoint && c.text === "M"),
    )) {
      assert.ok(command.op === "addLabel");
      const result = applyFigureEdits(svg, [command]);
      if (result.rejected.length)
        rejected.push({ id: p.id, command, reason: result.rejected });
      steps.push({
        command,
        inputSha256: editorHash(svg),
        outputSha256: editorHash(result.svg),
      });
      svg = result.svg;
      const label = figureObjects(svg).find(
        (o) => o.type === "text" && o.text === command.text,
      )!;
      const sized = editFigureObject(svg, label.id, { "font-size": "16.8" });
      steps.push({
        operation: "editFigureObject",
        text: command.text,
        attrs: { "font-size": "16.8" },
        inputSha256: editorHash(svg),
        outputSha256: editorHash(sized),
      });
      svg = sized;
    }
    if (p.id.startsWith("gt1-")) addAngles();
    if (p.id.startsWith("gt1-"))
      for (const command of p.commands.filter((c) => c.op === "addLabel")) {
        const object = figureObjects(svg).find(
          (o) => o.type === "text" && o.text === command.text,
        )!;
        const result = relocateFigureLabel(svg, object.id, command.position);
        assert.ok(!("reason" in result), JSON.stringify(result));
        steps.push({
          operation: "relocateFigureLabel",
          text: command.text,
          position: command.position,
          inputSha256: editorHash(svg),
          outputSha256: editorHash(result.svg),
        });
        svg = result.svg;
        if (p.family === "m2-centroid-median-sum" && command.text === "G") {
          const placed = figureObjects(svg).find((o) => o.id === object.id)!;
          const attrs = {
            x: String(Number(placed.attrs["data-px"]) + 8),
            y: String(Number(placed.attrs["data-py"]) - 24),
          };
          const next = editFigureObject(svg, object.id, attrs);
          steps.push({
            operation: "editFigureObject",
            text: "G",
            attrs,
            inputSha256: editorHash(svg),
            outputSha256: editorHash(next),
          });
          svg = next;
        }
      }
    if (pointNudge && !earlyPoint) {
      const object = figureObjects(svg).find(
        (o) => o.type === "text" && o.text === pointNudge.text,
      )!;
      assert.ok(object);
      const attrs = {
        x: String(Number(object.attrs["data-px"]) + pointNudge.dx),
        y: String(Number(object.attrs["data-py"]) + pointNudge.dy),
      };
      assert.ok(Object.values(attrs).every((v) => Number.isFinite(Number(v))));
      const next = editFigureObject(svg, object.id, attrs);
      steps.push({
        operation: "editFigureObject",
        text: pointNudge.text,
        attrs,
        inputSha256: editorHash(svg),
        outputSha256: editorHash(next),
      });
      svg = next;
    }
    for (const object of figureObjects(svg).filter(
      (o) =>
        o.type === "path" &&
        /Q/i.test(o.attrs.d ?? "") &&
        !o.attrs["stroke-dasharray"] &&
        o.attrs.fill !== "none",
    )) {
      const next = editFigureObject(svg, object.id, { fill: "none" });
      steps.push({
        operation: "editFigureObject",
        d: object.attrs.d,
        attrs: { fill: "none" },
        inputSha256: editorHash(svg),
        outputSha256: editorHash(next),
      });
      svg = next;
    }
    if (
      (repair.has(row.id) || process.argv.includes("--clear-labels")) &&
      p.angles.some((a) => a.text)
    ) {
      try {
        const result = await adjustAngleLabels(page, svg, p.angles);
        if (result.moves.length)
          steps.push({
            operation: "labelMoves",
            moves: result.moves,
            inputSha256: editorHash(svg),
            outputSha256: editorHash(result.svg),
          });
        svg = result.svg;
      } catch (error) {
        rejected.push({
          id: p.id,
          operation: "adjustAngleLabels",
          reason: String(error),
        });
        save();
        continue;
      }
    }
    const display = (await editorTypeset(svg)).replace(
      /(<svg\b[^>]*>)/,
      "$1<desc>arithmetic-remaining-presentation-v1</desc>",
    );
    entries[p.id] = [p.source, display];
    proofs.push({
      id: p.id,
      family: p.family,
      dimensions: p.dimensions,
      steps,
      outputSha256: hash(display),
      recipeSha256,
    });
    cache.set(recipe, { display, steps });
    if (repair.has(row.id)) repairedRecipes.add(recipe);
    progress[row.id] = hash(display);
    checkpoint(p.id);
  }
  save();
  if (!pilot) {
    assert.equal(rejected.length, 0);
    const grouped: Record<string, Record<string, [string, string]>> = {};
    for (const p of proofs) (grouped[p.family] ??= {})[p.id] = entries[p.id];
    const families = Object.fromEntries(
      Object.entries(grouped).map(([f, v]) => {
        const id = Object.keys(v)[0],
          prefix = id.startsWith("age-")
            ? `age-${f}-v1-`
            : `${id.split("-")[0]}-${f}-`;
        return [
          f,
          {
            prefix,
            data: Buffer.from(
              deflateSync(strToU8(JSON.stringify(v)), { level: 9 }),
            ).toString("base64"),
          },
        ];
      }),
    );
    writeFileSync(
      "src/lib/arithmetic-v2/presentation/remaining-assets-v1.json",
      JSON.stringify({ version: 1, count: proofs.length, families }) + "\n",
    );
  }
  console.log(JSON.stringify({ figures: proofs.length, rejected }, null, 2));
  await browser.close();
  dom.window.close();
}
if (process.argv[1]?.endsWith("arithmetic-full-figure-audit-build.ts"))
  build().catch((e) => {
    console.error(e);
    process.exit(1);
  });
