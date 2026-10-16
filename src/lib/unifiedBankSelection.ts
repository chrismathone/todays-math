import "server-only";
import { z } from "zod";
import { uuidSchema } from "@/contracts/common.contract";
import {
  DIFFICULTY_LADDER,
  type Difficulty,
  type DifficultyRatio,
} from "@/contracts/difficulty";
import { db } from "@/lib/db";
import { problemEligibleWhere } from "@/lib/problemEligibility";
import { findProblemIdsByFormat } from "@/lib/problem/formatQuery";
import { PROBLEM_BANK_ORDER_BY } from "@/lib/problem/problemOrder";
import { familyIdOf } from "@/lib/generator/familyKey";
import { classifyFormat } from "@/lib/problem/provenance";
import { withProblemSourceReferences } from "@/lib/problem/sourceReference";
import type { BankQueryContext } from "@/lib/bankQueryContext";
import {
  resolveUnifiedBankQuery,
  toBankProblem,
  UNIFIED_PROBLEM_SELECT,
  UnifiedBankQueryError,
} from "@/lib/unifiedPreview";

const requestSchema = z
  .object({
    filters: z.string().max(8000).default(""),
    counts: z.record(
      z.enum(DIFFICULTY_LADDER),
      z.number().int().min(0).max(100),
    ),
    excludeIds: z.array(z.string().min(1).max(200)).max(5000).default([]),
  })
  .strict()
  .refine(({ counts }) => {
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    return total >= 1 && total <= 100;
  });

const emptyCounts = () =>
  Object.fromEntries(
    DIFFICULTY_LADDER.map((tier) => [tier, 0]),
  ) as DifficultyRatio;

const allocationSchema = z
  .strictObject({
    allocations: z
      .array(
        z.strictObject({
          unitId: uuidSchema,
          count: z.number().int().min(1).max(100),
        }),
      )
      .min(1)
      .max(100),
    excludeIds: z.array(uuidSchema).max(100).default([]),
    /**
     * 목록과 같은 조회 조건(주소 꼴 — `sourceGroup=…&books=…&difficulty=…`). 비면 조건 없음.
     * 범위는 할당이 정한다 — 차시 고르기(`unitIds` · `unitFrom` · `unitTo`) · `ids` 를 실으면 400 이다.
     */
    filters: z.string().max(8000).default(""),
    /**
     * D-111 을 시험지 만들기에서 지킬지 — 기본 켜짐. 원장님이 끄면(2026-10-16 «기본 켜짐 · 끌 수 있음»)
     * 문항 하나가 각자 한 갈래로 서 예전처럼 행 단위로 뽑는다. 일일테스트 경로는 이 칸이 없다(늘 켜짐).
     */
    distinctFamilies: z.boolean().default(true),
    /**
     * 최근 출제 빼기(D-20 그대로) — 지금 계정의 최근 14일 시험 문항을 뺀다. 계정은 `context` 가 안다.
     * 시험지 만들기 «구성 조건»이 기본 켬으로 보낸다.
     */
    recent: z.boolean().default(false),
    /**
     * 난이도 의도(시험지 전체에 한 번) — 실린 난이도만 정한 것이다. 없는 칸은 «지정 없음»(남는 자리를 채운다),
     * 0 은 «내지 않음». 범위마다 나눈 수(`allocations`) 안에서 맞추고, 모자라면 다른 난이도로 채우지 않는다.
     */
    difficulty: z
      .partialRecord(
        z.enum(DIFFICULTY_LADDER),
        z.number().int().min(0).max(100),
      )
      .optional(),
  })
  .refine(
    ({ allocations }) =>
      allocations.reduce((sum, allocation) => sum + allocation.count, 0) <=
        100 &&
      new Set(allocations.map((allocation) => allocation.unitId)).size ===
        allocations.length,
  );

/** 난이도 의도가 문항 수와 맞는가 — 정한 칸의 합이 넘거나, 모든 칸을 정했는데 합이 다르면 안 된다. */
function intentFits(
  intent: Partial<Record<Difficulty, number>>,
  total: number,
) {
  const tiers = DIFFICULTY_LADDER.filter((tier) => intent[tier] !== undefined);
  const specified = tiers.reduce((sum, tier) => sum + intent[tier]!, 0);
  return (
    specified <= total &&
    (tiers.length < DIFFICULTY_LADDER.length || specified === total)
  );
}

/**
 * 난이도 × 범위 나누기 — 난이도별 수(행)와 범위별 수(열)를 **둘 다** 맞추는 가장 많은 배정(최대 흐름).
 * 칸의 상한은 그 범위 · 그 난이도의 문항류 수다. 「지정 없음」 자리는 정하지 않은 난이도들이 함께 받는다.
 * 칸마다 고르게 나누면 한 범위에만 있는 난이도가 모자라 보인다 — 흐름은 그것을 그 범위로 몬다.
 * 총 문항이 100 이하라 한 칸씩 늘리는 증가 경로로 충분하다.
 */
function planTiers(
  rows: readonly { unitId: string; count: number }[],
  demand: readonly { key: string; count: number }[],
  capacity: (unitId: string, key: string) => number,
) {
  const S = 0;
  const T = 1 + demand.length + rows.length;
  const size = T + 1;
  const cap = Array.from({ length: size }, () =>
    new Array<number>(size).fill(0),
  );
  demand.forEach((d, i) => (cap[S][1 + i] = d.count));
  rows.forEach((row, j) => {
    const unit = 1 + demand.length + j;
    cap[unit][T] = row.count;
    demand.forEach((d, i) => (cap[1 + i][unit] = capacity(row.unitId, d.key)));
  });
  const flow = Array.from({ length: size }, () =>
    new Array<number>(size).fill(0),
  );
  for (;;) {
    const parent = new Array<number>(size).fill(-1);
    parent[S] = S;
    const queue = [S];
    while (queue.length && parent[T] === -1) {
      const at = queue.shift()!;
      for (let next = 0; next < size; next++)
        if (parent[next] === -1 && cap[at][next] - flow[at][next] > 0) {
          parent[next] = at;
          queue.push(next);
        }
    }
    if (parent[T] === -1) break;
    for (let at = T; at !== S; at = parent[at]) {
      flow[parent[at]][at] += 1;
      flow[at][parent[at]] -= 1;
    }
  }
  return (unitId: string, key: string) => {
    const j = rows.findIndex((row) => row.unitId === unitId);
    const i = demand.findIndex((d) => d.key === key);
    return j < 0 || i < 0 ? 0 : flow[1 + i][1 + demand.length + j];
  };
}

/**
 * D-111 — 시험지에 이미 있는 문항들의 문항류(`familyIdOf`). 그 갈래는 다시 고르지 않는다.
 * 키가 없는 문항은 `solo:<id>` 라 자기 자신만 막는다.
 */
async function familiesOnSheet(ids: readonly string[]) {
  if (!ids.length) return new Set<string>();
  const rows = await db.problem.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true, unitId: true, familyKey: true },
  });
  return new Set(rows.map(familyIdOf));
}

/**
 * 갈래 `count` 개를 고르게 뽑고(저수지 표집 — 갈래마다 같은 확률), 뽑힌 갈래 안에서 한 행을 고르게 고른다.
 * 갈래가 모자라면 있는 만큼만 — 다른 범위 · 다른 난이도로 채우지 않는다.
 */
function drawFamilies(families: readonly string[][], count: number) {
  const picked: (readonly string[])[] = [];
  families.forEach((family, seen) => {
    if (picked.length < count) picked.push(family);
    else if (count > 0) {
      const index = Math.floor(Math.random() * (seen + 1));
      if (index < count) picked[index] = family;
    }
  });
  return picked.map(
    (family) => family[Math.floor(Math.random() * family.length)],
  );
}

/** 할당이 정하는 범위 축 — 필터에 실려 오면 할당과 겹쳐 뜻이 갈린다. */
const ALLOCATION_SCOPE_KEYS = ["unitIds", "unitFrom", "unitTo", "ids"] as const;

/**
 * One metadata scan for every selected unit, followed by at most 100 native rows.
 *
 * 풀은 목록 · 랜덤 고르기 · 가용량(`bankSourceAvailability.ts`)과 **같은 조건 해석**(`resolveUnifiedBankQuery`)에
 * 출제 자격을 건 것이다 — 차시별 `available` 은 같은 필터의 가용량 보기 `facets.units[차시].available` 와 같다.
 */
export async function composeUnifiedBankProblems(
  input: unknown,
  /** 최근 출제 빼기(`recent: true`)의 계정 — 라우트가 관문을 지난 뒤 넘긴다. */
  context?: BankQueryContext,
) {
  const parsed = allocationSchema.safeParse(input);
  if (!parsed.success)
    throw new UnifiedBankQueryError(
      "단원별 문항 수를 확인해 주세요. 한 번에 1~100문항을 구성할 수 있습니다.",
    );
  const { allocations, excludeIds, filters, distinctFamilies, recent } =
    parsed.data;
  const intent = parsed.data.difficulty;
  const total = allocations.reduce((sum, row) => sum + row.count, 0);
  if (intent && !intentFits(intent, total))
    throw new UnifiedBankQueryError(
      "난이도별 문항 수의 합이 구성할 문항 수와 맞지 않습니다. 구성 조건을 다시 확인해 주세요.",
    );
  const familyOf = (row: {
    id: string;
    unitId: string;
    familyKey: string | null;
  }) => (distinctFamilies ? familyIdOf(row) : `row:${row.id}`);
  const params = new URLSearchParams(filters);
  if (ALLOCATION_SCOPE_KEYS.some((key) => params.has(key)))
    throw new UnifiedBankQueryError(
      "구성 범위는 단원별 문항 수로 정합니다. 조건에 단원 범위를 함께 보내지 마십시오.",
    );
  params.delete("page");
  params.delete("pageSize");
  params.set(
    "unitIds",
    allocations.map((allocation) => allocation.unitId).join(","),
  );
  if (recent) params.set("recent", "1");
  const excluded = new Set([
    ...(params.get("excludeIds")?.split(",").filter(Boolean) ?? []),
    ...excludeIds,
  ]);
  if (excluded.size) params.set("excludeIds", [...excluded].join(","));
  const { where: filtersWhere, format } = await resolveUnifiedBankQuery(
    params,
    context,
  );
  // Inspection filters can show pending/private-use-locked rows; composition never can.
  const where = { AND: [filtersWhere, problemEligibleWhere()] };
  const [candidates, formatIds, used] = await Promise.all([
    db.problem.findMany({
      where,
      select: { id: true, unitId: true, familyKey: true, difficulty: true },
    }),
    findProblemIdsByFormat(format, where, PROBLEM_BANK_ORDER_BY),
    distinctFamilies ? familiesOnSheet([...excluded]) : new Set<string>(),
  ]);
  const allowedFormat = formatIds === null ? null : new Set(formatIds);
  // D-111: one row per problem family, never a family already on the sheet.
  const pools = new Map(
    allocations.map(({ unitId }) => [unitId, new Map<string, string[]>()]),
  );
  /** 난이도 의도가 있을 때만 — 범위 → 난이도 → 문항류 → 행. */
  const tierPools = new Map<string, Map<string, Map<string, string[]>>>();
  const familyOfRow = new Map<string, string>();
  for (const row of candidates) {
    if (allowedFormat && !allowedFormat.has(row.id)) continue;
    const family = familyOf(row);
    const pool = pools.get(row.unitId);
    if (!pool || used.has(family)) continue;
    pool.set(family, [...(pool.get(family) ?? []), row.id]);
    familyOfRow.set(row.id, family);
    if (intent) {
      const unit = tierPools.get(row.unitId) ?? new Map();
      const tier = unit.get(row.difficulty) ?? new Map<string, string[]>();
      tier.set(family, [...(tier.get(family) ?? []), row.id]);
      unit.set(row.difficulty, tier);
      tierPools.set(row.unitId, unit);
    }
  }
  const drawn = intent
    ? drawByIntent(allocations, intent, tierPools, familyOfRow)
    : new Map(
        allocations.map(({ unitId, count }) => [
          unitId,
          drawFamilies([...pools.get(unitId)!.values()], count),
        ]),
      );
  const reservoirs = new Map(
    allocations.map(({ unitId, count }) => [
      unitId,
      {
        requested: count,
        available: pools.get(unitId)!.size,
        ids: drawn.get(unitId)!,
      },
    ]),
  );
  const ids = [...reservoirs.values()].flatMap((reservoir) => reservoir.ids);
  const rows = ids.length
    ? await db.problem.findMany({
        where: { AND: [where, { id: { in: ids } }] },
        select: UNIFIED_PROBLEM_SELECT,
      })
    : [];
  // A row moved to another unit between reads must not consume that unit's quota.
  const byId = new Map(
    (await withProblemSourceReferences(rows))
      .filter(
        (row) =>
          reservoirs.get(row.unitId)?.ids.includes(row.id) &&
          (!format || classifyFormat(row) === format),
      )
      .map((row) => [row.id, toBankProblem(row)]),
  );
  const problems = ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
  return {
    problems,
    allocations: allocations.map(({ unitId, count }) => ({
      unitId,
      requested: count,
      /** D-111 ⑸ — 출제 가능한 **문항류 수**(행 수가 아니다). 다른 범위로 채우지 않는다. */
      available: reservoirs.get(unitId)!.available,
      actual: reservoirs.get(unitId)!.ids.filter((id) => byId.has(id)).length,
    })),
    /** 난이도 의도의 정한 칸마다 — 모자라면 `actual < requested`(다른 난이도로 채우지 않았다). */
    ...(intent
      ? {
          difficulty: DIFFICULTY_LADDER.filter(
            (tier) => intent[tier] !== undefined,
          ).map((tier) => ({
            tier,
            requested: intent[tier]!,
            actual: problems.filter((row) => row.difficulty === tier).length,
          })),
        }
      : {}),
  };
}

/**
 * 난이도 의도대로 범위마다 뽑는다. 정한 난이도는 그 난이도에서만, 「지정 없음」 자리는 정하지 않은 난이도에서만.
 * 한 번 쓴 문항류는 다른 난이도 · 다른 자리에서 다시 쓰지 않는다(D-111 ⑶ — 난이도를 건너 이어 간다).
 * 범위 안에서는 사다리 차례(쉬운 것 먼저)로 놓는다.
 */
function drawByIntent(
  allocations: readonly { unitId: string; count: number }[],
  intent: Partial<Record<Difficulty, number>>,
  tierPools: Map<string, Map<string, Map<string, string[]>>>,
  familyOfRow: Map<string, string>,
) {
  const total = allocations.reduce((sum, row) => sum + row.count, 0);
  const specified = DIFFICULTY_LADDER.filter(
    (tier) => intent[tier] !== undefined,
  );
  const open = DIFFICULTY_LADDER.filter((tier) => intent[tier] === undefined);
  const rest = total - specified.reduce((sum, tier) => sum + intent[tier]!, 0);
  const ANY = "*";
  const familiesIn = (unitId: string, tiers: readonly string[]) => {
    const merged = new Map<string, string[]>();
    for (const tier of tiers)
      for (const [family, rowIds] of tierPools.get(unitId)?.get(tier) ?? [])
        merged.set(family, [...(merged.get(family) ?? []), ...rowIds]);
    return merged;
  };
  const plan = planTiers(
    allocations,
    [
      ...specified.map((tier) => ({ key: tier, count: intent[tier]! })),
      ...(rest > 0 && open.length ? [{ key: ANY, count: rest }] : []),
    ],
    (unitId, key) => familiesIn(unitId, key === ANY ? open : [key]).size,
  );
  const used = new Set<string>();
  const order = new Map(DIFFICULTY_LADDER.map((tier, index) => [tier, index]));
  const tierOfRow = new Map<string, string>();
  for (const unit of tierPools.values())
    for (const [tier, families] of unit)
      for (const rowIds of families.values())
        for (const id of rowIds) tierOfRow.set(id, tier);
  return new Map(
    allocations.map(({ unitId }) => {
      const picked: string[] = [];
      for (const key of [...specified, ANY]) {
        const want = plan(unitId, key);
        if (!want) continue;
        const pool = [...familiesIn(unitId, key === ANY ? open : [key])]
          .filter(([family]) => !used.has(family))
          .map(([, rowIds]) => rowIds);
        for (const id of drawFamilies(pool, want)) {
          used.add(familyOfRow.get(id)!);
          picked.push(id);
        }
      }
      picked.sort(
        (a, b) =>
          (order.get(tierOfRow.get(a) as Difficulty) ?? 0) -
          (order.get(tierOfRow.get(b) as Difficulty) ?? 0),
      );
      return [unitId, picked] as const;
    }),
  );
}

/** Read only IDs/tier across the filtered pool, then fetch at most 100 complete questions. */
export async function selectUnifiedBankProblems(input: unknown) {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success)
    throw new UnifiedBankQueryError(
      "난이도별 문항 수를 확인해 주세요. 한 번에 1~100문항을 담을 수 있습니다.",
    );
  const { filters, counts: requested, excludeIds } = parsed.data;
  const params = new URLSearchParams(filters);
  params.delete("page");
  params.delete("difficulty");
  const { where: filtersWhere, format } = await resolveUnifiedBankQuery(params);
  // Inspection filters can show pending/private-use-locked rows; selection never can.
  const where = {
    AND: [
      filtersWhere,
      problemEligibleWhere(),
      { NOT: { id: { in: excludeIds } } },
    ],
  };
  const [candidates, formatIds, used] = await Promise.all([
    db.problem.findMany({
      where,
      select: { id: true, difficulty: true, unitId: true, familyKey: true },
    }),
    findProblemIdsByFormat(format, where, PROBLEM_BANK_ORDER_BY),
    familiesOnSheet(excludeIds),
  ]);
  const allowedFormat = formatIds === null ? null : new Set(formatIds);
  const pools = Object.fromEntries(
    DIFFICULTY_LADDER.map((tier) => [tier, new Map<string, string[]>()]),
  ) as Record<keyof DifficultyRatio, Map<string, string[]>>;
  for (const row of candidates) {
    if (allowedFormat && !allowedFormat.has(row.id)) continue;
    const tier = row.difficulty;
    if (!DIFFICULTY_LADDER.includes(tier)) continue;
    const family = familyIdOf(row);
    if (used.has(family)) continue;
    pools[tier].set(family, [...(pools[tier].get(family) ?? []), row.id]);
  }
  // D-111 ⑸ — 난이도별 «선택 전 가능»은 그 난이도의 **문항류 수**다.
  const available = emptyCounts();
  for (const tier of DIFFICULTY_LADDER) available[tier] = pools[tier].size;
  // Uniform within each tier and never substitutes another tier. A family used
  // by one tier is gone for the next (D-111 ⑶ — across tiers, not per tier).
  const chosen = Object.fromEntries(
    DIFFICULTY_LADDER.map((tier) => [tier, [] as string[]]),
  ) as Record<keyof DifficultyRatio, string[]>;
  for (const tier of DIFFICULTY_LADDER) {
    const open = [...pools[tier]].filter(([family]) => !used.has(family));
    const picked = drawFamilies(
      open.map(([, rowIds]) => rowIds),
      requested[tier],
    );
    for (const id of picked) {
      const family = open.find(([, rowIds]) => rowIds.includes(id))![0];
      used.add(family);
    }
    chosen[tier] = picked;
  }
  const ids = DIFFICULTY_LADDER.flatMap((tier) => chosen[tier]);
  const rows = ids.length
    ? await db.problem.findMany({
        // Recheck eligibility/filters in case a selected row changed during sampling.
        where: { AND: [where, { id: { in: ids } }] },
        select: UNIFIED_PROBLEM_SELECT,
      })
    : [];
  const problems = (await withProblemSourceReferences(rows))
    .filter(
      (row) =>
        chosen[row.difficulty]?.includes(row.id) &&
        (!format || classifyFormat(row) === format),
    )
    .map(toBankProblem);
  for (let index = problems.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [problems[index], problems[other]] = [problems[other], problems[index]];
  }
  const counts = emptyCounts();
  for (const problem of problems)
    counts[problem.difficulty as keyof DifficultyRatio] += 1;
  return { problems, available, counts };
}

export async function randomBankResponse(
  request: Request,
  headers: HeadersInit,
  /** 최근 출제 빼기의 계정 — 구성(`allocations`)만 쓴다. */
  context?: BankQueryContext,
) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: "요청 내용을 읽지 못했습니다." },
        { status: 400, headers },
      );
    }
    const result =
      body && typeof body === "object" && "allocations" in body
        ? await composeUnifiedBankProblems(body, context)
        : await selectUnifiedBankProblems(body);
    return Response.json(result, { headers });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof UnifiedBankQueryError
            ? error.message
            : "문제를 고르지 못했습니다. 잠시 후 다시 시도해 주세요.",
      },
      {
        status: error instanceof UnifiedBankQueryError ? 400 : 503,
        headers,
      },
    );
  }
}
