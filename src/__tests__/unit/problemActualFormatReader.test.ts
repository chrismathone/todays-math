// @vitest-environment node
import { readFileSync } from "node:fs";
import { Prisma } from "@prisma/client";
import { afterAll, beforeAll, expect, it } from "vitest";
import {
  openTextbookDb,
  seedWorld,
  insertProblem,
  type Db,
  type World,
} from "../helpers/textbookPglite";
import {
  ACTUAL_FORMAT_VERSION,
  actualFormatDigest,
} from "@/lib/problem/actualFormat";
import {
  loadActualFormats,
  persistMissingFormats,
  type FormatDb,
  type StoredFormatRead,
} from "@/lib/problem/actualFormatProjection";
import {
  actualFormatDigestSql,
  questionPageSql,
} from "@/lib/problem/questionCountSql";
import { loadQuestionCounts } from "@/lib/problem/questionCountProjection";
import {
  classifyFormat,
  type FormatInput,
  type ProblemFormat,
} from "@/lib/problem/provenance";
import {
  formatInputDigest,
  formatRuleVersion,
} from "../../../scripts/db/problem-actual-format";

let pg: Db, world: World;
const reads: StoredFormatRead[][] = [];
const writes: string[] = [];
const sqlOf = (query: Prisma.Sql | TemplateStringsArray, args: unknown[]) =>
  Array.isArray(query)
    ? Prisma.sql(query as TemplateStringsArray, ...args)
    : (query as Prisma.Sql);
const client = {
  problem: {
    findMany: () => {
      throw new Error("FULL_CANDIDATE_SCAN");
    },
  },
  $queryRaw: async (
    query: Prisma.Sql | TemplateStringsArray,
    ...args: unknown[]
  ) => {
    const sql = sqlOf(query, args);
    const rows = (await pg.query(sql.text, sql.values)).rows;
    if (
      "questionCountRead" in sql &&
      (sql as { questionCountRead: { mode: string } }).questionCountRead
        .mode === "formats"
    )
      reads.push(rows as StoredFormatRead[]);
    return rows;
  },
  $executeRaw: async (
    query: Prisma.Sql | TemplateStringsArray,
    ...args: unknown[]
  ) => {
    const sql = sqlOf(query, args);
    writes.push(sql.text);
    return (await pg.query(sql.text, sql.values)).affectedRows ?? 0;
  },
} as unknown as FormatDb &
  Pick<Prisma.TransactionClient, "$executeRaw" | "$queryRaw">;
async function read(id: string) {
  return (
    await pg.query<StoredFormatRead & { updatedAt: Date }>(
      `SELECT id,content,answer,question_type AS "questionType",
    problem_type AS "problemType",family_key AS "familyKey",question_group_key AS "questionGroupKey",
    actual_format AS "actualFormat",actual_format_version AS "actualFormatVersion",actual_format_digest AS "actualFormatDigest",
    updated_at AS "updatedAt" FROM problem WHERE id=$1`,
      [id],
    )
  ).rows[0];
}
async function make(input: Partial<FormatInput> = {}) {
  const { id } = await insertProblem(pg, world.unitId);
  await pg.query(
    `UPDATE problem SET content=$2,answer=$3,question_type=$4,problem_type=$5,family_key=$6,
    review_status='approved',direct_use_allowed=true WHERE id=$1`,
    [
      id,
      input.content ?? "물음",
      input.answer ?? "7",
      input.questionType === undefined ? "단답형" : input.questionType,
      input.problemType ?? "계산",
      input.familyKey ?? "other",
    ],
  );
  return id;
}
async function prime(
  id: string,
  patch: { version?: string; digest?: string; format?: ProblemFormat } = {},
) {
  const row = await read(id);
  await pg.query(
    `UPDATE problem SET actual_format=$2,actual_format_version=$3,actual_format_digest=$4 WHERE id=$1`,
    [
      id,
      patch.format ?? classifyFormat(row),
      patch.version ?? ACTUAL_FORMAT_VERSION,
      patch.digest ?? actualFormatDigest(row),
    ],
  );
}
beforeAll(async () => {
  pg = await openTextbookDb();
  await pg.exec(
    readFileSync(
      "supabase/migrations/20261018063016_question_group_identity.sql",
      "utf8",
    ),
  );
  world = await seedWorld(pg);
}, 120000);
afterAll(async () => {
  await pg?.close();
});

it("issues no savepoint or write for an empty lazy-fill batch", async () => {
  writes.length = 0;
  await persistMissingFormats(client, []);
  expect(writes).toEqual([]);
});

it("locks the release fingerprint and exact SQL/TS/backfill JSON bytes across all six inputs", async () => {
  expect(formatRuleVersion()).toBe(ACTUAL_FORMAT_VERSION);
  const base: FormatInput & { questionGroupKey: string | null } = {
    content: "한글 e\u0301 é 😀\u2028\u2029",
    answer: "7",
    questionType: null,
    problemType: null,
    familyKey: null,
    questionGroupKey: null,
  };
  const cases = [base];
  for (const field of [
    "content",
    "answer",
    "questionType",
    "problemType",
    "familyKey",
    "questionGroupKey",
  ] as const)
    for (const value of [
      "",
      "  가, 나  ",
      '"\\\t\n\r\n\b\f\u0001\u000b\u001f',
      "① $\\frac{1}{2}$",
      "긴 본문".repeat(10000),
    ])
      cases.push({ ...base, [field]: value });
  for (const row of cases) {
    const [result] = (
      await pg.query<{ digest: string }>(
        Prisma.sql`SELECT ${actualFormatDigestSql()} AS digest FROM
      (SELECT ${row.content}::text AS content,${row.answer}::text AS answer,${row.questionType}::text AS question_type,
        ${row.problemType}::text AS problem_type,${row.familyKey}::text AS family_key,${row.questionGroupKey}::text AS question_group_key) p`
          .text,
        [
          row.content,
          row.answer,
          row.questionType,
          row.problemType,
          row.familyKey,
          row.questionGroupKey,
        ],
      )
    ).rows;
    expect(result.digest).toBe(actualFormatDigest(row));
    expect(result.digest).toBe(formatInputDigest(row));
  }
});

it("trusts current non-NULL facts including unknown without auditing digests, and keeps counts/pages read-only", async () => {
  const sa = await make(),
    mc = await make({
      content: "물음\n① 1\n② 2\n③ 3\n④ 4\n⑤ 5",
      answer: "②",
      questionType: "객관식",
    });
  const ds = await make({ questionType: "서술형" }),
    unknown = await make({ questionType: null });
  const missing = await make(),
    old = await make(),
    stale = await make();
  for (const id of [sa, mc, ds, unknown]) await prime(id);
  await prime(old, {
    version: "format-v1:other-release",
    format: "descriptive",
  });
  await prime(stale, { digest: "0".repeat(64), format: "descriptive" });
  const ids = [sa, mc, ds, unknown, missing, old, stale],
    where = { id: { in: ids } };
  const before = await Promise.all(ids.map(read));
  writes.length = reads.length = 0;
  await pg.exec("BEGIN READ ONLY");
  try {
    const formats = new Map<string, ProblemFormat>();
    expect(await loadActualFormats(where, client, formats)).toBe(true);
    expect([...formats.keys()].sort()).toEqual([missing, old].sort());
    expect([...formats.values()]).toEqual(["short_answer", "short_answer"]);
    const buckets = await loadQuestionCounts(
      where,
      client,
      [],
      undefined,
      formats,
    );
    expect(buckets.find((b) => b.axis === "all")).toMatchObject({
      held: 7,
      available: 6,
      rowCount: 6,
    });
    const page = await client.$queryRaw<{ id: string }[]>(
      questionPageSql(
        where,
        [{ id: "asc" }],
        true,
        "short_answer",
        1,
        2,
        formats,
        client,
      )!,
    );
    expect(page.map((r) => r.id)).toEqual(
      [sa, missing, old].sort().slice(1, 3),
    );
    await loadActualFormats(where, client, new Map(), false);
    const full = reads.at(-1)!;
    for (const id of [sa, mc, ds, unknown, stale])
      expect(full.find((r) => r.id === id)).toMatchObject({
        content: null,
        answer: null,
      });
    expect(full.find((r) => r.id === unknown)?.actualFormat).toBe("unknown");
    expect(full.find((r) => r.id === stale)?.actualFormat).toBe("descriptive");
    expect(writes).toEqual([]);
  } finally {
    await pg.exec("COMMIT");
  }
  expect(await Promise.all(ids.map(read))).toEqual(before);
});

it("lazily fills a trigger-invalidated NULL fact without changing updatedAt; stale CAS and cache conflicts preserve reads", async () => {
  const id = await make();
  const before = await read(id);
  await pg.exec("BEGIN");
  try {
    await loadActualFormats({ id }, client, new Map());
    expect(await read(id)).toMatchObject({
      actualFormat: "short_answer",
      actualFormatVersion: ACTUAL_FORMAT_VERSION,
      actualFormatDigest: actualFormatDigest(before),
      updatedAt: before.updatedAt,
    });
    await pg.query("UPDATE problem SET content='새 물음' WHERE id=$1", [id]);
    expect((await read(id)).actualFormat).toBeNull();
    await persistMissingFormats(client, [
      { id, format: "short_answer", digest: actualFormatDigest(before) },
    ]);
    expect((await read(id)).actualFormat).toBeNull();
    await loadActualFormats({ id }, client, new Map());
    expect((await read(id)).actualFormatDigest).toBe(
      actualFormatDigest(await read(id)),
    );
    await pg.query("UPDATE problem SET content='다시 바꾼 물음' WHERE id=$1", [
      id,
    ]);
    const failed = {
      $executeRaw: async (
        query: Prisma.Sql | TemplateStringsArray,
        ...args: unknown[]
      ) => {
        const sql = sqlOf(query, args);
        if (sql.text.includes("UPDATE public.problem"))
          return pg.query("SELECT 1/0");
        return client.$executeRaw(sql);
      },
    } as unknown as Pick<Prisma.TransactionClient, "$executeRaw">;
    await persistMissingFormats(failed, [
      {
        id,
        format: "short_answer",
        digest: actualFormatDigest(await read(id)),
      },
    ]);
    expect((await read(id)).actualFormat).toBeNull();
    expect((await pg.query<{ n: number }>("SELECT 42 AS n")).rows[0].n).toBe(
      42,
    );
  } finally {
    await pg.exec("COMMIT");
  }
});
