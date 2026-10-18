// @vitest-environment node
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { Prisma } from "@prisma/client";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import { QUESTION_IDENTITY_FIELDS } from "@/lib/problem/questionPairProof";
import {
  executeQuestionBackfill,
  assignProvenEngineQuestionGroups,
  prepareQuestionBackfill,
  questionManifestSha,
  validateQuestionBackfillApproval,
  QUESTION_DDL_PATH,
  type QuestionOperatorClient,
  type QuestionBackfillReceipt,
} from "../../../scripts/import/question-group-backfill";

let pg: PGlite;
const ddl = readFileSync(QUESTION_DDL_PATH, "utf8");
const ddlSha = createHash("sha256").update(ddl).digest("hex");
const SA = "00000000-0000-4000-8000-000000000011",
  MC = "00000000-0000-4000-8000-000000000012";
const key = `q:v1:${"a".repeat(64)}`;
function adapter(db: PGlite | Transaction): QuestionOperatorClient {
  const sqlOf = (q: TemplateStringsArray | Prisma.Sql, values: unknown[]) =>
    Array.isArray(q) && "raw" in q
      ? Prisma.sql(q as TemplateStringsArray, ...values)
      : (q as Prisma.Sql);
  return {
    $queryRaw: async (
      q: TemplateStringsArray | Prisma.Sql,
      ...values: unknown[]
    ) => {
      const sql = sqlOf(q, values);
      return (await db.query(sql.text, sql.values)).rows;
    },
    $executeRaw: async (
      q: TemplateStringsArray | Prisma.Sql,
      ...values: unknown[]
    ) => {
      const sql = sqlOf(q, values);
      return (await db.query(sql.text, sql.values)).affectedRows ?? 0;
    },
  } as QuestionOperatorClient;
}
const client = () => ({
  ...adapter(pg),
  $transaction: <T>(fn: (tx: QuestionOperatorClient) => Promise<T>) =>
    pg.transaction((tx) => fn(adapter(tx))),
});
const receipt = (
  manifest: Awaited<ReturnType<typeof prepareQuestionBackfill>>,
): QuestionBackfillReceipt => ({
  kind: "math-question-backfill-receipt",
  version: 1,
  runId: "test",
  manifestSha256: questionManifestSha(manifest),
  ddlSha256: ddlSha,
  applied: [],
  reverted: [],
  pendingChunk: [],
  completed: false,
});
async function seed() {
  await pg.query(
    "INSERT INTO problem(id,external_id,question_type,content,answer,problem_code) VALUES ($1,'engine-mid:unit|01|s1|v0|단답형','단답형','x+1=3','2','S-A'),($2,'engine-mid:unit|01|s1|v0|객관식','객관식',E'x+1=3\\n① 1\\n② 2\\n③ 3\\n④ 4\\n⑤ 5','②','M-C')",
    [SA, MC],
  );
}
beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
    CREATE TABLE problem(id uuid PRIMARY KEY,unit_id uuid NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001',source text NOT NULL DEFAULT 'manual',family_key text DEFAULT 'mid:unit|01',difficulty text NOT NULL DEFAULT '기본',problem_type text NOT NULL DEFAULT '계산',origin_problem_id uuid,source_material_id uuid,content text NOT NULL,answer text NOT NULL,solution text DEFAULT 'same',figure_svg text,figure_urls text[] NOT NULL DEFAULT '{}',figure_dims int[] NOT NULL DEFAULT '{}',figure_source_mm double precision[] NOT NULL DEFAULT '{}',choice_figure_index int[] NOT NULL DEFAULT '{}',figure_source text,external_id text UNIQUE,question_type text,problem_code text,review_status text NOT NULL DEFAULT 'approved',direct_use_allowed boolean NOT NULL DEFAULT true,pool text NOT NULL DEFAULT 'shared',created_at timestamptz NOT NULL DEFAULT '2026-10-18T00:00:00Z',updated_at timestamptz NOT NULL DEFAULT '2026-10-18T00:00:00Z');
    CREATE TABLE problem_outer_wall_quarantine(problem_id uuid PRIMARY KEY REFERENCES problem(id));
    CREATE FUNCTION problem_code_freeze() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.problem_code IS DISTINCT FROM OLD.problem_code THEN RAISE EXCEPTION 'frozen code'; END IF; RETURN NEW; END; $$;
    CREATE TRIGGER problem_code_freeze BEFORE UPDATE ON problem FOR EACH ROW EXECUTE FUNCTION problem_code_freeze();
    CREATE FUNCTION enforce_registered_problem_outer_wall() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF EXISTS(SELECT 1 FROM problem_outer_wall_quarantine WHERE problem_id=OLD.id) THEN NEW.pool:='private';NEW.direct_use_allowed:=false;NEW.review_status:='rejected';END IF;RETURN NEW;END; $$;
    CREATE TRIGGER registered_problem_outer_wall BEFORE UPDATE ON problem FOR EACH ROW EXECUTE FUNCTION enforce_registered_problem_outer_wall();
    ALTER TABLE problem ENABLE ROW LEVEL SECURITY;
    GRANT SELECT,INSERT,UPDATE,DELETE ON problem TO anon,authenticated,service_role;
    GRANT SELECT ON problem_outer_wall_quarantine TO anon,authenticated,service_role;
  `);
  await pg.exec(ddl);
}, 60000);
afterAll(async () => {
  await pg?.close();
});
beforeEach(async () => {
  await pg.exec("TRUNCATE problem_outer_wall_quarantine,problem CASCADE");
  await seed();
});

describe("additive key invalidation and protected backfill on real local PostgreSQL semantics", () => {
  it("browser roles can still write old columns but cannot INSERT/UPDATE the proof key", async () => {
    await pg.exec("ALTER TABLE problem DISABLE ROW LEVEL SECURITY");
    try {
      for (const [i, role] of ["anon", "authenticated"].entries()) {
        await pg.exec(`SET ROLE ${role}`);
        try {
          await pg.exec(`UPDATE problem SET answer=answer WHERE id='${SA}'`);
          await expect(
            pg.query("UPDATE problem SET question_group_key=$1 WHERE id=$2", [
              key,
              SA,
            ]),
          ).rejects.toThrow("permission denied");
          const id = `00000000-0000-4000-8000-00000000003${i}`;
          await pg.query(
            "INSERT INTO problem(id,content,answer) VALUES ($1,'old client','1')",
            [id],
          );
          await expect(
            pg.query(
              "INSERT INTO problem(id,content,answer,question_group_key) VALUES ($1,'bad','1',NULL)",
              [`00000000-0000-4000-8000-00000000004${i}`],
            ),
          ).rejects.toThrow("permission denied");
          await pg.query("DELETE FROM problem WHERE id=$1", [id]);
        } finally {
          await pg.exec("RESET ROLE");
        }
      }
      await pg.exec("SET ROLE service_role");
      try {
        await pg.query("UPDATE problem SET question_group_key=$1 WHERE id=$2", [
          key,
          SA,
        ]);
      } finally {
        await pg.exec("RESET ROLE");
      }
    } finally {
      await pg.exec("ALTER TABLE problem ENABLE ROW LEVEL SECURITY");
    }
  });
  it.each(["PUBLIC", "inherited"])(
    "aborts and rolls all DDL back if %s can still write the key",
    async (kind) => {
      const other = new PGlite();
      try {
        await other.exec(
          "CREATE ROLE anon;CREATE ROLE authenticated;CREATE TABLE problem(id uuid,content text);GRANT SELECT,INSERT,UPDATE,DELETE ON problem TO anon,authenticated",
        );
        await other.exec(
          kind === "PUBLIC"
            ? "GRANT INSERT,UPDATE ON problem TO PUBLIC"
            : "CREATE ROLE inherited_writer;GRANT INSERT,UPDATE ON problem TO inherited_writer;GRANT inherited_writer TO authenticated",
        );
        await expect(other.exec(ddl)).rejects.toThrow("PUBLIC/inherited ACL");
        await other.exec("ROLLBACK");
        expect(
          (
            await other.query<{ n: number }>(
              "SELECT count(*)::int AS n FROM pg_attribute WHERE attrelid='problem'::regclass AND attname='question_group_key' AND NOT attisdropped",
            )
          ).rows[0].n,
        ).toBe(0);
        expect(
          (
            await other.query<{ ok: boolean }>(
              "SELECT has_table_privilege('anon','problem','INSERT') AND has_table_privilege('authenticated','problem','UPDATE') AS ok",
            )
          ).rows[0].ok,
        ).toBe(true);
      } finally {
        await other.close();
      }
    },
  );
  it("loader assigns persisted exact pairs only, then remains idempotent", async () => {
    const before = (
      await pg.query(
        "SELECT to_jsonb(p)-'question_group_key' AS row FROM problem p ORDER BY id",
      )
    ).rows;
    expect(
      await assignProvenEngineQuestionGroups(client(), [
        "engine-mid:unit|01|s1|v0|단답형",
      ]),
    ).toEqual({ proved: 1, unproved: 0, unchanged: 0 });
    expect(
      await assignProvenEngineQuestionGroups(client(), [
        "engine-mid:unit|01|s1|v0|객관식",
      ]),
    ).toEqual({ proved: 0, unproved: 0, unchanged: 1 });
    expect(
      (
        await pg.query(
          "SELECT to_jsonb(p)-'question_group_key' AS row FROM problem p ORDER BY id",
        )
      ).rows,
    ).toEqual(before);
  });
  it("loader leaves unproved rendered pairs and unsupported native rows separate", async () => {
    await pg.exec(`UPDATE problem SET figure_svg='<svg/>' WHERE id='${MC}'`);
    expect(
      await assignProvenEngineQuestionGroups(client(), [
        "engine-mid:unit|01|s1|v0|단답형",
        "engine-native-desc:any",
      ]),
    ).toEqual({ proved: 0, unproved: 1, unchanged: 0 });
    expect(
      (
        await pg.query<{ question_group_key: string | null }>(
          "SELECT question_group_key FROM problem",
        )
      ).rows.every((r) => r.question_group_key === null),
    ).toBe(true);
  });
  const updates: Record<(typeof QUESTION_IDENTITY_FIELDS)[number], string> = {
    unitId: "unit_id='00000000-0000-4000-8000-000000000099'",
    source: "source='past_exam'",
    familyKey: "family_key='changed'",
    difficulty: "difficulty='응용'",
    problemType: "problem_type='활용'",
    originProblemId: "origin_problem_id='00000000-0000-4000-8000-000000000099'",
    sourceMaterialId:
      "source_material_id='00000000-0000-4000-8000-000000000099'",
    content: "content='changed'",
    answer: "answer='changed'",
    solution: "solution='changed'",
    figureSvg: "figure_svg='<svg/>'",
    figureUrls: "figure_urls=ARRAY['x']",
    figureDims: "figure_dims=ARRAY[1,2]",
    figureSourceMm: "figure_source_mm=ARRAY[3.5]",
    choiceFigureIndex: "choice_figure_index=ARRAY[1]",
    figureSource: "figure_source='engine'",
    externalId: "external_id='changed'",
    questionType: "question_type='서술형'",
  };
  it.each(QUESTION_IDENTITY_FIELDS)(
    "invalidates actual %s edits even if the update also writes a key",
    async (field) => {
      await pg.query("UPDATE problem SET question_group_key=$1", [key]);
      await pg.exec(
        `UPDATE problem SET ${updates[field]},question_group_key='q:v1:${"b".repeat(64)}' WHERE id='${SA}'`,
      );
      const rows = await pg.query<{
        id: string;
        question_group_key: string | null;
      }>("SELECT id,question_group_key FROM problem ORDER BY id");
      expect(rows.rows).toEqual([
        { id: SA, question_group_key: null },
        { id: MC, question_group_key: key },
      ]);
    },
  );
  it("keeps keys for key-only/no-op identity/state/updatedAt changes and preserves old-code compatibility", async () => {
    await pg.query("UPDATE problem SET question_group_key=$1", [key]);
    await pg.exec(
      "UPDATE problem SET content=content,review_status='pending',direct_use_allowed=false,pool='private',updated_at=updated_at",
    );
    expect(
      (
        await pg.query<{ question_group_key: string }>(
          "SELECT question_group_key FROM problem",
        )
      ).rows.every((r) => r.question_group_key === key),
    ).toBe(true);
    await pg.exec(
      `UPDATE problem SET content='old code edit' WHERE id='${SA}'`,
    );
    expect(
      (
        await pg.query<{ question_group_key: string | null }>(
          "SELECT question_group_key FROM problem WHERE id=$1",
          [SA],
        )
      ).rows[0].question_group_key,
    ).toBeNull();
  });
  it("documents that direct proofless key-only SQL passes; operational writers enforce proof", async () => {
    await pg.query("UPDATE problem SET question_group_key=$1 WHERE id=$2", [
      key,
      SA,
    ]);
    expect(
      (
        await pg.query<{ question_group_key: string }>(
          "SELECT question_group_key FROM problem WHERE id=$1",
          [SA],
        )
      ).rows[0].question_group_key,
    ).toBe(key);
    await expect(prepareQuestionBackfill(client(), ddlSha)).rejects.toThrow(
      "Existing key conflict",
    );
  });
  it("coexists with frozen codes and rolls back a failed identity mutation", async () => {
    await pg.query("UPDATE problem SET question_group_key=$1", [key]);
    await expect(
      pg.exec(
        `UPDATE problem SET problem_code='bad',content='bad' WHERE id='${SA}'`,
      ),
    ).rejects.toThrow("frozen code");
    expect(
      (
        await pg.query<{ content: string; question_group_key: string }>(
          "SELECT content,question_group_key FROM problem WHERE id=$1",
          [SA],
        )
      ).rows[0],
    ).toEqual({ content: "x+1=3", question_group_key: key });
  });
  it("requires exact manifest/DDL/reviewer/writegate approval", async () => {
    const m = await prepareQuestionBackfill(client(), ddlSha);
    const sha = questionManifestSha(m);
    const a = {
      decision: "approved",
      scope: "question-backfill-gate-2",
      reviewer: "separate reviewer",
      manifestSha256: sha,
      ddlSha256: ddlSha,
    };
    expect(() =>
      validateQuestionBackfillApproval(m, a, ddlSha, sha),
    ).not.toThrow();
    for (const bad of [
      { ...a, decision: "pending" },
      { ...a, manifestSha256: "wrong" },
      { ...a, ddlSha256: "wrong" },
    ])
      expect(() =>
        validateQuestionBackfillApproval(m, bad, ddlSha, sha),
      ).toThrow();
    expect(() =>
      validateQuestionBackfillApproval(m, a, ddlSha, undefined),
    ).toThrow();
  });
  it("keys-only apply/readback, idempotent rerun and receipt-only CAS revert preserve every other field", async () => {
    const m = await prepareQuestionBackfill(client(), ddlSha);
    expect(m.preflight.targetRows).toBe(2);
    const r = receipt(m);
    const before = (
      await pg.query(
        "SELECT to_jsonb(p)-'question_group_key' AS row FROM problem p ORDER BY id",
      )
    ).rows;
    await executeQuestionBackfill(client(), m, {
      mode: "apply",
      receipt: r,
      persist: () => {},
    });
    expect(r.applied).toHaveLength(1);
    await executeQuestionBackfill(client(), m, {
      mode: "apply",
      receipt: r,
      persist: () => {},
    });
    expect(r.applied).toHaveLength(1);
    expect(
      (
        await pg.query(
          "SELECT to_jsonb(p)-'question_group_key' AS row FROM problem p ORDER BY id",
        )
      ).rows,
    ).toEqual(before);
    await executeQuestionBackfill(client(), m, {
      mode: "revert",
      receipt: r,
      persist: () => {},
    });
    expect(
      (
        await pg.query<{ question_group_key: string | null }>(
          "SELECT question_group_key FROM problem",
        )
      ).rows.every((x) => x.question_group_key === null),
    ).toBe(true);
    await executeQuestionBackfill(client(), m, {
      mode: "revert",
      receipt: r,
      persist: () => {},
    });
    expect(
      (
        await pg.query(
          "SELECT to_jsonb(p)-'question_group_key' AS row FROM problem p ORDER BY id",
        )
      ).rows,
    ).toEqual(before);
  });
  it("rejects quarantine overlap before preparation and again immediately before writes", async () => {
    const m = await prepareQuestionBackfill(client(), ddlSha);
    await pg.query("INSERT INTO problem_outer_wall_quarantine VALUES ($1)", [
      SA,
    ]);
    await expect(prepareQuestionBackfill(client(), ddlSha)).rejects.toThrow(
      "overlap",
    );
    await expect(
      executeQuestionBackfill(client(), m, {
        mode: "apply",
        receipt: receipt(m),
        persist: () => {},
      }),
    ).rejects.toThrow("overlap");
    expect(
      (
        await pg.query<{ pool: string }>(
          "SELECT pool FROM problem WHERE id=$1",
          [SA],
        )
      ).rows[0].pool,
    ).toBe("shared");
  });
  it("refuses stale payloads and foreign/replaced keys instead of overwriting them", async () => {
    const m = await prepareQuestionBackfill(client(), ddlSha);
    await pg.exec(`UPDATE problem SET solution='changed' WHERE id='${SA}'`);
    await expect(
      executeQuestionBackfill(client(), m, {
        mode: "apply",
        receipt: receipt(m),
        persist: () => {},
      }),
    ).rejects.toThrow("Payload changed");
    expect(
      (
        await pg.query<{ question_group_key: string | null }>(
          "SELECT question_group_key FROM problem",
        )
      ).rows.every((x) => x.question_group_key === null),
    ).toBe(true);
  });
  it("CAS revert cannot clear a replacement key from another operation", async () => {
    const m = await prepareQuestionBackfill(client(), ddlSha);
    const r = receipt(m);
    await executeQuestionBackfill(client(), m, {
      mode: "apply",
      receipt: r,
      persist: () => {},
    });
    const other = `q:v1:${"c".repeat(64)}`;
    await pg.query("UPDATE problem SET question_group_key=$1 WHERE id=$2", [
      other,
      SA,
    ]);
    await expect(
      executeQuestionBackfill(client(), m, {
        mode: "revert",
        receipt: r,
        persist: () => {},
      }),
    ).rejects.toThrow("Pair proof failed");
    expect(
      (
        await pg.query<{ id: string; question_group_key: string }>(
          "SELECT id,question_group_key FROM problem ORDER BY id",
        )
      ).rows,
    ).toEqual([
      { id: SA, question_group_key: other },
      { id: MC, question_group_key: m.pairs[0].key },
    ]);
  });
  it("rolls a whole chunk back if the second key update raises", async () => {
    const m = await prepareQuestionBackfill(client(), ddlSha);
    await pg.exec(
      `CREATE FUNCTION fail_second_key() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id='${MC}' AND NEW.question_group_key IS NOT NULL THEN RAISE EXCEPTION 'second row failure';END IF;RETURN NEW;END;$$;CREATE TRIGGER zz_fail_second_key BEFORE UPDATE ON problem FOR EACH ROW EXECUTE FUNCTION fail_second_key();`,
    );
    try {
      await expect(
        executeQuestionBackfill(client(), m, {
          mode: "apply",
          receipt: receipt(m),
          persist: () => {},
        }),
      ).rejects.toThrow("second row failure");
      expect(
        (
          await pg.query<{ question_group_key: string | null }>(
            "SELECT question_group_key FROM problem",
          )
        ).rows.every((x) => x.question_group_key === null),
      ).toBe(true);
    } finally {
      await pg.exec(
        "DROP TRIGGER zz_fail_second_key ON problem;DROP FUNCTION fail_second_key()",
      );
    }
  });
});
