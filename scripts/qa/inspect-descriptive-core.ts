/** Local-only reproducible evidence. No env loader, DB, registry or bank writes. */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createNativeAuthoredTask } from "../../src/lib/engine/descriptiveAuthor/compose";
import { createNativeHelperAdapters } from "../../src/lib/engine/descriptiveAuthor/adapters";
import {
  rectangleAuthor,
  rectangleGateSuite,
} from "../../src/lib/engine/descriptiveAuthor/rectangleDemo";
import { checkNativeGates } from "../../src/lib/engine/nativeDescriptiveGates";
import {
  renderFigureSpec,
  type RenderFigureResult,
} from "../../src/lib/figure/renderFigureSpec";

async function main() {
  const out = path.resolve(
    process.argv[2] ?? "docs/planning/tracks/reports/descriptive-core-20261020",
  );
  // The diagram is invariant across numerical samples. Each distinct spec still gets a real render.
  const rendered = new Map<string, RenderFigureResult>();
  const adapters = createNativeHelperAdapters(async (spec) => {
    const key = JSON.stringify(spec);
    if (!rendered.has(key))
      rendered.set(key, await renderFigureSpec(spec, { strict: true }));
    return structuredClone(rendered.get(key)!);
  });
  const task = await createNativeAuthoredTask(
    rectangleAuthor,
    20261020,
    0,
    adapters,
  );
  const suite = await rectangleGateSuite(adapters);
  const gates = checkNativeGates(suite);
  await mkdir(out, { recursive: true });
  await writeFile(
    path.join(out, "demo.json"),
    JSON.stringify(task, null, 2) + "\n",
  );
  await writeFile(path.join(out, "diagram.svg"), task.figureSvg!);
  await writeFile(
    path.join(out, "gates.json"),
    JSON.stringify(
      {
        author: task.authorId,
        samples: suite.samples,
        distinctRenderedSpecs: rendered.size,
        ...gates,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      passed: gates.passed,
      samples: gates.samplesChecked,
      coverage: gates.coverage.map((c) => ({
        dimension: c.dimension,
        declared: c.values.length,
        missing: c.missing.length,
      })),
      mutations: gates.mutations.map((m) => ({
        kind: m.kind,
        detected: m.detected,
      })),
      distinctRenderedSpecs: rendered.size,
    }),
  );
  if (!gates.passed) process.exitCode = 1;
}
main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
