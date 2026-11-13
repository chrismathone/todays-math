/** Public-only, unique finite candidates; no impossible over-quota family. */
import { writeFileSync, readFileSync } from "node:fs";
import { arithmeticV2Definitions } from "../../../src/lib/arithmetic-v2/registry";
import { arithmeticGeometryCatalogSvg } from "../../../src/lib/arithmetic-v2/geometry";
const registered = new Set(
  (
    JSON.parse(
      readFileSync("/tmp/arithmetic-figure-quality/models.json", "utf8"),
    ) as { family: string; plan?: unknown }[]
  )
    .filter((r) => r.plan)
    .map((r) => r.family),
);
const inline = new Set([
  "m3-trig-length-given-ratio",
  "m3-trig-area-given-sine",
  "m3-trig-side-from-area-sine",
  "m3-trig-sine-from-area",
]);
const definitions = arithmeticV2Definitions();
function cases(kind: "inline" | "registered" | "all") {
  const families = definitions.filter((d) =>
    kind === "inline"
      ? inline.has(d.id)
      : kind === "registered"
        ? registered.has(d.id)
        : registered.has(d.id) || inline.has(d.id),
  );
  const result = [];
  for (let turn = 0; result.length < 2000; turn++)
    for (const d of families) {
      if (turn >= d.domainSize) continue;
      const index = (turn * 7919) % d.domainSize,
        c = d.problemAt(index),
        p = c.prompt;
      result.push({
        type: d.id,
        index,
        prompt: p,
        ...(p.layout === "math" && p.figureId
          ? { canonical: arithmeticGeometryCatalogSvg(p.figureId) }
          : {}),
      });
      if (result.length === 2000) break;
    }
  if (new Set(result.map((c) => `${c.type}:${c.index}`)).size !== result.length)
    throw Error("duplicate benchmark candidate");
  return result;
}
const workloads = {
  inline: cases("inline"),
  "registered-mixed": cases("registered"),
  "registered-grouped": cases("registered").sort((a, b) =>
    a.type.localeCompare(b.type),
  ),
  "all-mixed": cases("all"),
};
for (const [name, rows] of Object.entries(workloads)) {
  writeFileSync(
    `scripts/qa/arithmetic-figure-quality/benchmark-${name}-runtime.json`,
    JSON.stringify(rows),
  );
  console.log({
    name,
    cases: rows.length,
    families: new Set(rows.map((r) => r.type)).size,
    registered: rows.filter((r) => r.canonical).length,
  });
}
