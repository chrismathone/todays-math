/** Separately reviewed eight-row noun correction. Default preparation is READ ONLY. */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import {
  QUESTION_FORMAT_PLAN_SHA,
  assertCoordinatorWrite,
  assertNoReferences,
  committedBytes,
  digest,
  discoverReferences,
  journal,
  lockedMaintenance,
  patchedRow,
  payloadOf,
  readRows,
  readonlyMaintenance,
  referenceCounts,
  updatePayloadCas,
  valueDigest,
  type DatabaseRow,
  type ApprovalFiles,
} from "../../import/protected-question-maintenance";

const FAMILY = "mid:2-2|경우의 수|11";
const ROOT = path.resolve(__dirname, "../../..");
const FOLDER =
  "docs/planning/tracks/reports/math-question-formats-20261018/zero-card-wording";
const PRIVATE =
  ".qa-artifacts/math-question-formats-20261018/zero-card-wording";
const OPERATOR = "scripts/qa/bank/math-zero-card-wording.ts";
const PLAN = `${FOLDER}/plan.md`;
const files: ApprovalFiles = {
  repoDir: ROOT,
  manifest: `${FOLDER}/manifest.json`,
  before: `${FOLDER}/before-ledger.json`,
  approval: `${FOLDER}/claude-content-approval.json`,
  journal: `${FOLDER}/results.jsonl`,
};
const serialize = (v: unknown) => JSON.stringify(v, null, 2) + "\n";
const read = <T>(p: string) =>
  JSON.parse(readFileSync(path.resolve(ROOT, p), "utf8")) as T;
const save = (p: string, v: unknown) =>
  writeFileSync(path.resolve(ROOT, p), serialize(v), {
    flag: "wx",
    mode: 0o600,
  });
function corrected(row: DatabaseRow) {
  assert.equal(row.family_key, FAMILY);
  assert.equal(row.pool, "shared");
  const text = String(row.content),
    pattern = /^(\$0\$부터 \$[3-5]\$까지의 )자연수가( 각각 하나씩 적힌 )/;
  assert(
    pattern.test(text),
    "Unexpected source wording; no broader replacement permitted",
  );
  return { ...payloadOf(row), content: text.replace(pattern, "$1숫자가$2") };
}
type Manifest = {
  kind: string;
  planSha256: string;
  supplementalPlanSha256: string;
  sourceCommit: string;
  operatorSha256: string;
  privateBeforeSha256: string;
  rows: { id: string; beforeSha256: string; afterSha256: string }[];
};
async function main() {
  const mode = process.argv[2] || "prepare";
  assert(["prepare", "verify", "apply"].includes(mode));
  const db = new PrismaClient({ log: [] });
  try {
    if (mode === "prepare") {
      const pre = await readonlyMaintenance(db, async (tx) => {
        const rows = await readRows(tx, [], [FAMILY]);
        assert.equal(rows.length, 8, "Exact supplemental scope changed");
        const refs = await discoverReferences(tx),
          counts = await referenceCounts(
            tx,
            refs,
            rows.map((r) => r.id),
          );
        assertNoReferences(counts);
        return { rows, refs, counts };
      });
      const expected = pre.rows.map((row) => patchedRow(row, corrected(row)));
      const manifest: Manifest = {
        kind: "zero-inclusive-card-wording-repair",
        planSha256: QUESTION_FORMAT_PLAN_SHA,
        supplementalPlanSha256: digest(committedBytes(ROOT, PLAN)),
        sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
          cwd: ROOT,
          encoding: "utf8",
        }).trim(),
        operatorSha256: digest(committedBytes(ROOT, OPERATOR)),
        privateBeforeSha256: digest(serialize(pre.rows)),
        rows: pre.rows.map((r, i) => ({
          id: r.id,
          beforeSha256: valueDigest(r),
          afterSha256: valueDigest(expected[i]),
        })),
      };
      mkdirSync(path.resolve(ROOT, FOLDER), { recursive: true });
      mkdirSync(path.resolve(ROOT, PRIVATE), { recursive: true });
      save(`${PRIVATE}/before-private.json`, pre.rows);
      save(`${PRIVATE}/after-private.json`, expected);
      save(files.manifest, manifest);
      save(files.before, {
        at: new Date().toISOString(),
        readOnly: true,
        rows: manifest.rows,
        referenceColumns: pre.refs,
        referenceCounts: pre.counts,
        allOtherFieldsPreserved: true,
        changedFields: ["content"],
        newWord: "숫자가",
        oldWord: "자연수가",
        notes:
          "Only the zero-inclusive card labels change. The positive natural number being formed, choices, answers, solutions and all metadata are unchanged.",
      });
      console.log(
        serialize({
          mode,
          rows: 8,
          readOnly: true,
          manifestSha256: digest(serialize(manifest)),
        }),
      );
      return;
    }
    const manifest = read<Manifest>(files.manifest),
      before = read<DatabaseRow[]>(`${PRIVATE}/before-private.json`),
      after = before.map((row) => patchedRow(row, corrected(row)));
    assert.equal(manifest.privateBeforeSha256, digest(serialize(before)));
    assert.equal(before.length, 8);
    assert.deepEqual(
      manifest.rows,
      before.map((r, i) => ({
        id: r.id,
        beforeSha256: valueDigest(r),
        afterSha256: valueDigest(after[i]),
      })),
    );
    const ids = before.map((r) => r.id);
    if (mode === "verify") {
      const result = await readonlyMaintenance(db, async (tx) => {
        const current = await readRows(tx, ids, [FAMILY]),
          refs = await discoverReferences(tx),
          counts = await referenceCounts(tx, refs, ids);
        assertNoReferences(counts);
        assert.equal(current.length, 8);
        return current.map((row) => {
          const i = ids.indexOf(row.id);
          assert(i >= 0);
          const sha = valueDigest(row);
          assert(
            [
              manifest.rows[i].beforeSha256,
              manifest.rows[i].afterSha256,
            ].includes(sha),
            "Whole-row state changed",
          );
          return {
            id: row.id,
            state: sha === manifest.rows[i].beforeSha256 ? "before" : "after",
          };
        });
      });
      console.log(serialize({ mode, readOnly: true, result }));
      return;
    }
    assertCoordinatorWrite(
      process.argv.includes("--apply"),
      process.env.ALLOW_SHARED_IMPORT,
      process.env.MATH_QUESTION_FORMATS_WRITER,
    );
    const a = JSON.parse(committedBytes(ROOT, files.approval).toString());
    assert.equal(a.reviewer, "Claude");
    assert.equal(a.verdict, "approved");
    assert.equal(a.kind, manifest.kind);
    assert.equal(a.planSha256, QUESTION_FORMAT_PLAN_SHA);
    assert.equal(
      a.manifestSha256,
      digest(committedBytes(ROOT, files.manifest)),
    );
    assert.equal(
      a.beforeLedgerSha256,
      digest(committedBytes(ROOT, files.before)),
    );
    assert.equal(a.supplementalPlanSha256, manifest.supplementalPlanSha256);
    assert.equal(a.operatorSha256, manifest.operatorSha256);
    assert.equal(
      manifest.operatorSha256,
      digest(committedBytes(ROOT, OPERATOR)),
    );
    assert.equal(
      manifest.supplementalPlanSha256,
      digest(committedBytes(ROOT, PLAN)),
    );
    execFileSync(
      "git",
      ["merge-base", "--is-ancestor", manifest.sourceCommit, "HEAD"],
      { cwd: ROOT },
    );
    const result = await lockedMaintenance(db, async (tx, refs) => {
      const current = await readRows(tx, ids, [FAMILY]);
      assert.equal(current.length, 8);
      assertNoReferences(await referenceCounts(tx, refs, ids));
      const changes: DatabaseRow[] = [];
      for (const row of current) {
        const i = ids.indexOf(row.id);
        assert(i >= 0);
        const sha = valueDigest(row);
        assert(
          [
            manifest.rows[i].beforeSha256,
            manifest.rows[i].afterSha256,
          ].includes(sha),
          "Whole-row CAS mismatch",
        );
        if (sha === manifest.rows[i].beforeSha256) changes.push(row);
      }
      for (const row of changes) {
        const got = await updatePayloadCas(tx, row, corrected(row));
        assert.equal(
          valueDigest(got),
          manifest.rows[ids.indexOf(row.id)].afterSha256,
        );
      }
      const readback = await readRows(tx, ids, [FAMILY]);
      assert.equal(readback.length, 8);
      for (const row of readback)
        assert.equal(
          valueDigest(row),
          manifest.rows[ids.indexOf(row.id)].afterSha256,
        );
      return {
        mode,
        updated: changes.length,
        readback: 8,
        allOtherFieldsPreserved: true,
      };
    });
    journal(files, result);
    console.log(serialize(result));
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
