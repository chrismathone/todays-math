/** Pure, validated server transitions. No browser state or database access. */
import { z } from "zod";
import {
  courseActivityDaySchema,
  courseAttemptInputSchema,
  courseDailyGoalSchema,
  coursePlanSchema,
  courseRecentAttemptSchema,
  courseSectionIdSchema,
  courseSectionReportSchema,
  type CourseAttemptInput,
  type CourseFollowUpInput,
  type CourseHintInput,
  type CoursePlanInput,
  type CoursePublicSession,
  type CourseSummary,
} from "@/contracts/mathSrsCourse.contract";
import { kstDateOf } from "@/lib/kstDate";
import { gradeCourseAnswer, validateCourseAnswer } from "./elementary/answers";
import {
  embeddedCourseAnswerChoices,
  hasPrintedFourNumberCandidates,
  makeCourseAnswerChoices,
} from "./elementary/choiceAnswers";
import { COURSE_SECTIONS, getCourseSection } from "./elementary/catalog";
import { generateCourseSession } from "./elementary/generator";
import type { BankCourseCandidate } from "./courseBank";
import {
  courseLearnerSchema,
  courseRecord,
  createCourseLearner,
  markCourseHint,
  recordCourseAttempt,
} from "./elementary/progress";
import type { CourseFollowUp, CourseSession } from "./elementary/types";
import {
  coursePrerequisiteDecision,
  prerequisiteRecommendation,
} from "@/lib/math-prerequisite/courseIntegration";
import { mathPrerequisiteEnabled } from "@/lib/math-prerequisite/enabled";
import {
  heldCheckSections,
  type PrerequisiteSessionChoice,
} from "@/lib/math-prerequisite/policy";

const DAY = 86_400_000;
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
const sessionSchema = courseLearnerSchema.shape.session.unwrap();
const memorySchema = courseSectionReportSchema.omit({ estimatedRecall: true });
const savedSessionSchema = z.strictObject({
  session: sessionSchema,
  requests: z.array(courseAttemptInputSchema).max(5),
});
export class CourseConflict extends Error {}
export class CourseInvalidInput extends Error {}

export const storedCourseSchema = z
  .strictObject({
    plan: coursePlanSchema.nullable(),
    learner: courseLearnerSchema,
    completedSectionIds: z
      .array(courseSectionIdSchema)
      .max(COURSE_SECTIONS.length),
    requests: z.array(courseAttemptInputSchema).max(5),
    history: z.array(savedSessionSchema).max(30),
    activity: z.array(courseActivityDaySchema).max(90),
    recentAttempts: z.array(courseRecentAttemptSchema).max(100),
    memories: courseRecord(z.string(), memorySchema),
    dailyGoalSnapshot: z
      .strictObject({ date: z.iso.date(), goal: courseDailyGoalSchema })
      .optional(),
  })
  .superRefine((state, ctx) => {
    const fail = () =>
      ctx.addIssue({
        code: "custom",
        message: "자동 학습 기록이 일치하지 않습니다.",
      });
    const entries = [
      ...state.history,
      ...(state.learner.session
        ? [{ session: state.learner.session, requests: state.requests }]
        : []),
    ];
    const ids = new Set<string>();
    const retainedDays = new Map<
      string,
      {
        answered: number;
        correct: number;
        unaidedCorrect: number;
        hinted: number;
      }
    >();
    let completedAt: string | null = null;
    for (const { session, requests } of entries) {
      if (!z.uuid().safeParse(session.id).success || ids.has(session.id))
        fail();
      ids.add(session.id);
      if (completedAt && session.startedAt < completedAt) fail();
      completedAt = session.completedAt;
      if (requests.length !== session.attempts.length) fail();
      session.problems.forEach((p) => {
        if (!z.uuid().safeParse(p.id).success || ids.has(p.id)) fail();
        ids.add(p.id);
      });
      // «모르겠어요» lives on the request, not the attempt: a second answer follows
      // only a real wrong answer, an opened solution only giving up or a self-check.
      for (const entry of session.followUps ?? []) {
        const request = requests.find((r) => r.problemId === entry.problemId);
        const selfCheck =
          session.problems.find((p) => p.id === entry.problemId)?.input.mode ===
          "self-check";
        if (
          !request ||
          (entry.kind === "retry"
            ? request.giveUp
            : !request.giveUp && !selfCheck)
        )
          fail();
      }
      session.attempts.forEach((a, i) => {
        const request = requests[i];
        if (
          !request ||
          request.sessionId !== session.id ||
          request.problemId !== a.problemId ||
          a.submittedAnswer !==
            (request.giveUp ? "" : request.submittedAnswer) ||
          a.usedHint !==
            (session.hintedProblemIds ?? []).includes(a.problemId) ||
          (request.giveUp && a.correct) ||
          // A self-check problem is assessed by the student with or without
          // a hint; `usedHint` itself is checked against hintedProblemIds above.
          (a.selfAssessed &&
            !request.giveUp &&
            request.selfCorrect !== a.correct)
        )
          fail();
        if (!state.memories[session.sectionId]) fail();
        const date = kstDateOf(new Date(a.answeredAt));
        const day = retainedDays.get(date) ?? {
          answered: 0,
          correct: 0,
          unaidedCorrect: 0,
          hinted: 0,
        };
        retainedDays.set(date, {
          answered: day.answered + 1,
          correct: day.correct + Number(a.correct),
          unaidedCorrect:
            day.unaidedCorrect +
            Number(a.correct && !a.usedHint && !a.selfAssessed),
          hinted: day.hinted + Number(a.usedHint),
        });
      });
    }
    if (
      state.history.some(({ session }) => !session.completedAt) ||
      Object.keys(state.learner.pausedSessions ?? {}).length ||
      (!state.learner.session && state.requests.length) ||
      new Set(state.completedSectionIds).size !==
        state.completedSectionIds.length ||
      state.completedSectionIds.some((id) => !state.learner.progress[id]) ||
      (!state.plan &&
        (entries.length ||
          Object.keys(state.memories).length ||
          state.completedSectionIds.length)) ||
      new Set(state.activity.map((day) => day.date)).size !==
        state.activity.length
    )
      fail();
    for (const day of state.activity) {
      if (
        day.correct > day.answered ||
        day.unaidedCorrect > day.correct ||
        day.hinted > day.answered
      )
        fail();
    }
    for (const [date, retained] of retainedDays) {
      const day = state.activity.find((d) => d.date === date);
      // Days older than the retained 90-day ledger may have been compacted.
      if (
        !day &&
        (state.activity.length < 90 || date >= state.activity[0].date)
      )
        fail();
      if (
        day &&
        (day.answered < retained.answered ||
          day.correct < retained.correct ||
          day.unaidedCorrect < retained.unaidedCorrect ||
          day.hinted < retained.hinted)
      )
        fail();
    }
    for (const [id, memory] of Object.entries(state.memories)) {
      const progress = state.learner.progress[id];
      const partial =
        state.learner.session?.sectionId === id &&
        !state.learner.session.completedAt
          ? state.learner.session.attempts
          : [];
      if (
        id !== memory.sectionId ||
        memory.attempts !== (progress?.attempts ?? 0) + partial.length ||
        memory.correct !==
          (progress?.correct ?? 0) + partial.filter((a) => a.correct).length ||
        memory.completedSessions !== (progress?.completedSessions ?? 0) ||
        memory.correct > memory.attempts ||
        memory.unaidedCorrect > memory.correct ||
        memory.hinted > memory.attempts ||
        memory.selfAssessed > memory.attempts ||
        memory.nextReviewAt < memory.lastReviewedAt
      )
        fail();
    }
    if (Object.keys(state.learner.progress).some((id) => !state.memories[id]))
      fail();
    if (
      state.completedSectionIds.some(
        (id) => (state.memories[id]?.correct ?? 0) < 4,
      )
    )
      fail();
    if (
      state.activity.reduce((sum, day) => sum + day.answered, 0) >
      Object.values(state.memories).reduce((sum, m) => sum + m.attempts, 0)
    )
      fail();
    if (
      new Set(state.recentAttempts.map((a) => a.problemId)).size !==
      state.recentAttempts.length
    )
      fail();
  });
export type StoredCourse = z.infer<typeof storedCourseSchema>;

export function emptyCourseState(): StoredCourse {
  return {
    plan: null,
    learner: courseLearnerSchema.parse(createCourseLearner()),
    completedSectionIds: [],
    requests: [],
    history: [],
    activity: [],
    recentAttempts: [],
    memories: {},
  };
}

export function setCoursePlan(
  state: StoredCourse,
  input: CoursePlanInput,
  now: Date,
): StoredCourse {
  if (!getCourseSection(input.startSectionId))
    throw new CourseInvalidInput("학습할 소단원을 선택해 주세요.");
  const changingStart = state.plan?.startSectionId !== input.startSectionId;
  if (
    changingStart &&
    state.learner.session &&
    (!state.learner.session.completedAt ||
      (state.learner.session.retry && !state.learner.session.retry.completedAt))
  )
    throw new CourseConflict(
      "진행 중인 학습을 마친 뒤 시작 소단원을 바꿔 주세요.",
    );
  return {
    ...state,
    plan: {
      startSectionId: input.startSectionId,
      dailyQuestionCount: input.dailyQuestionCount,
      enabled: input.enabled,
      configuredAt: now.toISOString(),
    },
    learner: changingStart
      ? { ...state.learner, selectedSectionId: input.startSectionId }
      : state.learner,
  };
}

function nextLearning(state: StoredCourse) {
  const selected = getCourseSection(state.learner.selectedSectionId)!;
  return (
    COURSE_SECTIONS.find(
      (s) =>
        s.order >= selected.order && !state.completedSectionIds.includes(s.id),
    ) ?? null
  );
}

export function courseSummary(state: StoredCourse, now: Date): CourseSummary {
  const today = kstDateOf(now);
  const activity = state.activity.find((d) => d.date === today);
  const todayGoal =
    state.dailyGoalSnapshot?.date === today && (activity?.answered ?? 0) > 0
      ? state.dailyGoalSnapshot.goal
      : (state.plan?.dailyQuestionCount ?? 10);
  const held = new Set<string>(
    heldCheckSections(state, now, mathPrerequisiteEnabled()).sectionIds,
  );
  const due = Object.values(state.memories)
    .filter(
      (m) =>
        Date.parse(m.nextReviewAt) <= now.getTime() && !held.has(m.sectionId),
    )
    .sort(
      (a, b) =>
        a.nextReviewAt.localeCompare(b.nextReviewAt) ||
        getCourseSection(a.sectionId)!.order -
          getCourseSection(b.sectionId)!.order,
    );
  const session = state.learner.session;
  const active =
    session &&
    (!session.completedAt || (session.retry && !session.retry.completedAt));
  const next = nextLearning(state);
  const prerequisite = coursePrerequisiteDecision(state, now, {
    answered: activity?.answered ?? 0,
    goal: todayGoal,
  });
  const learnedToday = [
    ...state.history.map((s) => s.session),
    ...(session ? [session] : []),
  ].some(
    (s) =>
      s.mode === "learn" &&
      s.sectionId === next?.id &&
      s.completedAt &&
      kstDateOf(new Date(s.completedAt)) === today,
  );
  // A failed new lesson rests until tomorrow; reviews never consume its cursor.
  const recommendation: CourseSummary["recommendation"] = active
    ? {
        sectionId: session.sectionId,
        mode: "resume",
        reason: "풀던 문제부터 이어서 학습해요.",
      }
    : !state.plan?.enabled || (activity?.answered ?? 0) >= todayGoal
      ? null
      : prerequisite
        ? prerequisiteRecommendation(prerequisite)
        : due.length
          ? {
              sectionId: due[0].sectionId,
              mode: "review",
              reason: "복습 날짜가 가장 오래 지난 소단원이에요.",
            }
          : next && !learnedToday
            ? {
                sectionId: next.id,
                mode: "learn",
                reason: "선택한 진도에서 다음 소단원을 학습해요.",
              }
            : null;
  const memories = Object.values(state.memories);
  return {
    status: !state.plan
      ? "setup"
      : active
        ? session.mode === "review"
          ? "review"
          : "learning"
        : !state.plan.enabled
          ? "paused"
          : recommendation?.mode === "review"
            ? "review"
            : recommendation
              ? "ready"
              : prerequisite?.kind === "unavailable"
                ? "ready"
                : !next
                  ? "complete"
                  : "done",
    currentSectionId: !state.plan
      ? null
      : active
        ? session.sectionId
        : (next?.id ?? null),
    dueCount: due.length,
    todayAnswered: activity?.answered ?? 0,
    todayCorrect: activity?.correct ?? 0,
    todayGoal,
    completedSections: state.completedSectionIds.length,
    lastPracticedAt:
      memories
        .map((m) => m.lastReviewedAt)
        .sort()
        .at(-1) ?? null,
    nextReviewAt: memories.map((m) => m.nextReviewAt).sort()[0] ?? null,
    recommendation,
  };
}

export function startAutomaticCourse(
  state: StoredCourse,
  now: Date,
  seed: number,
  newId: () => string,
  bankCandidates: readonly BankCourseCandidate[] = [],
): StoredCourse {
  const prerequisite = coursePrerequisiteDecision(state, now);
  return startRecommendedCourse(
    state,
    courseSummary(state, now).recommendation,
    now,
    seed,
    newId,
    bankCandidates,
    prerequisite?.session ?? undefined,
  );
}

/** Server-owned recommendation also supports a frozen expedition spanning days. */
export function startRecommendedCourse(
  state: StoredCourse,
  next: CourseSummary["recommendation"],
  now: Date,
  seed: number,
  newId: () => string,
  bankCandidates: readonly BankCourseCandidate[] = [],
  supplied?: PrerequisiteSessionChoice,
): StoredCourse {
  const active = state.learner.session;
  if (
    active &&
    (!active.completedAt || (active.retry && !active.retry.completedAt))
  )
    return state;
  if (!next || next.mode === "resume") return state;
  const previous = state.learner.session;
  const startedAt = new Date(
    Math.max(
      now.getTime(),
      Date.parse(previous?.completedAt ?? now.toISOString()),
    ),
  );
  if (
    supplied &&
    (supplied.sectionId !== next.sectionId || supplied.mode !== next.mode)
  )
    throw new CourseConflict("추천한 확인 문제를 다시 불러와 주세요.");
  const generated = supplied
    ? {
        id: "pending",
        sectionId: supplied.sectionId,
        mode: supplied.mode,
        problems: supplied.problems,
        attempts: [],
        startedAt: startedAt.toISOString(),
        completedAt: null,
      }
    : generateCourseSession(
        next.sectionId,
        seed,
        startedAt,
        next.mode,
        bankCandidates,
      );
  const session = sessionSchema.parse({
    ...generated,
    id: newId(),
    problems: generated.problems.map((p) => ({ ...p, id: newId() })),
  });
  return {
    ...state,
    learner: { ...state.learner, session },
    dailyGoalSnapshot: {
      date: kstDateOf(now),
      goal: courseSummary(state, now).todayGoal,
    },
    requests: [],
    history: previous
      ? [
          ...state.history,
          { session: previous, requests: state.requests },
        ].slice(-30)
      : state.history,
  };
}

export function findStoredCourseSession(
  state: StoredCourse,
  id: string,
): CourseSession | undefined {
  return state.learner.session?.id === id
    ? state.learner.session
    : state.history.find((s) => s.session.id === id)?.session;
}
function requireCurrent(state: StoredCourse, input: CourseHintInput) {
  const session = state.learner.session;
  if (
    !session ||
    session.id !== input.sessionId ||
    session.completedAt ||
    session.problems[session.attempts.length]?.id !== input.problemId
  )
    throw new CourseConflict(
      "학습 또는 문제 순서가 변경되었습니다. 다시 불러와 주세요.",
    );
  return session;
}
export function revealCourseHint(
  state: StoredCourse,
  input: CourseHintInput,
): StoredCourse {
  const current = state.learner.session;
  const historyIndex = state.history.findIndex(
    (entry) => entry.session.id === input.sessionId,
  );
  const session =
    current?.id === input.sessionId
      ? current
      : state.history[historyIndex]?.session;
  if (!session || !session.problems.some((p) => p.id === input.problemId))
    throw new CourseConflict("문제 또는 학습 기록을 찾을 수 없습니다.");
  if (
    !session.attempts.some((attempt) => attempt.problemId === input.problemId)
  ) {
    const problem = session.problems.find((p) => p.id === input.problemId)!;
    if (
      current?.id !== input.sessionId ||
      current.completedAt ||
      current.problems[current.attempts.length]?.id !== input.problemId ||
      problem.input.mode !== "self-check"
    )
      throw new CourseConflict("답을 제출한 뒤 해설을 볼 수 있어요.");
    if (current.hintedProblemIds?.includes(input.problemId)) return state;
    return {
      ...state,
      learner: markCourseHint(state.learner, input.problemId),
    } as StoredCourse;
  }
  if (
    session.revealedProblemIds?.includes(input.problemId) ||
    session.hintedProblemIds?.includes(input.problemId)
  )
    return state;
  const updated = {
    ...session,
    revealedProblemIds: [
      ...(session.revealedProblemIds ?? []),
      input.problemId,
    ],
  };
  if (current?.id === input.sessionId)
    return { ...state, learner: { ...state.learner, session: updated } };
  return {
    ...state,
    history: state.history.map((entry, index) =>
      index === historyIndex ? { ...entry, session: updated } : entry,
    ),
  };
}

export function estimatedCourseRecall(
  memory: StoredCourse["memories"][string],
  now: Date,
) {
  const elapsed = Math.max(
    0,
    (now.getTime() - Date.parse(memory.lastReviewedAt)) / DAY,
  );
  return Math.round(
    memory.mastery * Math.exp((Math.log(0.9) * elapsed) / memory.stabilityDays),
  );
}

function submitCourseRetryAttempt(
  state: StoredCourse,
  input: CourseAttemptInput,
  now: Date,
): StoredCourse {
  const session = state.learner.session;
  const retry = session?.retry;
  if (!session || session.id !== input.sessionId || !retry)
    throw new CourseConflict("오답 복습 기록을 다시 불러와 주세요.");
  if (input.retryIndex === undefined)
    throw new CourseInvalidInput("오답 복습 순서를 다시 불러와 주세요.");
  const previous = retry.requests[input.retryIndex];
  if (previous) {
    if (
      previous.sessionId === input.sessionId &&
      previous.problemId === input.problemId &&
      previous.submittedAnswer === input.submittedAnswer &&
      previous.selfCorrect === input.selfCorrect &&
      previous.giveUp === input.giveUp
    )
      return state;
    throw new CourseConflict("이미 제출한 오답 복습을 변경할 수 없습니다.");
  }
  if (
    retry.completedAt ||
    input.retryIndex !== retry.attempts.length ||
    retry.pendingProblemIds[0] !== input.problemId
  )
    throw new CourseConflict(
      "오답 복습 문제 순서가 변경되었습니다. 다시 불러와 주세요.",
    );
  const problem = session.problems.find((p) => p.id === input.problemId)!;
  const selfAssessed = problem.input.mode === "self-check";
  const revealed =
    (session.revealedProblemIds ?? []).includes(problem.id) ||
    (session.hintedProblemIds ?? []).includes(problem.id);
  if (!input.giveUp && selfAssessed && input.selfCorrect === undefined)
    throw new CourseInvalidInput("스스로 푼 결과를 선택해 주세요.");
  if (!selfAssessed && input.selfCorrect !== undefined)
    throw new CourseInvalidInput("이 문제는 선택한 답으로 채점합니다.");
  const invalid =
    !input.giveUp &&
    !selfAssessed &&
    validateCourseAnswer(problem, input.submittedAnswer);
  if (invalid) throw new CourseInvalidInput(invalid);
  const answeredAt = new Date(
    Math.max(
      now.getTime(),
      Date.parse(
        retry.attempts.at(-1)?.answeredAt ??
          session.completedAt ??
          session.startedAt,
      ),
    ),
  ).toISOString();
  const attempt = {
    problemId: problem.id,
    submittedAnswer: input.giveUp ? "" : input.submittedAnswer,
    correct:
      !input.giveUp &&
      (selfAssessed
        ? input.selfCorrect === true
        : gradeCourseAnswer(problem, input.submittedAnswer) === true),
    usedHint: revealed,
    selfAssessed,
    answeredAt,
  };
  const pendingProblemIds = retry.pendingProblemIds.slice(1);
  if (!attempt.correct && !input.giveUp) pendingProblemIds.push(problem.id);
  return {
    ...state,
    learner: {
      ...state.learner,
      session: {
        ...session,
        retry: {
          pendingProblemIds,
          attempts: [...retry.attempts, attempt],
          requests: [...retry.requests, input],
          completedAt: pendingProblemIds.length ? null : answeredAt,
        },
      },
    },
  };
}

export function submitCourseAttempt(
  state: StoredCourse,
  input: CourseAttemptInput,
  now: Date,
  /** `followUps`: the client shows «한 번 더 → 풀이» (header `x-course-follow-up`). */
  options: { followUps?: boolean } = {},
): StoredCourse {
  const activeSession = state.learner.session;
  if (activeSession?.id === input.sessionId && activeSession.retry) {
    if (input.retryIndex !== undefined)
      return submitCourseRetryAttempt(state, input, now);
    const old = state.requests.find(
      (request) => request.problemId === input.problemId,
    );
    if (
      old &&
      old.submittedAnswer === input.submittedAnswer &&
      old.selfCorrect === input.selfCorrect &&
      old.giveUp === input.giveUp
    )
      return state;
    throw new CourseInvalidInput("오답 복습 순서를 다시 불러와 주세요.");
  }
  if (input.retryIndex !== undefined)
    throw new CourseInvalidInput("첫 풀이에는 오답 복습 순서를 보내지 마세요.");
  const saved =
    state.learner.session?.id === input.sessionId
      ? { session: state.learner.session, requests: state.requests }
      : state.history.find((s) => s.session.id === input.sessionId);
  const request = saved?.requests.find((r) => r.problemId === input.problemId);
  if (request) {
    if (
      request.submittedAnswer === input.submittedAnswer &&
      request.selfCorrect === input.selfCorrect &&
      request.giveUp === input.giveUp
    )
      return state;
    throw new CourseConflict("이미 제출한 문제의 답안을 바꿀 수 없습니다.");
  }
  const session = requireCurrent(state, input);
  const problem = session.problems[session.attempts.length];
  const selfAssessed = problem.input.mode === "self-check";
  const hinted = (session.hintedProblemIds ?? []).includes(problem.id);
  if (!input.giveUp && selfAssessed && input.selfCorrect === undefined)
    throw new CourseInvalidInput("스스로 푼 결과를 선택해 주세요.");
  if (!selfAssessed && input.selfCorrect !== undefined)
    throw new CourseInvalidInput("이 문제는 입력한 답으로 채점합니다.");
  const invalid =
    !input.giveUp &&
    !selfAssessed &&
    validateCourseAnswer(problem, input.submittedAnswer);
  if (invalid) throw new CourseInvalidInput(invalid);
  const answeredAt = new Date(
    Math.max(
      now.getTime(),
      Date.parse(session.attempts.at(-1)?.answeredAt ?? session.startedAt),
    ),
  ).toISOString();
  const attempt = {
    problemId: problem.id,
    submittedAnswer: input.giveUp ? "" : input.submittedAnswer,
    correct:
      !input.giveUp &&
      (selfAssessed
        ? input.selfCorrect === true
        : gradeCourseAnswer(problem, input.submittedAnswer) === true),
    usedHint: hinted,
    selfAssessed,
    answeredAt,
  };
  let learner = recordCourseAttempt(state.learner, attempt);
  // «모르겠어요» · a self-check «다시 연습» opens the solution at once: that problem is
  // done for today (decision 6). Only clients that can show and close it get the record.
  if (options.followUps && !attempt.correct && (input.giveUp || selfAssessed))
    learner = {
      ...learner,
      session: {
        ...learner.session!,
        followUps: [
          ...(learner.session!.followUps ?? []),
          {
            problemId: problem.id,
            kind: "reveal",
            correct: false,
            answeredAt,
            doneAt: null,
          },
        ],
      },
    };
  const finished = !!learner.session?.completedAt;
  if (finished) {
    const followed = new Set(
      (learner.session!.followUps ?? []).map((entry) => entry.problemId),
    );
    const pendingProblemIds = learner
      .session!.attempts.filter(
        (entry) => !entry.correct && !followed.has(entry.problemId),
      )
      .map((entry) => entry.problemId);
    if (pendingProblemIds.length)
      learner = {
        ...learner,
        session: {
          ...learner.session!,
          retry: {
            pendingProblemIds,
            attempts: [],
            requests: [],
            completedAt: null,
          },
        },
      };
  }
  const independent =
    attempt.correct && !attempt.usedHint && !attempt.selfAssessed;
  const prior = state.memories[session.sectionId];
  // Bounded evidence heuristic, aligned with memory.ts: EMA mastery and stability
  // at 90% retention. Spaced, independently correct work grows stability more;
  // wrong/assisted/self-assessed work cannot be treated as demonstrated mastery.
  const previousReview =
    state.learner.progress[session.sectionId]?.lastReviewedAt;
  const elapsed = previousReview
    ? Math.max(0, (Date.parse(answeredAt) - Date.parse(previousReview)) / DAY)
    : 0;
  const stability = prior?.stabilityDays ?? 1;
  const mastery = selfAssessed
    ? (prior?.mastery ?? 0)
    : clamp(
        (prior?.mastery ?? 50) +
          ((!attempt.correct ? 0 : independent ? 92 : 52) -
            (prior?.mastery ?? 50)) *
            0.28,
        0,
        100,
      );
  const early = learner.session!.attempts.some(
    (a) => !a.correct || a.usedHint || a.selfAssessed,
  );
  // Five immediate drills are one observation of spacing, not five recalls.
  // First perfect session: 3 days. Later spaced successes grow by observed
  // recall/elapsed time; partial sessions and same-day repeats do not grow S.
  const factor =
    elapsed < 0.5
      ? 1
      : 1.3 +
        0.7 *
          (1 -
            ((prior?.mastery ?? 50) *
              Math.exp((Math.log(0.9) * elapsed) / stability)) /
              100) +
        Math.min(0.5, (elapsed / stability) * 0.3);
  const stabilityDays = !finished
    ? stability
    : early
      ? clamp(
          learner.session!.attempts.some((a) => !a.correct)
            ? stability * 0.45
            : Math.min(stability, 1),
          0.25,
          60,
        )
      : !previousReview
        ? 3
        : clamp(stability * factor, 0.25, 60);
  const intervalDays = early ? 1 : clamp(Math.round(stabilityDays), 1, 60);
  const nextReviewAt = new Date(
    Date.parse(answeredAt) + intervalDays * DAY,
  ).toISOString();
  const memory = {
    sectionId: session.sectionId,
    completedSessions: (prior?.completedSessions ?? 0) + Number(finished),
    attempts: (prior?.attempts ?? 0) + 1,
    correct: (prior?.correct ?? 0) + Number(attempt.correct),
    unaidedCorrect: (prior?.unaidedCorrect ?? 0) + Number(independent),
    hinted: (prior?.hinted ?? 0) + Number(hinted),
    selfAssessed: (prior?.selfAssessed ?? 0) + Number(selfAssessed),
    mastery,
    stabilityDays,
    lastReviewedAt: answeredAt,
    nextReviewAt,
  };
  let completedSectionIds = state.completedSectionIds;
  // Auto-graded work needs >=80% unaided correctness. Self-check-only work may
  // move the curriculum after explicit successful comparison, but never proves
  // unaided mastery and always receives early review.
  learner = { ...learner, selectedSectionId: state.learner.selectedSectionId };
  if (finished) {
    learner = {
      ...learner,
      progress: {
        ...learner.progress,
        [session.sectionId]: {
          ...learner.progress[session.sectionId],
          intervalDays,
          nextReviewAt,
        },
      },
    };
    if (
      session.mode === "learn" &&
      learner.session!.attempts.filter(
        (a) => !a.selfAssessed && a.correct && !a.usedHint,
      ).length >=
        Math.ceil(
          learner.session!.attempts.filter((a) => !a.selfAssessed).length * 0.8,
        ) &&
      learner
        .session!.attempts.filter((a) => a.selfAssessed)
        .every((a) => a.correct && a.usedHint)
    ) {
      completedSectionIds = [
        ...new Set([...completedSectionIds, session.sectionId]),
      ];
      const next = COURSE_SECTIONS.find(
        (s) =>
          s.order > getCourseSection(session.sectionId)!.order &&
          !completedSectionIds.includes(s.id),
      );
      learner = {
        ...learner,
        selectedSectionId: next?.id ?? session.sectionId,
      };
    }
  }
  const date = kstDateOf(new Date(answeredAt));
  const today = state.activity.find((d) => d.date === date) ?? {
    date,
    answered: 0,
    correct: 0,
    unaidedCorrect: 0,
    hinted: 0,
  };
  const activity = [
    ...state.activity.filter((d) => d.date !== date),
    {
      date,
      answered: today.answered + 1,
      correct: today.correct + Number(attempt.correct),
      unaidedCorrect: today.unaidedCorrect + Number(independent),
      hinted: today.hinted + Number(hinted),
    },
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-90);
  return {
    ...state,
    learner,
    completedSectionIds,
    dailyGoalSnapshot: {
      date,
      goal: courseSummary(state, new Date(answeredAt)).todayGoal,
    },
    requests: [...state.requests, input],
    activity,
    memories: { ...state.memories, [session.sectionId]: memory },
    recentAttempts: [
      ...state.recentAttempts,
      {
        ...attempt,
        sessionId: session.id,
        sectionId: session.sectionId,
        content: problem.content,
        answer: problem.answer,
        solution: problem.solution,
      },
    ].slice(-100),
  } as StoredCourse;
}

/**
 * The second try right after a wrong first answer, or «알겠어요» on an open solution
 * (plan §3.2). The first attempt, memories and activity stay as they were; the
 * problem leaves today's retry queue. A resent request returns the state as it is.
 */
export function submitCourseFollowUp(
  state: StoredCourse,
  input: CourseFollowUpInput,
  now: Date,
): StoredCourse {
  const session = state.learner.session;
  if (!session || session.id !== input.sessionId)
    throw new CourseConflict(
      "학습 또는 문제 순서가 변경되었습니다. 다시 불러와 주세요.",
    );
  const followUps = session.followUps ?? [];
  const existing = followUps.find((f) => f.problemId === input.problemId);
  const withSession = (next: CourseSession): StoredCourse => ({
    ...state,
    learner: { ...state.learner, session: next },
  });
  if (input.action === "done") {
    if (!existing)
      throw new CourseConflict("확인할 풀이가 없습니다. 다시 불러와 주세요.");
    if (existing.doneAt) return state;
    const doneAt = new Date(
      Math.max(now.getTime(), Date.parse(existing.answeredAt)),
    ).toISOString();
    return withSession({
      ...session,
      followUps: followUps.map((f) => (f === existing ? { ...f, doneAt } : f)),
    });
  }
  const submittedAnswer = input.giveUp ? "" : (input.submittedAnswer ?? "");
  if (existing) {
    if (
      existing.kind === "retry" &&
      existing.submittedAnswer === submittedAnswer &&
      !!existing.giveUp === !!input.giveUp
    )
      return state;
    throw new CourseConflict("이미 다시 푼 문제입니다.");
  }
  const index = session.attempts.findIndex(
    (a) => a.problemId === input.problemId,
  );
  const first = session.attempts[index];
  const problem = session.problems[index];
  if (
    !first ||
    first.correct ||
    index !== session.attempts.length - 1 ||
    state.requests.find((r) => r.problemId === input.problemId)?.giveUp ||
    problem.input.mode === "self-check" ||
    session.retry?.attempts.length
  )
    throw new CourseConflict(
      "지금 다시 풀 수 있는 문제가 아닙니다. 다시 불러와 주세요.",
    );
  if (!input.giveUp) {
    const invalid = validateCourseAnswer(problem, submittedAnswer);
    if (invalid) throw new CourseInvalidInput(invalid);
  }
  const record: CourseFollowUp = {
    problemId: problem.id,
    kind: "retry",
    submittedAnswer,
    ...(input.giveUp ? { giveUp: true as const } : {}),
    correct:
      !input.giveUp && gradeCourseAnswer(problem, submittedAnswer) === true,
    answeredAt: new Date(
      Math.max(now.getTime(), Date.parse(first.answeredAt)),
    ).toISOString(),
    doneAt: null,
  };
  // The last problem's follow-up comes after the session finished and queued it.
  const { retry, ...rest } = session;
  const pending = retry?.pendingProblemIds.filter((id) => id !== problem.id);
  return withSession({
    ...rest,
    followUps: [...followUps, record],
    ...(retry && pending?.length
      ? { retry: { ...retry, pendingProblemIds: pending } }
      : {}),
  });
}

/** What the screen shows after a wrong first answer (`followUp` in the response). */
function publicFollowUp(
  session: CourseSession,
  problemId: string,
): NonNullable<CoursePublicSession["problems"][number]["followUp"]> | null {
  const record = session.followUps?.find((f) => f.problemId === problemId);
  if (record)
    return {
      state: record.kind === "retry" && record.correct ? "correct" : "solution",
      done: record.doneAt !== null,
    };
  const last = session.attempts.at(-1);
  const problem = session.problems.find((p) => p.id === problemId);
  return last?.problemId === problemId &&
    !last.correct &&
    last.submittedAnswer !== "" &&
    problem?.input.mode !== "self-check" &&
    !session.retry?.attempts.length
    ? { state: "awaiting", done: false }
    : null;
}

export function publicCourseSession(
  session: CourseSession,
  /** `followUp`: the client asked for the follow-up fields (header `x-course-follow-up`). */
  options: { followUp?: boolean } = {},
): CoursePublicSession {
  // Older persisted sessions predate answerChoices. Derive their options from
  // stable problem seeds and the session's own answers without changing records.
  const sessionAnswers = session.problems.map((problem) => problem.answer);
  return {
    id: session.id,
    sectionId: session.sectionId,
    mode: session.mode,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    attempts: session.attempts,
    retry: session.retry
      ? {
          pendingProblemIds: session.retry.pendingProblemIds,
          attempts: session.retry.attempts,
          completedAt: session.retry.completedAt,
        }
      : null,
    problems: session.problems.map((p) => {
      const attempt = session.attempts.find((a) => a.problemId === p.id);
      const activeRetry =
        session.retry &&
        !session.retry.completedAt &&
        session.retry.pendingProblemIds[0] === p.id;
      const latestRetry = session.retry?.attempts
        .filter((a) => a.problemId === p.id)
        .at(-1);
      const embedded = embeddedCourseAnswerChoices(p);
      const conflictingPrintedChoices =
        !embedded && hasPrintedFourNumberCandidates(p.content);
      const derived =
        !p.answerChoices || p.interactive === undefined
          ? makeCourseAnswerChoices(p, sessionAnswers)
          : null;
      const solution = { answer: p.answer, solution: p.solution };
      const followUp = options.followUp ? publicFollowUp(session, p.id) : null;
      return {
        id: p.id,
        sectionId: p.sectionId,
        tier: p.tier,
        content: embedded?.content ?? p.content,
        input: p.input,
        answerChoices: conflictingPrintedChoices
          ? null
          : (embedded?.answerChoices ??
            p.answerChoices ??
            derived?.answerChoices ??
            null),
        interactive: p.interactive ?? derived?.interactive ?? null,
        figureUrl: p.figureSpec
          ? `/api/learn/math-srs/course/figure?sessionId=${session.id}&problemId=${p.id}`
          : null,
        hint:
          (session.hintedProblemIds?.includes(p.id) &&
            (attempt ||
              (p.input.mode === "self-check" &&
                !session.completedAt &&
                session.problems[session.attempts.length]?.id === p.id))) ||
          session.revealedProblemIds?.includes(p.id) ||
          followUp?.state === "solution"
            ? solution
            : null,
        feedback: latestRetry
          ? { correct: latestRetry.correct }
          : activeRetry
            ? null
            : attempt
              ? { correct: attempt.correct }
              : null,
        // Tabs opened before the reader shipped parse strictly: only on request.
        ...(options.followUp ? { followUp } : {}),
      };
    }),
  };
}
