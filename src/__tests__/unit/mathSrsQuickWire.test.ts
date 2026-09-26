// @vitest-environment node
/**
 * 폰 «한 걸음» 문항을 학생 서버 복습 미션에 연결(원장님 확정 2026-09-27) — 무엇이 바뀌고 무엇이 그대로인가.
 *
 * - 학생 서버 미션(`startSrsMission`)은 12문항 모두 한 걸음 보기형 — B2 저장 규칙(`srsChoiceIssue`)을 통과하고,
 *   학생에게는 저장된 보기가 그대로 나간다.
 * - 🔴 원장님 연구실(`/lab/math-srs/algebra`)이 쓰는 `createMission` 기본 공급은 숫자 엔진 그대로다.
 *   (연구실이 quick 에 닿지 않는 것은 `mathSrsQuickFence.test.ts` 가 import 사슬로 막는다)
 * - 미션 구성(kind 순서·개념·난이도·12문항)은 그대로이고, 발문+식 중복 다시 뽑기가 수천 번에 한 번도 끝나지 않고
 *   남지 않는다.
 * - 목표 초(8~20)가 평가(rating) 상한에 실제로 쓰인다.
 * - 이미 저장된 옛 숫자형 미션(진행 중 포함)은 그대로 이어서 풀리고 채점되며, 새 한 걸음 미션과 섞여도 읽힌다.
 * - 다시 보기의 `regenerated` 갈래(잘린 옛 일차)도 한 걸음 문항으로 새로 만든다.
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { mathSrsStateResponseSchema } from "@/contracts/mathSrs.contract";
import { mathSrsReplayResponseSchema } from "@/contracts/mathSrsReplay.contract";
import { dailyJourneyDto } from "@/lib/math-srs/dailyJourney";
import { ENGINE_CATALOG, generateProblem } from "@/lib/math-srs/generator";
import { createMemories } from "@/lib/math-srs/memory";
import { createMission } from "@/lib/math-srs/mission";
import { numericAnswerChoices } from "@/lib/math-srs/numericAnswerChoices";
import { generateQuickItem } from "@/lib/math-srs/quick/types";
import { quickMissionProblem } from "@/lib/math-srs/quickMission";
import { replayProblem } from "@/lib/math-srs/replay";
import { publicSrsMission, srsStateDto } from "@/lib/math-srs/serverDto";
import {
  currentSrsMission,
  emptySrsState,
  parseSrsState,
  recordSrsRetry,
  startSrsMission,
  submitSrsAttempt,
  type StoredSrsState,
} from "@/lib/math-srs/serverState";
import {
  correctSrsChoice,
  gradeSrsAnswer,
  srsChoiceIssue,
} from "@/lib/math-srs/sharedAnswers";
import {
  CONCEPT_IDS,
  type Difficulty,
  type Learner,
} from "@/lib/math-srs/types";

const studentId = randomUUID();
const now = new Date("2026-09-27T03:00:00.000Z");
const tomorrow = new Date("2026-09-28T03:00:00.000Z");
const at = (base: Date, seconds: number) =>
  new Date(base.getTime() + seconds * 1_000);
type Problem = StoredSrsState["missions"][number]["problems"][number];
const right = (p: Problem) => correctSrsChoice(p) ?? String(p.answer);
const wrongOf = (p: Problem) =>
  p.choices ? p.choices[(p.answer + 1) % 4]! : String(p.answer + 999);
const contentKey = (p: { prompt: string; equation: string }) =>
  `${p.prompt}\n${p.equation}`;
const context = {
  student: {
    id: studentId,
    name: "서연",
    classId: randomUUID(),
    className: "중1",
  },
  currentProgress: null,
  lectures: [],
};

/** 오늘 미션의 다음 문제를 `answer(p)` 로 낸다 */
function answerNext(
  state: StoredSrsState,
  answer: (p: Problem) => string,
  when: Date,
  rating: "again" | "hard" | "good" | "easy" = "good",
): StoredSrsState {
  const mission = currentSrsMission(state, when)!;
  const problem = mission.problems[mission.attempts.length]!;
  return submitSrsAttempt(
    state,
    studentId,
    {
      missionId: mission.id,
      problemId: problem.id,
      submittedAnswer: answer(problem),
      elapsedSeconds: 10,
      rating,
    },
    when,
  );
}

describe("어댑터(quickMission.ts)", () => {
  it("한 걸음 문항을 그대로 옮긴다 — 보기 순서 · 정답 번호 · 발문 · 식 · 풀이 · 목표 초", () => {
    for (const conceptId of CONCEPT_IDS)
      for (const difficulty of [1, 3, 5] as Difficulty[])
        for (const seed of [1, 2, 3, 40, 500]) {
          const item = generateQuickItem({ conceptId, difficulty, seed });
          const p = quickMissionProblem({
            conceptId,
            difficulty,
            seed,
            kind: "boss",
          });
          expect(p).toMatchObject({
            templateId: item.templateId,
            conceptId,
            difficulty: item.difficulty,
            kind: "boss",
            prompt: item.prompt,
            equation: item.equation,
            choices: item.choices,
            answer: item.answerIndex,
            hint: item.hint,
            solution: item.solution,
            expectedSeconds: item.expectedSeconds,
          });
          expect(p.conceptWeights[0]).toEqual({ conceptId, weight: 1 });
        }
  });
});

describe("학생 서버 미션 = 폰 한 걸음 문항", () => {
  it("12문항 모두 보기 4개 · 정답 번호 · 숫자 정답 표기/종이 엔진 출처 없음 · 저장 규칙 통과", () => {
    const state = startSrsMission(
      emptySrsState(),
      studentId,
      now,
      71,
      randomUUID,
    );
    const problems = state.missions[0]!.problems;
    expect(problems).toHaveLength(12);
    for (const p of problems) {
      expect(p.templateId.startsWith("quick:"), p.templateId).toBe(true);
      expect(p.choices).toHaveLength(4);
      expect(Number.isInteger(p.answer) && p.answer >= 0 && p.answer < 4).toBe(
        true,
      );
      expect(p).not.toHaveProperty("answerText");
      expect(p).not.toHaveProperty("answerUnit");
      expect(p).not.toHaveProperty("source");
      expect(srsChoiceIssue(p)).toBeNull();
      expect(p.expectedSeconds).toBeGreaterThanOrEqual(8);
      expect(p.expectedSeconds).toBeLessThanOrEqual(20);
      // 원장님 확정 — 식은 발문 아래 줄에 따로(문장제는 비움)
      if (p.conceptId === "word") expect(p.equation).toBe("");
      else expect(p.equation).toMatch(/^\$[^$]+\$$/);
    }
    // 저장 스키마(엄격)가 그대로 읽는다 — JSON 왕복까지
    expect(parseSrsState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });

  it("학생에게는 저장된 보기가 순서 그대로 나가고, 정답은 풀기 전에 안 보인다", () => {
    const state = startSrsMission(
      emptySrsState(),
      studentId,
      now,
      71,
      randomUUID,
    );
    const dto = srsStateDto(context, { revision: 1, state }, now);
    expect(mathSrsStateResponseSchema.safeParse({ data: dto }).success).toBe(
      true,
    );
    dto.mission!.problems.forEach((p, i) => {
      expect(p.answerChoices).toEqual(state.missions[0]!.problems[i]!.choices);
      expect(p.feedback).toBeNull();
      expect(p).not.toHaveProperty("answer");
      expect(p.equation).toBe(state.missions[0]!.problems[i]!.equation);
    });
  });

  it("정답 보기 글자만 맞고, 번호·다른 보기는 틀리며, 12문항을 끝까지 풀 수 있다", () => {
    let state = startSrsMission(
      emptySrsState(),
      studentId,
      now,
      71,
      randomUUID,
    );
    const first = state.missions[0]!.problems[0]!;
    expect(gradeSrsAnswer(first, right(first))).toBe(true);
    expect(gradeSrsAnswer(first, String(first.answer))).toBe(false);
    expect(gradeSrsAnswer(first, wrongOf(first))).toBe(false);
    for (let i = 0; i < 12; i += 1)
      state = answerNext(
        state,
        i % 3 === 0 ? wrongOf : right,
        at(now, 10 * (i + 1)),
      );
    const mission = state.missions[0]!;
    expect(mission.completedAt).not.toBeNull();
    expect(mission.attempts.map((a) => a.correct)).toEqual(
      Array.from({ length: 12 }, (_, i) => i % 3 !== 0),
    );
    // 풀이 뒤 정답은 정답 보기 글자
    const view = publicSrsMission(mission);
    view.problems.forEach((p, i) =>
      expect(p.feedback?.answer).toBe(right(mission.problems[i]!)),
    );
    expect(parseSrsState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });

  it("목표 초(8~20)가 평가 상한에 쓰인다 — 한 걸음 목표의 1.5배를 넘기면 «hard»", () => {
    const base = startSrsMission(
      emptySrsState(),
      studentId,
      now,
      71,
      randomUUID,
    );
    const first = base.missions[0]!.problems[0]!;
    const expected = first.expectedSeconds;
    // 숫자 엔진의 목표(최소 27초)였다면 이 시간은 «hard» 가 아니다
    const slow = Math.ceil(expected * 1.6);
    expect(slow).toBeLessThan(27);
    const slowState = answerNext(base, right, at(now, slow), "easy");
    expect(slowState.missions[0]!.attempts[0]).toMatchObject({
      correct: true,
      rating: "hard",
    });
    const fast = Math.max(2, Math.floor(expected * 0.7));
    const fastState = answerNext(base, right, at(now, fast), "easy");
    expect(fastState.missions[0]!.attempts[0]).toMatchObject({
      correct: true,
      rating: "easy",
    });
  });
});

describe("🔴 원장님 연구실은 숫자형 그대로", () => {
  const learner = (): Learner => ({
    id: "lab",
    name: "연구실",
    memories: createMemories(),
    missions: [],
  });
  const catalogKeys = new Set(ENGINE_CATALOG.map((e) => e.key));

  it("createMission 기본 공급은 숫자 엔진 — 보기형 문항이 한 개도 없다", () => {
    for (const seed of [1, 71, 2026, 90001, 424242]) {
      const mission = createMission(learner(), now, seed);
      for (const p of mission.problems) {
        expect(p.choices).toBeUndefined();
        expect(p.source?.engine).toBe("middle");
        expect(catalogKeys.has(p.templateId), p.templateId).toBe(true);
      }
    }
  });

  it("같은 씨앗의 연구실 미션은 숫자 엔진을 밝혀 넘긴 것과 한 글자도 다르지 않다", () => {
    for (const seed of [3, 71, 555])
      expect(createMission(learner(), now, seed)).toEqual(
        createMission(learner(), now, seed, generateProblem),
      );
  });
});

describe("미션 구성은 그대로 · 다시 뽑기는 끝난다", () => {
  it("kind 순서 · 12문항 · 요청 난이도가 그대로다(빈 기록: 기본 2 + 칸별 가감)", () => {
    const state = startSrsMission(
      emptySrsState(),
      studentId,
      now,
      71,
      randomUUID,
    );
    const problems = state.missions[0]!.problems;
    expect(problems.map((p) => p.kind)).toEqual([
      "warmup",
      "quick",
      "memory",
      "training",
      "memory",
      "quick",
      "training",
      "training",
      "memory",
      "training",
      "quick",
      "boss",
    ]);
    expect(problems.map((p) => p.difficulty)).toEqual([
      1, 1, 2, 3, 2, 1, 2, 2, 2, 3, 1, 4,
    ]);
  });

  it("개념 × 난이도 × 씨앗 1,000 — 한 걸음 공급이 한 번도 실패하지 않고 저장 규칙을 지킨다", () => {
    for (const conceptId of CONCEPT_IDS)
      for (const difficulty of [1, 2, 3, 4, 5] as Difficulty[])
        for (let seed = 1; seed <= 1_000; seed += 1) {
          const p = quickMissionProblem({ conceptId, difficulty, seed });
          if (srsChoiceIssue(p) !== null || p.difficulty !== difficulty)
            throw new Error(
              `${conceptId} d${difficulty} 씨앗 ${seed}: ${srsChoiceIssue(p)}`,
            );
        }
  });

  it("기록 셋(빈 기록 · 다 맞힌 뒤 · 오답이 섞인 뒤) × 씨앗 1,000 = 미션 3,000개 — 발문+식 중복 0 · 실패 0", () => {
    const empty = emptySrsState();
    let solved = startSrsMission(empty, studentId, now, 11, randomUUID);
    for (let i = 0; i < 12; i += 1)
      solved = answerNext(solved, right, at(now, 10 * (i + 1)));
    let missed = startSrsMission(empty, studentId, now, 12, randomUUID);
    for (let i = 0; i < 12; i += 1)
      missed = answerNext(
        missed,
        i < 4 ? wrongOf : right,
        at(now, 10 * (i + 1)),
      );
    const learners: Learner[] = [empty, solved, missed].map((s) => ({
      id: studentId,
      name: "",
      memories: s.memories,
      missions: s.missions,
    }));
    let made = 0;
    for (const learner of learners)
      for (let seed = 1; seed <= 1_000; seed += 1) {
        const mission = createMission(
          learner,
          tomorrow,
          seed * 7919,
          quickMissionProblem,
        );
        const keys = new Set(mission.problems.map(contentKey));
        if (
          keys.size !== 12 ||
          mission.problems.some((p) => srsChoiceIssue(p) !== null)
        )
          throw new Error(`씨앗 ${seed}: 중복 ${12 - keys.size}`);
        made += 1;
      }
    expect(made).toBe(3_000);
  });
});

describe("옛 숫자형 미션과 섞인 상태", () => {
  /** 한 걸음 연결 전 오늘 시작한 숫자형 미션 — 다섯 문제 풀고(첫 문제는 오답) 멈춘 상태 */
  function oldInProgress() {
    let state = startSrsMission(
      emptySrsState(),
      studentId,
      now,
      71,
      randomUUID,
      generateProblem,
    );
    for (let i = 0; i < 5; i += 1)
      state = answerNext(
        state,
        i === 0 ? wrongOf : right,
        at(now, 10 * (i + 1)),
      );
    return parseSrsState(JSON.parse(JSON.stringify(state)));
  }

  it("진행 중인 옛 숫자형 미션이 그대로 이어지고, 숫자로 채점되며, 보기는 예전 계산 그대로다", () => {
    let state = oldInProgress();
    expect(
      state.missions[0]!.problems.every((p) => p.choices === undefined),
    ).toBe(true);
    // 새 미션을 만들지 않고 옛 미션을 이어 간다
    expect(startSrsMission(state, studentId, at(now, 60), 99, randomUUID)).toBe(
      state,
    );
    const mission = state.missions[0]!;
    const view = publicSrsMission(mission);
    view.problems.forEach((p, i) =>
      expect(p.answerChoices).toEqual(
        numericAnswerChoices(mission.problems[i]!, mission.problems),
      ),
    );
    for (let i = 5; i < 12; i += 1)
      state = answerNext(state, right, at(now, 10 * (i + 1)));
    expect(state.missions[0]!.completedAt).not.toBeNull();
    expect(state.missions[0]!.attempts.filter((a) => a.correct)).toHaveLength(
      11,
    );
    // 오답 재풀이는 숫자로
    const wrong = state.missions[0]!.problems[0]!;
    expect(
      recordSrsRetry(state, mission.id, wrong.id, wrongOf(wrong), tomorrow),
    ).toBe(state);
    // 재풀이 전에는 내일도 새 미션을 열지 않는다(예전 규칙)
    expect(startSrsMission(state, studentId, tomorrow, 82, randomUUID)).toBe(
      state,
    );
    state = recordSrsRetry(state, mission.id, wrong.id, right(wrong), tomorrow);
    expect(state.missions[0]!.resolvedRetryProblemIds).toEqual([wrong.id]);
  });

  it("다음 날 새 미션은 한 걸음 — 두 종류가 한 기록에 섞여도 저장·전달·다시 보기가 된다", () => {
    let state = oldInProgress();
    for (let i = 5; i < 12; i += 1)
      state = answerNext(state, right, at(now, 10 * (i + 1)));
    const old = state.missions[0]!;
    state = recordSrsRetry(
      state,
      old.id,
      old.problems[0]!.id,
      right(old.problems[0]!),
      at(now, 200),
    );
    state = startSrsMission(state, studentId, tomorrow, 82, randomUUID);
    expect(state.missions).toHaveLength(2);
    const [fresh, previous] = state.missions as [
      StoredSrsState["missions"][number],
      StoredSrsState["missions"][number],
    ];
    expect(fresh.problems.every((p) => p.choices?.length === 4)).toBe(true);
    expect(previous.problems.every((p) => p.choices === undefined)).toBe(true);
    // 저장(JSON 왕복)과 학생 전달
    expect(parseSrsState(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const dto = srsStateDto(context, { revision: 3, state }, tomorrow);
    expect(mathSrsStateResponseSchema.safeParse({ data: dto }).success).toBe(
      true,
    );
    expect(dto.mission!.id).toBe(fresh.id);
    // 새 미션 첫 문제를 풀고 다시 보기 — 저장 보기 그대로, 보기 글자로 채점
    state = answerNext(state, right, at(tomorrow, 10));
    const quickView = replayProblem(state, "middle", 1, at(tomorrow, 20));
    expect(quickView.answerChoices).toEqual(fresh.problems[0]!.choices);
    const q = fresh.problems[0]!;
    expect(
      replayProblem(state, "middle", 1, at(tomorrow, 20), {
        kind: "middle",
        step: 1,
        missionId: fresh.id,
        problemId: q.id,
        submittedAnswer: right(q),
      }).correct,
    ).toBe(true);
    // 옛 숫자형 미션의 다시 보기 — 숫자로 채점
    const n = previous.problems[2]!;
    expect(
      replayProblem(state, "middle", 3, at(tomorrow, 20), {
        kind: "middle",
        step: 3,
        missionId: previous.id,
        problemId: n.id,
        submittedAnswer: String(n.answer),
      }).correct,
    ).toBe(true);
  });
});

describe("다시 보기 regenerated 갈래(잘린 옛 일차)", () => {
  it("한 걸음 문항으로 새로 만들고, 보기 넷 중 정답 하나만 맞는다", () => {
    let state = startSrsMission(
      emptySrsState(),
      studentId,
      now,
      71,
      randomUUID,
    );
    for (let i = 0; i < 12; i += 1)
      state = answerNext(state, right, at(now, 10 * (i + 1)));
    const dayId = dailyJourneyDto(state, "middle", now).days[0]!.id;
    const archived = { ...state, missions: [] };
    const review = replayProblem(
      archived,
      "middle",
      12,
      tomorrow,
      undefined,
      dayId,
    );
    expect(review.regenerated).toBe(true);
    expect(
      mathSrsReplayResponseSchema.safeParse({ data: review }).success,
    ).toBe(true);
    expect(review.answerChoices).toHaveLength(4);
    // 한 걸음 문항이다 — 발문이 «…?» 로 끝난다(숫자 엔진 발문은 «…구하시오.» 꼴)
    expect(review.content.split("\n\n")[0]).toMatch(/\?$/);
    expect(review.content).not.toMatch(/시오/);
    const hits = review.answerChoices!.filter(
      (choice) =>
        replayProblem(
          archived,
          "middle",
          12,
          tomorrow,
          {
            kind: "middle",
            step: 12,
            dayId,
            problemId: review.problemId,
            submittedAnswer: choice,
          },
          dayId,
        ).correct,
    );
    expect(hits).toHaveLength(1);
    // 같은 일차는 늘 같은 문항
    expect(
      replayProblem(archived, "middle", 12, tomorrow, undefined, dayId),
    ).toEqual(review);
  });
});
