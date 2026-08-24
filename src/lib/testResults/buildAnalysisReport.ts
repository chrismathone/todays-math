/**
 * 분석 리포트 집계 — 순수 함수. gradeAnswers()의 결과만으로 계산한다(06-tasks.md T7.1).
 *
 * - unitScores: 단원별 정답률(0~100) — (해당 단원 획득 점수 합) / (해당 단원 배점 합) × 100.
 * - difficultyDistribution: 난이도별 정답/전체 문항 수.
 * - recommendedUnits: 정답률이 RECOMMEND_THRESHOLD(60%) 미만인 단원을 낮은 순으로 최대
 *   RECOMMEND_LIMIT(3)개 추천한다. 전부 임계값 이상이면 빈 배열.
 */
import { DIFFICULTY_LADDER, type Difficulty } from "@/contracts/difficulty";

import type { GradedAnswer } from "./gradeAnswers";

export const RECOMMEND_THRESHOLD = 0.6;
export const RECOMMEND_LIMIT = 3;

/**
 * ⚠️ **손으로 나열하지 않는다** (D-106). 2026-08-25 에 갈래가 넷이 되었을 때
 *    여기가 셋으로 남아 `연산` 칸이 통째로 빠졌고, 그러면 계약(`z.record(difficultySchema,…)`)
 *    검증이 상세 조회에서 500 을 냈다. 타입이 `Difficulty[]` 라 **셋만 적어도 컴파일은
 *    통과한다** — 배열 길이는 타입이 안 세기 때문이다.
 */
const DIFFICULTY_KEYS: readonly Difficulty[] = DIFFICULTY_LADDER;

export interface AnalysisReportData {
  unitScores: Record<string, number>;
  difficultyDistribution: Record<
    Difficulty,
    { correct: number; total: number }
  >;
  recommendedUnits: string[];
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function buildAnalysisReport(
  graded: GradedAnswer[],
): AnalysisReportData {
  const unitAgg = new Map<string, { earned: number; possible: number }>();
  const difficultyDistribution = Object.fromEntries(
    DIFFICULTY_KEYS.map((d) => [d, { correct: 0, total: 0 }]),
  ) as Record<Difficulty, { correct: number; total: number }>;

  for (const g of graded) {
    const agg = unitAgg.get(g.unitId) ?? { earned: 0, possible: 0 };
    agg.earned += g.pointsEarned;
    agg.possible += g.maxPoints;
    unitAgg.set(g.unitId, agg);

    difficultyDistribution[g.difficulty].total += 1;
    if (g.isCorrect) difficultyDistribution[g.difficulty].correct += 1;
  }

  const unitScores: Record<string, number> = {};
  const unitRatios: Array<{ unitId: string; ratio: number }> = [];
  for (const [unitId, { earned, possible }] of unitAgg) {
    const ratio = possible > 0 ? earned / possible : 0;
    unitScores[unitId] = round1(ratio * 100);
    unitRatios.push({ unitId, ratio });
  }

  const recommendedUnits = unitRatios
    .filter((u) => u.ratio < RECOMMEND_THRESHOLD)
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, RECOMMEND_LIMIT)
    .map((u) => u.unitId);

  return { unitScores, difficultyDistribution, recommendedUnits };
}
