import "server-only";
import type { Prisma } from "@prisma/client";
import { problemFilterQuerySchema } from "@/contracts/problem.contract";
import { PROBLEM_CODE_PATTERN } from "@/contracts/problemCode.contract";
import { db } from "@/lib/db";
import {
  problemEligibleWhere,
  problemIneligibleReason,
} from "@/lib/problemEligibility";
import { problemVisibleWhere } from "@/lib/problemPool";
import { MISSING_ANSWER } from "@/lib/missingAnswer";
import { findProblemIdsByFormat } from "@/lib/problem/formatQuery";
import { classifyFormat } from "@/lib/problem/provenance";
import { PROBLEM_BANK_ORDER_BY } from "@/lib/problem/problemOrder";
import type { BankData, StudioProblem } from "@/components/unified/types";

const querySchema = problemFilterQuerySchema.pick({
  q: true,
  grade: true,
  chapter: true,
  chapterPrefix: true,
  unitFrom: true,
  unitTo: true,
  difficulty: true,
  problemType: true,
  format: true,
  source: true,
  reviewStatus: true,
  hasFigure: true,
  hasSolution: true,
  hasAnswer: true,
  page: true,
});
export class UnifiedBankQueryError extends Error {}

/** Read-only shared-bank inspection. Issuance eligibility remains a separate rule. */
export async function loadUnifiedBank(
  params = new URLSearchParams(),
): Promise<BankData> {
  const parsed = querySchema.safeParse(
    Object.fromEntries(
      Array.from(params).filter(([, value]) => value.trim() !== ""),
    ),
  );
  if (!parsed.success)
    throw new UnifiedBankQueryError(
      "검색 조건이 올바르지 않습니다. 필터를 확인해 주세요.",
    );
  const {
    q,
    grade,
    chapter,
    chapterPrefix,
    unitFrom,
    unitTo,
    difficulty,
    problemType,
    format,
    source,
    reviewStatus,
    hasFigure,
    hasSolution,
    hasAnswer,
    page: requestedPage,
  } = parsed.data;
  const pageSize = 12;
  // Explicit status inspection may include rows that cannot be issued. Private
  // pools never become visible, and the returned eligibility controls adding.
  const visibility = reviewStatus
    ? { AND: [problemVisibleWhere(), { reviewStatus }] }
    : problemEligibleWhere();
  const clauses: Prisma.ProblemWhereInput[] = [visibility];
  if (grade || chapter || chapterPrefix)
    clauses.push({
      unit: {
        ...(grade ? { grade } : {}),
        ...(chapter
          ? { chapter }
          : chapterPrefix
            ? { chapter: { startsWith: chapterPrefix } }
            : {}),
      },
    });
  if (difficulty) clauses.push({ difficulty });
  if (problemType) clauses.push({ problemType });
  if (source) clauses.push({ source });
  const rangeIds = [
    ...new Set([unitFrom, unitTo].filter((id): id is string => Boolean(id))),
  ];
  if (rangeIds.length) {
    const bounds = await db.unit.findMany({
      where: { id: { in: rangeIds } },
      select: { id: true, orderIndex: true },
    });
    if (bounds.length !== rangeIds.length)
      throw new UnifiedBankQueryError(
        "선택한 단원 범위를 찾을 수 없습니다. 범위를 다시 선택해 주세요.",
      );
    const order = new Map(bounds.map((unit) => [unit.id, unit.orderIndex]));
    const from = unitFrom ? order.get(unitFrom)! : undefined;
    const to = unitTo ? order.get(unitTo)! : undefined;
    clauses.push({
      unit: {
        orderIndex:
          from !== undefined && to !== undefined
            ? { gte: Math.min(from, to), lte: Math.max(from, to) }
            : from !== undefined
              ? { gte: from }
              : { lte: to! },
      },
    });
  }
  if (hasFigure)
    clauses.push({
      OR: [
        { NOT: { figureUrls: { isEmpty: true } } },
        { figureSvg: { not: null } },
      ],
    });
  if (hasSolution)
    clauses.push({
      AND: [{ solution: { not: null } }, { solution: { not: "" } }],
    });
  if (hasAnswer)
    clauses.push({
      AND: [{ answer: { not: MISSING_ANSWER } }, { answer: { not: "" } }],
    });
  if (q) {
    const code = q.toUpperCase();
    clauses.push(
      new RegExp(PROBLEM_CODE_PATTERN).test(code)
        ? { problemCode: code }
        : {
            OR: [
              { content: { contains: q, mode: "insensitive" } },
              { problemCode: { contains: q, mode: "insensitive" } },
              { answer: { contains: q, mode: "insensitive" } },
              { solution: { contains: q, mode: "insensitive" } },
              { school: { contains: q, mode: "insensitive" } },
              { unit: { section: { contains: q, mode: "insensitive" } } },
              ...(/^\d{1,7}$/.test(q) ? [{ questionNumber: Number(q) }] : []),
            ],
          },
    );
  }
  const where: Prisma.ProblemWhereInput = { AND: clauses };
  const orderBy = PROBLEM_BANK_ORDER_BY;
  const formatIds = await findProblemIdsByFormat(format, where, orderBy);
  const [total, units] = await Promise.all([
    formatIds === null ? db.problem.count({ where }) : formatIds.length,
    db.unit.findMany({
      select: {
        id: true,
        grade: true,
        chapter: true,
        section: true,
        orderIndex: true,
        _count: { select: { problems: { where: visibility } } },
      },
      orderBy: { orderIndex: "asc" },
    }),
  ]);
  const page = Math.min(
    requestedPage,
    Math.max(1, Math.ceil(total / pageSize)),
  );
  const rows = await db.problem.findMany({
    where:
      formatIds === null
        ? where
        : {
            AND: [
              where,
              {
                id: {
                  in: formatIds.slice((page - 1) * pageSize, page * pageSize),
                },
              },
            ],
          },
    ...(formatIds === null ? { skip: (page - 1) * pageSize } : {}),
    take: pageSize,
    orderBy,
    select: {
      id: true,
      content: true,
      answer: true,
      solution: true,
      difficulty: true,
      problemCode: true,
      figureUrls: true,
      figureSvg: true,
      figureDims: true,
      figureSourceMm: true,
      source: true,
      reviewStatus: true,
      problemType: true,
      questionType: true,
      familyKey: true,
      pool: true,
      directUseAllowed: true,
      unit: { select: { grade: true, chapter: true, section: true } },
    },
  });
  const questionTypes: Record<string, StudioProblem["questionType"]> = {
    multiple_choice: "multiple-choice",
    short_answer: "short-answer",
    descriptive: "descriptive",
  };
  const counts = new Map<string, number>();
  for (const unit of units)
    counts.set(
      unit.grade,
      (counts.get(unit.grade) ?? 0) + unit._count.problems,
    );
  return {
    problems: rows.map(
      ({
        unit,
        pool,
        directUseAllowed,
        familyKey,
        questionType,
        ...problem
      }) => {
        const ineligibleReason = problemIneligibleReason({
          ...problem,
          pool,
          directUseAllowed,
        });
        const derivedType =
          questionTypes[
            classifyFormat({ ...problem, familyKey, questionType })
          ];
        return {
          ...problem,
          ...unit,
          solution: problem.solution ?? "",
          problemCode: problem.problemCode ?? "",
          ...(derivedType ? { questionType: derivedType } : {}),
          eligible: ineligibleReason === null,
          ineligibleReason,
        };
      },
    ),
    total,
    page,
    pageSize,
    units: units.map(({ _count, ...unit }) => unit),
    grades: Array.from(counts, ([grade, count]) => ({ grade, count })).filter(
      (item) => item.count > 0,
    ),
    chapters: [
      ...new Set(
        units
          .filter(
            (unit) =>
              (!grade || unit.grade === grade) && unit._count.problems > 0,
          )
          .map((unit) => unit.chapter),
      ),
    ],
  };
}
