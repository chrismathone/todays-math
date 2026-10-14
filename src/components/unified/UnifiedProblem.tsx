/* eslint-disable @next/next/no-img-element -- browser-local crops are data URLs */
import { ProblemContent } from "@/components/math/ProblemContent";
import type { PrintChoiceLayout } from "@/lib/math/choiceLayout";
import { fractionViewFor } from "./fractionDisplay";
import type { StudioProblem } from "./types";
import NativeProblem from "./NativeProblem";
import { hideQuestionScores } from "./questionScoreDisplay";

export default function UnifiedProblem({
  problem,
  print = false,
  hideScores = false,
  choiceLayout = "auto",
}: {
  problem: StudioProblem;
  print?: boolean;
  hideScores?: boolean;
  /**
   * 보기 번호 배치 — 시험지 설정의 값(2026-09-20). 기본 「자동」은 오늘 그대로다.
   * 문항 렌더러가 **둘**(`NativeProblem`·`ProblemContent`)이라 양쪽 다 나른다 —
   * 한쪽만 걸면 같은 시험지 안에서 OCR 문항과 마크다운 문항이 다르게 찍힌다.
   */
  choiceLayout?: PrintChoiceLayout;
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
  // Arithmetic projects figure positions into [그림N], just like native content.
  // The fallback renders inline SVG and URLs separately and would duplicate it.
  if (problem.ocr || problem.studioCrop || problem.arithmetic)
    return (
      <NativeProblem
        problem={problem}
        print={print}
        hideScores={hideScores}
        choiceLayout={choiceLayout}
      />
    );
  return (
    <ProblemContent
      content={fractionViewFor(problem)(
        hideScores ? hideQuestionScores(problem.content) : problem.content,
      )}
      figureUrls={problem.figureUrls}
      figureSvg={problem.figureSvg}
      figureDims={problem.figureDims}
      figureSourceMm={problem.figureSourceMm}
      choiceFigureIndex={problem.choiceFigureIndex}
      deferFigures={!print}
      choiceLayout={choiceLayout}
    />
  );
}
