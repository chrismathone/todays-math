/**
 * 🔴 RED → 🟢 — **결시가 «조회 → 팩터»까지 건너오나** (Hi-fi 브리프 §1 #1 · 트랙 1 보고서 ⑤-D).
 *
 * 구현: src/lib/achievement/load.ts · src/lib/achievement/resultSelect.ts · src/lib/achievement/collect.ts
 *
 * 덫 시험(`achievementResultSelect.test.ts`)은 «select 에 칸이 있나»만 본다. 칸이 있어도 읽는 쪽이
 * 덕 타이핑이거나 `?? 0` 을 적으면 결시가 또 0점짜리 응시자가 된다. 그래서 **DB 가 돌려주는 모양**
 * (Prisma 가 주는 그대로 — `absent` · `score: null`)을 조회에 먹이고, 팩터까지 끝까지 따라간다.
 *
 * ⚠️ `prismaTestDouble` 은 `test_result` 의 중첩 select·관계 조건(`test: { testDate }`)을 몰라서
 *    여기서는 `@/lib/db` 를 이 파일 안의 가짜로 바꾼다 — 조회가 **무엇을 물었는지**(select)도 같이 본다.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const state = vi.hoisted(() => ({
  results: [] as unknown[],
  resultSelect: null as unknown,
}));

vi.mock("@/lib/db", () => ({
  db: {
    student: {
      findUnique: async () => ({
        id: "s1",
        name: "김하나",
        classId: "c1",
        useIndividualProgress: false,
        class: { name: "초등M 초5 MS1A", grade: "초5" },
      }),
    },
    progress: {
      findMany: async () => [
        {
          id: "p1",
          classId: "c1",
          studentId: null,
          unitId: "u1",
          recordedAt: new Date("2026-08-03T00:00:00.000Z"),
          createdAt: new Date("2026-08-03T09:00:00.000Z"),
        },
      ],
    },
    testResult: {
      findMany: async (args: { select: unknown }) => {
        state.resultSelect = args.select;
        return state.results;
      },
    },
    testProblem: {
      findMany: async () =>
        ["t1", "t2"].flatMap((testId) =>
          [1, 2].map(() => ({ testId, score: null, problem: { score: null } })),
        ),
    },
    progressPlan: { findMany: async () => [] },
    unit: {
      findMany: async () => [
        {
          id: "u1",
          grade: "초5",
          chapter: "2. 소수의 곱셈",
          section: "소단원",
          orderIndex: 1,
        },
      ],
    },
    conceptLecture: { findMany: async () => [] },
    conceptLectureView: { findMany: async () => [] },
  },
}));

import { collectAchievement } from "@/lib/achievement/collect";
import { loadAchievementInput } from "@/lib/achievement/load";

const PERIOD = { from: "2026-08-01", to: "2026-08-31" };

/** Prisma 가 `RESULT_SELECT` 로 돌려주는 모양 그대로. */
const row = (over: {
  testId: string;
  day: string;
  score: number | null;
  absent: boolean;
  answers?: { isCorrect: boolean }[];
}) => ({
  testId: over.testId,
  takenAt: new Date(`${over.day}T09:00:00.000Z`),
  score: over.score,
  absent: over.absent,
  test: { testDate: new Date(`${over.day}T00:00:00.000Z`) },
  answers: (over.answers ?? []).map((a) => ({
    isCorrect: a.isCorrect,
    problem: { unitId: "u1", difficulty: "기본" },
  })),
  analysisReport: over.absent ? null : { recommendedUnits: [] },
});

const load = async () => {
  const input = await loadAchievementInput({ studentId: "s1", period: PERIOD });
  if (input === null) throw new Error("학생이 없다");
  return input;
};

beforeEach(() => {
  state.results = [];
  state.resultSelect = null;
});

describe("🔴 결시 — DB 에서 팩터까지", () => {
  it("조회가 결시 칸을 **물어본다**", async () => {
    await load();
    expect(state.resultSelect).toMatchObject({ absent: true, score: true });
  });

  it("🔴 결시 행(score NULL)은 결시로 건너오고 평균에 0점으로 안 실린다", async () => {
    state.results = [
      row({
        testId: "t1",
        day: "2026-08-06",
        score: 80,
        absent: false,
        answers: [{ isCorrect: true }, { isCorrect: false }],
      }),
      row({ testId: "t2", day: "2026-08-13", score: null, absent: true }),
    ];
    const input = await load();
    expect(input.results.map((r) => [r.testId, r.absent, r.score])).toEqual([
      ["t1", false, 80],
      ["t2", true, null],
    ]);

    const f = collectAchievement(input);
    expect(f.scored.absentRounds?.map((r) => r.testId)).toEqual(["t2"]);
    expect(f.scored.rounds?.map((r) => r.testId)).toEqual(["t1"]);
    // 결시를 0점으로 실으면 40 이다
    expect(f.scored.averagePercent).toBe(80);
  });

  it("🔴 결시가 아닌데 점수가 없는 행(«없는 값»)도 0점이 아니다 — 평균은 null", async () => {
    state.results = [
      row({ testId: "t1", day: "2026-08-06", score: null, absent: false }),
    ];
    const f = collectAchievement(await load());
    expect(f.scored.rounds?.[0]?.score).toBeNull();
    expect(f.scored.averagePercent).toBeNull();
  });
});
