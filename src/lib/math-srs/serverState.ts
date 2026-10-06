/** Server practice transitions share the existing mission/grading/memory engine. No database here. */
import { z } from "zod";
import { storedExplorerSchema } from "@/contracts/mathExplorers.contract";
import { storedExpeditionSchema } from "@/contracts/mathExpedition.contract";
import { storedFadingSchema } from "@/contracts/fading.contract";
import {
  mathSrsAttemptInputSchema,
  mathSrsAttemptSchema,
  mathSrsMemorySchema,
  mathSrsProblemSchema,
  mathSrsSourceSchema,
  type MathSrsAttemptInput,
  type MathSrsHintInput,
} from "@/contracts/mathSrs.contract";
import { kstDateOf } from "@/lib/kstDate";
import { gradeSrsAnswer, srsChoiceIssue } from "./sharedAnswers";
import { createMemories } from "./memory";
import {
  createMission,
  recordAttempt,
  type MissionProblemSupply,
} from "./mission";
import { quickMissionProblem } from "./quickMission";
import { CONCEPT_IDS, type Learner, type Mission } from "./types";
import { storedCourseSchema } from "./courseAutomation";
import { storedDailyJourneySchema, updateDailyJourney } from "./dailyJourney";

const storedProblemSchema = mathSrsProblemSchema
  .omit({ hint: true, feedback: true, answerChoices: true })
  .extend({
    hint: z.string().max(8_000),
    answer: z.number().finite(),
    answerText: z.string().max(4_000).optional(),
    // Choice problems: `answer` is the correct index; checked by srsChoiceIssue.
    choices: z.array(z.string()).optional(),
    solution: z.array(z.string().max(8_000)).min(1).max(30),
    source: mathSrsSourceSchema
      .extend({ seed: z.number().finite() })
      .optional(),
  })
  .superRefine((problem, ctx) => {
    const issue = srsChoiceIssue(problem);
    if (issue) ctx.addIssue({ code: "custom", message: issue });
  });
const storedMissionSchema = z.strictObject({
  id: z.uuid(),
  date: z.iso.date(),
  seed: z.number().int().nonnegative(),
  startedAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
  problems: z.array(storedProblemSchema).length(12),
  attempts: z.array(mathSrsAttemptSchema).max(12),
  hintedProblemIds: z.array(z.uuid()).max(12),
  requests: z.array(mathSrsAttemptInputSchema).max(12),
  resolvedRetryProblemIds: z.array(z.uuid()).max(12).optional(),
  retryCompletedAt: z.iso.datetime().optional(),
});
const payloadSchema = z
  .strictObject({
    version: z.literal(1),
    memories: z.array(mathSrsMemorySchema).length(CONCEPT_IDS.length),
    missions: z.array(storedMissionSchema).max(90),
    course: storedCourseSchema.optional(),
    dailyJourney: storedDailyJourneySchema.optional(),
    explorers: storedExplorerSchema.optional(),
    expedition: storedExpeditionSchema.optional(),
    // «오늘의 기억» 새 앱의 칸(2026-10-06). 🔴 이 칸을 읽을 줄 아는 코드가 쓰는 코드보다 먼저 배포돼야 한다 —
    // 이 꼴은 모르는 키를 거절하므로, 순서가 거꾸로면 새 칸이 생긴 학생의 기록 전체가 옛 코드에서 안 읽힌다.
    fading: storedFadingSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const invalid = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    if (
      new Set(value.memories.map((m) => m.conceptId)).size !==
      CONCEPT_IDS.length
    )
      invalid("개념 기억이 중복되었습니다.");
    if (new Set(value.missions.map((m) => m.id)).size !== value.missions.length)
      invalid("미션이 중복되었습니다.");
    for (const memory of value.memories) {
      if (memory.successes > memory.attempts)
        invalid("개념 정답 수가 시도 수보다 큽니다.");
      if (memory.attempts === 0) {
        if (
          memory.lastReviewedAt !== null ||
          memory.nextReviewAt !== null ||
          memory.mastery !== 0 ||
          memory.stabilityDays !== 1
        )
          invalid("미측정 개념에 측정 결과가 있습니다.");
      } else if (
        !memory.lastReviewedAt ||
        !memory.nextReviewAt ||
        Date.parse(memory.nextReviewAt) < Date.parse(memory.lastReviewedAt)
      )
        invalid("개념 복습 시각이 올바르지 않습니다.");
    }
    for (const m of value.missions) {
      const resolved = m.resolvedRetryProblemIds ?? [];
      if (
        new Set(resolved).size !== resolved.length ||
        resolved.some(
          (id) =>
            !m.completedAt ||
            !m.attempts.some((a) => a.problemId === id && !a.correct),
        )
      )
        invalid("오답 재풀이 기록이 올바르지 않습니다.");
      if (
        m.retryCompletedAt &&
        (!m.completedAt ||
          m.retryCompletedAt < m.completedAt ||
          m.attempts.some((a) => !a.correct && !resolved.includes(a.problemId)))
      )
        invalid("오답 재풀이 완료 시각이 올바르지 않습니다.");
      const ids = new Set(m.problems.map((p) => p.id));
      if (ids.size !== 12 || m.hintedProblemIds.some((id) => !ids.has(id)))
        invalid("미션 문제 식별자가 올바르지 않습니다.");
      if ((m.completedAt !== null) !== (m.attempts.length === 12))
        invalid("미션 완료 상태가 올바르지 않습니다.");
      if (new Set(m.hintedProblemIds).size !== m.hintedProblemIds.length)
        invalid("힌트 기록이 중복되었습니다.");
      if (m.completedAt && m.completedAt !== m.attempts.at(-1)?.answeredAt)
        invalid("미션 완료 시각이 올바르지 않습니다.");
      if (
        m.requests.length !== m.attempts.length ||
        m.attempts.some(
          (a, i) =>
            a.problemId !== m.problems[i]?.id ||
            m.requests[i]?.problemId !== a.problemId ||
            m.requests[i]?.missionId !== m.id ||
            m.requests[i]?.submittedAnswer !== a.submittedAnswer ||
            a.conceptId !== m.problems[i].conceptId ||
            a.templateId !== m.problems[i].templateId ||
            a.kind !== m.problems[i].kind ||
            a.usedHint !== m.hintedProblemIds.includes(a.problemId) ||
            Date.parse(a.answeredAt) <
              Date.parse(
                i === 0 ? m.startedAt : m.attempts[i - 1].answeredAt,
              ) ||
            a.correct !== gradeSrsAnswer(m.problems[i], a.submittedAnswer),
        )
      )
        invalid("미션 답안 순서가 올바르지 않습니다.");
    }
  });

export type StoredSrsState = z.infer<typeof payloadSchema>;
export type StoredSrsMission = StoredSrsState["missions"][number];

export class SrsConflict extends Error {
  constructor(
    message: string,
    readonly code: "CONFLICT" | "REVISION_MISMATCH" = "CONFLICT",
  ) {
    super(message);
  }
}
export class SrsUnavailable extends Error {}

export function emptySrsState(): StoredSrsState {
  return { version: 1, memories: createMemories(), missions: [] };
}

export function parseSrsState(payload: unknown): StoredSrsState {
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success)
    throw new SrsUnavailable(
      "저장된 학습 기록을 확인해야 합니다. 선생님께 알려 주세요.",
    );
  return parsed.data;
}

export function currentSrsMission(
  state: StoredSrsState,
  now: Date,
): StoredSrsMission | null {
  return (
    state.missions.find((m) => !m.completedAt) ??
    state.missions.find((m) =>
      m.attempts.some(
        (a) => !a.correct && !m.resolvedRetryProblemIds?.includes(a.problemId),
      ),
    ) ??
    state.missions.find((m) => m.date === kstDateOf(now)) ??
    state.missions.find(
      (m) =>
        kstDateOf(
          new Date(m.retryCompletedAt ?? m.completedAt ?? m.startedAt),
        ) === kstDateOf(now),
    ) ??
    null
  );
}

function asLearner(state: StoredSrsState, studentId: string): Learner {
  return {
    id: studentId,
    name: "",
    memories: state.memories,
    missions: state.missions,
  };
}

/**
 * 학생 서버 복습 미션을 연다. 문항은 폰 «한 걸음» 문항(원장님 확정 2026-09-27) — `supply` 는
 * 시험이 옛 숫자형 미션을 재현할 때만 바꾼다(이미 저장된 옛 미션은 그대로 이어서 풀린다).
 */
export function startSrsMission(
  state: StoredSrsState,
  studentId: string,
  now: Date,
  seed: number,
  newId: () => string,
  supply: MissionProblemSupply = quickMissionProblem,
): StoredSrsState {
  if (currentSrsMission(state, now)) return state;
  const mission = createMission(asLearner(state, studentId), now, seed, supply);
  // The engine's stable IDs include the seed. Server IDs are opaque instead.
  const saved: StoredSrsMission = {
    ...mission,
    id: newId(),
    date: kstDateOf(now),
    problems: mission.problems.map((p) => ({ ...p, id: newId() })),
    hintedProblemIds: [],
    requests: [],
  };
  return updateDailyJourney(state, {
    ...state,
    missions: [saved, ...state.missions].slice(0, 90),
  });
}

function getMission(
  state: StoredSrsState,
  input: MathSrsHintInput,
): StoredSrsMission {
  const mission = state.missions.find((m) => m.id === input.missionId);
  if (!mission)
    throw new SrsConflict(
      "미션이 변경되었습니다. 학습 기록을 다시 불러와 주세요.",
    );
  return mission;
}

function requireNext(mission: StoredSrsMission, problemId: string) {
  if (
    mission.completedAt ||
    mission.problems[mission.attempts.length]?.id !== problemId
  )
    throw new SrsConflict(
      "다음 문제 순서가 변경되었습니다. 학습 기록을 다시 불러와 주세요.",
    );
}

export function revealSrsHint(
  state: StoredSrsState,
  input: MathSrsHintInput,
): StoredSrsState {
  const mission = getMission(state, input);
  if (mission.hintedProblemIds.includes(input.problemId)) return state;
  requireNext(mission, input.problemId);
  return {
    ...state,
    missions: state.missions.map((m) =>
      m.id === mission.id
        ? { ...m, hintedProblemIds: [...m.hintedProblemIds, input.problemId] }
        : m,
    ),
  };
}

const sameRequest = (a: MathSrsAttemptInput, b: MathSrsAttemptInput) =>
  a.missionId === b.missionId &&
  a.problemId === b.problemId &&
  a.submittedAnswer === b.submittedAnswer &&
  a.rating === b.rating &&
  a.elapsedSeconds === b.elapsedSeconds;

export function submitSrsAttempt(
  state: StoredSrsState,
  studentId: string,
  input: MathSrsAttemptInput,
  now: Date,
): StoredSrsState {
  const mission = getMission(state, input);
  const previousRequest = mission.requests.find(
    (r) => r.problemId === input.problemId,
  );
  if (previousRequest) {
    if (sameRequest(previousRequest, input)) return state;
    throw new SrsConflict("이미 제출한 문제의 답안을 바꿀 수 없습니다.");
  }
  requireNext(mission, input.problemId);
  const problem = mission.problems[mission.attempts.length];
  const previousAt = mission.attempts.at(-1)?.answeredAt ?? mission.startedAt;
  const answeredAt = new Date(Math.max(now.getTime(), Date.parse(previousAt)));
  // The browser's timer is untrusted. Server elapsed time limits the rating;
  // refreshes, multiple tabs and a forged `elapsedSeconds` cannot claim a faster solve.
  const elapsedSeconds = Math.min(
    86_400,
    Math.max(0, (answeredAt.getTime() - Date.parse(previousAt)) / 1_000),
  );
  const learner = recordAttempt(asLearner(state, studentId), mission.id, {
    problemId: problem.id,
    conceptId: problem.conceptId,
    templateId: problem.templateId,
    kind: problem.kind,
    submittedAnswer: input.submittedAnswer,
    correct: gradeSrsAnswer(problem, input.submittedAnswer),
    usedHint: mission.hintedProblemIds.includes(problem.id),
    elapsedSeconds,
    rating: input.rating,
    answeredAt: answeredAt.toISOString(),
  });
  return updateDailyJourney(state, {
    ...state,
    memories: learner.memories,
    missions: state.missions.map((m) =>
      m.id === mission.id
        ? {
            ...(learner.missions.find((saved) => saved.id === m.id) as Mission),
            hintedProblemIds: m.hintedProblemIds,
            requests: [...m.requests, input],
            ...(m.resolvedRetryProblemIds
              ? { resolvedRetryProblemIds: m.resolvedRetryProblemIds }
              : {}),
          }
        : m,
    ),
  });
}

/** Retry correctness is server-owned; repeated submissions do not change scores or memory. */
export function recordSrsRetry(
  state: StoredSrsState,
  missionId: string,
  problemId: string,
  submittedAnswer: string,
  now: Date,
): StoredSrsState {
  const mission = state.missions.find((m) => m.id === missionId);
  const attempt = mission?.attempts.find((a) => a.problemId === problemId);
  const problem = mission?.problems.find((p) => p.id === problemId);
  if (!mission?.completedAt || !attempt || attempt.correct || !problem)
    throw new SrsConflict("첫 풀이를 마친 오답만 다시 풀 수 있어요.");
  if (
    !gradeSrsAnswer(problem, submittedAnswer) ||
    mission.resolvedRetryProblemIds?.includes(problemId)
  )
    return state;
  const resolved = [...(mission.resolvedRetryProblemIds ?? []), problemId];
  const complete = mission.attempts.every(
    (a) => a.correct || resolved.includes(a.problemId),
  );
  return updateDailyJourney(state, {
    ...state,
    missions: state.missions.map((m) =>
      m.id === mission.id
        ? {
            ...m,
            resolvedRetryProblemIds: resolved,
            ...(complete
              ? {
                  retryCompletedAt: new Date(
                    Math.max(now.getTime(), Date.parse(mission.completedAt!)),
                  ).toISOString(),
                }
              : {}),
          }
        : m,
    ),
  });
}
