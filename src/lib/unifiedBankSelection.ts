import "server-only";
import { z } from "zod";
import {
  DIFFICULTY_LADDER,
  type DifficultyRatio,
} from "@/contracts/difficulty";
import { db } from "@/lib/db";
import { problemEligibleWhere } from "@/lib/problemEligibility";
import { findProblemIdsByFormat } from "@/lib/problem/formatQuery";
import { PROBLEM_BANK_ORDER_BY } from "@/lib/problem/problemOrder";
import { classifyFormat } from "@/lib/problem/provenance";
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
  const problems = rows
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
    return Response.json(await selectUnifiedBankProblems(body), { headers });
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
