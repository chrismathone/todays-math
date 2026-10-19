import { z } from "zod";
import { DIFFICULTY_LADDER } from "@/contracts/difficulty";
import {
  gradeCourseAnswer,
  getCourseProblemInput,
  validateCourseAnswer,
} from "./answers";
import {
  COURSE_SECTIONS,
  getCourseSection,
  getNextCourseSection,
} from "./catalog";
import type {
  CourseAttempt,
  CourseLearnerState,
  CourseProblem,
  CourseSection,
  CourseSession,
  SectionProgress,
} from "./types";

const DAY_MS = 86_400_000;
const SESSION_SIZE = 5;
const MAX_INTERVAL_DAYS = 60;
const safeCount = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const identifier = z
  .string()
  .min(1)
  .max(200)
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value));
const sectionId = identifier.refine((value) =>
  COURSE_SECTIONS.some((section) => section.id === value),
);
const timestamp = z
  .string()
  .datetime()
  .refine((value) => {
    const time = Date.parse(value);
    return Number.isFinite(time) && new Date(time).toISOString() === value;
  });

// Zod deliberately omits __proto__ while parsing records. Detect it before
// parsing so corrupted saved records are rejected, never silently discarded.
export function courseRecord<Value extends z.ZodType>(
  keys: z.ZodString,
  values: Value,
) {
  return z.preprocess(
    (value, context) => {
      if (
        value &&
        typeof value === "object" &&
        Object.keys(value).some((key) =>
          ["__proto__", "prototype", "constructor"].includes(key),
        )
      )
        context.addIssue({
          code: "custom",
          message: "학습 기록의 키가 올바르지 않습니다.",
        });
      return value;
    },
    z.record(keys, values),
  );
}

const attemptSchema = z.strictObject({
  problemId: identifier,
  submittedAnswer: z.string().max(2_000),
  correct: z.boolean(),
  usedHint: z.boolean(),
  selfAssessed: z.boolean(),
  answeredAt: timestamp,
});

const problemSchema = z.strictObject({
  id: identifier,
  sectionId,
  tier: z.enum(DIFFICULTY_LADDER),
  seed: z.number().int().min(0).max(0xffffffff),
  content: z.string().min(1).max(20_000),
  answer: z.string().min(1).max(4_000),
  solution: z.string().min(1).max(30_000),
  figureSpec: z.record(z.string(), z.json()).nullable(),
  input: z.strictObject({
    mode: z.enum(["number", "text", "self-check"]),
    label: z.string().min(1).max(200),
    placeholder: z.string().max(200),
    help: z.string().max(1_000),
  }),
  answerChoices: z
    .array(z.string().min(1).max(100))
    .length(4)
    .nullable()
    .optional(),
  interactive: z
    .strictObject({
      kind: z.literal("fraction-parts"),
      denominator: z.number().int().min(2).max(12),
      shape: z.literal("bar"),
    })
    .nullable()
    .optional(),
});

const retryRequestSchema = z.strictObject({
  sessionId: identifier,
  problemId: identifier,
  submittedAnswer: z.string().max(2_000),
  selfCorrect: z.boolean().optional(),
  giveUp: z.boolean().optional(),
  retryIndex: z.number().int().min(0).optional(),
});
const retrySchema = z.strictObject({
  pendingProblemIds: z.array(identifier).max(SESSION_SIZE),
  attempts: z.array(attemptSchema),
  requests: z.array(retryRequestSchema),
  completedAt: timestamp.nullable(),
});
const followUpSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    problemId: identifier,
    kind: z.literal("retry"),
    submittedAnswer: z.string().max(2_000),
    giveUp: z.literal(true).optional(),
    correct: z.boolean(),
    answeredAt: timestamp,
    doneAt: timestamp.nullable(),
  }),
  z.strictObject({
    problemId: identifier,
    kind: z.literal("reveal"),
    correct: z.literal(false),
    answeredAt: timestamp,
    doneAt: timestamp.nullable(),
  }),
]);

function matchesProblem(
  problem: CourseProblem,
  attempt: CourseAttempt,
): boolean {
  if (attempt.problemId !== problem.id) return false;
  if (problem.input.mode === "self-check") return attempt.selfAssessed;
  if (attempt.selfAssessed) return false;
  // Giving up is an explicit incorrect attempt, without inventing an answer.
  if (attempt.submittedAnswer === "") return !attempt.correct;
  return (
    validateCourseAnswer(problem, attempt.submittedAnswer) === null &&
    gradeCourseAnswer(problem, attempt.submittedAnswer) === attempt.correct
  );
}

const sessionSchema = z
  .strictObject({
    id: identifier,
    sectionId,
    mode: z.enum(["learn", "review"]),
    problems: z.array(problemSchema).length(SESSION_SIZE),
    attempts: z.array(attemptSchema).max(SESSION_SIZE),
    startedAt: timestamp,
    completedAt: timestamp.nullable(),
    hintedProblemIds: z.array(identifier).max(SESSION_SIZE).optional(),
    revealedProblemIds: z.array(identifier).max(SESSION_SIZE).optional(),
    retry: retrySchema.optional(),
    followUps: z.array(followUpSchema).max(SESSION_SIZE).optional(),
  })
  .superRefine((session, context) => {
    const fail = (message: string) =>
      context.addIssue({ code: "custom", message });
    if (
      new Set(session.problems.map((problem) => problem.id)).size !==
      SESSION_SIZE
    )
      fail("문제 ID가 중복됩니다.");
    for (const problem of session.problems) {
      if (
        problem.sectionId !== session.sectionId ||
        problem.input.mode !== getCourseProblemInput(problem).mode
      )
        fail("문제와 소단원 또는 답안 형식이 일치하지 않습니다.");
      if (
        problem.answerChoices &&
        (problem.input.mode !== "number" ||
          new Set(problem.answerChoices).size !== 4 ||
          problem.answerChoices.filter(
            (choice) => gradeCourseAnswer(problem, choice) === true,
          ).length !== 1)
      )
        fail("답 선택지가 문제의 정답과 일치하지 않습니다.");
    }
    const hinted = session.hintedProblemIds ?? [];
    const revealed = session.revealedProblemIds ?? [];
    const availableIds = session.problems
      .slice(0, Math.min(session.attempts.length + 1, SESSION_SIZE))
      .map((problem) => problem.id);
    if (
      new Set(hinted).size !== hinted.length ||
      hinted.some((id) => !availableIds.includes(id))
    )
      fail("힌트 기록이 문제 순서와 일치하지 않습니다.");
    if (
      new Set(revealed).size !== revealed.length ||
      revealed.some((id) => !session.attempts.some((a) => a.problemId === id))
    )
      fail("해설 확인 기록이 제출된 문제와 일치하지 않습니다.");
    let previousTime = Date.parse(session.startedAt);
    for (const [index, attempt] of session.attempts.entries()) {
      if (
        !matchesProblem(session.problems[index], attempt) ||
        Date.parse(attempt.answeredAt) < previousTime ||
        (hinted.includes(attempt.problemId) && !attempt.usedHint)
      )
        fail("답안 기록이 문제 또는 학습 순서와 일치하지 않습니다.");
      previousTime = Date.parse(attempt.answeredAt);
    }
    if (session.attempts.length === SESSION_SIZE) {
      if (session.completedAt !== session.attempts.at(-1)?.answeredAt)
        fail("학습 완료 시각이 일치하지 않습니다.");
    } else if (session.completedAt !== null) {
      fail("진행 중인 학습을 완료 처리할 수 없습니다.");
    }
    const followUps = session.followUps ?? [];
    const followed = new Set(followUps.map((entry) => entry.problemId));
    if (followed.size !== followUps.length)
      fail("다시 풀기 기록이 문제마다 하나가 아닙니다.");
    for (const entry of followUps) {
      const index = session.attempts.findIndex(
        (a) => a.problemId === entry.problemId,
      );
      const first = session.attempts[index];
      const problem = session.problems[index];
      // A follow-up happens before the next first answer and before the retry round.
      const before =
        session.attempts[index + 1]?.answeredAt ??
        session.retry?.attempts[0]?.answeredAt;
      // Auto-graded first answers are "" only when the student gave up.
      const gaveUp = first?.submittedAnswer === "";
      const selfCheck = problem?.input.mode === "self-check";
      if (
        !first ||
        first.correct ||
        (entry.kind === "retry"
          ? selfCheck ||
            gaveUp ||
            (entry.giveUp === true) !== (entry.submittedAnswer === "") ||
            !matchesProblem(problem, {
              ...first,
              submittedAnswer: entry.submittedAnswer,
              correct: entry.correct,
            }) ||
            Date.parse(entry.answeredAt) < Date.parse(first.answeredAt)
          : !(selfCheck || gaveUp) || entry.answeredAt !== first.answeredAt) ||
        (before && Date.parse(entry.answeredAt) > Date.parse(before)) ||
        (entry.doneAt &&
          Date.parse(entry.doneAt) < Date.parse(entry.answeredAt))
      )
        fail("다시 풀기 기록이 첫 풀이와 일치하지 않습니다.");
    }
    if (session.retry) {
      if (!session.completedAt)
        fail("첫 풀이가 끝나기 전에 오답 복습을 시작할 수 없습니다.");
      // A problem resolved on the spot is not asked again in this session.
      const wrong = session.attempts
        .filter((a) => !a.correct && !followed.has(a.problemId))
        .map((a) => a.problemId);
      if (
        !wrong.length ||
        session.retry.attempts.length !== session.retry.requests.length
      )
        fail("오답 복습 기록이 일치하지 않습니다.");
      const pending = [...wrong];
      let retryTime = Date.parse(session.completedAt ?? session.startedAt);
      for (const [index, attempt] of session.retry.attempts.entries()) {
        const request = session.retry.requests[index];
        const current = pending.shift();
        const problem = session.problems.find((p) => p.id === current);
        if (
          !problem ||
          !request ||
          request.retryIndex !== index ||
          request.sessionId !== session.id ||
          request.problemId !== current ||
          !matchesProblem(problem, attempt) ||
          attempt.submittedAnswer !==
            (request.giveUp ? "" : request.submittedAnswer) ||
          Date.parse(attempt.answeredAt) < retryTime
        )
          fail("오답 복습의 문제 순서가 일치하지 않습니다.");
        retryTime = Date.parse(attempt.answeredAt);
        if (!attempt.correct && !request?.giveUp)
          pending.push(attempt.problemId);
      }
      if (
        pending.join("|") !== session.retry.pendingProblemIds.join("|") ||
        (pending.length === 0
          ? session.retry.completedAt !==
            session.retry.attempts.at(-1)?.answeredAt
          : session.retry.completedAt !== null)
      )
        fail("오답 복습의 남은 문제가 일치하지 않습니다.");
    }
  });

const progressSchema = z
  .strictObject({
    sectionId,
    completedSessions: safeCount
      .min(1)
      .max(Math.floor(Number.MAX_SAFE_INTEGER / SESSION_SIZE)),
    attempts: safeCount.min(SESSION_SIZE),
    correct: safeCount,
    lastReviewedAt: timestamp,
    nextReviewAt: timestamp,
    intervalDays: z.number().int().min(1).max(MAX_INTERVAL_DAYS),
  })
  .refine(
    (progress) =>
      progress.attempts === progress.completedSessions * SESSION_SIZE &&
      progress.correct <= progress.attempts &&
      Date.parse(progress.nextReviewAt) ===
        Date.parse(progress.lastReviewedAt) + progress.intervalDays * DAY_MS,
    "누적 진도 또는 복습 날짜가 일치하지 않습니다.",
  );

/** Shared runtime validation for state transitions and persisted local data. */
export const courseLearnerSchema = z
  .strictObject({
    selectedSectionId: sectionId,
    progress: courseRecord(sectionId, progressSchema),
    session: sessionSchema.nullable(),
    pausedSessions: courseRecord(sectionId, sessionSchema)
      .refine((sessions) => Object.keys(sessions).length <= 16)
      .optional(),
  })
  .superRefine((state, context) => {
    const fail = (message: string) =>
      context.addIssue({ code: "custom", message });
    for (const [id, progress] of Object.entries(state.progress)) {
      if (id !== progress.sectionId)
        fail("소단원 진도 키가 일치하지 않습니다.");
    }
    const session = state.session;
    for (const [id, paused] of Object.entries(state.pausedSessions ?? {})) {
      if (
        id !== paused.sectionId ||
        paused.completedAt ||
        id === session?.sectionId
      )
        fail("잠시 멈춘 학습의 소단원과 진행 상태가 일치하지 않습니다.");
    }
    if (session?.completedAt) {
      const progress = state.progress[session.sectionId];
      const correct = session.attempts.filter(
        (attempt) => attempt.correct,
      ).length;
      if (
        !progress ||
        progress.lastReviewedAt !== session.completedAt ||
        progress.correct < correct ||
        progress.attempts - progress.correct < SESSION_SIZE - correct
      )
        fail("완료한 학습의 누적 진도가 없습니다.");
    }
  });

function validateLearner(state: CourseLearnerState): void {
  if (!courseLearnerSchema.safeParse(state).success)
    throw new Error("학습 기록의 형식이 올바르지 않아요.");
}

export function createCourseLearner(): CourseLearnerState {
  return {
    selectedSectionId: COURSE_SECTIONS[0].id,
    progress: {},
    session: null,
  };
}

/** Switching lessons keeps unfinished work and restores it when revisited. */
export function startCourseSession(
  state: CourseLearnerState,
  session: CourseSession,
): CourseLearnerState {
  validateLearner(state);
  if (
    state.session?.id === session.id ||
    (state.session?.sectionId === session.sectionId &&
      !state.session.completedAt)
  )
    return state;
  if (
    !sessionSchema.safeParse(session).success ||
    session.attempts.length ||
    session.completedAt ||
    (session.hintedProblemIds?.length ?? 0) > 0 ||
    (state.session?.completedAt &&
      Date.parse(session.startedAt) < Date.parse(state.session.completedAt))
  )
    throw new Error("새 학습의 문제와 시작 시각을 확인해 주세요.");
  const pausedSessions = { ...state.pausedSessions };
  const resumed = pausedSessions[session.sectionId];
  delete pausedSessions[session.sectionId];
  if (state.session && !state.session.completedAt)
    pausedSessions[state.session.sectionId] = state.session;
  if (Object.keys(pausedSessions).length > 16)
    throw new Error(
      "잠시 멈춘 학습이 많아요. 진행 중인 소단원 하나를 먼저 마쳐 주세요.",
    );
  return {
    ...state,
    selectedSectionId:
      session.mode === "review" ? state.selectedSectionId : session.sectionId,
    pausedSessions,
    session: resumed ?? session,
  };
}

export function markCourseHint(
  state: CourseLearnerState,
  problemId: string,
): CourseLearnerState {
  validateLearner(state);
  const session = state.session;
  if (
    !session ||
    session.completedAt ||
    session.problems[session.attempts.length]?.id !== problemId
  )
    throw new Error("현재 풀고 있는 문제에서만 힌트를 볼 수 있어요.");
  if (session.hintedProblemIds?.includes(problemId)) return state;
  return {
    ...state,
    session: {
      ...session,
      hintedProblemIds: [...(session.hintedProblemIds ?? []), problemId],
    },
  };
}

function sameAttempt(left: CourseAttempt, right: CourseAttempt): boolean {
  return (Object.keys(left) as (keyof CourseAttempt)[]).every(
    (key) => left[key] === right[key],
  );
}

function reviewInterval(
  attempts: CourseAttempt[],
  previous?: SectionProgress,
): number {
  if (attempts.some((attempt) => attempt.usedHint || attempt.selfAssessed))
    return 1;
  const correct = attempts.filter((attempt) => attempt.correct).length;
  if (correct < 4) return 1;
  if (correct < SESSION_SIZE) return 2;
  return previous
    ? Math.min(MAX_INTERVAL_DAYS, Math.max(3, previous.intervalDays * 2))
    : 3;
}

/** Stores only the next answer; replaying the same answer never advances twice. */
export function recordCourseAttempt(
  state: CourseLearnerState,
  attempt: CourseAttempt,
): CourseLearnerState {
  validateLearner(state);
  const session = state.session;
  if (!session || !attemptSchema.safeParse(attempt).success)
    throw new Error("진행 중인 학습과 답안 기록을 확인해 주세요.");
  const normalized = session.hintedProblemIds?.includes(attempt.problemId)
    ? { ...attempt, usedHint: true }
    : attempt;
  const previousAttempt = session.attempts.find(
    (entry) => entry.problemId === normalized.problemId,
  );
  if (previousAttempt) {
    if (sameAttempt(previousAttempt, normalized)) return state;
    throw new Error("이미 저장된 답안과 다른 기록으로 덮어쓸 수 없어요.");
  }
  const problem = session.problems[session.attempts.length];
  if (
    session.completedAt ||
    !problem ||
    !matchesProblem(problem, normalized) ||
    Date.parse(normalized.answeredAt) <
      Date.parse(session.attempts.at(-1)?.answeredAt ?? session.startedAt)
  )
    throw new Error("현재 문제와 답안 순서가 일치하지 않아요.");
  const attempts = [...session.attempts, normalized];
  if (attempts.length !== SESSION_SIZE)
    return { ...state, session: { ...session, attempts } };
  const completedAt = normalized.answeredAt;
  const previous = state.progress[session.sectionId];
  const intervalDays = reviewInterval(attempts, previous);
  const progress: SectionProgress = {
    sectionId: session.sectionId,
    completedSessions: (previous?.completedSessions ?? 0) + 1,
    attempts: (previous?.attempts ?? 0) + attempts.length,
    correct:
      (previous?.correct ?? 0) +
      attempts.filter((entry) => entry.correct).length,
    lastReviewedAt: completedAt,
    nextReviewAt: new Date(
      Date.parse(completedAt) + intervalDays * DAY_MS,
    ).toISOString(),
    intervalDays,
  };
  const result: CourseLearnerState = {
    ...state,
    selectedSectionId:
      session.mode === "review"
        ? state.selectedSectionId
        : (getNextCourseSection(session.sectionId)?.id ?? session.sectionId),
    progress: { ...state.progress, [session.sectionId]: progress },
    session: { ...session, attempts, completedAt },
  };
  validateLearner(result);
  return result;
}

export function dueCourseSections(
  state: CourseLearnerState,
  now: Date = new Date(),
): CourseSection[] {
  validateLearner(state);
  if (!Number.isFinite(now.getTime()))
    throw new Error("복습 날짜를 확인해 주세요.");
  return Object.values(state.progress)
    .filter((progress) => Date.parse(progress.nextReviewAt) <= now.getTime())
    .sort(
      (left, right) =>
        left.nextReviewAt.localeCompare(right.nextReviewAt) ||
        getCourseSection(left.sectionId)!.order -
          getCourseSection(right.sectionId)!.order,
    )
    .map((progress) => getCourseSection(progress.sectionId)!);
}

/** Complete describes a finished lesson, not a claim of mathematical mastery. */
export function getSectionStatus(
  state: CourseLearnerState,
  id: string,
  now: Date = new Date(),
): "new" | "learning" | "review" | "complete" {
  if (!getCourseSection(id)) throw new Error("소단원을 찾을 수 없어요.");
  if (!Number.isFinite(now.getTime()))
    throw new Error("복습 날짜를 확인해 주세요.");
  if (state.session?.sectionId === id && !state.session.completedAt)
    return "learning";
  if (state.pausedSessions?.[id]) return "learning";
  const progress = state.progress[id];
  if (!progress) return "new";
  return Date.parse(progress.nextReviewAt) <= now.getTime()
    ? "review"
    : "complete";
}
