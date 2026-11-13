/** Independent public a/b/c target check against actual final SVG point owners.
 * GeometryMeasure exact answers use its documented [n,r,d] surd normal form.
 * All 64 coordinate-rounding corners are considered, not relaxed tolerances. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { getArithmeticV2Definition } from "../../../src/lib/arithmetic-v2/registry";
import { arithmeticGeometryCatalogSvg } from "../../../src/lib/arithmetic-v2/geometry";
import { figureFirstSvg } from "../../../src/lib/arithmetic-v2/presentation/figureFirst";
const out = "docs/planning/tracks/reports/arithmetic-figure-quality-20261112";
const proof = JSON.parse(
  gunzipSync(readFileSync(`${out}/engine-proof.json.gz`)).toString(),
) as {
  id: string;
  dimensions: Record<string, { points: string[]; label: string }>;
  residual: string[];
}[];
const byId = new Map(proof.map((p) => [p.id, p]));
const def = getArithmeticV2Definition("m3-trig-special-length"),
  keys = { a: "BC", b: "AB", c: "AC" } as const;
const attrs = (s: string, k: string) =>
  new RegExp(`\\b${k}="([^"]*)"`).exec(s)?.[1];
const distance = (p: Record<string, [number, number]>, k: string) =>
  Math.hypot(p[k[0]][0] - p[k[1]][0], p[k[0]][1] - p[k[1]][1]);
let checked = 0;
for (let i = 0; i < def.domainSize; i++) {
  const c = def.problemAt(i),
    p = c.prompt;
  assert.equal(p.layout, "math");
  if (p.layout !== "math") throw Error();
  const given = /∠A=(\d+)°[,，]\s*([abc])=(\d+) cm/.exec(p.text),
    target = /^([abc])의 길이/.exec(p.instruction ?? "");
  assert.ok(given, p.text);
  assert.ok(target, p.instruction);
  const givenKey = keys[given[2] as keyof typeof keys],
    targetKey = keys[target[1] as keyof typeof keys];
  const svg = figureFirstSvg(
    def.id,
    p,
    arithmeticGeometryCatalogSvg(p.figureId!),
  );
  assert.ok(svg, p.figureId);
  const points: Record<string, [number, number]> = {};
  for (const m of svg.matchAll(/<(?:g|text)\b([^>]+)>/g)) {
    const name = attrs(m[1], "data-mj"),
      x = attrs(m[1], "data-px"),
      y = attrs(m[1], "data-py");
    if (name && /^[ABC]$/.test(name) && x !== undefined && y !== undefined)
      points[name] = [Number(x), Number(y)];
  }
  assert.equal(Object.keys(points).length, 3, p.figureId);
  const values: number[] = [],
    angles: number[] = [];
  for (let mask = 0; mask < 64; mask++) {
    const q = Object.fromEntries(
      Object.entries(points).map(([k, v], j) => [
        k,
        v.map((n, z) => n + ((mask >> (2 * j + z)) & 1 ? 0.0005 : -0.0005)),
      ]),
    ) as typeof points;
    values.push(
      (Number(given[3]) * distance(q, targetKey)) / distance(q, givenKey),
    );
    const u = q.B.map((n, j) => n - q.A[j]),
      v = q.C.map((n, j) => n - q.A[j]);
    angles.push(
      (Math.acos(
        Math.max(
          -1,
          Math.min(
            1,
            (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v)),
          ),
        ),
      ) *
        180) /
        Math.PI,
    );
  }
  const xs = c.answer.exact.map(Number),
    answer =
      c.answer.kind === "integer"
        ? xs[0]
        : c.answer.kind === "rational"
          ? xs[0] / xs[1]
          : c.answer.kind === "surd"
            ? (xs[0] * Math.sqrt(xs[1])) / xs[2]
            : NaN;
  assert.ok(Number.isFinite(answer), p.figureId);
  assert.ok(
    answer >= Math.min(...values) - 1e-10 &&
      answer <= Math.max(...values) + 1e-10,
    p.figureId + " target length",
  );
  assert.ok(
    Number(given[1]) >= Math.min(...angles) - 1e-10 &&
      Number(given[1]) <= Math.max(...angles) + 1e-10,
    p.figureId + " public angle",
  );
  const publicProof = byId.get(p.figureId!);
  assert.ok(publicProof);
  for (const [key, label] of [
    [givenKey, `${given[3]} cm`],
    [targetKey, "x cm"],
  ])
    assert.ok(
      Object.values(publicProof.dimensions).some(
        (d) => d.points.join("") === key && d.label === label,
      ) || publicProof.residual.includes(`${key}=${label}`),
      p.figureId + " public dimension " + key,
    );
  const targetLines = [...svg.matchAll(/<line\b[^>]*>/g)]
    .map((m) => m[0])
    .filter((t) => attrs(t, "stroke-width") === "2.6");
  assert.ok(targetLines.length, p.figureId + " highlighted target");
  for (const line of targetLines) {
    const a = [Number(attrs(line, "x1")), Number(attrs(line, "y1"))],
      b = [Number(attrs(line, "x2")), Number(attrs(line, "y2"))],
      A = points[targetKey[0]],
      B = points[targetKey[1]],
      near = (u: number[], v: number[]) =>
        u.every((n, j) => Math.abs(n - v[j]) <= 0.0011);
    assert.ok(
      (near(a, A) && near(b, B)) || (near(a, B) && near(b, A)),
      p.figureId + " target owner",
    );
  }
  checked++;
}
writeFileSync(
  `${out}/special-length-invariants.json`,
  JSON.stringify(
    {
      actualFinalSVGsChecked: checked,
      failures: 0,
      coordinateUncertainty: 0.0005,
      checks: [
        "public angle",
        "public given side",
        "exact scalar target",
        "actual highlighted target owner",
        "given/target dimension or explicit condition",
      ],
    },
    null,
    2,
  ),
);
console.log({ checked });
