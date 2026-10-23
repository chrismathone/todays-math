import "server-only";
import { randomUUID } from "node:crypto";
import { readMathOntologyDatabaseSourcesInTransaction, assertMathOntologySourceSnapshotTransaction } from "../sources/server";
import { lockActiveOntologyReleaseInTransaction } from "../publish/store";
import { requireOperation } from "../actions/errors";
import type { OntologyObservationPort } from "./service";

/** Descriptive retained course first attempts only. Explorer/fading summaries
 * remain available in source evidence but are not invented as timed attempts. */
export const currentOntologyObservations: OntologyObservationPort = {
  async resolve(tx, actor, target, sourceSnapshotId, time, window) {
    requireOperation(window, "UNAVAILABLE");
    const active = await lockActiveOntologyReleaseInTransaction(tx, "global");
    const source = await readMathOntologyDatabaseSourcesInTransaction(tx, { actor, target, graphVersion: active.release.graphVersion, now: time, authorizationNow: window.authorizationClock ?? (() => time), observedAfter: window.committedAt });
    assertMathOntologySourceSnapshotTransaction(source, tx);
    requireOperation(source.studentRevision >= window.minimumRevision, "STALE");
    const attempts = source.learning.firstAttempts;
    const correct = attempts.filter(a => a.eligibleForPlanObservation && a.independentFirstAttempt && a.correct).length;
    const incorrect = attempts.filter(a => a.eligibleForPlanObservation && a.independentFirstAttempt && !a.correct).length;
    requireOperation(attempts.length <= 1000, "UNAVAILABLE");
    return { actorId: actor.id, target, sourceSnapshotId, graphVersion: source.graphVersion, studentRevision: source.studentRevision, windowStart: window.committedAt, windowEnd: time.toISOString(), counts: { retainedFirstAttempts: attempts.length, independentCorrect: correct, independentIncorrect: incorrect, excluded: attempts.length - correct - incorrect }, sourceIds: attempts.map(a => a.id) };
  },
};
/** An opaque server value; a caller never chooses the observation window. */
export const newOntologyObservationId = () => `ontology:observation:${randomUUID()}`;
