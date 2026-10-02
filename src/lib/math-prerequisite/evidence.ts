/**
 * 직접 근거 — plan-v03 §6. 저장된 초등 코스 기록을 **읽을 때** 계산한다. 새 칸 · 원장 · 캐시가 없다.
 *
 * 한 세션의 판정은 끝낸 세션의 첫 풀이만 본다:
 *   - 스스로 맞음: 서버 채점 문항 · 정답 · 답하기 전 힌트 없음 · 자기채점 아님 · 처음 본 본문
 *   - 서버 채점 오답: 서버 채점 문항 · 오답 · 힌트 없음 · 자기채점 아님 · 빈 답(포기) 아님 · 처음 본 본문
 *   - 힌트 · 자기채점 · 포기 · 재도전 · 미완료 · 이미 본 본문은 어느 쪽에도 세지 않는다
 * 숫자 문항은 답하기 전에 힌트를 열 수 없다(`courseAutomation.revealCourseHint`) — 힌트 조건은 겹쳐 둔 안전장치다.
 * 답한 뒤 열어 본 풀이(`revealedProblemIds`)는 첫 풀이를 바꾸지 않으므로 보지 않는다.
 *
 * 기존 진도 완료 규칙과 다르다 — 자기채점만으로 진도가 넘어가도 여기서는 성공이 아니다.
 */
import type {
  PrerequisiteOutcome,
  PrerequisiteSectionEvidence,
} from "@/contracts/mathPrerequisite.contract";
import type { StoredCourse } from "@/lib/math-srs/courseAutomation";
import { getCourseSection } from "@/lib/math-srs/elementary/catalog";
import type { CourseSession } from "@/lib/math-srs/elementary/types";
import { PILOT_SECTION_IDS, sectionUnitId } from "./mapping";
import { PREREQUISITE_POLICY } from "./versions";

const DAY_MS = 86_400_000;
export const EVIDENCE_WINDOW_MS = PREREQUISITE_POLICY.evidenceWindowDays * DAY_MS;

/** 줄바꿈과 앞뒤 공백만 맞춘다. 뜻이 비슷한 다른 문항을 같다고 보지 않는다. */
export function normalizeContent(content: string): string {
  return content.replace(/\r\n?/g, "\n").trim();
}

/** 보존된 세션(이력 + 현재) — 같은 ID 는 한 번, 시작 시각 · ID 차례. */
export function retainedSessions(course: StoredCourse): CourseSession[] {
  const seen = new Set<string>();
  const sessions: CourseSession[] = [];
  for (const session of [
    ...course.history.map((entry) => entry.session),
    ...(course.learner.session ? [course.learner.session] : []),
  ]) {
    if (seen.has(session.id)) continue;
    seen.add(session.id);
    sessions.push(session);
  }
  return sessions.sort(
    (a, b) => a.startedAt.localeCompare(b.startedAt) || a.id.localeCompare(b.id),
  );
}

/** 첫 풀이를 끝낸 보존 세션 — 끝낸 시각 · 시작 시각 · ID 차례. 소단원을 주면 그 소단원만. */
export function completedSessions(
  course: StoredCourse,
  sectionId?: string,
): CourseSession[] {
  return retainedSessions(course)
    .filter(
      (session) =>
        session.completedAt !== null &&
        (sectionId === undefined || session.sectionId === sectionId),
    )
    .sort(
      (a, b) =>
        a.completedAt!.localeCompare(b.completedAt!) ||
        a.startedAt.localeCompare(b.startedAt) ||
        a.id.localeCompare(b.id),
    );
}

const at = (iso: string) => Date.parse(iso);

/**
 * 지금 계획의 근거가 될 수 있는 끝낸 세션 — 지금 계획을 저장한 뒤에 **시작**했고(저장 전에 시작해
 * 저장 뒤에 끝난 세션도 뺀다) 첫 풀이를 끝낸 때가 `now` 를 넘지 않는다(앞날에 찍힌 기록은 세지 않는다).
 */
export function currentPlanSessions(
  course: StoredCourse,
  sectionId: string,
  now: Date,
): CourseSession[] {
  const configuredAt = course.plan ? at(course.plan.configuredAt) : -Infinity;
  return completedSessions(course, sectionId).filter(
    (session) =>
      at(session.startedAt) >= configuredAt &&
      at(session.completedAt!) <= now.getTime(),
  );
}

/** 이 소단원에 마지막으로 찍힌 풀이 시각 — 기억과 진도 중 늦은 쪽(없으면 -∞). */
export function newestObservedAt(course: StoredCourse, sectionId: string): number {
  const memory = course.memories[sectionId];
  const progress = course.learner.progress[sectionId];
  return Math.max(
    memory ? at(memory.lastReviewedAt) : -Infinity,
    progress ? at(progress.lastReviewedAt) : -Infinity,
  );
}

/** 학생이 이미 본 본문 — 현재 · 보존 세션의 모든 문항과 최근 답안 100개. */
export function exposedContents(course: StoredCourse): Set<string> {
  const seen = new Set<string>();
  for (const session of retainedSessions(course))
    for (const problem of session.problems)
      seen.add(normalizeContent(problem.content));
  for (const attempt of course.recentAttempts)
    seen.add(normalizeContent(attempt.content));
  return seen;
}

export interface SessionOutcome {
  sessionId: string;
  sectionId: string;
  mode: CourseSession["mode"];
  completedAt: string | null;
  outcome: Exclude<PrerequisiteOutcome, "unknown">;
  independentCorrect: number;
  independentIncorrect: number;
}

/** 한 세션의 직접 근거. 앞서 시작한 보존 세션 · 그 전의 최근 답안에서 본 본문은 세지 않는다. */
export function sessionOutcome(
  course: StoredCourse,
  session: CourseSession,
): SessionOutcome {
  const earlier = new Set<string>();
  for (const other of retainedSessions(course)) {
    if (other.id === session.id) continue;
    if (
      other.startedAt < session.startedAt ||
      (other.startedAt === session.startedAt && other.id < session.id)
    )
      for (const problem of other.problems)
        earlier.add(normalizeContent(problem.content));
  }
  for (const attempt of course.recentAttempts)
    if (attempt.sessionId !== session.id && attempt.answeredAt < session.startedAt)
      earlier.add(normalizeContent(attempt.content));

  const within = new Set<string>();
  const hinted = new Set(session.hintedProblemIds ?? []);
  let independentCorrect = 0;
  let independentIncorrect = 0;
  if (session.completedAt !== null)
    session.attempts.forEach((attempt, index) => {
      const problem = session.problems[index];
      if (!problem || problem.id !== attempt.problemId) return;
      const key = normalizeContent(problem.content);
      const repeated = earlier.has(key) || within.has(key);
      within.add(key);
      if (repeated) return;
      if (problem.input.mode === "self-check" || attempt.selfAssessed) return;
      if (attempt.usedHint || hinted.has(problem.id)) return;
      if (attempt.correct) independentCorrect += 1;
      else if (attempt.submittedAnswer !== "") independentIncorrect += 1;
    });
  return {
    sessionId: session.id,
    sectionId: session.sectionId,
    mode: session.mode,
    completedAt: session.completedAt,
    outcome:
      independentCorrect >= PREREQUISITE_POLICY.passIndependentCorrect
        ? "passed"
        : independentIncorrect >= PREREQUISITE_POLICY.failIndependentIncorrect
          ? "failed"
          : "inconclusive",
    independentCorrect,
    independentIncorrect,
  };
}

/**
 * 시범 소단원 하나의 근거. 지금 계획을 저장한 뒤 시작했고 `now` 까지 끝났으며 14일 안(경계 포함)인
 * 가장 최근 끝낸 세션만 본다. 기억(`memories`)이나 진도(`learner.progress`)가 그 세션보다 새것이면
 * — 진행 중 · 잘린 원천 · 앞날에 찍힌 기록이 있다 — 옛 결과를 쓰지 않고 `unknown` 이다.
 */
export function sectionEvidence(
  course: StoredCourse,
  sectionId: string,
  now: Date,
): PrerequisiteSectionEvidence {
  const unitId = sectionUnitId(sectionId);
  if (!unitId) throw new Error(`시범 밖 소단원입니다: ${sectionId}`);
  const memory = course.memories[sectionId];
  const progress = course.learner.progress[sectionId];
  const anyCompleted = completedSessions(course, sectionId).at(-1);
  const base = {
    unitId,
    sectionId,
    title: getCourseSection(sectionId)?.title ?? sectionId,
    lastObservedAt:
      memory?.lastReviewedAt ??
      progress?.lastReviewedAt ??
      anyCompleted?.completedAt ??
      null,
    partial: true as const,
  };
  const none = {
    outcome: "unknown" as const,
    independentCorrect: 0,
    independentIncorrect: 0,
    sourceRetained: false,
  };
  if (!memory && !progress && !anyCompleted)
    return { ...base, ...none, status: "unassessed" };

  const configuredAt = course.plan ? at(course.plan.configuredAt) : -Infinity;
  const windowStart = now.getTime() - EVIDENCE_WINDOW_MS;
  const observed = newestObservedAt(course, sectionId);
  const lastActivity = Math.max(
    observed,
    anyCompleted ? at(anyCompleted.completedAt!) : -Infinity,
  );
  if (lastActivity < windowStart || lastActivity < configuredAt)
    return { ...base, ...none, status: "stale" };
  const latest = currentPlanSessions(course, sectionId, now).at(-1);
  if (
    !latest ||
    observed > at(latest.completedAt!) ||
    at(latest.completedAt!) < windowStart
  )
    return { ...base, ...none, status: "inconclusive" };

  const result = sessionOutcome(course, latest);
  return {
    ...base,
    status:
      result.outcome === "passed"
        ? "passed_recent"
        : result.outcome === "failed"
          ? "not_passed_recent"
          : "inconclusive",
    outcome: result.outcome,
    independentCorrect: result.independentCorrect,
    independentIncorrect: result.independentIncorrect,
    sourceRetained: true,
  };
}

/** 시범 네 범위의 근거 — 목표 둘(E56-N04) · 확인 둘(E56-N03) 차례. 단원 전체 판정이 아니다. */
export function pilotEvidence(
  course: StoredCourse,
  now: Date,
): PrerequisiteSectionEvidence[] {
  return PILOT_SECTION_IDS.map((sectionId) =>
    sectionEvidence(course, sectionId, now),
  );
}
