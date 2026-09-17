/**
 * **「틀린 번호만」 채점** — 순수 함수 (D-134 트랙 1 · 19 §5′ A안).
 *
 * ## 왜 따로 있나
 *
 * `gradeAnswers` 는 **응답**(선택번호·서술형 점수)을 받아 정오를 **계산한다.**
 * 여기서는 정오가 **이미 원장님의 주장**이다 — 계산할 것이 없다. 그런데 그 둘을 한 함수에
 * 담으면, 응답이 없는 입력이 「미답 → 오답 0점」으로 읽혀(`gradeAnswers` 의 마지막 갈래)
 * **「하나도 안 틀린 학생」이 0점이 된다.**
 *
 * ## 🔴 배점 규칙은 **빌려 쓴다**, 다시 적지 않는다
 *
 * `maxPointsOf` 하나를 `gradeAnswers` 와 나눠 쓴다. 두 곳에 같은 규칙을 적으면
 * **같은 시험지를 어떻게 채점했느냐에 따라 점수가 달라진다** — 조정 배점(D-42)이 있는
 * 예측 문제지에서 특히 크게 갈린다.
 *
 * ## 문항 수만큼 행을 만든다
 *
 * 돌려주는 `graded` 는 **전 문항**이다. 「틀렸다고 표시되지 않은 문항」은 맞은 것이고,
 * 그 사실을 행으로 남겨야 한다 — 행이 없는 것을 «맞음»으로 읽게 두면 «아직 안 봄»과
 * 구별되지 않는다(23 §4 ②).
 */
import type {
  GradeAnswersResult,
  GradedAnswer,
  GradingProblem,
} from "./gradeAnswers";
import { maxPointsOf } from "./gradeAnswers";

/** 채점 대상 문항 — 시험지 차례(`TestProblem.orderIndex`)를 달고 온다. */
export interface MarkedProblem extends GradingProblem {
  sequence: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * @param problems 시험지의 **전 문항** — 차례대로.
 * @param wrongProblemIds 원장님이 «틀림»으로 찍은 문항.
 */
export function gradeMarks(
  problems: MarkedProblem[],
  wrongProblemIds: readonly string[],
): GradeAnswersResult {
  const wrong = new Set(wrongProblemIds);
  const equalShare = problems.length > 0 ? 100 / problems.length : 0;

  const graded = problems.map((problem): GradedAnswer => {
    const maxPoints = maxPointsOf(problem, equalShare);
    const isCorrect = !wrong.has(problem.id);
    return {
      problemId: problem.id,
      sequence: problem.sequence,
      // 🔴 **응답을 지어내지 않는다.** 원장님은 번호를 찍었을 뿐 「몇 번을 골랐는지」를
      //    말한 적이 없다. 여기에 숫자를 넣으면 지면·리포트가 없던 사실을 주장하게 된다.
      selectedChoice: null,
      essayScore: null,
      isCorrect,
      pointsEarned: round2(isCorrect ? maxPoints : 0),
      maxPoints: round2(maxPoints),
      unitId: problem.unitId,
      difficulty: problem.difficulty,
    };
  });

  const score = round2(graded.reduce((sum, g) => sum + g.pointsEarned, 0));
  return { graded, score };
}
