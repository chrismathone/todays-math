import "server-only";
import {
  withBankReadFingerprint,
  withBankReadClient,
  currentBankReadClient,
} from "./bankReadFingerprint";
import type { Prisma } from "@prisma/client";
import {
  BANK_SOURCE_GROUP_SOURCES,
  unifiedBankQuerySchema,
} from "@/contracts/bankSource.contract";
import { PROBLEM_CODE_PATTERN } from "@/contracts/problemCode.contract";
import { db } from "@/lib/db";
import {
  cachedBankRead,
  cachedBankQuestionList,
  publicBankListQueryKey,
  publicBankQueryKey,
} from "@/lib/bankReadCache";
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
import { familyKeyVariants } from "@/lib/generator/familyAliases";
import { familyIdOf } from "@/lib/generator/familyKey";
import {
  excludeQuestionsWhere,
  withQuestionMetadata,
} from "@/lib/problem/questionQueries";
import { QUESTION_REVISION_SELECT } from "@/lib/problem/questionSelection";
import {
  loadQuestionCandidates,
  projectQuestionCandidates,
  questionReadMetadata,
} from "@/lib/problem/questionProjection";
import { loadQuestionCounts } from "@/lib/problem/questionCountProjection";
import { questionBucketTally } from "@/lib/problem/questionCountBuckets";
import {
  questionPageSql,
  type CountBucket,
} from "@/lib/problem/questionCountSql";
import type { ProblemSourceReference } from "@/contracts/problemSourceReference.contract";
import type { BankQueryContext } from "@/lib/bankQueryContext";
import {
  unifiedBankCurriculumQuerySchema,
  type UnifiedBankCurriculum,
} from "@/contracts/unifiedBankBootstrap.contract";
import type {
  BankData,
  BankProblem,
  StudioProblem,
} from "@/components/unified/types";

export class UnifiedBankQueryError extends Error {}

/**
 * D-111 — 주어진 문항들의 **문항류를 통째로** 빼는 조건. 정체는 `(unitId, familyKey)` 복합키다(D-111 ⑴) —
 * 같은 키 문자열이라도 단원이 다르면 다른 류라 남는다. 키가 없는(NULL · 빈 값) 문항은 **자기 자신만** 뺀다
 * (D-105 · D-111 ⑵ — NULL 을 한 무리로 묶으면 레거시 수만 행이 한 류가 된다).
 */
async function excludeFamiliesClause(
  ids: readonly string[],
): Promise<Prisma.ProblemWhereInput> {
  const rows = await (currentBankReadClient()?.problem ?? db.problem).findMany({
    where: { id: { in: [...ids] } },
    select: { unitId: true, familyKey: true },
  });
  const pairs = new Map<string, { unitId: string; familyKey: string }>();
  for (const { unitId, familyKey } of rows)
    if (familyKey?.trim())
      for (const variant of familyKeyVariants(unitId, familyKey))
        pairs.set(JSON.stringify([unitId, variant]), {
          unitId,
          familyKey: variant,
        });
  return {
    NOT: {
      OR: [{ id: { in: [...ids] } }, ...pairs.values()],
    },
  };
}

/**
 * W3 «같은 문항류» — 이 문항과 같은 `(unitId, familyKey)` 의 다른 문항. 키는 `familyIdOf` 처럼 앞뒤 공백을 걷어
 * 견준다(그래서 그 단원의 키 있는 행을 읽어 가른다 — 단원 하나라 작다). 키가 없으면 혼자라 아무것도 안 걸린다.
 */
async function familyOfClause(id: string): Promise<Prisma.ProblemWhereInput> {
  const row = await (currentBankReadClient()?.problem ?? db.problem).findUnique(
    {
      where: { id },
      select: { unitId: true, familyKey: true },
    },
  );
  const key = row?.familyKey?.trim();
  if (!row || !key) return { id: { in: [] } };
  const keyed = await (currentBankReadClient()?.problem ?? db.problem).findMany(
    {
      where: { unitId: row.unitId, NOT: { familyKey: null } },
      select: { id: true, familyKey: true },
    },
  );
  return {
    id: {
      in: keyed
        .filter(
          (other) =>
            other.id !== id &&
            familyIdOf({ ...other, unitId: row.unitId }) ===
              familyIdOf({ id, ...row }),
        )
        .map((other) => other.id),
    },
  };
}

/**
 * Shared filters keep manual browsing and random selection in the same pool.
 *
 * `context` — 요청 바깥에서 알아야 하는 것(지금은 최근 출제 빼기의 계정). `recent=1` 인데 없으면 거절한다:
 * 조용히 넘기면 «뺐다»고 말한 화면이 빼지 않은 수를 보인다.
 */
export async function resolveUnifiedBankQuery(
  params = new URLSearchParams(),
  context?: BankQueryContext,
) {
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
    excludeFamiliesOf,
    recent,
    familyOf,
    ids,
    semester,
    sourceGroup,
    books,
    materialKinds,
    materials,
    identity,
    availableFormat,
  } = parsed.data;
  // Explicit status inspection may include rows that cannot be issued. Private
  // pools never become visible, and the returned eligibility controls adding.
  const visibility = reviewStatus
    ? { AND: [problemVisibleWhere(), { reviewStatus }] }
    : problemEligibleWhere();
  const clauses: Prisma.ProblemWhereInput[] = [visibility];
  if (unitIds) clauses.push({ unitId: { in: unitIds } });
  if (excludeIds)
    clauses.push(
      identity === "question"
        ? await excludeQuestionsWhere(excludeIds)
        : { NOT: { id: { in: excludeIds } } },
    );
  if (excludeFamiliesOf)
    clauses.push(await excludeFamiliesClause(excludeFamiliesOf));
  if (familyOf) {
    clauses.push(await familyOfClause(familyOf));
    if (identity === "question")
      clauses.push(await excludeQuestionsWhere([familyOf]));
  }
  if (recent) {
    if (!context)
      throw new UnifiedBankQueryError(
        "최근 출제 문항을 확인할 계정을 알 수 없습니다.",
      );
    const recentIds = await context.recentProblemIds();
    if (recentIds.length)
      clauses.push(
        identity === "question"
          ? await excludeQuestionsWhere(recentIds)
          : { NOT: { id: { in: [...recentIds] } } },
      );
  }
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
  // 자료(문제은행 P0 — 책 → 자료 → 자료 안 번호). 자료가 없는 문항은 고르는 순간 빠진다.
  if (materials) clauses.push({ sourceMaterialId: { in: materials } });
  const rangeIds = [
    ...new Set([unitFrom, unitTo].filter((id): id is string => Boolean(id))),
  ];
  if (rangeIds.length) {
    const bounds = await (currentBankReadClient()?.unit ?? db.unit).findMany({
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
    /**
     * 고르는 조건만 — 보임 · 출제 자격 관문을 뺀 나머지(검수 상태를 골랐으면 그것도 여기 든다).
     * 가용량(`bankSourceAvailability.ts`)이 «보유»(공용 풀) · «사용 가능»(출제 자격)을 **같은 조건**에 걸어 세려고 쓴다.
     * 검수 상태를 안 골랐으면 `AND[problemEligibleWhere(), ...selection]` 이 곧 `where` 다.
     */
    selection: [
      ...(reviewStatus ? [{ reviewStatus }] : []),
      ...clauses.slice(1),
    ] satisfies Prisma.ProblemWhereInput[],
    format: availableFormat ?? format,
    identity,
    exactIds: ids !== undefined,
    visibility,
    grade,
    semester,
    requestedPage,
    pageSize,
    /**
     * 목록 차례. 자료를 골랐으면 자료 → 자료 안 번호(`questionNumber`) → 은행 차례 — 번호는 자료 안에서도
     * 겹칠 수 있어(실측 86편) 마지막 열쇠가 동률을 정한다. 안 골랐으면 은행 차례 그대로.
     */
    orderBy: (materials
      ? [
          { sourceMaterialId: "asc" },
          { questionNumber: "asc" },
          ...PROBLEM_BANK_ORDER_BY,
        ]
      : PROBLEM_BANK_ORDER_BY) satisfies Prisma.ProblemOrderByWithRelationInput[],
  };
}

export const UNIFIED_PROBLEM_SELECT = {
  ...QUESTION_REVISION_SELECT,
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
  /**
   * 자료 안 번호(교과서) · 시험지 번호(기출) — 문제은행 P0 의 «책 → 자료 → 자료 안 번호». 자료 안에서도 겹칠 수
   * 있어(실측 86편) 화면은 문항 코드와 함께 보인다. `sourceReference` 는 변형의 **원본**을 말하므로 이 행의 번호가 아니다.
   */
  questionNumber: true,
  pool: true,
  directUseAllowed: true,
  unit: { select: { grade: true, chapter: true, section: true } },
} satisfies Prisma.ProblemSelect;

type UnifiedProblemRow = Prisma.ProblemGetPayload<{
  select: typeof UNIFIED_PROBLEM_SELECT;
}>;
type UnifiedProblemInput = Omit<
  UnifiedProblemRow,
  | "externalId"
  | "sourceMaterialId"
  | "figureSource"
  | "questionGroupKey"
  | "updatedAt"
> &
  Partial<
    Pick<
      UnifiedProblemRow,
      | "externalId"
      | "sourceMaterialId"
      | "figureSource"
      | "questionGroupKey"
      | "updatedAt"
    >
  >;

export function toBankProblem({
  unit,
  pool,
  directUseAllowed,
  questionType,
  questionGroupKey,
  updatedAt,
  externalId,
  sourceMaterialId,
  figureSource,
  ...problem
}: UnifiedProblemInput & {
  sourceReference?: ProblemSourceReference | null;
}): BankProblem {
  // Internal proof/revision evidence is not part of the old BankProblem response.
  void [
    questionGroupKey,
    updatedAt,
    externalId,
    sourceMaterialId,
    figureSource,
  ];
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

/** Body and revision are read in one snapshot on both authenticated/dev detail routes. */
export async function loadUnifiedBankProblem(
  id: string,
  identity?: "question",
): Promise<BankProblem | null> {
  const read = async (client: Prisma.TransactionClient) => {
    const row = await client.problem.findFirst({
      where: { AND: [{ id }, problemVisibleWhere()] },
      select: UNIFIED_PROBLEM_SELECT,
    });
    if (!row) return null;
    const rows = identity ? await withQuestionMetadata([row], client) : [row];
    return toBankProblem((await withProblemSourceReferences(rows))[0]!);
  };
  return identity
    ? db.$transaction(read, {
        isolationLevel: "RepeatableRead",
        timeout: 10000,
      })
    : read(db);
}

export type UnifiedBankBootstrap = Pick<
  BankData,
  | "total"
  | "grades"
  | "chapters"
  | "units"
  | "unitCounts"
  | "version"
  | "countUnit"
  | "queryKey"
>;

/** Shared scope-counts predicate, format and grouped counter. */
export async function loadFilteredQuestionScopeCounts(
  params: URLSearchParams,
  context: BankQueryContext | undefined,
  tx: Prisma.TransactionClient,
  dimensions: import("./problem/questionCountSql").CountDimension[],
) {
  const resolved = await resolveUnifiedBankQuery(params, context);
  return loadQuestionCounts(
    { AND: [problemVisibleWhere(), ...resolved.selection] },
    tx,
    dimensions,
    resolved.format,
    undefined,
    false,
  );
}

/** S2 navigation: metadata remains available even when filtered counts are zero. */
export async function loadUnifiedBankCurriculum(
  params: URLSearchParams,
  context?: BankQueryContext,
): Promise<UnifiedBankCurriculum> {
  const parsed = unifiedBankCurriculumQuerySchema.safeParse(
    Object.fromEntries(params),
  );
  if (!parsed.success || new Set(params.keys()).size !== params.size)
    throw new UnifiedBankQueryError(
      "검색 조건이 올바르지 않습니다. 필터를 확인해 주세요.",
    );
  if (parsed.data.availability === "1") {
    const filters = new URLSearchParams(params);
    filters.delete("view");
    filters.delete("availability");
    filters.delete("version");
    filters.delete("families");
    // Resolve and count inside the same scoped snapshot as the labels.
    return db.$transaction(
      (tx) =>
        withBankReadClient(tx, async () => {
          const buckets = await loadFilteredQuestionScopeCounts(
            filters,
            context,
            tx,
            ["unit"],
          );
          const metadataParams = new URLSearchParams();
          for (const key of ["identity", "view", "grade", "chapter", "unitIds"])
            if (params.has(key)) metadataParams.set(key, params.get(key)!);
          const metadata = await loadUnifiedBankCurriculum(metadataParams);
          if (parsed.data.unitIds || parsed.data.chapter) return metadata;
          const field = parsed.data.grade ? "chapter" : "grade";
          const labels =
            field === "grade" ? metadata.grades : metadata.chapters;
          const units = await tx.unit.findMany({
            where: parsed.data.grade ? { grade: parsed.data.grade } : undefined,
            select: { id: true, grade: true, chapter: true },
          });
          const byUnit = new Map(
            buckets
              .filter((b) => b.axis === "unit")
              .map((b) => [b.key, b.available]),
          );
          const counts = Object.fromEntries(labels.map((label) => [label, 0]));
          for (const unit of units) {
            const label = unit[field];
            if (Object.hasOwn(counts, label))
              counts[label] += byUnit.get(unit.id) ?? 0;
          }
          return {
            ...metadata,
            [field === "grade" ? "gradeCounts" : "chapterCounts"]: counts,
          };
        }),
      { isolationLevel: "RepeatableRead", timeout: 30000 },
    );
  }
  const { grade, chapter, unitIds } = parsed.data;
  if (unitIds || chapter) {
    const units = await (currentBankReadClient()?.unit ?? db.unit).findMany({
      where: unitIds ? { id: { in: unitIds } } : { grade, chapter },
      select: {
        id: true,
        grade: true,
        chapter: true,
        section: true,
        orderIndex: true,
      },
      orderBy: { orderIndex: "asc" },
    });
    return { view: "curriculum", grades: [], chapters: [], units };
  }
  if (grade) {
    const rows = await (currentBankReadClient()?.unit ?? db.unit).groupBy({
      where: { grade },
      by: ["chapter"],
      _min: { orderIndex: true },
      orderBy: { _min: { orderIndex: "asc" } },
    });
    return {
      view: "curriculum",
      grades: [],
      chapters: [...new Set(rows.map((row) => row.chapter))],
      units: [],
    };
  }
  const rows = await (currentBankReadClient()?.unit ?? db.unit).groupBy({
    by: ["grade"],
    _min: { orderIndex: true },
    orderBy: { _min: { orderIndex: "asc" } },
  });
  return {
    view: "curriculum",
    grades: [...new Set(rows.map((row) => row.grade))],
    chapters: [],
    units: [],
  };
}

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
    unitCounts: Object.fromEntries(
      units.map((unit) => [unit.id, unit._count.problems]),
    ),
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

/** Shared metadata for authenticated, deferred bank consumers; omits problem payloads. */
export async function loadUnifiedBankBootstrap(
  identity?: "question",
): Promise<UnifiedBankBootstrap> {
  if (identity === "question") {
    return {
      ...(await loadQuestionBankSummary(problemEligibleWhere())),
      ...questionReadMetadata(new URLSearchParams({ identity })),
    };
  }
  return loadUnifiedBankMetadata(await resolveUnifiedBankQuery());
}

/** Read-only shared-bank inspection. Issuance eligibility remains a separate rule. */
export async function loadUnifiedBank(
  params = new URLSearchParams(),
  context?: BankQueryContext,
): Promise<BankData> {
  // Reuse the list route's auth/development gates, but skip candidate paging and
  // body reads when only the shared curriculum/counts are needed. The summary
  // already uses bankReadCache; never cache this request's authorization.
  if (params.get("view") === "bootstrap") {
    if (params.get("identity") !== "question" || params.size !== 2)
      throw new UnifiedBankQueryError(
        "검색 조건이 올바르지 않습니다. 필터를 확인해 주세요.",
      );
    return {
      ...(await loadUnifiedBankBootstrap("question")),
      problems: [],
      page: 1,
      pageSize: 12,
    };
  }
  if (params.get("identity") === "question" && params.get("view") === "page") {
    const filters = new URLSearchParams(params);
    filters.delete("view");
    return loadQuestionBank(filters, context, false);
  }
  if (params.get("identity") === "question")
    return loadQuestionBank(params, context);
  const resolved = await resolveUnifiedBankQuery(params, context);
  const { where, format, requestedPage, pageSize, orderBy } = resolved;
  if (format === "multiple_choice")
    throw new UnifiedBankQueryError("객관식 필터에는 문항 보기가 필요합니다.");
  const formatIds = await findProblemIdsByFormat(format, where, orderBy);
  const metadata = await loadUnifiedBankMetadata(
    resolved,
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

/** Question projection is opt-in; exact saved IDs keep their actual representations. */
async function loadQuestionBank(
  params: URLSearchParams,
  context?: BankQueryContext,
  includeMetadata = true,
): Promise<BankData> {
  return db.$transaction(
    async (tx) =>
      withBankReadFingerprint(tx, async () => {
        const resolved = await resolveUnifiedBankQuery(params, context);
        const cache = new Map<string, ReturnType<typeof classifyFormat>>();
        const metadata = includeMetadata
          ? await loadQuestionBankSummary(
              resolved.visibility,
              resolved.grade,
              resolved.semester,
              params.has("reviewStatus"),
              cache,
              tx,
            )
          : { grades: [], chapters: [] };
        const { where, format, requestedPage, pageSize, orderBy, exactIds } =
          resolved;
        const listingWhere = {
          AND: [problemVisibleWhere(), ...resolved.selection],
        };
        const inspection = params.has("reviewStatus");
        let total: number, page: number, ids: string[];
        if (
          !exactIds &&
          typeof tx.$queryRaw === "function" &&
          questionPageSql(
            listingWhere,
            orderBy,
            !inspection,
            format,
            0,
            pageSize,
            cache,
          )
        ) {
          const readPage = async () => {
            const counts = await loadQuestionCounts(
              listingWhere,
              tx,
              [],
              format,
              cache,
              false,
            );
            const tally = questionBucketTally(counts);
            const total = inspection ? tally.held : tally.available;
            const page = Math.min(
              requestedPage,
              Math.max(1, Math.ceil(total / pageSize)),
            );
            const representatives = total
              ? await tx.$queryRaw<{ id: string }[]>(
                  questionPageSql(
                    listingWhere,
                    orderBy,
                    !inspection,
                    format,
                    (page - 1) * pageSize,
                    pageSize,
                    cache,
                    tx,
                  )!,
                )
              : [];
            return { total, page, ids: representatives.map((row) => row.id) };
          };
          const key = publicBankQueryKey(params);
          const listing =
            key === null
              ? await readPage()
              : await cachedBankRead(`question-page:${key}`, readPage);
          ({ total, page, ids } = listing);
        } else {
          const listing = await cachedBankQuestionList(
            publicBankListQueryKey(params),
            async () => {
              const candidates = await loadQuestionCandidates(
                listingWhere,
                orderBy,
                tx,
                cache,
              );
              const groups = projectQuestionCandidates(candidates, {
                format,
                availableOnly: !inspection && !exactIds,
              });
              const exact = exactIds
                ? candidates.filter((r) => !format || r.actualFormat === format)
                : null;
              return {
                total: groups.length,
                ids: (exact ?? groups.map((g) => g.representative)).map(
                  (row) => row.id,
                ),
              };
            },
          );
          total = listing.total;
          page = Math.min(
            requestedPage,
            Math.max(1, Math.ceil(listing.ids.length / pageSize)),
          );
          ids = listing.ids.slice((page - 1) * pageSize, page * pageSize);
        }
        const rows = ids.length
          ? await tx.problem.findMany({
              where: {
                AND: [exactIds ? listingWhere : where, { id: { in: ids } }],
              },
              select: UNIFIED_PROBLEM_SELECT,
            })
          : [];
        const index = new Map(ids.map((id, i) => [id, i]));
        rows.sort((a, b) => index.get(a.id)! - index.get(b.id)!);
        const enriched = await withQuestionMetadata(rows, tx, {
          AND: resolved.selection,
        });
        const problems = (await withProblemSourceReferences(enriched)).map(
          toBankProblem,
        );
        return {
          problems,
          page,
          pageSize,
          ...questionReadMetadata(params),
          ...(exactIds ? { queryMode: "exact_ids" as const } : {}),
          ...metadata,
          // The cached global summary must never replace this request's filtered total.
          total,
        };
      }),
    { isolationLevel: "RepeatableRead", timeout: 20000 },
  );
}

const QUESTION_UNIT_SELECT = {
  id: true,
  grade: true,
  chapter: true,
  section: true,
  orderIndex: true,
  semester: true,
} as const;
async function loadQuestionBankSummary(
  visibility: Prisma.ProblemWhereInput,
  grade?: string,
  semester?: string,
  inspection = false,
  formats = new Map<string, ReturnType<typeof classifyFormat>>(),
  client?: Prisma.TransactionClient,
): Promise<UnifiedBankBootstrap> {
  const read = async (tx: Prisma.TransactionClient) => {
    const [buckets, units] = await Promise.all([
      loadQuestionCounts(
        visibility,
        tx,
        ["unit", "grade"],
        undefined,
        formats,
        false,
      ),
      tx.unit.findMany({
        select: QUESTION_UNIT_SELECT,
        orderBy: { orderIndex: "asc" },
      }),
    ]);
    return {
      total: questionBucketTally(buckets).available,
      ...questionBankMetadata(buckets, units, grade, semester, inspection),
    };
  };
  const cached = (tx: Prisma.TransactionClient) =>
    withBankReadFingerprint(tx, () =>
      cachedBankRead(
        `bank-summary:${JSON.stringify([visibility, grade, semester, inspection])}`,
        () => read(tx),
      ),
    );
  return client
    ? cached(client)
    : db.$transaction(cached, {
        isolationLevel: "RepeatableRead",
        timeout: 20000,
      });
}
function questionBankMetadata(
  buckets: readonly CountBucket[],
  units: readonly {
    id: string;
    grade: string;
    chapter: string;
    section: string;
    orderIndex: number;
    semester: number | null;
  }[],
  grade?: string,
  semester?: string,
  inspection = false,
): Omit<UnifiedBankBootstrap, "total"> {
  const ordered = (axis: string) => {
    const selected = buckets.filter(
      (b) => b.axis === axis && (inspection ? b.held : b.available) > 0,
    );
    return inspection
      ? selected
      : selected.sort(
          (a, b) =>
            (a.firstAvailable ?? Infinity) - (b.firstAvailable ?? Infinity),
        );
  };
  const counts = new Map(
    ordered("unit").map((b) => [b.key, inspection ? b.held : b.available]),
  );
  return {
    unitCounts: Object.fromEntries(counts),
    units: units.map(({ id, grade, chapter, section, orderIndex }) => ({
      id,
      grade,
      chapter,
      section,
      orderIndex,
    })),
    grades: ordered("grade").map((b) => ({
      grade: b.key,
      count: inspection ? b.held : b.available,
    })),
    chapters: [
      ...new Set(
        units
          .filter(
            (u) =>
              (!grade || u.grade === grade) &&
              (!semester || u.semester === Number(semester)) &&
              (counts.get(u.id) ?? 0) > 0,
          )
          .map((u) => u.chapter),
      ),
    ],
  };
}
