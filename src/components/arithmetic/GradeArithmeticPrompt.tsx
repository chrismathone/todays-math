/* eslint-disable @next/next/no-img-element -- immutable, local SVG data URI */
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
}: {
  prompt: ArithmeticV2Prompt;
  typeId?: string;
}) {
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
