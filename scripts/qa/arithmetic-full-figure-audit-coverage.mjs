/** Hash-gated reuse of unchanged observations; both original runs are retained. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import audit from "./arithmetic-full-figure-audit.ts";
import geometry from "../../src/lib/arithmetic-v2/geometry.ts";
import presentation from "../../src/lib/arithmetic-v2/presentation/index.ts";
import typography from "../../src/lib/arithmetic-v2/presentation/typography.ts";
import names from "../../src/lib/arithmetic-v2/presentation/text.ts";
const { output, readEvidenceText, hash } = audit;
const { arithmeticGeometryCatalogSvg } = geometry;
const { presentArithmeticGeometrySvg } = presentation;
const { typesetArithmeticGeometrySvg } = typography;
const { arithmeticGeometryNames } = names;

const read = (file) => JSON.parse(readEvidenceText(file, "utf8"));
const dir = `${output}/remaining`,
  local = `${output}/local-repair`;
const previous = `${dir}/run-before-local-repair`;
const entries = read(`${dir}/displays.json`);
const census = read(`${output}/census.json`);
const owned = census.rows.filter((r) => r.owner === "full-audit-worker");
const write = (file, data) =>
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
const display = (row) =>
  entries[row.id]
    ? typesetArithmeticGeometrySvg(entries[row.id][1], {
        normalizeLabel: arithmeticGeometryNames,
      }).replace(
        /(<svg\b[^>]*>)/,
        "$1<desc>arithmetic-geometry-presentation-v1</desc>",
      )
    : presentArithmeticGeometrySvg(
        row.id,
        arithmeticGeometryCatalogSvg(row.id),
      );

if (process.argv.includes("--prepare-extremes")) {
  const chosen = new Map();
  const add = (id, reason) => {
    assert.ok(entries[id], id);
    chosen.set(id, [...(chosen.get(id) ?? []), reason]);
  };
  for (let n = 10; n <= 20; n++)
    for (const side of [2, 5])
      add(
        `gm-m3-trig-special-length-30-${n}-${side}`,
        "original structural collision",
      );
  for (const row of read(`${dir}/association-before-repair.json`).filter((r) =>
    r.id.includes("trig-triangle-area"),
  ))
    add(row.id, "angle vertex association repair");
  for (const row of read(`${dir}/second-full-failures.json`))
    add(row.id, "final nine layout repairs");
  for (const row of read(`${dir}/rejected-before-repair.json`))
    add(row.id, "actual editor refusal repaired");
  for (const id of [
    "gt1-m2-iso-bisector-angle-24",
    "gt1-m2-circum-base-central-angle-52",
    "gt1-m2-parallelogram-adjacent-50",
    "gm-m3-circle-inscribed-55",
    "gm-m3-circle-central-50",
    "gm-m3-circle-cyclic-opposite-50",
    "gm-m3-circle-tangent-chord-0-60",
    "gm-m3-circle-chord-distance-13-9",
  ])
    add(id, "crowded editor pilot");
  for (const row of owned.filter((r) => r.family.startsWith("m1-sector-")))
    if (/-(?:2|10)-(?:180|240|270)$/.test(row.id))
      add(row.id, "semicircle/reflex sweep and radius extreme");
  const proof = read(`${dir}/proof.json`).proofs;
  for (const p of [...proof]
    .sort(
      (a, b) =>
        Math.max(0, ...b.steps.map((s) => Math.abs(s.offset ?? 0))) -
        Math.max(0, ...a.steps.map((s) => Math.abs(s.offset ?? 0))),
    )
    .slice(0, 8))
    add(p.id, "largest accepted dimension bends");
  const out = `${output}/extreme-review`;
  mkdirSync(out, { recursive: true });
  write(
    `${out}/displays.json`,
    Object.fromEntries([...chosen.keys()].map((id) => [id, entries[id]])),
  );
  write(
    `${out}/selection.json`,
    [...chosen].map(([id, reasons]) => ({
      id,
      reasons: [...new Set(reasons)],
      displaySha256: hash(entries[id][1]),
    })),
  );
  console.log(`Prepared ${chosen.size} focused visual extremes`);
} else {
  const prettier = createRequire("C:/Creative/testautocreator/package.json")(
    "prettier",
  );
  const checkerHashes = {};
  for (const name of ["browser", "ink"]) {
    const file = `scripts/qa/arithmetic-full-figure-audit-${name}.ts`;
    const old = readEvidenceText(`${previous}/checker-${name}.ts`, "utf8");
    const current = readFileSync(file, "utf8");
    // Formatting may be applied by the normal pre-commit hook. No behavioral
    // checker change is accepted for reuse: the formatted full texts must match.
    const formattedOld = await prettier.format(old, { parser: "typescript" });
    const formattedCurrent = await prettier.format(current, {
      parser: "typescript",
    });
    assert.equal(formattedCurrent, formattedOld, `${name} checker changed`);
    checkerHashes[name] = {
      originalSource: hash(old),
      currentSource: hash(current),
      formatNormalizedSource: hash(formattedCurrent),
    };
  }
  const oldEntries = read(`${previous}/displays.json`);
  assert.deepEqual(Object.keys(entries).sort(), Object.keys(oldEntries).sort());
  const changed = Object.keys(entries).filter(
    (id) => entries[id][1] !== oldEntries[id][1],
  );
  const newEntries = read(`${local}/displays.json`);
  assert.deepEqual(
    Object.keys(newEntries).sort(),
    changed.sort(),
    "Every changed ID must be rerendered",
  );
  for (const id of changed) assert.deepEqual(newEntries[id], entries[id]);
  const oldRows = read(`${previous}/browser.json`),
    newRows = read(`${local}/browser.json`);
  const oldMap = new Map(oldRows.map((r) => [`${r.id}/${r.media}`, r]));
  const newMap = new Map(newRows.map((r) => [`${r.id}/${r.media}`, r]));
  assert.equal(oldMap.size, 7971 * 2);
  assert.equal(newMap.size, changed.length * 2);
  const bad = [
    "geometryHits",
    "labelHits",
    "labelClipped",
    "geometryClipped",
    "maskedOutlineHits",
    "haloOutlineHits",
    "semanticErrors",
  ];
  const coverage = [],
    merged = [];
  const oldInk = read(`${previous}/ink-proof.json`),
    newInk = read(`${local}/ink-proof.json`);
  assert.equal(oldInk.renders, oldRows.length);
  assert.equal(newInk.renders, newRows.length);
  assert.deepEqual(newInk.failures, []);
  assert.ok(
    oldInk.failures.every((r) => changed.includes(r.id)),
    "Unrepaired independent raster failure",
  );
  for (const row of owned) {
    const svgSha256 = hash(display(row));
    const updated = changed.includes(row.id),
      run = updated ? "local-repair" : "remaining/run-before-local-repair";
    for (const media of ["screen", "print"]) {
      const result = (updated ? newMap : oldMap).get(`${row.id}/${media}`);
      assert.ok(result);
      assert.equal(
        result.svgSha256,
        svgSha256,
        `${row.id}/${media} stale observation`,
      );
      assert.ok(
        bad.every((k) => result[k].length === 0),
        `${row.id}/${media} failed`,
      );
      merged.push(result);
    }
    coverage.push({
      id: row.id,
      family: row.family,
      sourceSha256: row.sourceSha256,
      displaySha256: svgSha256,
      run,
    });
  }
  const unique = (rows) => {
    const counts = new Map();
    for (const r of rows)
      counts.set(r.sourceSha256, (counts.get(r.sourceSha256) ?? 0) + 1);
    return {
      ids: rows.length,
      uniqueCanonicalBytes: counts.size,
      reusedByteGroups: [...counts.values()].filter((n) => n > 1).length,
      repeatedIDs: rows.length - counts.size,
    };
  };
  write(`${dir}/final-browser.json`, merged);
  write(`${dir}/final-coverage.json`, {
    registered: unique(census.rows),
    owned: unique(owned),
    changedIDs: changed,
    unchangedIDs: owned.length - changed.length,
    renders: merged.length,
    unresolved: [],
    checkerHashes,
    rows: coverage,
  });
  console.log(
    JSON.stringify({
      owned: owned.length,
      changed: changed.length,
      reused: owned.length - changed.length,
      renders: merged.length,
      failures: 0,
    }),
  );
}
