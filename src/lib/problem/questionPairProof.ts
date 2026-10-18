import { createHash } from "node:crypto";
import { answerIsChoiceNumber } from "./provenance";

export interface QuestionPairRow {
  id: string;
  externalId: string | null;
  questionType: string | null;
  unitId: string;
  source: string;
  familyKey: string | null;
  difficulty: string;
  problemType: string;
  originProblemId: string | null;
  sourceMaterialId: string | null;
  content: string;
  answer: string;
  solution: string | null;
  figureSvg: string | null;
  figureUrls: readonly string[];
  figureDims: readonly number[];
  figureSourceMm: readonly number[];
  choiceFigureIndex: readonly number[];
  figureSource: string | null;
  questionGroupKey?: string | null;
}
export const QUESTION_PAIR_SELECT = {
  id: true,
  externalId: true,
  questionType: true,
  unitId: true,
  source: true,
  familyKey: true,
  difficulty: true,
  problemType: true,
  originProblemId: true,
  sourceMaterialId: true,
  content: true,
  answer: true,
  solution: true,
  figureSvg: true,
  figureUrls: true,
  figureDims: true,
  figureSourceMm: true,
  choiceFigureIndex: true,
  figureSource: true,
  questionGroupKey: true,
} as const;
export const QUESTION_IDENTITY_FIELDS = [
  "unitId",
  "source",
  "familyKey",
  "difficulty",
  "problemType",
  "originProblemId",
  "sourceMaterialId",
  "content",
  "answer",
  "solution",
  "figureSvg",
  "figureUrls",
  "figureDims",
  "figureSourceMm",
  "choiceFigureIndex",
  "figureSource",
  "externalId",
  "questionType",
] as const;
export function parseQuestionExternalId(
  externalId: string | null,
): { tuple: string[]; questionType: "단답형" | "객관식" } | null {
  if (!externalId) return null;
  let m =
    /^engine-elem:([^|]+)\|([^|]+)\|([^|]+)\|f([^|]+)\|(단답형|객관식)\|s(-?\d+)$/.exec(
      externalId,
    );
  if (m)
    return {
      tuple: ["engine-elem", m[1], m[2], m[3], m[4], m[6]],
      questionType: m[5] as "단답형" | "객관식",
    };
  m =
    /^(engine-mid|engine-mid-combo):(.+)\|s(-?\d+)\|v(\d+)\|(단답형|객관식)$/.exec(
      externalId,
    );
  if (m)
    return {
      tuple: [m[1], m[2], m[3], m[4]],
      questionType: m[5] as "단답형" | "객관식",
    };
  return null;
}
export type QuestionPairProof =
  | { ok: true; key: string; ids: [string, string]; tuple: string[] }
  | { ok: false; reason: string };
/** Sufficient proof only: no algebra, whitespace normalization of stems, or SVG equivalence. */
export function proveQuestionPair(
  rows: readonly QuestionPairRow[],
): QuestionPairProof {
  const fail = (reason: string): QuestionPairProof => ({ ok: false, reason });
  if (rows.length !== 2 || rows[0].id === rows[1].id)
    return fail("pairCardinality");
  for (const field of QUESTION_IDENTITY_FIELDS)
    if (rows.some((row) => row[field] === undefined))
      return fail(`missingEvidence:${field}`);
  const parsed = rows.map((row) => parseQuestionExternalId(row.externalId));
  if (parsed.some((p) => p === null)) return fail("unknownExternalId");
  if (JSON.stringify(parsed[0]!.tuple) !== JSON.stringify(parsed[1]!.tuple))
    return fail("externalTupleMismatch");
  if (rows.some((r, i) => r.questionType !== parsed[i]!.questionType))
    return fail("storedFormatMismatch");
  const short = rows.find((r) => r.questionType === "단답형");
  const mc = rows.find((r) => r.questionType === "객관식");
  if (!short || !mc) return fail("pairFormats");
  const equalFields = [
    "unitId",
    "source",
    "familyKey",
    "difficulty",
    "problemType",
    "originProblemId",
    "sourceMaterialId",
    "solution",
    "figureSvg",
    "figureUrls",
    "figureDims",
    "figureSourceMm",
    "choiceFigureIndex",
    "figureSource",
  ] as const;
  for (const field of equalFields)
    if (JSON.stringify(short[field]) !== JSON.stringify(mc[field]))
      return fail(`mismatch:${field}`);
  const stem = short.content.trimEnd();
  if (!mc.content.startsWith(`${stem}\n`)) return fail("stemMismatch");
  const tail = mc.content.slice(stem.length);
  const choices =
    /^\n① ([^\n]+)\n② ([^\n]+)\n③ ([^\n]+)\n④ ([^\n]+)\n⑤ ([^\n]+)$/.exec(tail);
  if (!choices) return fail("choiceContract");
  const answer = mc.answer.trim();
  if (!/^[①②③④⑤]$/.test(answer) || answerIsChoiceNumber(short.answer))
    return fail("answerContract");
  const index = "①②③④⑤".indexOf(answer) + 1;
  if (choices[index].trim() !== short.answer.trim())
    return fail("answerMismatch");
  const key = `q:v1:${createHash("sha256").update(JSON.stringify(parsed[0]!.tuple)).digest("hex")}`;
  if (
    rows.some((r) => r.questionGroupKey != null && r.questionGroupKey !== key)
  )
    return fail("existingKeyConflict");
  return { ok: true, key, ids: [short.id, mc.id], tuple: parsed[0]!.tuple };
}
