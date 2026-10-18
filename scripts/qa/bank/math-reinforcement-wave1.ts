/** Root-only operator for the approved 2026-10-18 first wave. Default is read-only preparation.
 * npx tsx --env-file=<local env> scripts/qa/bank/math-reinforcement-wave1.ts prepare
 * ALLOW_SHARED_IMPORT=1 ... apply --apply (requires committed Claude final approval).
 * No implicit retry, global refresh, or delete. Revert uses this exact batch's ownership ledger.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import type { Plan } from "../../import/load-engine-problems";
import {
  APPROVED_REINFORCEMENT_PLAN_SHA256,
  buildVerifiedCandidates,
  createPrismaVerifiedBatchStore,
  executeVerifiedBatch,
  manifestEntries,
  payloadSha256,
  preparePrewriteLedger,
  serializeManifest,
  sha256,
  writePreparedBatch,
  type BatchFiles,
  type StoredCandidate,
} from "../../import/verified-engine-batch";
import { parseProblemContent } from "../../../src/lib/problem/parseProblemContent";
import { problemEligibleWhere } from "../../../src/lib/problemEligibility";

const repoDir = resolve(__dirname, "../../..");
const folder = "docs/planning/tracks/reports/math-bank-reinforcement-20261018";
const files: BatchFiles = {
  repoDir,
  manifestPath: `${folder}/wave1-r3-manifest.json`,
  prewritePath: `${folder}/wave1-r3-prewrite.json`,
  approvalPath: `${folder}/claude-final-batch-approval.json`,
  planPath: "docs/planning/tracks/math-bank-reinforcement-20261018.md",
  resultJournalPath: `${folder}/wave1-results.jsonl`,
};
const read = <T>(name: string) =>
  JSON.parse(readFileSync(resolve(repoDir, folder, name), "utf8")) as T;
const save = (name: string, value: unknown) =>
  writeFileSync(
    resolve(repoDir, folder, name),
    `${JSON.stringify(value, null, 2)}\n`,
    { flag: "wx" },
  );
const plans = read<Plan[]>("wave1-inputs.json");
const baseline = read<{ targetDetails: { id: string }[] }>("before.json");
const ids = baseline.targetDetails.map((u) => u.id);
if (ids.length !== 8 || plans.length !== 3)
  throw new Error("Unexpected wave1 scope");
const command = process.argv[2] ?? "prepare";
if (!["prepare", "verify", "apply", "revert"].includes(command))
  throw new Error("Unknown command");
const prisma = new PrismaClient({ log: [] });

async function main() {
  const units = await prisma.unit.findMany({
    where: { id: { in: ids } },
    select: { id: true, grade: true, chapter: true, section: true },
  });
  if (units.length !== 8) throw new Error("Missing target units");
  const regenerate = async () =>
    (
      await Promise.all(plans.map((p) => buildVerifiedCandidates(p, units)))
    ).flat();
  const rows = await regenerate();
  const entries = manifestEntries(rows);
  if (
    rows.length !== 108 ||
    new Set(rows.map((r) => r.familyKey)).size !== 27 ||
    new Set(rows.map((r) => r.unitId)).size !== 8
  )
    throw new Error(
      "Expected 108 quality-approved rows / 27 families / 8 units",
    );
  const fresh = async () =>
    prisma.problem.findMany({
      where: {
        OR: [
          { externalId: { in: rows.map((r) => r.externalId) } },
          ...Array.from(
            new Map(
              rows.map((r) => [
                r.unitId + "|" + r.familyKey,
                { unitId: r.unitId, familyKey: r.familyKey },
              ]),
            ).values(),
          ),
        ],
      },
      select: {
        id: true,
        externalId: true,
        unitId: true,
        familyKey: true,
        questionType: true,
        difficulty: true,
        problemType: true,
        content: true,
        answer: true,
        solution: true,
        figureSvg: true,
        source: true,
        pool: true,
        originProblemId: true,
        reviewStatus: true,
        directUseAllowed: true,
      },
    }) as Promise<StoredCandidate[]>;
  if (command === "prepare") {
    const scope = await fresh();
    const old = await prisma.problem.findMany({
      where: { AND: [problemEligibleWhere(), { unitId: { in: ids } }] },
      select: {
        id: true,
        unitId: true,
        content: true,
        figureSvg: true,
        figureUrls: true,
      },
    });
    const stemKey = (r: {
      unitId: string;
      content: string;
      figureSvg: string | null;
      figureUrls?: string[];
    }) =>
      r.unitId +
      "|" +
      sha256(
        JSON.stringify([
          parseProblemContent(r.content).question.replace(/\s+/g, " ").trim(),
          r.figureSvg,
          r.figureUrls ?? [],
        ]),
      );
    const existing = new Set(old.map(stemKey));
    const duplicateOld = rows
      .filter((r) => existing.has(stemKey(r)))
      .map((r) => r.externalId);
    const distinctStems = new Set(rows.map(stemKey)).size;
    if (duplicateOld.length || distinctStems !== 75)
      throw new Error(
        `Unexpected original overlap/distinct stems: ${duplicateOld.length}/${distinctStems}`,
      );
    const evidence = {
      planSha256: APPROVED_REINFORCEMENT_PLAN_SHA256,
      sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: repoDir,
        encoding: "utf8",
      }).trim(),
    };
    const ledger = preparePrewriteLedger(rows, scope, evidence);
    writePreparedBatch(
      resolve(repoDir, files.manifestPath),
      resolve(repoDir, files.prewritePath),
      rows,
      ledger,
    );
    save("wave1-r3-candidates.json", {
      ...evidence,
      batchSha256: sha256(serializeManifest(rows)),
      rows: rows
        .map((r) => ({ ...r, ...units.find((u) => u.id === r.unitId) }))
        .map((r) => {
          const { id, ...rest } = r;
          void id;
          return rest;
        }),
    });
    save("wave1-r3-preparation.json", {
      at: new Date().toISOString(),
      readOnly: true,
      rows: rows.length,
      distinctStems,
      newFamilies: 27,
      units: 8,
      duplicateOld,
      existingMatches: scope.length,
      manifestSha256: sha256(serializeManifest(rows)),
      prewriteSha256: sha256(
        readFileSync(resolve(repoDir, files.prewritePath)),
      ),
      ...evidence,
    });
    console.log(
      JSON.stringify({
        command,
        rows: rows.length,
        distinctStems,
        families: 27,
        batchSha256: ledger.batchSha256,
      }),
    );
    return;
  }
  if (command === "verify") {
    const scope = await fresh();
    const eligible = await prisma.problem.count({
      where: {
        AND: [
          problemEligibleWhere(),
          { externalId: { in: rows.map((r) => r.externalId) } },
        ],
      },
    });
    const bad = rows.filter((r) => {
      const s = scope.find((s) => s.externalId === r.externalId);
      return (
        !s ||
        payloadSha256(s) !== payloadSha256(r) ||
        entries.find((e) => e.externalId === r.externalId)?.familyKey !==
          s.familyKey ||
        s.unitId !== r.unitId ||
        s.questionType !== r.questionType ||
        s.difficulty !== r.difficulty ||
        s.problemType !== r.problemType ||
        s.source !== "manual" ||
        s.pool !== "shared" ||
        s.originProblemId !== null
      );
    });
    if (bad.length || scope.length !== 108 || eligible !== 108)
      throw new Error(
        `Readback mismatch: bad=${bad.length}, scope=${scope.length}, eligible=${eligible}`,
      );
    save("wave1-readback.json", {
      at: new Date().toISOString(),
      readOnly: true,
      matched: 108,
      eligible: 108,
      batchSha256: sha256(serializeManifest(rows)),
    });
    console.log(JSON.stringify({ command, matched: 108, eligible }));
    return;
  }
  const result = await executeVerifiedBatch(
    {
      files,
      regenerate,
      apply: process.argv.includes("--apply"),
      allowSharedImport: process.env.ALLOW_SHARED_IMPORT,
    },
    createPrismaVerifiedBatchStore(prisma),
    command === "revert" ? "revert" : "apply",
  );
  console.log(
    JSON.stringify({
      command,
      counts: Object.fromEntries(
        Object.entries(result).map(([k, v]) => [k, v.length]),
      ),
    }),
  );
}
main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : "Wave1 failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
