// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { openTextbookDb, seedWorld, insertProblem } from "../helpers/textbookPglite";
import { heldQuestionSourceGroupsSql, heldQuestionTextbookKindsSql } from "@/lib/problem/questionHeldSourceSql";
import { questionCountsSql, type CountBucket } from "@/lib/problem/questionCountSql";
import { BANK_SOURCE_GROUPS, type BankSourceCounts } from "@/contracts/bankSource.contract";

it("counts only held question unions, including cross-source and same-group siblings, private exclusion and NULL singletons", async () => {
  const pg = await openTextbookDb({ until: "20261019120000_problem_actual_format" });
  try {
    await pg.exec(readFileSync("supabase/migrations/20261018063016_question_group_identity.sql", "utf8"));
    const world = await seedWorld(pg);
    const definitions = [
      ["manual", "same-question", "shared"], ["transformed", "same-question", "shared"],
      ["ai_generated", "same-question", "shared"], ["past_exam", null, "shared"],
      ["past_exam", null, "shared"], ["manual", "private-only", "private"],
    ];
    for (const [source, key, pool] of definitions) {
      const { id } = await insertProblem(pg, world.unitId);
      await pg.query("UPDATE problem SET source=$2::problem_source,pool=$3::problem_pool WHERE id=$1", [id, source, pool]);
      // The real identity trigger clears a key when its source changes. Set the
      // reviewed fixture key after those inputs, just as the real backfill does.
      await pg.query("UPDATE problem SET question_group_key=$2 WHERE id=$1", [id, key]);
    }
    const original = questionCountsSql({ pool: "shared" }, ["source"], undefined, new Map())!;
    const rows = (await pg.query<CountBucket>(original.text, original.values)).rows;
    const expected = { total: rows.find((row) => row.axis === "all")?.held ?? 0,
      ...Object.fromEntries(BANK_SOURCE_GROUPS.map((group) => [group, rows.find((row) => row.axis === "source" && row.key === group)?.held ?? 0])) };
    const sql = heldQuestionSourceGroupsSql();
    const [current] = (await pg.query<BankSourceCounts["sources"]>(sql.text, sql.values)).rows;
    expect(Buffer.from(JSON.stringify(current)).equals(Buffer.from(JSON.stringify(expected)))).toBe(true);
    expect(current.other).toBe(1);
    expect(current.past_exam).toBe(2);
    expect(sql.text).not.toMatch(/actual_format|answer|content|review_status|direct_use_allowed|row_number|JOIN/);
  } finally { await pg.close(); }
}, 120_000);

it("kind totals are held question unions per kind over textbook books only — the per-book kinds summed", async () => {
  const pg = await openTextbookDb({ until: "20261019120000_problem_actual_format" });
  try {
    await pg.exec(readFileSync("supabase/migrations/20261018063016_question_group_identity.sql", "utf8"));
    const world = await seedWorld(pg);
    const book = async (key: string, kind: string) => {
      const { rows } = await pg.query<{ id: string }>(
        `INSERT INTO source_book (id, external_key, kind, publisher, author, title, grade, curriculum, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, '출판', NULL, '수학', '중1', '2022', now(), now()) RETURNING id`, [key, kind]);
      return rows[0].id;
    };
    const material = async (key: string, bookId: string, kind: string) => {
      const { rows } = await pg.query<{ id: string }>(
        `INSERT INTO source_material (id, external_key, book_id, kind, kind_raw, title, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $3, '자료', now(), now()) RETURNING id`, [key, bookId, kind]);
      return rows[0].id;
    };
    const [a, b, w] = [await book("a", "school_textbook"), await book("b", "school_textbook"), await book("w", "workbook")];
    const m = { a1: await material("a1", a, "형성 평가"), a2: await material("a2", a, "기초 연산"),
      b1: await material("b1", b, "형성 평가"), w1: await material("w1", w, "형성 평가") };
    const rows: [string | null, string | null, string, string][] = [
      [m.a1, null, "school_textbook", "shared"], [m.a1, "q:v1:pair", "school_textbook", "shared"],
      [m.a1, "q:v1:pair", "school_textbook", "shared"], [m.a2, null, "school_textbook", "shared"],
      [m.b1, null, "school_textbook", "shared"], [m.b1, null, "school_textbook", "private"],
      [m.w1, null, "school_textbook", "shared"], [null, null, "manual", "shared"],
    ];
    for (const [materialId, key, source, pool] of rows) {
      const { id } = await insertProblem(pg, world.unitId);
      await pg.query("UPDATE problem SET source=$2::problem_source,pool=$3::problem_pool,source_material_id=$4 WHERE id=$1", [id, source, pool, materialId]);
      // The identity trigger clears a key when its inputs change — set it last, as the backfill does.
      await pg.query("UPDATE problem SET question_group_key=$2 WHERE id=$1", [id, key]);
    }
    const original = questionCountsSql({ pool: "shared", source: "school_textbook" }, ["kind"], undefined, new Map())!;
    const buckets = (await pg.query<CountBucket>(original.text, original.values)).rows;
    const expected: Record<string, number> = {};
    for (const bucket of buckets)
      if (bucket.axis === "kind" && [a, b].includes(bucket.key))
        expected[bucket.extra!] = (expected[bucket.extra!] ?? 0) + bucket.held;
    const sql = heldQuestionTextbookKindsSql();
    const current = Object.fromEntries(
      (await pg.query<{ kind: string; count: number }>(sql.text, sql.values)).rows.map((row) => [row.kind, row.count]),
    );
    expect(current).toEqual(expected);
    expect(current).toEqual({ "형성 평가": 3, "기초 연산": 1 });
    expect(sql.text).not.toMatch(/actual_format|answer|content|review_status|direct_use_allowed|row_number/);
  } finally { await pg.close(); }
}, 120_000);
