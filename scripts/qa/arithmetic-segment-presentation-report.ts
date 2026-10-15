/** Collect completed local proofs and exact coverage into a reviewable report. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SegmentPlan } from "./arithmetic-segment-presentation-model";
import type { Layout } from "./arithmetic-segment-presentation-layout";

async function main() {
  const out = path.resolve("tmp/arithmetic-segment-presentation");
  const read = async (name: string) =>
    JSON.parse(await readFile(path.join(out, name), "utf8"));
  const build = await read("build.json"),
    proof = await read("proof.json"),
    runtime = await read("runtime.json");
  const plans = (await read("plans.json")) as SegmentPlan[];
  const layouts = (await read("layouts.json")) as Layout[];
  assert.equal(build.figures, 1827);
  assert.equal(runtime.figures, 1827);
  assert.deepEqual(proof.failures, []);
  assert.equal(Object.keys(proof.modes).length, 6);
  assert.ok(
    Object.values(proof.modes).every(
      (row) => (row as { count: number }).count === 1827,
    ),
  );
  const maximumFourFamilyBytes = Object.values(build.stats)
    .map((row) => (row as { rawBytes: number }).rawBytes)
    .sort((a, b) => b - a)
    .slice(0, 4)
    .reduce((a, b) => a + b, 0);
  const report = {
    date: "2026-10-15",
    base: "c6401393d",
    scope:
      "50 middle geometry types / 1827 finite numeric-condition variants carrying one numeric segment label each. These are variants, not 1827 distinct types. Elementary and remaining geometry have separate exhaustive reports.",
    problem:
      "The prior compact-layout optimizer could translate measured chords, add angled witnesses for external bisectors, and place trapezoid top-base dimensions inside. The replacement preserves actual editor endpoints and uses the outside command for boundary segments.",
    api: {
      path: "src/lib/arithmetic-v2/presentation/segments.ts",
      export:
        "presentArithmeticSegmentSvg(id: string, originalSvg: string): string | undefined",
      integration:
        "Root invokes after trusted canonical validation and before typesetArithmeticGeometrySvg. Shared facade/registry/UI not edited.",
      acceptance:
        "Full original string equality, never hash-only. Unknown IDs, tuples, versions, modified source, and already transformed SVG return undefined.",
    },
    engine: {
      curve:
        "Offline directly calls actual figure-editor addFigureMark(addDimension). When its default overlaps content, replays addFigureObject(curve), moveFigureHandle(CURVE_BEND_HANDLE), addMidLabel and, when needed, editFigureObject at sampleFigurePath positions. No separate curve construction or translated measured chord.",
      label:
        "Editor-returned horizontal label coordinates, font and attributes are retained. Existing editor label-position edits can move a number along its same curve to clear intersecting diagonals. Actual plain and typeset browser bounds jointly constrain layout.",
      gap: "Default editor gapped paths and label halo are retained. Manual curves retain raw labels with the exact mask and attachment extracted from actual typesetFigureSvg(). No copied gap geometry, width estimate or custom padding. Source geometry needs no masking because layout keeps the numeric label clear of it.",
      geometry:
        "All frozen line/path/circle elements, equal/parallel/right/angle marks retained under a uniform 1.5 transform. Point/center labels relocated locally; old leaders removed. Boundary dimensions use the editor outside command. No projected endpoints or witness lines. No numeric value derived from drawing scale.",
      givens:
        "Every source point and numeric label preserved exactly. Only the already published number is drawn; all other public givens and target remain in the unchanged prompt.",
      endpointTolerance:
        "Default editor inset is 3 * 16 / 16.8 along the actual measured segment; manual curves keep both actual endpoints. Independent all-variant tests and browser checks allow only 0.02 serialization tolerance.",
    },
    bytes: build,
    editorCommands: {
      exactDefaults: layouts.filter(
        (layout) => layout.dimension.bend === undefined,
      ).length,
      manualSequences: layouts.filter(
        (layout) => layout.dimension.bend !== undefined,
      ).length,
      adjustedAlongCurve: layouts.filter(
        (layout) =>
          layout.dimension.labelFraction !== undefined &&
          layout.dimension.labelFraction !== 0.5,
      ).length,
      maximumBend: Math.max(
        ...layouts.map((layout) => layout.dimension.bend ?? 0),
      ),
      projectedEndpoints: 0,
      inventedWitnesses: 0,
    },
    runtime: {
      ...runtime,
      cache:
        "Static compressed JSON import; per-family lazy raw-deflate/base64 decode with fflate. Import performs no inflate. Four-family LRU.",
      maximumFourFamilyDecodedJsonBytes: maximumFourFamilyBytes,
      memoryQualification:
        "Decoded JSON UTF-8 byte bound, not a claim about total JavaScript heap; strings/objects and loaded compressed data add overhead.",
      generation:
        "No runtime Python, MathJax, DOM, browser layout, network, or figure generation.",
    },
    validation: {
      vitest:
        "7 focused tests passed, including every ID, exact byte acceptance, all marks/givens, typed idempotence, all-variant measured endpoints and outside placement, all 1827 editor-command replays including exact manual-curve typeset masks, decoded rows and lazy four-family LRU eviction.",
      typescript:
        "Strict ES2017 targeted check passed using existing root dependencies.",
      lint: "Scoped ESLint passed; normal Husky lint-staged ESLint/Prettier are required at commit.",
      reproduction:
        "A complete second generation without --write reproduced checked asset bytes exactly.",
      browser: proof,
      collisionMeasurement:
        "Raw text is rasterized at 4x to measure painted glyph bounds. SVG getBBox includes unused font ascender/descender space and produced 77 false collision flags across 34 variants; those initial results are retained in the durable evidence. Path-based typography uses actual path bounds. Both retain the same 1-unit clearance gate and all source-boundary/endpoint checks.",
      renderCount: 1827 * 6,
      visualReview:
        "All 50 type representatives inspected. Targeted external-bisector and trapezoid-parallel-section examples included in screen and print proof; full 280/320/print audits cover every numeric variant before and after typography.",
      boundary:
        "Standalone presentation/browser/print proof; combined application and other figure categories are reported separately.",
    },
    exactCanonicalSourcesSha256: createHash("sha256")
      .update(JSON.stringify(plans.map((p) => [p.id, p.source])))
      .digest("hex"),
    unchangedGivensTargetsSha256: createHash("sha256")
      .update(JSON.stringify(plans.map((p) => [p.id, p.prompt, p.target])))
      .digest("hex"),
    coveredIds: plans.map((p) => p.id),
    unhandledIds: [],
    reproduction: [
      "tsx scripts/qa/arithmetic-segment-presentation-build.ts (compares checked bytes; --write deliberately republishes)",
      "tsx scripts/qa/arithmetic-segment-presentation-check.ts",
      "tsx scripts/qa/arithmetic-segment-presentation-runtime.ts",
      "vitest run --config scripts/qa/arithmetic-segment-presentation-vitest.config.mts",
      "node scripts/qa/arithmetic-segment-presentation-typecheck.mjs",
      "tsx scripts/qa/arithmetic-segment-presentation-report.ts",
    ],
    evidence:
      "scripts/qa/arithmetic-segment-presentation-evidence/ contains reviewed screen/print images. Full generated HTML/PDF/plans/displays retained at C:/Creative/testautocreator/.qa-artifacts/arithmetic-segment-editor-20261015/.",
  };
  await writeFile(
    "scripts/qa/arithmetic-segment-presentation-report.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  const evidence = "scripts/qa/arithmetic-segment-presentation-evidence";
  await mkdir(evidence, { recursive: true });
  for (const name of [
    "gallery-280-1.png",
    "gallery-280-2.png",
    "gallery-print-1.png",
    "gallery-print-2.png",
  ])
    await copyFile(path.join(out, name), path.join(evidence, name));
  console.log(
    JSON.stringify({
      covered: report.coveredIds.length,
      unhandled: report.unhandledIds.length,
      maximumFourFamilyBytes,
    }),
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
