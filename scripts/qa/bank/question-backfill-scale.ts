/** Local-only operator scale evidence. Reads a protected manifest, never creates a
 * DB client, and makes every row SQL/transaction fail. Optional checkpoint I/O
 * uses a private temporary directory and deletes only that directory afterwards.
 * Usage: tsx scripts/qa/bank/question-backfill-scale.ts --manifest <preview>
 *   --report <aggregate.json> [--full-checkpoints]
 */
import { createHash, randomUUID } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { Prisma } from "@prisma/client";
import {
  executeQuestionBackfill,
  protectedQuestionWrite,
  questionManifestSha,
  validateQuestionBackfillApproval,
  QUESTION_BACKFILL_CHUNK_SIZE,
  QUESTION_DDL_PATH,
  type QuestionBackfillManifest,
  type QuestionBackfillReceipt,
  type QuestionOperatorClient,
  type QuestionTransactionHost,
} from "../../import/question-group-backfill";

function arg(flag: string) {
  const i = process.argv.indexOf(flag);
  return i < 0 ? undefined : process.argv[i + 1];
}
function timed<T>(work: () => T) {
  const start = performance.now();
  const value = work();
  return { value, ms: performance.now() - start };
}
function summary(samples: number[]) {
  const ordered = [...samples].sort((a, b) => a - b);
  return {
    samplesMs: samples,
    medianMs: ordered[Math.floor(ordered.length / 2)],
  };
}
async function main() {
  const manifestFile = arg("--manifest");
  const reportFile = arg("--report");
  if (!manifestFile || !reportFile)
    throw new Error("Expected --manifest <preview> --report <aggregate.json>");
  const bytes = readFileSync(manifestFile);
  const parsed = timed(
    () => JSON.parse(bytes.toString("utf8")) as QuestionBackfillManifest,
  );
  const manifest = parsed.value;
  const sha = questionManifestSha(manifest);
  if (createHash("sha256").update(bytes).digest("hex") !== sha)
    throw new Error("Input differs from protected manifest serialization");
  const ddlSha = createHash("sha256")
    .update(readFileSync(QUESTION_DDL_PATH))
    .digest("hex");
  // In-memory test data only: never written as an approval or used with a DB.
  const approval = {
    decision: "approved",
    scope: "question-backfill-gate-2",
    reviewer: "LOCAL SCALE HARNESS ONLY",
    manifestSha256: sha,
    ddlSha256: ddlSha,
  };
  const approvalSamples = Array.from(
    { length: 5 },
    () =>
      timed(() =>
        validateQuestionBackfillApproval(manifest, approval, ddlSha, sha),
      ).ms,
  );
  const makeReceipt = (): QuestionBackfillReceipt => ({
    kind: "math-question-backfill-receipt",
    version: 1,
    runId: randomUUID(),
    manifestSha256: sha,
    ddlSha256: ddlSha,
    applied: [],
    reverted: [],
    pendingChunk: [],
    completed: false,
  });
  const fullReceipt = makeReceipt();
  fullReceipt.applied = [...manifest.pairs].reverse();
  fullReceipt.completed = true;
  let catalogQueries = 0;
  let rowTransactions = 0;
  const fake: QuestionTransactionHost = {
    $queryRaw: (async (
      q: TemplateStringsArray | Prisma.Sql,
      ...values: unknown[]
    ) => {
      const sql =
        Array.isArray(q) && "raw" in q
          ? Prisma.sql(q as TemplateStringsArray, ...values)
          : (q as Prisma.Sql);
      catalogQueries++;
      if (sql.text.includes("FROM pg_proc"))
        return [
          {
            prosecdef: false,
            proconfig: ["search_path=pg_catalog, public"],
            public_execute: false,
            anon_execute: false,
            authenticated_execute: false,
          },
        ];
      if (sql.text.includes("FROM pg_roles"))
        return ["anon", "authenticated"].map((rolname) => ({
          rolname,
          can_insert: false,
          can_update: false,
        }));
      throw new Error("LOCAL ONLY: unexpected row query");
    }) as QuestionOperatorClient["$queryRaw"],
    $executeRaw: (async () => {
      throw new Error("LOCAL ONLY: no SQL writes allowed");
    }) as QuestionOperatorClient["$executeRaw"],
    $transaction: async () => {
      rowTransactions++;
      throw new Error("LOCAL ONLY: no row transactions allowed");
    },
  };
  const receiptSamples: number[] = [];
  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    try {
      // Zero deliberately stops after the complete, worst-order membership pass.
      await executeQuestionBackfill(fake, manifest, {
        mode: "revert",
        receipt: fullReceipt,
        chunkSize: 0,
        persist: () => {
          throw new Error("No persistence expected");
        },
      });
      throw new Error("Expected the validation-only chunk-size stop");
    } catch (error) {
      if (
        !(error instanceof Error) ||
        error.message !== "Invalid short transaction chunk size"
      )
        throw error;
    }
    receiptSamples.push(performance.now() - start);
  }
  const serialization: Record<string, unknown> = {};
  for (const compact of [false, true]) {
    let size = 0;
    const samples = Array.from(
      { length: 5 },
      () =>
        timed(() => {
          const json =
            JSON.stringify(fullReceipt, null, compact ? undefined : 2) + "\n";
          size = Buffer.byteLength(json);
        }).ms,
    );
    serialization[compact ? "compact" : "pretty"] = {
      bytes: size,
      ...summary(samples),
    };
  }
  let disk: Record<string, unknown> | null = null;
  if (process.argv.includes("--full-checkpoints")) {
    const parent = path.resolve(".qa-artifacts/math-question-formats-20261018");
    mkdirSync(parent, { recursive: true, mode: 0o700 });
    const scratch = mkdtempSync(path.join(parent, "backfill-scale-"));
    const file = path.join(scratch, "receipt.json");
    const receipt = makeReceipt();
    let checkpoints = 0,
      cumulativeBytes = 0,
      maxCheckpointMs = 0,
      finalBytes = 0;
    const start = performance.now();
    const persist = () => {
      const write = timed(() =>
        protectedQuestionWrite(file, receipt, { compact: true }),
      );
      maxCheckpointMs = Math.max(maxCheckpointMs, write.ms);
      finalBytes = statSync(file).size;
      cumulativeBytes += finalBytes;
      checkpoints++;
    };
    try {
      for (
        let i = 0;
        i < manifest.pairs.length;
        i += QUESTION_BACKFILL_CHUNK_SIZE
      ) {
        const chunk = manifest.pairs.slice(i, i + QUESTION_BACKFILL_CHUNK_SIZE);
        receipt.pendingChunk = chunk.map((p) => p.key);
        persist();
        receipt.applied.push(...chunk);
        receipt.pendingChunk = [];
        persist();
        if (checkpoints % 200 === 0)
          console.log(
            JSON.stringify({
              phase: "local receipt fsync",
              checkpoints,
              elapsedMs: performance.now() - start,
            }),
          );
      }
      receipt.completed = true;
      persist();
      const persisted = JSON.parse(
        readFileSync(file, "utf8"),
      ) as QuestionBackfillReceipt;
      if (
        persisted.applied.length !== manifest.pairs.length ||
        persisted.pendingChunk.length ||
        !persisted.completed
      )
        throw new Error("Local checkpoint roundtrip failed");
      disk = {
        elapsedMs: performance.now() - start,
        checkpoints,
        cumulativeBytes,
        finalBytes,
        maxCheckpointMs,
        fileFsyncs: checkpoints,
        directoryFsyncs: checkpoints,
        atomicRenames: checkpoints,
        finalFileMode: statSync(file).mode & 0o777,
        directoryMode: statSync(scratch).mode & 0o777,
        retainedTemporaryReceipts: 0,
      };
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  }
  const chunks = Math.ceil(
    manifest.pairs.length / QUESTION_BACKFILL_CHUNK_SIZE,
  );
  const report = {
    kind: "question-backfill-local-scale",
    capturedAt: new Date().toISOString(),
    scope:
      "Private stale pre-repair preview, read only; synthetic catalog answers; no DB client, connection, query or shared write. Disk run simulates receipt ownership checkpoints only.",
    operatorSha256: createHash("sha256")
      .update(readFileSync("scripts/import/question-group-backfill.ts"))
      .digest("hex"),
    inputManifestSha256: sha,
    ddlSha256: ddlSha,
    pairs: manifest.pairs.length,
    targetRows: manifest.preflight.targetRows,
    manifestBytes: bytes.length,
    manifestParseMs: parsed.ms,
    approvalValidation: summary(approvalSamples),
    receiptMembershipValidation: {
      ...summary(receiptSamples),
      catalogQueries,
      rowTransactions,
    },
    serialization,
    disk,
    projectedSql: {
      note: "Counts from local 201-pair integration regression; no shared-network latency or actual full-payload SQL timing claim.",
      pairsPerChunk: QUESTION_BACKFILL_CHUNK_SIZE,
      maxLockedRows: QUESTION_BACKFILL_CHUNK_SIZE * 2,
      maxUpdateParameters: QUESTION_BACKFILL_CHUNK_SIZE * 8,
      chunks,
      keyUpdateCalls: chunks,
      previousPerRowKeyUpdateCalls: manifest.preflight.targetRows,
      rawSqlCallsIncludingTwoCatalogChecks: chunks * 6 + 2,
      transactionBeginCommitCalls: chunks * 2,
      rerunKeyUpdateCalls: 0,
      fullApplyReceiptCheckpoints: chunks * 2 + 1,
      previousDefault20PairReceiptCheckpoints:
        Math.ceil(manifest.pairs.length / 20) * 2 + 1,
    },
    limits: [
      "Every operation still re-proves locked actual rows and checks current quarantine overlap before its sole chunk UPDATE.",
      "Durable full v1 JSON is still rewritten twice per chunk plus final completion; no ownership or crash journal is dropped. Compact changes whitespace only; manifest bytes stay pretty and hash-bound.",
      "CPU/receipt I/O figures are local measurements, not production database/lock/concurrency/network throughput. Up to 200 full payload JSON preimages per UPDATE can still be large.",
      "Lock 3s, statement 15s and transaction 20s bounds are unchanged. A failure retains pendingChunk and requires explicit reconciliation before reuse.",
    ],
  };
  mkdirSync(path.dirname(reportFile), { recursive: true });
  writeFileSync(reportFile, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
}
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
