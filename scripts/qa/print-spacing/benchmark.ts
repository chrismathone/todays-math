import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { packMeasured } from "../../../src/components/unified/print/pack";
import { DEFAULT_PRINT_OPTIONS } from "../../../src/components/unified/print/types";
const results = [25, 200, 2000].map((count) => {
  const heights = Array.from(
    { length: count },
    (_, i) => 45 + ((i * 137) % 330),
  );
  const options = {
    ...DEFAULT_PRINT_OPTIONS,
    columns: 2 as const,
    smartSpacing: true,
  };
  const avail = { first: 800, cont: 950 };
  const runs = Array.from({ length: 11 }, () => {
    const start = performance.now();
    const pages = packMeasured(heights, avail, options);
    return { ms: performance.now() - start, pages: pages.length };
  });
  const times = runs
    .slice(1)
    .map((r) => r.ms)
    .sort((a, b) => a - b);
  return { count, pages: runs[0].pages, medianMs: times[5], maxMs: times[9] };
});
writeFileSync(
  "docs/planning/tracks/reports/print-spacing-20261020/benchmark.json",
  JSON.stringify(results, null, 2),
);
console.log(results);
