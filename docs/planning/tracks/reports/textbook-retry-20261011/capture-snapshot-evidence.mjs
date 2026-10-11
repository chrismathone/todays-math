/** Read-only snapshot audit. Run with node --import tsx <this-file> <snapshot-json>. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const snapshotPath = process.argv[2];
if (!snapshotPath)
  throw new Error("Pass the read-only source-snapshot.json path");
const bytes = readFileSync(snapshotPath);
const snapshot = JSON.parse(bytes.toString("utf8"));
const { planRetry } = await import(
  pathToFileURL(join(process.cwd(), "src/lib/generator/planRetry.ts")).href
);
const candidate = (row) => ({
  id: row.id,
  unitId: row.unit_id,
  familyKey: row.family_key,
  difficulty: row.difficulty,
  directUseAllowed: row.direct_use_allowed,
  source: row.source,
  originProblemId: row.origin_problem_id,
  externalId: row.external_id,
  pool: row.pool,
  reviewStatus: row.review_status,
  answer: row.answer,
});
const wrong = snapshot.rows.map(({ problem }) => candidate(problem));
const children = snapshot.children.map(candidate);
const designated = children.filter((row) =>
  row.externalId?.startsWith("tb-retry-v1:"),
);
const oldChildren = children.filter(
  (row) => !row.externalId?.startsWith("tb-retry-v1:"),
);
const result = planRetry({
  wrong,
  pool: [...wrong, ...children],
  seed: "snapshot-20261011",
});
const originalWithOldChild = wrong.find((row) =>
  (designated.length ? designated : oldChildren).some(
    (child) => child.originProblemId === row.id,
  ),
);
const evidence = {
  scope: "Read-only supplied snapshot; not a live database or deployment check",
  capturedAt: snapshot.capturedAt,
  snapshotSha256: createHash("sha256").update(bytes).digest("hex"),
  originalCount: wrong.length,
  uniqueOriginalIds: new Set(wrong.map((row) => row.id)).size,
  uniqueOriginalFamilies: new Set(
    wrong.map((row) => `${row.unitId}|${row.familyKey}`),
  ).size,
  soloFamilyCount: wrong.filter((row) => row.familyKey?.startsWith("solo:"))
    .length,
  childCountTotal: children.length,
  oldChildCount: oldChildren.length,
  designatedSlotChildren: designated.length,
  designatedParents: new Set(designated.map((row) => row.originProblemId)).size,
  pendingDesignatedChildren: designated.filter(
    (row) => row.reviewStatus === "pending",
  ).length,
  lockedDesignatedChildren: designated.filter((row) => !row.directUseAllowed)
    .length,
  requestedCount: result.requestedCount,
  pickedCount: result.picked.length,
  shortfall: result.shortfall,
  foldedWrong: result.foldedWrong,
  originalsWithShortfall: result.textbookShortfalls.length,
  sample: {
    original: originalWithOldChild,
    oldChildren: oldChildren.filter(
      (row) => row.originProblemId === originalWithOldChild.id,
    ),
    designatedChildren: designated.filter(
      (row) => row.originProblemId === originalWithOldChild.id,
    ),
    plan: planRetry({
      wrong: [originalWithOldChild],
      pool: children,
      seed: "sample",
    }),
  },
};
const output = join(
  dirname(fileURLToPath(import.meta.url)),
  "snapshot-evidence.json",
);
writeFileSync(output, JSON.stringify(evidence, null, 2) + "\n");
console.log(
  JSON.stringify({
    originalCount: evidence.originalCount,
    oldChildCount: evidence.oldChildCount,
    designatedSlotChildren: evidence.designatedSlotChildren,
    requestedCount: evidence.requestedCount,
    pickedCount: evidence.pickedCount,
    shortfall: evidence.shortfall,
    output,
  }),
);
