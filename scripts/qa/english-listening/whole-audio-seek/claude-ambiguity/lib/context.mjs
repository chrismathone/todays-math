/**
 * The frozen world this task stands on, read once and hash-checked:
 * the inventory, the completed independent replay (its admitted and preserved
 * starts are the baseline that must not change), the held population, the
 * producers' ledgers and the native clock proof.
 */
import { join } from "node:path";
import { FROZEN, PATHS, readFrozen } from "./store.mjs";

export function loadContext() {
  const inventory = readFrozen("inventory");
  const certificate = readFrozen("certificate");
  const heldDiagnostics = readFrozen("heldDiagnostics");
  const marks = readFrozen("claudeMarks");
  const clock = readFrozen("clock");
  const frozenInputs = readFrozen("frozenInputs");
  const live = readFrozen("liveSnapshot");

  /** Every start the completed replay admitted or preserved. Never re-decided here. */
  const baselineByQuestion = new Map();
  for (const row of certificate.records)
    if (row.status === "admitted" || row.status === "preserved")
      baselineByQuestion.set(row.questionId, {
        startMs: row.audioRange.startMs,
        endMs: row.audioRange.endMs,
        provenance:
          row.status === "admitted"
            ? "certificate_admitted"
            : "certificate_preserved",
        sourceRecordId: row.sourceRecordId,
        sourceNumber: row.sourceNumber,
        scopeQuestionNumbers: row.scopeQuestionNumbers ?? [row.sourceNumber],
      });

  return {
    inventory,
    certificate,
    held: heldDiagnostics.records,
    marksByQuestion: new Map(marks.records.map((r) => [r.questionId, r])),
    baselineByQuestion,
    clockBySource: new Map(clock.records.map((r) => [r.sourceRecordId, r])),
    frozenFilesBySource: new Map(
      frozenInputs.records.map((r) => [r.sourceRecordId, r.files]),
    ),
    liveBySet: new Map(live.snapshots.map((r) => [r.id, r])),
    nativeDir: PATHS.claudeOut,
    probeRoots: [PATHS.claudeOut, PATHS.heldOut],
    frozen: FROZEN,
    paths: PATHS,
    heldOut: PATHS.heldOut,
    join,
  };
}
