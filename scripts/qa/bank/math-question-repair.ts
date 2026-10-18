/** Root-only 17-row repair operator. Default is a READ ONLY preparation transaction.
 * node --env-file=/absolute/path/to/main/.env --import tsx scripts/qa/bank/math-question-repair.ts prepare
 * Root, after separate committed Claude content approval:
 * ALLOW_SHARED_IMPORT=1 MATH_QUESTION_FORMATS_WRITER=coordinator ... apply --apply
 * Never implicitly loads .env, refreshes another family, changes IDs/codes, or retries a write.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  REPAIR_PREFLIGHT,
  REPAIR_SOURCE_FILES,
  buildRepairs,
  executeRepairs,
  independentlyVerifyRepairs,
  repairEntries,
  type RepairBeforeLedger,
  type RepairManifest,
} from "../../import/question-content-repair";
import {
  QUESTION_FORMAT_PLAN,
  QUESTION_FORMAT_PLAN_SHA,
  assertNoReferences,
  digest,
  discoverReferences,
  payloadDigest,
  payloadOf,
  readRows,
  readonlyMaintenance,
  referenceCounts,
  sourceDigests,
  stableJson,
  valueDigest,
  type ApprovalFiles,
} from "../../import/protected-question-maintenance";

const repoDir = path.resolve(__dirname, "../../..");
const args = process.argv.slice(2);
const mode = args[0] ?? "prepare";
if (!["prepare", "verify", "apply", "revert"].includes(mode))
  throw new Error("Unknown repair command");
const outIndex = args.indexOf("--out-dir");
const folder =
  outIndex >= 0
    ? args[outIndex + 1]!
    : "docs/planning/tracks/reports/math-question-formats-20261018/content-repair-r2";
if (!folder || path.isAbsolute(folder) || folder.startsWith(".."))
  throw new Error("Output directory must be repository-relative");
const files: ApprovalFiles = {
  repoDir,
  manifest: `${folder}/manifest.json`,
  before: `${folder}/before-ledger.json`,
  approval: `${folder}/claude-content-approval.json`,
  journal: `${folder}/results.jsonl`,
};
const privateDir = path.resolve(
  repoDir,
  ".qa-artifacts/math-question-formats-20261018/content-repair-r2",
);
const privateBefore = path.join(privateDir, "before-private.json");
const privateCandidates = path.join(privateDir, "candidates-private.json");
const read = <T>(file: string) =>
  JSON.parse(readFileSync(path.resolve(repoDir, file), "utf8")) as T;
const serialize = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
const save = (file: string, value: unknown) =>
  writeFileSync(path.resolve(repoDir, file), serialize(value), {
    flag: "wx",
    mode: 0o600,
  });

async function main() {
  if (
    digest(readFileSync(path.resolve(repoDir, QUESTION_FORMAT_PLAN))) !==
    QUESTION_FORMAT_PLAN_SHA
  )
    throw new Error("Approved plan SHA mismatch");
  const prisma = new PrismaClient({ log: [] });
  try {
    if (mode === "prepare") {
      const baseline = read<{ rows: { id: string }[] }>(REPAIR_PREFLIGHT);
      const before = await readonlyMaintenance(prisma, async (tx) => {
        const rows = await readRows(
          tx,
          baseline.rows.map((row) => row.id),
        );
        const references = await discoverReferences(tx);
        const counts = await referenceCounts(
          tx,
          references,
          rows.map((row) => row.id),
        );
        assertNoReferences(counts);
        return {
          at: new Date().toISOString(),
          readOnly: true,
          rows,
          references,
          counts,
        };
      });
      const rows = await buildRepairs(before.rows, repoDir);
      const proof = independentlyVerifyRepairs(rows, repoDir);
      const privateBeforeBytes = serialize(before.rows);
      const privateCandidateBytes = serialize(rows);
      const manifest: RepairManifest = {
        version: 1,
        kind: "17-row-content-repair",
        planSha256: QUESTION_FORMAT_PLAN_SHA,
        sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
          cwd: repoDir,
          encoding: "utf8",
        }).trim(),
        sourceDigests: sourceDigests(repoDir, REPAIR_SOURCE_FILES),
        rows: repairEntries(rows),
        independentProofSha256: digest(JSON.stringify(proof)),
        privateCandidatesSha256: digest(privateCandidateBytes),
      };
      const ledger: RepairBeforeLedger = {
        version: 1,
        kind: "17-row-repair-before",
        manifestSha256: digest(serialize(manifest)),
        privateBeforeSha256: digest(privateBeforeBytes),
        rows: before.rows.map((row) => ({
          id: row.id,
          fullRowSha256: valueDigest(row),
          payloadSha256: payloadDigest(payloadOf(row)),
        })),
      };
      mkdirSync(path.resolve(repoDir, folder), { recursive: true });
      mkdirSync(privateDir, { recursive: true });
      writeFileSync(privateBefore, privateBeforeBytes, {
        flag: "wx",
        mode: 0o600,
      });
      writeFileSync(privateCandidates, privateCandidateBytes, {
        flag: "wx",
        mode: 0o600,
      });
      save(files.manifest, manifest);
      save(files.before, ledger);
      save(`${folder}/coordinate-verification.json`, proof);
      save(`${folder}/preparation.json`, {
        at: before.at,
        readOnly: true,
        rows: rows.length,
        families: new Set(rows.map((row) => row.familyKey)).size,
        baselinePreflightSha256: digest(
          readFileSync(path.resolve(repoDir, REPAIR_PREFLIGHT)),
        ),
        manifestSha256: digest(serialize(manifest)),
        beforeLedgerSha256: digest(serialize(ledger)),
        sourceCommit: manifest.sourceCommit,
        sourceDigests: manifest.sourceDigests,
        referenceColumns: before.references,
        referenceCounts: before.counts,
        referencedRows: 0,
        allIdsCodesExternalIdsAndAnswerPositionsPreserved: true,
        actualSvgIndependentVerification: true,
        sharedDatabaseWrites: 0,
        physicalPrinterVerified: false,
      });
      console.log(
        JSON.stringify({
          mode,
          rows: rows.length,
          referencedRows: 0,
          manifestSha256: digest(serialize(manifest)),
          sharedDatabaseWrites: 0,
        }),
      );
      return;
    }
    const manifest = read<RepairManifest>(files.manifest);
    const before = read<RepairBeforeLedger>(files.before);
    if (mode === "verify") {
      const rows = await buildRepairs(read(privateBefore), repoDir);
      if (stableJson(repairEntries(rows)) !== stableJson(manifest.rows))
        throw new Error("Frozen regeneration mismatch");
      independentlyVerifyRepairs(rows, repoDir);
      const result = await readonlyMaintenance(prisma, async (tx) => {
        const current = await readRows(
          tx,
          rows.map((row) => row.id),
        );
        const refs = await discoverReferences(tx);
        const references = await referenceCounts(
          tx,
          refs,
          rows.map((row) => row.id),
        );
        return {
          readOnly: true,
          rows: current.length,
          references,
          currentPayloads: current.map((row) => ({
            id: row.id,
            sha256: payloadDigest(payloadOf(row)),
          })),
        };
      });
      console.log(JSON.stringify(result));
      return;
    }
    console.log(
      JSON.stringify(
        await executeRepairs(
          {
            files,
            manifest,
            before,
            privateBeforeBytes: readFileSync(privateBefore),
            privateCandidateBytes: readFileSync(privateCandidates),
            mode: mode as "apply" | "revert",
            apply: args.includes("--apply"),
            allowSharedImport: process.env.ALLOW_SHARED_IMPORT,
            writer: process.env.MATH_QUESTION_FORMATS_WRITER,
          },
          prisma,
        ),
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
