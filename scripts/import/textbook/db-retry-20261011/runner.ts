import { Prisma, PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { DbRetryFigures } from "../../../../src/lib/import/schoolTextbook/dbRetry.types";
import {
  DbRetryGenerationError,
  dbRetryOriginIssue,
  generateDbRetryPair,
} from "../../../../src/lib/import/schoolTextbook/dbRetryGeneration";
import { reviewDigest } from "../../../../src/lib/import/schoolTextbook/qualification";
import { textbookRetryExternalId } from "../../../../src/lib/import/schoolTextbook/retryPairPlan";
import {
  textbookVariantSourceDigest,
  type TextbookVariantSource,
} from "../../../../src/lib/import/schoolTextbook/variants";
import {
  atomicDbRetryJson,
  DbRetryCheckpointStore,
  existingDbRetryPair,
  freshDbRetryCheckpoint,
  readDbRetrySnapshot,
  runDbRetryBounded,
  selectDbRetryOrigins,
  UUID,
  type DbRetryCheckpoint,
} from "./checkpoint";
import {
  dbRetryRowsWithIntent,
  insertDbRetryPendingPair,
  readLiveDbRetryOrigin,
} from "./insert";

export interface DbRetryCliOptions {
  mode: "plan" | "generate" | "insert";
  snapshot: string;
  out: string;
  limit: number;
  concurrency: number;
  resume: boolean;
  retryFailed: boolean;
  sourceIds?: string[];
}
const USAGE =
  "tsx cli.ts --snapshot <source-snapshot.json> [--out <directory>] [--generate | --apply] --limit <1..1000> [--concurrency <1..8>] [--resume] [--retry-failed] [--source-ids <UUID-list.json>]";
export function parseDbRetryCliOptions(args: string[]): DbRetryCliOptions {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  for (let at = 0; at < args.length; at++) {
    const key = args[at]!;
    if (
      [
        "--generate",
        "--apply",
        "--resume",
        "--retry-failed",
        "--dry-run",
      ].includes(key)
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
      if (values.has(key) || !args[at + 1] || args[at + 1]!.startsWith("--"))
        throw new Error("missing-or-duplicate-option");
      values.set(key, args[++at]!);
    } else throw new Error("unknown-option");
  }
  if (!values.get("--snapshot")) throw new Error("snapshot-option-required");
  if (
    (flags.has("--generate") && flags.has("--apply")) ||
    (flags.has("--dry-run") &&
      (flags.has("--generate") || flags.has("--apply")))
  )
    throw new Error("conflicting-mode-options");
  const mode = flags.has("--apply")
    ? "insert"
    : flags.has("--generate")
      ? "generate"
      : "plan";
  if (mode !== "plan" && !values.has("--limit"))
    throw new Error("explicit-bounded-limit-required");
  const integer = (key: string, fallback: number, max: number) => {
    const raw = values.get(key) ?? String(fallback);
    if (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > max)
      throw new Error("numeric-option-out-of-bounds");
    return Number(raw);
  };
  const sourceIds = values.has("--source-ids")
    ? (JSON.parse(
        readFileSync(resolve(values.get("--source-ids")!), "utf8"),
      ) as unknown)
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
    mode,
    snapshot: resolve(values.get("--snapshot")!),
    out: resolve(
      values.get("--out") ?? ".qa-artifacts/textbook-db-retry-20261011",
    ),
    limit: integer("--limit", 20, 1000),
    concurrency: integer("--concurrency", 2, 8),
    resume: flags.has("--resume"),
    retryFailed: flags.has("--retry-failed"),
    sourceIds: sourceIds as string[] | undefined,
  };
}

interface DbRetryFigureModule {
  loadDbRetryFigures(source: TextbookVariantSource): Promise<DbRetryFigures>;
  renderDbRetryFigure(
    spec: Record<string, unknown>,
    content: string,
  ): Promise<{ svg: string; figures: DbRetryFigures }>;
}
export function safeDbRetryReason(error: unknown): string {
  if (
    error instanceof Error &&
    "code" in error &&
    typeof error.code === "string" &&
    /^[a-z][a-z-]{1,100}$/.test(error.code)
  )
    return error.code;
  return error instanceof DbRetryGenerationError
    ? error.code
    : error instanceof Error && /^[a-z][a-z-]{1,100}$/.test(error.message)
      ? error.message
      : "operation-failed";
}
export async function runDbRetryCli(
  options: DbRetryCliOptions,
): Promise<{ failed: number }> {
  const snapshot = readDbRetrySnapshot(readFileSync(options.snapshot));
  const preserved = snapshot.origins.filter(
    (o) => existingDbRetryPair(o, snapshot.children) === "complete",
  ).length;
  const partial = snapshot.origins.filter(
    (o) => existingDbRetryPair(o, snapshot.children) === "conflict",
  ).length;
  const held = snapshot.origins.filter((o) => dbRetryOriginIssue(o)).length;
  if (options.mode === "plan") {
    const selected = selectDbRetryOrigins(snapshot, null, options);
    console.log(
      JSON.stringify({
        mode: "dry-run",
        snapshotDigest: snapshot.digest,
        originals: snapshot.origins.length,
        preservedPairs: preserved,
        partialOrConflictingPairs: partial,
        ineligible: held,
        selected: selected.map((o) => ({
          sourceId: o.problem.id,
          sourceDigest: textbookVariantSourceDigest(o.problem),
          grade: o.grade,
        })),
        limit: options.limit,
        concurrency: options.concurrency,
        modelCalls: 0,
        dbWrites: 0,
      }),
    );
    return { failed: 0 };
  }
  if (options.mode === "insert" && process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error("allow-shared-import-required");
  if (options.mode === "generate" && !process.env.DEEPSEEK_API_KEY)
    throw new Error("deepseek-key-missing");
  const store = new DbRetryCheckpointStore(
    options.out,
    snapshot.digest,
    options.resume,
  );
  let prisma: PrismaClient | undefined;
  let failed = 0;
  const outcomes: {
    sourceId: string;
    state: DbRetryCheckpoint["state"];
    reason?: string;
  }[] = [];
  try {
    const selected = selectDbRetryOrigins(snapshot, store, options);
    if (selected.length) {
      // The separately-owned C module must be integrated; never substitute text-only evidence.
      const figureModulePath =
        "../../../../src/lib/import/schoolTextbook/dbRetryFigures.ts";
      const figures = (await import(figureModulePath)) as DbRetryFigureModule;
      prisma = new PrismaClient();
      const client = prisma;
      await runDbRetryBounded(selected, options.concurrency, async (origin) => {
        let entry = store.read(origin) ?? freshDbRetryCheckpoint(origin);
        try {
          const live = await readLiveDbRetryOrigin(client, origin.problem.id);
          if (options.mode === "generate") {
            const children = await client.$queryRaw<
              { row: TextbookVariantSource }[]
            >(Prisma.sql`
              SELECT to_jsonb(p) AS row FROM problem p WHERE p.external_id IN (${textbookRetryExternalId(origin.problem.id, 1)}, ${textbookRetryExternalId(origin.problem.id, 2)})`);
            const existing = existingDbRetryPair(
              live,
              children.map((p) => p.row),
            );
            if (existing === "conflict")
              throw new DbRetryGenerationError(
                "existing-partial-or-conflicting-pair",
              );
            if (existing === "complete") {
              entry.state = "existing-pair";
              store.write(entry);
              outcomes.push({ sourceId: entry.sourceId, state: entry.state });
              return;
            }
          }
          if (
            textbookVariantSourceDigest(live.problem) !== entry.sourceDigest ||
            reviewDigest(live) !== entry.originDigest
          )
            throw new DbRetryGenerationError("source-digest-changed");
          const sourceFigures = await figures.loadDbRetryFigures(live.problem);
          if (options.mode === "generate") {
            entry = {
              ...entry,
              state: "generating",
              reason: undefined,
              attempts: entry.attempts + 1,
            };
            store.write(entry);
            const pair = await generateDbRetryPair(origin, sourceFigures, {
              renderFigure: figures.renderDbRetryFigure,
            });
            entry = {
              ...entry,
              state: "generated",
              pair,
              calls: [...entry.calls, ...pair.calls],
            };
          } else {
            if (!entry.pair)
              throw new DbRetryGenerationError("checkpoint-pair-missing");
            entry.insertionIds ??= [randomUUID(), randomUUID()];
            const planned = dbRetryRowsWithIntent(live, entry);
            const payloadDigest = reviewDigest(planned);
            if (
              entry.rowPayloadDigest &&
              entry.rowPayloadDigest !== payloadDigest
            )
              throw new DbRetryGenerationError("insertion-payload-changed");
            entry = {
              ...entry,
              state: "inserting",
              reason: undefined,
              rowPayloadDigest: payloadDigest,
            };
            store.write(entry);
            const outcome = await insertDbRetryPendingPair(
              client,
              origin,
              entry,
              sourceFigures,
            );
            entry = {
              ...entry,
              state: outcome.state,
              receipt:
                outcome.state === "inserted" ? outcome.receipt : undefined,
            };
          }
          // Failure to persist a commit receipt must abort the run, retaining the durable 'inserting' intent.
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === "checkpoint-write-failed"
          )
            throw error;
          failed++;
          const reason = safeDbRetryReason(error);
          entry = {
            ...entry,
            state: reason.startsWith("existing-") ? "conflict" : "failed",
            reason,
            calls:
              error instanceof DbRetryGenerationError
                ? [...entry.calls, ...error.calls]
                : entry.calls,
          };
        }
        store.write(entry);
        outcomes.push({
          sourceId: entry.sourceId,
          state: entry.state,
          reason: entry.reason,
        });
        console.log(
          JSON.stringify({
            sourceId: entry.sourceId,
            state: entry.state,
            reason: entry.reason,
            modelCalls: entry.calls.length,
            totalTokens: entry.calls.reduce(
              (n, call) => n + (call.usage?.totalTokens ?? 0),
              0,
            ),
          }),
        );
        if (entry.reason === "provider-balance-insufficient") {
          atomicDbRetryJson(join(store.root, "provider-blocked.json"), {
            sourceId: entry.sourceId,
            checkedAt: new Date().toISOString(),
            reason: entry.reason,
            httpStatus: 402,
          });
          throw new DbRetryGenerationError("provider-balance-insufficient");
        }
      });
    }
    const summary = {
      mode: options.mode,
      runId: store.runId,
      snapshotDigest: snapshot.digest,
      originals: snapshot.origins.length,
      preservedPairs: preserved,
      partialOrConflictingPairs: partial,
      ineligible: held,
      selected: selected.length,
      failed,
      outcomes,
      limit: options.limit,
      concurrency: options.concurrency,
      stagedReviewStatus: "pending",
      directUseAllowed: false,
      mathematicalApproval: false,
    };
    atomicDbRetryJson(join(store.root, "last-run.json"), summary);
    console.log(JSON.stringify(summary));
    return { failed };
  } finally {
    try {
      await prisma?.$disconnect();
    } finally {
      store.close();
    }
  }
}
export function dbRetryCliUsage(): string {
  return USAGE;
}
