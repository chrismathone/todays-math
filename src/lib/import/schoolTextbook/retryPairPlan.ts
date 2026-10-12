import { createHash } from "node:crypto";
import type { Prisma, Problem } from "@prisma/client";
import { z } from "zod";
import { recoveryDraftIssues } from "./recovery";

export const textbookRetryDraftSchema = z.strictObject({
  slot: z.union([z.literal(1), z.literal(2)]),
  content: z.string().min(1),
  answer: z.string().min(1),
  solution: z.string().min(1),
  figureSvg: z.string().nullable().default(null),
  figureUrls: z.array(z.string()).default([]),
  figureDims: z.array(z.number().int().positive()).default([]),
  figureSourceMm: z.array(z.number().positive()).default([]),
  choiceFigureIndex: z.array(z.number().int().min(0).max(10)).default([]),
  recipe: z.string().min(1),
  mathEvidence: z.string().min(1),
});
export type TextbookRetryDraft = z.infer<typeof textbookRetryDraftSchema>;

const sourceFields = [
  "id",
  "source",
  "unitId",
  "familyKey",
  "sourceMaterialId",
  "difficulty",
  "problemType",
  "questionType",
  "content",
  "answer",
  "solution",
  "figureSvg",
  "figureUrls",
  "figureDims",
  "figureSourceMm",
  "choiceFigureIndex",
  "pool",
  "directUseAllowed",
  "reviewStatus",
] as const;
export type TextbookRetrySource = Pick<Problem, (typeof sourceFields)[number]>;

export function textbookRetrySourceFingerprint(
  source: TextbookRetrySource,
): string {
  return createHash("sha256")
    .update(JSON.stringify(sourceFields.map((field) => source[field])))
    .digest("hex");
}

export function textbookRetryExternalId(sourceId: string, slot: 1 | 2): string {
  return `tb-retry-v1:${sourceId}:${slot}`;
}

const textKey = (value: string) =>
  value.normalize("NFC").replace(/\s+/g, "").trim();

/** Pair validation is atomic; mathematical recipe verification belongs to the generator. */
export function prepareTextbookRetryPair(
  source: TextbookRetrySource,
  sourceFingerprint: string,
  inputs: readonly unknown[],
): { rows: Prisma.ProblemCreateManyInput[]; drafts: TextbookRetryDraft[] } {
  if (source.source !== "school_textbook" || source.pool !== "shared")
    throw new Error("공유 교과서 원문만 복습 변형의 원본으로 쓸 수 있다");
  if (textbookRetrySourceFingerprint(source) !== sourceFingerprint)
    throw new Error("원문이 바뀌었다. 현재 원문으로 변형을 다시 검증해야 한다");
  if (!source.familyKey?.trim())
    throw new Error("원문의 문항류가 없다. 서로 다른 문항류로 적재하지 않는다");
  if (inputs.length !== 2)
    throw new Error("원문마다 변형 두 개가 함께 필요하다");
  const drafts = inputs
    .map((input) => textbookRetryDraftSchema.parse(input))
    .sort((a, b) => a.slot - b.slot);
  if (drafts[0]!.slot !== 1 || drafts[1]!.slot !== 2)
    throw new Error("변형 번호 1과 2가 각각 한 번씩 필요하다");
  const keys = drafts.map((draft) => textKey(draft.content));
  if (
    keys[0] === keys[1] ||
    keys.some((key) => key === textKey(source.content))
  )
    throw new Error("변형은 원문 및 다른 변형과 달라야 한다");
  for (const draft of drafts) {
    const issues = recoveryDraftIssues({
      problemCode: "retry-pair",
      kind: "rewrite",
      content: draft.content,
      answer: draft.answer,
      solution: draft.solution,
      figureSvg: draft.figureSvg,
      figureUrls: draft.figureUrls,
      validation: { math: draft.mathEvidence, visual: "운영 지면 렌더러 검사" },
      remainingIssues: [],
      notes: draft.recipe,
    });
    if (
      draft.figureUrls.length * 2 !== draft.figureDims.length ||
      draft.figureUrls.length !== draft.figureSourceMm.length ||
      draft.figureUrls.length !== draft.choiceFigureIndex.length
    )
      issues.push("그림 치수와 보기 연결 메타데이터가 완전하지 않다");
    // Changed diagrams need authored, validated geometry. A reused source raster is insufficient.
    if (draft.figureUrls.length)
      issues.push("새 변형은 원본 그림 URL을 재사용하지 않는다");
    if (issues.length)
      throw new Error(`변형 ${draft.slot}: ${issues.join(" · ")}`);
  }
  return {
    drafts,
    rows: drafts.map((draft) => ({
      userId: null,
      unitId: source.unitId,
      source: "transformed",
      originProblemId: source.id,
      familyKey: source.familyKey,
      sourceMaterialId: source.sourceMaterialId,
      externalId: textbookRetryExternalId(source.id, draft.slot),
      difficulty: source.difficulty,
      problemType: source.problemType,
      questionType: source.questionType,
      content: draft.content,
      answer: draft.answer,
      solution: draft.solution,
      solutionSource: "ai",
      figureSvg: draft.figureSvg,
      figureSource: draft.figureSvg ? "engine" : null,
      figureUrls: draft.figureUrls,
      figureDims: draft.figureDims,
      figureSourceMm: draft.figureSourceMm,
      choiceFigureIndex: draft.choiceFigureIndex,
      reviewStatus: "pending",
      directUseAllowed: false,
      pool: "shared",
    })),
  };
}

/** User edits and approval state are preserved; imports only recognize an identical payload. */
export function matchesTextbookRetryInsertion(
  row: Problem,
  planned: Prisma.ProblemCreateManyInput,
): boolean {
  const fields = [
    "unitId",
    "source",
    "originProblemId",
    "familyKey",
    "sourceMaterialId",
    "externalId",
    "difficulty",
    "problemType",
    "questionType",
    "content",
    "answer",
    "solution",
    "solutionSource",
    "figureSvg",
    "figureSource",
    "figureUrls",
    "figureDims",
    "figureSourceMm",
    "choiceFigureIndex",
    "pool",
  ] as const;
  return fields.every(
    (field) => JSON.stringify(row[field]) === JSON.stringify(planned[field]),
  );
}
