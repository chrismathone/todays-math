import { MathText, SolutionText } from "@/components/math/MathText";
import { fractionViewFor } from "@/components/unified/fractionDisplay";
import type { StudioProblem } from "@/components/unified/types";
import { hasRealAnswer } from "@/lib/missingAnswer";
import s from "./ExamBuilder.module.css";

/**
 * 문항 검토 — 문항 오른쪽의 정답 · 해설(수학 전용).
 *
 * 2026-08-21 원장님 확정 선례(`ReviewProblemCard` — 검수는 답 · 해설을 보는 일이라 상시 표시, 펼침 클릭은
 * 매 문항 손품)를 따른다. 분수 보기는 본문과 같은 문항 단위 결정(`fractionViewFor`)이고, 해설은 줄을
 * 나누는 유일한 조합(`SolutionText`)을 지난다. 정답 자리표시자(`(정답 없음)`)는 글자 그대로 찍지 않는다.
 */
export default function ExamAnswerPanel({
  problem,
}: {
  problem: StudioProblem;
}) {
  const shown = fractionViewFor(problem);
  return (
    <aside className={s.answerPanel} aria-label="정답과 해설" data-exam-answer>
      <section>
        <h4>정답</h4>
        {hasRealAnswer(problem.answer) ? (
          <MathText as="div" text={shown(problem.answer)} />
        ) : (
          <p className={s.answerMissing}>정답 없음</p>
        )}
      </section>
      <section>
        <h4>해설</h4>
        {problem.solution?.trim() ? (
          <SolutionText text={shown(problem.solution)} />
        ) : (
          <p className={s.answerMissing}>해설 없음</p>
        )}
      </section>
    </aside>
  );
}
