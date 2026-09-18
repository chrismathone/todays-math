/**
 * 한 시험지의 **만점** — 「몇 점 만점 중 몇 점」을 같이 적어야 학부모의 이해도가 오른다(23 §2.3).
 *
 * ## 🔴 만점은 어디에도 저장돼 있지 않다
 *
 * `TestResult.score` 는 받은 점수의 합(`gradeAnswers`)이고, `ProblemAnswer` 는 배점을 안 담는다.
 * 그래서 만점은 **시험지의 문항 배점에서 다시 세는 수밖에 없다.** 규칙은 `gradeAnswers` 와
 * **글자 그대로 같아야** 한다 — 다르면 「100점 만점에 120점」 같은 지면이 나온다.
 *
 * ## 그 규칙이 두 벌이 되는 것을 무엇이 막나
 *
 * `achievementMaxScore.test.ts` 가 **`gradeAnswers` 에 전부 정답을 먹여** 나온 합과 이 함수의
 * 값을 견준다. 둘 중 하나만 바뀌면 그 시험이 빨개진다(한쪽만 고치는 것이 이 저장소의 상습
 * 결함이다 — 20번 «규칙이 옳아도 배선이 한쪽만 되면 그쪽 지표만 좋아진다»).
 *
 * ⚠️ 그래도 **`gradeAnswers` 파일을 고치지는 않는다** — 트랙 1(`grading-input`)이 같은 자리를
 *    만지고 있다. 규칙을 옮기는 것은 두 트랙이 병합된 뒤 리드가 할 일이다(보고서 ⑤).
 */

export interface ProblemPoints {
  /** `TestProblem.score` — 배점 보정기가 이 시험지에 매긴 조정 배점(D-42). 없으면 `null`. */
  adjustedScore: number | null;
  /** `Problem.score` — 원본 기출 배점. 자작·AI 문항은 `null`. */
  score: number | null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * 시험지의 만점. 문항이 없으면 **`null`** — 0점 만점이라고 적지 않는다.
 *
 * 배점은 `gradeAnswers` 와 같은 차례로 정한다:
 *   ① `TestProblem.score`(조정 배점) → ② `Problem.score`(원본 배점) → ③ 둘 다 없으면 균등 배분.
 */
export function testMaxScore(problems: ProblemPoints[]): number | null {
  if (problems.length === 0) return null;
  const equalShare = 100 / problems.length;
  const sum = problems.reduce(
    (acc, p) => acc + round2(p.adjustedScore ?? p.score ?? equalShare),
    0,
  );
  return round2(sum);
}
