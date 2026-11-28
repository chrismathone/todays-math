/** Raw production decoder only; browser benchmark separately includes actual
 * typography/image decoding. Each workload runs in its own fresh Node process. */
import "../init-arithmetic-packs";
import { performance } from "node:perf_hooks";
import { readFileSync, writeFileSync } from "node:fs";
import type { ArithmeticV2Prompt } from "../../../src/lib/arithmetic-v2/types";
async function main() {
  const workload =
    process.argv.find((a) => a.startsWith("--workload="))?.split("=")[1] ??
    "inline";
  if (
    !["inline", "registered-mixed", "registered-grouped", "all-mixed"].includes(
      workload,
    )
  )
    throw Error("unknown workload");
  const cases = JSON.parse(
    readFileSync(
      `scripts/qa/arithmetic-figure-quality/benchmark-${workload}-runtime.json`,
      "utf8",
    ),
  ) as { type: string; prompt: ArithmeticV2Prompt; canonical?: string }[];
  const gc = () => {
    (globalThis as typeof globalThis & { gc?: () => void }).gc?.();
  };
  gc();
  const before = process.memoryUsage(),
    start = performance.now(),
    engine =
      await import("../../../src/lib/arithmetic-v2/presentation/engineFigures"),
    loaded = performance.now();
  gc();
  const initial = process.memoryUsage();
  let bytes = 0,
    peak = initial.heapUsed;
  const read = (c: (typeof cases)[number]) =>
    c.prompt.layout === "math" && c.prompt.figureId
      ? engine.arithmeticEngineFigureSvg(c.prompt.figureId, c.canonical)
      : engine.arithmeticEngineInlineSvg(c.type, c.prompt);
  const first = performance.now(),
    example = read(cases[0]);
  if (!example) throw Error("first missing");
  const firstMs = performance.now() - first,
    began = performance.now();
  for (const c of cases) {
    const svg = read(c);
    if (!svg) throw Error(c.type);
    bytes += svg.length;
    peak = Math.max(peak, process.memoryUsage().heapUsed);
  }
  const elapsed = performance.now() - began;
  gc();
  const result = {
    workload,
    families: new Set(cases.map((c) => c.type)).size,
    initialModuleMs: loaded - start,
    firstFigureMs: firstMs,
    initialHeapDelta: initial.heapUsed - before.heapUsed,
    worksheetItems: cases.length,
    worksheetMs: elapsed,
    svgCharsRead: bytes,
    peakHeapDelta: peak - before.heapUsed,
    retainedHeapDelta: process.memoryUsage().heapUsed - before.heapUsed,
    source:
      "Node24 raw production decoder; public inputs preloaded, --expose-gc, no typography/DOM/network/Next build; sampled JS heap only",
  };
  writeFileSync(
    `docs/planning/tracks/reports/arithmetic-figure-quality-20261112/decoder-performance-${workload}.json`,
    JSON.stringify(result, null, 2),
  );
  console.log(result);
}
main();
