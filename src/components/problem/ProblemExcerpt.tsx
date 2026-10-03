import { PaperProblemView } from "@/components/print/PaperProblemView";
import { fractionViewFor } from "@/components/unified/fractionDisplay";
import type { ProblemEntity } from "@/contracts/problem.contract";

/**
 * 검수 화면이 그리는 문항 — 은행 문항과 **시험지 문항** 둘 다다.
 * 시험지 문항이 교재 스냅샷이면 보기 그림의 짝에 `null`(아직 안 본 장)이 섞인다(`testProblemItemSchema`).
 * 은행 계약(`ProblemEntity`)은 그대로 `number[]` 로 두고, 읽는 쪽만 넓게 받는다.
 */
export type ExcerptProblem = Omit<ProblemEntity, "choiceFigureIndex"> & {
  choiceFigureIndex?: (number | null)[];
};

type ProblemExcerptProps = {
  problem: ExcerptProblem;
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
        choiceFigureIndex={problem.choiceFigureIndex}
      />
    </div>
  );
}
