import { readEvidenceText } from "./arithmetic-full-figure-audit";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import {
  arithmeticGeometryCatalogSvg,
  arithmeticAngleAssets,
  arithmeticAngleAssetIds,
} from "../../src/lib/arithmetic-v2/geometry";
import { stripLabels } from "../../src/lib/figure/svgLabels";
import { output, type census } from "./arithmetic-full-figure-audit";

type Point = [number, number];
const attr = (s: string, name: string) =>
  new RegExp(`\\b${name}="([^"]*)"`).exec(s)?.[1] ?? "";
const numbers = (s: string) =>
  (s.match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
const angle = (a: Point, o: Point, b: Point) =>
  (Math.atan2(
    Math.abs((a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])),
    (a[0] - o[0]) * (b[0] - o[0]) + (a[1] - o[1]) * (b[1] - o[1]),
  ) *
    180) /
  Math.PI;
const data = JSON.parse(
  readEvidenceText(`${output}/census.json`, "utf8"),
) as ReturnType<typeof census>;
const checks = [],
  failures = [];
for (const row of data.rows.filter((r) => r.owner === "full-audit-worker")) {
  const source = stripLabels(arithmeticGeometryCatalogSvg(row.id));
  const tags = [...source.matchAll(/<line\b([^>]+)>/g)].map((m) => m[1]);
  const edges = tags.map((t) => ({
    key: attr(t, "data-segment"),
    a: [Number(attr(t, "x1")), Number(attr(t, "y1"))] as Point,
    b: [Number(attr(t, "x2")), Number(attr(t, "y2"))] as Point,
  }));
  const local = [];
  if (arithmeticAngleAssetIds.has(row.id)) {
    const entry = arithmeticAngleAssets.find((e) => e.id === row.id)!;
    const vertices = edges.slice(0, 3).map((e) => e.a);
    const expected = [...entry.given, 180 - entry.given[0] - entry.given[1]];
    vertices.forEach((o, i) =>
      local.push({
        kind: "frozen actual vertex angle",
        key: String(i),
        measured: angle(vertices[(i + 1) % 3], o, vertices[(i + 2) % 3]),
        expected: expected[i],
      }),
    );
  } else if (row.id.startsWith("gt1-")) {
    const points = Object.fromEntries(
      edges
        .filter((e) => e.key)
        .flatMap((e) => [
          [e.key[0], e.a],
          [e.key[1], e.b],
        ]),
    );
    for (const m of row.prompt.matchAll(/∠([A-Z]{3})=(\d+)°/g)) {
      const [a, o, b] = [...m[1]].map((k) => points[k]);
      assert.ok(a && o && b, row.id);
      local.push({
        kind: "given actual vertex angle",
        key: m[1],
        measured: angle(a, o, b),
        expected: Number(m[2]),
      });
    }
    const target = /^∠([A-Z]{3})/.exec(row.instruction);
    if (target) {
      const [a, o, b] = [...target[1]].map((k) => points[k]);
      assert.ok(a && o && b, row.id);
      const answer = row.answer.replace("°", "").split("/").map(Number);
      local.push({
        kind: "target actual vertex angle",
        key: target[1],
        measured: angle(a, o, b),
        expected: answer[0] / (answer[1] ?? 1),
      });
    }
  } else if (
    row.id.startsWith("gc1-") &&
    /-(prism|pyramid|frustum)-/.test(row.family)
  ) {
    const n = row.parameters[0],
      pyramid = row.family.includes("-pyramid-");
    local.push({
      kind: "rendered solid edges including hidden edges",
      key: "edges",
      measured: edges.length,
      expected: n * (pyramid ? 2 : 3),
    });
    const vertices = new Set(
      edges.flatMap((e) => [e.a.join(","), e.b.join(",")]),
    );
    local.push({
      kind: "rendered solid vertices",
      key: "vertices",
      measured: vertices.size,
      expected: pyramid ? n + 1 : 2 * n,
    });
  } else if (row.id.startsWith("gc1-")) {
    const n = row.parameters[0];
    local.push({
      kind: "rendered fan diagonals",
      key: "diagonals",
      measured: edges.length,
      expected: n - 3,
    });
  }
  if (row.id.startsWith("gm-")) {
    for (const match of source.matchAll(
      /<(?:g|path)\b([^>]*data-drill-(?:angle|right)=[^>]*)>/g,
    )) {
      const tag = match[1],
        p = numbers(attr(tag, "data-points"));
      if (p.length !== 6) continue;
      const right = attr(tag, "data-drill-right") === "true",
        given = attr(tag, "data-given"),
        target =
          attr(tag, "data-drill-angle") === "target" &&
          row.answer.endsWith("°");
      if (!right && !given && !target) continue;
      local.push({
        kind: "GM actual marked angle",
        key: right ? "right" : given ? "given" : "target",
        measured: angle(
          p.slice(0, 2) as Point,
          p.slice(2, 4) as Point,
          p.slice(4, 6) as Point,
        ),
        expected: right
          ? 90
          : given
            ? Number(given)
            : Number(row.answer.slice(0, -1)),
      });
    }
    if (row.family.startsWith("m1-sector-"))
      for (const match of source.matchAll(/<path\b([^>]*)>/g)) {
        const d = attr(match[1], "d");
        if (!/A/.test(d)) continue;
        const p = numbers(d);
        assert.equal(p.length, 9, row.id);
        const minor = angle([p[0], p[1]], [120, 117], [p[7], p[8]]);
        local.push({
          kind: "sector actual arc sweep including reflex",
          key: `r=${p[2]}`,
          measured: p[5] === 1 ? 360 - minor : minor,
          expected: row.parameters[1],
        });
      }
  }
  const polygons = [...source.matchAll(/<polygon\b([^>]*)>/g)].map((m) =>
    numbers(attr(m[1], "points")),
  );
  for (const m of source.matchAll(/<path\b([^>]*)>/g)) {
    const d = attr(m[1], "d");
    if (/z\s*$/i.test(d) && !/[AQCHVS]/i.test(d)) polygons.push(numbers(d));
  }
  if (/^e2-polygon-(sides|vertices)-total$/.test(row.family)) {
    local.push({
      kind: "rendered polygon vertices/sides",
      key: "total",
      measured: polygons.reduce((n, p) => n + p.length / 2, 0),
      expected: row.parameters.reduce((a, b) => a + b, 0),
    });
    if (row.family.includes("vertices"))
      local.push({
        kind: "rendered vertex dots",
        key: "dots",
        measured: [...source.matchAll(/<circle\b/g)].length,
        expected: row.parameters.reduce((a, b) => a + b, 0),
      });
  }
  if (row.family === "e5-unit-square-area") {
    const [w, h] = row.parameters,
      p = polygons[0];
    assert.equal(p.length, 8);
    const grid = [...source.matchAll(/<path\b([^>]*)>/g)]
      .map((m) => numbers(attr(m[1], "d")))
      .filter((p) => p.length === 4);
    local.push(
      {
        kind: "actual unit grid",
        key: "columns",
        measured: grid.filter((p) => p[0] === p[2]).length + 1,
        expected: w,
      },
      {
        kind: "actual unit grid",
        key: "rows",
        measured: grid.filter((p) => p[1] === p[3]).length + 1,
        expected: h,
      },
      {
        kind: "actual square cell aspect",
        key: "equal width/height",
        measured: Math.hypot(p[2] - p[0], p[3] - p[1]) / w,
        expected: Math.hypot(p[4] - p[2], p[5] - p[3]) / h,
      },
    );
  }
  if (/^e2-length-(sum|difference|broken)$/.test(row.family)) {
    const paths = [...source.matchAll(/<path\b([^>]*)>/g)].map((m) =>
      numbers(attr(m[1], "d")),
    );
    const first = paths[0],
      second = paths[1];
    const a = Math.hypot(first[2] - first[0], first[3] - first[1]);
    const b = row.family.endsWith("broken")
      ? Math.hypot(first[4] - first[2], first[5] - first[3])
      : Math.hypot(second[2] - second[0], second[3] - second[1]);
    local.push({
      kind: "actual measured segment ratio",
      key: "first/second",
      measured: a / b,
      expected: row.parameters[0] / row.parameters[1],
    });
  }
  if (local.length) checks.push({ id: row.id, checks: local });
  for (const c of local)
    if (Math.abs(c.measured - c.expected) > 0.02)
      failures.push({ id: row.id, ...c });
}
writeFileSync(
  `${output}/independent-semantics.json`,
  JSON.stringify({ checks, failures }) + "\n",
);
console.log(
  JSON.stringify(
    {
      figures: checks.length,
      checks: checks.reduce((n, r) => n + r.checks.length, 0),
      failures,
    },
    null,
    2,
  ),
);
assert.equal(failures.length, 0, "Independent geometry checks failed");
