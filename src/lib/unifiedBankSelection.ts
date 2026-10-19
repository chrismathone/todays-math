import "server-only";
import { z } from "zod";
import { uuidSchema } from "@/contracts/common.contract";
import {
  DIFFICULTY_LADDER,
  type Difficulty,
  type DifficultyRatio,
} from "@/contracts/difficulty";
import {
  OUTPUT_QUESTION_FORMATS,
  formatIntentSchema,
  formatIntentFits,
  outputFormatOf,
} from "@/contracts/formatIntent.contract";
import { db } from "@/lib/db";
import { problemEligibleWhere } from "@/lib/problemEligibility";
import { familyIdOf } from "@/lib/generator/familyKey";
import { withProblemSourceReferences } from "@/lib/problem/sourceReference";
import {
  loadQuestionCandidates,
  questionReadMetadata,
  type QuestionCandidate,
} from "@/lib/problem/questionProjection";
import {
  excludeQuestionsWhere,
  withQuestionMetadata,
} from "@/lib/problem/questionQueries";
import { questionIdOf } from "@/lib/problem/questionIdentity";
import { classifyFormat } from "@/lib/problem/provenance";
import { QuestionSelectionConflict } from "@/lib/problem/questionSelection";
import {
  solveQuestionSelection,
  type QuestionSelectionCandidate,
  type QuestionSelectionResult,
} from "@/lib/problem/questionSelectionSolver";
import type { BankQueryContext } from "@/lib/bankQueryContext";
import {
  resolveUnifiedBankQuery,
  toBankProblem,
  UNIFIED_PROBLEM_SELECT,
  UnifiedBankQueryError,
} from "@/lib/unifiedPreview";

const identitySchema = z.literal("question").optional();
const requestSchema = z
  .strictObject({
    identity: identitySchema,
    filters: z.string().max(8000).default(""),
    counts: z.record(
      z.enum(DIFFICULTY_LADDER),
      z.number().int().min(0).max(100),
    ),
    excludeIds: z.array(uuidSchema).max(5000).default([]),
    formats: formatIntentSchema.optional(),
  })
  .refine(
    ({ counts }) =>
      Object.values(counts).reduce((s, n) => s + n, 0) >= 1 &&
      Object.values(counts).reduce((s, n) => s + n, 0) <= 100,
  );
const allocationSchema = z
  .strictObject({
    identity: identitySchema,
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
    filters: z.string().max(8000).default(""),
    distinctFamilies: z.boolean().default(true),
    recent: z.boolean().default(false),
    difficulty: z
      .partialRecord(
        z.enum(DIFFICULTY_LADDER),
        z.number().int().min(0).max(100),
      )
      .optional(),
    formats: formatIntentSchema.optional(),
  })
  .refine(
    ({ allocations }) =>
      allocations.reduce((s, a) => s + a.count, 0) <= 100 &&
      new Set(allocations.map((a) => a.unitId)).size === allocations.length,
  );
const ALLOCATION_SCOPE_KEYS = ["unitIds", "unitFrom", "unitTo", "ids"] as const;
const emptyCounts = () =>
  Object.fromEntries(DIFFICULTY_LADDER.map((t) => [t, 0])) as DifficultyRatio;
function intentFits(
  intent: Partial<Record<Difficulty, number>>,
  total: number,
) {
  const specified = DIFFICULTY_LADDER.filter((t) => intent[t] !== undefined);
  const sum = specified.reduce((s, t) => s + intent[t]!, 0);
  return (
    sum <= total &&
    (specified.length < DIFFICULTY_LADDER.length || sum === total)
  );
}
async function familiesOnSheet(ids: readonly string[]) {
  if (!ids.length) return new Set<string>();
  const rows = await db.problem.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true, unitId: true, familyKey: true },
  });
  return new Set(rows.map(familyIdOf));
}
function solverCandidates(
  rows: readonly QuestionCandidate[],
  used: Set<string>,
  format?: string,
): QuestionSelectionCandidate[] {
  return rows.flatMap((row) =>
    row.available &&
    row.actualFormat &&
    (!format || row.actualFormat === format) &&
    !used.has(familyIdOf(row))
      ? [
          {
            id: row.id,
            questionId: row.questionId,
            familyId: familyIdOf(row),
            unitId: row.unitId,
            difficulty: row.difficulty,
            format: row.actualFormat,
          },
        ]
      : [],
  );
}

/** Recheck actual IDs after sampling; metadata never substitutes another same-family seed. */
async function selectedProblems(
  result: QuestionSelectionResult<QuestionSelectionCandidate>,
  where: Parameters<typeof loadQuestionCandidates>[0],
  questionView: boolean,
  metadataWhere: Parameters<typeof withQuestionMetadata>[2],
) {
  const ids = result.selected.map((r) => r.id);
  const rows = ids.length
    ? await db.problem.findMany({
        where: { AND: [where, { id: { in: ids } }] },
        select: UNIFIED_PROBLEM_SELECT,
      })
    : [];
  const chosen = new Map(result.selected.map((r) => [r.id, r]));
  if (
    rows.length !== ids.length ||
    rows.some((row) => {
      const selected = chosen.get(row.id)!;
      return (
        questionIdOf(row) !== selected.questionId ||
        row.unitId !== selected.unitId ||
        row.difficulty !== selected.difficulty ||
        familyIdOf(row) !== selected.familyId ||
        classifyFormat(row) !== selected.format
      );
    })
  )
    throw new QuestionSelectionConflict();
  const enriched = questionView
    ? await withQuestionMetadata(rows, db, metadataWhere)
    : rows;
  const byId = new Map(
    (await withProblemSourceReferences(enriched)).map((row) => [
      row.id,
      toBankProblem(row),
    ]),
  );
  return ids.map((id) => byId.get(id)!);
}

/** Jointly solve the complete eligible pool: unit, tier, format, question and family. */
export async function composeUnifiedBankProblems(
  input: unknown,
  context?: BankQueryContext,
) {
  const parsed = allocationSchema.safeParse(input);
  if (!parsed.success)
    throw new UnifiedBankQueryError(
      "단원별 문항 수를 확인해 주세요. 한 번에 1~100문항을 구성할 수 있습니다.",
    );
  const {
    allocations,
    excludeIds,
    filters,
    distinctFamilies,
    recent,
    difficulty,
    formats,
    identity,
  } = parsed.data;
  const total = allocations.reduce((s, a) => s + a.count, 0);
  if (difficulty && !intentFits(difficulty, total))
    throw new UnifiedBankQueryError(
      "난이도별 문항 수의 합이 구성할 문항 수와 맞지 않습니다. 구성 조건을 다시 확인해 주세요.",
    );
  if (formats && !formatIntentFits(formats, total))
    throw new UnifiedBankQueryError(
      "형식별 문항 수의 합이 구성할 문항 수와 맞지 않습니다. 구성 조건을 다시 확인해 주세요.",
    );
  const params = new URLSearchParams(filters);
  if (ALLOCATION_SCOPE_KEYS.some((key) => params.has(key)))
    throw new UnifiedBankQueryError(
      "차시 범위는 단원별 할당에서만 정해 주세요.",
    );
  if (identity) params.set("identity", identity);
  params.delete("page");
  params.delete("pageSize");
  params.set("unitIds", allocations.map((a) => a.unitId).join(","));
  const query = await resolveUnifiedBankQuery(params, context);
  const excluded = [
    ...excludeIds,
    ...(recent ? await requireRecent(context) : []),
  ];
  const where = {
    AND: [
      query.where,
      problemEligibleWhere(),
      await excludeQuestionsWhere(excluded),
    ],
  };
  const [rows, used] = await Promise.all([
    loadQuestionCandidates(where),
    distinctFamilies
      ? familiesOnSheet(excluded)
      : Promise.resolve(new Set<string>()),
  ]);
  const candidates = solverCandidates(rows, used, query.format);
  const result = solveQuestionSelection({
    candidates,
    allocations,
    difficulty,
    formats,
    distinctFamilies,
  });
  const unitOrder = new Map(allocations.map((a, i) => [a.unitId, i]));
  result.selected.sort(
    (a, b) =>
      unitOrder.get(a.unitId)! - unitOrder.get(b.unitId)! ||
      DIFFICULTY_LADDER.indexOf(a.difficulty as Difficulty) -
        DIFFICULTY_LADDER.indexOf(b.difficulty as Difficulty),
  );
  const questionView = params.get("identity") === "question";
  const problems = await selectedProblems(result, where, questionView, {
    AND: query.selection,
  });
  return {
    problems,
    ...(questionView ? questionReadMetadata(params) : {}),
    status: result.status,
    witness: result.witness,
    allocations: allocations.map((a) => ({
      unitId: a.unitId,
      requested: a.count,
      available: new Set(
        candidates
          .filter((r) => r.unitId === a.unitId)
          .map((r) => (distinctFamilies ? r.familyId : r.questionId)),
      ).size,
      actual: result.selected.filter((r) => r.unitId === a.unitId).length,
    })),
    ...(formats
      ? {
          formats: OUTPUT_QUESTION_FORMATS.filter(
            (f) => formats[f] !== undefined,
          ).map((format) => ({
            format,
            requested: formats[format]!,
            actual: result.selected.filter(
              (r) => outputFormatOf(r.format) === format,
            ).length,
          })),
        }
      : {}),
    ...(difficulty
      ? {
          difficulty: DIFFICULTY_LADDER.filter(
            (t) => difficulty[t] !== undefined,
          ).map((tier) => ({
            tier,
            requested: difficulty[tier]!,
            actual: result.selected.filter((r) => r.difficulty === tier).length,
          })),
        }
      : {}),
  };
}
async function requireRecent(context?: BankQueryContext) {
  if (!context)
    throw new UnifiedBankQueryError(
      "최근 출제 문항을 확인할 계정을 알 수 없습니다.",
    );
  return context.recentProblemIds();
}

/** Same exact full-pool planner for the existing difficulty-only random action. */
export async function selectUnifiedBankProblems(
  input: unknown,
  context?: BankQueryContext,
) {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success)
    throw new UnifiedBankQueryError(
      "난이도별 문항 수를 확인해 주세요. 한 번에 1~100문항을 담을 수 있습니다.",
    );
  const {
    filters,
    counts: requested,
    excludeIds,
    identity,
    formats,
  } = parsed.data;
  const count = Object.values(requested).reduce((s, n) => s + n, 0);
  if (formats && !formatIntentFits(formats, count))
    throw new UnifiedBankQueryError(
      "형식별 문항 수의 합이 구성할 문항 수와 맞지 않습니다.",
    );
  const params = new URLSearchParams(filters);
  params.delete("page");
  params.delete("difficulty");
  if (identity) params.set("identity", identity);
  const query = await resolveUnifiedBankQuery(params, context);
  const where = {
    AND: [
      query.where,
      problemEligibleWhere(),
      await excludeQuestionsWhere(excludeIds),
    ],
  };
  const [rows, used] = await Promise.all([
    loadQuestionCandidates(where),
    familiesOnSheet(excludeIds),
  ]);
  const candidates = solverCandidates(rows, used, query.format);
  const result = solveQuestionSelection({
    candidates,
    count,
    difficulty: requested,
    formats,
  });
  const questionView = params.get("identity") === "question";
  const problems = await selectedProblems(result, where, questionView, {
    AND: query.selection,
  });
  const counts = emptyCounts();
  const available = emptyCounts();
  for (const p of problems) counts[p.difficulty as Difficulty]++;
  for (const tier of DIFFICULTY_LADDER)
    available[tier] = new Set(
      candidates.filter((r) => r.difficulty === tier).map((r) => r.familyId),
    ).size;
  return {
    problems,
    available,
    counts,
    status: result.status,
    witness: result.witness,
    ...(formats
      ? {
          formats: OUTPUT_QUESTION_FORMATS.filter(
            (f) => formats[f] !== undefined,
          ).map((format) => ({
            format,
            requested: formats[format]!,
            actual: result.selected.filter(
              (r) => outputFormatOf(r.format) === format,
            ).length,
          })),
        }
      : {}),
    ...(questionView ? questionReadMetadata(params) : {}),
  };
}
export async function randomBankResponse(
  request: Request,
  headers: HeadersInit,
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
        : await selectUnifiedBankProblems(body, context);
    return Response.json(result, { headers });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof UnifiedBankQueryError ||
          error instanceof QuestionSelectionConflict
            ? error.message
            : "문제를 고르지 못했습니다. 잠시 후 다시 시도해 주세요.",
      },
      {
        status:
          error instanceof QuestionSelectionConflict
            ? 409
            : error instanceof UnifiedBankQueryError
              ? 400
              : 503,
        headers,
      },
    );
  }
}
