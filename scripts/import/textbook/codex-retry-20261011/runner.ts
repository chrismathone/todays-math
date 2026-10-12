/** Snapshot-only generation: this module has no database client, insertion, or promotion path. */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  DbRetryGenerationError,
  generateDbRetryPair,
} from "../../../../src/lib/import/schoolTextbook/dbRetryGeneration";
import {
  loadDbRetryFigures,
  renderDbRetryFigure,
} from "../../../../src/lib/import/schoolTextbook/dbRetryFigures";
import {
  atomicDbRetryJson,
  DbRetryCheckpointStore,
  freshDbRetryCheckpoint,
  readDbRetrySnapshot,
  runDbRetryBounded,
  selectDbRetryOrigins,
  UUID,
} from "../db-retry-20261011/checkpoint";
import { codexGenerationOptions, type CodexJsonRunner } from "./generation";
import type { CodexReceipt } from "./transport";

export interface CodexBatchOptions {
  mode: "plan" | "generate";
  snapshot: string;
  out: string;
  limit: number;
  concurrency: number;
  resume: boolean;
  retryFailed: boolean;
  sourceIds?: string[];
}
export const CODEX_BATCH_USAGE =
  "tsx cli.ts --snapshot <snapshot.json> [--out <directory>] [--generate --limit <1..100>] [--concurrency <1..4>] [--resume] [--retry-failed] [--source-ids <UUID-list.json>]";
export function parseCodexBatchOptions(args: string[]): CodexBatchOptions {
  const values = new Map<string, string>(),
    flags = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const key = args[i]!;
    if (
      ["--generate", "--dry-run", "--resume", "--retry-failed"].includes(key)
    ) {
      if (flags.has(key)) throw new Error("duplicate-option");
      flags.add(key);
    } else if (
      [
        "--snapshot",
        "--out",
        "--limit",
        "--concurrency",
        "--source-ids",
      ].includes(key)
    ) {
      if (values.has(key) || !args[i + 1] || args[i + 1]!.startsWith("--"))
        throw new Error("missing-or-duplicate-option");
      values.set(key, args[++i]!);
    } else throw new Error("unknown-option");
  }
  if (!values.has("--snapshot")) throw new Error("snapshot-option-required");
  if (flags.has("--generate") && flags.has("--dry-run"))
    throw new Error("conflicting-mode-options");
  if (flags.has("--generate") && !values.has("--limit"))
    throw new Error("explicit-bounded-limit-required");
  const integer = (key: string, fallback: number, max: number) => {
    const raw = values.get(key) ?? String(fallback);
    if (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > max)
      throw new Error("numeric-option-out-of-bounds");
    return Number(raw);
  };
  const sourceIds: unknown = values.has("--source-ids")
    ? JSON.parse(readFileSync(resolve(values.get("--source-ids")!), "utf8"))
    : undefined;
  if (
    sourceIds !== undefined &&
    (!Array.isArray(sourceIds) ||
      !sourceIds.length ||
      sourceIds.some((id) => typeof id !== "string" || !UUID.test(id)) ||
      new Set(sourceIds).size !== sourceIds.length)
  )
    throw new Error("source-ids-file-invalid");
  return {
    mode: flags.has("--generate") ? "generate" : "plan",
    snapshot: resolve(values.get("--snapshot")!),
    out: resolve(
      values.get("--out") ?? ".qa-artifacts/textbook-codex-retry-20261011",
    ),
    limit: integer("--limit", 10, 100),
    concurrency: integer("--concurrency", 1, 4),
    resume: flags.has("--resume"),
    retryFailed: flags.has("--retry-failed"),
    sourceIds: sourceIds as string[] | undefined,
  };
}
export interface CodexBatchDependencies {
  run?: CodexJsonRunner;
  loadFigures?: typeof loadDbRetryFigures;
  renderFigure?: typeof renderDbRetryFigure;
  signal?: AbortSignal;
  log?: (message: Record<string, unknown>) => void;
}
export async function runCodexBatch(
  options: CodexBatchOptions,
  dependencies: CodexBatchDependencies = {},
) {
  if (
    !["plan", "generate"].includes(options.mode) ||
    !Number.isInteger(options.limit) ||
    options.limit < 1 ||
    options.limit > 100 ||
    !Number.isInteger(options.concurrency) ||
    options.concurrency < 1 ||
    options.concurrency > 4
  )
    throw new Error("batch-options-invalid");
  const snapshot = readDbRetrySnapshot(readFileSync(options.snapshot));
  const log =
    dependencies.log ?? ((message) => console.log(JSON.stringify(message)));
  // Existing pending drafts use the same source checkpoints. --resume skips all intact generated pairs.
  // A resumed dry-run may validate/read checkpoints, but never generates or accesses a DB.
  const store =
    options.mode === "generate" || options.resume
      ? new DbRetryCheckpointStore(options.out, snapshot.digest, options.resume)
      : null;
  let failed = 0,
    generated = 0;
  try {
    const selected = selectDbRetryOrigins(snapshot, store, options);
    if (options.mode === "plan") {
      const plan = {
        mode: "dry-run",
        snapshotDigest: snapshot.digest,
        sourceIds: selected.map((o) => o.problem.id),
        limit: options.limit,
        concurrency: options.concurrency,
        modelCalls: 0,
        dbWrites: 0,
      };
      log(plan);
      return { failed: 0, generated: 0, selected: selected.length };
    }
    await runDbRetryBounded(selected, options.concurrency, async (origin) => {
      if (dependencies.signal?.aborted) throw new Error("batch-aborted");
      let entry = store!.read(origin) ?? freshDbRetryCheckpoint(origin);
      const receipts: CodexReceipt[] = [];
      let transportFailed = false;
      try {
        entry = {
          ...entry,
          state: "generating",
          reason: undefined,
          attempts: entry.attempts + 1,
        };
        store!.write(entry);
        const figures = await (dependencies.loadFigures ?? loadDbRetryFigures)(
          origin.problem,
        );
        const pair = await generateDbRetryPair(
          origin,
          figures,
          codexGenerationOptions({
            outDir: join(options.out, "receipts", origin.problem.id),
            signal: dependencies.signal,
            run: dependencies.run,
            onReceipt: (receipt) => receipts.push(receipt),
            renderFigure: dependencies.renderFigure ?? renderDbRetryFigure,
          }),
        );
        entry = {
          ...entry,
          state: "generated",
          pair,
          calls: [...entry.calls, ...pair.calls],
        };
        generated++;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "checkpoint-write-failed"
        )
          throw error;
        const reason =
          error instanceof DbRetryGenerationError
            ? error.code
            : "source-generation-failed";
        entry = {
          ...entry,
          state: "failed",
          reason,
          calls:
            error instanceof DbRetryGenerationError
              ? [...entry.calls, ...error.calls]
              : entry.calls,
        };
        transportFailed = reason === "generation-transport";
        failed++;
      }
      // Each CLI receipt is already durable; this index links successful slot calls to the draft.
      atomicDbRetryJson(
        join(store!.root, "sources", `${entry.sourceId}.codex.json`),
        {
          sourceId: entry.sourceId,
          sourceDigest: entry.sourceDigest,
          originDigest: entry.originDigest,
          candidatePayloadDigest: entry.pair?.candidatePayloadDigest ?? null,
          receipts,
          mathematicalApproval: false,
          dbWrites: 0,
        },
      );
      store!.write(entry);
      log({
        sourceId: entry.sourceId,
        state: entry.state,
        reason: entry.reason,
        modelCalls: receipts.length,
        dbWrites: 0,
      });
      // Stop scheduling after an authentication, quota, timeout or interruption failure.
      if (transportFailed || dependencies.signal?.aborted)
        throw new Error("batch-transport-stopped");
    });
    const summary = {
      mode: "generate",
      selected: selected.length,
      generated,
      failed,
      dbWrites: 0,
      mathematicalApproval: false,
    };
    atomicDbRetryJson(join(store!.root, "last-codex-run.json"), summary);
    log(summary);
    return { failed, generated, selected: selected.length };
  } finally {
    store?.close();
  }
}
