import { z } from "zod";

/** Omitted = unspecified; zero = exclude. Shared by the builder and daily tests. */
export const OUTPUT_QUESTION_FORMATS = ["객관식", "단답형", "서술형"] as const;
export type OutputQuestionFormat = (typeof OUTPUT_QUESTION_FORMATS)[number];
export const formatIntentSchema = z.partialRecord(
  z.enum(OUTPUT_QUESTION_FORMATS),
  z.number().int().min(0).max(100),
);
export type FormatIntent = z.infer<typeof formatIntentSchema>;

export function formatIntentFits(intent: FormatIntent, count: number): boolean {
  const set = OUTPUT_QUESTION_FORMATS.filter(
    (format) => intent[format] !== undefined,
  );
  const sum = set.reduce((total, format) => total + intent[format]!, 0);
  return (
    sum <= count &&
    (set.length < OUTPUT_QUESTION_FORMATS.length || sum === count)
  );
}

export function outputFormatOf(format: string): OutputQuestionFormat | null {
  switch (format) {
    case "multiple_choice":
      return "객관식";
    case "short_answer":
      return "단답형";
    case "descriptive":
      return "서술형";
    default:
      return null;
  }
}
