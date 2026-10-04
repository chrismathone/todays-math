import { createRequire } from "node:module";
import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
import type { ListeningDraft } from "../../src/contracts/englishListeningHttp.contract";
import type { ListeningMediaCompletion } from "../../src/contracts/englishListeningMedia.contract";
import type { VerifiedListeningM4aPlayback } from "../../src/lib/english/listening/media/trustedM4a";
const require = createRequire(import.meta.url);
const { createListeningRuntime } =
  require("../../src/lib/english/listening/runtime/service") as typeof import("../../src/lib/english/listening/runtime/service");
const { registerStorageListeningAsset } =
  require("../../src/lib/english/listening/runtime/storageAssets") as typeof import("../../src/lib/english/listening/runtime/storageAssets");
const { createListeningStorageApi, readListeningStorageConfig } =
  require("../../src/lib/english/listening/media/storageApi") as typeof import("../../src/lib/english/listening/media/storageApi");
const { createListeningMediaService } =
  require("../../src/lib/english/listening/media/service") as typeof import("../../src/lib/english/listening/media/service");
const { PrismaStorageListeningMediaStore } =
  require("../../src/lib/english/listening/media/storageStore") as typeof import("../../src/lib/english/listening/media/storageStore");
const { validateListeningDriveMp3 } =
  require("../../src/lib/english/listening/runtime/driveAssets") as typeof import("../../src/lib/english/listening/runtime/driveAssets");
const { prepareListeningM4aPlayback } =
  require("../../src/lib/english/listening/media/trustedM4a") as typeof import("../../src/lib/english/listening/media/trustedM4a");
const { createListeningMediaAccess } =
  require("../../src/lib/english/listening/runtime/mediaAccess") as typeof import("../../src/lib/english/listening/runtime/mediaAccess");
const { listeningCreateSetSchema, listeningUpdateSetSchema } =
  require("../../src/contracts/englishListeningHttp.contract") as typeof import("../../src/contracts/englishListeningHttp.contract");
const ownerId = "6f361696-5eb5-4f7d-9c66-9313ad7bb06a";
const actor = { kind: "teacher" as const, userId: ownerId };
const digest = (b: Uint8Array | string) =>
  createHash("sha256").update(b).digest("hex");
const sourceId = process.argv[2] ?? "ebs-middle-1-2026-2";
if (!/^(ebs|ebsi)-(middle|high)-[1-3]-\d{4}-(1|2|09-mock)$/.test(sourceId))
  throw Error("Invalid source identity");
const sourceRoot = resolve("output/listening-assessments");
let raw: string | undefined;
for (const directory of [
  "prepared-reconstructed-registration",
  "prepared-registration",
  "prepared-historical-registration",
]) {
  try {
    raw = await readFile(
      resolve(sourceRoot, directory, sourceId + ".json"),
      "utf8",
    );
    break;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
if (!raw) throw Error("Prepared source not found");
const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);
const payload = z
  .object({
    schemaVersion: z.literal(1),
    sourceRecordId: z.string(),
    sourcePage: z.url(),
    audioFilePath: z.string(),
    createInput: listeningCreateSetSchema,
    editableInput: listeningUpdateSetSchema.omit({ expectedRevision: true }),
    sourceFiles: z
      .array(
        z.object({
          kind: z.string(),
          path: z.string(),
          bytes: z.number().int().positive(),
          sha256: hashSchema,
          contentType: z.string().optional(),
          detectedContentType: z.string().optional(),
        }),
      )
      .min(1),
    verification: z.object({
      answersOneBased: z.record(z.string(), z.number().int().min(1).max(5)),
      cropHashes: z.array(
        z.object({
          number: z.number().optional(),
          sourceNumber: z.number().optional(),
          sha256: hashSchema,
        }),
      ),
      originalDocumentsMissing: z.boolean().optional(),
    }),
  })
  .parse(JSON.parse(raw));
if (
  payload.sourceRecordId !== sourceId ||
  payload.editableInput.groups.length !== 1
)
  throw Error("Prepared source identity mismatch");
for (const q of payload.editableInput.groups[0].questions) {
  if (
    !q.sourceNumber ||
    !q.metadata ||
    !["official_original", "audio_reconstructed"].includes(q.metadata.origin) ||
    q.audioRange ||
    q.metadata.sourceAudioSha256 !==
      payload.sourceFiles.find((f) => f.kind === "audio")?.sha256
  )
    throw Error("Unverified question provenance");
  const answer = q.choices.findIndex((c) => c.id === q.answerChoiceId) + 1;
  if (answer !== payload.verification.answersOneBased[q.sourceNumber])
    throw Error("Official answer mismatch");
  if (q.metadata.origin === "official_original") {
    if (!q.image || payload.verification.originalDocumentsMissing)
      throw Error("Missing original question proof");
    const proof = payload.verification.cropHashes.find(
      (x) => x.number === q.sourceNumber || x.sourceNumber === q.sourceNumber,
    );
    const indexedProof =
      proof ?? payload.verification.cropHashes[q.sourceNumber - 1];
    if (
      !indexedProof ||
      digest(Buffer.from(q.image.dataUrl.split(",")[1], "base64")) !==
        indexedProof.sha256
    )
      throw Error("Original crop mismatch");
  } else if (
    !payload.verification.originalDocumentsMissing ||
    !q.metadata.reconstruction
  )
    throw Error("Missing audio reconstruction proof");
}
for (const f of payload.sourceFiles) {
  if (relative(sourceRoot, resolve(f.path)).startsWith(".."))
    throw Error("Source path outside archive");
  if (digest(await readFile(f.path)) !== f.sha256)
    throw Error("Original source hash mismatch");
}
const audio = payload.sourceFiles.find((f) => f.kind === "audio");
if (!audio || audio.path !== payload.audioFilePath)
  throw Error("Audio path mismatch");
const audioBytes = await readFile(audio.path);
let playbackDerivative: VerifiedListeningM4aPlayback | undefined;
const detectedMime =
  audio.detectedContentType ?? audio.contentType ?? "audio/mpeg";
if (detectedMime === "audio/mpeg") {
  await validateListeningDriveMp3(audioBytes);
} else if (detectedMime === "audio/mp4") {
  const flag = process.argv.indexOf("--ffmpeg-path");
  const ffmpegPath =
    flag >= 0
      ? process.argv[flag + 1]
      : process.env.LISTENING_IMPORT_FFMPEG_PATH;
  if (!ffmpegPath)
    throw Error(
      "M4A preflight requires --ffmpeg-path or LISTENING_IMPORT_FFMPEG_PATH",
    );
  const prepared = await prepareListeningM4aPlayback({
    sourcePath: resolve(audio.path),
    ffmpegPath: resolve(ffmpegPath),
  });
  if (!prepared.sourceBytes.equals(audioBytes))
    throw Error("Original M4A changed during preflight");
  playbackDerivative = prepared.playbackDerivative;
} else throw Error("Unsupported original audio format");
if (!process.argv.includes("--apply")) {
  console.log(
    `${sourceId}: read-only preflight passed, ${payload.editableInput.groups[0].questions.length} questions, ${audio.bytes}B audio`,
  );
  process.exit(0);
}
const config = readListeningStorageConfig();
if (!config || config.url !== "https://jyaguxwuaxgdnovtulna.supabase.co")
  throw Error("Expected Storage project unavailable");
const storage = createListeningStorageApi(config);
const databaseUrl = new URL(process.env.DATABASE_URL ?? "");
if (
  decodeURIComponent(databaseUrl.username) !== "postgres.jyaguxwuaxgdnovtulna"
)
  throw Error("Expected todays-math DB project unavailable");
databaseUrl.searchParams.set("connection_limit", "2");
databaseUrl.searchParams.set("pool_timeout", "60");
const db = new PrismaClient({ datasourceUrl: databaseUrl.toString() });
const runtime = createListeningRuntime(db, undefined, { storage });
const media = createListeningMediaService({
  store: new PrismaStorageListeningMediaStore(db, storage),
  storage,
  ...createListeningMediaAccess(db),
});
const checkpointDirectory = resolve(sourceRoot, "storage-registration");
await mkdir(checkpointDirectory, { recursive: true });
const checkpointPath = resolve(checkpointDirectory, sourceId + ".json");
let checkpoint: {
  sourceRecordId: string;
  ownerId: string;
  assetId: string;
  originalSha256: string;
  setId?: string;
  completion?: ListeningMediaCompletion;
  verifiedAt?: string;
  questionCount?: number;
  playbackVerified?: boolean;
  payloadSha256?: string;
  questionStatus?: string;
};
try {
  checkpoint = JSON.parse(await readFile(checkpointPath, "utf8"));
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  checkpoint = {
    sourceRecordId: sourceId,
    ownerId,
    assetId: randomUUID(),
    originalSha256: audio.sha256,
  };
}
const save = async () => {
  await writeFile(checkpointPath + ".tmp", JSON.stringify(checkpoint, null, 2));
  await rename(checkpointPath + ".tmp", checkpointPath);
};
try {
  const [capacity] = await db.$queryRaw<{ bytes: string; read_only: string }[]>(
    Prisma.sql`SELECT pg_database_size(current_database())::text AS bytes, current_setting('default_transaction_read_only') AS read_only`,
  );
  if (
    capacity.read_only !== "off" ||
    Number(capacity.bytes) +
      Buffer.byteLength(JSON.stringify(payload.editableInput)) * 2 >
      6 * 1024 ** 3
  )
    throw Error("Insufficient DB metadata headroom");
  await runtime.teacherBank(actor, "bank", { limit: 1 });
  const rows = await db.$queryRaw<{ id: string }[]>(
    Prisma.sql`SELECT id::text FROM english_listening_set WHERE owner_id=${ownerId}::uuid AND deleted_at IS NULL AND document->>'level'=${payload.createInput.level} AND document->'source'=${JSON.stringify(payload.createInput.source)}::jsonb`,
  );
  if (rows.length > 1) throw Error("Ambiguous source identity");
  const basis = `사용자 요청(2026-10-04)에 따른 비공개 자료은행 보관·교사 열람/재생. 공식 출처: ${payload.sourcePage}. 내용·음원·정렬의 사람 검수는 별도.`;
  let detail = rows.length
    ? await runtime.setDetail(actor, rows[0].id)
    : await runtime.createSet(actor, {
        ...payload.createInput,
        rights: {
          rightsStatus: "approved",
          allowedUses: ["store_original", "teacher_review"],
        },
        basis,
      });
  if (
    (checkpoint.setId && checkpoint.setId !== detail.id) ||
    checkpoint.ownerId !== ownerId ||
    checkpoint.originalSha256 !== audio.sha256
  )
    throw Error("Checkpoint scope mismatch");
  checkpoint.setId = detail.id;
  await save();
  if (!detail.document.rightsReview)
    detail = await runtime.reviewSet(actor, detail.id, {
      expectedRevision: detail.revision,
      kind: "rights",
      basis,
    });
  console.log(`${sourceId}: private Storage upload, ${audio.bytes}B`);
  const completion = await registerStorageListeningAsset(db, storage, {
    actor,
    setId: detail.id,
    expectedSetRevision: detail.revision,
    assetId: checkpoint.assetId,
    bytes: audioBytes,
    ...(playbackDerivative ? { playbackDerivative } : {}),
  });
  if (completion.state !== "ready" || !completion.playbackBytes)
    throw Error("Full decode and ready playback are required");
  checkpoint.completion = completion;
  await save();
  detail = await runtime.setDetail(actor, detail.id);
  const oldQuestions = detail.document.groups.flatMap((g) => g.questions);
  const contentWithoutMetadata = (
    q: ListeningDraft["groups"][number]["questions"][number],
  ) => {
    const { metadata, ...content } = q;
    void metadata;
    return JSON.stringify(content);
  };
  if (
    oldQuestions.length &&
    (oldQuestions.length !== payload.editableInput.groups[0].questions.length ||
      oldQuestions.some(
        (q, i) =>
          contentWithoutMetadata(q) !==
          contentWithoutMetadata(payload.editableInput.groups[0].questions[i]),
      ))
  )
    throw Error("Existing questions differ; preserve user edits");
  const alreadyAttached =
    detail.document.groups.length === 1 &&
    detail.document.groups[0].audio?.assetId === completion.assetId &&
    JSON.stringify(oldQuestions) ===
      JSON.stringify(payload.editableInput.groups[0].questions);
  if (!alreadyAttached) {
    if (
      detail.publications.length ||
      detail.document.groups.some(
        (g) => g.reviews.content || g.reviews.audio || g.reviews.alignment,
      )
    )
      throw Error("Preserve published or human reviewed material");
    detail = await runtime.updateSet(actor, detail.id, {
      ...payload.editableInput,
      groups: payload.editableInput.groups.map((g) => ({
        ...g,
        audio: {
          assetId: completion.assetId,
          sha256: completion.sha256,
          durationMs: completion.durationMs,
        },
      })),
      rights: detail.document.rights,
      basis: detail.document.provenance.basis,
      expectedRevision: detail.revision,
    });
  }
  const head = await media.serve(
    { actor },
    { setId: detail.id, assetId: completion.assetId, method: "HEAD" },
  );
  if (
    head.status !== 200 ||
    head.headers.get("Content-Type") !== "audio/mpeg" ||
    Number(head.headers.get("Content-Length")) !== completion.playbackBytes
  )
    throw Error("Private playback HEAD mismatch");
  const range = await media.serve(
    { actor },
    {
      setId: detail.id,
      assetId: completion.assetId,
      method: "GET",
      range: "bytes=0-127",
    },
  );
  if (range.status !== 206 || (await range.arrayBuffer()).byteLength !== 128)
    throw Error("Private playback range mismatch");
  const full = await media.serve(
    { actor },
    { setId: detail.id, assetId: completion.assetId, method: "GET" },
  );
  if (full.status !== 200 || !full.body) throw Error("Private playback failed");
  const hash = createHash("sha256");
  let bytes = 0;
  const reader = full.body.getReader();
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      hash.update(item.value);
      bytes += item.value.length;
    }
  } finally {
    reader.releaseLock();
  }
  if (
    bytes !== completion.playbackBytes ||
    hash.digest("hex") !== completion.sha256
  )
    throw Error("Playback bytes changed");
  await runtime.composeSource(actor, detail.id);
  checkpoint.verifiedAt = new Date().toISOString();
  checkpoint.questionCount = payload.editableInput.groups[0].questions.length;
  checkpoint.playbackVerified = true;
  checkpoint.payloadSha256 = digest(raw);
  checkpoint.questionStatus = checkpoint.questionCount
    ? "registered"
    : "pending_audio_reconstruction";
  await save();
  console.log(
    `${sourceId}: registered, ${checkpoint.questionCount} questions, native playback verified`,
  );
} finally {
  await db.$disconnect();
}
