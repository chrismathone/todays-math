/** Provider-free wire-compatible checkpoint adapter.
 * The original checkpoint module imports the paid-provider default at runtime.
 * Keep this local copy compatible until a separately authorized shared-module extraction.
 * No database client, apply mode or model provider is reachable from this module.
 */
import { randomUUID, createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import type { DbRetryOrigin } from "../../../../src/lib/import/schoolTextbook/dbRetry.types";
import type {
  DbRetryCall,
  DbRetryGeneratedPair,
} from "../../../../src/lib/import/schoolTextbook/dbRetryGeneration";
import {
  GROUPED_PAIR_VERSION as DB_RETRY_GENERATION_VERSION,
  groupedOriginIssue as dbRetryOriginIssue,
  validateGroupedPair,
  generateCodexGroupedPairs,
  GroupedGenerationError,
  type GroupedJsonRunner,
} from "./batch-generation";
import {
  loadDbRetryFigures,
  renderDbRetryFigure,
} from "../../../../src/lib/import/schoolTextbook/dbRetryFigures";
import { runCodexJson, type CodexReceipt } from "./transport";
import { reviewDigest } from "../../../../src/lib/import/schoolTextbook/qualification";
import { textbookRetryExternalId } from "../../../../src/lib/import/schoolTextbook/retryPairPlan";
import {
  textbookVariantSourceDigest,
  type TextbookVariantSource,
} from "../../../../src/lib/import/schoolTextbook/variants";

export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export interface DbRetrySnapshot {
  digest: string;
  origins: DbRetryOrigin[];
  children: TextbookVariantSource[];
}
export interface DbRetryReceipt {
  sourceId: string;
  sourceDigest: string;
  candidatePayloadDigest: string;
  rowPayloadDigest: string;
  ownedIds: [string, string];
  externalIds: [string, string];
  committedAt: string;
}
export interface DbRetryCheckpoint {
  sourceId: string;
  sourceDigest: string;
  originDigest: string;
  state:
    | "planned"
    | "generating"
    | "generated"
    | "failed"
    | "inserting"
    | "inserted"
    | "existing-pair"
    | "conflict"
    | "ineligible";
  updatedAt: string;
  reason?: string;
  attempts: number;
  calls: DbRetryCall[];
  pair?: DbRetryGeneratedPair;
  insertionIds?: [string, string];
  rowPayloadDigest?: string;
  receipt?: DbRetryReceipt;
}

export function readDbRetrySnapshot(bytes: Buffer): DbRetrySnapshot {
  const snapshot = JSON.parse(bytes.toString("utf8")) as {
    rows?: unknown;
    children?: unknown;
  };
  if (!Array.isArray(snapshot.rows) || !Array.isArray(snapshot.children))
    throw new Error("snapshot-shape");
  const seen = new Set<string>();
  const origins = snapshot.rows.map(
    (input: {
      problem?: TextbookVariantSource;
      unit?: { grade?: string; chapter?: string; section?: string };
      book?: { grade?: string };
    }) => {
      if (
        !input?.problem ||
        !UUID.test(input.problem.id) ||
        seen.has(input.problem.id)
      )
        throw new Error("snapshot-source-id");
      seen.add(input.problem.id);
      if (
        typeof input.problem.content !== "string" ||
        typeof input.problem.answer !== "string"
      )
        throw new Error("snapshot-source-text");
      // The current DB unit, rather than publisher/file naming, defines curriculum scope.
      const origin: DbRetryOrigin = {
        problem: input.problem,
        grade: input.unit?.grade ?? input.book?.grade ?? "",
        chapter: input.unit?.chapter ?? "",
        section: input.unit?.section ?? "",
      };
      return origin;
    },
  );
  const children = snapshot.children as TextbookVariantSource[];
  if (children.some((child) => !child || !UUID.test(child.id)))
    throw new Error("snapshot-child-id");
  return {
    digest: createHash("sha256").update(bytes).digest("hex"),
    origins,
    children,
  };
}

export function existingDbRetryPair(
  origin: DbRetryOrigin,
  children: readonly TextbookVariantSource[],
): "empty" | "complete" | "conflict" {
  const id = origin.problem.id;
  const externalIds = [
    textbookRetryExternalId(id, 1),
    textbookRetryExternalId(id, 2),
  ];
  const rows = children.filter((p) =>
    externalIds.includes(p.external_id ?? ""),
  );
  if (!rows.length) return "empty";
  if (rows.length !== 2 || new Set(rows.map((p) => p.external_id)).size !== 2)
    return "conflict";
  return rows.every(
    (p) =>
      p.source === "transformed" &&
      p.origin_problem_id === id &&
      p.unit_id === origin.problem.unit_id &&
      p.source_material_id === origin.problem.source_material_id &&
      p.family_key === origin.problem.family_key,
  )
    ? "complete"
    : "conflict";
}

export function atomicDbRetryJson(path: string, value: unknown): void {
  const temporary = `${path}.${randomUUID()}.tmp`;
  const fd = openSync(temporary, "wx", 0o600);
  try {
    writeFileSync(fd, JSON.stringify(value, null, 2));
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  try {
    renameSync(temporary, path);
  } catch (error) {
    unlinkSync(temporary);
    throw error;
  }
}

export class DbRetryCheckpointStore {
  readonly root: string;
  readonly runId: string;
  private readonly lock: string;
  private closed = false;
  constructor(output: string, snapshotDigest: string, resume: boolean) {
    this.root = resolve(output);
    mkdirSync(join(this.root, "sources"), { recursive: true });
    this.lock = join(this.root, ".run.lock");
    const fd = openSync(this.lock, "wx", 0o600);
    writeFileSync(
      fd,
      JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }),
    );
    closeSync(fd);
    try {
      const path = join(this.root, "checkpoint.json");
      if (existsSync(path)) {
        if (!resume) throw new Error("checkpoint-exists-use-resume");
        const manifest = JSON.parse(readFileSync(path, "utf8"));
        if (
          manifest.version !== DB_RETRY_GENERATION_VERSION ||
          manifest.snapshotDigest !== snapshotDigest ||
          !UUID.test(manifest.runId)
        )
          throw new Error("checkpoint-snapshot-changed");
        this.runId = manifest.runId;
      } else {
        if (resume) throw new Error("checkpoint-missing");
        this.runId = randomUUID();
        atomicDbRetryJson(path, {
          version: DB_RETRY_GENERATION_VERSION,
          snapshotDigest,
          runId: this.runId,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.close();
      throw error;
    }
  }
  private path(id: string): string {
    if (!UUID.test(id)) throw new Error("checkpoint-source-id");
    return join(this.root, "sources", `${id}.json`);
  }
  read(origin: DbRetryOrigin): DbRetryCheckpoint | null {
    const path = this.path(origin.problem.id);
    if (!existsSync(path)) return null;
    const entry = JSON.parse(readFileSync(path, "utf8")) as DbRetryCheckpoint;
    if (
      entry.sourceId !== origin.problem.id ||
      entry.sourceDigest !== textbookVariantSourceDigest(origin.problem) ||
      entry.originDigest !== reviewDigest(origin)
    )
      throw new Error("checkpoint-source-changed");
    if (
      !Array.isArray(entry.calls) ||
      !Number.isInteger(entry.attempts) ||
      entry.attempts < 0
    )
      throw new Error("checkpoint-state-invalid");
    const states: DbRetryCheckpoint["state"][] = [
      "planned",
      "generating",
      "generated",
      "failed",
      "inserting",
      "inserted",
      "existing-pair",
      "conflict",
      "ineligible",
    ];
    if (!states.includes(entry.state))
      throw new Error("checkpoint-state-invalid");
    if (
      entry.pair &&
      (entry.pair.sourceId !== entry.sourceId ||
        entry.pair.sourceDigest !== entry.sourceDigest ||
        entry.pair.originDigest !== entry.originDigest ||
        entry.pair.mathematicalApproval !== false ||
        reviewDigest(entry.pair.candidates) !==
          entry.pair.candidatePayloadDigest)
    )
      throw new Error("checkpoint-candidates-changed");
    if (
      ["generated", "inserting", "inserted"].includes(entry.state) &&
      !entry.pair
    )
      throw new Error("checkpoint-pair-missing");
    if (
      entry.insertionIds &&
      (entry.insertionIds.length !== 2 ||
        entry.insertionIds.some((id) => !UUID.test(id)) ||
        entry.insertionIds[0] === entry.insertionIds[1])
    )
      throw new Error("checkpoint-ownership-invalid");
    if (
      ["inserting", "inserted"].includes(entry.state) &&
      (!entry.insertionIds || !entry.rowPayloadDigest)
    )
      throw new Error("checkpoint-ownership-missing");
    if (
      entry.receipt &&
      (entry.receipt.sourceId !== entry.sourceId ||
        reviewDigest(entry.receipt.ownedIds) !==
          reviewDigest(entry.insertionIds))
    )
      throw new Error("checkpoint-receipt-invalid");
    if (entry.pair) validateGroupedPair(origin, entry.pair);
    return entry;
  }
  write(entry: DbRetryCheckpoint): void {
    if (this.closed) throw new Error("checkpoint-store-closed");
    try {
      atomicDbRetryJson(this.path(entry.sourceId), {
        ...entry,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      throw new Error("checkpoint-write-failed");
    }
  }
  close(): void {
    if (!this.closed) {
      this.closed = true;
      if (existsSync(this.lock)) unlinkSync(this.lock);
    }
  }
}

export function freshDbRetryCheckpoint(
  origin: DbRetryOrigin,
): DbRetryCheckpoint {
  const reason = dbRetryOriginIssue(origin);
  return {
    sourceId: origin.problem.id,
    sourceDigest: textbookVariantSourceDigest(origin.problem),
    originDigest: reviewDigest(origin),
    state: reason ? "ineligible" : "planned",
    reason: reason ?? undefined,
    updatedAt: new Date().toISOString(),
    attempts: 0,
    calls: [],
  };
}

/** Limit counts actual selected jobs, after preserved pairs/held sources/completed checkpoints. */
export function selectDbRetryOrigins(
  snapshot: DbRetrySnapshot,
  store: DbRetryCheckpointStore | null,
  options: {
    mode: "plan" | "generate" | "insert";
    limit: number;
    retryFailed: boolean;
    sourceIds?: string[];
  },
): DbRetryOrigin[] {
  if (
    !Number.isInteger(options.limit) ||
    options.limit < 1 ||
    options.limit > 1000
  )
    throw new Error("limit-out-of-bounds");
  const filter = options.sourceIds ? new Set(options.sourceIds) : null;
  if (
    filter &&
    (filter.size !== options.sourceIds!.length ||
      [...filter].some(
        (id) =>
          !UUID.test(id) || !snapshot.origins.some((o) => o.problem.id === id),
      ))
  )
    throw new Error("selection-source-ids");
  const selected: DbRetryOrigin[] = [];
  for (const origin of snapshot.origins) {
    if (filter && !filter.has(origin.problem.id)) continue;
    if (dbRetryOriginIssue(origin)) continue;
    const entry = store?.read(origin);
    if (entry?.state === "inserted" || entry?.state === "existing-pair")
      continue;
    if (options.mode === "insert") {
      if (
        !entry?.pair ||
        (!["generated", "inserting"].includes(entry.state) &&
          !(options.retryFailed && entry.state === "failed"))
      )
        continue;
    } else {
      if (existingDbRetryPair(origin, snapshot.children) !== "empty") continue;
      if (
        entry?.pair ||
        (entry && ["ineligible", "conflict"].includes(entry.state)) ||
        (entry?.state === "failed" && !options.retryFailed)
      )
        continue;
    }
    selected.push(origin);
    if (selected.length === options.limit) break;
  }
  return selected;
}

export async function runDbRetryBounded<T>(
  inputs: readonly T[],
  concurrency: number,
  work: (input: T) => Promise<void>,
): Promise<void> {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8)
    throw new Error("concurrency-out-of-bounds");
  let cursor = 0;
  let failure: unknown;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, inputs.length) }, async () => {
      while (!failure) {
        const at = cursor++;
        if (at >= inputs.length) return;
        try {
          await work(inputs[at]!);
        } catch (error) {
          failure = error;
        }
      }
    }),
  );
  if (failure) throw failure;
}

export interface CodexGroupedOptions {
  mode: "plan" | "generate";
  snapshot: string;
  out: string;
  limit: number;
  batchSize: number;
  concurrency: number;
  resume: boolean;
  retryFailed: boolean;
  sourceIds?: string[];
}
export const CODEX_GROUPED_USAGE =
  "tsx batch-cli.ts --snapshot <snapshot.json> [--source-ids <UUID-array.json>] [--out <directory>] [--generate --limit <1..1000>] [--batch-size <1..16>] [--concurrency <1..3>] [--resume] [--retry-failed]";
export function parseCodexGroupedOptions(args: string[]): CodexGroupedOptions {
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
        "--batch-size",
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
  if (flags.has("--retry-failed") && !flags.has("--resume"))
    throw new Error("retry-requires-resume");
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
      values.get("--out") ?? ".qa-artifacts/textbook-codex-grouped-20261011",
    ),
    limit: integer("--limit", 16, 1000),
    batchSize: integer("--batch-size", 8, 16),
    concurrency: integer("--concurrency", 1, 3),
    resume: flags.has("--resume"),
    retryFailed: flags.has("--retry-failed"),
    sourceIds: sourceIds as string[] | undefined,
  };
}
export interface CodexGroupedDependencies {
  run?: GroupedJsonRunner;
  loadFigures?: typeof loadDbRetryFigures;
  renderFigure?: typeof renderDbRetryFigure;
  signal?: AbortSignal;
  log?: (message: Record<string, unknown>) => void;
}

/** Snapshot + local checkpoints only. The bounded unit is a group; limit counts originals. */
export async function runCodexGroupedBatch(
  options: CodexGroupedOptions,
  dependencies: CodexGroupedDependencies = {},
) {
  if (
    !["plan", "generate"].includes(options.mode) ||
    !Number.isInteger(options.limit) ||
    options.limit < 1 ||
    options.limit > 1000 ||
    !Number.isInteger(options.batchSize) ||
    options.batchSize < 1 ||
    options.batchSize > 16 ||
    !Number.isInteger(options.concurrency) ||
    options.concurrency < 1 ||
    options.concurrency > 3 ||
    (options.retryFailed && !options.resume) ||
    (options.sourceIds !== undefined &&
      (!Array.isArray(options.sourceIds) || !options.sourceIds.length))
  )
    throw new Error("grouped-options-invalid");
  const snapshot = readDbRetrySnapshot(readFileSync(options.snapshot));
  const log =
    dependencies.log ?? ((message) => console.log(JSON.stringify(message)));
  const store =
    options.mode === "generate" || options.resume
      ? new DbRetryCheckpointStore(options.out, snapshot.digest, options.resume)
      : null;
  const controller = new AbortController();
  const interrupt = () => controller.abort();
  dependencies.signal?.addEventListener("abort", interrupt, { once: true });
  if (dependencies.signal?.aborted) controller.abort();
  let generated = 0,
    failed = 0,
    modelCalls = 0;
  try {
    const selected = selectDbRetryOrigins(snapshot, store, options);
    if (options.mode === "plan") {
      log({
        mode: "dry-run",
        snapshotDigest: snapshot.digest,
        sourceIds: selected.map((o) => o.problem.id),
        limit: options.limit,
        batchSize: options.batchSize,
        concurrency: options.concurrency,
        plannedGroups: Math.ceil(selected.length / options.batchSize),
        modelCalls: 0,
        dbWrites: 0,
      });
      return { selected: selected.length, generated, failed, modelCalls };
    }
    const groups: DbRetryOrigin[][] = [];
    for (let i = 0; i < selected.length; i += options.batchSize)
      groups.push(selected.slice(i, i + options.batchSize));
    mkdirSync(join(store!.root, "grouped-calls"), { recursive: true });
    await runDbRetryBounded(groups, options.concurrency, async (origins) => {
      if (controller.signal.aborted) throw new Error("grouped-aborted");
      const groupId = randomUUID();
      const callPath = join(store!.root, "grouped-calls", `${groupId}.json`);
      const entries = origins.map((origin) => ({
        ...(store!.read(origin) ?? freshDbRetryCheckpoint(origin)),
        state: "generating" as const,
        reason: undefined,
      }));
      for (const entry of entries) {
        entry.attempts++;
        store!.write(entry);
      }
      const members = entries.map((e) => ({
        sourceId: e.sourceId,
        sourceDigest: e.sourceDigest,
        originDigest: e.originDigest,
      }));
      let receipt: CodexReceipt | undefined;
      let result: Awaited<ReturnType<typeof generateCodexGroupedPairs>>;
      try {
        const sources = [];
        for (const origin of origins) {
          if (controller.signal.aborted)
            throw new GroupedGenerationError("grouped-aborted", true);
          sources.push({
            origin,
            figures: await (dependencies.loadFigures ?? loadDbRetryFigures)(
              origin.problem,
            ),
          });
        }
        result = await generateCodexGroupedPairs(sources, {
          outDir: join(store!.root, "receipts", groupId),
          signal: controller.signal,
          renderFigure: dependencies.renderFigure,
          run: async <T>(input: Parameters<GroupedJsonRunner>[0]) => {
            modelCalls++;
            return (dependencies.run ?? runCodexJson)<T>(input);
          },
          onReceipt: (value) => {
            receipt = value;
            atomicDbRetryJson(callPath, {
              groupId,
              snapshotDigest: snapshot.digest,
              members,
              receipt,
              status: "validating",
              mathematicalApproval: false,
              dbWrites: 0,
            });
          },
        });
        // Reject a snapshot replaced while the call was running, before any generated checkpoint.
        if (
          createHash("sha256")
            .update(readFileSync(options.snapshot))
            .digest("hex") !== snapshot.digest
        )
          throw new GroupedGenerationError("grouped-snapshot-changed", true);
        if (
          result.pairs.length !== entries.length ||
          result.pairs.some(
            (pair, index) =>
              pair.sourceId !== entries[index]!.sourceId ||
              pair.sourceDigest !== entries[index]!.sourceDigest ||
              pair.originDigest !== entries[index]!.originDigest,
          )
        )
          throw new GroupedGenerationError(
            "grouped-checkpoint-source-changed",
            true,
          );
        if (controller.signal.aborted)
          throw new GroupedGenerationError("grouped-aborted", true);
      } catch (error) {
        // Checkpoint write errors are infrastructure failures; never disguise them as bad source content.
        const reason =
          error instanceof GroupedGenerationError
            ? error.code
            : "grouped-source-or-checkpoint-failed";
        atomicDbRetryJson(callPath, {
          groupId,
          snapshotDigest: snapshot.digest,
          members,
          receipt: receipt ?? null,
          status: "failed",
          reason,
          mathematicalApproval: false,
          dbWrites: 0,
        });
        for (const entry of entries) {
          store!.write({ ...entry, state: "failed", reason });
          failed++;
        }
        log({
          groupId,
          sourceIds: members.map((m) => m.sourceId),
          state: "failed",
          reason,
          dbWrites: 0,
        });
        if (
          !(error instanceof GroupedGenerationError) ||
          error.stop ||
          controller.signal.aborted
        ) {
          controller.abort();
          throw new Error("grouped-batch-stopped");
        }
        return;
      }
      // Persist shared receipt and candidate hashes first. Per-source checkpoints never contain shared usage.
      atomicDbRetryJson(callPath, {
        groupId,
        snapshotDigest: snapshot.digest,
        members,
        receipt: result.receipt,
        attachments: result.attachments,
        items: result.items,
        pairs: result.pairs.map((p) => ({
          sourceId: p.sourceId,
          candidatePayloadDigest: p.candidatePayloadDigest,
        })),
        status: "validated",
        mathematicalApproval: false,
        dbWrites: 0,
      });
      for (const [index, entry] of entries.entries()) {
        const pair = result.pairs[index]!;
        if (pair.sourceId !== entry.sourceId)
          throw new Error("grouped-internal-attribution");
        const indexPath = join(
          store!.root,
          "sources",
          `${entry.sourceId}.codex-grouped.json`,
        );
        // A retry's old call record remains immutable and discoverable by source ID in grouped-calls.
        atomicDbRetryJson(indexPath, {
          groupId,
          receiptId: result.receipt.id,
          sharedCallPath: callPath,
          usageAccounting: "shared-call-only",
          snapshotDigest: snapshot.digest,
          sourceId: entry.sourceId,
          sourceDigest: entry.sourceDigest,
          originDigest: entry.originDigest,
          sourceFigureDigest: pair.sourceFigureDigest,
          candidatePayloadDigest: pair.candidatePayloadDigest,
          items: result.items.filter((i) => i.sourceId === entry.sourceId),
          attachments: result.attachments.filter(
            (a) => a.sourceId === entry.sourceId,
          ),
          mathematicalApproval: false,
          dbWrites: 0,
        });
        store!.write({ ...entry, state: "generated", pair });
        generated++;
      }
      log({
        groupId,
        state: "generated",
        sources: result.pairs.length,
        modelCalls: 1,
        dbWrites: 0,
      });
    });
    const summary = {
      selected: selected.length,
      generated,
      failed,
      modelCalls,
    };
    atomicDbRetryJson(join(store!.root, "last-codex-grouped-run.json"), {
      ...summary,
      snapshotDigest: snapshot.digest,
      mathematicalApproval: false,
      dbWrites: 0,
    });
    log(summary);
    return summary;
  } finally {
    dependencies.signal?.removeEventListener("abort", interrupt);
    store?.close();
  }
}
