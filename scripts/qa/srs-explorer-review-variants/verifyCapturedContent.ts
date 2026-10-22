/** Read captured JSON only: no server/browser. Keep capture timing separate from this check. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createExplorerState,
  explorerView,
} from "../../../src/lib/math-explorers/engine";
import type {
  ExplorerState,
  ExplorerReviewVariant,
} from "../../../src/contracts/mathExplorers.contract";
const input = process.argv[2];
assert.ok(input, "Pass the original visual-results.json");
const captured = JSON.parse(readFileSync(input, "utf8")) as {
  rows: {
    name: string;
    view: ExplorerState;
    identity?: ExplorerReviewVariant;
  }[];
};
for (const row of captured.rows) {
  const publicSession = row.view.session!;
  const activity = row.view.currentActivity!;
  const stored = createExplorerState(row.view.student.id, 5);
  stored.profile.definitions = {
    runs: 1,
    history: [],
    cards: {},
    session: {
      ...publicSession,
      unit: publicSession.unitId,
      date: "2026-10-22",
      queue: publicSession.cardIds.flatMap((cardId) =>
        ([0, 1, 2] as const).map((kind) => ({ cardId, kind })),
      ),
      next: [],
      seen: [],
      hinted: [],
      passed: [],
      initialWrong: [],
      eligible: [],
      unresolved: [],
      ...(row.identity ? { reviewVariant: row.identity } : {}),
      ...(activity.followUp
        ? {
            followUp: { questionId: activity.questionId, ...activity.followUp },
          }
        : {}),
    },
  };
  assert.equal(
    JSON.stringify(
      explorerView(stored, "2026-10-22", { followUp: true }).currentActivity,
    ),
    JSON.stringify(activity),
    row.name,
  );
}
console.log(
  JSON.stringify(
    {
      capturedActivities: captured.rows.length,
      exactPublicActivityByteMatches: captured.rows.length,
      captureTime: "original run; not regenerated",
      browser: "not started",
      network: "none",
    },
    null,
    2,
  ),
);
