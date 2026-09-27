import { describe, expect, it } from "vitest";
import type { MathSrsPublicMission } from "@/contracts/mathSrs.contract";
import { comboAfter, comboToShow } from "@/lib/math-srs/combo";
import { suggestedRating } from "@/lib/math-srs/mission";

/**
 * 한 걸음 복습의 «연속 정답»(콤보) — 원장님 확정 규칙 ②ㄴ(2026-09-27, 05 §8.15).
 * 맞힘 · 힌트 없음 · 서버 시간 ≤ 목표 초 × 1.5 → 하나 더 / 늦은 정답 · 힌트 정답 · «아직 모르겠어요» → 그대로 / 틀림 → 0.
 * 3 이상이고 이번 답으로 늘었을 때만 정답 연출이 말한다.
 */
type Result = "fast" | "late" | "hint" | "skip" | "wrong";
type Step =
  | Result
  | {
      result: Result;
      elapsed?: number;
      expected?: number;
      rating?: "again" | "hard" | "good" | "easy";
    };

const id = (i: number) =>
  `55555555-5555-4555-8555-${String(i + 1).padStart(12, "0")}`;

/** 12문제 미션에 steps 만큼 답한 공개 미션. 기본: 목표 10초 · 맞히면 5초 · 늦으면 20초 */
function mission(
  steps: Step[],
): Pick<MathSrsPublicMission, "problems" | "attempts"> {
  const norm = steps.map((s) => (typeof s === "string" ? { result: s } : s));
  const problems = Array.from({ length: 12 }, (_, i) => ({
    id: id(i),
    templateId: "quick:two-step:solve",
    conceptId: "two-step" as const,
    conceptWeights: [{ conceptId: "two-step" as const, weight: 1 }],
    difficulty: 1 as const,
    kind: "quick" as const,
    prompt: "$x$ 의 값은?",
    equation: "$2x=6$",
    answerChoices: ["$3$", "$4$", "$6$", "$12$"],
    expectedSeconds: norm[i]?.expected ?? 10,
    hint: null,
    feedback: null,
  }));
  const attempts = norm.map((s, i) => ({
    problemId: id(i),
    conceptId: "two-step" as const,
    templateId: "quick:two-step:solve",
    kind: "quick" as const,
    submittedAnswer:
      s.result === "skip" ? "" : s.result === "wrong" ? "$4$" : "$3$",
    correct: s.result === "fast" || s.result === "late" || s.result === "hint",
    rating:
      s.rating ??
      (s.result === "fast"
        ? ("good" as const)
        : s.result === "skip" || s.result === "wrong"
          ? ("again" as const)
          : ("hard" as const)),
    usedHint: s.result === "hint",
    elapsedSeconds: s.elapsed ?? (s.result === "late" ? 20 : 5),
    answeredAt: new Date(Date.UTC(2026, 8, 27, 1, 0, i)).toISOString(),
  }));
  return { problems, attempts };
}
const shown = (steps: Step[]) =>
  steps.map((_, i) => comboToShow(mission(steps), id(i)));

describe("콤보 — 규칙 ②ㄴ", () => {
  it("빠른 정답 셋째부터 말하고, 그 전에는 말하지 않는다", () => {
    expect(shown(["fast", "fast", "fast", "fast"])).toEqual([null, null, 3, 4]);
  });

  it("목표 초의 1.5배까지는 하나 더, 넘으면 그대로(끊지도 않음)", () => {
    const at = (elapsed: number) =>
      comboAfter(
        mission(["fast", "fast", { result: "fast", elapsed, expected: 8 }]),
      );
    expect(at(11.9)).toBe(3);
    expect(at(12)).toBe(3);
    expect(at(12.1)).toBe(2);
  });

  it("힌트를 쓰고 맞히면 1.5배 안이어도 그대로", () => {
    for (const elapsed of [5, 12, 12.1])
      expect(
        comboAfter(
          mission(["fast", "fast", { result: "hint", elapsed, expected: 8 }]),
        ),
      ).toBe(2);
  });

  it("2초 바닥이 없다 — 서버 시간 1.9초 정답도 하나 더(규칙 문장대로, 합의 결정 6)", () => {
    expect(
      comboAfter(mission(["fast", "fast", { result: "fast", elapsed: 1.9 }])),
    ).toBe(3);
  });

  it("«아직 모르겠어요»는 그대로 · 틀리면 0", () => {
    expect(comboAfter(mission(["fast", "fast", "skip"]))).toBe(2);
    expect(comboAfter(mission(["fast", "fast", "wrong"]))).toBe(0);
    expect(shown(["fast", "fast", "skip", "fast"])).toEqual([
      null,
      null,
      null,
      3,
    ]);
  });

  it("늦은 정답 · 모르겠어요 · 틀림의 연출은 콤보를 말하지 않는다", () => {
    expect(shown(["fast", "fast", "fast", "late", "skip", "wrong"])).toEqual([
      null,
      null,
      3,
      null,
      null,
      null,
    ]);
  });

  it("끊긴 뒤에는 처음부터 다시 — 셋째에서 다시 3", () => {
    expect(
      shown(["fast", "fast", "fast", "wrong", "fast", "fast", "fast"]),
    ).toEqual([null, null, 3, null, null, null, 3]);
  });

  it("12문제 모두 빠른 정답이면 마지막에 12(합의 결정 7 — 같은 문장)", () => {
    expect(shown(Array(12).fill("fast")).at(-1)).toBe(12);
  });

  it("시안의 한 판(늦음 · 모르겠어요 · 틀림이 섞인 12문제)을 손으로 센 값과 같다", () => {
    const run: Step[] = [
      "fast",
      "fast",
      "fast",
      "fast",
      "late",
      "fast",
      "skip",
      "fast",
      "wrong",
      "fast",
      "fast",
      "fast",
    ];
    expect(run.map((_, i) => comboAfter(mission(run.slice(0, i + 1))))).toEqual(
      [1, 2, 3, 4, 4, 5, 5, 6, 0, 1, 2, 3],
    );
  });

  it("목표 초는 그 시도의 문제에서 가져온다(문제마다 다르다)", () => {
    // 셋째 문제만 목표 4초 → 1.5배 6초. 5초는 안, 7초는 늦음
    expect(
      comboAfter(
        mission(["fast", "fast", { result: "fast", elapsed: 5, expected: 4 }]),
      ),
    ).toBe(3);
    expect(
      comboAfter(
        mission(["fast", "fast", { result: "fast", elapsed: 7, expected: 4 }]),
      ),
    ).toBe(2);
  });

  it("화면이 보낸 rating 을 믿지 않는다 — 서버가 매긴 맞음 · 시간 · 힌트로만 센다", () => {
    expect(
      comboAfter(
        mission(["fast", "fast", { result: "fast", rating: "again" }]),
      ),
    ).toBe(3);
    expect(
      comboAfter(mission(["fast", "fast", { result: "late", rating: "good" }])),
    ).toBe(2);
    expect(
      comboAfter(
        mission(["fast", "fast", { result: "wrong", rating: "good" }]),
      ),
    ).toBe(0);
  });

  it("아직 답하지 않은 문제 · 미션에 없는 문제는 말하지 않는다", () => {
    const m = mission(["fast", "fast", "fast"]);
    expect(comboToShow(m, id(5))).toBeNull();
    expect(comboToShow(m, "00000000-0000-4000-8000-000000000000")).toBeNull();
  });

  it("빈 미션은 0", () => {
    expect(comboAfter(mission([]))).toBe(0);
  });

  it("2초 이상에서는 기억 판정(suggestedRating «good»)과 같은 1.5배 잣대다", () => {
    for (const expected of [8, 10, 14, 20])
      for (const elapsed of [
        2,
        5,
        expected,
        expected * 1.5 - 0.01,
        expected * 1.5,
        expected * 1.5 + 0.01,
        expected * 3,
      ])
        for (const usedHint of [false, true]) {
          const m = mission([
            "fast",
            "fast",
            { result: usedHint ? "hint" : "fast", elapsed, expected },
          ]);
          const counted = comboAfter(m) === 3;
          expect(
            counted,
            `${expected}초 목표 · ${elapsed}초 · 힌트 ${usedHint}`,
          ).toBe(suggestedRating(true, usedHint, elapsed, expected) === "good");
        }
  });
});
