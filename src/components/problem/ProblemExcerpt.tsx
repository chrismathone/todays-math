import { PaperProblemView } from "@/components/print/PaperProblemView";
import { fractionViewFor } from "@/components/unified/fractionDisplay";
import type { ProblemEntity } from "@/contracts/problem.contract";

type ProblemExcerptProps = {
  problem: ProblemEntity;
  /**
   * 문항 단원의 학년 — 초등이면 가분수를 대분수로 보인다(인쇄와 같은 함수). 없으면 원문.
   * 본문만 그려도 결정은 정답·해설까지 보고 한다 — 옆 칸의 답·해설과 같은 모양이어야 한다.
   */
  grade?: string;
  className?: string;
};

/** 검수 화면 문제 본문 — 문제은행·인쇄와 같은 지면 문항 뷰(줄바꿈까지 동일)를 쓴다. */
export function ProblemExcerpt({
  problem,
  grade = "",
  className = "",
}: ProblemExcerptProps) {
  return (
    <div className={`min-w-0 overflow-x-auto ${className}`}>
      <PaperProblemView
        content={fractionViewFor({ ...problem, grade })(problem.content)}
        figureUrls={problem.figureUrls}
      />
    </div>
  );
}
