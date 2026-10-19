/** Middle3 classification evidence only; no automatic assignment or DB writer.
 * node --env-file=<private-env> scripts/qa/capture-exam-family-snapshot.mjs <NEW-output.json>
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
import { newOutputPath, readJson, sha256 } from "../import/exam-twin/candidatePack.mjs";

assert.equal(process.argv.length, 3, "Exactly one new output path; no mutation flags");
const output = newOutputPath(process.argv[2]);
const priorPath = ".qa-artifacts/exam-resume-20261008/bank-read-fresh-r3-20261008.json";
const prior = readJson(priorPath);
const client = new PrismaClient({ log: [] });
try {
  const snapshot = await client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    const [mode] = await tx.$queryRawUnsafe("SELECT current_timestamp::text AS captured_at, current_setting('transaction_read_only') AS read_only");
    assert.equal(mode.read_only, "on");
    const units = await tx.$queryRawUnsafe('SELECT id,grade,chapter,section,semester,order_index AS "orderIndex",problem_code_prefix AS "problemCodePrefix" FROM unit WHERE grade=$1 ORDER BY order_index', "중3");
    const liveFamilies = await tx.$queryRawUnsafe(`SELECT p.unit_id,p.family_key,f.family_code,count(*)::int AS live_count
      FROM problem p JOIN unit u ON u.id=p.unit_id
      LEFT JOIN problem_family f ON f.unit_id=p.unit_id AND f.family_key=p.family_key
      WHERE u.grade=$1 AND p.pool='shared' AND p.review_status='approved' AND p.direct_use_allowed=true
        AND p.family_key IS NOT NULL AND btrim(p.answer)<>'' AND p.answer<>$2
      GROUP BY p.unit_id,p.family_key,f.family_code ORDER BY p.unit_id,p.family_key`, "중3", "(정답 없음)");
    assert(units.length > 0);
    const ids = new Set(units.map((u) => u.id));
    for (const family of liveFamilies) assert(ids.has(family.unit_id) && family.live_count > 0);
    const key = (f) => `${f.unit_id}/${f.family_key}`;
    const oldKeys = new Set(prior.liveFamilies.map(key)), newKeys = new Set(liveFamilies.map(key));
    return {
      kind: "exam-live-family-observation/v1", capturedAt: mode.captured_at,
      readOnly: true, isolation: "RepeatableRead", grade: "중3",
      prior: { path: priorPath, sha256: sha256(fs.readFileSync(priorPath)) },
      livePredicate: "중3; shared; approved; direct_use_allowed=true; nonblank/non-sentinel answer; nonnull family",
      predicateScope: "Explicit nonblank subset of current eligible bank rows; no eligibility rules changed",
      units, liveFamilies,
      changes: { added: liveFamilies.filter((f) => !oldKeys.has(key(f))), removed: prior.liveFamilies.filter((f) => !newKeys.has(key(f))) },
      limitations: ["Eligible example counts are not semantic family fit, grade evidence or rights clearance", "A missing family_code remains unresolved", "No question text, answers or student records captured", "No automatic candidate metadata changes"],
      dbWrites: 0, automaticAssignments: 0,
    };
  }, { isolationLevel: "RepeatableRead", maxWait: 10000, timeout: 30000 });
  fs.writeFileSync(output, JSON.stringify(snapshot, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ capturedAt: snapshot.capturedAt, units: snapshot.units.length, liveFamilies: snapshot.liveFamilies.length, added: snapshot.changes.added.length, removed: snapshot.changes.removed.length, dbWrites: 0, automaticAssignments: 0 }));
} catch (error) {
  console.error(JSON.stringify({ readFailed: true, code: error.code ?? error.name, credentialsNotPrinted: true, dbWrites: 0 }));
  process.exitCode = 1;
} finally {
  await client.$disconnect();
}
