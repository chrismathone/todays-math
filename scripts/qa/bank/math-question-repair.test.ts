import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import type { Prisma } from "@prisma/client";
import {
  elementaryUnits,
  generateElementaryForm,
} from "../../../src/lib/elementary/generate";
import { renderFigureSpec } from "../../../src/lib/figure/renderFigureSpec";
import {
  independentlyVerifyRepairs,
  planRepairChanges,
  type Repair,
} from "../../import/question-content-repair";
import {
  assertCoordinatorWrite,
  assertNoReferences,
  discoverReferences,
  patchedRow,
  payloadDigest,
  payloadOf,
  readRows,
  referenceCounts,
  stableJson,
  valueDigest,
  updatePayloadCas,
  type DatabaseRow,
} from "../../import/protected-question-maintenance";
import {
  assertReferenceCoverage,
  VERIFIED_BATCH_ROW_CAP,
} from "../../import/verified-engine-batch";

const repo = process.cwd();
const sourceCases = [
  ["2-2-1", "09", "tri221PickIso"],
  ["2-2-2", "09", "tri222Pick"],
  ["2-4-2", "09", "quad242PerpCount"],
  ["2-4-4", "05", "quad244Pick"],
  ["2-6-3", "10", "poly263Name"],
] as const;

describe("17-row source corrections", () => {
  it("independently solves actual SVG for three original seeds in all five families", async () => {
    const rows: Repair[] = [];
    for (const [section, formId, repair] of sourceCases) {
      const unit = elementaryUnits().find(
        (unit) =>
          unit.grade === "초4" && unit.section.startsWith(section + " "),
      )!;
      for (const seed of [20260827, 20261836, 20262845]) {
        const p = generateElementaryForm(unit, seed, formId);
        const result = p.figureSpec
          ? await renderFigureSpec(p.figureSpec, { strict: true })
          : null;
        if (result && !result.ok) throw new Error(result.error);
        const payload = {
          content: p.content,
          answer: p.answer,
          solution: p.solution,
          figureSvg: result?.ok ? result.svg : null,
        };
        rows.push({
          id: `${repair}-${seed}`,
          repair,
          seed,
          externalId: "fixture",
          problemCode: "fixture",
          familyKey: "fixture",
          questionType: "단답형",
          beforePayloadSha256: "fixture",
          afterPayloadSha256: payloadDigest(payload),
          payload,
          figureSpec: p.figureSpec,
        });
      }
    }
    const proof = independentlyVerifyRepairs(rows, repo) as {
      rows: number;
      independentActualSvgProofs: { uniqueAnswer: boolean }[];
    };
    expect(proof.rows).toBe(15);
    expect(
      proof.independentActualSvgProofs.every((row) => row.uniqueAnswer),
    ).toBe(true);
  }, 60_000);
  it("keeps equilateral, right-isosceles and wide-isosceles global coordinates", async () => {
    for (const [shape, expected] of [
      ["eqTri", [1936, 1936, 1936]],
      ["rightTri", [1936, 1936, 3872]],
      ["wideTri", [1135.2384, 1135.2384, 1936]],
    ] as const) {
      const drawn = await renderFigureSpec({
        version: "elem-1",
        kind: "namedShapes",
        items: [{ shape, label: "가" }],
      });
      if (!drawn.ok) throw new Error(drawn.error);
      const pts = /<polygon points="([^"]+)"/
        .exec(drawn.svg)![1]!
        .split(" ")
        .map((pair) => pair.split(",").map(Number));
      const squares = pts
        .map(
          ([x, y], i) =>
            (pts[(i + 1) % 3]![0]! - x!) ** 2 +
            (pts[(i + 1) % 3]![1]! - y!) ** 2,
        )
        .sort((a, b) => a - b);
      expected.forEach((value, i) => expect(squares[i]).toBeCloseTo(value, 0));
    }
  }, 30_000);
  it("rejects scoped choice shapes in the global markedShape vocabulary", async () => {
    const result = await renderFigureSpec({
      version: "elem-1",
      kind: "markedShape",
      shape: "choiceScaleneTri",
    });
    expect(result.ok).toBe(false);
  });
});

describe("real local PostgreSQL repair semantics", () => {
  it("discovers future FK references and performs full-row SQL CAS without touching codes or timestamps", async () => {
    const pg = new PGlite();
    try {
      await pg.exec(`CREATE TABLE problem(id text PRIMARY KEY,origin_problem_id text REFERENCES problem(id),content text,answer text,solution text,figure_svg text,problem_code text,updated_at text,question_group_key text,family_key text,external_id text);
        CREATE TABLE basket_item(problem_id text REFERENCES problem(id));
        CREATE TABLE exam_question(problem_id text REFERENCES problem(id));
        CREATE TABLE problem_answer(problem_id text REFERENCES problem(id));
        CREATE TABLE problem_outer_wall_quarantine(problem_id text REFERENCES problem(id));
        CREATE TABLE problem_report(problem_id text REFERENCES problem(id));
        CREATE TABLE problem_review_log(problem_id text REFERENCES problem(id));
        CREATE TABLE test_problem(problem_id text REFERENCES problem(id));
        CREATE TABLE textbook_problem_snapshot(problem_id text REFERENCES problem(id),source_ref jsonb,source_key text);
        CREATE TABLE future_problem_claim(claimed_problem text REFERENCES problem(id));
        CREATE FUNCTION clear_key() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.content IS DISTINCT FROM NEW.content OR OLD.figure_svg IS DISTINCT FROM NEW.figure_svg THEN NEW.question_group_key=NULL; END IF; RETURN NEW; END $$;
        CREATE TRIGGER clear_key BEFORE UPDATE ON problem FOR EACH ROW EXECUTE FUNCTION clear_key();
        INSERT INTO problem(id,content,answer,solution,problem_code,updated_at,question_group_key) VALUES('one','old','same','old solution','KEEP-CODE','KEEP-TIME','proof-old');`);
      const tx = {
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) =>
          (await pg.query(sql, params)).rows,
      } as unknown as Prisma.TransactionClient;
      const refs = await discoverReferences(tx);
      expect(refs).toContainEqual({
        schema: "public",
        table: "future_problem_claim",
        column: "claimed_problem",
        kind: "scalar",
      });
      const before = (await readRows(tx, ["one"]))[0]!;
      const payload = {
        ...payloadOf(before),
        content: "corrected",
        figureSvg: "<svg/>",
      };
      const after = await updatePayloadCas(tx, before, payload);
      expect(after.problem_code).toBe("KEEP-CODE");
      expect(after.updated_at).toBe("KEEP-TIME");
      expect(after.question_group_key).toBeNull();
      await expect(updatePayloadCas(tx, before, payload)).rejects.toThrow(
        /CAS/,
      );
      expect(await readRows(tx, ["one"])).toEqual([after]);
      await pg.exec(
        "INSERT INTO future_problem_claim VALUES('one'); INSERT INTO textbook_problem_snapshot(source_ref,source_key) VALUES('{\"problemId\":\"one\"}','tm:one');",
      );
      const counts = await referenceCounts(tx, refs, ["one"]);
      expect(counts.one!["public.future_problem_claim.claimed_problem"]).toBe(
        1,
      );
      expect(counts.one!["public.textbook_problem_snapshot.source_ref"]).toBe(
        1,
      );
      expect(counts.one!["public.textbook_problem_snapshot.source_key"]).toBe(
        1,
      );
      expect(() => assertNoReferences(counts)).toThrow(/Referenced/);
    } finally {
      await pg.close();
    }
  }, 30_000);
});

describe("separate repair protections", () => {
  const before: DatabaseRow[] = [1, 2].map((n) => ({
    id: String(n),
    problem_code: `KEEP-${n}`,
    external_id: `KEEP-${n}`,
    family_key: "KEEP",
    content: "old",
    answer: "same",
    solution: "old solution",
    figure_svg: null,
    updated_at: "unchanged",
    question_group_key: null,
    pool: "shared",
    direct_use_allowed: true,
  }));
  const repairs = before.map((row) => ({
    id: row.id,
    payload: { ...payloadOf(row), content: "fixed" },
  })) as Repair[];
  it("is read-only unless all coordinator gates are explicit", () => {
    expect(() => assertCoordinatorWrite(false, "1", "coordinator")).toThrow();
    expect(() =>
      assertCoordinatorWrite(true, undefined, "coordinator"),
    ).toThrow();
    expect(() => assertCoordinatorWrite(true, "1", undefined)).toThrow();
    expect(() =>
      assertCoordinatorWrite(true, "1", "coordinator"),
    ).not.toThrow();
    expect(VERIFIED_BATCH_ROW_CAP).toBe(138); // Existing R2/R5 utility remains frozen.
  });
  it("checks all full rows before planning any write, including non-payload fields", () => {
    expect(
      planRepairChanges(repairs, before, before, "apply").work,
    ).toHaveLength(2);
    const changed = structuredClone(before);
    changed[1]!.updated_at = "someone else edited";
    expect(() => planRepairChanges(repairs, before, changed, "apply")).toThrow(
      /CAS/,
    );
    expect(() =>
      planRepairChanges(repairs, before, [before[0]!], "apply"),
    ).toThrow();
  });
  it("is idempotent and reverses only the exact repaired payload", () => {
    const after = before.map((row, i) => patchedRow(row, repairs[i]!.payload));
    const repeated = planRepairChanges(repairs, before, after, "apply");
    expect(repeated.work).toHaveLength(0);
    expect(repeated.matched).toHaveLength(2);
    const reversed = planRepairChanges(repairs, before, after, "revert");
    expect(reversed.work.map((row) => row.payload)).toEqual(
      before.map(payloadOf),
    );
    const drift = structuredClone(after);
    drift[0]!.answer = "edited";
    expect(() => planRepairChanges(repairs, before, drift, "revert")).toThrow(
      /CAS/,
    );
    expect(
      planRepairChanges(repairs, before, before, "revert").work,
    ).toHaveLength(0);
  });
  it("refuses every positive reference, invalid counts, and incomplete discovery", () => {
    expect(() =>
      assertNoReferences({ one: { "test_problem.problem_id": 1 } }),
    ).toThrow(/Referenced/);
    expect(() => assertNoReferences({ one: { future: -1 } })).toThrow();
    expect(() => assertNoReferences({ one: {} })).not.toThrow();
    expect(() => assertReferenceCoverage([])).toThrow(/incomplete/);
  });
  it("has stable whole-row digests and never restores an unproved group key", () => {
    expect(valueDigest({ a: 1, b: [2, 3] })).toBe(
      valueDigest({ b: [2, 3], a: 1 }),
    );
    expect(
      stableJson(
        patchedRow(
          { ...before[0]!, question_group_key: "old-proof" },
          repairs[0]!.payload,
        ),
      ),
    ).toContain('"question_group_key":null');
    expect(patchedRow(before[0]!, repairs[0]!.payload).updated_at).toBe(
      "unchanged",
    );
  });
});
