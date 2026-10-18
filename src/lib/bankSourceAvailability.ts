import "server-only";
import type { Prisma } from "@prisma/client";
import {
  BANK_AVAILABILITY_AXES,
  BANK_SOURCE_AVAILABILITY_VERSION,
  BANK_SOURCE_GROUP_SOURCES,
  BANK_SOURCE_GROUPS,
  bankBookIdsParamSchema,
  type BankAvailabilityTally,
  type BankSourceAvailability,
  type BankSourceGroup,
  type BankSourceMaterial,
  type BankSourceMaterials,
} from "@/contracts/bankSource.contract";
import { DIFFICULTY_LADDER, type Difficulty } from "@/contracts/difficulty";
import { db } from "@/lib/db";
import { problemEligibleWhere } from "@/lib/problemEligibility";
import { problemVisibleWhere } from "@/lib/problemPool";
import { findProblemIdsByFormat } from "@/lib/problem/formatQuery";
import { PROBLEM_BANK_ORDER_BY } from "@/lib/problem/problemOrder";
import type { BankQueryContext } from "@/lib/bankQueryContext";
import {
  loadQuestionSourceAvailability,
  loadQuestionSourceMaterials,
} from "./bankSourceQuestions";
import { canonicalFamilyKey } from "@/lib/generator/familyAliases";
import {
  resolveUnifiedBankQuery,
  UnifiedBankQueryError,
} from "@/lib/unifiedPreview";

/**
 * 문제은행 **현재 조건의 가용량** (문제은행 P0 · 2026-10-14 · `bankSourceAvailabilitySchema`).
 *
 * 전역 재고(`bankSourceCounts.ts`, D-161)는 건드리지 않는다 — 그 숫자는 «다른 필터와 무관»이 뜻이다.
 * 이것은 목록 · 랜덤 고르기 · 구성과 **같은 조건 해석**(`resolveUnifiedBankQuery`)에 같은 출제 자격
 * (`problemEligibleWhere`)을 걸어 센다. 그래서 같은 데이터 · 같은 조건이면
 *   available = 목록 total(검수 상태를 안 골랐을 때) = 랜덤 고르기의 난이도별 available 합 = 구성의 차시별 available 합
 * 이고, 이것을 `unifiedBankAvailability.test.ts` 가 짝으로 잠근다.
 *
 * 질의는 묶음 셈(`groupBy`)뿐이다 — 문항 행을 읽어 오지 않는다. 형식(`format`) 조건만은 본문을 읽어 가르므로
 * 목록과 같은 `findProblemIdsByFormat` 으로 두 수(보유 · 사용 가능)만 세고 갈래는 세지 않는다(`facets: null`).
 */

/** 보기 · 판 · 쪽 — 조건이 아니라 이 요청의 모양이다. 조회 조건 계약은 엄격해서 남겨 두면 400 이 된다. */
const NOT_FILTERS = [
  "view",
  "version",
  "page",
  "pageSize",
  "families",
] as const;

function stripped(params: URLSearchParams, keys: readonly string[]) {
  const copy = new URLSearchParams(params);
  for (const key of keys) copy.delete(key);
  return copy;
}

const tally = (
  held: Map<string, number>,
  available: Map<string, number>,
  key: string,
): BankAvailabilityTally => ({
  held: held.get(key) ?? 0,
  available: available.get(key) ?? 0,
});

/** 같은 조건 F 에 «보유»(공용 풀) · «사용 가능»(출제 자격)을 걸어 `by` 칸으로 묶어 센다. */
async function countBy(
  selection: Prisma.ProblemWhereInput[],
  by: "unitId" | "difficulty" | "source" | "sourceMaterialId",
) {
  const [held, available] = await Promise.all(
    [problemVisibleWhere(), problemEligibleWhere()].map((gate) =>
      db.problem.groupBy({
        by: [by],
        where: { AND: [gate, ...selection] },
        _count: { _all: true },
      }),
    ),
  );
  const toMap = (rows: typeof held) =>
    new Map(
      rows.map((row) => [
        String((row as Record<string, unknown>)[by] ?? ""),
        row._count._all,
      ]),
    );
  return { held: toMap(held!), available: toMap(available!) };
}

/**
 * D-111 — 차시별 **출제 가능한 문항류(갈래) 수**. 행을 읽지 않고 `(unitId, familyKey)` 로 묶어 센다.
 * 키가 없는(NULL · 빈 값) 묶음은 행 하나하나가 각자 한 갈래다(D-105 — NULL 을 한 무리로 접지 않는다).
 * 키는 `familyIdOf` 처럼 앞뒤 공백을 걷어 견준다.
 */
async function countFamiliesByUnit(selection: Prisma.ProblemWhereInput[]) {
  const rows = await db.problem.groupBy({
    by: ["unitId", "familyKey"],
    where: { AND: [problemEligibleWhere(), ...selection] },
    _count: { _all: true },
  });
  const keyed = new Map<string, Set<string>>();
  const solo = new Map<string, number>();
  for (const row of rows) {
    const key = row.familyKey?.trim()
      ? canonicalFamilyKey(row.unitId, row.familyKey)
      : null;
    if (!key)
      solo.set(row.unitId, (solo.get(row.unitId) ?? 0) + row._count._all);
    else keyed.set(row.unitId, (keyed.get(row.unitId) ?? new Set()).add(key));
  }
  return Object.fromEntries(
    [...new Set([...keyed.keys(), ...solo.keys()])]
      .sort()
      .map((unitId) => [
        unitId,
        (keyed.get(unitId)?.size ?? 0) + (solo.get(unitId) ?? 0),
      ]),
  );
}

const sum = (map: Map<string, number>) =>
  [...map.values()].reduce((total, n) => total + n, 0);

/**
 * 보기 · 판의 문지기 — `view` 가 그 보기가 아니거나 `version` 이 지금 판(1)이 아니면 `UnifiedBankQueryError`
 * (라우트가 400 으로 낸다). 다른 판을 달라는 화면에 이 판을 내주지 않는다.
 */
function checkView(params: URLSearchParams, view: "available" | "materials") {
  if (params.get("view") !== view)
    throw new UnifiedBankQueryError("알 수 없는 보기입니다.");
  const version = params.get("version");
  if (version !== null && version !== String(BANK_SOURCE_AVAILABILITY_VERSION))
    throw new UnifiedBankQueryError(
      `이 보기는 판 ${BANK_SOURCE_AVAILABILITY_VERSION}만 냅니다.`,
    );
}

/** `view=available` 요청 → 가용량. 조건이 틀리면 `UnifiedBankQueryError`(라우트가 400 으로 낸다). */
export async function loadBankSourceAvailability(
  params: URLSearchParams,
  /** `recent=1`(최근 출제 빼기)이면 계정을 여기서 안다 — 갈래 넷이 모두 같은 조건으로 센다. */
  context?: BankQueryContext,
): Promise<BankSourceAvailability> {
  if (params.get("identity") === "question")
    return loadQuestionSourceAvailability(params, context);
  checkView(params, "available");
  const filters = stripped(params, NOT_FILTERS);
  const main = await resolveUnifiedBankQuery(filters, context);
  const heldWhere = { AND: [problemVisibleWhere(), ...main.selection] };
  const availableWhere = { AND: [problemEligibleWhere(), ...main.selection] };

  if (main.format) {
    if (main.format === "multiple_choice")
      throw new UnifiedBankQueryError(
        "객관식 필터에는 문항 보기가 필요합니다.",
      );
    // 형식은 본문을 읽어 가른다 — 목록과 같은 함수로 두 수만 센다(목록 total 과 같은 수).
    const format = main.format;
    const [held, available] = await Promise.all(
      [heldWhere, availableWhere].map((where) =>
        findProblemIdsByFormat(format, where, PROBLEM_BANK_ORDER_BY),
      ),
    );
    return {
      view: "available",
      version: BANK_SOURCE_AVAILABILITY_VERSION,
      held: held!.length,
      available: available!.length,
      facets: null,
    };
  }

  const [unitsQuery, difficultyQuery, sourceQuery] = await Promise.all([
    resolveUnifiedBankQuery(
      stripped(filters, BANK_AVAILABILITY_AXES.units),
      context,
    ),
    resolveUnifiedBankQuery(
      stripped(filters, BANK_AVAILABILITY_AXES.difficulties),
      context,
    ),
    resolveUnifiedBankQuery(
      stripped(filters, BANK_AVAILABILITY_AXES.sources),
      context,
    ),
  ]);
  const textbookSelection = [
    ...sourceQuery.selection,
    { source: "school_textbook" as const },
  ];
  const [held, available, units, difficulties, sources, materials, families] =
    await Promise.all([
      db.problem.count({ where: heldWhere }),
      db.problem.count({ where: availableWhere }),
      countBy(unitsQuery.selection, "unitId"),
      countBy(difficultyQuery.selection, "difficulty"),
      countBy(sourceQuery.selection, "source"),
      countBy(textbookSelection, "sourceMaterialId"),
      params.get("families") === "1"
        ? countFamiliesByUnit(unitsQuery.selection)
        : Promise.resolve(undefined),
    ]);

  const groupTally = (group: BankSourceGroup): BankAvailabilityTally =>
    BANK_SOURCE_GROUP_SOURCES[group].reduce(
      (acc, source) => {
        const one = tally(sources.held, sources.available, source);
        return {
          held: acc.held + one.held,
          available: acc.available + one.available,
        };
      },
      { held: 0, available: 0 },
    );

  // 자료 → 책 · 종류. 자료가 없는 교과서 문항(열쇠 "")은 교과서 합에만 든다.
  const materialIds = [...materials.held.keys()].filter(Boolean);
  const materialRows = materialIds.length
    ? await db.sourceMaterial.findMany({
        where: { id: { in: materialIds } },
        select: { id: true, bookId: true, kind: true },
      })
    : [];
  const books = new Map<
    string,
    {
      held: number;
      available: number;
      kinds: Record<string, BankAvailabilityTally>;
    }
  >();
  for (const material of materialRows) {
    const one = tally(materials.held, materials.available, material.id);
    if (one.held === 0) continue;
    const book = books.get(material.bookId) ?? {
      held: 0,
      available: 0,
      kinds: {},
    };
    book.held += one.held;
    book.available += one.available;
    const kind = book.kinds[material.kind] ?? { held: 0, available: 0 };
    book.kinds[material.kind] = {
      held: kind.held + one.held,
      available: kind.available + one.available,
    };
    books.set(material.bookId, book);
  }

  return {
    view: "available",
    version: BANK_SOURCE_AVAILABILITY_VERSION,
    held,
    available,
    facets: {
      units: Object.fromEntries(
        [...units.held.keys()]
          .filter(Boolean)
          .sort()
          .map((unitId) => [
            unitId,
            tally(units.held, units.available, unitId),
          ]),
      ),
      ...(families ? { unitFamilies: families } : {}),
      difficulties: Object.fromEntries(
        DIFFICULTY_LADDER.map((tier) => [
          tier,
          tally(difficulties.held, difficulties.available, tier),
        ]),
      ) as Record<Difficulty, BankAvailabilityTally>,
      sources: {
        total: { held: sum(sources.held), available: sum(sources.available) },
        ...(Object.fromEntries(
          BANK_SOURCE_GROUPS.map((group) => [group, groupTally(group)]),
        ) as Record<BankSourceGroup, BankAvailabilityTally>),
      },
      textbook: {
        held: sum(materials.held),
        available: sum(materials.available),
        books: [...books.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([id, book]) => ({ id, ...book })),
      },
    },
  };
}

/** 빈 칸(null)은 뒤로 — 단원 번호 · 회차가 없는 자료가 앞을 가리지 않게. */
const nullsLast = (a: number | null, b: number | null) =>
  a === b ? 0 : a === null ? 1 : b === null ? -1 : a - b;

/**
 * `view=materials&books=…` → 고른 책들의 자료와 자료마다의 보유 · 사용 가능 수(`bankSourceMaterialsSchema`).
 *
 * 수는 조건 F 에서 **출처 축을 뺀**(이 보기는 늘 교과서다 — 다른 갈래 · 고른 자료 · 자료 종류에 묶이지 않는다)
 * 나머지 조건 + 출처 = 교과서 + 고른 책으로 센다. 메타데이터는 저장된 값 그대로 — 빈 칸을 지어내지 않는다.
 */
export async function loadBankSourceMaterials(
  params: URLSearchParams,
  context?: BankQueryContext,
): Promise<BankSourceMaterials> {
  if (params.get("identity") === "question")
    return loadQuestionSourceMaterials(params, context);
  checkView(params, "materials");
  const books = bankBookIdsParamSchema.safeParse(params.get("books") ?? "");
  if (!books.success)
    throw new UnifiedBankQueryError("자료를 볼 책을 골라 주세요.");
  const query = await resolveUnifiedBankQuery(
    stripped(params, [...NOT_FILTERS, ...BANK_AVAILABILITY_AXES.sources]),
    context,
  );
  const [materials, counts] = await Promise.all([
    db.sourceMaterial.findMany({
      where: { bookId: { in: books.data } },
      select: {
        id: true,
        bookId: true,
        kind: true,
        kindRaw: true,
        title: true,
        chapterNo: true,
        middleNo: true,
        sectionNo: true,
        unitRaw: true,
        semester: true,
        round: true,
        levelRaw: true,
        sequence: true,
      },
    }),
    countBy(
      [
        ...query.selection,
        { source: "school_textbook" },
        { sourceMaterial: { bookId: { in: books.data } } },
      ],
      "sourceMaterialId",
    ),
  ]);
  const bookOrder = new Map(books.data.map((id, index) => [id, index]));
  return {
    view: "materials",
    version: BANK_SOURCE_AVAILABILITY_VERSION,
    materials: materials
      .map((material): BankSourceMaterial => ({
        ...material,
        ...tally(counts.held, counts.available, material.id),
      }))
      .sort(
        (a, b) =>
          bookOrder.get(a.bookId)! - bookOrder.get(b.bookId)! ||
          nullsLast(a.chapterNo, b.chapterNo) ||
          nullsLast(a.middleNo, b.middleNo) ||
          nullsLast(a.sectionNo, b.sectionNo) ||
          a.kind.localeCompare(b.kind, "ko") ||
          nullsLast(a.sequence, b.sequence) ||
          a.title.localeCompare(b.title, "ko") ||
          a.id.localeCompare(b.id),
      ),
  };
}
