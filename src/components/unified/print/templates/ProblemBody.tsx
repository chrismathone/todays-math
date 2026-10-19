import UnifiedProblem from "../../UnifiedProblem";
import { useEnglishPrintRenderer } from "../EnglishPrintRenderer";
import type { PrintOptions, ProblemReview } from "../types";

function EnglishQuestion({
  content,
}: {
  content: NonNullable<ProblemReview["variant"]["english"]>;
}) {
  const { Question } = useEnglishPrintRenderer();
  return <Question content={content} />;
}

/** Keep the unified math/figure renderer and its display-only elementary fractions. */
export function ProblemBody({
  problem,
  fontSize = 13,
  compact,
  options,
}: {
  problem: ProblemReview["variant"];
  fontSize?: number;
  compact?: boolean;
  options: PrintOptions;
}) {
  return (
    <div
      data-problem-body
      style={{
        fontSize,
        lineHeight: compact ? 1.5 : 1.85,
        overflowWrap: "anywhere",
      }}
    >
      {problem.english ? (
        <EnglishQuestion content={problem.english} />
      ) : (
        <UnifiedProblem
          problem={problem}
          print
          hideScores={options.hideScores !== false}
          // 보기 번호 배치 — 여섯 템플릿이 전부 이 한 부품을 거친다(2026-09-20).
          choiceLayout={options.choiceLayout}
        />
      )}
    </div>
  );
}
