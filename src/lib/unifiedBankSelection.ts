import "server-only";
import { z } from "zod";
import { uuidSchema } from "@/contracts/common.contract";
import {
  DIFFICULTY_LADDER,
  type DifficultyRatio,
} from "@/contracts/difficulty";
import { db } from "@/lib/db";
import { problemEligibleWhere } from "@/lib/problemEligibility";
import { findProblemIdsByFormat } from "@/lib/problem/formatQuery";
import { PROBLEM_BANK_ORDER_BY } from "@/lib/problem/problemOrder";
import { classifyFormat } from "@/lib/problem/provenance";
import { withProblemSourceReferences } from "@/lib/problem/sourceReference";
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
  })
  .refine(
    ({ allocations }) =>
      allocations.reduce((sum, allocation) => sum + allocation.count, 0) <=
        100 &&
      new Set(allocations.map((allocation) => allocation.unitId)).size ===
        allocations.length,
  );

/** 할당이 정하는 범위 축 — 필터에 실려 오면 할당과 겹쳐 뜻이 갈린다. */
const ALLOCATION_SCOPE_KEYS = ["unitIds", "unitFrom", "unitTo", "ids"] as const;

/**
 * One metadata scan for every selected unit, followed by at most 100 native rows.
 *
 * 풀은 목록 · 랜덤 고르기 · 가용량(`bankSourceAvailability.ts`)과 **같은 조건 해석**(`resolveUnifiedBankQuery`)에
 * 출제 자격을 건 것이다 — 차시별 `available` 은 같은 필터의 가용량 보기 `facets.units[차시].available` 와 같다.
 */
export async function composeUnifiedBankProblems(input: unknown) {
  const parsed = allocationSchema.safeParse(input);
  if (!parsed.success)
    throw new UnifiedBankQueryError(
      "단원별 문항 수를 확인해 주세요. 한 번에 1~100문항을 구성할 수 있습니다.",
    );
  const { allocations, excludeIds, filters } = parsed.data;
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
  const excluded = new Set([
    ...(params.get("excludeIds")?.split(",").filter(Boolean) ?? []),
    ...excludeIds,
  ]);
  if (excluded.size) params.set("excludeIds", [...excluded].join(","));
  const { where: filtersWhere, format } = await resolveUnifiedBankQuery(params);
  // Inspection filters can show pending/private-use-locked rows; composition never can.
  const where = { AND: [filtersWhere, problemEligibleWhere()] };
  const reservoirs = new Map(
    allocations.map(({ unitId, count }) => [
      unitId,
      { requested: count, available: 0, ids: [] as string[] },
    ]),
  );
  const [candidates, formatIds] = await Promise.all([
    db.problem.findMany({
      where,
      select: { id: true, unitId: true },
    }),
    findProblemIdsByFormat(format, where, PROBLEM_BANK_ORDER_BY),
  ]);
  const allowedFormat = formatIds === null ? null : new Set(formatIds);
  for (const row of candidates) {
    if (allowedFormat && !allowedFormat.has(row.id)) continue;
    const reservoir = reservoirs.get(row.unitId);
    if (!reservoir) continue;
    reservoir.available += 1;
    if (reservoir.ids.length < reservoir.requested) reservoir.ids.push(row.id);
    else {
      const index = Math.floor(Math.random() * reservoir.available);
      if (index < reservoir.requested) reservoir.ids[index] = row.id;
    }
  }
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
  return {
    problems: ids.flatMap((id) => {
      const row = byId.get(id);
      return row ? [row] : [];
    }),
    allocations: allocations.map(({ unitId, count }) => ({
      unitId,
      requested: count,
      available: reservoirs.get(unitId)!.available,
      actual: reservoirs.get(unitId)!.ids.filter((id) => byId.has(id)).length,
    })),
  };
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
  const [candidates, formatIds] = await Promise.all([
    db.problem.findMany({ where, select: { id: true, difficulty: true } }),
    findProblemIdsByFormat(format, where, PROBLEM_BANK_ORDER_BY),
  ]);
  const allowedFormat = formatIds === null ? null : new Set(formatIds);
  const available = emptyCounts();
  const chosen = Object.fromEntries(
    DIFFICULTY_LADDER.map((tier) => [tier, [] as string[]]),
  ) as Record<keyof DifficultyRatio, string[]>;
  // Reservoir sampling is uniform within each tier and never substitutes another tier.
  for (const row of candidates) {
    if (allowedFormat && !allowedFormat.has(row.id)) continue;
    const tier = row.difficulty;
    if (!DIFFICULTY_LADDER.includes(tier)) continue;
    available[tier] += 1;
    const reservoir = chosen[tier];
    if (reservoir.length < requested[tier]) reservoir.push(row.id);
    else if (requested[tier] > 0) {
      const index = Math.floor(Math.random() * available[tier]);
      if (index < requested[tier]) reservoir[index] = row.id;
    }
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
        ? await composeUnifiedBankProblems(body)
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
