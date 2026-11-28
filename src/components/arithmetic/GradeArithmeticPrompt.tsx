/* eslint-disable @next/next/no-img-element -- immutable, local SVG data URI */
import { useMemo } from "react";
import type { ArithmeticV2Prompt } from "@/lib/arithmetic-v2/types";
import {
  arithmeticGeometryAnswerUnit,
  arithmeticGeometryCatalogSvg,
} from "@/lib/arithmetic-v2/geometry";
import { GradeArithmeticExpression as NumericExpression } from "./GradeArithmeticPaper";
import { MathText } from "@/components/math/MathText";
import { svgDataUrl } from "@/lib/svgDataUrl";
import {
  arithmeticGeometryDisplaySize,
  presentArithmeticGeometrySvg,
} from "@/lib/arithmetic-v2/presentation";
import {
  arithmeticGeometryWording,
  arithmeticGeometryUnitText,
} from "@/lib/arithmetic-v2/presentation/text";
import { arithmeticGeometryNotation } from "@/lib/arithmetic-v2/presentation/notation";
import { arithmeticFigurePresentation } from "@/lib/arithmetic-v2/presentation/figurePolicy";
import { arithmeticPromptPacks } from "@/lib/arithmetic-v2/presentation/packAssets";
import { useArithmeticPackPreparation } from "./useArithmeticPackPreparation";
import {
  figureFirstGroupInstruction,
  figureFirstSvg,
  isFigureFirstType,
} from "@/lib/arithmetic-v2/presentation/figureFirst";
import s from "./GradeArithmeticPrompt.module.css";

/** Catalog examples only. Review/output must use arithmeticToStudioProblems,
 * which reads the saved SVG pack instead of substituting a catalog figure.
 */
export function GradeArithmeticExpression({
  prompt,
  typeId,
  preview,
}: {
  prompt: ArithmeticV2Prompt;
  typeId?: string;
  preview?: boolean;
}) {
  const requests = useMemo(
    () => arithmeticPromptPacks(prompt, typeId),
    [prompt, typeId],
  );
  const { ready, failed } = useArithmeticPackPreparation(requests, preview);
  if (!ready)
    return failed ? (
      <span role="alert">
        예시 그림을 불러오지 못했습니다. 예시를 다시 열어 주세요.
      </span>
    ) : (
      <span role="status">예시 그림을 불러오는 중입니다.</span>
    );
  if (
    prompt.layout !== "math" ||
    (!prompt.figureId && prompt.answerUnit === undefined)
  )
    return <NumericExpression prompt={prompt} />;
  const originalSvg = prompt.figureId
    ? arithmeticGeometryCatalogSvg(prompt.figureId)
    : undefined;
  const figureFirst =
    typeId && isFigureFirstType(typeId)
      ? figureFirstSvg(typeId, prompt, originalSvg)
      : undefined;
  const presentation = arithmeticFigurePresentation(prompt, typeId, {
    figureFirst: figureFirst !== undefined,
  });
  const svg =
    figureFirst ??
    (originalSvg && presentation.showFigure
      ? presentArithmeticGeometrySvg(prompt.figureId!, originalSvg)
      : undefined);
  // A catalog example has no group heading, so it shows the shared question.
  const instruction =
    figureFirst && typeId ? figureFirstGroupInstruction(typeId) : undefined;
  const lines = instruction
    ? [instruction, ...presentation.lines]
    : presentation.lines;
  const size = svg ? arithmeticGeometryDisplaySize(svg) : undefined;
  return (
    <span className={s.prompt}>
      {lines.map((line) => (
        <span className={s.givens} key={line}>
          <MathText text={arithmeticGeometryNotation(line)} />
        </span>
      ))}
      {svg && (
        <img
          className={s.figure}
          width={size!.width}
          height={size!.height}
          src={svgDataUrl(svg)}
          alt={arithmeticGeometryWording(prompt.text)}
        />
      )}
      <span>
        답: <span className={s.blank} aria-label="답란" />{" "}
        <MathText
          text={arithmeticGeometryUnitText(
            arithmeticGeometryAnswerUnit(prompt),
          )}
        />
      </span>
    </span>
  );
}
