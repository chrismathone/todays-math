/** Scoped read-only observation; never a writer, load authorization or global dedup. */
import assert from "node:assert/strict";
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
import { newOutputPath, readJson, sha256 } from "../../scripts/import/exam-twin/candidatePack.mjs";

for (const env of [".env", ".env.local"]) if (fs.existsSync(env)) process.loadEnvFile(env);
const previous = readJson(".qa-artifacts/exam-resume-20261008/bank-read-20261008.json");
const ledgerPaths = previous.ledgerChecks.map((l) => l.path);
const ledgers = ledgerPaths.map((file) => ({ file, sha256: sha256(fs.readFileSync(file)), ledger: readJson(file) }));
const ids = [...new Set(ledgers.flatMap((l) => l.ledger.rows.map((r) => r.problemId)))];
const client = new PrismaClient({ log: [] });
try {
  const observed = await client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    const [settings] = await tx.$queryRawUnsafe("SELECT current_timestamp::text AS captured_at, current_setting('transaction_read_only') AS read_only, current_setting('transaction_isolation') AS isolation");
    assert.equal(settings.read_only, "on");
    // Installed shared generated client predates Unit.semester. Read current columns
    // with parameterized SELECT instead of regenerating/mutating shared dependencies.
    const units = await tx.$queryRawUnsafe('SELECT id, grade, chapter, section, semester, order_index AS "orderIndex", problem_code_prefix AS "problemCodePrefix" FROM unit WHERE grade=$1 ORDER BY order_index', previous.units[0].grade);
    const liveFamilies = await tx.$queryRawUnsafe("SELECT p.unit_id, p.family_key, count(*)::integer AS live_count FROM problem p JOIN unit u ON u.id=p.unit_id WHERE u.grade=$1 AND p.pool='shared' AND p.review_status='approved' AND p.direct_use_allowed=true AND p.family_key IS NOT NULL AND btrim(p.answer)<>'' AND p.answer<>$2 GROUP BY p.unit_id,p.family_key ORDER BY p.unit_id,p.family_key", previous.units[0].grade, "(정답 없음)");
    const scope = { ...previous.exactExamScope, schools: [...previous.exactExamScope.schools, "\uacbd\uc77c\uc5ec\uc911", "\uacc4\uc131\uc911", "\ub178\ubcc0\uc911"] };
    const exams = await tx.exam.findMany({ where: { level: scope.level, grade: scope.grade, year: scope.year, semester: scope.semester, round: scope.round, school: { in: scope.schools } }, select: { id: true, externalExamId: true, school: true, subject: true, year: true, semester: true, round: true, sourceFile: true, _count: { select: { questions: true } } } });
    const protectedRows = await tx.problem.findMany({ where: { id: { in: ids } }, select: { id: true, externalId: true, directUseAllowed: true, reviewStatus: true, content: true, solution: true } });
    const byId = new Map(protectedRows.map((r) => [r.id, r]));
    const ledgerChecks = ledgers.map((l) => ({ path: l.file, sha256: l.sha256, expectedRows: l.ledger.rows.length, rows: l.ledger.rows.map((old) => {
      const row = byId.get(old.problemId);
      return { problemId: old.problemId, externalId: old.externalId, found: Boolean(row), identityMatches: row?.externalId === old.externalId, directUseAllowed: row?.directUseAllowed ?? null, reviewStatus: row?.reviewStatus ?? null, ...(old.after ? { correctionFields: Object.keys(old.after).map((field) => ({ field, matches: row?.[field] === old.after[field], expectedSha256: sha256(String(old.after[field])), observedSha256: row ? sha256(String(row[field])) : null })) } : {}) };
    }) }));
    return { kind: "scoped-live-bank-reread/v3", capturedAt: settings.captured_at, transactionReadOnly: settings.read_only, isolation: settings.isolation, priorObservation: { path: ".qa-artifacts/exam-resume-20261008/bank-read-20261008.json", sha256: sha256(fs.readFileSync(".qa-artifacts/exam-resume-20261008/bank-read-20261008.json")) }, livePredicate: previous.livePredicate, installedClientSemesterField: "missing; parameterized SELECT used, no generate/install", units, liveFamilies, exactExamScope: scope, exams, ledgerChecks, protectedRowCount: protectedRows.length, unlocked: protectedRows.filter((r) => r.directUseAllowed).length, identityMismatches: ledgerChecks.flatMap((l) => l.rows).filter((r) => !r.identityMatches).length, correctionMismatches: ledgerChecks.flatMap((l) => l.rows).flatMap((r) => r.correctionFields ?? []).filter((r) => !r.matches).length, productionWrites: 0, limitations: ["Only exact2025 middle3 semester2 mid scope; no global/content duplicate claim", "Live family count proves eligible rows exist, not semantic/grade fit", "Reader observed protected flags only; no unlock/fix/load authorization"] };
  }, { isolationLevel: "RepeatableRead", maxWait: 10000, timeout: 30000 });
  const out = newOutputPath(".qa-artifacts/exam-resume-20261008/bank-read-fresh-r3-20261008.json");
  fs.writeFileSync(out, JSON.stringify(observed, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ capturedAt: observed.capturedAt, readOnly: observed.transactionReadOnly, units: observed.units.length, families: observed.liveFamilies.length, scopedExams: observed.exams.length, protected: observed.protectedRowCount, unlocked: observed.unlocked, identityMismatches: observed.identityMismatches, correctionMismatches: observed.correctionMismatches, writes: 0 }));
} catch (error) {
  console.error(JSON.stringify({ databaseReadFailed: true, code: error.code ?? error.name, validation: String(error.message).split("\n").filter((line) => /Unknown argument|Unknown field|Invalid value|Expected|Available options/.test(line)).map((line) => line.replace(/https?:\/\/\S+/g, "[url omitted]")), credentialsNotPrinted: true, noWritesAttempted: true }));
  process.exitCode = 1;
} finally {
  await client.$disconnect();
}
