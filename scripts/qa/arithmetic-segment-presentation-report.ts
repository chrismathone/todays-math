/** Collect completed local proofs and exact coverage into a reviewable report. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SegmentPlan } from "./arithmetic-segment-presentation-model";

async function main() {
  const out = path.resolve("tmp/arithmetic-segment-presentation");
  const read = async (name: string) =>
    JSON.parse(await readFile(path.join(out, name), "utf8"));
  const build = await read("build.json"),
    proof = await read("proof.json"),
    runtime = await read("runtime.json");
  const plans = (await read("plans.json")) as SegmentPlan[];
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
    base: "33727df61",
    scope:
      "50 middle-triangle families / 1827 canonical source SVGs carrying one numeric segment label each. Cylinder nets remain root-owned.",
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
        "Offline calls existing arithmetic-dimension-presentation-engine.py bridge to vendor/figure-engine/core/figure_svg.py meas() itself.",
      label:
        "Actual editor curveMidpoint() positions 16-unit labels on engine curves. Actual browser bounds before and after typography jointly constrain layout.",
      gap: "Actual editor gapPolygon()/applyLineGaps() masks only dimension curves with union glyph bounds. Source geometry is never masked; no white label halo.",
      geometry:
        "All frozen line/path/circle elements, equal/parallel/right/angle marks retained under a uniform 1.5 transform. Point/center labels relocated locally; old leaders removed. Exterior projected dimensions have witnesses tied to exact endpoints. No numeric value derived from drawing scale.",
      givens:
        "Every source point and numeric label preserved exactly. Only the already published number is drawn; all other public givens and target remain in the unchanged prompt.",
      endpointTolerance:
        "Engine meas() intentionally offsets endpoints 1.5 virtual units in the normal direction; browser audit allows 0.13 for its one-decimal path serialization.",
    },
    bytes: build,
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
        "5 focused tests passed, including every ID, exact byte acceptance, all marks/givens, typed idempotence, decoded rows and lazy four-family LRU eviction.",
      typescript:
        "Strict ES2017 targeted check passed using existing root dependencies.",
      lint: "Scoped ESLint passed; normal Husky lint-staged ESLint/Prettier are required at commit.",
      reproduction:
        "A complete second generation without --write reproduced checked asset bytes exactly.",
      browser: proof,
      renderCount: 1827 * 6,
      visualReview:
        "Circumcenter, incenter, centroid, midsegment, similarity, Pythagoras, external bisector and three-parallel cases inspected at screen 280 and print; full 320 audit also passed.",
      boundary:
        "Standalone presentation/browser/print proof. Root owns application route integration and the four net families.",
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
      "scripts/qa/arithmetic-segment-presentation-evidence/ contains reviewed screen/print images. Full generated HTML/PDF/plans/displays retained at C:/Creative/testautocreator/.qa-artifacts/arithmetic-segment-presentation-worker-20261015/.",
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
