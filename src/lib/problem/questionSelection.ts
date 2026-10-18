import { createHash } from "node:crypto";
import type {
  QuestionRepresentation,
  QuestionSelection,
} from "@/contracts/questionFormats.contract";
import { classifyFormat, type FormatInput } from "./provenance";
import { questionIdOf } from "./questionIdentity";
import { problemIneligibleCode } from "@/lib/problemEligibility";

/** Keep this select identical in every endpoint that issues/validates a revision. */
export const QUESTION_REVISION_SELECT = {
  id: true,
  questionGroupKey: true,
  updatedAt: true,
  unitId: true,
  content: true,
  answer: true,
  solution: true,
  questionType: true,
  difficulty: true,
  problemType: true,
  familyKey: true,
  source: true,
  externalId: true,
  originProblemId: true,
  sourceMaterialId: true,
  figureSvg: true,
  figureUrls: true,
  figureDims: true,
  figureSourceMm: true,
  choiceFigureIndex: true,
  figureSource: true,
  pool: true,
  directUseAllowed: true,
  reviewStatus: true,
} as const;
export type QuestionRevisionRow = FormatInput & {
  id: string;
  questionGroupKey?: string | null;
  updatedAt?: Date | string;
  unitId: string;
  source: string;
  difficulty: string;
  solution: string | null;
  externalId?: string | null;
  originProblemId: string | null;
  sourceMaterialId?: string | null;
  figureSvg: string | null;
  figureUrls: readonly string[];
  figureDims: readonly number[];
  figureSourceMm: readonly number[];
  choiceFigureIndex: readonly number[];
  figureSource?: string | null;
  pool: string;
  directUseAllowed: boolean;
  reviewStatus: string;
};
export function questionRevisionOf(row: QuestionRevisionRow): string {
  const values = Object.keys(QUESTION_REVISION_SELECT).map((key) => {
    const value = row[key as keyof QuestionRevisionRow];
    return [key, value instanceof Date ? value.toISOString() : (value ?? null)];
  });
  return `qr:v1:${createHash("sha256").update(JSON.stringify(values)).digest("hex")}`;
}
export function questionFormatMetadataOf(
  row: QuestionRevisionRow,
): QuestionRepresentation {
  const classified = classifyFormat(row);
  const code = problemIneligibleCode(row);
  const format = classified === "unknown" ? null : classified;
  return {
    problemId: row.id,
    format,
    revision: questionRevisionOf(row),
    state: code ? "blocked" : format ? "available" : "unverified",
    reasonCode: code ?? (format ? null : "unknownFormat"),
  };
}
export function questionSelectionOf(
  row: QuestionRevisionRow,
): QuestionSelection | null {
  const meta = questionFormatMetadataOf(row);
  return meta.state === "available" && meta.format
    ? {
        questionId: questionIdOf(row),
        problemId: row.id,
        format: meta.format,
        revision: meta.revision,
      }
    : null;
}
export function matchesQuestionSelection(
  row: QuestionRevisionRow,
  selection: QuestionSelection,
): boolean {
  const current = questionSelectionOf(row);
  return (
    current !== null &&
    current.questionId === selection.questionId &&
    current.problemId === selection.problemId &&
    current.format === selection.format &&
    current.revision === selection.revision
  );
}
export class QuestionSelectionConflict extends Error {
  readonly status = 409;
  constructor(
    message = "문항의 형식이나 내용이 바뀌었습니다. 다시 확인해 주세요.",
  ) {
    super(message);
  }
}
