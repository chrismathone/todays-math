import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";
import {
  ENGLISH_BANK_BODY_MAX_BYTES,
  ENGLISH_BANK_QUERY_MAX_BYTES,
  englishBankQuestionSchema,
  englishQuestionBankQuerySchema,
  type EnglishBankQuestion,
  type EnglishQuestionBankQuery,
  type EnglishQuestionBankResolveRequest,
} from "@/contracts/englishQuestionBank.contract";
import {
  ENGLISH_DIFFICULTIES,
  englishDifficultySchema,
  englishGradeSchema,
} from "@/contracts/english.contract";
import { ENGLISH_V2_ONLY_ITEM_KEYS } from "@/contracts/englishV2.contract";
import { jsonError } from "@/lib/apiResponse";
import { ownedRowsWhere, type ScopeViewer } from "@/lib/ownerScope";
import type {
  EnglishExamCandidates,
  EnglishExamCompose,
} from "@/contracts/englishExamBuilder.contract";

type Reader = Pick<PrismaClient, "$queryRaw">;
type BankFailure = "unavailable" | "revision" | "format" | "payload" | "query";
export class EnglishQuestionBankError extends Error {
  constructor(readonly reason: BankFailure) {
    super(reason);
  }
}

export function questionBankErrorResponse(error: unknown): Response {
  if (!(error instanceof EnglishQuestionBankError)) throw error;
  switch (error.reason) {
    case "unavailable":
      return jsonError(
        "NOT_FOUND",
        "선택한 문항을 사용할 수 없습니다. 다시 선택해 주세요.",
        404,
      );
    case "revision":
      return jsonError(
        "REVISION_MISMATCH",
        "문항이 변경되었습니다. 다시 불러온 뒤 선택해 주세요.",
        409,
      );
    case "format":
      return jsonError(
        "CONFLICT",
        "저장된 문항 형식을 이 문제은행에서 읽을 수 없습니다.",
        409,
      );
    case "payload":
      return jsonError(
        "PAYLOAD_TOO_LARGE",
        "문항 선택 요청의 크기 한도를 넘었습니다.",
        413,
      );
    case "query":
      return jsonError(
        "VALIDATION_ERROR",
        "검색 조건이 올바르지 않습니다.",
        400,
      );
  }
}

/** Translate only ownedRowsWhere's fixed shape, never client-provided SQL/identifiers. */
function ownerSql(viewer: ScopeViewer): Prisma.Sql {
  const scope = ownedRowsWhere(viewer);
  if (scope.userId !== undefined) {
    const branches = scope.OR!.map(({ branchId }) =>
      branchId === null
        ? Prisma.sql`e.branch_id IS NULL`
        : Prisma.sql`e.branch_id = ${branchId}::uuid`,
    );
    return Prisma.sql`e.user_id = ${scope.userId}::uuid AND (${Prisma.join(branches, " OR ")})`;
  }
  if (scope.branchId !== undefined)
    return Prisma.sql`e.branch_id = ${scope.branchId}::uuid`;
  // An empty ownedRowsWhere is deliberately reserved for the super administrator.
  if (Object.keys(scope).length === 0) return Prisma.sql`TRUE`;
  throw new Error("Unsupported owner scope");
}

const arrayQuestions = Prisma.sql`CASE WHEN jsonb_typeof(s.questions) = 'array' THEN s.questions ELSE '[]'::jsonb END`;
const projection = Prisma.sql`
  s.id AS "setId", s.revision, s.exam_id AS "examId", e.school, e.grade,
  e.title AS "examTitle", s.title, s.status, s.source, s.passage,
  s.questions -> p."questionIndex" AS question, p."questionIndex",
  s.meta ->> 'difficulty' AS difficulty, s.updated_at AS "updatedAt",
  EXISTS (
    SELECT 1 FROM jsonb_array_elements(${arrayQuestions}) AS item
    WHERE item ?| ARRAY[${Prisma.join([...ENGLISH_V2_ONLY_ITEM_KEYS])}]::text[]
  ) AS unsupported`;

type ProjectedRow = {
  setId: string | null;
  revision: number;
  examId: string;
  school: string;
  grade: string;
  examTitle: string;
  title: string;
  status: string;
  source: string;
  passage: string;
  questionIndex: number;
  question: unknown;
  difficulty: unknown;
  updatedAt: Date;
  unsupported: boolean;
};

function project(row: ProjectedRow): EnglishBankQuestion {
  if (row.unsupported) throw new EnglishQuestionBankError("format");
  const difficulty = englishDifficultySchema.safeParse(row.difficulty);
  const parsed = englishBankQuestionSchema.safeParse({
    key: `${row.setId}:${row.revision}:${row.questionIndex}`,
    setId: row.setId,
    revision: row.revision,
    examId: row.examId,
    school: row.school,
    grade: row.grade,
    examTitle: row.examTitle,
    title: row.title,
    status: row.status,
    source: row.source,
    passage: row.passage,
    questionIndex: row.questionIndex,
    question: row.question,
    difficulty: difficulty.success ? difficulty.data : null,
    updatedAt: row.updatedAt.toISOString(),
  });
  if (!parsed.success) throw new EnglishQuestionBankError("format");
  return parsed.data;
}

/** Metadata only: no passages/question bodies leave the database in the scope explorer. */
export async function listEnglishExamScopes(
  db: Reader,
  viewer: ScopeViewer,
  page: number,
) {
  const rows = await db.$queryRaw<
    {
      id: string | null;
      label: string;
      group: string;
      detail: string;
      count: number;
      total: bigint;
    }[]
  >(Prisma.sql`
    WITH scopes AS MATERIALIZED (
      SELECT s.id, s.title AS label, e.grade AS "group",
        concat_ws(' · ', e.school, e.title) AS detail,
        jsonb_array_length(${arrayQuestions}) AS count, s.updated_at
      FROM english_question_set s JOIN english_exam e ON e.id = s.exam_id
      WHERE ${ownerSql(viewer)} AND jsonb_array_length(${arrayQuestions}) > 0
    ), page AS (SELECT * FROM scopes ORDER BY updated_at DESC, id ASC LIMIT 100 OFFSET ${(page - 1) * 100})
    SELECT page.*, totals.total FROM (SELECT count(*) AS total FROM scopes) totals LEFT JOIN page ON TRUE
    ORDER BY page.updated_at DESC, page.id ASC
  `);
  return {
    items: rows
      .filter((r) => r.id !== null)
      .map(({ id, label, group, detail, count }) => ({
        id: id!,
        label,
        group: englishGradeSchema.parse(group),
        detail,
        count,
      })),
    total: Number(rows[0]?.total ?? 0),
  };
}

/** Scoped candidate search, with exact difficulty and exclusions applied before pagination. */
export async function listEnglishExamCandidates(
  db: Reader,
  viewer: ScopeViewer,
  input: EnglishExamCandidates,
) {
  const filters = [
    ownerSql(viewer),
    Prisma.sql`s.id IN (${Prisma.join(input.scopeIds.map((id) => Prisma.sql`${id}::uuid`))})`,
  ];
  if (input.difficulty === "미지정")
    filters.push(
      Prisma.sql`(s.meta ->> 'difficulty' IS NULL OR s.meta ->> 'difficulty' NOT IN (${Prisma.join([...ENGLISH_DIFFICULTIES])}))`,
    );
  else if (input.difficulty)
    filters.push(Prisma.sql`s.meta ->> 'difficulty' = ${input.difficulty}`);
  if (input.query)
    filters.push(
      Prisma.sql`strpos(lower(concat_ws(' ', s.title, s.passage, q.item ->> 'prompt', q.item ->> 'options')), lower(${input.query})) > 0`,
    );
  if (input.exclude.length)
    filters.push(
      Prisma.sql`NOT (${Prisma.join(
        input.exclude.map(
          (ref) =>
            Prisma.sql`(s.id = ${ref.setId}::uuid AND (q.ordinality - 1) = ${ref.questionIndex})`,
        ),
        " OR ",
      )})`,
    );
  const rows = await db.$queryRaw<
    (ProjectedRow & { total: bigint })[]
  >(Prisma.sql`
    WITH matches AS MATERIALIZED (
      SELECT s.id, s.updated_at, (q.ordinality - 1)::int AS "questionIndex"
      FROM english_question_set s JOIN english_exam e ON e.id = s.exam_id
      CROSS JOIN LATERAL jsonb_array_elements(${arrayQuestions}) WITH ORDINALITY AS q(item, ordinality)
      WHERE ${Prisma.join(filters, " AND ")}
    ), page AS (SELECT * FROM matches ORDER BY updated_at DESC, id ASC, "questionIndex" ASC LIMIT ${input.pageSize} OFFSET ${(input.page - 1) * input.pageSize})
    SELECT totals.total, ${projection} FROM (SELECT count(*) AS total FROM matches) totals
    LEFT JOIN page p ON TRUE LEFT JOIN english_question_set s ON s.id = p.id
    LEFT JOIN english_exam e ON e.id = s.exam_id
    ORDER BY p.updated_at DESC, p.id ASC, p."questionIndex" ASC
  `);
  return {
    items: rows.filter((r) => r.setId !== null).map(project),
    total: Number(rows[0]?.total ?? 0),
  };
}

/** One snapshot, in requested scope/source order; a short or inaccessible scope fails the whole composition. */
export async function composeEnglishExam(
  db: Reader,
  viewer: ScopeViewer,
  input: EnglishExamCompose,
) {
  const values = input.allocations.map(
    (a, order) =>
      Prisma.sql`(${a.scopeId}::uuid, ${a.count}::int, ${order}::int)`,
  );
  const rows = await db.$queryRaw<ProjectedRow[]>(Prisma.sql`
    WITH requested(id, amount, position) AS (VALUES ${Prisma.join(values)}), page AS (
      SELECT s.id, (q.ordinality - 1)::int AS "questionIndex", requested.position
      FROM requested JOIN english_question_set s ON s.id = requested.id JOIN english_exam e ON e.id = s.exam_id
      CROSS JOIN LATERAL jsonb_array_elements(${arrayQuestions}) WITH ORDINALITY AS q(item, ordinality)
      WHERE (${ownerSql(viewer)}) AND q.ordinality <= requested.amount
    )
    SELECT ${projection} FROM page p JOIN english_question_set s ON s.id = p.id JOIN english_exam e ON e.id = s.exam_id
    ORDER BY p.position, p."questionIndex"
  `);
  if (rows.length !== input.allocations.reduce((n, a) => n + a.count, 0))
    throw new EnglishQuestionBankError("unavailable");
  return rows.map(project);
}

export function readQuestionBankQuery(
  request: Request,
): EnglishQuestionBankQuery {
  const params = new URL(request.url).searchParams;
  if (
    Buffer.byteLength(new URL(request.url).search, "utf8") >
    ENGLISH_BANK_QUERY_MAX_BYTES
  )
    throw new EnglishQuestionBankError("query");
  const entries = [...params.entries()];
  if (new Set(entries.map(([key]) => key)).size !== entries.length)
    throw new EnglishQuestionBankError("query");
  return englishQuestionBankQuerySchema.parse(Object.fromEntries(entries));
}

/** One statement/snapshot: count all matching identities, transfer only the requested page. */
export async function listEnglishBankQuestions(
  db: Reader,
  viewer: ScopeViewer,
  query: EnglishQuestionBankQuery,
) {
  const filters = [ownerSql(viewer)];
  if (query.grade) filters.push(Prisma.sql`e.grade = ${query.grade}`);
  if (query.status) filters.push(Prisma.sql`s.status = ${query.status}`);
  if (query.examId) filters.push(Prisma.sql`e.id = ${query.examId}::uuid`);
  if (query.type) filters.push(Prisma.sql`q.item ->> 'type' = ${query.type}`);
  if (query.q)
    filters.push(Prisma.sql`strpos(lower(concat_ws(' ',
    s.passage, s.meta ->> 'sourcePassage', s.title,
    q.item ->> 'prompt', q.item ->> 'options', q.item ->> 'answer',
    q.item ->> 'explanation', q.item ->> 'evidence'
  )), lower(${query.q})) > 0`);
  const rows = await db.$queryRaw<
    (ProjectedRow & { total: bigint })[]
  >(Prisma.sql`
    WITH matches AS MATERIALIZED (
      SELECT s.id, s.updated_at, (q.ordinality - 1)::int AS "questionIndex"
      FROM english_question_set s JOIN english_exam e ON e.id = s.exam_id
      CROSS JOIN LATERAL jsonb_array_elements(${arrayQuestions}) WITH ORDINALITY AS q(item, ordinality)
      WHERE ${Prisma.join(filters, " AND ")}
    ), page AS (
      SELECT * FROM matches ORDER BY updated_at DESC, id ASC, "questionIndex" ASC
      LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}
    )
    SELECT totals.total, ${projection}
    FROM (SELECT count(*) AS total FROM matches) totals
    LEFT JOIN page p ON TRUE
    LEFT JOIN english_question_set s ON s.id = p.id
    LEFT JOIN english_exam e ON e.id = s.exam_id
    ORDER BY p.updated_at DESC, p.id ASC, p."questionIndex" ASC
  `);
  return {
    items: rows.filter((row) => row.setId !== null).map(project),
    total: Number(rows[0]?.total ?? 0),
    page: query.page,
    pageSize: query.pageSize,
  };
}

/** All ownership and revision checks use the same database snapshot, before any response. */
export async function resolveEnglishBankQuestions(
  db: Reader,
  viewer: ScopeViewer,
  input: EnglishQuestionBankResolveRequest,
) {
  const values = input.items.map(
    (item, order) => Prisma.sql`(
    ${item.setId}::uuid, ${item.revision}::int, ${item.questionIndex}::int, ${order}::int
  )`,
  );
  const rows = await db.$queryRaw<
    (ProjectedRow & { requestedRevision: number })[]
  >(Prisma.sql`
    WITH requested(id, "requestedRevision", "questionIndex", position) AS (
      VALUES ${Prisma.join(values)}
    ), scoped AS (
      SELECT s.id FROM english_question_set s JOIN english_exam e ON e.id = s.exam_id
      WHERE (${ownerSql(viewer)}) AND s.id IN (SELECT id FROM requested)
    )
    SELECT p."requestedRevision", ${projection}
    FROM requested p
    LEFT JOIN scoped owned ON owned.id = p.id
    LEFT JOIN english_question_set s ON s.id = owned.id
    LEFT JOIN english_exam e ON e.id = s.exam_id
    ORDER BY p.position
  `);
  // Missing and inaccessible sets are indistinguishable, even in a mixed stale batch.
  if (
    rows.length !== input.items.length ||
    rows.some((row) => row.setId === null)
  )
    throw new EnglishQuestionBankError("unavailable");
  if (rows.some((row) => row.revision !== row.requestedRevision))
    throw new EnglishQuestionBankError("revision");
  if (rows.some((row) => row.question === null))
    throw new EnglishQuestionBankError("unavailable");
  return rows.map(project);
}

/** Limit actual streamed bytes too: Content-Length is optional and untrusted. */
export async function readQuestionBankBody(request: Request): Promise<unknown> {
  if (
    Number(request.headers.get("content-length")) > ENGLISH_BANK_BODY_MAX_BYTES
  )
    throw new EnglishQuestionBankError("payload");
  if (!request.body) return undefined;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > ENGLISH_BANK_BODY_MAX_BYTES) {
        await reader.cancel();
        throw new EnglishQuestionBankError("payload");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return undefined;
  }
}
