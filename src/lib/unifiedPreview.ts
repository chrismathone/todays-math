import "server-only";
import type { Prisma } from "@prisma/client";
import {
  BANK_SOURCE_GROUP_SOURCES,
  unifiedBankQuerySchema,
} from "@/contracts/bankSource.contract";
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
import { withProblemSourceReferences } from "@/lib/problem/sourceReference";
import type { ProblemSourceReference } from "@/contracts/problemSourceReference.contract";
import type {
  BankData,
  BankProblem,
  StudioProblem,
} from "@/components/unified/types";

export class UnifiedBankQueryError extends Error {}

/** Shared filters keep manual browsing and random selection in the same pool. */
export async function resolveUnifiedBankQuery(params = new URLSearchParams()) {
  const parsed = unifiedBankQuerySchema.safeParse(
    Object.fromEntries(
      Array.from(params).filter(
        ([key, value]) =>
          ["unitIds", "excludeIds", "ids"].includes(key) || value.trim() !== "",
      ),
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
    pageSize,
    unitIds,
    excludeIds,
    ids,
    semester,
    sourceGroup,
    books,
    materialKinds,
  } = parsed.data;
  // Explicit status inspection may include rows that cannot be issued. Private
  // pools never become visible, and the returned eligibility controls adding.
  const visibility = reviewStatus
    ? { AND: [problemVisibleWhere(), { reviewStatus }] }
    : problemEligibleWhere();
  const clauses: Prisma.ProblemWhereInput[] = [visibility];
  if (unitIds) clauses.push({ unitId: { in: unitIds } });
  if (excludeIds) clauses.push({ NOT: { id: { in: excludeIds } } });
  if (ids) clauses.push({ id: { in: ids } });
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
  // 학기는 차시의 값이다(D-161) — 학기가 없는 차시(고등 선택 과목)는 학기를 고르면 안 걸린다.
  if (semester) clauses.push({ unit: { semester: Number(semester) } });
  // 출처 줄(H1 ⑴) — 갈래 하나가 출처 값 여럿을 덮는다(엔진 = manual · 그 밖 = 변형 + AI 생성).
  if (sourceGroup)
    clauses.push({
      source: { in: [...BANK_SOURCE_GROUP_SOURCES[sourceGroup]] },
    });
  // 교과서 책 · 자료 종류 — 여럿 고르기, 둘 사이는 «그리고». 자료가 없는 문항은 고르는 순간 빠진다.
  if (books) clauses.push({ sourceMaterial: { bookId: { in: books } } });
  if (materialKinds)
    clauses.push({ sourceMaterial: { kind: { in: materialKinds } } });
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
  return {
    where,
    format,
    visibility,
    grade,
    semester,
    requestedPage,
    pageSize,
  };
}

export const UNIFIED_PROBLEM_SELECT = {
  id: true,
  unitId: true,
  content: true,
  answer: true,
  solution: true,
  difficulty: true,
  problemCode: true,
  figureUrls: true,
  figureSvg: true,
  figureDims: true,
  figureSourceMm: true,
  choiceFigureIndex: true,
  source: true,
  reviewStatus: true,
  problemType: true,
  questionType: true,
  familyKey: true,
  /**
   * 🔴 출처 배지가 **[변] AI 변형과 [문] 문제집을 가르는 유일한 값**이다
   * (`provenance.ts` `classifyOrigin`). 안 뽑으면 변형본이 조용히 문제집으로
   * 붙는다 — 에러가 안 난다. 2026-09-14 까지 이 화면에 배지가 아예 없어서
   * 그 누락이 드러나지 않았다.
   */
  originProblemId: true,
  pool: true,
  directUseAllowed: true,
  unit: { select: { grade: true, chapter: true, section: true } },
} satisfies Prisma.ProblemSelect;

type UnifiedProblemRow = Prisma.ProblemGetPayload<{
  select: typeof UNIFIED_PROBLEM_SELECT;
}>;

export function toBankProblem({
  unit,
  pool,
  directUseAllowed,
  questionType,
  ...problem
}: UnifiedProblemRow & {
  sourceReference?: ProblemSourceReference | null;
}): BankProblem {
  const questionTypes: Record<string, StudioProblem["questionType"]> = {
    multiple_choice: "multiple-choice",
    short_answer: "short-answer",
    descriptive: "descriptive",
  };
  // 🔴 `familyKey` 를 **구조분해로 빼내지 않는다.** 빼내면 형식 판정에만 쓰이고
  //    돌려주는 객체에서 사라져, 화면이 출처 배지를 그릴 근거를 잃는다 —
  //    그러면 엔진 문항이 전부 `[?] 미분류`로 나오는데 **에러가 안 난다**
  //    (`problem.contract.ts` 가 경고해 둔 그 자리, 2026-09-14 실제로 발생).
  const ineligibleReason = problemIneligibleReason({
    ...problem,
    pool,
    directUseAllowed,
  });
  const derivedType =
    questionTypes[classifyFormat({ ...problem, questionType })];
  return {
    ...problem,
    ...unit,
    solution: problem.solution ?? "",
    problemCode: problem.problemCode ?? "",
    /**
     * 🔴 **원본 형식 값을 따로 실어 보낸다.** 아래에서 `questionType` 을 영문
     *    파생값(`short-answer` …)으로 덮어쓰는데, `classifyFormat` 은 한글
     *    (`단답형`·`서술형`)과 견준다. 화면이 그 덮어쓴 값으로 형식 배지를 다시
     *    판정하면 두 한글 가지에 하나도 안 걸려 **서버는 `descriptive` 인데
     *    화면은 `[?형식]`** 이 된다 — 규칙이 두 벌로 갈리는 자리다.
     */
    questionTypeRaw: questionType ?? null,
    ...(derivedType ? { questionType: derivedType } : {}),
    eligible: ineligibleReason === null,
    ineligibleReason,
  };
}

export type UnifiedBankBootstrap = Pick<
  BankData,
  "total" | "grades" | "chapters" | "units"
>;

async function loadUnifiedBankMetadata(
  {
    where,
    visibility,
    grade,
    semester,
  }: Awaited<ReturnType<typeof resolveUnifiedBankQuery>>,
  totalOverride?: number,
): Promise<UnifiedBankBootstrap> {
  const [total, units] = await Promise.all([
    totalOverride === undefined
      ? db.problem.count({ where })
      : Promise.resolve(totalOverride),
    db.unit.findMany({
      select: {
        id: true,
        grade: true,
        chapter: true,
        section: true,
        orderIndex: true,
        semester: true,
        _count: { select: { problems: { where: visibility } } },
      },
      orderBy: { orderIndex: "asc" },
    }),
  ]);
  const counts = new Map<string, number>();
  for (const unit of units)
    counts.set(
      unit.grade,
      (counts.get(unit.grade) ?? 0) + unit._count.problems,
    );
  return {
    total,
    units: units.map(({ id, grade, chapter, section, orderIndex }) => ({
      id,
      grade,
      chapter,
      section,
      orderIndex,
    })),
    grades: Array.from(counts, ([grade, count]) => ({ grade, count })).filter(
      (item) => item.count > 0,
    ),
    chapters: [
      ...new Set(
        units
          .filter(
            (unit) =>
              (!grade || unit.grade === grade) &&
              (!semester || unit.semester === Number(semester)) &&
              unit._count.problems > 0,
          )
          .map((unit) => unit.chapter),
      ),
    ],
  };
}

/** Metadata for the authenticated workspace shell; intentionally omits problem payloads. */
export async function loadUnifiedBankBootstrap(): Promise<UnifiedBankBootstrap> {
  return loadUnifiedBankMetadata(await resolveUnifiedBankQuery());
}

/** Read-only shared-bank inspection. Issuance eligibility remains a separate rule. */
export async function loadUnifiedBank(
  params = new URLSearchParams(),
): Promise<BankData> {
  const {
    where,
    format,
    visibility,
    grade,
    semester,
    requestedPage,
    pageSize,
  } = await resolveUnifiedBankQuery(params);
  const orderBy = PROBLEM_BANK_ORDER_BY;
  const formatIds = await findProblemIdsByFormat(format, where, orderBy);
  const metadata = await loadUnifiedBankMetadata(
    {
      where,
      format,
      visibility,
      grade,
      semester,
      requestedPage,
      pageSize,
    },
    formatIds === null ? undefined : formatIds.length,
  );
  const page = Math.min(
    requestedPage,
    Math.max(1, Math.ceil(metadata.total / pageSize)),
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
    select: UNIFIED_PROBLEM_SELECT,
  });
  return {
    problems: (await withProblemSourceReferences(rows)).map(toBankProblem),
    page,
    pageSize,
    ...metadata,
  };
}
