/** Append AI scripts in the correct private project; original documents stay byte-for-byte equivalent. */
import { Prisma, PrismaClient } from "@prisma/client";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { parseArgs } from "node:util";
import { buildTranscriptPlan, requireProof } from "./import-plan.mjs";
import { fileSha256 } from "./client.mjs";
import { valueSha256 } from "../admission-plan.mjs";

interface OriginalAudio {
  assetId: string;
  sha256: string;
  durationMs: number;
}
interface CurrentSource {
  sourceRecordId: string;
  setId: string;
  ownerId: string;
  revision: number;
  document: unknown;
  documentSha256: string;
  assetSha256: string;
  audio: OriginalAudio;
}
interface InventorySource {
  sourceRecordId: string;
  setId: string;
  sourceAudioSha256: string;
}
interface OriginalSet {
  id: string;
  owner_id: string;
  branch_id: string | null;
  deleted_at: Date | null;
  revision: number;
  document: unknown;
}
interface OriginalAsset {
  assetId: string;
  state: string;
  record: {
    assetId?: string;
    sourceClip?: unknown;
    ownerId?: string;
    branchId?: string | null;
    setId?: string;
    expectedSha256?: string;
    completion?: { sha256?: string; durationMs?: number };
  };
}
interface PlannedTranscript {
  setId: string;
  assetId: string;
  ownerId: string;
  sourceRecordId: string;
  sourceAudioSha256: string;
  playbackSha256: string;
  durationMs: number;
  provider: string;
  profile: string;
  model: string;
  providerTranscriptId: string;
  text: string;
  displayText: string;
  timingQuality: unknown;
  words: unknown;
  requestConfig: unknown;
  rawResponseSha256: string;
  reviewStatus: string;
  generatedAt: string;
}
interface TranscriptDbRow {
  id: string;
  set_id: string;
  asset_id: string;
  owner_id: string;
  source_audio_sha256: string;
  playback_sha256: string;
  duration_ms: number;
  provider: string;
  profile: string;
  model: string;
  provider_transcript_id: string;
  text: string;
  display_text: string;
  timing_quality: unknown;
  words: unknown;
  request_config: unknown;
  raw_response_sha256: string;
  review_status: string;
  generated_at: Date;
}
interface Receipt {
  sourceRecordId: string;
  profile: string;
  providerTranscriptId: string;
  id: string;
  inserted: boolean;
  unchangedOriginalDocument: boolean;
}

const require = createRequire(import.meta.url);
const {
  teacher,
  lock,
} = require("../../../../../src/lib/english/listening/runtime/database");
const { values } = parseArgs({
  options: {
    inventory: { type: "string" },
    baseline: { type: "string" },
    "baseline-sha256": { type: "string" },
    transcripts: { type: "string" },
    owner: { type: "string" },
    apply: { type: "boolean", default: false },
  },
});
requireProof(
  values.inventory &&
    values.baseline &&
    values["baseline-sha256"] &&
    values.transcripts &&
    values.owner,
  "Explicit immutable original-source baseline, transcript directory and teacher owner required",
);
const inventoryPath = resolve(values.inventory!),
  baselinePath = resolve(values.baseline!);
requireProof(
  (await fileSha256(baselinePath)) === values["baseline-sha256"],
  "Current baseline proof changed",
);
const inventory = JSON.parse(await readFile(inventoryPath, "utf8")) as {
  records: InventorySource[];
};
const baseline = JSON.parse(await readFile(baselinePath, "utf8")) as {
  ownerId: string;
  project: string;
  records: CurrentSource[];
};
requireProof(baseline.ownerId === values.owner, "Wrong source teacher owner");
const plan = (await buildTranscriptPlan({
  inventory,
  baseline,
  directory: resolve(values.transcripts!),
})) as {
  rows: PlannedTranscript[];
  counts: Record<string, number>;
  references: unknown[];
};
const original = new Map<string, CurrentSource>(
  baseline.records.map((source) => [source.setId, source]),
);
const inventorySources = new Map<string, InventorySource>(
  inventory.records.map((source) => [source.setId, source]),
);
const mediaPath = resolve(
  ".qa-artifacts/whole-audio-seek-20261005/media-bindings.json",
);
requireProof(
  (await fileSha256(mediaPath)) ===
    "289ac96ca3ff5e57e4edb46dfba9f04bbda8f19bdbf6d2d15f7a8e73cb4c71a7",
  "Original media binding changed",
);
const media = JSON.parse(await readFile(mediaPath, "utf8")) as {
  proofs: { setId: string; recordSha256: string }[];
};
const mediaBySet = new Map(
  media.proofs.map((source) => [source.setId, source]),
);
let url: URL;
try {
  url = new URL(process.env.DIRECT_URL ?? "");
} catch {
  throw new Error("DB configuration is missing");
}
requireProof(
  (decodeURIComponent(url.username) === "postgres.jyaguxwuaxgdnovtulna" &&
    url.hostname.endsWith(".pooler.supabase.com")) ||
    (url.hostname === "db.jyaguxwuaxgdnovtulna.supabase.co" &&
      url.username === "postgres"),
  "Wrong target DB project",
);
url.searchParams.set("connection_limit", "1");
url.searchParams.set("pool_timeout", "60");
const db = new PrismaClient({
  datasources: { db: { url: url.toString() } },
  log: [],
});
const output = resolve(
  ".qa-artifacts/assemblyai-seek-20261005",
  "adoption-" + new Date().toISOString().replace(/[:.]/g, "-"),
);
await mkdir(output, { recursive: true });
const receipts: Receipt[] = [];

function checkSource(
  set: OriginalSet | undefined,
  asset: OriginalAsset | undefined,
  expected: CurrentSource,
) {
  const source = inventorySources.get(expected.setId),
    binding = mediaBySet.get(expected.setId);
  requireProof(
    set &&
      set.owner_id === values.owner &&
      set.branch_id === null &&
      !set.deleted_at &&
      set.revision === expected.revision &&
      valueSha256(set.document) === expected.documentSha256 &&
      isDeepStrictEqual(set.document, expected.document),
    "Current source document or ownership differs: " + expected.sourceRecordId,
  );
  const record = asset?.record;
  requireProof(
    asset &&
      asset.state === "ready" &&
      record?.assetId === expected.audio.assetId &&
      !record.sourceClip &&
      record.ownerId === values.owner &&
      record.branchId === null &&
      record.setId === set?.id &&
      record.expectedSha256 === source?.sourceAudioSha256 &&
      record.completion?.sha256 === expected.audio.sha256 &&
      record.completion?.durationMs === expected.audio.durationMs &&
      valueSha256(record) === binding?.recordSha256 &&
      valueSha256(record) === expected.assetSha256,
    "Immutable whole-original audio differs: " + expected.sourceRecordId,
  );
}
async function verifyEntireSourceScope() {
  return db.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      await teacher(tx, { kind: "teacher", userId: values.owner }, "materials");
      const ids = [...original.keys()];
      const sets = await tx.$queryRaw<OriginalSet[]>(
        Prisma.sql`SELECT id,owner_id,branch_id,deleted_at,revision,document FROM english_listening_set WHERE id::text IN (${Prisma.join(ids)})`,
      );
      const assets = await tx.$queryRaw<OriginalAsset[]>(
        Prisma.sql`SELECT "assetId",state,record FROM english_listening_media_asset WHERE "assetId"::text IN (${Prisma.join(baseline.records.map((source) => source.audio.assetId))})`,
      );
      requireProof(
        sets.length === 193 && assets.length === 193,
        "Original source population changed",
      );
      const byAsset = new Map(assets.map((asset) => [asset.assetId, asset]));
      for (const set of sets) {
        const expected = original.get(set.id)!;
        checkSource(set, byAsset.get(expected.audio.assetId), expected);
      }
      return {
        sources: sets.length,
        unchangedOriginalDocumentsAndAssets: true,
        existingStarts: 2727,
      };
    },
    { timeout: 30000 },
  );
}
function dbPayload(row: PlannedTranscript) {
  return Object.fromEntries(
    Object.entries(row).filter(([key]) => key !== "sourceRecordId"),
  );
}
function fromDatabase(row: TranscriptDbRow) {
  return {
    setId: row.set_id,
    assetId: row.asset_id,
    ownerId: row.owner_id,
    sourceAudioSha256: row.source_audio_sha256,
    playbackSha256: row.playback_sha256,
    durationMs: row.duration_ms,
    provider: row.provider,
    profile: row.profile,
    model: row.model,
    providerTranscriptId: row.provider_transcript_id,
    text: row.text,
    displayText: row.display_text,
    timingQuality: row.timing_quality,
    words: row.words,
    requestConfig: row.request_config,
    rawResponseSha256: row.raw_response_sha256,
    reviewStatus: row.review_status,
    generatedAt: new Date(row.generated_at).toISOString(),
  };
}
try {
  const before = await verifyEntireSourceScope();
  await writeFile(
    resolve(output, "plan.json"),
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        counts: plan.counts,
        inventory: {
          path: inventoryPath,
          sha256: await fileSha256(inventoryPath),
        },
        baseline: { path: baselinePath, sha256: values["baseline-sha256"] },
        references: plan.references,
        writesStorage: false,
        modifiesOriginalDocuments: false,
        modifiesOriginalAudio: false,
      },
      null,
      2,
    ) + "\n",
  );
  if (values.apply) {
    for (const row of plan.rows) {
      const receipt = await db.$transaction(
        async (tx) => {
          await teacher(
            tx,
            { kind: "teacher", userId: values.owner },
            "materials",
          );
          await lock(tx, "source-transcript:" + row.setId);
          const sets = await tx.$queryRaw<OriginalSet[]>(
            Prisma.sql`SELECT id,owner_id,branch_id,deleted_at,revision,document FROM english_listening_set WHERE id=${row.setId}::uuid FOR SHARE`,
          );
          const assets = await tx.$queryRaw<OriginalAsset[]>(
            Prisma.sql`SELECT "assetId",state,record FROM english_listening_media_asset WHERE "assetId"=${row.assetId}::uuid FOR SHARE`,
          );
          checkSource(sets[0], assets[0], original.get(row.setId)!);
          const inserted =
            await tx.$executeRaw(Prisma.sql`INSERT INTO english_listening_source_transcript
          (set_id,asset_id,owner_id,source_audio_sha256,playback_sha256,duration_ms,provider,profile,model,provider_transcript_id,text,display_text,timing_quality,words,request_config,raw_response_sha256,review_status,generated_at)
          VALUES (${row.setId}::uuid,${row.assetId}::uuid,${row.ownerId}::uuid,${row.sourceAudioSha256},${row.playbackSha256},${row.durationMs},
          ${row.provider},${row.profile},${row.model},${row.providerTranscriptId},${row.text},${row.displayText},${JSON.stringify(row.timingQuality)}::jsonb,${JSON.stringify(row.words)}::jsonb,
          ${JSON.stringify(row.requestConfig)}::jsonb,${row.rawResponseSha256},${row.reviewStatus},${row.generatedAt}::timestamptz)
          ON CONFLICT (provider_transcript_id) DO NOTHING`);
          const readback = await tx.$queryRaw<TranscriptDbRow[]>(
            Prisma.sql`SELECT * FROM english_listening_source_transcript WHERE provider_transcript_id=${row.providerTranscriptId}`,
          );
          requireProof(
            readback.length === 1 &&
              isDeepStrictEqual(fromDatabase(readback[0]), dbPayload(row)),
            "Inserted script readback differs",
          );
          return {
            sourceRecordId: row.sourceRecordId,
            profile: row.profile,
            providerTranscriptId: row.providerTranscriptId,
            id: readback[0].id,
            inserted: inserted === 1,
            unchangedOriginalDocument: true,
          };
        },
        { timeout: 30000 },
      );
      receipts.push(receipt);
      await writeFile(
        resolve(output, "receipts.json"),
        JSON.stringify(receipts, null, 2) + "\n",
      );
      if (receipts.length % 20 === 0)
        console.log(
          JSON.stringify({
            phase: "registered",
            transcripts: receipts.length,
            total: plan.rows.length,
          }),
        );
    }
  }
  const after = await verifyEntireSourceScope();
  const rows = await db.$queryRaw<TranscriptDbRow[]>(
    Prisma.sql`SELECT * FROM english_listening_source_transcript WHERE provider_transcript_id IN (${Prisma.join(plan.rows.map((row) => row.providerTranscriptId))})`,
  );
  const byId = new Map(rows.map((row) => [row.provider_transcript_id, row]));
  for (const row of plan.rows)
    if (byId.has(row.providerTranscriptId))
      requireProof(
        isDeepStrictEqual(
          fromDatabase(byId.get(row.providerTranscriptId)!),
          dbPayload(row),
        ),
        "Full script library readback differs",
      );
  if (values.apply)
    requireProof(
      rows.length === 386,
      "Incomplete registered source transcript library",
    );
  const report = {
    checkedAt: new Date().toISOString(),
    project: baseline.project,
    ownerId: values.owner,
    writesDatabase: values.apply,
    writesStorage: false,
    modifiesOriginalDocuments: false,
    modifiesOriginalAudio: false,
    counts: plan.counts,
    registeredTranscripts: rows.length,
    newlyInserted: receipts.filter((row) => row.inserted).length,
    humanReviewed: false,
    label: "AI 음성 전사 · 미검수",
    before,
    after,
    receipts,
    output,
  };
  await writeFile(
    resolve(output, "report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      output,
      project: report.project,
      counts: report.counts,
      registeredTranscripts: rows.length,
      newlyInserted: report.newlyInserted,
      writesDatabase: values.apply,
      writesStorage: false,
      unchangedOriginalDocumentsAndAssets: true,
    }),
  );
} catch (error) {
  await writeFile(
    resolve(output, "failure.json"),
    JSON.stringify(
      {
        failed: true,
        receipts,
        message: error instanceof Error ? error.message : "unknown",
      },
      null,
      2,
    ) + "\n",
  );
  console.error(
    "AI transcript registration failed: " +
      (error instanceof Error ? error.message : "unknown"),
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
