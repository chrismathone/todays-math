/** New <=96 content/<=174 row existing-family operator. Default prepare is READ ONLY.
 * Run with node --env-file=/absolute/main/.env --import tsx; env values are never logged.
 * Root must reprepare full scope after 17 repairs + DDL + backfill, then obtain a new
 * exact Claude Gate 2 approval, before apply --apply with both explicit writer gates.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  boundedTargets,
  candidateEntries,
  census,
  contractsFor,
  executeBounded,
  generateRequests,
  newUuidLedger,
  prepareBoundedCandidates,
  readBoundedScope,
  validateFrozenScope,
  type BoundedManifest,
  type Candidate,
  type ScopeLedger,
  type UuidLedger,
} from "../../import/bounded-question-reinforcement";
import { type UnitIdentity } from "../../import/verified-engine-batch";
import {
  QUESTION_FORMAT_PLAN,
  QUESTION_FORMAT_PLAN_SHA,
  digest,
  readonlyMaintenance,
  sourceDigests,
  stableJson,
  valueDigest,
  type ApprovalFiles,
  type DatabaseRow,
} from "../../import/protected-question-maintenance";

const repoDir = path.resolve(__dirname, "../../..");
const args = process.argv.slice(2),
  mode = args[0] ?? "prepare";
if (!["inspect", "prepare", "verify", "apply", "revert"].includes(mode))
  throw new Error("Unknown bounded command");
const option = (name: string, fallback: string) =>
  args.includes(name) ? args[args.indexOf(name) + 1]! : fallback;
const folder = option(
  "--out-dir",
  "docs/planning/tracks/reports/math-question-formats-20261018/bounded-reinforcement",
);
const privateDir = option(
  "--private-dir",
  `.qa-artifacts/math-question-formats-20261018/${mode === "inspect" ? "bounded-inspect" : "bounded-preparation"}`,
);
for (const dir of [folder, privateDir])
  if (!dir || path.isAbsolute(dir) || dir.startsWith(".."))
    throw new Error("Artifact paths must be repository-relative");
const files: ApprovalFiles = {
  repoDir,
  manifest: `${folder}/manifest.json`,
  before: `${folder}/before-ledger.json`,
  prewrite: `${folder}/new-uuids.json`,
  approval: `${folder}/claude-candidate-approval.json`,
  journal: `${folder}/results.jsonl`,
};
const privateBefore = path.resolve(repoDir, privateDir, "before-private.json"),
  privateCandidates = path.resolve(
    repoDir,
    privateDir,
    "candidates-private.json",
  );
const serialize = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
const save = (file: string, value: unknown) =>
  writeFileSync(path.resolve(repoDir, file), serialize(value), {
    flag: "wx",
    mode: 0o600,
  });
const read = <T>(file: string) =>
  JSON.parse(readFileSync(path.resolve(repoDir, file), "utf8")) as T;
async function main() {
  if (
    digest(readFileSync(path.resolve(repoDir, QUESTION_FORMAT_PLAN))) !==
    QUESTION_FORMAT_PLAN_SHA
  )
    throw new Error("Approved plan SHA mismatch");
  const targets = boundedTargets(repoDir),
    unitIds = [...new Set(targets.map((target) => target.unitId))].sort();
  const prisma = new PrismaClient({ log: [] });
  try {
    const units = await readonlyMaintenance(prisma, (tx) =>
      tx.$queryRawUnsafe<UnitIdentity[]>(
        "SELECT id::text AS id,grade,chapter,section FROM public.unit WHERE id::text=ANY($1::text[]) ORDER BY id",
        unitIds,
      ),
    );
    if (units.length !== unitIds.length)
      throw new Error("Missing target unit identities");
    if (mode === "inspect" || mode === "prepare") {
      const scope = await readonlyMaintenance(prisma, (tx) =>
        readBoundedScope(tx, unitIds),
      );
      const finalAfterBackfill = args.includes("--final-after-backfill");
      if (
        finalAfterBackfill &&
        scope.some((row) => !("question_group_key" in row))
      )
        throw new Error("Final freeze requires the applied identity DDL");
      if (finalAfterBackfill) {
        const { dbPairRow, questionGroups } =
          await import("../../import/bounded-question-reinforcement");
        const { proveQuestionPair } =
          await import("../../../src/lib/problem/questionPairProof");
        for (const target of targets)
          for (const group of questionGroups(
            scope
              .filter(
                (row) =>
                  row.unit_id === target.unitId &&
                  row.family_key === target.familyKey &&
                  row.pool === "shared" &&
                  row.review_status === "approved" &&
                  row.direct_use_allowed === true,
              )
              .map(dbPairRow),
          )) {
            const proof = proveQuestionPair(group);
            if (
              proof.ok &&
              group.some((row) => row.questionGroupKey !== proof.key)
            )
              throw new Error(
                "Final target-family pair keys require completed backfill first",
              );
          }
      }
      const at = new Date().toISOString();
      const result = await prepareBoundedCandidates(targets, scope, units);
      const regenerated = await generateRequests(
        result.requests,
        units,
        targets,
      );
      if (stableJson(regenerated) !== stableJson(result.rows))
        throw new Error("Exact generation reproducibility failed");
      mkdirSync(path.resolve(repoDir, privateDir), { recursive: true });
      save(privateBefore, scope);
      save(privateCandidates, result.rows);
      save(`${privateDir}/generation-private.json`, {
        at,
        units,
        targets,
        ...result,
      });
      const total = {
        at,
        readOnly: true,
        families: targets.length,
        scopeRows: scope.length,
        units: units.length,
        newContents: result.contracts.length,
        newRows: result.rows.length,
        byContract: result.contracts.reduce(
          (out, row) => {
            out[row.contract] = (out[row.contract] ?? 0) + 1;
            return out;
          },
          {} as Record<string, number>,
        ),
        shortfalls: result.shortfalls,
        sharedDatabaseWrites: 0,
      };
      if (mode === "inspect") {
        save(`${privateDir}/summary.json`, total);
        console.log(JSON.stringify(total));
        return;
      }
      const { verifyCandidateTasks, finiteDomainShortfallEvidence } =
        await import("./verify-question-reinforcement");
      const verification = await verifyCandidateTasks(result.rows, targets);
      const sourceFiles = execFileSync(
        "git",
        [
          "ls-files",
          "src/lib/elementary",
          "src/lib/middle",
          "src/lib/engine",
          "src/lib/figure",
          "src/lib/problem/questionPairProof.ts",
          "src/lib/problemEligibility.ts",
          "src/lib/problemPool.ts",
          "src/lib/generator/familyAliases.ts",
          "scripts/figure",
          "vendor/figure-engine",
          "scripts/import/load-engine-problems.ts",
          "scripts/import/verified-engine-batch.ts",
        ],
        { cwd: repoDir, encoding: "utf8" },
      )
        .trim()
        .split("\n");
      sourceFiles.push(
        "scripts/import/protected-question-maintenance.ts",
        "scripts/import/bounded-question-reinforcement.ts",
        "scripts/qa/bank/math-question-reinforcement.ts",
        "scripts/qa/bank/verify-question-reinforcement.ts",
        "docs/planning/tracks/reports/math-bank-reinforcement-20261018/m3-independent.ts",
        "src/__tests__/unit/elementaryReinforcement20261018.test.tsx",
        "src/__tests__/unit/nativeDescriptive20261018.test.ts",
        "prisma/seed-data/units.ts",
        "src/contracts/nativeDescriptive.contract.ts",
        "src/contracts/difficulty.ts",
      );
      const manifest: BoundedManifest = {
        version: 1,
        kind: "bounded-family-reinforcement",
        planSha256: QUESTION_FORMAT_PLAN_SHA,
        baselineStage: finalAfterBackfill
          ? "final-after-backfill"
          : "review-before-backfill",
        sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
          cwd: repoDir,
          encoding: "utf8",
        }).trim(),
        sourceDigests: sourceDigests(repoDir, sourceFiles),
        targets,
        requests: result.requests,
        rows: candidateEntries(result.rows),
        contents: contractsFor(result.rows, targets),
        beforeCensus: result.before,
        expectedAfterCensus: result.after,
        shortfalls: result.shortfalls,
        privateCandidatesSha256: digest(serialize(result.rows)),
        independentVerificationSha256: digest(serialize(verification)),
      };
      const manifestSha256 = digest(serialize(manifest));
      const before: ScopeLedger = {
        version: 1,
        kind: "bounded-family-before",
        manifestSha256,
        unitIds,
        privateBeforeSha256: digest(serialize(scope)),
        rows: scope.map((row) => ({
          id: row.id,
          fullRowSha256: valueDigest(row),
        })),
      };
      mkdirSync(path.resolve(repoDir, folder), { recursive: true });
      save(files.manifest, manifest);
      save(files.before, before);
      save(files.prewrite!, newUuidLedger(manifestSha256, result.rows));
      save(`${folder}/independent-verification.json`, verification);
      save(
        `${folder}/finite-shortfall-evidence.json`,
        finiteDomainShortfallEvidence(scope, targets),
      );
      save(`${folder}/preparation.json`, {
        ...total,
        manifestSha256,
        beforeLedgerSha256: digest(serialize(before)),
        prewriteSha256: digest(
          readFileSync(path.resolve(repoDir, files.prewrite!)),
        ),
        privateBeforeSha256: before.privateBeforeSha256,
        privateCandidatesSha256: manifest.privateCandidatesSha256,
        sourceCommit: manifest.sourceCommit,
        sourceDigestsSha256: valueDigest(manifest.sourceDigests),
        finalBeforeLedgerMustBeRepreparedAfterBackfill: !finalAfterBackfill,
        physicalPrinterVerified: false,
      });
      console.log(JSON.stringify({ ...total, manifestSha256 }));
      return;
    }
    const manifest = read<BoundedManifest>(files.manifest),
      before = read<ScopeLedger>(files.before),
      uuids = read<UuidLedger>(files.prewrite!);
    if (mode === "verify") {
      const rows = await generateRequests(
        manifest.requests,
        units,
        manifest.targets,
      );
      if (
        stableJson(candidateEntries(rows)) !== stableJson(manifest.rows) ||
        stableJson(rows) !== stableJson(read<Candidate[]>(privateCandidates))
      )
        throw new Error("Frozen bounded regeneration differs");
      const { verifyCandidateTasks } =
        await import("./verify-question-reinforcement");
      const proof = await verifyCandidateTasks(rows, manifest.targets);
      if (digest(serialize(proof)) !== manifest.independentVerificationSha256)
        throw new Error("Independent solver verification mismatch");
      const scope = await readonlyMaintenance(prisma, (tx) =>
        readBoundedScope(
          tx,
          unitIds,
          uuids.rows.map((row) => row.id),
          rows.map((row) => row.externalId),
        ),
      );
      if (
        digest(readFileSync(privateBefore)) !== before.privateBeforeSha256 ||
        digest(readFileSync(privateCandidates)) !==
          manifest.privateCandidatesSha256
      )
        throw new Error("Private baseline/candidate SHA mismatch");
      validateFrozenScope(
        read<DatabaseRow[]>(privateBefore),
        scope,
        rows,
        uuids,
      );
      const actualOwned = scope.filter((row) =>
        uuids.rows.some((owned) => owned.id === row.id),
      );
      const currentCensus = census(manifest.targets, scope);
      const state =
        actualOwned.length === 0
          ? "not-applied"
          : actualOwned.length === rows.length
            ? "applied"
            : "partial";
      if (
        state === "applied" &&
        stableJson(currentCensus) !== stableJson(manifest.expectedAfterCensus)
      )
        throw new Error(
          "Applied actual-task census differs from frozen expected result",
        );
      console.log(
        JSON.stringify({
          readOnly: true,
          rows: rows.length,
          contents: manifest.contents.length,
          state,
          baselineUnchanged:
            stableJson(scope) ===
            stableJson(read<DatabaseRow[]>(privateBefore)),
          currentCensus,
          ownedReadback: actualOwned.map((row) => ({
            id: row.id,
            externalId: row.external_id,
            problemCode: row.problem_code,
            fullRowSha256: valueDigest(row),
          })),
          sharedDatabaseWrites: 0,
        }),
      );
      return;
    }
    console.log(
      JSON.stringify(
        await executeBounded(
          {
            files,
            manifest,
            before,
            uuids,
            privateBeforeBytes: readFileSync(privateBefore),
            privateCandidateBytes: readFileSync(privateCandidates),
            units,
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
