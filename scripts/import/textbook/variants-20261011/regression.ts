/** Assert that an already reviewed generation tranche remains byte-identical. */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import ts from "typescript";
import {
  generateTextbookVariantPair,
  type TextbookVariantSource,
  type TextbookVariantResult,
} from "../../../../src/lib/import/schoolTextbook/variants";

const [commit, snapshotPath, reportPath] = process.argv.slice(2);
if (!commit || !snapshotPath || !reportPath || !/^[a-f0-9]{7,40}$/.test(commit))
  throw new Error(
    "Usage: regression.ts <previous-commit-sha> <snapshot.json> <report.json>",
  );
const previousCode = execFileSync(
  "git",
  ["show", `${commit}:src/lib/import/schoolTextbook/variants.ts`],
  { encoding: "utf8" },
);
const compiled = ts.transpileModule(previousCode, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
});
const priorModule = {
  exports: {} as {
    generateTextbookVariantPair(
      source: TextbookVariantSource,
    ): TextbookVariantResult;
  },
};
// Execute only this repository's specified, committed module. No user-authored math is evaluated as code.
new Function("exports", "require", "module", compiled.outputText)(
  priorModule.exports,
  createRequire(import.meta.url),
  priorModule,
);
const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8")) as {
  rows: { problem: TextbookVariantSource }[];
};
let previousMatched = 0,
  unchanged = 0;
const changes: { sourceId: string; reason: string }[] = [];
for (const { problem } of snapshot.rows) {
  const before = priorModule.exports.generateTextbookVariantPair(problem);
  if (before.status !== "matched") continue;
  previousMatched++;
  const after = generateTextbookVariantPair(problem);
  if (after.status !== "matched")
    changes.push({
      sourceId: problem.id,
      reason: `became-unresolved:${after.reason}`,
    });
  else if (
    JSON.stringify(before.candidates) !== JSON.stringify(after.candidates)
  )
    changes.push({ sourceId: problem.id, reason: "candidate-bytes-changed" });
  else unchanged++;
}
const report = {
  previousCommit: commit,
  previousMatchedOriginals: previousMatched,
  unchangedOriginalPairs: unchanged,
  changedOriginalPairs: changes.length,
  changes,
};
writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
if (changes.length) process.exitCode = 1;
