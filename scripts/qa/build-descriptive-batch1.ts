/** Offline engine → independent gates → 50 frozen print specimens and blinded packets.
 * No model, registration, database, or remote figure service is used here.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { batch1Authors } from "../../src/lib/engine/descriptiveAuthor/batch1";
import { createNativeHelperAdapters } from "../../src/lib/engine/descriptiveAuthor/adapters";
import { createNativeAuthoredTask } from "../../src/lib/engine/descriptiveAuthor/compose";
import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";
import {
  checkNativeGates,
  verifyNativePrinted,
} from "../../src/lib/engine/nativeDescriptiveGates";
import type { NativeDescriptiveProblemR2 } from "../../src/contracts/nativeDescriptive.contract";
import type { NativeAuthorDefinition } from "../../src/contracts/descriptiveAuthor.contract";

const out = path.resolve(
  process.env.DESCRIPTIVE_BATCH1_OUT ??
    "/Volumes/새 볼륨/today-worktrees/desc-batch1-out",
);
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const reviewInputs =
  process.env.DESCRIPTIVE_BATCH1_REVIEW_INPUT ??
  path.join(out, "review", "inputs");

async function main() {
  process.env.STUDIO_ENGINE_URL = "";
  process.env.VERCEL = "";
  await mkdir(reviewInputs, { recursive: true });
  await mkdir(path.join(out, "engine"), { recursive: true });
  const renders = new Map<string, ReturnType<typeof renderFigureSpec>>();
  const adapters = createNativeHelperAdapters((spec) => {
    const key = JSON.stringify(spec);
    if (!renders.has(key))
      renders.set(key, renderFigureSpec(spec, { strict: true }));
    return renders.get(key)!;
  });
  const definitions: {
    candidateId: string;
    definition: NativeAuthorDefinition;
    specimens: {
      problem: NativeDescriptiveProblemR2;
      figureKey: string | null;
    }[];
  }[] = [];
  const figures: Record<string, string> = {};
  const reports = [];
  const allTasks = [];
  for (const entry of batch1Authors) {
    console.log(`${entry.candidateId}: 검산 표본 생성`);
    const suite = await entry.gateSuite(adapters);
    const gateResult = checkNativeGates(suite);
    await writeFile(
      path.join(out, "engine", `${entry.candidateId}-gates.json`),
      json(gateResult),
    );
    assert.equal(
      gateResult.passed,
      true,
      `${entry.candidateId}: ${json(gateResult.gates)}`,
    );
    const printedCombinations = new Set<string>();
    const numericCombinations = new Set<string>();
    for (const sample of suite.samples) {
      const problem = suite.generate(sample.seed, sample.variant);
      printedCombinations.add(
        JSON.stringify([problem.content, problem.figureSpec]),
      );
      if (problem.revision === 2)
        numericCombinations.add(
          JSON.stringify(problem.facts.filter((f) => f.kind === "given")),
        );
    }
    const specimens = [];
    const blinded = [];
    const rubrics = [];
    for (let index = 0; index < 5; index++) {
      const task = await createNativeAuthoredTask(
        entry.author,
        20261020 + index,
        // Include all three C09 shapes in the five printed/reviewed specimens.
        entry.candidateId === "C09" && index === 1
          ? 0
          : entry.variants[index % entry.variants.length]!,
        adapters,
      );
      const checked = verifyNativePrinted(task.problem, suite.verify);
      assert.deepEqual(checked.issues, [], `${entry.candidateId}-${index + 1}`);
      const figureKey = task.figureSvg
        ? hash(task.figureSvg).slice(0, 20)
        : null;
      if (figureKey) figures[figureKey] = task.figureSvg!;
      const reviewId = `${entry.candidateId}-${index + 1}`;
      specimens.push({ problem: task.problem, figureKey });
      allTasks.push({ reviewId, ...task, verification: checked.result });
      // This packet cannot contain generator answers, facts, rubric or helper outputs.
      blinded.push({
        id: reviewId,
        content: task.problem.content,
        figureSpec: task.problem.figureSpec,
        figureImage: figureKey ? `${reviewId}-figure.png` : null,
      });
      rubrics.push({
        id: reviewId,
        content: task.problem.content,
        rubric: task.problem.rubric,
      });
    }
    definitions.push({
      candidateId: entry.candidateId,
      definition: structuredClone(entry.author.definition),
      specimens,
    });
    await writeFile(
      path.join(reviewInputs, `${entry.candidateId}-solve.json`),
      json(blinded),
    );
    await writeFile(
      path.join(reviewInputs, `${entry.candidateId}-rubric.json`),
      json(rubrics),
    );
    reports.push({
      candidateId: entry.candidateId,
      definitionId: entry.author.definition.definitionId,
      seeds: new Set(suite.samples.map((s) => s.seed)).size,
      samples: suite.samples.length,
      numericCombinations: numericCombinations.size,
      printedCombinations: printedCombinations.size,
      coverage: gateResult.coverage.map((c) => ({
        dimension: c.dimension,
        declared: c.values.length,
        observed: c.observed.length,
      })),
      gates: gateResult.gates,
      mutations: gateResult.mutations,
    });
    console.log(
      `${entry.candidateId}: ${suite.samples.length}표본 / 수치 ${numericCombinations.size} / 발문·그림 ${printedCombinations.size}조합 / G1~G6 통과`,
    );
  }
  assert.equal(definitions.length, 10);
  assert.equal(allTasks.length, 50);
  const fixture = json({ definitions, figures });
  await writeFile("src/app/dev/descriptive-paper/batch1Fixtures.json", fixture);
  await writeFile(path.join(out, "engine", "tasks.json"), json(allTasks));
  await writeFile(
    path.join(out, "engine", "summary.json"),
    json({
      fixtureSha256: hash(fixture),
      definitions: reports,
      specimenCount: allTasks.length,
      renderedFigureSpecs: renders.size,
    }),
  );
}

void main();
