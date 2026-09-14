/* eslint-disable @next/next/no-img-element -- browser-local crops are data URLs */
import { ProblemContent } from "@/components/math/ProblemContent";
import { displayFractions } from "./fractionDisplay";
import type { StudioProblem } from "./types";
import NativeProblem from "./NativeProblem";
import { hideQuestionScores } from "./questionScoreDisplay";

export default function UnifiedProblem({
  problem,
  print = false,
  hideScores = false,
}: {
  problem: StudioProblem;
  print?: boolean;
  hideScores?: boolean;
}) {
  if (problem.croppedImage)
    return (
      <img
        src={problem.croppedImage}
        alt={problem.content || "원본에서 오려낸 문제"}
        style={{
          maxWidth: "100%",
          height: "auto",
          maxHeight: print ? undefined : 420,
          objectFit: "contain",
        }}
      />
    );
  if (problem.ocr || problem.studioCrop)
    return (
      <NativeProblem problem={problem} print={print} hideScores={hideScores} />
    );
  return (
    <ProblemContent
      content={displayFractions(
        hideScores ? hideQuestionScores(problem.content) : problem.content,
        problem.grade,
      )}
      figureUrls={problem.figureUrls}
      figureSvg={problem.figureSvg}
      figureDims={problem.figureDims}
      figureSourceMm={problem.figureSourceMm}
      deferFigures={!print}
    />
  );
}
