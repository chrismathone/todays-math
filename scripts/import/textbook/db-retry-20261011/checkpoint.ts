/** Per-original atomic checkpoints keep a large batch from rewriting every generated payload. */
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
import {
  DB_RETRY_GENERATION_VERSION,
  dbRetryOriginIssue,
  type DbRetryCall,
  type DbRetryGeneratedPair,
} from "../../../../src/lib/import/schoolTextbook/dbRetryGeneration";
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
