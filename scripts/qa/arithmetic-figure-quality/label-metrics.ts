/** Reuse the editor's exact MathJax glyphs/metrics; append finite new vocabulary
 * without rebuilding or changing any existing typography entry. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { arithmeticTypographyPacked } from "../../../src/lib/arithmetic-v2/presentation/typographyData";
import { arithmeticLabelParts } from "../../../src/lib/arithmetic-v2/presentation/typographyLabel";
import {
  typesetLabel,
  placeLabel,
} from "../../../src/components/unified/figure-editor/mathjaxLabel";
const base = JSON.parse(
  inflateSync(Buffer.from(arithmeticTypographyPacked, "base64")).toString(),
) as {
  glyphs: string[];
  entries: Record<string, [number, number, number, string]>;
};
const labels = new Set<string>();
for (const name of ["models", "trig-models"])
  for (const row of JSON.parse(
    readFileSync(`/tmp/arithmetic-figure-quality/${name}.json`, "utf8"),
  )) {
    if (!row.plan) continue;
    for (const k of Object.keys(row.plan.model.points)) labels.add(k);
    for (const g of [
      ...row.plan.givens,
      ...(row.plan.target ? [row.plan.target] : []),
    ])
      labels.add(g.text + (g.kind === "segment" ? " cm" : ""));
  }
const glyphs = [...base.glyphs],
  index = new Map(glyphs.map((g, i) => [g, i])),
  entries: typeof base.entries = {},
  metrics: Record<string, [number, number, number]> = {};
for (const label of labels) {
  const parts = arithmeticLabelParts(label);
  assert.equal(parts.length, 1, label);
  assert.ok(parts[0].tex, label);
  const tex = parts[0].tex;
  const laid = typesetLabel(tex);
  assert.ok(laid, label);
  metrics[label] = [laid.widthEm, laid.ascentEm, laid.descentEm];
  if (base.entries[tex]) {
    assert.deepEqual(metrics[label], base.entries[tex].slice(0, 3), label);
    continue;
  }
  const placed = placeLabel(laid, "", 0, 0, 1000, "currentColor", undefined, {
    anchor: "start",
  });
  assert.ok(placed, tex);
  const body = placed
    .slice(placed.indexOf(">") + 1, -4)
    .replace(/<path\b[^>]*><\/path>/g, (g) => {
      let i = index.get(g);
      if (i === undefined) {
        i = glyphs.length;
        glyphs.push(g);
        index.set(g, i);
      }
      return `~${i}~`;
    });
  entries[tex] = [...metrics[label], body];
}
writeFileSync(
  "src/lib/arithmetic-v2/presentation/engine-typography-v1.json",
  JSON.stringify({
    baseGlyphs: base.glyphs.length,
    glyphs: glyphs.slice(base.glyphs.length),
    entries,
  }) + "\n",
);
writeFileSync(
  "/tmp/arithmetic-figure-quality/label-metrics.json",
  JSON.stringify(metrics),
);
console.log({
  labels: labels.size,
  newEntries: Object.keys(entries).length,
  newGlyphs: glyphs.length - base.glyphs.length,
});
