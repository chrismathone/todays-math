import UnifiedProblem from "../../UnifiedProblem";
import type { PrintOptions, ProblemReview } from "../types";

/** Keep the unified math/figure renderer and its display-only elementary fractions. */
export function ProblemBody({
  problem,
  fontSize = 13,
  compact,
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
      <UnifiedProblem problem={problem} print />
    </div>
  );
}
