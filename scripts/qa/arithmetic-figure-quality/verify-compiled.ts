/** Byte-exact codec replay and independent rendered-point transform checks. */
import "../init-arithmetic-packs";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import {
  arithmeticEngineFigureSvg,
  arithmeticEngineInlineSvg,
} from "../../../src/lib/arithmetic-v2/presentation/engineFigures";
import { arithmeticGeometryCatalogSvg } from "../../../src/lib/arithmetic-v2/geometry";
import type { ArithmeticV2Prompt } from "../../../src/lib/arithmetic-v2/types";
const out = "docs/planning/tracks/reports/arithmetic-figure-quality-20261112";
const manifest = JSON.parse(
  gunzipSync(readFileSync(`${out}/manifest.json.gz`)).toString(),
) as {
  rows: {
    id: string;
    family: string;
    prompt: ArithmeticV2Prompt;
    renderer: string;
  }[];
};
const proof = JSON.parse(
  gunzipSync(readFileSync(`${out}/engine-proof.json.gz`)).toString(),
) as {
  id: string;
  displaySha256: string;
  spec: { points: Record<string, [number, number]> };
}[];
const byId = new Map(proof.map((p) => [p.id, p]));
let count = 0,
  points = 0;
for (const row of manifest.rows.filter(
  (r) => r.renderer === "compiled-python-engine",
)) {
  const p = byId.get(row.id);
  assert.ok(p, row.id);
  const svg = row.id.startsWith("inline:")
    ? arithmeticEngineInlineSvg(row.family, row.prompt)
    : arithmeticEngineFigureSvg(row.id, arithmeticGeometryCatalogSvg(row.id));
  assert.ok(svg, row.id);
  if (row.id.startsWith("inline:")) {
    const reordered = Object.fromEntries(
      Object.entries(row.prompt).reverse(),
    ) as ArithmeticV2Prompt;
    assert.equal(
      arithmeticEngineInlineSvg(row.family, reordered),
      svg,
      row.id + " reordered JSON",
    );
  }
  assert.equal(
    createHash("sha256").update(svg).digest("hex"),
    p.displaySha256,
    row.id,
  );
  let translation: [number, number] | undefined;
  for (const m of svg.matchAll(/<text\b([^>]*)>/g)) {
    const name = /data-mj="([A-Z])"/.exec(m[1])?.[1],
      x = /data-px="([^"]+)"/.exec(m[1])?.[1],
      y = /data-py="([^"]+)"/.exec(m[1])?.[1];
    if (!name || x === undefined || y === undefined) continue;
    const source = p.spec.points[name];
    assert.ok(source, row.id);
    translation ??= [Number(x) - source[0], Number(y) - source[1]];
    assert.ok(
      Math.abs(Number(x) - source[0] - translation[0]) <= 0.0011,
      row.id + name,
    );
    assert.ok(
      Math.abs(Number(y) - source[1] - translation[1]) <= 0.0011,
      row.id + name,
    );
    points++;
  }
  assert.ok(translation, row.id);
  count++;
}
assert.equal(count, 26693);
assert.equal(proof.length, count);
writeFileSync(
  `${out}/compiled-replay.json`,
  JSON.stringify(
    {
      variants: count,
      renderedPointOwners: points,
      byteMismatches: 0,
      coordinateTransformMismatches: 0,
      codec:
        "lossless literals plus exact numeric strings; no geometry renderer",
    },
    null,
    2,
  ),
);
console.log({ variants: count, points });
