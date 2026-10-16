import type { ArithmeticV2Prompt } from "../types";
import { arithmeticGeometryPromptLines } from "../geometry";
import { arithmeticGeometryWording } from "./text";
import { ELEMENTARY_FIGURE_POLICY } from "./figurePolicyElementary";
import { MIDDLE_FIGURE_POLICY } from "./figurePolicyMiddle";
import {
  figureFirstApplies,
  figureFirstLines,
  isFigureFirstType,
} from "./figureFirst";

type FigurePolicy = {
  typeId: string;
  figureIdPrefix: string;
  showFigure: boolean;
  reason: string;
  instruction?: string;
};

const policies: readonly FigurePolicy[] = [
  ...ELEMENTARY_FIGURE_POLICY,
  ...MIDDLE_FIGURE_POLICY,
];
const byType = new Map(policies.map((policy) => [policy.typeId, policy]));
const byPrefix = [...policies].sort(
  (a, b) => b.figureIdPrefix.length - a.figureIdPrefix.length,
);

/** Display only: saved candidate identities and their validated SVGs stay intact.
 * Unknown families keep their figure until their public conditions are reviewed.
 */
export function arithmeticFigurePresentation(
  prompt: ArithmeticV2Prompt,
  typeId?: string,
  /** `figureFirst: false` when the consumer could not draw the figure-first
   * figure, so that the complete prose is printed instead. */
  options: { figureFirst?: boolean } = {},
): { showFigure: boolean; lines: string[] } {
  if (prompt.layout !== "math") return { showFigure: false, lines: [] };
  const policy = typeId
    ? byType.get(typeId)
    : prompt.figureId
      ? byPrefix.find((entry) =>
          prompt.figureId!.startsWith(entry.figureIdPrefix),
        )
      : undefined;
  // Figure-first drills: the figure carries every given and x, the group
  // instruction carries the question, so the problem itself keeps at most a
  // short line (a ratio or an area the figure cannot show).
  const resolvedType = typeId ?? policy?.typeId;
  if (
    options.figureFirst !== false &&
    resolvedType &&
    isFigureFirstType(resolvedType) &&
    (!prompt.figureId || policy?.showFigure !== false) &&
    figureFirstApplies(resolvedType, prompt)
  )
    return {
      showFigure: true,
      lines: figureFirstLines(resolvedType, prompt)
        .map(arithmeticGeometryWording)
        .filter(Boolean),
    };
  const showFigure = Boolean(prompt.figureId) && policy?.showFigure !== false;
  const displayed = {
    ...prompt,
    ...(policy?.instruction !== undefined
      ? { instruction: policy.instruction }
      : {}),
    // This target was named as an indicated exterior angle. Its two remote
    // interior angles already determine it without any diagram reference.
    ...(policy?.typeId === "m1-triangle-exterior"
      ? { text: prompt.text.replace("표시된 외각", "외각") }
      : {}),
  };
  // The original triangle-angle helper suppresses givens that are printed in
  // its diagram. Restore those public givens whenever that diagram is omitted.
  const lines = showFigure
    ? arithmeticGeometryPromptLines(displayed)
    : [...new Set([displayed.text, displayed.instruction ?? ""])];
  return {
    showFigure,
    lines: lines.map(arithmeticGeometryWording).filter(Boolean),
  };
}
