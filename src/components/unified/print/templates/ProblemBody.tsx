import UnifiedProblem from "../../UnifiedProblem";
import type { PrintOptions, ProblemReview } from "../types";

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
      style={{
        fontSize,
        lineHeight: compact ? 1.5 : 1.85,
        overflowWrap: "anywhere",
      }}
    >
      {(options.showDifficulty && problem.difficulty) ||
      (options.showChapter &&
        ["pyeongga", "jeongtong"].includes(options.template) &&
        problem.topic) ? (
        <div
          style={{
            fontFamily: "var(--paper-font-sans)",
            fontSize: 10,
            color: "#6B6B72",
            marginBottom: 4,
          }}
        >
          {options.showChapter &&
          ["pyeongga", "jeongtong"].includes(options.template)
            ? problem.topic
            : ""}
          {options.showDifficulty && problem.difficulty
            ? ` · ${problem.difficulty}`
            : ""}
        </div>
      ) : null}
      <UnifiedProblem problem={problem} print />
    </div>
  );
}
