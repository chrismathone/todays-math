import { afterEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
const frozen = vi.hoisted(() => ({
  manifest: Buffer.alloc(0),
  before: Buffer.alloc(0),
}));
vi.mock(
  "../../import/protected-question-maintenance",
  async (importOriginal) => ({
    ...(await importOriginal<object>()),
    verifyApproval: () => ({
      manifest: frozen.manifest,
      before: frozen.before,
      approval: {},
    }),
    journal: () => {},
  }),
);
import {
  boundedTargets,
  asDbCandidate,
  candidateEntries,
  candidatePairRow,
  census,
  contentKey,
  contractsFor,
  executeBounded,
  generateRequests,
  newUuidLedger,
  questionGroups,
  readBoundedScope,
  validateFrozenScope,
  assertNewContentUniqueness,
  type BoundedManifest,
  type ScopeLedger,
} from "../../import/bounded-question-reinforcement";
import {
  BOUNDED_CONTENT_CAP,
  BOUNDED_ROW_CAP,
} from "../../import/bounded-question-reinforcement";
import {
  QUESTION_FORMAT_PLAN_SHA,
  digest,
  stableJson,
  valueDigest,
  type DatabaseRow,
} from "../../import/protected-question-maintenance";
import {
  VERIFIED_BATCH_ROW_CAP,
  buildVerifiedCandidates,
  type UnitIdentity,
} from "../../import/verified-engine-batch";
import { elementaryUnits } from "../../../src/lib/elementary/generate";
import { verifyCandidateTasks } from "./verify-question-reinforcement";

const targets = boundedTargets(process.cwd());
const target = targets.find(
  (target) => target.engine === "elem" && target.generatorKey === "31",
)!;
const unit = elementaryUnits().find(
  (unit) => unit.grade === target.grade && unit.section === target.section,
)!;
const units: UnitIdentity[] = [{ ...unit, id: target.unitId }];
const plan = {
  label: "bounded-test",
  seedBase: 20261118,
  targets: [target.target],
};
const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

describe("bounded preparation contracts", () => {
  it("has exactly the audited 17+36 allowlist, disjoint from repairs and whole-family aliases", () => {
    expect(targets).toHaveLength(53);
    expect(targets.filter((target) => target.engine === "elem")).toHaveLength(
      17,
    );
    expect(
      targets.filter((target) => target.engine === "native-descriptive"),
    ).toHaveLength(6);
    expect(
      targets.filter((target) => target.nativeChoiceConditions),
    ).toHaveLength(10);
    expect(BOUNDED_CONTENT_CAP).toBe(96);
    expect(BOUNDED_ROW_CAP).toBe(174);
    expect(VERIFIED_BATCH_ROW_CAP).toBe(138);
  });
  it("retains source MC option conditions, ignores ordering and derived numerical distractors, includes actual SVG", () => {
    const base = {
      content: "same task\n① $1$\n② $2$\n③ $3$\n④ $4$\n⑤ $5$",
      figureSvg: null,
      figureUrls: [],
    };
    const reorder = {
      ...base,
      content: "same task\n① $5$\n② $4$\n③ $3$\n④ $2$\n⑤ $1$",
    };
    const changed = { ...base, content: base.content.replace("$5$", "$6$") };
    expect(contentKey(base, true)).toBe(contentKey(reorder, true));
    expect(contentKey(base, true)).not.toBe(contentKey(changed, true));
    expect(contentKey(base, false)).toBe(contentKey(changed, false));
    expect(contentKey(base, false)).not.toBe(
      contentKey({ ...base, figureSvg: "<svg/>" }, false),
    );
  });
  it("requires a strict pair proof for two rows and deterministic exact generator contracts", async () => {
    const built = await buildVerifiedCandidates(plan, units);
    const first = built[0]!;
    const group = questionGroups(
      built.map((row) => candidatePairRow(row, row.externalId)),
    )[0]!;
    expect(group).toHaveLength(2);
    const request = {
      plan,
      selectedExternalIds: group.map((row) => row.externalId!),
    };
    const rows = await generateRequests([request], units, targets);
    expect(() =>
      assertNewContentUniqueness(rows, targets, [
        asDbCandidate(rows[0]!, "already-stored"),
      ]),
    ).toThrow(/duplicates/);
    expect(rows).toHaveLength(2);
    expect(contractsFor(rows, targets)[0]!.contract).toBe(
      "proven-short-mc-pair",
    );
    const broken = structuredClone(rows);
    broken[1]!.solution += "changed";
    expect(() => contractsFor(broken, targets)).toThrow(/proof/);
    await expect(
      generateRequests(
        [
          {
            ...request,
            plan: {
              ...plan,
              targets: [
                {
                  ...target.target,
                  engine: "elem",
                  formIds: ["99"],
                } as typeof target.target,
              ],
            },
          },
        ],
        units,
        targets,
      ),
    ).rejects.toThrow(/contracts/);
    expect(first.content).toBeTruthy();
    const proof = await verifyCandidateTasks(rows, targets);
    expect(proof.rows).toBe(2);
    const wrong = structuredClone(rows);
    wrong.find((row) => row.questionType === "단답형")!.answer = "$999$";
    await expect(verifyCandidateTasks(wrong, targets)).rejects.toThrow(
      /mismatch/,
    );
  });
  it("refuses extras, baseline edits, borrowed UUIDs and changed persisted payloads", async () => {
    const built = await buildVerifiedCandidates(plan, units),
      group = questionGroups(
        built.map((row) => candidatePairRow(row, row.externalId)),
      )[0]!;
    const rows = await generateRequests(
      [{ plan, selectedExternalIds: group.map((row) => row.externalId!) }],
      units,
      targets,
    );
    const ledger = newUuidLedger("f".repeat(64), rows),
      base: DatabaseRow[] = [
        { id: "baseline", unit_id: target.unitId, content: "keep" },
      ];
    expect(() =>
      validateFrozenScope(base, [...base, { id: "unexpected" }], rows, ledger),
    ).toThrow(/Unexpected/);
    expect(() =>
      validateFrozenScope(
        base,
        [{ ...base[0]!, content: "changed" }],
        rows,
        ledger,
      ),
    ).toThrow(/baseline CAS/);
    const current = [
      ...base,
      ...rows.map((row) =>
        asDbCandidate(
          row,
          ledger.rows.find((entry) => entry.externalId === row.externalId)!.id,
        ),
      ),
    ];
    expect(() =>
      validateFrozenScope(base, current, rows, ledger),
    ).not.toThrow();
    current[1]!.answer = "edited";
    expect(() => validateFrozenScope(base, current, rows, ledger)).toThrow(
      /CAS/,
    );
  });
});

describe("local PostgreSQL bounded apply/idempotence/revert", () => {
  it("preserves full existing rows, proves actual persisted keys, stops on new references, and reverts only owned UUIDs", async () => {
    const pg = new PGlite();
    const dir = mkdtempSync(path.join(tmpdir(), "bounded-question-"));
    temps.push(dir);
    try {
      await pg.exec(`CREATE TABLE problem(id uuid PRIMARY KEY,external_id text UNIQUE,unit_id uuid,family_key text,question_type text,difficulty text,problem_type text,content text,answer text,solution text,figure_svg text,figure_urls text[] DEFAULT '{}',figure_dims integer[] DEFAULT '{}',figure_source_mm double precision[] DEFAULT '{}',choice_figure_index integer[] DEFAULT '{}',figure_source text,source text,pool text,origin_problem_id uuid REFERENCES problem(id),source_material_id uuid,review_status text,direct_use_allowed boolean,solution_source text,updated_at timestamptz NOT NULL,problem_code text DEFAULT ('QA-'||substr(md5(random()::text),1,12)),question_group_key text);
        CREATE TABLE basket_item(problem_id uuid REFERENCES problem(id));CREATE TABLE exam_question(problem_id uuid REFERENCES problem(id));CREATE TABLE problem_answer(problem_id uuid REFERENCES problem(id));CREATE TABLE problem_outer_wall_quarantine(problem_id uuid REFERENCES problem(id));CREATE TABLE problem_report(problem_id uuid REFERENCES problem(id));CREATE TABLE problem_review_log(problem_id uuid REFERENCES problem(id));CREATE TABLE test_problem(problem_id uuid REFERENCES problem(id));CREATE TABLE textbook_problem_snapshot(problem_id uuid REFERENCES problem(id),source_ref jsonb,source_key text);`);
      const adapter = (db: Pick<PGlite, "query">) => ({
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) =>
          (await db.query(sql, params)).rows,
        $executeRawUnsafe: async (sql: string, ...params: unknown[]) =>
          (await db.query(sql, params)).affectedRows ?? 0,
      });
      const prisma = {
        $transaction: async (
          work: (tx: ReturnType<typeof adapter>) => Promise<unknown>,
        ) => pg.transaction((tx) => work(adapter(tx as unknown as PGlite))),
      } as unknown as PrismaClient;
      await pg.query(
        "INSERT INTO problem(id,unit_id,family_key,content,answer,source,pool,review_status,direct_use_allowed,updated_at) VALUES($1,$2,$3,'existing task','$7$','manual','shared','approved',true,'2026-01-01')",
        [
          "11111111-1111-4111-8111-111111111111",
          target.unitId,
          target.familyKey,
        ],
      );
      const baseline = (
        await pg.query<{ row: DatabaseRow }>(
          "SELECT to_jsonb(p) AS row FROM problem p ORDER BY id",
        )
      ).rows.map((row) => row.row);
      const built = await buildVerifiedCandidates(plan, units),
        group = questionGroups(
          built.map((row) => candidatePairRow(row, row.externalId)),
        )[0]!;
      const request = {
        plan,
        selectedExternalIds: group.map((row) => row.externalId!),
      };
      const rows = await generateRequests([request], units, targets);
      const verification = await verifyCandidateTasks(rows, targets);
      const manifest: BoundedManifest = {
        version: 1,
        kind: "bounded-family-reinforcement",
        planSha256: QUESTION_FORMAT_PLAN_SHA,
        baselineStage: "final-after-backfill",
        sourceCommit: "a".repeat(40),
        sourceDigests: {},
        targets,
        requests: [request],
        rows: candidateEntries(rows),
        contents: contractsFor(rows, targets),
        beforeCensus: census(targets, baseline),
        expectedAfterCensus: census(targets, [
          ...baseline,
          ...rows.map((row) => asDbCandidate(row, row.externalId)),
        ]),
        shortfalls: [],
        privateCandidatesSha256: digest(JSON.stringify(rows)),
        independentVerificationSha256: digest(
          JSON.stringify(verification, null, 2) + "\n",
        ),
      };
      frozen.manifest = Buffer.from(JSON.stringify(manifest));
      const manifestSha = digest(frozen.manifest);
      const before: ScopeLedger = {
        version: 1,
        kind: "bounded-family-before",
        manifestSha256: manifestSha,
        unitIds: [...new Set(targets.map((target) => target.unitId))].sort(),
        privateBeforeSha256: digest(JSON.stringify(baseline)),
        rows: baseline.map((row) => ({
          id: row.id,
          fullRowSha256: valueDigest(row),
        })),
      };
      frozen.before = Buffer.from(JSON.stringify(before));
      const uuids = newUuidLedger(manifestSha, rows);
      writeFileSync(path.join(dir, "uuids.json"), JSON.stringify(uuids));
      const options = {
        files: {
          repoDir: process.cwd(),
          manifest: "unused",
          before: "unused",
          approval: "unused",
          prewrite: path.join(dir, "uuids.json"),
          journal: "unused",
        },
        manifest,
        before,
        uuids,
        privateBeforeBytes: Buffer.from(JSON.stringify(baseline)),
        privateCandidateBytes: Buffer.from(JSON.stringify(rows)),
        units,
        mode: "apply" as "apply" | "revert",
        apply: true,
        allowSharedImport: "1",
        writer: "coordinator",
      };
      await expect(
        executeBounded(
          {
            ...options,
            manifest: { ...manifest, baselineStage: "review-before-backfill" },
          },
          prisma,
        ),
      ).rejects.toThrow(/manifest contract/);
      const badUuids = structuredClone(uuids);
      badUuids.rows[0]!.id = "-".repeat(36);
      writeFileSync(path.join(dir, "uuids.json"), JSON.stringify(badUuids));
      await expect(
        executeBounded({ ...options, uuids: badUuids }, prisma),
      ).rejects.toThrow(/UUID ledger/);
      expect((await pg.query("SELECT * FROM problem")).rows).toHaveLength(1);
      writeFileSync(path.join(dir, "uuids.json"), JSON.stringify(uuids));
      const applied = await executeBounded(options, prisma);
      expect("inserted" in applied && applied.inserted).toHaveLength(2);
      const after = (
        await pg.query<{ row: DatabaseRow }>(
          "SELECT to_jsonb(p) AS row FROM problem p ORDER BY id",
        )
      ).rows.map((row) => row.row);
      expect(after.find((row) => row.id === baseline[0]!.id)).toEqual(
        baseline[0],
      );
      expect(
        new Set(
          after
            .filter((row) => row.id !== baseline[0]!.id)
            .map((row) => row.question_group_key),
        ).size,
      ).toBe(1);
      expect(
        after
          .filter((row) => row.id !== baseline[0]!.id)
          .every((row) => String(row.question_group_key).startsWith("q:v1:")),
      ).toBe(true);
      const repeated = await executeBounded(options, prisma);
      expect("inserted" in repeated && repeated.inserted).toEqual([]);
      expect("matched" in repeated && repeated.matched).toHaveLength(2);
      await pg.query("INSERT INTO test_problem VALUES($1)", [
        uuids.rows[0]!.id,
      ]);
      await expect(
        executeBounded({ ...options, mode: "revert" }, prisma),
      ).rejects.toThrow(/Referenced/);
      expect((await pg.query("SELECT * FROM problem")).rows).toHaveLength(3);
      await pg.exec("DELETE FROM test_problem");
      const reverted = await executeBounded(
        { ...options, mode: "revert" },
        prisma,
      );
      expect("deleted" in reverted && reverted.deleted).toHaveLength(2);
      const restored = (
        await pg.query<{ row: DatabaseRow }>(
          "SELECT to_jsonb(p) AS row FROM problem p ORDER BY id",
        )
      ).rows.map((row) => row.row);
      expect(stableJson(restored)).toBe(stableJson(baseline));
      const repeatedRevert = await executeBounded(
        { ...options, mode: "revert" },
        prisma,
      );
      expect("deleted" in repeatedRevert && repeatedRevert.deleted).toEqual([]);
      await pg.query("UPDATE problem SET updated_at='2026-01-02' WHERE id=$1", [
        baseline[0]!.id,
      ]);
      await expect(executeBounded(options, prisma)).rejects.toThrow(
        /baseline CAS/,
      );
      expect((await pg.query("SELECT * FROM problem")).rows).toHaveLength(1);
      expect(await readBoundedScope(adapter(pg) as never, [])).toEqual([]);
    } finally {
      await pg.close();
    }
  }, 60_000);
});
