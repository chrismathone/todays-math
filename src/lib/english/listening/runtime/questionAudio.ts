/** Trusted operator import: verified whole-source decoding, resumable private chunks, atomic final set update. */
import "server-only";
import { createHash } from "node:crypto";
import { open, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import {
  listeningDraftSchema,
  listeningUpdateSetSchema,
  type ListeningDraft,
} from "@/contracts/englishListeningHttp.contract";
import { listeningMediaCompletionSchema } from "@/contracts/englishListeningMedia.contract";
import { freezeListeningValue, listeningValueHash } from "../publication";
import { usesWholeSourceAssessmentAudio } from "../wholeSource";
import { decodeListeningMp3Pcm } from "../media/mp3Clip";
import { MAX_DURATION_MS, MAX_ORIGINAL_BYTES, parseMp3 } from "../media/mp3";
import { inspectListeningMedia } from "../media/inspect";
import { prepareListeningM4aPlayback } from "../media/trustedM4a";
import {
  planListeningSampleClip,
  listeningSampleClipSha256,
  type ListeningPcmSource,
} from "../media/sampleClip";
import { PrismaStorageListeningMediaStore } from "../media/storageStore";
import {
  LISTENING_BOUNDARY_POLICY,
  measureListeningBoundaryQuiet,
  type ListeningBoundaryMeasurement,
} from "../media/audioBoundary";
import { createListeningMediaService } from "../media/service";
import { assertListeningStorageQuota } from "../media/storageQuota";
import type { ListeningMediaRecord } from "../media/store";
import type { ListeningStorageApi } from "../media/storageApi";
import { createListeningMediaAccess } from "./mediaAccess";
import {
  audit,
  denied,
  expected,
  json,
  lock,
  one,
  ownedSet,
  teacher,
  type ListeningActor,
  type ListeningTx,
} from "./database";
import { updateSet, verifiedMedia } from "./sets";
import {
  listeningQuestionAudioActivitySchema,
  listeningQuestionAudioRawActivitySchema,
  listeningQuestionAudioAlignmentSchema,
  listeningQuestionAudioAsrSchema,
  listeningQuestionAudioKoreanAsrSchema,
  listeningQuestionAudioScriptSchema,
  listeningQuestionAudioSnapshotSchema,
  questionAudioSha256,
  questionAudioSourceIdSchema,
  verifyQuestionAudioEvidence,
  type QuestionAudioSnapshot,
} from "../questionAudioProof";

const chunkBytes = 1024 * 1024;
const proofPolicy = "complete-source-positional-anchors-native-quiet-v2";
const readyPlans = new WeakSet<object>();
function fail(message: string): never {
  throw Error("Question audio import: " + message);
}
async function inside(root: string, path: string) {
  if (!isAbsolute(path)) fail("artifact paths must be absolute");
  const actual = await realpath(path),
    rel = relative(root, actual);
  if (
    !rel ||
    rel === ".." ||
    rel.startsWith("../") ||
    rel.startsWith("..\\") ||
    isAbsolute(rel)
  )
    fail("artifact outside archive");
  return actual;
}
async function read(path: string, limit: number) {
  const handle = await open(path, "r");
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size < 1 || stat.size > limit)
      fail("artifact size invalid");
    const bytes = await handle.readFile();
    if (bytes.length !== stat.size || bytes.length > limit)
      fail("artifact changed while reading");
    return bytes;
  } finally {
    await handle.close();
  }
}
async function artifact(
  root: string,
  ref: { path: string; sha256: string },
  limit = 16 * chunkBytes,
) {
  const bytes = await read(await inside(root, ref.path), limit);
  if (questionAudioSha256(bytes) !== ref.sha256) fail("artifact hash differs");
  return bytes;
}
const preparedSchema = z.object({
  schemaVersion: z.literal(1),
  sourceRecordId: questionAudioSourceIdSchema,
  editableInput: listeningUpdateSetSchema.omit({ expectedRevision: true }),
  sourceFiles: z
    .array(
      z.object({
        kind: z.string(),
        path: z.string(),
        bytes: z.number().int().positive(),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
      }),
    )
    .min(1),
});
function stableId(identity: string) {
  const bytes = Buffer.from(questionAudioSha256(identity).slice(0, 32), "hex");
  bytes[6] = (bytes[6] & 15) | 0x80;
  bytes[8] = (bytes[8] & 63) | 0x80;
  const s = bytes.toString("hex");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}
export interface PreparedQuestionAudioPlan {
  snapshot: QuestionAudioSnapshot;
  planHash: string;
  originalQuestions: ListeningDraft["groups"][number]["questions"];
  source: ListeningPcmSource;
  sourcePlaybackSha256: string;
  sourceWaveSha256: string;
  sourceAudioSha256: string;
  sourceTranscriptSha256: string;
  groups: {
    questionIds: string[];
    sourceNumbers: number[];
    groupId: string;
    assetId: string;
    transcript: string;
    leadingSilenceMs: number;
    trailingSilenceMs: number;
    vadLeadingPadMs: number;
    vadTrailingPadMs: number;
    boundary: ListeningBoundaryMeasurement;
    sha256: string;
    clip: ReturnType<typeof planListeningSampleClip>;
  }[];
  dispose(): Promise<void>;
}
/** Exact raw artifact hashes are checked before any database or Storage call. */
export async function loadListeningQuestionAudioPlan(
  archiveRoot: string,
  sourceRecordId: string,
  options: { ffmpegPath?: string; signal?: AbortSignal } = {},
): Promise<PreparedQuestionAudioPlan> {
  questionAudioSourceIdSchema.parse(sourceRecordId);
  const root = await realpath(resolve(archiveRoot));
  const raw = await read(
    await inside(
      root,
      resolve(root, "prepared-question-audio", sourceRecordId + ".json"),
    ),
    16 * chunkBytes,
  );
  const snapshot = listeningQuestionAudioSnapshotSchema.parse(
    JSON.parse(raw.toString("utf8")),
  );
  if (snapshot.sourceRecordId !== sourceRecordId)
    fail("selected source differs");
  const alignment = listeningQuestionAudioAlignmentSchema.parse(
    JSON.parse((await artifact(root, snapshot.alignment)).toString("utf8")),
  );
  if (alignment.sourceRecordId !== sourceRecordId)
    fail("alignment source differs");
  const original = preparedSchema.parse(
    JSON.parse((await artifact(root, alignment.prepared)).toString("utf8")),
  );
  const originalPath = await inside(root, alignment.prepared.path);
  const canonical = await Promise.all(
    [
      "prepared-registration",
      "prepared-historical-registration",
      "prepared-reconstructed-registration",
    ].map(async (folder) => {
      try {
        return await realpath(resolve(root, folder, sourceRecordId + ".json"));
      } catch {
        return null;
      }
    }),
  );
  if (
    !canonical.includes(originalPath) ||
    original.sourceRecordId !== sourceRecordId
  )
    fail("prepared source location or identity differs");
  const script = listeningQuestionAudioScriptSchema.parse(
    JSON.parse(
      (await artifact(root, alignment.officialScript)).toString("utf8"),
    ),
  );
  const activity = listeningQuestionAudioActivitySchema.parse(
    JSON.parse((await artifact(root, alignment.activity)).toString("utf8")),
  );
  const rawActivity = listeningQuestionAudioRawActivitySchema.parse(
    JSON.parse((await artifact(root, activity.rawArtifact)).toString("utf8")),
  );
  const asr = {
    auto: listeningQuestionAudioAsrSchema.parse(
      JSON.parse((await artifact(root, alignment.asr.auto)).toString("utf8")),
    ),
    english: listeningQuestionAudioAsrSchema.parse(
      JSON.parse(
        (await artifact(root, alignment.asr.english)).toString("utf8"),
      ),
    ),
    ...(alignment.asr.korean
      ? {
          korean: listeningQuestionAudioKoreanAsrSchema.parse(
            JSON.parse(
              (await artifact(root, alignment.asr.korean)).toString("utf8"),
            ),
          ),
        }
      : {}),
  };
  if (asr.korean) {
    const rawActivity = JSON.parse(
      (
        await artifact(root, {
          path: asr.korean.activityPath,
          sha256: asr.korean.activitySha256,
        })
      ).toString("utf8"),
    );
    if (
      rawActivity.sourceAudioSha256 !== activity.sourceAudioSha256 ||
      rawActivity.decodedSampleCount !== activity.decodedSampleCount ||
      rawActivity.sampleRate !== 16000 ||
      !Array.isArray(rawActivity.chunks) ||
      rawActivity.chunks.length !== activity.events.length ||
      activity.events.some(
        (event, i) =>
          rawActivity.chunks[i].startSample !== event.startSample ||
          rawActivity.chunks[i].endSample !== event.endSample,
      )
    )
      fail("announcement raw VAD activity differs");
  }
  const derivedAsrOrigins: Record<
    string,
    z.infer<typeof listeningQuestionAudioAsrSchema>
  > = {};
  for (const file of [asr.auto, asr.english])
    for (const ref of file.derivedFrom ?? []) {
      const rawOrigin = listeningQuestionAudioAsrSchema.parse(
        JSON.parse((await artifact(root, ref)).toString("utf8")),
      );
      if (rawOrigin.derivedFrom) fail("recursive derived ASR is forbidden");
      derivedAsrOrigins[ref.sha256] = rawOrigin;
    }
  const originals = original.sourceFiles.filter((f) => f.kind === "audio"),
    transcripts = original.sourceFiles.filter((f) => f.kind === "transcript");
  if (
    originals.length !== 1 ||
    transcripts.length !== 1 ||
    originals[0].sha256 !== alignment.sourceAudio.sha256 ||
    (await inside(root, originals[0].path)) !==
      (await inside(root, alignment.sourceAudio.path)) ||
    transcripts[0].sha256 !== script.sourceTranscriptFileSha256 ||
    original.editableInput.groups.map((g) => g.transcript.text).join("\n") !==
      script.sourceTranscriptText
  )
    fail("original recording or official transcript identity differs");
  const transcript = await artifact(root, transcripts[0], 64 * chunkBytes);
  if (
    transcript.length !== transcripts[0].bytes ||
    transcript.subarray(0, 5).toString() !== "%PDF-"
  )
    fail("official transcript PDF differs");
  const proven = verifyQuestionAudioEvidence({
    alignment,
    script,
    activity,
    rawActivity,
    derivedAsrOrigins,
    asr,
  });
  const oldQuestions = original.editableInput.groups.flatMap(
    (g) => g.questions,
  );
  if (
    oldQuestions.length !== alignment.questions.length ||
    oldQuestions.some(
      (q, i) =>
        q.id !== alignment.questions[i].questionId ||
        q.sourceNumber !== alignment.questions[i].sourceNumber ||
        q.metadata?.sourceRecordId !== sourceRecordId ||
        q.metadata.sourceAudioSha256 !== alignment.sourceAudio.sha256,
    )
  )
    fail("complete original question order differs");
  const audio = await artifact(root, alignment.sourceAudio, MAX_ORIGINAL_BYTES);
  if (audio.length !== originals[0].bytes) fail("source byte length differs");
  let source: ListeningPcmSource,
    dispose: () => Promise<void>,
    sourcePlaybackSha256: string;
  const wave = inspectListeningMedia(
    audio.subarray(0, 44),
    audio.length,
    "audio/wav",
    MAX_DURATION_MS,
  );
  if (wave.playable) {
    const header = Buffer.from(audio.subarray(0, 44)),
      channels = header.readUInt16LE(22),
      sampleRate = header.readUInt32LE(24);
    source = {
      header,
      totalBytes: audio.length,
      channels,
      sampleRate,
      frameCount: (audio.length - 44) / (channels * 2),
      pcmSha256: questionAudioSha256(audio.subarray(44)),
      sourceDurationMs: wave.durationMs,
      async *readRange(start, end) {
        if (
          !Number.isSafeInteger(start) ||
          !Number.isSafeInteger(end) ||
          start < 0 ||
          start > end ||
          end > audio.length
        )
          fail("invalid PCM read range");
        for (let p = start; p < end; p += chunkBytes)
          yield audio.subarray(p, Math.min(end, p + chunkBytes));
      },
    };
    dispose = async () => {};
    sourcePlaybackSha256 = questionAudioSha256(audio);
  } else {
    let encoded: Buffer = audio;
    if (audio.subarray(4, 8).toString() === "ftyp") {
      if (!options.ffmpegPath)
        fail("M4A needs the existing trusted native conversion path");
      const converted = await prepareListeningM4aPlayback({
        sourcePath: await inside(root, alignment.sourceAudio.path),
        ffmpegPath: options.ffmpegPath,
        signal: options.signal,
      });
      if (
        questionAudioSha256(converted.sourceBytes) !==
        alignment.sourceAudio.sha256
      )
        fail("M4A changed during conversion");
      encoded = converted.playbackDerivative.bytes;
    }
    const parsed = parseMp3(encoded, MAX_DURATION_MS);
    sourcePlaybackSha256 = questionAudioSha256(
      encoded.subarray(parsed.audioStart, parsed.audioEnd),
    );
    const decoded = await decodeListeningMp3Pcm(encoded, options.signal);
    source = decoded;
    dispose = decoded.dispose;
  }
  try {
    if (
      Math.abs(
        activity.decodedSampleCount -
          Math.round((source.frameCount * 16000) / source.sampleRate),
      ) > 1
    )
      fail("VAD resampling frame identity differs");
    const waveHash = createHash("sha256");
    for await (const part of source.readRange(0, source.totalBytes))
      waveHash.update(part);
    const sourceWaveSha256 = waveHash.digest("hex");
    const planHash = listeningValueHash({
      version: 2,
      proofPolicy,
      boundaryPolicy: LISTENING_BOUNDARY_POLICY,
      snapshot,
      sourcePcmSha256: source.pcmSha256,
      sampleRate: source.sampleRate,
      channels: source.channels,
      frameCount: source.frameCount,
    });
    const groups = [];
    for (const group of proven) {
      const startFrame = Math.floor(
          (group.startSample * source.sampleRate) / 16000,
        ),
        endFrame = Math.ceil((group.endSample * source.sampleRate) / 16000);
      if (groups.length && startFrame < groups.at(-1)!.clip.endFrame)
        fail("native PCM clip ranges overlap");
      const clip = planListeningSampleClip(source, startFrame, endFrame),
        sha256 = await listeningSampleClipSha256(clip);
      const boundary = await measureListeningBoundaryQuiet(source, {
        startFrame,
        endFrame,
      });
      if (boundary.status !== "measured_quiet")
        fail(
          `native PCM boundary quiet is incomplete for questions ${group.questions.map((q) => q.sourceNumber).join(",")}: ${boundary.reasons.join(",")}`,
        );
      if (boundary.clipSha256 !== sha256)
        fail("native PCM boundary quiet bytes differ from the planned clip");
      freezeListeningValue(boundary);
      const identity = planHash + ":" + startFrame + ":" + endFrame;
      groups.push({
        questionIds: group.questions.map((q) => q.questionId),
        sourceNumbers: group.questions.map((q) => q.sourceNumber),
        groupId: stableId(identity + ":group"),
        assetId: stableId(identity + ":asset"),
        transcript: group.section.utterances.map((u) => u.text).join("\n"),
        leadingSilenceMs: boundary.leading.quietMs,
        trailingSilenceMs: boundary.trailing.quietMs,
        vadLeadingPadMs: group.leadingSilenceMs,
        vadTrailingPadMs: group.trailingSilenceMs,
        boundary,
        sha256,
        clip,
      });
    }
    const result = {
      snapshot,
      planHash,
      originalQuestions: oldQuestions,
      source,
      sourcePlaybackSha256,
      sourceWaveSha256,
      sourceAudioSha256: alignment.sourceAudio.sha256,
      sourceTranscriptSha256: script.sourceTranscriptSha256,
      groups,
      dispose,
    };
    freezeListeningValue(snapshot);
    freezeListeningValue(oldQuestions);
    for (const group of groups) {
      Object.freeze(group.questionIds);
      Object.freeze(group.sourceNumbers);
      Object.freeze(group.clip);
      Object.freeze(group);
    }
    Object.freeze(groups);
    Object.freeze(source);
    Object.freeze(result);
    readyPlans.add(result);
    return result;
  } catch (error) {
    await dispose();
    throw error;
  }
}

function clipIdentity(
  plan: PreparedQuestionAudioPlan,
  group: PreparedQuestionAudioPlan["groups"][number],
) {
  return {
    schemaVersion: 1 as const,
    planHash: plan.planHash,
    sourceAssetId: plan.snapshot.expectedSet.originalAssetId,
    sourcePcmSha256: plan.source.pcmSha256,
    sourcePlaybackSha256: plan.sourcePlaybackSha256,
    startFrame: group.clip.startFrame,
    endFrame: group.clip.endFrame,
    sampleRate: plan.source.sampleRate,
    channels: plan.source.channels,
  };
}
async function lockedSource(
  tx: ListeningTx,
  actor: ListeningActor,
  plan: PreparedQuestionAudioPlan,
) {
  await lock(tx, plan.snapshot.expectedSet.setId);
  const account = await teacher(tx, actor, "materials"),
    set = await ownedSet(tx, account, plan.snapshot.expectedSet.setId);
  const target = plan.snapshot.expectedSet;
  if (
    set.owner_id !== account.id ||
    account.id !== target.ownerId ||
    set.branch_id !== target.branchId
  )
    throw denied();
  if (usesWholeSourceAssessmentAudio(set.document))
    fail(
      "national listening and mock assessments require whole-source audio; question audio splitting is disabled (including dry runs)",
    );
  if (
    !set.document.rightsReview ||
    set.document.rights.rightsStatus !== "approved" ||
    !["store_original", "teacher_review"].every((use) =>
      set.document.rights.allowedUses.some((allowed) => allowed === use),
    )
  )
    throw denied();
  if (
    (await one(
      tx,
      Prisma.sql`SELECT id FROM english_listening_publication WHERE set_id=${set.id}::uuid LIMIT 1`,
    )) ||
    set.document.groups.some(
      (g) => g.reviews.content || g.reviews.audio || g.reviews.alignment,
    )
  )
    fail("published or human-reviewed source must be preserved");
  const finished = await one<{
    payload: { planHash: string; documentSha256: string; revision: number };
  }>(
    tx,
    Prisma.sql`SELECT payload FROM english_listening_audit WHERE resource_id=${set.id}::uuid AND kind='question_audio_split' AND payload->>'planHash'=${plan.planHash} ORDER BY created_at DESC LIMIT 1`,
  );
  if (
    finished &&
    finished.payload.documentSha256 === listeningValueHash(set.document) &&
    finished.payload.revision === set.revision
  ) {
    await originalPlayback(tx, set, plan);
    for (const group of plan.groups) {
      const ready = await verifiedMedia(tx, set, group.assetId);
      const stored = await one<{ record: ListeningMediaRecord }>(
        tx,
        Prisma.sql`SELECT record FROM english_listening_media_asset WHERE "assetId"=${group.assetId}::uuid`,
      );
      if (
        !stored?.record.storageChunks ||
        ready.sha256 !== group.sha256 ||
        ready.durationMs !== group.clip.durationMs ||
        stored.record.totalBytes !== group.clip.totalBytes ||
        listeningValueHash(stored.record.sourceClip) !==
          listeningValueHash(clipIdentity(plan, group))
      )
        fail("already split immutable clip differs");
    }
    return { set, account, finished: true as const };
  }
  expected(set.revision, target.revision);
  if (listeningValueHash(set.document) !== target.documentSha256)
    fail("full source document hash differs");
  if (
    questionAudioSha256(
      set.document.groups.map((g) => g.transcript.text).join("\n"),
    ) !== plan.sourceTranscriptSha256
  )
    fail(
      "stored original transcript differs from the hash-bound official source",
    );
  const questions = set.document.groups.flatMap((g) => g.questions);
  if (
    !set.document.source ||
    questions.length !== plan.originalQuestions.length ||
    questions.some(
      (q, i) =>
        q.id !== plan.originalQuestions[i].id ||
        q.sourceNumber !== plan.originalQuestions[i].sourceNumber ||
        q.metadata?.sourceRecordId !== plan.snapshot.sourceRecordId,
    ) ||
    set.document.groups.some(
      (g) => !g.audio || g.audio.assetId !== target.originalAssetId,
    )
  )
    fail("original source identity or audio association differs");
  await originalPlayback(tx, set, plan);
  return { set, account, finished: false as const };
}
async function originalPlayback(
  tx: ListeningTx,
  set: Awaited<ReturnType<typeof ownedSet>>,
  plan: PreparedQuestionAudioPlan,
) {
  const target = plan.snapshot.expectedSet;
  const questions = set.document.groups.flatMap((g) => g.questions);
  const completed = await verifiedMedia(tx, set, target.originalAssetId);
  const original = await one<{ record: ListeningMediaRecord }>(
    tx,
    Prisma.sql`SELECT record FROM english_listening_media_asset WHERE "assetId"=${target.originalAssetId}::uuid AND "setId"=${set.id}::uuid`,
  );
  if (
    !original ||
    (!original.record.storage && !original.record.storageChunks) ||
    completed.originalSha256 !== original.record.expectedSha256 ||
    questions.some(
      (q) => q.metadata?.sourceAudioSha256 !== completed.originalSha256,
    ) ||
    original.record.expectedSha256 !== plan.sourceAudioSha256 ||
    completed.durationMs !== plan.source.sourceDurationMs ||
    completed.sha256 !==
      (original.record.playback?.mimeType === "audio/wav"
        ? plan.sourceWaveSha256
        : plan.sourcePlaybackSha256)
  )
    fail("immutable original playback differs");
}

/** No long-running SQL transaction spans remote uploads. Prepared clips remain reusable if final CAS fails. */
export async function adoptListeningQuestionAudio(
  database: PrismaClient,
  storage: ListeningStorageApi | null,
  plan: PreparedQuestionAudioPlan,
  options: {
    actor: ListeningActor;
    apply?: boolean;
    signal?: AbortSignal;
    clock?: () => Date;
  },
) {
  if (!readyPlans.has(plan))
    fail("plan must be loaded and fully decoded from exact archive files");
  const now = () => (options.clock?.() ?? new Date()).getTime();
  const authorize = () =>
    database.$transaction((tx) => lockedSource(tx, options.actor, plan), {
      maxWait: 10000,
      timeout: 30000,
    });
  const preflight = await database.$transaction(
    async (tx) => {
      if (!options.apply)
        await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      const source = await lockedSource(tx, options.actor, plan);
      if (source.finished) return source;
      await tx.$executeRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`listening-media:${source.set.owner_id}`},0))`,
      );
      const existing = await tx.$queryRaw<{ assetId: string }[]>(
        Prisma.sql`SELECT "assetId" FROM english_listening_media_asset WHERE "assetId" IN (${Prisma.join(plan.groups.map((g) => Prisma.sql`${g.assetId}::uuid`))})`,
      );
      const missing = plan.groups.filter(
        (g) => !existing.some((r) => r.assetId === g.assetId),
      );
      await assertListeningStorageQuota(tx, source.set.owner_id, {
        reserveBytes: missing.reduce(
          (sum, g) => sum + g.clip.totalBytes + chunkBytes,
          0,
        ),
        assetCount: missing.length,
      });
      return source;
    },
    { maxWait: 10000, timeout: 30000 },
  );
  const report = {
    proofPolicy,
    sourceRecordId: plan.snapshot.sourceRecordId,
    setId: preflight.set.id,
    planHash: plan.planHash,
    sourcePcmSha256: plan.source.pcmSha256,
    clips: plan.groups.map((g) => ({
      assetId: g.assetId,
      sourceNumbers: g.sourceNumbers,
      startFrame: g.clip.startFrame,
      endFrame: g.clip.endFrame,
      leadingSilenceMs: g.leadingSilenceMs,
      trailingSilenceMs: g.trailingSilenceMs,
      vadLeadingPadMs: g.vadLeadingPadMs,
      vadTrailingPadMs: g.vadTrailingPadMs,
      boundary: g.boundary,
      sha256: g.sha256,
      durationMs: g.clip.durationMs,
      bytes: g.clip.totalBytes,
    })),
  };
  if (preflight.finished)
    return {
      ...report,
      status: "already_split" as const,
      revision: preflight.set.revision,
    };
  if (!options.apply)
    return {
      ...report,
      status: "read_only" as const,
      revision: preflight.set.revision,
    };
  if (!storage)
    fail("private Storage is required; PostgreSQL blobs are forbidden");
  const store = new PrismaStorageListeningMediaStore(database, storage);
  const media = createListeningMediaService({
    store,
    ...createListeningMediaAccess(database),
    storage,
    now,
  });
  for (const group of plan.groups) {
    options.signal?.throwIfAborted();
    const scope = await authorize();
    if (scope.finished)
      return {
        ...report,
        status: "already_split" as const,
        revision: scope.set.revision,
      };
    const sourceClip = clipIdentity(plan, group);
    await database.$transaction(
      async (tx) => {
        const current = await lockedSource(tx, options.actor, plan);
        if (current.finished) return;
        await tx.$executeRaw(
          Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`listening-media:${current.set.owner_id}`},0))`,
        );
        const exists = await one<{ record: ListeningMediaRecord }>(
          tx,
          Prisma.sql`SELECT record FROM english_listening_media_asset WHERE "assetId"=${group.assetId}::uuid FOR UPDATE`,
        );
        if (exists) return;
        await assertListeningStorageQuota(tx, current.set.owner_id, {
          reserveBytes: group.clip.totalBytes + chunkBytes,
          assetCount: 1,
        });
        const record: ListeningMediaRecord = {
          assetId: group.assetId,
          setId: current.set.id,
          ownerId: current.set.owner_id,
          branchId: current.set.branch_id,
          revision: 0,
          state: "uploading",
          storageChunks: true,
          mimeType: "audio/wav",
          totalBytes: group.clip.totalBytes,
          receivedBytes: 0,
          expectedSha256: group.sha256,
          chunkBytes,
          uploadExpiresAt: now() + 24 * 60 * 60 * 1000,
          chunks: [],
          sourceClip,
        };
        await tx.$executeRaw(
          Prisma.sql`INSERT INTO english_listening_media_asset("assetId","ownerId","branchId","setId",revision,state,"uploadExpiresAt","reservedBytes",record) VALUES(${record.assetId}::uuid,${record.ownerId}::uuid,${record.branchId}::uuid,${record.setId}::uuid,0,'uploading',${new Date(record.uploadExpiresAt)},${group.clip.totalBytes + chunkBytes},${json(record)})`,
        );
      },
      { maxWait: 10000, timeout: 30000 },
    );
    let record = await store.get(group.assetId);
    const valid = () => {
      if (
        !record ||
        !record.storageChunks ||
        record.storage ||
        record.drive ||
        record.ownerId !== scope.set.owner_id ||
        record.branchId !== scope.set.branch_id ||
        record.setId !== scope.set.id ||
        record.mimeType !== "audio/wav" ||
        record.totalBytes !== group.clip.totalBytes ||
        record.expectedSha256 !== group.sha256 ||
        listeningValueHash(record.sourceClip) !== listeningValueHash(sourceClip)
      )
        fail("prepared clip scope or immutable identity differs");
      return record;
    };
    valid();
    if (record!.state !== "ready") {
      let pending = Buffer.alloc(0),
        offset = 0;
      const append = async (bytes: Buffer) => {
        while (true) {
          await authorize();
          record = await store.get(group.assetId);
          const current = valid();
          if (current.state === "ready") return;
          if (current.state !== "uploading" || current.uploadExpiresAt <= now())
            fail("prepared clip expired or failed");
          if (current.receivedBytes > offset) {
            const existing = current.chunks.find((c) => c.offset === offset);
            if (
              !existing ||
              existing.byteLength !== bytes.length ||
              existing.sha256 !== questionAudioSha256(bytes)
            )
              fail("resumed clip chunk differs");
            return;
          }
          if (current.receivedBytes !== offset)
            fail("resumed clip offset differs");
          try {
            await media.appendChunk(
              { actor: options.actor },
              {
                setId: current.setId,
                assetId: current.assetId,
                expectedRevision: current.revision,
                offset,
                byteLength: bytes.length,
                sha256: questionAudioSha256(bytes),
              },
              (async function* () {
                yield bytes;
              })(),
              { signal: options.signal },
            );
            return;
          } catch (error) {
            const next = await store.get(group.assetId);
            if (
              next?.revision !== current.revision &&
              (next?.state === "ready" || next?.state === "uploading")
            )
              continue;
            throw error;
          }
        }
      };
      for await (const part of group.clip.read()) {
        pending = Buffer.concat([pending, part]);
        while (pending.length >= chunkBytes) {
          await append(pending.subarray(0, chunkBytes));
          pending = pending.subarray(chunkBytes);
          offset += chunkBytes;
        }
      }
      if (pending.length) {
        await append(pending);
        offset += pending.length;
      }
      if (offset !== group.clip.totalBytes) fail("clip stream length differs");
    }
    // Re-read all persisted bytes before sealing, including resumed uploads.
    record = await store.get(group.assetId);
    const current = valid();
    const hash = createHash("sha256");
    let received = 0;
    const head: Buffer[] = [];
    for (const chunk of current.chunks)
      for await (const part of store.readBlob(chunk.key, {
        start: 0,
        endExclusive: chunk.byteLength,
        maxChunkBytes: chunkBytes,
        signal: options.signal,
      })) {
        hash.update(part);
        if (received < 44)
          head.push(Buffer.from(part.subarray(0, 44 - received)));
        received += part.length;
      }
    const inspected = inspectListeningMedia(
      Buffer.concat(head),
      received,
      "audio/wav",
      MAX_DURATION_MS,
    );
    if (
      received !== group.clip.totalBytes ||
      hash.digest("hex") !== group.sha256 ||
      !inspected.playable ||
      inspected.durationMs !== group.clip.durationMs
    )
      fail("persisted clip checksum or duration differs");
    await authorize();
    if (current.state !== "ready") {
      const revision = current.revision + 1;
      const next: ListeningMediaRecord = {
        ...current,
        state: "ready",
        revision,
        finalizedFromRevision: current.revision,
        playback: {
          revision: 1,
          mimeType: "audio/wav",
          sha256: group.sha256,
          totalBytes: current.totalBytes,
          chunks: current.chunks.map((c) => ({ ...c })),
        },
        completion: {
          assetId: current.assetId,
          setId: current.setId,
          ownerId: current.ownerId,
          branchId: current.branchId,
          revision,
          state: "ready",
          publishable: true,
          totalBytes: current.totalBytes,
          receivedBytes: current.totalBytes,
          chunkBytes,
          uploadExpiresAt: current.uploadExpiresAt,
          verifiedAt: now(),
          mimeType: "audio/wav",
          sha256: group.sha256,
          originalSha256: group.sha256,
          durationMs: group.clip.durationMs,
          playbackBytes: current.totalBytes,
          playbackRevision: 1,
        },
      };
      if (
        !(await store.compareAndSwap(current.assetId, current.revision, next))
      ) {
        record = await store.get(group.assetId);
        if (valid().state !== "ready") fail("clip sealing conflict");
      }
    }
  }
  return database.$transaction(
    async (tx) => {
      const source = await lockedSource(tx, options.actor, plan);
      if (source.finished)
        return {
          ...report,
          status: "already_split" as const,
          revision: source.set.revision,
        };
      await tx.$executeRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`listening-media:${source.set.owner_id}`},0))`,
      );
      const actual = new Map(
        source.set.document.groups
          .flatMap((g) => g.questions)
          .map((q) => [q.id, q]),
      );
      const originalAtCommit = await one<{ record: ListeningMediaRecord }>(
        tx,
        Prisma.sql`SELECT record FROM english_listening_media_asset WHERE "assetId"=${plan.snapshot.expectedSet.originalAssetId}::uuid FOR SHARE`,
      );
      if (
        originalAtCommit?.record.state !== "ready" ||
        originalAtCommit.record.expectedSha256 !== plan.sourceAudioSha256
      )
        fail("original asset disappeared before commit");
      const groups = [];
      for (const group of plan.groups) {
        const record = await one<{ record: ListeningMediaRecord }>(
          tx,
          Prisma.sql`SELECT record FROM english_listening_media_asset WHERE "assetId"=${group.assetId}::uuid FOR SHARE`,
        );
        const ready = listeningMediaCompletionSchema.parse(
          record?.record.completion,
        );
        if (
          !record?.record.storageChunks ||
          record.record.ownerId !== source.set.owner_id ||
          record.record.branchId !== source.set.branch_id ||
          record.record.setId !== source.set.id ||
          listeningValueHash(record.record.sourceClip) !==
            listeningValueHash(clipIdentity(plan, group)) ||
          ready.state !== "ready" ||
          ready.sha256 !== group.sha256 ||
          ready.durationMs !== group.clip.durationMs
        )
          fail("prepared clip unavailable at commit");
        groups.push({
          id: group.groupId,
          audio: {
            assetId: group.assetId,
            sha256: group.sha256,
            durationMs: group.clip.durationMs,
          },
          transcript: {
            revision: 1,
            text: group.transcript,
            spokenText: group.transcript,
            translation: null,
          },
          questions: group.questionIds.map((questionId) => {
            const question = actual.get(questionId);
            if (!question) fail("question identity changed");
            const range = group.clip;
            const evidence = question.evidence.flatMap((e) => {
              const start = Math.floor(
                  (e.startMs * plan.source.sampleRate) / 1000,
                ),
                end = Math.ceil((e.endMs * plan.source.sampleRate) / 1000);
              return start >= range.startFrame && end <= range.endFrame
                ? [
                    {
                      startMs: Math.floor(
                        ((start - range.startFrame) * 1000) /
                          plan.source.sampleRate,
                      ),
                      endMs: Math.min(
                        range.durationMs,
                        Math.ceil(
                          ((end - range.startFrame) * 1000) /
                            plan.source.sampleRate,
                        ),
                      ),
                    },
                  ]
                : [];
            });
            return {
              ...question,
              evidence,
              audioRange: { startMs: 0, endMs: group.clip.durationMs },
            };
          }),
        });
      }
      const saved = await updateSet(
        tx,
        source.account,
        source.set.id,
        listeningUpdateSetSchema.parse({
          title: source.set.document.title,
          level: source.set.document.level,
          examId: source.set.document.examId,
          rights: source.set.document.rights,
          basis: source.set.document.provenance.basis,
          expectedRevision: source.set.revision,
          groups,
        }),
        new Date(now()).toISOString(),
      );
      const documentSha256 = listeningValueHash(
        listeningDraftSchema.parse(saved.document),
      );
      await audit(
        tx,
        source.set.id,
        source.account.id,
        "question_audio_split",
        {
          planHash: plan.planHash,
          sourceRecordId: plan.snapshot.sourceRecordId,
          proofPolicy,
          sourceRevision: source.set.revision,
          revision: saved.revision,
          documentSha256,
          sourceAssetId: plan.snapshot.expectedSet.originalAssetId,
          sourcePcmSha256: plan.source.pcmSha256,
          sourceSampleRate: plan.source.sampleRate,
          sourceChannels: plan.source.channels,
          clips: report.clips,
        },
        new Date(now()).toISOString(),
      );
      return {
        ...report,
        status: "applied" as const,
        revision: saved.revision,
      };
    },
    { maxWait: 10000, timeout: 30000 },
  );
}
