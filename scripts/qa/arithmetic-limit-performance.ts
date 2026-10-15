import { writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { buildArithmeticSheet } from "../../src/lib/arithmetic/sheet";
import { defaultArithmeticConstraints } from "../../src/lib/arithmetic/catalog";
import { buildArithmeticV2Sheet } from "../../src/lib/arithmetic-v2/sheet";
import { arithmeticV2Definitions } from "../../src/lib/arithmetic-v2/registry";
import {
  regenerateArithmeticItems,
  regenerateArithmeticV2Items,
} from "../../src/lib/arithmeticRegeneration";
import { arithmeticV2PromptIdentity } from "../../src/contracts/arithmeticV2.contract";
import { parseStrictJson } from "../../src/lib/textbook/strictJson";
import {
  ARITHMETIC_SHEET_JSON_LIMITS,
  arithmeticSheetByteIssue,
} from "../../src/lib/arithmetic/byteBudget";
import { selectArithmeticRounds } from "../../src/lib/arithmetic/roundSelection";

const bytes = (v: unknown) => Buffer.byteLength(JSON.stringify(v));
const results: object[] = [];
const orders = Array.from({ length: 200 }, (_, i) => i + 1);
for (const scenario of [
  "v1-2000-fast",
  "v1-2000",
  "v2-2000",
  "v2-heterogeneous-2000",
  "v2-geometry-2000",
]) {
  global.gc?.();
  const startMemory = process.memoryUsage();
  const started = performance.now();
  const defs = arithmeticV2Definitions().filter(
    (d) =>
      d.domainSize >= 100 &&
      (scenario !== "v2-geometry-2000" ||
        (d.problemAt(0).prompt.layout === "math" &&
          "figureId" in d.problemAt(0).prompt)),
  );
  const allocations =
    scenario === "v2-2000"
      ? [{ typeId: "m2-polynomial-add", count: 200 }]
      : Array.from({ length: 20 }, (_, i) => ({
          typeId: defs[Math.floor((i * defs.length) / 20)].id,
          count: 10,
        }));
  const sheet = scenario.startsWith("v1-")
    ? buildArithmeticSheet({
        engineVersion: "arithmetic-engine-v1",
        catalogVersion: "arithmetic-catalog-v1",
        seed: '"'.repeat(128),
        rounds: Array.from({ length: 10 }, () => ({
          skills: [
            {
              skillId: "two-digit-vertical-add",
              count: 200,
              constraints: {
                ...defaultArithmeticConstraints("two-digit-vertical-add"),
                carryCount: scenario === "v1-2000-fast" ? 1 : 0,
              },
            },
          ],
        })),
      })
    : buildArithmeticV2Sheet({
        engineVersion: "arithmetic-engine-v2",
        catalogVersion: "arithmetic-catalog-v2",
        seed: '"'.repeat(128),
        rounds: Array.from({ length: 10 }, () => ({ allocations })),
      });
  const generationMs = performance.now() - started;
  const afterGeneration = process.memoryUsage();
  const regenerationStart = performance.now();
  const result =
    sheet.payloadVersion === 1
      ? regenerateArithmeticItems(sheet, { round: 1, orders }, "replace")
      : regenerateArithmeticV2Items(sheet, { round: 1, orders }, "replace");
  const regenerationMs = performance.now() - regenerationStart;
  const afterRegeneration = process.memoryUsage();
  const sets = result.sheet.rounds.map(
    (round) =>
      new Set(
        round.items.map((item) =>
          "spec" in item
            ? JSON.stringify([
                item.prompt.notation,
                item.prompt.operator,
                item.prompt.operands,
              ])
            : arithmeticV2PromptIdentity(item.prompt),
        ),
      ),
  );
  let maximumOverlap = 0;
  for (const [i, a] of sets.entries())
    for (const b of sets.slice(i + 1)) {
      const overlap = [...a].filter((key) => b.has(key)).length;
      assert(overlap <= 40);
      maximumOverlap = Math.max(maximumOverlap, overlap);
    }
  for (let i = 1; i < 10; i++)
    assert.equal(result.sheet.rounds[i], sheet.rounds[i]);
  assert.equal(arithmeticSheetByteIssue(result.sheet), null);
  const save = {
    kind: "arithmeticSheet",
    title: "가".repeat(200),
    payload: result.sheet,
    expectedRevision: Number.MAX_SAFE_INTEGER,
    visibility: "branch",
    sharedBranchId: "00000000-0000-0000-0000-000000000001",
  };
  parseStrictJson(JSON.stringify(save), ARITHMETIC_SHEET_JSON_LIMITS);
  results.push({
    scenario,
    generationMs: Math.round(generationMs),
    regenerationMs: Math.round(regenerationMs),
    changed: result.changedOrders.length,
    maximumOverlap,
    uniqueFigures:
      result.sheet.payloadVersion === 2 && result.sheet.figures?.version === 2
        ? result.sheet.figures.ids.length
        : 0,
    sheetBytes: bytes(result.sheet),
    saveWrapperBytes: bytes(save),
    generateResponseBytes: bytes({ data: sheet }),
    regenerateResponseBytes: bytes({ data: result }),
    memory: { start: startMemory, afterGeneration, afterRegeneration },
    processMaxRssKiB: process.resourceUsage().maxRSS,
  });
  console.log(JSON.stringify(results.at(-1)));
}
for (const size of [1000, 800, 600]) {
  const started = performance.now();
  let feasible = false;
  try {
    selectArithmeticRounds(
      Array.from({ length: 10 }, () => [{ domain: "domain", count: 200 }]),
      [
        {
          id: "domain",
          *candidates() {
            for (let i = 0; i < size; i++) yield { key: String(i), value: i };
          },
        },
      ],
      "fallback",
    );
    feasible = true;
  } catch (error) {
    assert.equal((error as { reason: string }).reason, "between-rounds");
  }
  results.push({
    scenario: `exact-fallback-domain-${size}`,
    feasible,
    milliseconds: Math.round(performance.now() - started),
    memory: process.memoryUsage(),
    processMaxRssKiB: process.resourceUsage().maxRSS,
  });
}
writeFileSync(
  "scripts/qa/arithmetic-limit-performance-evidence.json",
  JSON.stringify(
    { recorded: "2026-10-15", node: process.version, results },
    null,
    2,
  ) + "\n",
);
