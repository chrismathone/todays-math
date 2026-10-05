import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
import {
  listeningComposeInputSchema,
  type ListeningComposeSource,
} from "@/contracts/englishListeningCompose.contract";
import {
  listeningDraftSchema,
  type ListeningDraft,
} from "@/contracts/englishListeningHttp.contract";
import { listeningMediaCompletionSchema } from "@/contracts/englishListeningMedia.contract";
import type { ListeningMediaRecord } from "../media/store";
import {
  LISTENING_MAX_DOCUMENT_BYTES,
  LISTENING_MAX_OWNER_BYTES,
  LISTENING_MAX_OWNER_ASSETS,
} from "@/contracts/englishListeningSource.contract";
import { planListeningWaveClip } from "../media/clip";
import { decodeListeningMp3Clip } from "../media/mp3Clip";
import { MAX_ORIGINAL_BYTES } from "../media/mp3";
import {
  assertListeningDatabaseCapacity,
  lockListeningDatabaseCapacity,
} from "../media/databaseCapacity";
import { listeningValueHash } from "../publication";
import { usesWholeSourceAssessmentAudio } from "../wholeSource";
import {
  audit,
  conflict,
  denied,
  expected,
  invalid,
  json,
  lock,
  one,
  ownedSet,
  type ListeningTx,
  type SetRow,
} from "./database";
import { setDetail } from "./sets";
import type { ListeningDriveApi } from "../media/driveApi";
import { driveReadyRecord, insertDriveAsset } from "./driveAssets";
import { insertStorageAsset, storageReadyRecord } from "./storageAssets";
import type {
  ListeningStorageApi,
  ListeningStorageRef,
} from "../media/storageApi";
import {
  cloneStorageChunkAsset,
  storageChunkReferences,
  writeStorageChunkAsset,
} from "./storageChunkAssets";
export interface ListeningComposeDrive {
  api?: ListeningDriveApi;
  storage?: ListeningStorageApi;
  createdFiles: Set<string>;
  createdStorageRefs?: ListeningStorageRef[];
}
async function scopedDrive(
  record: ListeningMediaRecord,
  target: { ownerId: string },
  drive?: ListeningComposeDrive,
) {
  if (
    !record.drive ||
    !drive?.api ||
    record.ownerId !== drive.api.config.ownerId ||
    target.ownerId !== drive.api.config.ownerId ||
    record.drive.ownerId !== record.ownerId ||
    record.chunks.length ||
    record.playback?.chunks.length ||
    record.drive.endExclusive - record.drive.start !==
      record.playback?.totalBytes
  )
    throw denied();
  await drive.api.check(record.drive);
  return drive.api;
}
async function scopedStorage(
  record: ListeningMediaRecord,
  drive?: ListeningComposeDrive,
) {
  if (
    !record.storage ||
    !drive?.storage ||
    record.drive ||
    record.storage.ownerId !== record.ownerId ||
    record.chunks.length ||
    record.playback?.chunks.length ||
    record.storage.endExclusive - record.storage.start !==
      record.playback?.totalBytes
  )
    throw denied();
  await drive.storage.check(record.storage);
  return drive.storage;
}

export async function composeSource(
  tx: ListeningTx,
  account: AccountAccess,
  id: string,
): Promise<ListeningComposeSource> {
  const detail = await setDetail(tx, account, id);
  return { detail, documentHash: listeningValueHash(detail.document) };
}

/** Match the durable media adapter's owner quota/lock namespace. Ready assets are immutable. */
async function cloneReadyAudio(
  tx: ListeningTx,
  source: SetRow,
  audio: NonNullable<ListeningDraft["groups"][number]["audio"]>,
  target: { id: string; ownerId: string; branchId: string | null },
  drive?: ListeningComposeDrive,
) {
  const row = await one<{ record: ListeningMediaRecord }>(
    tx,
    Prisma.sql`SELECT record FROM english_listening_media_asset WHERE "assetId"=${audio.assetId}::uuid AND "setId"=${source.id}::uuid AND "ownerId"=${source.owner_id}::uuid AND "branchId" IS NOT DISTINCT FROM ${source.branch_id}::uuid AND state='ready'`,
  );
  const original = row?.record;
  const completion = listeningMediaCompletionSchema.safeParse(
    original?.completion,
  );
  if (
    !original ||
    original.state !== "ready" ||
    original.setId !== source.id ||
    original.ownerId !== source.owner_id ||
    original.branchId !== source.branch_id ||
    !completion.success ||
    completion.data.state !== "ready" ||
    completion.data.setId !== source.id ||
    completion.data.assetId !== audio.assetId ||
    completion.data.ownerId !== source.owner_id ||
    completion.data.branchId !== source.branch_id ||
    completion.data.sha256 !== audio.sha256 ||
    completion.data.durationMs !== audio.durationMs ||
    !original.playback ||
    original.playback.sha256 !== audio.sha256
  )
    throw invalid(
      "담은 자료에 검증된 음원이 필요합니다. 원본 자료의 음원을 확인해 주세요.",
    );
  if (original.storageChunks) {
    if (!drive?.storage)
      throw invalid("비공개 음원 저장소 연결을 확인해 주세요.");
    const record = await cloneStorageChunkAsset(
      tx,
      original,
      target,
      drive.storage,
    );
    return { ...audio, assetId: record.assetId };
  }
  if (original.storage) {
    await scopedStorage(original, drive);
    if (original.ownerId !== target.ownerId) throw denied();
    const assetId = randomUUID(),
      record: ListeningMediaRecord = {
        ...original,
        assetId,
        setId: target.id,
        ownerId: target.ownerId,
        branchId: target.branchId,
        completion: {
          ...completion.data,
          assetId,
          setId: target.id,
          ownerId: target.ownerId,
          branchId: target.branchId,
        },
      };
    await insertStorageAsset(tx, record);
    return { ...audio, assetId };
  }
  if (original.drive) {
    await scopedDrive(original, target, drive);
    const assetId = randomUUID();
    const record: ListeningMediaRecord = {
      ...original,
      assetId,
      setId: target.id,
      ownerId: target.ownerId,
      branchId: target.branchId,
      completion: {
        ...completion.data,
        assetId,
        setId: target.id,
        ownerId: target.ownerId,
        branchId: target.branchId,
      },
    };
    await insertDriveAsset(tx, record);
    return { ...audio, assetId };
  }
  const references = [...original.chunks, ...original.playback.chunks];
  const keys = [...new Set(references.map((item) => item.key))];
  if (!keys.length) throw invalid("원본 음원 파일이 없습니다.");
  const blobs = await tx.$queryRaw<
    { key: string; byteLength: number; committed: boolean }[]
  >(
    Prisma.sql`SELECT key,"byteLength",committed FROM english_listening_media_blob WHERE "assetId"=${audio.assetId}::uuid AND key IN (${Prisma.join(keys.map((key) => Prisma.sql`${key}::uuid`))})`,
  );
  if (
    blobs.length !== keys.length ||
    references.some(
      (ref) =>
        !blobs.some(
          (blob) =>
            blob.key === ref.key &&
            Number.isSafeInteger(ref.blobOffset ?? 0) &&
            (ref.blobOffset ?? 0) >= 0 &&
            (ref.blobOffset ?? 0) + ref.byteLength <= blob.byteLength &&
            (ref.blobOffset !== undefined ||
              blob.byteLength === ref.byteLength) &&
            blob.committed,
        ),
    )
  )
    throw invalid("원본 음원 파일을 확인하지 못했습니다.");
  const bytes = blobs.reduce((total, blob) => total + blob.byteLength, 0);
  await assertListeningDatabaseCapacity(tx, bytes);
  const quota = await one<{ bytes: bigint; count: bigint }>(
    tx,
    Prisma.sql`SELECT COALESCE(SUM("reservedBytes"),0)::bigint AS bytes,COUNT(*)::bigint AS count FROM english_listening_media_asset WHERE "ownerId"=${target.ownerId}::uuid AND record->'drive' IS NULL AND record->'storage' IS NULL AND record->>'storageChunks' IS DISTINCT FROM 'true'`,
  );
  if (
    !quota ||
    Number(quota.bytes) + bytes > LISTENING_MAX_OWNER_BYTES ||
    Number(quota.count) >= LISTENING_MAX_OWNER_ASSETS
  )
    throw invalid("듣기 자료 보관 한도를 초과했습니다.");
  const assetId = randomUUID();
  const keyMap = new Map(keys.map((key) => [key, randomUUID()]));
  const copyChunks = (chunks: ListeningMediaRecord["chunks"]) =>
    chunks.map((chunk) => ({ ...chunk, key: keyMap.get(chunk.key)! }));
  const record: ListeningMediaRecord = {
    ...original,
    assetId,
    setId: target.id,
    ownerId: target.ownerId,
    branchId: target.branchId,
    chunks: copyChunks(original.chunks),
    playback: {
      ...original.playback,
      chunks: copyChunks(original.playback.chunks),
    },
    completion: {
      ...completion.data,
      assetId,
      setId: target.id,
      ownerId: target.ownerId,
      branchId: target.branchId,
    },
  };
  await tx.$executeRaw(
    Prisma.sql`INSERT INTO english_listening_media_asset("assetId","ownerId","branchId","setId",revision,state,"uploadExpiresAt","reservedBytes",record) VALUES(${assetId}::uuid,${target.ownerId}::uuid,${target.branchId}::uuid,${target.id}::uuid,${record.revision},'ready',${new Date(record.uploadExpiresAt)},${bytes},${json(record)})`,
  );
  // SQL copies sealed bytes directly; no large audio buffer crosses the application boundary.
  const mapping = keys.map(
    (key) => Prisma.sql`(${key}::uuid,${keyMap.get(key)}::uuid)`,
  );
  const copied = await tx.$executeRaw(
    Prisma.sql`INSERT INTO english_listening_media_blob(key,"assetId",bytes,"byteLength",committed) SELECT m.new_key,${assetId}::uuid,b.bytes,b."byteLength",true FROM english_listening_media_blob b JOIN (VALUES ${Prisma.join(mapping)}) AS m(old_key,new_key) ON b.key=m.old_key WHERE b."assetId"=${audio.assetId}::uuid AND b.committed=true`,
  );
  if (copied !== keys.length) throw invalid("음원 복사를 완료하지 못했습니다.");
  return { ...audio, assetId };
}

async function clipReadyAudio(
  tx: ListeningTx,
  source: SetRow,
  group: ListeningDraft["groups"][number],
  questions: ListeningDraft["groups"][number]["questions"],
  target: { id: string; ownerId: string; branchId: string | null },
  now: string,
  drive?: ListeningComposeDrive,
) {
  const audio = group.audio!;
  const row = await one<{ record: ListeningMediaRecord }>(
    tx,
    Prisma.sql`SELECT record FROM english_listening_media_asset WHERE "assetId"=${audio.assetId}::uuid AND "setId"=${source.id}::uuid AND state='ready'`,
  );
  const original = row?.record;
  const completion = listeningMediaCompletionSchema.safeParse(
    original?.completion,
  );
  if (
    !original ||
    original.state !== "ready" ||
    original.ownerId !== source.owner_id ||
    original.branchId !== source.branch_id ||
    !original.playback ||
    !completion.success ||
    completion.data.state !== "ready" ||
    completion.data.setId !== source.id ||
    completion.data.assetId !== audio.assetId ||
    completion.data.ownerId !== source.owner_id ||
    completion.data.branchId !== source.branch_id ||
    completion.data.sha256 !== audio.sha256 ||
    completion.data.durationMs !== audio.durationMs ||
    original.playback.sha256 !== audio.sha256
  )
    throw invalid("원본 자료의 검증된 음원이 필요합니다.");
  const playback = original.playback;
  const external = original.drive
    ? await scopedDrive(original, target, drive)
    : null;
  const storage = original.storage
    ? await scopedStorage(original, drive)
    : null;
  const chunkStorage = original.storageChunks ? drive?.storage : null;
  if (original.storageChunks && !chunkStorage)
    throw invalid("비공개 음원 저장소 연결을 확인해 주세요.");
  const chunkRefs = chunkStorage
    ? await storageChunkReferences(tx, original, chunkStorage)
    : null;
  if (chunkStorage && original.ownerId !== target.ownerId) throw denied();
  if (storage && original.ownerId !== target.ownerId) throw denied();
  const sourceChunks = [...playback.chunks].sort((a, b) => a.offset - b.offset);
  let covered = 0;
  for (const chunk of sourceChunks) {
    if (
      chunk.offset !== covered ||
      chunk.byteLength <= 0 ||
      chunk.byteLength > 1024 * 1024 ||
      !Number.isSafeInteger(chunk.blobOffset ?? 0) ||
      (chunk.blobOffset ?? 0) < 0
    )
      throw invalid("원본 음원 조각이 일치하지 않습니다.");
    covered += chunk.byteLength;
  }
  if (!external && !storage && covered !== playback.totalBytes)
    throw invalid("원본 음원 길이가 일치하지 않습니다.");
  async function* readRange(start: number, endExclusive: number) {
    if (storage) {
      for await (const part of storage.read(
        original!.storage!,
        start,
        endExclusive,
      ))
        yield Buffer.from(part);
      return;
    }
    if (external) {
      for await (const part of external.read(
        original!.drive!,
        start,
        endExclusive,
      ))
        yield Buffer.from(part);
      return;
    }
    for (const chunk of sourceChunks) {
      const from = Math.max(start, chunk.offset);
      const to = Math.min(endExclusive, chunk.offset + chunk.byteLength);
      if (from >= to) continue;
      if (chunkStorage && chunkRefs) {
        const ref = chunkRefs.get(chunk.key);
        if (!ref) throw invalid("원본 음원 조각을 확인하지 못했습니다.");
        for await (const part of chunkStorage.read(
          ref,
          (chunk.blobOffset ?? 0) + from - chunk.offset,
          (chunk.blobOffset ?? 0) + to - chunk.offset,
        ))
          yield Buffer.from(part);
        continue;
      }
      const blob = await one<{ bytes: Uint8Array }>(
        tx,
        Prisma.sql`SELECT SUBSTRING(bytes FROM ${(chunk.blobOffset ?? 0) + from - chunk.offset + 1}::integer FOR ${to - from}::integer) AS bytes FROM english_listening_media_blob WHERE key=${chunk.key}::uuid AND "assetId"=${audio.assetId}::uuid AND committed=true AND "byteLength">=${(chunk.blobOffset ?? 0) + chunk.byteLength}`,
      );
      if (!blob || blob.bytes.byteLength !== to - from)
        throw invalid("원본 음원 조각을 확인하지 못했습니다.");
      yield Buffer.from(blob.bytes);
    }
  }
  let decoded: Awaited<ReturnType<typeof decodeListeningMp3Clip>> | undefined;
  let readPcmRange = readRange;
  let plan: ReturnType<typeof planListeningWaveClip>;
  try {
    if (playback.mimeType === "audio/mpeg") {
      if (playback.totalBytes > MAX_ORIGINAL_BYTES)
        throw new Error("원본 MP3가 보관 한도를 초과했습니다.");
      const originalBytes = Buffer.alloc(playback.totalBytes);
      let position = 0;
      for await (const part of readRange(0, playback.totalBytes)) {
        originalBytes.set(part, position);
        position += part.length;
      }
      if (
        createHash("sha256").update(originalBytes).digest("hex") !==
        playback.sha256
      )
        throw new Error("원본 음원 해시를 확인하지 못했습니다.");
      decoded = await decodeListeningMp3Clip(originalBytes, questions);
      if (decoded.sourceDurationMs !== audio.durationMs)
        throw new Error("원본 음원 길이를 확인하지 못했습니다.");
      plan = decoded.plan;
      readPcmRange = decoded.readRange;
    } else {
      const headerParts: Buffer[] = [];
      for await (const part of readRange(0, 44)) headerParts.push(part);
      plan = planListeningWaveClip(
        Buffer.concat(headerParts),
        playback.totalBytes,
        questions,
      );
    }
  } catch (error) {
    await decoded?.dispose();
    throw invalid(
      error instanceof Error
        ? error.message
        : "문항 음원 구간을 확인해 주세요.",
    );
  }
  try {
    if (drive?.storage) {
      const assetId = randomUUID();
      if (plan.totalBytes > 32 * 1024 * 1024 || original.storageChunks) {
        const record = await writeStorageChunkAsset(
          tx,
          drive.storage,
          {
            assetId,
            setId: target.id,
            ownerId: target.ownerId,
            branchId: target.branchId,
            mimeType: "audio/wav",
            totalBytes: plan.totalBytes,
            durationMs: plan.durationMs,
            now: Date.parse(now),
            read: async function* () {
              yield plan.header;
              for (const range of plan.ranges)
                yield* readPcmRange(range.start, range.endExclusive);
            },
          },
          drive.createdStorageRefs!,
        );
        return {
          audio: {
            assetId,
            sha256: record.playback!.sha256,
            durationMs: plan.durationMs,
          },
          evidence: plan.evidenceByQuestionId,
          audioRanges: plan.audioRangeByQuestionId,
        };
      }
      const ref = await drive.storage.upload({
        ownerId: target.ownerId,
        assetId,
        bytes: plan.totalBytes,
        mimeType: "audio/wav",
        read: async function* () {
          yield plan.header;
          for (const range of plan.ranges)
            yield* readPcmRange(range.start, range.endExclusive);
        },
      });
      drive!.createdStorageRefs!.push(ref);
      const record = storageReadyRecord({
        assetId,
        setId: target.id,
        ownerId: target.ownerId,
        branchId: target.branchId,
        storage: ref,
        mimeType: "audio/wav",
        sha256: ref.sha256,
        durationMs: plan.durationMs,
        now: Date.parse(now),
      });
      await insertStorageAsset(tx, record);
      return {
        audio: { assetId, sha256: ref.sha256, durationMs: plan.durationMs },
        evidence: plan.evidenceByQuestionId,
        audioRanges: plan.audioRangeByQuestionId,
      };
    }
    if (external) {
      // The selected WAV is streamed to private Drive; PostgreSQL receives only
      // its immutable binding. Keep a rollback list until the surrounding SQL commits.
      const ref = await external.upload({
        bytes: plan.totalBytes,
        mimeType: "audio/wav",
        name: "listening-selected-audio.wav",
        read: async function* () {
          yield plan.header;
          for (const range of plan.ranges)
            yield* readPcmRange(range.start, range.endExclusive);
        },
      });
      drive!.createdFiles.add(ref.fileId);
      const assetId = randomUUID();
      const record = driveReadyRecord({
        assetId,
        setId: target.id,
        ownerId: target.ownerId,
        branchId: target.branchId,
        drive: ref,
        mimeType: "audio/wav",
        sha256: ref.originalSha256,
        durationMs: plan.durationMs,
        now: Date.parse(now),
      });
      await insertDriveAsset(tx, record);
      return {
        audio: {
          assetId,
          sha256: ref.originalSha256,
          durationMs: plan.durationMs,
        },
        evidence: plan.evidenceByQuestionId,
        audioRanges: plan.audioRangeByQuestionId,
      };
    }
    const quota = await one<{ bytes: bigint; count: bigint }>(
      tx,
      Prisma.sql`SELECT COALESCE(SUM("reservedBytes"),0)::bigint AS bytes,COUNT(*)::bigint AS count FROM english_listening_media_asset WHERE "ownerId"=${target.ownerId}::uuid AND record->'drive' IS NULL AND record->'storage' IS NULL AND record->>'storageChunks' IS DISTINCT FROM 'true'`,
    );
    if (
      !quota ||
      Number(quota.bytes) + plan.totalBytes > LISTENING_MAX_OWNER_BYTES ||
      Number(quota.count) >= LISTENING_MAX_OWNER_ASSETS
    )
      throw invalid("듣기 자료 보관 한도를 초과했습니다.");
    const assetId = randomUUID();
    const staged: ListeningMediaRecord = {
      assetId,
      setId: target.id,
      ownerId: target.ownerId,
      branchId: target.branchId,
      revision: 0,
      state: "uploading",
      totalBytes: plan.totalBytes,
      receivedBytes: 0,
      mimeType: "audio/wav",
      expectedSha256: "0".repeat(64),
      chunkBytes: 1024 * 1024,
      uploadExpiresAt: Date.parse(now),
      chunks: [],
    };
    await assertListeningDatabaseCapacity(tx, plan.totalBytes);
    await tx.$executeRaw(
      Prisma.sql`INSERT INTO english_listening_media_asset("assetId","ownerId","branchId","setId",revision,state,"uploadExpiresAt","reservedBytes",record) VALUES(${assetId}::uuid,${target.ownerId}::uuid,${target.branchId}::uuid,${target.id}::uuid,0,'uploading',${new Date(staged.uploadExpiresAt)},${plan.totalBytes},${json(staged)})`,
    );
    const chunks: ListeningMediaRecord["chunks"] = [];
    const hash = createHash("sha256");
    let outputOffset = 0;
    let pending = Buffer.alloc(0);
    const write = async (buffer: Buffer) => {
      const key = randomUUID();
      hash.update(buffer);
      const chunk = {
        key,
        offset: outputOffset,
        byteLength: buffer.length,
        sha256: createHash("sha256").update(buffer).digest("hex"),
        expectedRevision: chunks.length,
      };
      await tx.$executeRaw(
        Prisma.sql`INSERT INTO english_listening_media_blob(key,"assetId",bytes,"byteLength",committed) VALUES(${key}::uuid,${assetId}::uuid,${buffer},${buffer.length},true)`,
      );
      chunks.push(chunk);
      outputOffset += buffer.length;
    };
    const append = async (buffer: Buffer) => {
      pending = Buffer.concat([pending, buffer]);
      while (pending.length >= staged.chunkBytes) {
        await write(pending.subarray(0, staged.chunkBytes));
        pending = pending.subarray(staged.chunkBytes);
      }
    };
    await append(plan.header);
    for (const range of plan.ranges)
      for await (const part of readPcmRange(range.start, range.endExclusive))
        await append(part);
    if (pending.length) await write(pending);
    if (outputOffset !== plan.totalBytes)
      throw invalid("선택한 문항 음원을 완성하지 못했습니다.");
    const sha256 = hash.digest("hex");
    const record: ListeningMediaRecord = {
      ...staged,
      revision: 1,
      state: "ready",
      receivedBytes: plan.totalBytes,
      expectedSha256: sha256,
      chunks,
      playback: {
        revision: 1,
        mimeType: "audio/wav",
        sha256,
        totalBytes: plan.totalBytes,
        chunks,
      },
      completion: {
        setId: target.id,
        assetId,
        ownerId: target.ownerId,
        branchId: target.branchId,
        revision: 1,
        receivedBytes: plan.totalBytes,
        totalBytes: plan.totalBytes,
        chunkBytes: staged.chunkBytes,
        uploadExpiresAt: staged.uploadExpiresAt,
        verifiedAt: Date.parse(now),
        state: "ready",
        publishable: true,
        mimeType: "audio/wav",
        sha256,
        originalSha256: sha256,
        durationMs: plan.durationMs,
        playbackBytes: plan.totalBytes,
        playbackRevision: 1,
      },
    };
    await tx.$executeRaw(
      Prisma.sql`UPDATE english_listening_media_asset SET revision=1,state='ready',record=${json(record)} WHERE "assetId"=${assetId}::uuid AND revision=0`,
    );
    return {
      audio: { assetId, sha256, durationMs: plan.durationMs },
      evidence: plan.evidenceByQuestionId,
      audioRanges: plan.audioRangeByQuestionId,
    };
  } finally {
    await decoded?.dispose();
  }
}

export async function composeListeningSet(
  tx: ListeningTx,
  account: AccountAccess,
  input: unknown,
  now: string,
  drive?: ListeningComposeDrive,
) {
  const data = listeningComposeInputSchema.parse(input);
  const sourceIds = [
    ...new Set(data.selections.map((item) => item.setId)),
  ].sort();
  // Every set operation uses this namespace; sorted acquisition prevents cross-source deadlocks.
  for (const id of sourceIds) await lock(tx, id);
  const sources = new Map<string, SetRow>();
  for (const id of sourceIds) sources.set(id, await ownedSet(tx, account, id));
  const selections = data.selections.map((selection) => {
    const source = sources.get(selection.setId)!;
    expected(source.revision, selection.expectedRevision);
    const document = listeningDraftSchema.parse(source.document);
    if (listeningValueHash(document) !== selection.documentHash)
      throw conflict();
    if (
      !document.rightsReview ||
      document.rights.rightsStatus !== "approved" ||
      !["store_original", "teacher_review"].every((use) =>
        document.rights.allowedUses.some((allowed) => allowed === use),
      )
    )
      throw invalid("원본 자료의 보관·교사 이용 권리를 먼저 확인해 주세요.");
    const group = document.groups.find((item) => item.id === selection.groupId);
    if (!group?.audio) throw invalid("선택한 묶음의 음원이 없습니다.");
    const questions = selection.questionIds.map((id) => {
      const question = group.questions.find((item) => item.id === id);
      if (!question) throw conflict();
      return question;
    });
    const wholeSource =
      selection.audioMode === "whole_source" ||
      usesWholeSourceAssessmentAudio({
        source: document.source,
        groups: [group],
      });
    return { selection, source, document, group, questions, wholeSource };
  });
  const transcripts = selections
    .map((item) => item.group.transcript.text)
    .filter((text) => text.trim());
  if (
    new Set(selections.map((item) => item.group.audio!.sha256)).size !==
      selections.length ||
    new Set(transcripts).size !== transcripts.length
  )
    throw invalid(
      "같은 음원·대본의 문항은 하나의 원본 묶음에서 골라 담아 주세요.",
    );
  const ownerIds = [
    ...new Set([
      account.id,
      ...[...sources.values()].map((source) => source.owner_id),
    ]),
  ].sort();
  // Binary operations acquire the database lock before any owner/asset lock.
  // Metadata-only Drive/Storage operations never reserve PostgreSQL audio bytes.
  const mayWritePostgres = selections.filter(
    (item) =>
      !drive?.storage ||
      item.wholeSource ||
      (item.questions.length === item.group.questions.length &&
        item.questions.every(
          (question, index) => question.id === item.group.questions[index].id,
        )),
  );
  if (mayWritePostgres.length) {
    const [row] = await tx.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`SELECT COUNT(*)::bigint AS count FROM english_listening_media_asset WHERE "assetId" IN (${Prisma.join(mayWritePostgres.map((item) => Prisma.sql`${item.group.audio!.assetId}::uuid`))}) AND record->'drive' IS NULL AND record->'storage' IS NULL AND record->>'storageChunks' IS DISTINCT FROM 'true'`,
    );
    if (Number(row.count) > 0) await lockListeningDatabaseCapacity(tx);
  }
  for (const id of ownerIds)
    await tx.$executeRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`listening-media:${id}`},0))`,
    );
  const id = randomUUID();
  const first = selections[0].document;
  const basis =
    `듣기은행에서 구성: ${[...new Set(selections.map((item) => item.document.title))].join(" · ")}${selections.some((item) => item.wholeSource) ? " · 선택 문항에 원본 회차 전체 음원 포함" : ""}`.slice(
      0,
      1000,
    );
  const allowedUses = first.rights.allowedUses.filter((use) =>
    selections.every((item) => item.document.rights.allowedUses.includes(use)),
  );
  const document = listeningDraftSchema.parse({
    ...first,
    id,
    ownerId: account.id,
    branchId: account.branchId ?? null,
    revision: 1,
    title: data.title,
    level:
      data.level !== undefined
        ? data.level
        : selections.every((item) => item.document.level === first.level)
          ? first.level
          : null,
    examId: null,
    rights: { rightsStatus: "approved", allowedUses },
    rightsReview: null,
    provenance: {
      kind: "assembled",
      recordedBy: account.id,
      recordedAt: now,
      basis,
    },
    groups: [],
  });
  // A mixed exam has several original sources, all retained in the immutable audit record.
  if (sourceIds.length > 1 && "source" in document) delete document.source;
  await tx.$executeRaw(
    Prisma.sql`INSERT INTO english_listening_set(id,owner_id,branch_id,revision,document,created_at,updated_at) VALUES(${id}::uuid,${account.id}::uuid,${account.branchId ?? null}::uuid,1,${json(document)},${new Date(now)},${new Date(now)})`,
  );
  for (const item of selections) {
    const target = {
      id,
      ownerId: account.id,
      branchId: account.branchId ?? null,
    };
    const fullRound =
      item.group.questions.length === item.questions.length &&
      item.group.questions.every(
        (question, index) => question.id === item.questions[index].id,
      );
    const clip =
      fullRound || item.wholeSource
        ? null
        : await clipReadyAudio(
            tx,
            item.source,
            item.group,
            item.questions,
            target,
            now,
            drive,
          );
    const audio =
      clip?.audio ??
      (await cloneReadyAudio(
        tx,
        item.source,
        item.group.audio!,
        target,
        drive,
      ));
    const questions = item.questions.map((question) => {
      const choiceIds = new Map(
        question.choices.map((choice) => [choice.id, randomUUID()]),
      );
      return {
        ...question,
        ...(clip
          ? {
              evidence: clip.evidence.get(question.id) ?? [],
              audioRange: clip.audioRanges.get(question.id),
            }
          : {}),
        id: randomUUID(),
        choices: question.choices.map((choice) => ({
          ...choice,
          id: choiceIds.get(choice.id)!,
        })),
        answerChoiceId: question.answerChoiceId
          ? (choiceIds.get(question.answerChoiceId) ?? null)
          : null,
      };
    });
    document.groups.push({
      ...item.group,
      id: randomUUID(),
      audio,
      transcript: { ...item.group.transcript, revision: 1 },
      questions,
      reviews: { content: null, audio: null, alignment: null },
    });
  }
  const validated = listeningDraftSchema.parse(document);
  if (
    Buffer.byteLength(JSON.stringify(validated), "utf8") >
    LISTENING_MAX_DOCUMENT_BYTES
  )
    throw invalid(
      "시험지의 문항 그림이 너무 많습니다. 시험지를 나눠 만들어 주세요.",
    );
  await tx.$executeRaw(
    Prisma.sql`UPDATE english_listening_set SET document=${json(validated)} WHERE id=${id}::uuid`,
  );
  await audit(
    tx,
    id,
    account.id,
    "set_composed",
    {
      selections: data.selections,
      rightsSources: selections.map((item) => ({
        setId: item.source.id,
        rights: item.document.rights,
        rightsReview: item.document.rightsReview,
        source: "source" in item.document ? item.document.source : null,
        basis: item.document.provenance.basis,
      })),
    },
    now,
  );
  return setDetail(tx, account, id);
}

/** Printing is a teacher-owned draft action; publishing/assignment reviews remain separate. */
export async function printableDraft(
  tx: ListeningTx,
  account: AccountAccess,
  id: string,
  revision: number,
  view: "student" | "teacher",
) {
  const source = await ownedSet(tx, account, id);
  expected(source.revision, revision);
  const document = listeningDraftSchema.parse(source.document);
  const use = view === "teacher" ? "teacher_review" : "distribution";
  if (
    !document.rightsReview ||
    document.rights.rightsStatus !== "approved" ||
    !document.rights.allowedUses.includes(use)
  )
    throw denied();
  if (
    !document.groups.length ||
    document.groups.some((group) => !group.questions.length)
  )
    throw invalid("인쇄할 문항이 없습니다.");
  return document;
}
