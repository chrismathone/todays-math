import { z } from "zod";
import { normalizeMathgenText } from "@/lib/math/normalizeMathgenText";
import { blocksToMarkdown } from "./blocksToMarkdown";
import type { MathgenProblemData } from "./contracts";

const text = z.string().max(60000);
export const ContentBlockSchema = z.object({
  type: z.enum(["text", "equation", "equation_block", "table"]),
  value: text,
  rows: z.array(z.array(text).max(100)).max(100).default([]),
});
const blocks = z.array(ContentBlockSchema).max(1000);
const ChoiceSchema = z.object({
  number: z.number().int().min(1).max(20),
  contents: blocks,
});
const choices = z.array(ChoiceSchema).max(20);
const positiveScore = z.number().nonnegative().max(1000).optional();
const SubQuestionSchema = z.object({
  number: z.number().int().positive().max(1000),
  contents: blocks,
  choices: choices.optional(),
  score: positiveScore,
  printedScore: z.string().max(30).optional(),
  labelType: z.string().max(100).optional(),
});
const layout = z.enum(["auto", "1x5", "2x3", "3x2", "5x1"]);
export const MathgenProblemDataSchema = z.object({
  contentEdited: z.boolean().optional(),
  number: z.number().int().positive().max(10000),
  blocks,
  choiceGroups: choices,
  subQuestions: z.array(SubQuestionSchema).max(100),
  score: positiveScore,
  printedScore: z.string().max(30).optional(),
  labelType: z.string().max(100).optional(),
  topic: z.string().max(1000).optional(),
  confidence: z.enum(["high", "medium", "low"]),
  choicesLayout: layout,
  bodyMissing: z.boolean(),
  choicesMissing: z.boolean(),
});
const NativeBoxSchema = z.object({
  box: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  label: z.string().max(1000).optional(),
  kind: z.string().max(30).optional(),
});
export const NativeOcrItemSchema = z.object({
  answer: text.optional(),
  number: z.number().int().positive().max(10000),
  contents: blocks,
  choices: choices.default([]),
  subQuestions: z.array(SubQuestionSchema).max(100).default([]),
  score: positiveScore,
  printedScore: z.string().max(30).optional(),
  labelType: z.string().max(100).optional(),
  topic: z.string().max(1000).optional(),
  confidence: z.enum(["high", "medium", "low"]).default("low"),
  choicesLayout: layout.default("auto"),
  images: z.array(NativeBoxSchema).max(30).default([]),
  figures: z.array(NativeBoxSchema).max(30).default([]),
});
export type NativeOcrItem = z.infer<typeof NativeOcrItemSchema>;

/** Preserve explicit completeness signals without guessing types from verbs. */
export function normalizeNativeOcr(item: NativeOcrItem): {
  ocr: MathgenProblemData;
  content: string;
  warnings: string[];
} {
  const content = normalizeMathgenText(
    blocksToMarkdown(item.contents, item.choices, item.subQuestions),
  );
  const body = blocksToMarkdown(item.contents, [], item.subQuestions).trim();
  const bodyMissing = !body || /본문\s*(?:추출|인식)\s*실패/.test(body);
  const choicesMissing =
    item.choices.length > 0 &&
    (item.choices.length !== 5 ||
      item.choices.some(
        (c, i) =>
          c.number !== i + 1 ||
          !c.contents.some((b) => b.value.trim() || b.rows.length),
      ));
  const ocr: MathgenProblemData = {
    number: item.number,
    blocks: item.contents,
    choiceGroups: item.choices,
    subQuestions: item.subQuestions,
    ...(item.score ? { score: item.score } : {}),
    ...(item.printedScore ? { printedScore: item.printedScore } : {}),
    ...(item.labelType?.trim() ? { labelType: item.labelType.trim() } : {}),
    ...(item.topic?.trim() ? { topic: item.topic.trim() } : {}),
    confidence: item.confidence,
    choicesLayout: item.choicesLayout,
    bodyMissing,
    choicesMissing,
  };
  return {
    ocr,
    content,
    warnings: [
      ...(bodyMissing
        ? ["문제 본문 누락이 의심됩니다. 원본을 확인하고 다시 인식해 주세요."]
        : []),
      ...(choicesMissing
        ? [
            `인식된 객관식 보기는 ${item.choices.length}개입니다. 보기의 번호·내용 또는 원본 전체 개수를 확인할 수 없어 완전성을 보류합니다. 원본을 확인해 주세요.`,
          ]
        : []),
      ...(item.confidence !== "high"
        ? ["인식이 불확실한 문자·수식이 있습니다. 원본을 확인해 주세요."]
        : []),
    ],
  };
}

export function nativeFromMetadata(ocr: MathgenProblemData): NativeOcrItem {
  return {
    ...ocr,
    contents: ocr.blocks,
    choices: ocr.choiceGroups,
    images: [],
    figures: [],
  };
}

export function nativeQuestionType(ocr: MathgenProblemData) {
  if (/단답형/.test(ocr.labelType ?? "")) return "short-answer" as const;
  if (/서술형|논술형/.test(ocr.labelType ?? "")) return "descriptive" as const;
  if (ocr.choiceGroups.length && !/서답형|주관식/.test(ocr.labelType ?? ""))
    return "multiple-choice" as const;
  return undefined;
}
