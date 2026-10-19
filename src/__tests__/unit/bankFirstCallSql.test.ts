// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import {
  questionCountsSql,
  questionPageSql,
  type CountBucket,
  type CountDimension,
} from "@/lib/problem/questionCountSql";
import {
  ACTUAL_FORMAT_VERSION,
  verifyFormatScope,
} from "@/lib/problem/actualFormat";
import { questionBucketsFromRows } from "@/lib/problem/questionCountBuckets";
import { MISSING_ANSWER } from "@/lib/missingAnswer";
import type { QuestionFormat } from "@/contracts/questionFormats.contract";

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const units = [
  { id: uuid(1), grade: "중2", order_index: 2 },
  { id: uuid(2), grade: "중1", order_index: 1 },
];
const materials = [
  { id: uuid(10), book_id: uuid(20), kind: "수업 자료" },
  { id: uuid(11), book_id: uuid(20), kind: "형성 평가" },
];
const rows = Array.from({ length: 90 }, (_, i) => ({
  id: uuid(100 + i),
  unit_id: units[i % 2].id,
  question_group_key: i % 11 === 0 ? null : `q:${Math.floor(i / 3)}`,
  family_key: i % 5 === 0 ? null : `mid:family-${i % 7}`,
  difficulty: ["기초", "기본", "심화"][i % 3],
  source: ["manual", "school_textbook", "past_exam", "transformed"][i % 4],
  source_material_id: materials[i % 2].id,
  review_status: i % 13 === 0 ? "pending" : "approved",
  direct_use_allowed: i % 7 !== 0,
  answer: i % 17 === 0 ? MISSING_ANSWER : "fixture",
  pool: i % 19 === 0 ? "private" : "shared",
  problem_code: `FIX-${String(90 - i).padStart(4, "0")}`,
  question_number: i % 9,
  actual_format: ["short_answer", "multiple_choice", "descriptive", "unknown"][
    i % 4
  ],
  actual_format_version: ACTUAL_FORMAT_VERSION,
}));
let pg: PGlite;
const client = {};
const formats = new Map<string, string>();
const available = (row: (typeof rows)[number]) =>
  row.pool === "shared" &&
  row.review_status === "approved" &&
  row.direct_use_allowed &&
  row.answer !== MISSING_ANSWER &&
  row.actual_format !== "unknown";
const raw = async (sql: Prisma.Sql) =>
  (await pg.query<CountBucket>(sql.text, sql.values)).rows;
const publicBuckets = (buckets: CountBucket[]) =>
  buckets.map((bucket) =>
    Object.defineProperty({ ...bucket }, "firstAvailable", {
      enumerable: false,
    }),
  );

beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(`CREATE TYPE problem_pool AS ENUM ('shared','private');
    CREATE TYPE problem_source AS ENUM ('manual','school_textbook','past_exam','transformed','ai_generated');
    CREATE TYPE review_status AS ENUM ('pending','approved','rejected');
    CREATE TYPE difficulty AS ENUM ('기초','기본','심화');
    CREATE TABLE unit (id uuid PRIMARY KEY,grade text,order_index integer);
    CREATE TABLE source_material (id uuid PRIMARY KEY,book_id uuid,kind text);
    CREATE TABLE problem (id uuid PRIMARY KEY,unit_id uuid,question_group_key text,family_key text,
      difficulty difficulty,source problem_source,source_material_id uuid,review_status review_status,
      direct_use_allowed boolean,answer text,pool problem_pool,problem_code text,question_number integer,
      actual_format text,actual_format_version text);`);
  for (const [table, values] of [
    ["unit", units],
    ["source_material", materials],
    ["problem", rows],
  ] as const)
    await pg.query(
      `INSERT INTO ${table} SELECT * FROM jsonb_populate_recordset(NULL::${table},$1::jsonb)`,
      [JSON.stringify(values)],
    );
  await pg.exec("ANALYZE");
  verifyFormatScope(formats, client, { pool: "shared" });
}, 120000);
afterAll(async () => {
  await pg?.close();
});

it("keeps scoped unit/family counts and first-available order equal to an independent row union", async () => {
  const scopes = [undefined, units[0].id, units[1].id];
  const axes: CountDimension[][] = [
    ["source"],
    ["book", "kind"],
    ["material"],
    ["unit", "family"],
    ["source", "book", "kind", "material"],
    ["unit", "family", "difficulty", "source", "book", "kind", "grade"],
  ];
  for (const unit of scopes)
    for (const dimensions of axes)
      for (const format of [
        undefined,
        "short_answer",
        "multiple_choice",
      ] as const)
        for (const includeFormats of [false, true]) {
          const visible = rows.filter(
            (row) => row.pool === "shared" && (!unit || row.unit_id === unit),
          );
          const expected = questionBucketsFromRows(
            visible.map((row) => ({
              questionId: row.question_group_key ?? `row:${row.id}`,
              actualFormat:
                row.actual_format === "unknown"
                  ? null
                  : (row.actual_format as QuestionFormat),
              available: available(row),
              unitId: row.unit_id,
              familyKey: row.family_key,
              source: row.source,
              sourceMaterialId: row.source_material_id,
              difficulty: row.difficulty,
              weight: 1,
              rowCount: 1,
            })),
            dimensions,
            format,
            {
              units,
              materials: materials.map((material) => ({
                id: material.id,
                bookId: material.book_id,
                kind: material.kind,
              })),
            },
          ).filter((bucket) => includeFormats || bucket.axis !== "format");
          const actual = await raw(
            questionCountsSql(
              unit ? { unitId: unit } : {},
              dimensions,
              format,
              formats,
              client,
              includeFormats,
            )!,
          );
          expect(Buffer.from(JSON.stringify(publicBuckets(actual)))).toEqual(
            Buffer.from(JSON.stringify(expected)),
          );
          expect(
            actual.map((bucket) => bucket.firstAvailable ?? Infinity),
          ).toEqual(expected.map((bucket) => bucket.firstAvailable));
        }
});

it("groups before pagination while a later usable sibling retains the first sibling's group order", async () => {
  const order: Prisma.ProblemOrderByWithRelationInput[] = [
    { unit: { orderIndex: "asc" } },
    { problemCode: "asc" },
    { id: "asc" },
  ];
  const sorted = rows
    .filter((row) => row.pool === "shared")
    .sort(
      (a, b) =>
        units.find((unit) => unit.id === a.unit_id)!.order_index -
          units.find((unit) => unit.id === b.unit_id)!.order_index ||
        a.problem_code.localeCompare(b.problem_code) ||
        a.id.localeCompare(b.id),
    );
  const groups = new Map<string, typeof sorted>();
  for (const row of sorted) {
    const key = row.question_group_key ?? `row:${row.id}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  for (const availableOnly of [true, false])
    for (const format of [
      undefined,
      "short_answer",
      "multiple_choice",
    ] as const) {
      const expected = [...groups.values()].flatMap((members) => {
        const row = members.find(
          (row) =>
            (!availableOnly || available(row)) &&
            (!format || row.actual_format === format),
        );
        return row ? [{ id: row.id }] : [];
      });
      for (const skip of [0, 5, 500]) {
        const sql = questionPageSql(
          {},
          order,
          availableOnly,
          format,
          skip,
          5,
          formats,
          client,
        )!;
        expect((await pg.query(sql.text, sql.values)).rows).toEqual(
          expected.slice(skip, skip + 5),
        );
      }
    }
});

it("uses transaction-local memory in a verified READ ONLY snapshot without changing bytes or later settings", async () => {
  const sql = questionCountsSql(
    {},
    ["unit", "family"],
    undefined,
    formats,
    client,
    false,
  )!;
  const before = JSON.stringify(await raw(sql));
  const setting = (await pg.query<{ work_mem: string }>("SHOW work_mem"))
    .rows[0].work_mem;
  await pg.exec("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try {
    expect(
      (
        await pg.query<{ transaction_read_only: string }>(
          "SHOW transaction_read_only",
        )
      ).rows[0].transaction_read_only,
    ).toBe("on");
    await pg.exec("SET LOCAL work_mem='16MB'");
    expect(JSON.stringify(await raw(sql))).toBe(before);
  } finally {
    await pg.exec("ROLLBACK");
  }
  expect(
    (await pg.query<{ work_mem: string }>("SHOW work_mem")).rows[0].work_mem,
  ).toBe(setting);
});
