import {
  mathInsightV2SnapshotSchema,
  type MathInsightV2Snapshot,
} from "@/contracts/mathInsightV2.contract";
import { getCourseSection } from "@/lib/math-srs/elementary/catalog";

/** Shared by projection, prompt, parser and composer. Membership is not relevance. */
export function validateInsightV2Snapshot(
  value: unknown,
): MathInsightV2Snapshot {
  const s = mathInsightV2SnapshotSchema.parse(value);
  const unique = (ids: string[]) => new Set(ids).size === ids.length;
  const sources = [...s.observations, ...s.pilot.evidence];
  const sourceIds = new Set(sources.map((e) => e.id));
  const candidateIds = new Set(s.pilot.nextChecks.map((c) => c.id));
  if (
    !unique(sources.map((e) => e.id)) ||
    !unique(s.facts.map((f) => f.id)) ||
    !unique(s.pilot.nextChecks.map((c) => c.id)) ||
    s.pilot.revision !== s.revision ||
    s.pilot.asOf !== s.asOf ||
    s.scope.windowEnd !== s.asOf ||
    JSON.stringify(s.context) !== JSON.stringify(s.pilot.context)
  )
    throw new Error("invalid-snapshot-identity");
  for (const fact of s.facts) {
    if (
      !unique(fact.evidenceIds) ||
      !unique(fact.candidateIds) ||
      fact.evidenceIds.some((id) => !sourceIds.has(id)) ||
      fact.candidateIds.some((id) => !candidateIds.has(id))
    )
      throw new Error("invalid-fact-reference");
  }
  for (const candidate of s.pilot.nextChecks) {
    if (
      !unique(candidate.evidenceIds) ||
      candidate.evidenceIds.some(
        (id) =>
          !s.pilot.evidence.some(
            (e) => e.id === id && (!candidate.eligible || e.included),
          ),
      )
    )
      throw new Error("invalid-candidate-reference");
    if (candidate.eligible && !candidate.evidenceIds.length)
      throw new Error("missing-candidate-reference");
  }
  for (const section of s.pilot.sections) {
    if (
      !unique(section.evidenceIds) ||
      section.evidenceIds.some(
        (id) =>
          !s.pilot.evidence.some(
            (e) =>
              e.id === id && e.included && e.sectionId === section.sectionId,
          ),
      )
    )
      throw new Error("invalid-pilot-reference");
  }
  for (const e of s.observations) {
    const section = getCourseSection(e.sectionId);
    if (
      e.grade !== (section?.grade ?? null) ||
      (e.included &&
        (!section ||
          e.source !== "retained-session" ||
          !e.completedAt ||
          !e.startedAt ||
          !s.planContext.storedPlan ||
          s.planContext.status === "future" ||
          Date.parse(e.startedAt) <
            Date.parse(s.planContext.storedPlan.configuredAt) ||
          Date.parse(e.startedAt) > Date.parse(s.asOf) ||
          Date.parse(e.completedAt) > Date.parse(s.asOf) ||
          Date.parse(e.completedAt) < Date.parse(s.scope.windowStart) ||
          e.exclusions.some(
            (x) =>
              ![
                "hint-self-check-give-up-or-repeated",
                "retry-not-first-attempt",
              ].includes(x),
          )))
    )
      throw new Error("invalid-observation-context");
    if (
      e.source === "summary-without-session" &&
      (e.sessionId !== null ||
        e.included ||
        e.independentCorrect ||
        e.independentIncorrect ||
        !e.exclusions.includes("source-missing"))
    )
      throw new Error("invalid-missing-source");
  }
  return s;
}
