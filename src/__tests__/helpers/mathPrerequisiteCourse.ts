/**
 * 선수 확인 시험의 코스 기록 — **제품 전이 그대로** 만든다(`setCoursePlan` · `startRecommendedCourse` ·
 * `submitCourseAttempt`). 손으로 지은 기록은 저장 스키마가 막는 모양을 품을 수 있어, 만든 뒤
 * `storedCourseSchema` 로 한 번 더 확인한다. 저장 스키마가 막는 경우(힌트 · 자기채점 · 같은 본문)는
 * 각 시험이 이 기록을 복제해 그 칸만 바꾼다.
 */
import {
  emptyCourseState,
  setCoursePlan,
  startRecommendedCourse,
  storedCourseSchema,
  submitCourseAttempt,
  type StoredCourse,
} from "@/lib/math-srs/courseAutomation";
import { gradeCourseAnswer } from "@/lib/math-srs/elementary/answers";

export const MINUTE = 60_000;
export const DAY = 86_400_000;

let counter = 0;
/** 저장 스키마의 UUID 꼴을 지키는 결정적인 ID. */
export function uuid(): string {
  counter += 1;
  return `00000000-0000-4000-8000-${counter.toString(16).padStart(12, "0")}`;
}

export const at = (iso: string) => new Date(iso);
export const later = (from: Date, ms: number) => new Date(from.getTime() + ms);

export function plannedCourse(
  startSectionId: string,
  now: Date,
  dailyQuestionCount: 5 | 10 | 15 | 20 = 20,
  base: StoredCourse = emptyCourseState(),
): StoredCourse {
  return setCoursePlan(
    base,
    { startSectionId, dailyQuestionCount, enabled: true, expectedRevision: 0 },
    now,
  );
}

export type Answer = "right" | "wrong" | "giveup";
export const FAIL: Answer[] = ["wrong", "wrong", "right", "right", "right"];
export const PASS: Answer[] = ["right", "right", "right", "right", "right"];

let seedCounter = 1000;
/**
 * 한 세션을 시작해 다섯 문항에 답한다. 기본은 오답 재도전까지 끝낸다(«끝난 세션»).
 * 각 답은 `now` 뒤 1분 간격이다. 씨앗은 부를 때마다 바뀐다 — 실제 경로(`randomInt`)처럼.
 * 같은 씨앗을 두 번 쓰면 같은 본문이 나와 둘째 세션은 근거가 0 이 된다(그것이 맞는 동작이다).
 */
export function practise(
  course: StoredCourse,
  sectionId: string,
  mode: "learn" | "review",
  now: Date,
  answers: readonly Answer[],
  {
    finishRetry = true,
    seed = (seedCounter += 7919),
  }: { finishRetry?: boolean; seed?: number } = {},
): StoredCourse {
  let state = startRecommendedCourse(
    course,
    { sectionId, mode, reason: "fixture" },
    now,
    seed,
    uuid,
    [],
  );
  const session = state.learner.session;
  if (!session || session.sectionId !== sectionId || session.attempts.length)
    throw new Error(`세션을 시작하지 못했습니다: ${sectionId}`);
  let time = now.getTime();
  answers.forEach((answer, index) => {
    const problem = session.problems[index];
    time += MINUTE;
    const wrong = problem.answerChoices?.find(
      (choice) => gradeCourseAnswer(problem, choice) === false,
    );
    if (answer === "wrong" && !wrong)
      throw new Error("오답 보기를 찾지 못했습니다.");
    state = submitCourseAttempt(
      state,
      {
        sessionId: session.id,
        problemId: problem.id,
        submittedAnswer:
          answer === "right" ? problem.answer : answer === "wrong" ? wrong! : "",
        ...(answer === "giveup" ? { giveUp: true } : {}),
      },
      new Date(time),
    );
  });
  if (finishRetry) {
    for (let guard = 0; guard < 20; guard++) {
      const current = state.learner.session!;
      const retry = current.retry;
      if (!retry || retry.completedAt) break;
      const problem = current.problems.find(
        (p) => p.id === retry.pendingProblemIds[0],
      )!;
      time += MINUTE;
      state = submitCourseAttempt(
        state,
        {
          sessionId: current.id,
          problemId: problem.id,
          submittedAnswer: problem.answer,
          retryIndex: retry.attempts.length,
        },
        new Date(time),
      );
    }
  }
  return storedCourseSchema.parse(state);
}

/** 마지막 세션이 끝난 시각. */
export function lastCompletedAt(course: StoredCourse): Date {
  const session = course.learner.session!;
  return new Date(session.retry?.completedAt ?? session.completedAt!);
}
