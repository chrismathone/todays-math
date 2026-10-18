import {
  classifyFormatWithChoices,
  formatWithoutContent,
  type FormatEvidence,
  type ProblemFormat,
} from "./provenance";

/** The strict persisted proof certifies EXACTLY five generated MC choices.
 * Every field on which that certificate depends is covered by the DB invalidation
 * trigger. A NULL/unrecognized key falls back to the existing exact classifier.
 * Operationally forbidden proofless key writes cannot be made safe by this reader.
 */
export function questionFormatWithoutContent(
  row: FormatEvidence & { questionGroupKey?: string | null },
): ProblemFormat | null {
  if (
    row.questionGroupKey &&
    /^q:v1:[a-f0-9]{64}$/.test(row.questionGroupKey) &&
    row.questionType === "객관식"
  )
    return classifyFormatWithChoices(5, row);
  return formatWithoutContent(row);
}
