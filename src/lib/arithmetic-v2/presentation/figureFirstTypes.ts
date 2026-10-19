import type { ArithmeticV2Prompt } from "../types";

export type MathPrompt = Extract<ArithmeticV2Prompt, { layout: "math" }>;

/** One figure-first family: the figure carries every given and marks the
 * target x; one group instruction replaces the per-problem prose. `parse`
 * reads the display parameters from the public prompt (or its figure id) and
 * returns undefined for anything it does not recognise, in which case the
 * consumer keeps the ordinary prose presentation. Display only, always.
 */
export type FigureFirstFamily<P = unknown> = {
  instruction: string;
  parse(prompt: MathPrompt): P | undefined;
  /** Short lines that must stay with the problem (ratios, areas, the question). */
  lines?(prompt: MathPrompt, parsed: P): string[];
  /** Pre-typeset SVG. `laidOut` is the family's own display layout of the
   * canonical figure and `canonical` the validated original (figureId prompts). */
  draw(
    prompt: MathPrompt,
    parsed: P,
    laidOut?: string,
    canonical?: string,
  ): string | undefined;
};

/** Keeps the parsed parameter type inside one family definition. */
export const defineFigureFirst = <P>(
  family: FigureFirstFamily<P>,
): FigureFirstFamily => family as FigureFirstFamily;
