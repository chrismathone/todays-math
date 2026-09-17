/**
 * 🔴 RED → 🟢 — **시험지 만점 세기가 채점기와 같은 규칙인가** (D-134 트랙 2).
 *
 * 구현: src/lib/achievement/maxScore.ts · 대조: src/lib/testResults/gradeAnswers.ts
 *
 * 만점은 어디에도 저장돼 있지 않아 **다시 세는 수밖에 없다**. 규칙이 두 벌이 되면
 * 「100점 만점에 120점」 같은 지면이 나오는데, 두 파일이 서로를 안 보므로 아무도 안 운다.
 * 그래서 **채점기에 전부 정답을 먹여** 나온 합과 견준다 — 한쪽만 바뀌면 여기가 빨개진다.
 */
import { describe, expect, it } from "vitest";

import { type ProblemPoints, testMaxScore } from "@/lib/achievement/maxScore";
import {
  type AnswerInput,
  gradeAnswers,
  type GradingProblem,
} from "@/lib/testResults/gradeAnswers";

/** 같은 배점 목록을 채점기가 읽는 모양으로 옮긴다 — 전부 정답이면 받은 점수 = 만점이다. */
function allCorrect(points: ProblemPoints[]): number {
  const problems: GradingProblem[] = points.map((p, i) => ({
    id: `p${i}`,
    unitId: "u1",
    difficulty: "기본",
    answer: "3",
    score: p.score,
    adjustedScore: p.adjustedScore,
  }));
  const answers: AnswerInput[] = problems.map((p, i) => ({
    problemId: p.id,
    selectedChoice: 3,
    essayScore: null,
    sequence: i,
  }));
  return gradeAnswers(answers, problems).score;
}

const P = (
  adjustedScore: number | null,
  score: number | null = null,
): ProblemPoints => ({ adjustedScore, score });

describe("시험지 만점 — 채점기와 같은 규칙", () => {
  it("문항이 없으면 null 이다 — «0점 만점»이 아니다", () => {
    expect(testMaxScore([])).toBeNull();
  });

  it("배점이 하나도 없으면 균등 배분으로 100점이다 (일일테스트 8문항)", () => {
    const points = Array.from({ length: 8 }, () => P(null));
    expect(testMaxScore(points)).toBe(100);
    expect(testMaxScore(points)).toBe(allCorrect(points));
  });

  it("조정 배점(TestProblem.score)이 원본 배점(Problem.score)을 이긴다", () => {
    const points = [P(25, 3.5), P(25, 3.5), P(25, null), P(25, null)];
    expect(testMaxScore(points)).toBe(100);
    expect(testMaxScore(points)).toBe(allCorrect(points));
  });

  it("🔴 원본 배점만 섞이면 만점이 100 이 아니다 — 그것을 그대로 낸다(지어내지 않는다)", () => {
    // 11 §10.1 의 실제 자리: 5문항 중 2개가 3.5점, 3개는 NULL → 균등 배분 20점씩
    const points = [P(null, 3.5), P(null, 3.5), P(null), P(null), P(null)];
    expect(testMaxScore(points)).toBe(67);
    expect(testMaxScore(points)).toBe(allCorrect(points));
  });

  it("섞인 시험지에서도 채점기와 값이 같다", () => {
    const points = [P(12.5, 4), P(null, 4), P(null, null), P(30, null)];
    expect(testMaxScore(points)).toBe(allCorrect(points));
  });
});
