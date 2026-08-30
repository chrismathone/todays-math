/**
 * 학생 개인 예상 점수 — v0 잠정 placeholder.
 *
 * ⚠️ 반드시 읽을 것 (T7.1 완료 보고에도 동일 내용을 남겼다):
 *
 * docs/planning/11-score-predictor.md §1은 예측 산출물을 3가지로 나눈다 —
 *   A. 시험 청사진(그 학교 다음 시험의 문항 수·유형·난이도·배점 구조)
 *   B. 학생 개인 예상 점수("과거 기출 문항별 정오 → 능력 추정 → A의 청사진에 적용")
 *   C. 예측 문제지
 *
 * 이 프로젝트(워크트리 `기출-예상-점수-판독기`, 브랜치 BIGSHOL/기출-예상-점수-판독기)에는
 * A만 구현되어 있다(`src/lib/predictor/{blueprint,distance,series,predictBlueprint}.ts` +
 * `src/contracts/predictor.contract.ts`, 2026-08-15 확인). 그 A 엔진은 "학교가 다음에 낼
 * 시험의 구조"를 과거 시험지들의 청사진으로 예측하는 것이지, "이 학생이 이번 시험에서 몇 점을
 * 받을지"를 계산하지 않는다 — 함수 시그니처(PredictInput: series/target/history/cohort)에
 * 학생 응답이 아예 들어가지 않는다. B(능력 추정 알고리즘)는 설계 문서에도 개념만 있고
 * 구체적인 산식이 아직 없다("설계 확정 전 초안" 상태, 11-score-predictor.md 상단).
 *
 * 또한 이 태스크(T7.1)가 실행된 워크트리(agent-a8499cba62ba084a9)는 위 predictor 엔진 파일들이
 * 존재하지 않는 별도 브랜치라, 그대로 import할 수도 없다 — 가져오려면 스키마 정합
 * (그쪽 난이도 라벨 하/중/상 vs 이 프로젝트의 Difficulty easy/mid/hard, ExamSeriesKey 등)까지
 * 맞추는 별도 이식 작업이 필요하다.
 *
 * 그래서 v0는 지금 이 제출 건에서 실제로 갖고 있는 신호(자동 채점 결과 + 문항 난이도)만으로,
 * 원장이 화면에 "예상 점수(잠정)"로 바로 노출할 수 있는 최소한의 추정치를 낸다. 원리는 실제
 * 엔진(predictBlueprint.ts)의 설계 철학과 같은 축소(shrinkage) — 근거가 약할수록 안전한 값
 * (=실채점 점수 자체) 쪽으로 당기고, 보정 폭을 작게 제한한다:
 *
 *   predictedScore = score + adjustment
 *   adjustment = clamp(-MAX_ADJUSTMENT, MAX_ADJUSTMENT, avgDifficultyWeight(오답 문항) × MAX_ADJUSTMENT)
 *
 * 오답이 어려운(상) 문항에 몰려 있으면 양의 보정(실력은 점수보다 나을 가능성), 오답이 쉬운(하)
 * 문항에 몰려 있으면 음의 보정(쉬운 문제를 놓쳐 실수/기초 결손 가능성)을 준다. 오답이 없으면
 * 보정 없음(=score 그대로).
 *
 * 후속 작업: predictor 엔진(A)을 이 프로젝트로 이식하고, B(능력 추정)를 실제로 설계·구현하는
 * 별도 태스크가 필요하다. 그 전까지 이 함수의 결과는 "예상 점수(잠정)"로만 표기해야 한다.
 */
import {
  CORE_DIFFICULTIES,
  DIFFICULTY_LADDER,
  type Difficulty,
} from "@/contracts/difficulty";

import type { GradedAnswer } from "@/lib/testResults/gradeAnswers";

/**
 * 오답 문항 난이도별 보정 방향 — 어려운 갈래를 틀렸으면 +, 쉬운 갈래를 틀렸으면 −.
 *
 * ⚠️ 2026-08-25(D-106) 에 갈래가 넷이 되었다. 예전 셋(−1 / 0 / +1)을 그대로 옮기면
 *    밑단이 하나 늘어난 만큼 아래가 비어 버린다. 한 칸에 ⅔씩 — 연산 −1 · 기본 −⅓ ·
 *    응용 +⅓ · 심화하 +1. (v0 잠정치라 정밀한 값이 아니다. 방향과 폭만 지킨다.)
 *
 * 🔴 **눈금을 사다리 «길이»로 나누면 안 된다** (D-113, 2026-08-30).
 *    종전에는 `(2 * i) / (사다리 길이 - 1) - 1` 이었다. 그러면 축을 넓히는 순간
 *    **기존 갈래의 무게가 통째로 옮겨 간다** — 축이 여섯이 되자 `심화하` 가
 *    **+1 → +0.2** 로 주저앉아, 콘텐츠는 한 문항도 안 바뀌었는데 원장님이 보시는
 *    예상 점수가 **75 → 71** 로 움직였다(`testresult.test.ts` 가 잡았다).
 *    「분모가 바뀌면 같은 숫자가 다른 것을 가리킨다」(2026-08-17)의 그 자리다.
 *
 *    그래서 **칸 간격을 못 박는다** — 밑단이 −1, 한 칸에 ⅔. 눈금이 축의 길이에
 *    안 매이므로 갈래를 더해도 **이미 있는 갈래의 값은 그대로다.**
 *    확대 갈래는 +1 위로 나간다(심화중 +5/3 · 심화상 +7/3) — 보정 자체는
 *    `MAX_ADJUSTMENT` 로 이미 잘리므로 「가장 어려운 것만 틀렸다」가 상한에 닿는다.
 */
/** 한 칸의 무게 — **핵심 넷이 −1 … +1 을 채우도록** 정한다(=⅔). 축 길이에 안 매인다. */
const WEIGHT_STEP = 2 / (CORE_DIFFICULTIES.length - 1);

const DIFFICULTY_WEIGHT: Record<Difficulty, number> = Object.fromEntries(
  DIFFICULTY_LADDER.map((tier, i) => [tier, -1 + WEIGHT_STEP * i]),
) as Record<Difficulty, number>;

/** 보정 폭 상한(점) — 근거가 얇은 v0 추정치가 실채점 점수와 크게 어긋나지 않도록 제한한다. */
export const MAX_ADJUSTMENT = 5;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * v0 잠정 예상 점수 — score(자동 채점 점수)를 오답 문항의 난이도 분포로 소폭 보정한다.
 * 0~100 범위로 clamp한다(만점을 100으로 정규화한 grade 결과를 전제로 함, 06-tasks.md T7.1).
 */
export function predictStudentScore(
  score: number,
  graded: GradedAnswer[],
): number {
  const wrong = graded.filter((g) => !g.isCorrect);
  if (wrong.length === 0) return round2(clamp(score, 0, 100));

  const avgWeight =
    wrong.reduce((sum, g) => sum + DIFFICULTY_WEIGHT[g.difficulty], 0) /
    wrong.length;
  const adjustment = clamp(
    avgWeight * MAX_ADJUSTMENT,
    -MAX_ADJUSTMENT,
    MAX_ADJUSTMENT,
  );

  return round2(clamp(score + adjustment, 0, 100));
}
