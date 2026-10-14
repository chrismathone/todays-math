import type { Prisma, Problem } from "@prisma/client";

import type { RetryCandidate } from "@/lib/generator/planRetry";
import { textbookSlotCandidateWhere } from "@/lib/generator/textbookSlots";
import type { z } from "zod";
import type { retryProblemSchema } from "@/contracts/retry.contract";
import { db } from "@/lib/db";
import { problemEligibleWhere } from "@/lib/problemEligibility";
import { serializeProblem } from "@/lib/serializers";

/** 원문과 후보 모두 출처 · 직접 부모 · 슬롯을 잃지 않게 같은 select를 사용한다. */
export const RETRY_CANDIDATE_SELECT = {
  id: true,
  unitId: true,
  familyKey: true,
  difficulty: true,
  directUseAllowed: true,
  source: true,
  originProblemId: true,
  externalId: true,
  pool: true,
  reviewStatus: true,
  answer: true,
} as const satisfies Prisma.ProblemSelect;

type CandidateRow = Pick<Problem, keyof typeof RETRY_CANDIDATE_SELECT>;

export function serializeRetryCandidate(row: CandidateRow): RetryCandidate {
  return {
    id: row.id,
    unitId: row.unitId,
    familyKey: row.familyKey,
    difficulty: row.difficulty,
    directUseAllowed: row.directUseAllowed,
    source: row.source,
    originProblemId: row.originProblemId,
    externalId: row.externalId,
    pool: row.pool,
    reviewStatus: row.reviewStatus,
    answer: row.answer,
  };
}

export function serializeRetryProblem(
  row: Problem,
): z.infer<typeof retryProblemSchema> {
  return {
    ...serializeProblem(row),
    externalId: row.externalId,
    figureDims: row.figureDims,
    figureSourceMm: row.figureSourceMm,
    choiceFigureIndex: row.choiceFigureIndex,
  };
}

export async function findRetryCandidates(wrong: readonly RetryCandidate[]) {
  const textbookIds = wrong
    .filter((p) => p.source === "school_textbook")
    .map((p) => p.id);
  const ordinary = wrong.filter((p) => p.source !== "school_textbook");
  const families = ordinary
    .filter((p) => p.familyKey?.trim())
    .map((p) => ({
      unitId: p.unitId,
      familyKey: p.familyKey!,
    }));
  const conditions: Prisma.ProblemWhereInput[] = [...families];
  // 지정 두 슬롯의 신분 조건 — 준비 상태(`textbookSlotReadiness`)와 같은 함수에서 온다.
  if (textbookIds.length)
    conditions.push(textbookSlotCandidateWhere(textbookIds));
  if (!conditions.length) return [];
  const rows = await db.problem.findMany({
    where: { AND: [problemEligibleWhere(), { OR: conditions }] },
    select: RETRY_CANDIDATE_SELECT,
    orderBy: { id: "asc" },
  });
  return rows.map(serializeRetryCandidate);
}
