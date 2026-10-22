/**
 * 선수 확인 · 목표 복귀의 결정 — plan-v03 §7 · §8. 순수 함수이고 저장하지 않는다.
 *
 * 차례(앞이 이긴다):
 *   1. 꺼짐 · 계획 꺼짐 · 진행 중 세션(이어 풀기) · 남은 분량 < 5 → 없음(null)
 *   2. 지금 목표 T 가 시범 목표가 아니면 없음
 *   3. 복귀 — 현재 세션이 끝난(재도전 포함) 확인 범위 P 의 review 면 T 의 learn.
 *      만기 복습 · 확인보다 앞이고 `learnedToday` 를 한 번 넘는다(그 연결은 루트가 한다)
 *   4. 확인 — T 의 최근 끝낸 learn · review 둘이 모두 실패(지금 계획 뒤 · 14일 안)이고,
 *      오늘(KST) 푼 확인 범위가 없고, 유예(14일)가 끝난 첫 범위를 차례대로
 *   5. 확인 범위가 바닥나면 같은 기준의 새 T 연습(fallback) · T 도 바닥나면 시작 불가(unavailable)
 * 발동도 복귀도 아니면 생성기를 한 번도 부르지 않는다.
 */
import { kstDateOf } from "@/lib/kstDate";
import type { StoredCourse } from "@/lib/math-srs/courseAutomation";
import type {
  CourseProblem,
  CourseSession,
} from "@/lib/math-srs/elementary/types";
import {
  currentPlanSessions,
  EVIDENCE_WINDOW_MS,
  exposedContents,
  newestObservedAt,
  retainedSessions,
  sessionOutcome,
} from "./evidence";
import {
  isPilotCheck,
  PILOT_CHECK_SECTION_IDS,
  pilotTargetForCourse,
  type PilotCheckSectionId,
} from "./mapping";
import { supplySafeSession, type SessionGenerator } from "./supply";
import { PREREQUISITE_POLICY } from "./versions";

const DAY_MS = 86_400_000;
const COOLDOWN_MS = PREREQUISITE_POLICY.checkCooldownDays * DAY_MS;

/** 이 요청에 걸리는 하루 분량 — 미션 밖은 코스의 오늘 목표, 열린 초등 미션 안은 goal 10 과 answered. */
export interface PrerequisiteBudget {
  answered: number;
  goal: number;
}

/** 사전 검사로 고른 세션 — 시작은 이 문항을 그대로 쓴다(ID 만 루트가 붙인다). */
export interface PrerequisiteSessionChoice {
  sectionId: string;
  mode: CourseSession["mode"];
  seed: number;
  candidateIndex: number;
  problems: CourseProblem[];
}

export type PrerequisiteDecisionKind =
  "check" | "return" | "fallback" | "unavailable";

export interface PrerequisiteDecision {
  kind: PrerequisiteDecisionKind;
  targetSectionId: string;
  /** 풀 소단원(check 는 P, 나머지는 T) */
  sectionId: string;
  mode: CourseSession["mode"] | null;
  /** 학생에게 보이는 한 줄 */
  reason: string;
  /** 교사 근거 화면의 한 줄 */
  teacherReason: string;
  canStart: boolean;
  /** 복귀만 참 — 오늘 이미 T 를 learn 했어도 한 번 더 learn 을 낸다 */
  overridesLearnedToday: boolean;
  session: PrerequisiteSessionChoice | null;
}

export const PREREQUISITE_REASONS = Object.freeze({
  check: "분수의 곱셈에 쓰이는 분수의 뺄셈을 먼저 확인해요.",
  checkTeacher:
    "목표 소단원의 최근 끝낸 세션 둘이 모두 실패해 선수 범위를 한 세션 확인합니다.",
  return: "분수의 뺄셈 확인 범위를 본 뒤, 분수의 곱셈을 다시 학습해요.",
  returnTeacher: "확인 범위를 푼 뒤 목표 소단원으로 한 번 돌아갑니다.",
  fallback: "확인 문제를 준비하지 못해 분수의 곱셈 학습을 이어 갑니다.",
  fallbackTeacher:
    "확인 범위에서 본 적 없는 문제 다섯을 만들지 못해 목표 연습으로 이어갑니다.",
  unavailable: "새 문제를 준비하지 못했어요. 선생님께 알려 주세요.",
  unavailableTeacher:
    "목표와 확인 범위 모두 본 적 없는 문제 다섯을 만들지 못했습니다. 같은 탐험 범위에서 시작 소단원을 바꾸거나 선수 확인 기능을 끄면 다시 이어집니다.",
  held: "확인 범위를 최근 14일 안에 풀어, 목표를 마치거나 14일이 지날 때까지 그 복습을 미뤄요. 숙달 판정이 아니에요.",
});

const time = (iso: string) => Date.parse(iso);

function activeSession(course: StoredCourse): boolean {
  const session = course.learner.session;
  return (
    !!session &&
    (!session.completedAt || (!!session.retry && !session.retry.completedAt))
  );
}

/** 오늘(KST) 이 소단원을 `learn` 으로 끝낸 적이 있나 — `courseSummary` 의 `learnedToday` 와 같은 뜻. */
function learnedToday(course: StoredCourse, sectionId: string, now: Date) {
  const today = kstDateOf(now);
  return retainedSessions(course).some(
    (session) =>
      session.mode === "learn" &&
      session.sectionId === sectionId &&
      session.completedAt !== null &&
      kstDateOf(new Date(session.completedAt)) === today,
  );
}

/**
 * 발동이면 마지막 실패 세션의 ID(확인 씨앗의 열쇠), 아니면 null. 세션은 지금 계획을 저장한 뒤
 * 시작했고 `now` 까지 끝난 것만 센다(`currentPlanSessions`).
 */
function triggeringFailure(
  course: StoredCourse,
  target: string,
  now: Date,
): string | null {
  const windowStart = now.getTime() - EVIDENCE_WINDOW_MS;
  const lastTwo = currentPlanSessions(course, target, now).slice(
    -PREREQUISITE_POLICY.triggerSessions,
  );
  if (lastTwo.length < PREREQUISITE_POLICY.triggerSessions) return null;
  if (lastTwo.some((session) => time(session.completedAt!) < windowStart))
    return null;
  // 기억 · 진도가 보존된 끝낸 세션보다 새것이면(진행 중 · 잘림 · 앞날 기록) 결과를 모른다.
  if (newestObservedAt(course, target) > time(lastTwo.at(-1)!.completedAt!))
    return null;
  if (
    !lastTwo.every(
      (session) => sessionOutcome(course, session).outcome === "failed",
    )
  )
    return null;
  return lastTwo.at(-1)!.id;
}

function inCooldown(
  course: StoredCourse,
  sectionId: PilotCheckSectionId,
  now: Date,
): boolean {
  const memory = course.memories[sectionId];
  return !!memory && now.getTime() - time(memory.lastReviewedAt) < COOLDOWN_MS;
}

function checkedToday(course: StoredCourse, now: Date): boolean {
  const today = kstDateOf(now);
  return PILOT_CHECK_SECTION_IDS.some((sectionId) => {
    const memory = course.memories[sectionId];
    return !!memory && kstDateOf(new Date(memory.lastReviewedAt)) === today;
  });
}

function choose(
  sectionId: string,
  mode: CourseSession["mode"],
  key: string,
  avoid: ReadonlySet<string>,
  now: Date,
  generate: SessionGenerator | undefined,
): PrerequisiteSessionChoice | null {
  const supplied = supplySafeSession(
    { sectionId, mode, key, avoid, now },
    generate ? { generate } : {},
  );
  return supplied.ok
    ? {
        sectionId,
        mode,
        seed: supplied.seed,
        candidateIndex: supplied.candidateIndex,
        problems: supplied.problems,
      }
    : null;
}

function unavailable(target: string): PrerequisiteDecision {
  return {
    kind: "unavailable",
    targetSectionId: target,
    sectionId: target,
    mode: null,
    reason: PREREQUISITE_REASONS.unavailable,
    teacherReason: PREREQUISITE_REASONS.unavailableTeacher,
    canStart: false,
    overridesLearnedToday: false,
    session: null,
  };
}

/** Shared pre-supply gate; no generation, randomness, persistence or thresholds of its own. */
function prerequisiteTarget(
  course: StoredCourse,
  enabled: boolean,
  effectiveBudget: PrerequisiteBudget,
) {
  if (!enabled || !course.plan?.enabled || activeSession(course)) return null;
  if (
    effectiveBudget.goal - effectiveBudget.answered <
    PREREQUISITE_POLICY.sessionSize
  )
    return null;
  const target = pilotTargetForCourse(course);
  if (!target) return null;
  return target;
}

function completedCheckForReturn(course: StoredCourse, now: Date): boolean {
  const current = course.learner.session;
  const currentEndedAt = current?.retry?.completedAt ?? current?.completedAt;
  return !!(
    course.plan &&
    current &&
    currentEndedAt &&
    current.mode === "review" &&
    isPilotCheck(current.sectionId) &&
    time(current.startedAt) >= time(course.plan.configuredAt) &&
    time(currentEndedAt) <= now.getTime()
  );
}

/** Authoritative candidate pool before supply validation. Never claims actual problem availability. */
export function prerequisiteCheckCandidates(
  course: StoredCourse,
  now: Date,
  enabled: boolean,
  effectiveBudget: PrerequisiteBudget,
) {
  const target = prerequisiteTarget(course, enabled, effectiveBudget);
  if (!target || completedCheckForReturn(course, now)) return null;
  const failure = triggeringFailure(course, target, now);
  if (!failure || checkedToday(course, now)) return null;
  const sectionIds = PILOT_CHECK_SECTION_IDS.filter(
    (sectionId) => !inCooldown(course, sectionId, now),
  ).slice(0, PREREQUISITE_POLICY.maxCheckSections);
  if (!sectionIds.length) return null;
  const evidenceSessionIds = currentPlanSessions(course, target, now)
    .slice(-PREREQUISITE_POLICY.triggerSessions)
    .map((s) => s.id);
  return {
    targetSectionId: target,
    failureSessionId: failure,
    sectionIds,
    evidenceSessionIds,
  };
}

export function prerequisiteStep(
  course: StoredCourse,
  now: Date,
  enabled: boolean,
  effectiveBudget: PrerequisiteBudget,
  deps: { generate?: SessionGenerator } = {},
): PrerequisiteDecision | null {
  const target = prerequisiteTarget(course, enabled, effectiveBudget);
  if (!target) return null;
  const current = course.learner.session;

  // 복귀는 지금 계획을 저장한 뒤 시작해 `now` 까지 끝난 P 세션에만 — 옛 계획의 P · 앞날 기록은 아니다.
  if (completedCheckForReturn(course, now)) {
    const session = choose(
      target,
      "learn",
      `return:${current!.id}:${target}`,
      exposedContents(course),
      now,
      deps.generate,
    );
    return session
      ? {
          kind: "return",
          targetSectionId: target,
          sectionId: target,
          mode: "learn",
          reason: PREREQUISITE_REASONS.return,
          teacherReason: PREREQUISITE_REASONS.returnTeacher,
          canStart: true,
          overridesLearnedToday: true,
          session,
        }
      : unavailable(target);
  }

  const candidates = prerequisiteCheckCandidates(
    course,
    now,
    enabled,
    effectiveBudget,
  );
  if (!candidates) return null;
  const { failureSessionId: failure, sectionIds: eligible } = candidates;

  const avoid = exposedContents(course);
  for (const sectionId of eligible) {
    const session = choose(
      sectionId,
      "review",
      `check:${failure}:${sectionId}`,
      avoid,
      now,
      deps.generate,
    );
    if (session)
      return {
        kind: "check",
        targetSectionId: target,
        sectionId,
        mode: "review",
        reason: PREREQUISITE_REASONS.check,
        teacherReason: PREREQUISITE_REASONS.checkTeacher,
        canStart: true,
        overridesLearnedToday: false,
        session,
      };
  }
  const mode = learnedToday(course, target, now) ? "review" : "learn";
  const session = choose(
    target,
    mode,
    `fallback:${failure}:${target}`,
    avoid,
    now,
    deps.generate,
  );
  return session
    ? {
        kind: "fallback",
        targetSectionId: target,
        sectionId: target,
        mode,
        reason: PREREQUISITE_REASONS.fallback,
        teacherReason: PREREQUISITE_REASONS.fallbackTeacher,
        canStart: true,
        overridesLearnedToday: false,
        session,
      }
    : unavailable(target);
}

/**
 * 만기 복습에서 잠시 빼는 확인 범위 — 지금 목표가 시범 목표로 미완료이고, 그 범위를 지금 계획을
 * 저장한 뒤 14일 안에 풀었을 때. 확인 상한을 보통 만기로 우회하지 않게 하려는 것이고 숙달 판정이 아니다.
 * 계획을 다시 저장하거나 · 14일이 지나거나 · 시범 목표를 끝내거나 · 기능을 끄면 기존 만기 규칙으로 돌아간다.
 */
export function heldCheckSections(
  course: StoredCourse,
  now: Date,
  enabled: boolean,
): { sectionIds: PilotCheckSectionId[]; reason: string | null } {
  if (!enabled || !course.plan?.enabled || !pilotTargetForCourse(course))
    return { sectionIds: [], reason: null };
  const configuredAt = time(course.plan.configuredAt);
  const sectionIds = PILOT_CHECK_SECTION_IDS.filter((sectionId) => {
    const memory = course.memories[sectionId];
    return (
      !!memory &&
      time(memory.lastReviewedAt) >= configuredAt &&
      time(memory.lastReviewedAt) <= now.getTime() &&
      inCooldown(course, sectionId, now)
    );
  });
  return sectionIds.length
    ? { sectionIds, reason: PREREQUISITE_REASONS.held }
    : { sectionIds: [], reason: null };
}
