/** Snapshot/checkpoint-only grouped review. Default plan; explicit --review opens CLI sessions. */
import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type {
  DbRetryCandidate,
  DbRetryFigures,
  DbRetryOrigin,
} from "../../../src/lib/import/schoolTextbook/dbRetry.types";
import type { RunCodexJson } from "../../../src/lib/import/schoolTextbook/codexRetry.types";
import type {
  CodexDbRetryBatchReview,
  CodexRetryBatchInput,
} from "../../../src/lib/import/schoolTextbook/codexRetryBatch.types";
import {
  CODEX_RETRY_BATCH_VERSION,
  codexRetryBatchBinding,
  reviewCodexDbRetryBatch,
  verifyCodexBatchCommunication,
} from "../../../src/lib/import/schoolTextbook/codexRetryBatchReview";
import { reviewDigest } from "../../../src/lib/import/schoolTextbook/qualification";
import { textbookVariantSourceDigest } from "../../../src/lib/import/schoolTextbook/variants";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
export interface CodexBatchReviewCliOptions {
  snapshot: string;
  generationDir: string;
  out: string;
  sourceIds: string[];
  batchSize: number;
  concurrency: number;
  timeoutMs: number;
  review: boolean;
  resume: boolean;
}
export const CODEX_BATCH_REVIEW_USAGE =
  "tsx scripts/qa/textbook/codex-batch-review-20261011.ts --snapshot <local.json> --generation-dir <checkpoint-directory> --source-ids <JSON-array-file-or-literal> --out <new-review-directory> [--batch-size 1..16] [--concurrency 1..3] [--timeout-ms 1..1800000] [--review] [--resume]";
export function parseCodexBatchReviewOptions(
  args: string[],
): CodexBatchReviewCliOptions {
  const values = new Map<string, string>(),
    flags = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (["--review", "--resume"].includes(key)) {
      if (flags.has(key)) throw new Error("duplicate-option");
      flags.add(key);
    } else if (
      [
        "--snapshot",
        "--generation-dir",
        "--source-ids",
        "--out",
        "--batch-size",
        "--concurrency",
        "--timeout-ms",
      ].includes(key)
    ) {
      if (values.has(key) || !args[i + 1] || args[i + 1].startsWith("--"))
        throw new Error("missing-or-duplicate-option");
      values.set(key, args[++i]);
    } else throw new Error("unknown-option");
  }
  for (const key of ["--snapshot", "--generation-dir", "--source-ids", "--out"])
    if (!values.has(key)) throw new Error("required-option-missing");
  const number = (key: string, fallback: number, max: number) => {
    const value = values.get(key) ?? String(fallback);
    if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max)
      throw new Error("numeric-option-out-of-bounds");
    return Number(value);
  };
  const ids = values.get("--source-ids")!;
  const sourceIds: unknown = JSON.parse(
    ids.trim().startsWith("[") ? ids : readFileSync(resolve(ids), "utf8"),
  );
  if (
    !Array.isArray(sourceIds) ||
    !sourceIds.length ||
    sourceIds.length > 256 ||
    sourceIds.some((id) => typeof id !== "string" || !UUID.test(id)) ||
    new Set(sourceIds).size !== sourceIds.length
  )
    throw new Error("source-ids-invalid");
  return {
    snapshot: resolve(values.get("--snapshot")!),
    generationDir: resolve(values.get("--generation-dir")!),
    out: resolve(values.get("--out")!),
    sourceIds,
    batchSize: number("--batch-size", 8, 16),
    concurrency: number("--concurrency", 1, 3),
    timeoutMs: number("--timeout-ms", 600_000, 1_800_000),
    review: flags.has("--review"),
    resume: flags.has("--resume"),
  };
}
interface Selected {
  origin: DbRetryOrigin;
  candidates: DbRetryCandidate[];
  checkpointPath: string;
  checkpointSha256: string;
  sourceFigureDigest: string;
}
function selection(options: CodexBatchReviewCliOptions) {
  const snapshotBytes = readFileSync(options.snapshot);
  const snapshot = JSON.parse(snapshotBytes.toString("utf8")) as {
    rows: {
      problem: DbRetryOrigin["problem"];
      unit?: { grade?: string; chapter?: string; section?: string };
      book?: { grade?: string };
    }[];
    children: unknown[];
  };
  if (!Array.isArray(snapshot.rows) || !Array.isArray(snapshot.children))
    throw new Error("snapshot-shape");
  const selected: Selected[] = options.sourceIds.map((id) => {
    const matches = snapshot.rows.filter((row) => row?.problem?.id === id);
    if (matches.length !== 1)
      throw new Error("snapshot-source-missing-or-duplicate");
    const row = matches[0];
    const origin: DbRetryOrigin = {
      problem: row.problem,
      grade: row.unit?.grade ?? row.book?.grade ?? "",
      chapter: row.unit?.chapter ?? "",
      section: row.unit?.section ?? "",
    };
    const checkpointPath = join(options.generationDir, "sources", `${id}.json`);
    const bytes = readFileSync(checkpointPath);
    const entry = JSON.parse(bytes.toString("utf8")) as {
      sourceId: string;
      sourceDigest: string;
      originDigest: string;
      state: string;
      pair?: {
        sourceId: string;
        sourceDigest: string;
        originDigest: string;
        sourceFigureDigest: string;
        candidatePayloadDigest: string;
        candidates: DbRetryCandidate[];
      };
    };
    const pair = entry.pair;
    if (
      !["generated", "inserting", "inserted"].includes(entry.state) ||
      !pair ||
      entry.sourceId !== id ||
      entry.sourceDigest !== textbookVariantSourceDigest(origin.problem) ||
      entry.originDigest !== reviewDigest(origin) ||
      pair.sourceId !== id ||
      pair.sourceDigest !== entry.sourceDigest ||
      pair.originDigest !== entry.originDigest ||
      !Array.isArray(pair.candidates) ||
      pair.candidates.length !== 2 ||
      pair.candidates[0]?.slot !== 1 ||
      pair.candidates[1]?.slot !== 2 ||
      pair.candidatePayloadDigest !== reviewDigest(pair.candidates) ||
      typeof pair.sourceFigureDigest !== "string"
    )
      throw new Error("checkpoint-binding-invalid");
    return {
      origin,
      candidates: pair.candidates,
      checkpointPath,
      checkpointSha256: sha(bytes),
      sourceFigureDigest: pair.sourceFigureDigest,
    };
  });
  return { selected, snapshotDigest: sha(snapshotBytes) };
}
/** Exclusive creates only. Existing proof can be reused byte-for-byte, never replaced. */
function writeOnce(path: string, value: unknown): void {
  if (existsSync(path)) {
    if (
      reviewDigest(JSON.parse(readFileSync(path, "utf8"))) !==
      reviewDigest(value)
    )
      throw new Error("existing-proof-differs");
    return;
  }
  const fd = openSync(path, "wx", 0o600);
  try {
    writeFileSync(fd, JSON.stringify(value, null, 2));
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}
const overlaps = (a: string, b: string) => {
  const rel = relative(resolve(a), resolve(b));
  return (
    !rel ||
    (!isAbsolute(rel) &&
      rel !== ".." &&
      !rel.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`))
  );
};
export interface CodexBatchReviewCliDependencies {
  runCodexJson?: RunCodexJson;
  loadFigures?: (
    source: DbRetryOrigin["problem"] | DbRetryCandidate,
  ) => Promise<DbRetryFigures>;
  signal?: AbortSignal;
  log?: (value: unknown) => void;
}
export async function runCodexBatchReviewCli(
  options: CodexBatchReviewCliOptions,
  dependencies: CodexBatchReviewCliDependencies = {},
) {
  if (
    !Number.isInteger(options.batchSize) ||
    options.batchSize < 1 ||
    options.batchSize > 16 ||
    !Number.isInteger(options.concurrency) ||
    options.concurrency < 1 ||
    options.concurrency > 3 ||
    !Number.isInteger(options.timeoutMs) ||
    options.timeoutMs < 1 ||
    options.timeoutMs > 1_800_000 ||
    !Array.isArray(options.sourceIds) ||
    !options.sourceIds.length ||
    options.sourceIds.length > 256 ||
    options.sourceIds.some((id) => !UUID.test(id)) ||
    new Set(options.sourceIds).size !== options.sourceIds.length
  )
    throw new Error("batch-options-invalid");
  if (
    overlaps(options.generationDir, options.out) ||
    overlaps(options.out, options.generationDir) ||
    overlaps(options.out, options.snapshot)
  )
    throw new Error("review-output-overlaps-input");
  const { selected, snapshotDigest } = selection(options);
  const log =
    dependencies.log ?? ((value) => console.log(JSON.stringify(value)));
  const manifest = {
    version: CODEX_RETRY_BATCH_VERSION,
    snapshotDigest,
    sourceIds: options.sourceIds,
    checkpoints: selected.map((item) => ({
      sourceId: item.origin.problem.id,
      sha256: item.checkpointSha256,
    })),
    batchSize: options.batchSize,
    concurrency: options.concurrency,
    timeoutMs: options.timeoutMs,
  };
  const plan = {
    mode: options.review ? "review" : "plan",
    ...manifest,
    batches: Math.ceil(selected.length / options.batchSize),
    maximumModelCalls: Math.ceil(selected.length / options.batchSize) * 3,
    databaseOperations: 0,
  };
  log(plan);
  if (!options.review) return { reviewed: 0, passed: 0, held: 0, plan };
  if (dependencies.signal?.aborted) throw new Error("review-aborted");
  if (
    !options.resume &&
    existsSync(options.out) &&
    readdirSync(options.out).length
  )
    throw new Error("review-output-exists-use-resume");
  if (options.resume && !existsSync(join(options.out, "manifest.json")))
    throw new Error("resume-manifest-missing");
  mkdirSync(options.out, { recursive: true });
  const lockPath = join(options.out, ".review.lock");
  const lock = openSync(lockPath, "wx", 0o600);
  closeSync(lock);
  try {
    writeOnce(join(options.out, "manifest.json"), manifest);
    mkdirSync(join(options.out, "batches"), { recursive: true });
    mkdirSync(join(options.out, "cases"), { recursive: true });
    // Dynamic imports occur only after explicit --review and never include the paid generation module.
    const loadFigures =
      dependencies.loadFigures ??
      (await import("../../../src/lib/import/schoolTextbook/dbRetryFigures"))
        .loadDbRetryFigures;
    const runner =
      dependencies.runCodexJson ??
      (await import("../../import/textbook/codex-retry-20261011/transport"))
        .runCodexJson;
    const results: CodexDbRetryBatchReview[] = [];
    const threadIds = new Set<string>();
    // Cross-batch reuse is rejected as well as within each batch; recording is synchronous after await.
    const run: RunCodexJson = async (request) => {
      const response = await runner(request);
      if (threadIds.has(response.threadId))
        throw new Error("reused-batch-thread");
      threadIds.add(response.threadId);
      return response;
    };
    const groups = Array.from(
      { length: Math.ceil(selected.length / options.batchSize) },
      (_, i) =>
        selected.slice(i * options.batchSize, (i + 1) * options.batchSize),
    );
    let cursor = 0;
    let failure: unknown;
    await Promise.all(
      Array.from(
        { length: Math.min(options.concurrency, groups.length) },
        async () => {
          while (!failure) {
            const position = cursor++;
            if (position >= groups.length) return;
            try {
              if (dependencies.signal?.aborted)
                throw new Error("review-aborted");
              const inputs: CodexRetryBatchInput[] = [];
              for (const entry of groups[position]) {
                if (
                  sha(readFileSync(entry.checkpointPath)) !==
                  entry.checkpointSha256
                )
                  throw new Error("checkpoint-changed-during-review");
                const sourceFigures = await loadFigures(entry.origin.problem);
                if (sourceFigures.digest !== entry.sourceFigureDigest)
                  throw new Error("generation-source-figures-changed");
                inputs.push({
                  origin: entry.origin,
                  candidates: entry.candidates,
                  sourceFigures,
                  candidateFigures: await Promise.all(
                    entry.candidates.map((candidate) => loadFigures(candidate)),
                  ),
                });
              }
              const binding = codexRetryBatchBinding(inputs);
              const batchPath = join(
                options.out,
                "batches",
                `${position + 1}.json`,
              );
              const artifactDir = join(
                options.out,
                "artifacts",
                binding.batchDigest,
              );
              let review: CodexDbRetryBatchReview;
              if (existsSync(batchPath)) {
                const saved = JSON.parse(readFileSync(batchPath, "utf8")) as {
                  reviewDigest: string;
                  review: CodexDbRetryBatchReview;
                };
                review = saved.review;
                if (
                  !options.resume ||
                  saved.reviewDigest !== reviewDigest(review) ||
                  review.version !== CODEX_RETRY_BATCH_VERSION ||
                  review.kind !== "machine-codex-batch-blind-review" ||
                  review.batchDigest !== binding.batchDigest ||
                  reviewDigest(review.inputBindings) !==
                    reviewDigest(binding.inputBindings) ||
                  review.cases.length !== inputs.length
                )
                  throw new Error("cached-batch-binding-changed");
                for (const call of review.communications)
                  if (call.status === "succeeded") {
                    verifyCodexBatchCommunication(
                      call,
                      join(artifactDir, call.phase),
                    );
                    if (!call.threadId || threadIds.has(call.threadId))
                      throw new Error("cached-reused-thread");
                    threadIds.add(call.threadId);
                  }
              } else {
                if (existsSync(artifactDir))
                  throw new Error(
                    "incomplete-evidence-use-new-output-directory",
                  );
                review = await reviewCodexDbRetryBatch(inputs, {
                  runCodexJson: run,
                  outDir: join(options.out, "artifacts"),
                  timeoutMs: options.timeoutMs,
                  signal: dependencies.signal,
                });
                // Inputs on disk must still be exact before publishing any reusable result.
                if (
                  sha(readFileSync(options.snapshot)) !== snapshotDigest ||
                  groups[position].some(
                    (entry) =>
                      sha(readFileSync(entry.checkpointPath)) !==
                      entry.checkpointSha256,
                  )
                )
                  throw new Error("inputs-changed-during-review");
                writeOnce(batchPath, {
                  reviewDigest: reviewDigest(review),
                  review,
                });
              }
              for (const item of review.cases)
                writeOnce(join(options.out, "cases", `${item.sourceId}.json`), {
                  version: CODEX_RETRY_BATCH_VERSION,
                  kind: review.kind,
                  sourceId: item.sourceId,
                  caseId: item.caseId,
                  questionIndex: item.questionIndex,
                  batchDigest: review.batchDigest,
                  bindingDigest: item.bindingDigest,
                  passed: item.passed,
                  issues: item.issues,
                  batchPath,
                  reviewDigest: reviewDigest(review),
                });
              results[position] = review;
              log({
                batch: position + 1,
                batchDigest: review.batchDigest,
                passed: review.cases.filter((item) => item.passed).length,
                held: review.cases.filter((item) => !item.passed).length,
                issues: review.issues,
                databaseOperations: 0,
              });
            } catch (error) {
              failure = error;
            }
          }
        },
      ),
    );
    if (failure) throw failure;
    if (
      sha(readFileSync(options.snapshot)) !== snapshotDigest ||
      selected.some(
        (entry) =>
          sha(readFileSync(entry.checkpointPath)) !== entry.checkpointSha256,
      )
    )
      throw new Error("inputs-changed-during-review");
    const summary = {
      version: CODEX_RETRY_BATCH_VERSION,
      reviewed: selected.length,
      passed: results
        .flatMap((item) => item.cases)
        .filter((item) => item.passed).length,
      held: results.flatMap((item) => item.cases).filter((item) => !item.passed)
        .length,
      batches: results.map((item) => item.batchDigest),
      databaseOperations: 0,
    };
    writeOnce(join(options.out, "summary.json"), summary);
    log(summary);
    return { ...summary, plan };
  } finally {
    unlinkSync(lockPath);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  process.once("SIGINT", abort);
  process.once("SIGTERM", abort);
  Promise.resolve()
    .then(() =>
      runCodexBatchReviewCli(
        parseCodexBatchReviewOptions(process.argv.slice(2)),
        { signal: controller.signal },
      ),
    )
    .then((result) => {
      if (result.held) process.exitCode = 1;
    })
    .catch((error: unknown) => {
      console.error(
        JSON.stringify({
          status: "review-failed",
          reason:
            error instanceof Error && /^[a-z][a-z-]+$/.test(error.message)
              ? error.message
              : "operation-failed",
          databaseOperations: 0,
        }),
      );
      process.exitCode = 1;
    })
    .finally(() => {
      process.removeListener("SIGINT", abort);
      process.removeListener("SIGTERM", abort);
    });
}
