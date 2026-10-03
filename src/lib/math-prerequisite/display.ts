import type {
  PrerequisiteContext,
  PrerequisiteTeacherEvidence,
} from "@/contracts/mathPrerequisite.contract";
import type { StoredCourse } from "@/lib/math-srs/courseAutomation";
import { GRAPH_CONTENT_HASH } from "./graph";
import { mathPrerequisiteEnabled } from "./enabled";
import { completedSessions, pilotEvidence } from "./evidence";
import { isPilotCheck, isPilotTarget, pilotTargetForCourse } from "./mapping";
import {
  heldCheckSections,
  PREREQUISITE_REASONS,
  type PrerequisiteDecision,
} from "./policy";
import { prerequisiteVersions } from "./versions";

const displayVersions = () => prerequisiteVersions(GRAPH_CONTENT_HASH);

export function contextForDecision(
  decision: PrerequisiteDecision | null,
): PrerequisiteContext | undefined {
  return decision
    ? {
        kind: decision.kind === "fallback" ? "unavailable" : decision.kind,
        targetSectionId: decision.targetSectionId,
        sectionId: decision.canStart ? decision.sectionId : null,
        reason: decision.reason,
        canStart: decision.canStart,
        partial: true,
        versions: displayVersions(),
      }
    : undefined;
}

/** Current practice context comes from retained facts, without a saved phase. */
export function coursePrerequisiteContext(
  course: StoredCourse,
  now: Date,
  decision: PrerequisiteDecision | null,
): PrerequisiteContext | undefined {
  if (!mathPrerequisiteEnabled() || !course.plan?.enabled) return undefined;
  const current = course.learner.session;
  const configuredAt = Date.parse(course.plan.configuredAt);
  const currentPlan =
    current &&
    Date.parse(current.startedAt) >= configuredAt &&
    Date.parse(current.startedAt) <= now.getTime();
  const active =
    current &&
    (!current.completedAt || (current.retry && !current.retry.completedAt));
  const target = pilotTargetForCourse(course);
  if (
    currentPlan &&
    active &&
    current.mode === "review" &&
    isPilotCheck(current.sectionId) &&
    target
  ) {
    return {
      kind: "check",
      targetSectionId: target,
      sectionId: current.sectionId,
      reason: PREREQUISITE_REASONS.check,
      canStart: true,
      partial: true,
      versions: displayVersions(),
    };
  }
  if (
    currentPlan &&
    active &&
    current.mode === "learn" &&
    isPilotTarget(current.sectionId)
  ) {
    const prior = completedSessions(course)
      .filter(
        (session) =>
          session.id !== current.id &&
          session.completedAt! <= current.startedAt,
      )
      .at(-1);
    if (
      prior?.mode === "review" &&
      isPilotCheck(prior.sectionId) &&
      Date.parse(prior.startedAt) >= configuredAt
    ) {
      return {
        kind: "return",
        targetSectionId: current.sectionId,
        sectionId: current.sectionId,
        reason: PREREQUISITE_REASONS.return,
        canStart: true,
        partial: true,
        versions: displayVersions(),
      };
    }
  }
  const next = contextForDecision(decision);
  if (next) return next;
  if (
    currentPlan &&
    !active &&
    current.mode === "review" &&
    isPilotCheck(current.sectionId) &&
    target
  ) {
    return {
      kind: "return",
      targetSectionId: target,
      sectionId: target,
      reason:
        "분수의 뺄셈 확인 범위를 본 뒤, 다음 학습 때 분수의 곱셈으로 돌아가요.",
      canStart: false,
      partial: true,
      versions: displayVersions(),
    };
  }
  return undefined;
}

export function teacherPrerequisiteEvidence(
  course: StoredCourse,
  now: Date,
  decision: PrerequisiteDecision | null,
): PrerequisiteTeacherEvidence {
  const held = heldCheckSections(course, now, mathPrerequisiteEnabled());
  return {
    source: "completed_elementary_course",
    configuredAt: course.plan?.configuredAt ?? null,
    versions: displayVersions(),
    sections: pilotEvidence(course, now),
    heldSectionIds: held.sectionIds,
    holdReason: held.reason,
    context: coursePrerequisiteContext(course, now, decision) ?? null,
  };
}
