/** Scoped resume evidence. All database queries run in one READ ONLY transaction. */
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const dotenv = require("dotenv");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const args = process.argv.slice(2);
if (args.length !== 2 || args.some((arg) => arg.startsWith("--"))) {
  throw new Error("Usage: node capture-resume-bank.mjs <server-env-file> <new-output-json>");
}
const output = path.resolve(args[1]);
const relative = path.relative(process.cwd(), output);
if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
  throw new Error("Output must be a new file within this task worktree.");
}
const env = dotenv.parse(await readFile(path.resolve(args[0])));
if (!env.DATABASE_URL) throw new Error("Server environment has no DATABASE_URL.");
const index = await readJson(".qa-artifacts/exam-resume-20261008/continuation-index.json");
const names = [
  "exam-hold-pilot81-20261003.json",
  "exam-lock-gyeongsanyeo19-20261003.json",
  "exam-draft-review-bank-decide-20261003.json",
];
const ledgers = await Promise.all(names.map(async (name) => {
  const file = path.join("scripts/qa/reports/refresh-engine-content", name);
  const bytes = await readFile(file);
  return { path: file.replaceAll("\\", "/"), sha256: sha256(bytes), ...JSON.parse(bytes) };
}));
const protectedIds = [...new Set(ledgers.flatMap((ledger) => ledger.rows.map((row) => row.problemId)))];
const schools = ["범일중", "경구중", "경산중", "경상중", "경신중", "경암중", "동도중", "강동중", "경산여중", "정화중"];
const db = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } }, log: [] });
try {
  const evidence = await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    const clock = await tx.$queryRawUnsafe("SELECT current_timestamp::text AS captured_at, current_setting('transaction_read_only') AS transaction_read_only");
    // The shared generated client predates Unit.semester. Inspect the actual schema
    // without regenerating shared dependencies; absence remains explicit.
    const semesterColumn = await tx.$queryRawUnsafe("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='unit' AND column_name='semester'");
    const units = await tx.$queryRawUnsafe(`SELECT id,grade,chapter,section,
      ${semesterColumn.length ? "semester" : "NULL::smallint"} AS semester,
      order_index AS "orderIndex",problem_code_prefix AS "problemCodePrefix"
      FROM unit WHERE grade='중3' ORDER BY order_index`);
    const liveFamilies = await tx.$queryRawUnsafe(`
      SELECT p.unit_id, p.family_key, count(*)::int AS live_count
      FROM problem p JOIN unit u ON u.id=p.unit_id
      WHERE u.grade='중3' AND p.pool::text='shared'
        AND p.review_status::text='approved' AND p.direct_use_allowed=true
        AND btrim(p.answer)<>'' AND p.answer<>'(정답 없음)' AND p.family_key IS NOT NULL
      GROUP BY p.unit_id,p.family_key ORDER BY p.unit_id,p.family_key`);
    const exams = await tx.exam.findMany({
      where: { school: { in: schools }, level: "중", grade: 3, year: 2025, semester: 2, round: "중간" },
      select: { id: true, externalExamId: true, school: true, subject: true, year: true, semester: true, round: true, questionCount: true, sourceFile: true },
    });
    const bankGroups = await tx.problem.groupBy({
      by: ["school", "examId", "source", "reviewStatus", "directUseAllowed"],
      where: { school: { in: schools }, unit: { grade: "중3" } },
      _count: { _all: true },
    });
    const protectedRows = await tx.problem.findMany({
      where: { id: { in: protectedIds } },
      select: { id: true, externalId: true, directUseAllowed: true, reviewStatus: true, content: true, solution: true },
    });
    return { clock, semesterColumnPresent: semesterColumn.length > 0, units, liveFamilies, exams, bankGroups, protectedRows };
  }, { isolationLevel: "RepeatableRead", timeout: 90_000 });
  const protectedById = new Map(evidence.protectedRows.map((row) => [row.id, row]));
  const ledgerChecks = ledgers.map((ledger, i) => ({
    path: ledger.path, sha256: ledger.sha256, expectedRows: ledger.rows.length,
    rows: ledger.rows.map((expected) => {
      const row = protectedById.get(expected.problemId);
      return {
        problemId: expected.problemId, externalId: expected.externalId,
        found: !!row, identityMatches: row?.externalId === expected.externalId,
        directUseAllowed: row?.directUseAllowed ?? null,
        reviewStatus: row?.reviewStatus ?? null,
        ...(i === 2 ? { correctionsMatch: !!row && Object.entries(expected.after).every(([key, value]) => row[key] === value) } : {}),
      };
    }),
  }));
  const result = {
    version: 1, scope: "resume-setup-read-only-middle3-pilot-next5-and-protected82",
    capturedAt: evidence.clock[0].captured_at, transactionReadOnly: evidence.clock[0].transaction_read_only,
    isolation: "RepeatableRead", sourceSnapshotAt: index.bankSnapshotAt,
    livePredicate: "중3; pool=shared; review_status=approved; direct_use_allowed=true; btrim(answer)<>''; answer<>'(정답 없음)'; family_key IS NOT NULL",
    semesterColumnPresent: evidence.semesterColumnPresent,
    units: evidence.units, liveFamilies: evidence.liveFamilies,
    exactExamScope: { level: "중", grade: 3, year: 2025, semester: 2, round: "중간", schools },
    exams: evidence.exams,
    bankGroups: evidence.bankGroups.map(({ _count, ...row }) => ({ ...row, count: _count._all })),
    ledgerChecks,
    limitations: [
      "Scoped read, not a recount of all 1715 inventory jobs.",
      "School bank groups may include other exam periods; exact dedup also needs exam identity, source hashes and content.",
      "Live family presence is not a semantic assignment or generator coverage approval.",
      "No original answers/solutions, credentials, student records or user records are exported.",
    ],
  };
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ capturedAt: result.capturedAt, readOnly: result.transactionReadOnly, units: result.units.length, liveFamilies: result.liveFamilies.length, exactExams: result.exams.length, protectedFound: protectedById.size, ledgerChecks: ledgerChecks.map((ledger) => ({ path: ledger.path, missing: ledger.rows.filter((r) => !r.found).length, unlocked: ledger.rows.filter((r) => r.directUseAllowed === true).length, correctionsMismatch: ledger.rows.filter((r) => r.correctionsMatch === false).length })) }));
} catch (error) {
  // Connection errors can contain credentials or server addresses. Export only the code.
  console.error(JSON.stringify({ status: "read-failed", code: typeof error?.code === "string" ? error.code : "unclassified", latestBankVerified: false }));
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
