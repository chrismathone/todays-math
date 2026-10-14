/* eslint-disable @next/next/no-img-element -- immutable, local SVG data URI */
import type { ArithmeticV2Prompt } from "@/lib/arithmetic-v2/types";
import {
  arithmeticAngleSnapshot,
  arithmeticAngleSvg,
} from "@/lib/arithmetic-v2/geometry";
import { GradeArithmeticExpression as NumericExpression } from "./GradeArithmeticPaper";
import s from "./GradeArithmeticPrompt.module.css";

/** Catalog examples only. Review/output must use arithmeticToStudioProblems,
 * which reads the saved SVG pack instead of substituting a catalog figure.
 */
export function GradeArithmeticExpression({
  prompt,
}: {
  prompt: ArithmeticV2Prompt;
}) {
  if (prompt.layout !== "math" || !prompt.figureId)
    return <NumericExpression prompt={prompt} />;
  const svg = arithmeticAngleSvg(prompt.figureId, arithmeticAngleSnapshot);
  return (
    <span className={s.prompt}>
      <span>{prompt.instruction}</span>
      <img
        className={s.figure}
        width={216}
        height={216}
        src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
        alt={prompt.text}
      />
      <span>
        답: <span className={s.blank} aria-label="답란" /> °
      </span>
    </span>
  );
}
