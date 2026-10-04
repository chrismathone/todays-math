/** Trusted operator CLI: receipt-verified style edits, exact exported draft, transactional CAS. */
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import type {
  ListeningActor,
  ListeningDatabase,
} from "../../../src/lib/english/listening/runtime/database";
import {
  loadVerifiedListeningStyleStage,
  assertVerifiedListeningStyleStage,
} from "./verified-listening-style-stage.mts";

function exportsOf<T>(module: T): T {
  const fallback = (module as { default?: unknown }).default;
  return fallback && typeof fallback === "object" ? (fallback as T) : module;
}
const { listeningDraftSchema, listeningUpdateSetSchema } = exportsOf(
  await import("../../../src/contracts/englishListeningHttp.contract"),
);
const { freezeListeningValue } = exportsOf(
  await import("../../../src/lib/english/listening/publication"),
);
const { prepareListeningStyleAdoption } = exportsOf(
  await import("../../../src/lib/english/listening/reconstructionStyleAdoption"),
);
const { teacher, ownedSet, one, lock, audit } = exportsOf(
  await import("../../../src/lib/english/listening/runtime/database"),
);
const { updateSet, verifiedMedia } = exportsOf(
  await import("../../../src/lib/english/listening/runtime/sets"),
);
const OWNER_ID = "6f361696-5eb5-4f7d-9c66-9313ad7bb06a";
const PROJECT_ID = "jyaguxwuaxgdnovtulna";
const sha = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const snapshotSchema = z.object({
  checkedAt: z.iso.datetime(),
  ownerId: z.uuid(),
  snapshots: z
    .array(
      z.object({
        id: z.uuid(),
        revision: z.number().int().positive(),
        document: listeningDraftSchema,
        publications: z.number().int().nonnegative(),
        sourceRecordId: z.string().min(1),
        baselineSha256: hash,
        baselineMatch: z.boolean(),
      }),
    )
    .min(1),
});
type Snapshot = z.infer<typeof snapshotSchema>["snapshots"][number];
type LoadedStage = Awaited<ReturnType<typeof loadVerifiedListeningStyleStage>>;
type LoadedSnapshot = Readonly<{ snapshot: Snapshot; snapshotSha256: string }>;
const verifiedSnapshots = new WeakSet<object>();
export class ListeningStyleAdoptionError extends Error {}
function fail(message: string): never {
  throw new ListeningStyleAdoptionError(message);
}

/** Additional adoption gate; saved model receipts and their verdicts stay immutable. */
export function listeningStyleEvidenceHoldReasons(
  evidenceQuotes: readonly string[],
) {
  return evidenceQuotes.length &&
    evidenceQuotes.some((quote) => /[A-Za-z]{2,}/.test(quote))
    ? []
    : ["No English speech in the bound evidence quotations"];
}

export function prepareListeningStyleEvidenceAdoption(loaded: LoadedStage) {
  assertVerifiedListeningStyleStage(loaded);
  const adoptionHolds = loaded.audit.questionVerdicts
    .filter((item) => item.eligible)
    .map((item) => ({
      questionId: item.questionId,
      reasons: listeningStyleEvidenceHoldReasons(item.evidenceQuotes),
    }))
    .filter((item) => item.reasons.length > 0);
  const excluded = new Set(adoptionHolds.map((item) => item.questionId));
  const original = new Map(
    loaded.baseline.editableInput.groups.flatMap((group) =>
      group.questions.map((question) => [question.id, question] as const),
    ),
  );
  const proposed = {
    ...loaded.staged.editableInput,
    groups: loaded.staged.editableInput.groups.map((group) => ({
      ...group,
      questions: group.questions.map((question) =>
        excluded.has(question.id) ? original.get(question.id)! : question,
      ),
    })),
  };
  return {
    proposed,
    eligibleQuestionIds: loaded.audit.eligibleQuestionIds.filter(
      (id) => !excluded.has(id),
    ),
    adoptionGuardVersion: "english-evidence-v1-20261005",
    adoptionHolds,
  };
}

export async function loadListeningStyleSnapshot(
  file: string,
  workspaceRoot: string,
  sourceRecordId: string,
  baselineSha256: string,
): Promise<LoadedSnapshot> {
  const root = await realpath(resolve(workspaceRoot));
  const absolute = await realpath(resolve(file));
  const rel = relative(root, absolute);
  if (
    !rel ||
    rel === ".." ||
    rel.startsWith("..\\") ||
    rel.startsWith("../") ||
    isAbsolute(rel)
  )
    fail("Snapshot must remain inside the operator workspace.");
  const handle = await open(
    absolute,
    constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
  );
  let bytes: Buffer;
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > 16 * 1024 * 1024)
      fail("Invalid snapshot file.");
    bytes = await handle.readFile();
    if (bytes.byteLength !== info.size) fail("Snapshot changed during read.");
  } finally {
    await handle.close();
  }
  const envelope = snapshotSchema.parse(JSON.parse(bytes.toString("utf8")));
  const matches = envelope.snapshots.filter(
    (item) => item.sourceRecordId === sourceRecordId,
  );
  if (envelope.ownerId !== OWNER_ID || matches.length !== 1)
    fail("Snapshot source or owner is ambiguous.");
  const snapshot = matches[0];
  if (
    !snapshot.baselineMatch ||
    snapshot.baselineSha256 !== baselineSha256 ||
    snapshot.publications !== 0 ||
    snapshot.id !== snapshot.document.id ||
    snapshot.document.ownerId !== OWNER_ID ||
    snapshot.document.revision !== snapshot.revision
  )
    fail("Snapshot is not an exact unreviewed baseline.");
  const loaded = freezeListeningValue({ snapshot, snapshotSha256: sha(bytes) });
  verifiedSnapshots.add(loaded);
  return loaded;
}

export async function applyListeningStyle(
  database: ListeningDatabase,
  loaded: LoadedStage,
  backup: LoadedSnapshot,
  options: { actor: ListeningActor; apply?: boolean },
) {
  assertVerifiedListeningStyleStage(loaded);
  if (!verifiedSnapshots.has(backup))
    fail("Snapshot must be loaded from the operator workspace.");
  if (
    options.actor.kind !== "teacher" ||
    options.actor.userId !== OWNER_ID ||
    backup.snapshot.sourceRecordId !== loaded.sourceRecordId ||
    backup.snapshot.baselineSha256 !== loaded.audit.baselineSha256
  )
    fail(
      "Style adoption requires the exact imported material owner and baseline.",
    );
  const evidencePlan = prepareListeningStyleEvidenceAdoption(loaded);
  return database.$transaction(
    async (tx) => {
      if (!options.apply)
        await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      await tx.$executeRawUnsafe("SET LOCAL TIME ZONE 'UTC'");
      const account = await teacher(tx, options.actor, "materials");
      const setId = backup.snapshot.id;
      await lock(tx, setId);
      const row = await ownedSet(tx, account, setId);
      if (row.owner_id !== OWNER_ID || row.revision !== row.document.revision)
        fail("Source owner or content revision changed.");
      const publication = await one<{ count: bigint }>(
        tx,
        Prisma.sql`SELECT count(*) AS count FROM english_listening_publication WHERE set_id=${setId}::uuid`,
      );
      const plan = prepareListeningStyleAdoption({
        current: row.document,
        expected: backup.snapshot.document,
        baseline: loaded.baseline.editableInput,
        proposed: evidencePlan.proposed,
        eligibleQuestionIds: evidencePlan.eligibleQuestionIds,
        publicationCount: Number(publication?.count ?? 0),
      });
      for (const group of row.document.groups) {
        if (!group.audio) fail("Registered original audio is required.");
        const completion = await verifiedMedia(tx, row, group.audio.assetId);
        if (
          completion.sha256 !== group.audio.sha256 ||
          completion.durationMs !== group.audio.durationMs ||
          completion.originalSha256 !== loaded.audit.sourceAudioSha256
        )
          fail("Ready audio no longer matches the immutable source.");
      }
      const result = {
        sourceRecordId: loaded.sourceRecordId,
        setId,
        revision: row.revision,
        qualified: plan.qualifiedQuestionIds.length,
        held:
          loaded.audit.needsReviewQuestionIds.length +
          evidencePlan.adoptionHolds.length,
        adoptionGuardVersion: evidencePlan.adoptionGuardVersion,
        adoptionHolds: evidencePlan.adoptionHolds,
        stageSha256: loaded.stageSha256,
        snapshotSha256: backup.snapshotSha256,
      };
      if (!plan.qualifiedQuestionIds.length)
        return { ...result, status: "held" as const };
      if (plan.alreadyApplied)
        return { ...result, status: "already_applied" as const };
      if (!options.apply) return { ...result, status: "read_only" as const };
      const now = new Date().toISOString();
      const saved = await updateSet(
        tx,
        account,
        setId,
        listeningUpdateSetSchema.parse({
          ...plan.update,
          expectedRevision: row.revision,
        }),
        now,
      );
      const confirmed = prepareListeningStyleAdoption({
        current: saved.document,
        expected: backup.snapshot.document,
        baseline: loaded.baseline.editableInput,
        proposed: evidencePlan.proposed,
        eligibleQuestionIds: evidencePlan.eligibleQuestionIds,
        publicationCount: 0,
      });
      if (!confirmed.alreadyApplied)
        fail("Saved style revision differs from the validated plan.");
      await audit(
        tx,
        setId,
        account.id,
        "reconstructed_style_adopted",
        {
          sourceRecordId: loaded.sourceRecordId,
          stageSha256: loaded.stageSha256,
          baselineSha256: loaded.audit.baselineSha256,
          snapshotSha256: backup.snapshotSha256,
          sourceAudioSha256: loaded.audit.sourceAudioSha256,
          asrSha256: loaded.audit.asrSha256,
          beforeHash: plan.beforeHash,
          afterQuestionHash: plan.afterQuestionHash,
          questionIds: plan.qualifiedQuestionIds,
          sourceRevision: row.revision,
          revision: saved.revision,
          threshold: loaded.audit.threshold,
          version: loaded.audit.version,
          adoptionGuardVersion: evidencePlan.adoptionGuardVersion,
          adoptionHolds: evidencePlan.adoptionHolds,
          humanReviewed: false,
          audioAlignmentVerified: false,
          receipts: loaded.audit.receipts.map((receipt) => ({
            kind: receipt.kind,
            requestHash: receipt.requestHash,
            receiptSha256: receipt.receiptSha256,
            actualModel: receipt.actualModel,
          })),
        },
        now,
      );
      return {
        ...result,
        revision: saved.revision,
        status: "applied" as const,
      };
    },
    { maxWait: 10000, timeout: 60000 },
  );
}

export function listeningStyleDatabaseUrl(value: string | undefined) {
  let url: URL;
  try {
    url = new URL(value ?? "");
  } catch {
    return fail("Expected listening database project is unavailable.");
  }
  const user = decodeURIComponent(url.username);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !(
      (url.hostname === `db.${PROJECT_ID}.supabase.co` &&
        user === "postgres") ||
      (url.hostname.endsWith(".pooler.supabase.com") &&
        user === `postgres.${PROJECT_ID}`)
    )
  )
    fail("Expected listening database project is unavailable.");
  url.searchParams.set("connection_limit", "1");
  url.searchParams.set("pool_timeout", "60");
  return url.toString();
}
export function parseListeningStyleArgs(args: string[]) {
  let stage: string | undefined,
    snapshots: string | undefined,
    apply = false,
    help = false;
  let archiveRoot = resolve("output/listening-assessments"),
    workspaceRoot = resolve(".");
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--apply") apply = true;
    else if (args[i] === "--help") help = true;
    else if (
      ["--archive-root", "--workspace-root", "--snapshots"].includes(args[i])
    ) {
      const option = args[i],
        value = args[++i];
      if (!value || value.startsWith("--"))
        fail("Operator path option requires a value.");
      if (option === "--archive-root") archiveRoot = resolve(value);
      else if (option === "--workspace-root") workspaceRoot = resolve(value);
      else snapshots = resolve(value);
    } else if (!stage && !args[i].startsWith("--")) stage = resolve(args[i]);
    else fail("Unknown style adoption option.");
  }
  if (!help && (!stage || !snapshots))
    fail("A prepared stage and saved snapshots are required.");
  return { stage, snapshots, archiveRoot, workspaceRoot, apply, help };
}
if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  let database: PrismaClient | undefined;
  try {
    const options = parseListeningStyleArgs(process.argv.slice(2));
    if (options.help)
      console.log(
        "apply-listening-style.mts STAGE_PATH --snapshots FILE [--archive-root PATH] [--workspace-root PATH] [--apply]\nDefault: receipt verification and database READ ONLY. Apply preserves audio, source evidence, answers, IDs and all held items; edited, published or reviewed material is rejected.",
      );
    else {
      const loaded = await loadVerifiedListeningStyleStage(
        options.stage!,
        options.archiveRoot,
      );
      const backup = await loadListeningStyleSnapshot(
        options.snapshots!,
        options.workspaceRoot,
        loaded.sourceRecordId,
        loaded.audit.baselineSha256,
      );
      database = new PrismaClient({
        datasourceUrl: listeningStyleDatabaseUrl(
          process.env.DIRECT_URL || process.env.DATABASE_URL,
        ),
      });
      console.log(
        JSON.stringify(
          await applyListeningStyle(database, loaded, backup, {
            actor: { kind: "teacher", userId: OWNER_ID },
            apply: options.apply,
          }),
        ),
      );
    }
  } catch (error) {
    console.error(
      error instanceof ListeningStyleAdoptionError
        ? error.message
        : "Style adoption failed receipt validation, snapshot matching or database access.",
    );
    process.exitCode = 1;
  } finally {
    await database?.$disconnect();
  }
}
