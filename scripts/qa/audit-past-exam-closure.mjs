/** Read-only current closure/ancestry audit. No apply/unlock/delete mode exists.
 * node --env-file=<private-env> scripts/qa/audit-past-exam-closure.mjs <NEW-report.json>
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
import {
  newOutputPath,
  readJson,
  sha256,
} from "../import/exam-twin/candidatePack.mjs";

assert.equal(
  process.argv.length,
  3,
  "Exactly one NEW output path is required; no mutation flags exist",
);
const output = newOutputPath(process.argv[2]);
const previous = readJson(
  ".qa-artifacts/exam-resume-20261008/bank-read-20261008.json",
);
const ledgers = previous.ledgerChecks.map((row) => {
  assert.equal(
    sha256(fs.readFileSync(row.path)),
    row.sha256,
    "Protected ledger changed",
  );
  return { path: row.path, sha256: row.sha256, ledger: readJson(row.path) };
});
const protectedIds = [
  ...new Set(ledgers.flatMap((row) => row.ledger.rows.map((r) => r.problemId))),
];
assert.equal(protectedIds.length, 82);
const client = new PrismaClient({ log: [] });
try {
  const report = await client.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      const [settings] = await tx.$queryRawUnsafe(
        "SELECT current_timestamp::text AS captured_at, current_setting('transaction_read_only') AS read_only",
      );
      assert.equal(settings.read_only, "on");
      const originals = await tx.$queryRawUnsafe(
        "SELECT id,external_id,review_status::text AS review_status,direct_use_allowed FROM problem WHERE source='past_exam' ORDER BY id",
      );
      const descendants = await tx.$queryRawUnsafe(`WITH RECURSIVE ancestry AS (
      SELECT id AS descendant_id,id AS ancestor_id,origin_problem_id,source::text AS source,0 AS depth,ARRAY[id] AS path
      FROM problem WHERE source='transformed'
      UNION ALL
      SELECT a.descendant_id,p.id,p.origin_problem_id,p.source::text,a.depth+1,a.path||p.id
      FROM ancestry a JOIN problem p ON p.id=a.origin_problem_id
      WHERE a.depth<8 AND NOT p.id=ANY(a.path)
    ) SELECT p.id,p.external_id,p.review_status::text AS review_status,p.direct_use_allowed,
      min(a.depth) FILTER (WHERE a.source='past_exam') AS past_exam_depth
    FROM ancestry a JOIN problem p ON p.id=a.descendant_id
    GROUP BY p.id HAVING bool_or(a.source='past_exam') ORDER BY p.id`);
      const protectedRows = await tx.problem.findMany({
        where: { id: { in: protectedIds } },
        select: {
          id: true,
          externalId: true,
          directUseAllowed: true,
          reviewStatus: true,
          content: true,
          solution: true,
        },
      });
      assert.equal(protectedRows.length, 82);
      assert.equal(protectedRows.filter((r) => r.directUseAllowed).length, 0);
      const byId = new Map(protectedRows.map((r) => [r.id, r]));
      for (const { ledger } of ledgers)
        for (const row of ledger.rows) {
          const current = byId.get(row.problemId);
          assert.equal(current?.externalId, row.externalId);
          if (row.after)
            for (const key of Object.keys(row.after))
              assert.equal(current[key], row.after[key]);
        }
      return {
        kind: "current-past-exam-and-derived-closure/v1",
        capturedAt: settings.captured_at,
        readOnly: true,
        isolation: "RepeatableRead",
        ancestryDepthLimit: 8,
        originals,
        descendants,
        originalCount: originals.length,
        originalsDirectUseAllowed: originals.filter((r) => r.direct_use_allowed)
          .length,
        descendantsCount: descendants.length,
        descendantsDirectUseAllowed: descendants.filter(
          (r) => r.direct_use_allowed,
        ).length,
        protected82: {
          allClosed: true,
          correctionFieldsUnchanged: true,
          ledgers: ledgers.map(({ path, sha256 }) => ({ path, sha256 })),
        },
        rightsApproval: false,
        delete: false,
        reload: false,
        unlock: false,
        dbWrites: 0,
      };
    },
    { isolationLevel: "RepeatableRead", maxWait: 10000, timeout: 60000 },
  );
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n", {
    flag: "wx",
  });
  console.log(
    JSON.stringify({
      capturedAt: report.capturedAt,
      originalCount: report.originalCount,
      originalsDirectUseAllowed: report.originalsDirectUseAllowed,
      descendantsCount: report.descendantsCount,
      descendantsDirectUseAllowed: report.descendantsDirectUseAllowed,
      protected82Unchanged: true,
      dbWrites: 0,
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      operation: "read-only closure audit",
      code: error.code ?? error.name,
      sqlState: error.meta?.code,
      credentialsNotPrinted: true,
      dbWrites: 0,
    }),
  );
  process.exitCode = 1;
} finally {
  await client.$disconnect();
}
