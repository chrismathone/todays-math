/** Runs only in memory. Compare the unmarked reader against the delivered baseline. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";
import { EXPLORER_REVIEW_VARIANT_CARD_IDS as ids } from "../../../src/contracts/mathExplorers.contract";
import * as current from "../../../src/lib/math-explorers/engine";
const baseline = "18c0a280e";
function loadAt(file: string) {
  const source = execFileSync("git", ["show", `${baseline}:${file}`], {
    encoding: "utf8",
  });
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const loadedModule = { exports: {} };
  new Function("require", "exports", "module", outputText)(
    createRequire(path.resolve(file)),
    loadedModule.exports,
    loadedModule,
  );
  return loadedModule.exports;
}
const old = loadAt("src/lib/math-explorers/engine.ts") as typeof current;
const oldContract = loadAt(
  "src/contracts/mathExplorers.contract.ts",
) as typeof import("../../../src/contracts/mathExplorers.contract");
const date = "2026-10-22";
let comparisons = 0;
for (const id of ids)
  for (const kind of [0, 1, 2]) {
    const state = old.applyExplorerAction(
      old.createExplorerState("static-compare", 5),
      { type: "start", route: "unit", unitId: "g5-estimate" },
      date,
      crypto.randomUUID(),
    ).state;
    const session = state.profile.definitions!.session!;
    session.seen = [...ids];
    session.index = session.queue.findIndex(
      (task) => task.cardId === id && task.kind === kind,
    );
    assert.equal(
      JSON.stringify(current.explorerView(state, date, { followUp: true })),
      JSON.stringify(old.explorerView(state, date, { followUp: true })),
    );
    const action = {
      type: "answer" as const,
      questionId: old.explorerView(state, date).currentActivity!.questionId,
      choiceIds: [],
    };
    const requestId = crypto.randomUUID();
    const actual = current.applyExplorerAction(state, action, date, requestId, {
      followUps: true,
    });
    const expected = old.applyExplorerAction(state, action, date, requestId, {
      followUps: true,
    });
    assert.equal(JSON.stringify(actual), JSON.stringify(expected));
    assert.equal(
      JSON.stringify(
        current.explorerView(actual.state, date, { followUp: true }),
      ),
      JSON.stringify(
        old.explorerView(expected.state, date, { followUp: true }),
      ),
    );
    comparisons += 3;
    const marked = structuredClone(state);
    marked.profile.definitions!.session!.reviewVariant = {
      version: 1,
      seed: 2,
      cardIds: [...ids],
    };
    assert.equal(
      oldContract.storedExplorerSchema.safeParse(marked).success,
      false,
    );
  }
console.log(
  JSON.stringify(
    {
      baseline,
      unmarkedByteComparisons: comparisons,
      oldReaderRejectsMarked: true,
      network: "none",
      database: "none",
    },
    null,
    2,
  ),
);
