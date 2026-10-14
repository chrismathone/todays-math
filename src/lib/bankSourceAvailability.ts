import "server-only";
import type { Prisma } from "@prisma/client";
import {
  BANK_AVAILABILITY_AXES,
  BANK_SOURCE_AVAILABILITY_VERSION,
  BANK_SOURCE_GROUP_SOURCES,
  BANK_SOURCE_GROUPS,
  bankSourceViewSchema,
  type BankAvailabilityTally,
  type BankSourceAvailability,
  type BankSourceGroup,
} from "@/contracts/bankSource.contract";
import { DIFFICULTY_LADDER, type Difficulty } from "@/contracts/difficulty";
import { db } from "@/lib/db";
import { problemEligibleWhere } from "@/lib/problemEligibility";
import { problemVisibleWhere } from "@/lib/problemPool";
import { findProblemIdsByFormat } from "@/lib/problem/formatQuery";
import { PROBLEM_BANK_ORDER_BY } from "@/lib/problem/problemOrder";
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
const NOT_FILTERS = ["view", "version", "page", "pageSize"] as const;

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

const sum = (map: Map<string, number>) =>
  [...map.values()].reduce((total, n) => total + n, 0);

/**
 * `view=available` 요청 → 가용량. 조건이 틀리면 `UnifiedBankQueryError`(라우트가 400 으로 낸다).
 * `version` 은 생략하거나 지금 판(1)만 받는다 — 다른 판을 달라는 화면에 이 판을 내주지 않는다.
 */
export async function loadBankSourceAvailability(
  params: URLSearchParams,
): Promise<BankSourceAvailability> {
  if (!bankSourceViewSchema.safeParse(params.get("view")).success)
    throw new UnifiedBankQueryError("알 수 없는 보기입니다.");
  const version = params.get("version");
  if (version !== null && version !== String(BANK_SOURCE_AVAILABILITY_VERSION))
    throw new UnifiedBankQueryError(
      `가용량 보기는 판 ${BANK_SOURCE_AVAILABILITY_VERSION}만 냅니다.`,
    );
  const filters = stripped(params, NOT_FILTERS);
  const main = await resolveUnifiedBankQuery(filters);
  const heldWhere = { AND: [problemVisibleWhere(), ...main.selection] };
  const availableWhere = { AND: [problemEligibleWhere(), ...main.selection] };

  if (main.format) {
    // 형식은 본문을 읽어 가른다 — 목록과 같은 함수로 두 수만 센다(목록 total 과 같은 수).
    const [held, available] = await Promise.all(
      [heldWhere, availableWhere].map((where) =>
        findProblemIdsByFormat(main.format, where, PROBLEM_BANK_ORDER_BY),
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
    resolveUnifiedBankQuery(stripped(filters, BANK_AVAILABILITY_AXES.units)),
    resolveUnifiedBankQuery(
      stripped(filters, BANK_AVAILABILITY_AXES.difficulties),
    ),
    resolveUnifiedBankQuery(stripped(filters, BANK_AVAILABILITY_AXES.sources)),
  ]);
  const textbookSelection = [
    ...sourceQuery.selection,
    { source: "school_textbook" as const },
  ];
  const [held, available, units, difficulties, sources, materials] =
    await Promise.all([
      db.problem.count({ where: heldWhere }),
      db.problem.count({ where: availableWhere }),
      countBy(unitsQuery.selection, "unitId"),
      countBy(difficultyQuery.selection, "difficulty"),
      countBy(sourceQuery.selection, "source"),
      countBy(textbookSelection, "sourceMaterialId"),
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
