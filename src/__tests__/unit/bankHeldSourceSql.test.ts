// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { openTextbookDb, seedWorld, insertProblem } from "../helpers/textbookPglite";
import { heldQuestionSourceGroupsSql } from "@/lib/problem/questionHeldSourceSql";
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
