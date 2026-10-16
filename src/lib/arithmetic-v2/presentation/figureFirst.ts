import type { ArithmeticV2Prompt } from "../types";
import { CENTER_SPECS } from "../families/geometryTriangles/centers";
import {
  centerAngleFigureSvg,
  centerAngleGroupInstruction,
  isCenterAngleType,
} from "./centerAngles";
import {
  arithmeticGeometryLaidOutSvg,
  presentArithmeticFigureFirstSvg,
} from "./index";
import {
  defineFigureFirst,
  type FigureFirstFamily,
  type MathPrompt,
} from "./figureFirstTypes";
import { TRIG_FIGURE_FIRST } from "./figureFirstTrig";
import { TRIANGLE_FIGURE_FIRST } from "./figureFirstTriangles";
import { ANNOTATED_FIGURE_FIRST } from "./figureFirstAnnotated";

/** Figure-first drills (owner, 2026-10-15 for 내심·외심, 2026-10-16 for the
 * units where a figure is the natural statement): the figure carries every
 * given and marks the target x, the per-problem prose is dropped, and one group
 * instruction such as "[11~20] 다음 그림에서 … 구하세요." heads the run.
 * Everything here is display only: candidates, canonical SVG bytes, saved
 * packs, answers and verification are untouched.
 */
const centerAngles: Record<string, FigureFirstFamily> = Object.fromEntries(
  CENTER_SPECS.map((spec) => `m2-${spec.key}`)
    .filter(isCenterAngleType)
    .map((typeId) => [
      typeId,
      defineFigureFirst<Record<string, never>>({
        instruction: centerAngleGroupInstruction(typeId)!,
        parse: (prompt) =>
          prompt.figureId?.startsWith(`gt1-${typeId}-`) ? {} : undefined,
        draw: (prompt) => centerAngleFigureSvg(prompt.figureId!),
      }),
    ]),
);

const families: ReadonlyMap<string, FigureFirstFamily> = new Map(
  Object.entries({
    ...centerAngles,
    ...TRIANGLE_FIGURE_FIRST,
    ...TRIG_FIGURE_FIRST,
    ...ANNOTATED_FIGURE_FIRST,
  }),
);

const mathPrompt = (prompt: ArithmeticV2Prompt): MathPrompt | undefined =>
  prompt.layout === "math" ? prompt : undefined;

export function isFigureFirstType(typeId: string): boolean {
  return families.has(typeId);
}

export function figureFirstGroupInstruction(
  typeId: string,
): string | undefined {
  return families.get(typeId)?.instruction;
}

/** True when this prompt is one the family can draw (its public values parse). */
export function figureFirstApplies(
  typeId: string,
  prompt: ArithmeticV2Prompt,
): boolean {
  const family = families.get(typeId),
    math = mathPrompt(prompt);
  return Boolean(family && math && family.parse(math) !== undefined);
}

/** Lines that stay with the problem under the figure (often none). */
export function figureFirstLines(
  typeId: string,
  prompt: ArithmeticV2Prompt,
): string[] {
  const family = families.get(typeId),
    math = mathPrompt(prompt);
  if (!family || !math) return [];
  const parsed = family.parse(math);
  return parsed === undefined ? [] : (family.lines?.(math, parsed) ?? []);
}

/** The pre-typeset figure: redrawn from the prompt, or the family's laid-out
 * canonical figure with the target annotated. `canonical` is required for
 * prompts that own a figure id and must be the validated original.
 */
export function figureFirstDrawing(
  typeId: string,
  prompt: ArithmeticV2Prompt,
  canonical?: string,
): string | undefined {
  const family = families.get(typeId),
    math = mathPrompt(prompt);
  if (!family || !math) return undefined;
  if (Boolean(math.figureId) !== (canonical !== undefined)) return undefined;
  const parsed = family.parse(math);
  if (parsed === undefined) return undefined;
  const laidOut =
    canonical === undefined
      ? undefined
      : arithmeticGeometryLaidOutSvg(math.figureId!, canonical);
  return family.draw(math, parsed, laidOut, canonical);
}

/** The display figure (typeset), or undefined when the problem keeps prose. */
export function figureFirstSvg(
  typeId: string,
  prompt: ArithmeticV2Prompt,
  canonical?: string,
): string | undefined {
  const family = families.get(typeId),
    math = mathPrompt(prompt);
  if (!family || !math) return undefined;
  if (Boolean(math.figureId) !== (canonical !== undefined)) return undefined;
  const parsed = family.parse(math);
  if (parsed === undefined) return undefined;
  try {
    return presentArithmeticFigureFirstSvg(
      math.figureId ?? `figure-first:${typeId}:${math.latex}`,
      canonical ?? "",
      (laidOut, original) =>
        family.draw(
          math,
          parsed,
          canonical === undefined ? undefined : laidOut,
          canonical === undefined ? undefined : original,
        ),
    );
  } catch {
    // A placement failure must degrade to the prose presentation, never 500.
    return undefined;
  }
}
