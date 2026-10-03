import type { ExpeditionPlan } from "@/contracts/mathExpedition.contract";
import type { BankCourseCandidate } from "@/lib/math-srs/courseBank";
import {
  courseSummary,
  emptyCourseState,
  startRecommendedCourse,
} from "@/lib/math-srs/courseAutomation";
import {
  currentSrsMission,
  SrsConflict,
  startSrsMission,
  type StoredSrsState,
} from "@/lib/math-srs/serverState";
import { kstDateOf } from "@/lib/kstDate";
import { prerequisiteRecommendation } from "@/lib/math-prerequisite/courseIntegration";
import { PREREQUISITE_REASONS } from "@/lib/math-prerequisite/policy";
import {
  bankSectionsForExplorerUnit,
  explorerUnitForSection,
} from "./curriculumBridge";
import { applyExplorerAction } from "./engine";
import {
  bindExpedition,
  expeditionDto,
  expeditionInitialPrerequisiteDecision,
  initialOwnedExplorer,
  planExpedition,
  updateExpedition,
} from "./expedition";

export function expeditionInitialCourseRecommendation(
  state: StoredSrsState,
  plan: ExpeditionPlan,
  now: Date,
) {
  const course = state.course ?? emptyCourseState();
  const standard = courseSummary(course, now).recommendation;
  if (standard?.mode === "resume") return standard;
  const prerequisite = expeditionInitialPrerequisiteDecision(state, plan, now);
  if (prerequisite) return prerequisiteRecommendation(prerequisite);
  if (standard && explorerUnitForSection(standard.sectionId) === plan.unitId)
    return standard;
  const session = course.learner.session;
  const sectionId =
    session && explorerUnitForSection(session.sectionId) === plan.unitId
      ? session.sectionId
      : bankSectionsForExplorerUnit(plan.unitId)[0];
  if (!sectionId)
    throw new SrsConflict("연결된 문제은행 단원을 확인해 주세요.");
  return {
    sectionId,
    mode: "review" as const,
    reason: "선택한 단원의 문제를 이어 풀어요.",
  };
}

export { expeditionInitialPrerequisiteDecision } from "./expedition";

/** Source creation and frozen assignment are committed together by the route's CAS. */
export function startExpedition(
  state: StoredSrsState,
  studentId: string,
  now: Date,
  requestId: string,
  seed: number,
  newId: () => string,
  bank: {
    sectionId: string;
    candidates: readonly BankCourseCandidate[];
  } | null = null,
): StoredSrsState {
  const plan = planExpedition(state, studentId, now);
  if (
    state.expedition?.mission &&
    state.expedition.mission.status !== "complete"
  )
    return bindExpedition(
      state,
      state,
      plan,
      now,
      state.expedition.mission.id,
      requestId,
    );
  const summary = expeditionDto(state, studentId, now);
  if (!summary.canStart)
    throw new SrsConflict(
      summary.prerequisiteContext?.kind === "unavailable"
        ? summary.prerequisiteContext.reason
        : "오늘의 탐험을 모두 마쳤어요. 지난 칸을 다시 풀어 볼 수 있어요.",
    );
  let source: StoredSrsState = {
    ...state,
    explorers: initialOwnedExplorer(state, studentId, now),
  };
  if (plan.kind === "middle") {
    source = startSrsMission(source, studentId, now, seed, newId);
    const session = currentSrsMission(source, now)!;
    if (
      session.completedAt &&
      session.attempts.every(
        (a) =>
          a.correct || session.resolvedRetryProblemIds?.includes(a.problemId),
      )
    )
      throw new SrsConflict("오늘의 문제은행 학습을 이미 마쳤어요.");
  } else if (plan.kind === "elementary") {
    const course = source.course ?? emptyCourseState();
    const recommendation = expeditionInitialCourseRecommendation(
      source,
      plan,
      now,
    );
    // Candidates were loaded before the CAS read; use them only for that section.
    const candidates =
      bank && recommendation?.sectionId === bank.sectionId
        ? bank.candidates
        : [];
    if (!recommendation)
      throw new SrsConflict(PREREQUISITE_REASONS.unavailable);
    const supplied =
      expeditionInitialPrerequisiteDecision(source, plan, now)?.session ??
      undefined;
    source = {
      ...source,
      course: startRecommendedCourse(
        course,
        recommendation,
        now,
        seed,
        newId,
        supplied ? [] : candidates,
        supplied,
      ),
    };
  } else {
    let explorer = source.explorers!;
    const session = explorer.profile.definitions?.session;
    // Historical replay is not an unfinished assignment and cannot become one.
    if (session?.reviewOnly) {
      explorer = structuredClone(explorer);
      delete explorer.profile.definitions!.session;
    }
    if (
      !session ||
      session.reviewOnly ||
      (session.done && !session.unresolved.length)
    ) {
      const result = applyExplorerAction(
        explorer,
        {
          type: "start",
          route: plan.route === "bank" ? "unit" : plan.route,
          unitId: plan.unitId,
        },
        kstDateOf(now),
        requestId,
      );
      // The outer expedition receipt owns this request ID and fingerprint.
      explorer = {
        ...result.state,
        receipts: result.state.receipts.filter(
          (receipt) => receipt.requestId !== requestId,
        ),
      };
    }
    source = { ...source, explorers: explorer };
  }
  return updateExpedition(
    state,
    bindExpedition(state, source, plan, now, newId(), requestId),
    now,
  );
}
