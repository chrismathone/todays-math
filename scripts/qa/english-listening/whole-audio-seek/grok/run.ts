/**
 * Build the grok whole-audio seek ledger from the read-only inventory.
 * Measures cue onsets on the production playback decode. Does not transcribe,
 * clip, or write the database.
 */
import { createHash } from "node:crypto";
import {
  createReadStream,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  decodedDurationMs,
  decodeMpegBytes,
  measureCueOnset,
  writeCueProbe,
  nativeFromOnset,
  type DecodedAudio,
  type ProbeSegment,
} from "./nativeClock.ts";
import {
  auditMarks,
  buildSourceRecords,
  enforceSpokenOrder,
  publishNativeStart,
  secondsToMs,
  type AsrSegment,
  type GroundingItem,
  type MarksFile,
  type PreparedQuestion,
  type SeekRecord,
  type SourceInput,
} from "./seekBeginnings.ts";

const CONVERTED_2006_2 = {
  sourceRecordId: "ebs-middle-1-2006-2",
  path: "C:/Creative/testautocreator/.qa-artifacts/whole-audio-seek-20261005/converted-ebs-middle-1-2006-2-playback.mp3",
  sha256: "6e6992f5b967db06dbb2139f52dad0d4f1b028a348ba1813c3d7e8ad35430e9d",
};

type InventoryQuestion = {
  id: string;
  sourceNumber: number;
  audioRange?: { startMs?: number; endMs?: number } | null;
};

type InventoryRecord = {
  assignedAgent?: string;
  sourceRecordId: string;
  setId: string;
  revision: number;
  documentSha256: string;
  sourceAudioSha256: string;
  asrPath: string;
  asrSha256: string;
  sourceAudioPath: string;
  preparedPath: string;
  preparedSha256: string;
  alignmentPath: string;
  audio: { sha256: string; durationMs: number };
  questions: InventoryQuestion[];
};

type InventoryFile = { records: InventoryRecord[] };

type AsrFile = {
  sourceAudioSha256?: string;
  durationSeconds?: number;
  segments?: AsrSegment[];
};

type PreparedFile = {
  editableInput?: { groups?: { questions?: PreparedQuestion[] }[] };
  verification?: { grounding?: GroundingItem[] };
};

type AlignmentFile = {
  candidates?: {
    questionId?: string;
    method?: string;
    sourceSegmentIds?: number[];
  }[];
};

type MediaProof = {
  sourceRecordId: string;
  record?: { storage?: { start?: number; endExclusive?: number } };
};

type PlaybackClock = {
  bytes: Uint8Array;
  byteOffset: number;
  clock: "source_playback_slice" | "normalized_playback_mp3";
};

function sha256File(path: string): Promise<string> {
  return new Promise((resolveHash, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolveHash(hash.digest("hex")));
  });
}

function sha256Bytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function atomicWrite(path: string, text: string) {
  const temporary = `${path}.partial`;
  writeFileSync(temporary, text);
  rmSync(path, { force: true });
  renameSync(temporary, path);
}

function frozenEndpoint(value: number | undefined): number | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    return null;
  return value;
}

function alignmentAnchors(file: AlignmentFile): Record<string, number[]> {
  const anchors: Record<string, number[]> = {};
  for (const candidate of file.candidates ?? []) {
    if (candidate.method !== "verified_generation_evidence_segments") continue;
    if (!candidate.questionId || !Array.isArray(candidate.sourceSegmentIds))
      continue;
    anchors[candidate.questionId] = candidate.sourceSegmentIds;
  }
  return anchors;
}

async function toSource(record: InventoryRecord): Promise<SourceInput> {
  const actualSourceAudioSha256 = await sha256File(record.sourceAudioPath).catch(
    () => null,
  );
  const actualAsrSha256 = await sha256File(record.asrPath).catch(() => null);
  const actualPreparedSha256 = await sha256File(record.preparedPath).catch(
    () => null,
  );
  const actualAlignmentSha256 = await sha256File(record.alignmentPath).catch(
    () => null,
  );
  let asr: AsrFile = {};
  let prepared: PreparedFile = {};
  let anchors: Record<string, number[]> = {};
  if (actualAsrSha256 != null)
    asr = JSON.parse(readFileSync(record.asrPath, "utf8")) as AsrFile;
  if (actualPreparedSha256 != null)
    prepared = JSON.parse(readFileSync(record.preparedPath, "utf8")) as PreparedFile;
  if (actualAlignmentSha256 != null) {
    anchors = alignmentAnchors(
      JSON.parse(readFileSync(record.alignmentPath, "utf8")) as AlignmentFile,
    );
  }
  const duration =
    typeof asr.durationSeconds === "number" && Number.isFinite(asr.durationSeconds)
      ? Math.round(asr.durationSeconds * 1000)
      : null;
  return {
    sourceRecordId: record.sourceRecordId,
    setId: record.setId,
    revision: record.revision,
    questions: record.questions.map((question) => ({
      questionId: question.id,
      sourceNumber: question.sourceNumber,
      existingStartMs: frozenEndpoint(question.audioRange?.startMs),
      existingEndMs: frozenEndpoint(question.audioRange?.endMs),
    })),
    preparedQuestions: (prepared.editableInput?.groups ?? []).flatMap(
      (group) => group.questions ?? [],
    ),
    grounding: prepared.verification?.grounding ?? [],
    segments: asr.segments ?? [],
    sourceAudioSha256: record.sourceAudioSha256,
    actualSourceAudioSha256,
    playbackSha256: record.audio.sha256,
    playbackDurationMs: record.audio.durationMs,
    asrPath: record.asrPath,
    asrSha256: record.asrSha256,
    actualAsrSha256,
    preparedSha256: record.preparedSha256,
    actualPreparedSha256,
    asrDurationMs: duration,
    asrDeclaredSourceAudioSha256: asr.sourceAudioSha256 ?? null,
    documentSha256: record.documentSha256,
    alignmentPath: record.alignmentPath,
    alignmentSha256: actualAlignmentSha256 ?? "",
    actualAlignmentSha256,
    alignmentAnchorsByQuestionId: anchors,
  };
}

function holdCandidate(record: SeekRecord, reason: string): SeekRecord {
  return {
    ...record,
    status: "held",
    seekStartMs: null,
    seekEndMs: null,
    cueNumber: null,
    scopeQuestionNumbers: [],
    nativeEvidence: null,
    reasons: [
      ...record.reasons.filter(
        (item) =>
          item !== "native_clock_not_measured" &&
          item !== "seek_start_is_asr_cue_estimate" &&
          item !== "seek_start_uses_source_frame_clock",
      ),
      reason,
    ],
  };
}

function holdCandidates(records: SeekRecord[], reason: string): SeekRecord[] {
  return records.map((record) =>
    record.status === "candidate" ? holdCandidate(record, reason) : record,
  );
}

function loadPlayback(
  record: InventoryRecord,
  storage: { start?: number; endExclusive?: number } | undefined,
): PlaybackClock | string {
  if (record.sourceRecordId === CONVERTED_2006_2.sourceRecordId) {
    const bytes = new Uint8Array(readFileSync(CONVERTED_2006_2.path));
    const hash = sha256Bytes(bytes);
    if (hash !== CONVERTED_2006_2.sha256 || hash !== record.audio.sha256)
      return "held_playback_bytes_mismatch";
    return { bytes, byteOffset: 0, clock: "normalized_playback_mp3" };
  }
  const start = storage?.start;
  const end = storage?.endExclusive;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start == null ||
    end == null ||
    start < 0 ||
    end <= start
  )
    return "held_playback_bytes_mismatch";
  const file = readFileSync(record.sourceAudioPath);
  if (end > file.length) return "held_playback_bytes_mismatch";
  const slice = file.subarray(start, end);
  if (sha256Bytes(slice) !== record.audio.sha256)
    return "held_playback_bytes_mismatch";
  return {
    bytes: new Uint8Array(slice),
    byteOffset: start,
    clock: "source_playback_slice",
  };
}

function definingCue(source: SourceInput, record: SeekRecord): AsrSegment | null {
  const matches = source.segments.filter(
    (segment) =>
      record.cueSegmentIds.includes(segment.id) &&
      secondsToMs(segment.estimatedStartSeconds) === record.seekStartMs,
  );
  return matches.length === 1 ? matches[0] : null;
}

function probeSegment(segment: AsrSegment, offsetSeconds: number): ProbeSegment {
  const copy: ProbeSegment = {
    id: segment.id,
    text: segment.text,
    uncertain: Boolean(segment.uncertain),
    rawEstimatedStartSeconds: segment.estimatedStartSeconds,
    localEstimatedStartSeconds: segment.estimatedStartSeconds - offsetSeconds,
  };
  if (typeof segment.estimatedEndSeconds === "number")
    copy.rawEstimatedEndSeconds = segment.estimatedEndSeconds;
  if (typeof segment.avgLogProbability === "number")
    copy.avgLogProbability = segment.avgLogProbability;
  if (typeof segment.noSpeechProbability === "number")
    copy.noSpeechProbability = segment.noSpeechProbability;
  if (typeof segment.compressionRatio === "number")
    copy.compressionRatio = segment.compressionRatio;
  return copy;
}

async function admitNative(
  source: SourceInput,
  records: SeekRecord[],
  playback: PlaybackClock | string,
  sourceAudioPath: string,
  probeDirectory: string,
): Promise<SeekRecord[]> {
  if (!records.some((record) => record.status === "candidate")) return records;
  if (typeof playback === "string") return holdCandidates(records, playback);
  let audio: DecodedAudio;
  try {
    audio = await decodeMpegBytes(playback.bytes);
  } catch (error) {
    process.stderr.write(
      `decode ${source.sourceRecordId}: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return holdCandidates(records, "held_decode_failed");
  }
  const delta = decodedDurationMs(audio) - source.playbackDurationMs;
  if (Math.abs(delta) > 50)
    return holdCandidates(records, "held_native_duration_mismatch");
  const byQuestion = new Map(records.map((record) => [record.questionId, record]));
  const groups = new Map<string, SeekRecord[]>();
  for (const record of records) {
    if (record.status !== "candidate" || record.seekStartMs == null) continue;
    const key = `${record.cueSegmentIds.join(",")}|${record.seekStartMs}`;
    const list = groups.get(key) ?? [];
    list.push(record);
    groups.set(key, list);
  }
  for (const group of groups.values()) {
    const cue = definingCue(source, group[0]);
    const onset = cue ? measureCueOnset(audio, cue.estimatedStartSeconds) : null;
    if (!cue || onset == null) {
      const reason = cue ? "held_cue_onset_unmeasured" : "held_defining_cue_missing";
      for (const record of group)
        byQuestion.set(record.questionId, holdCandidate(record, reason));
      continue;
    }
    const frameCount = Math.min(audio.sampleRate * 2, audio.samples - onset);
    const segmentIds = [
      ...new Set(group.flatMap((record) => [...record.cueSegmentIds, ...record.anchorSegmentIds])),
    ];
    const segments = segmentIds.flatMap((id) => {
      const segment = source.segments.find((item) => item.id === id);
      return segment ? [probeSegment(segment, onset / audio.sampleRate)] : [];
    });
    if (segments.length !== segmentIds.length || frameCount < audio.sampleRate / 10) {
      for (const record of group)
        byQuestion.set(record.questionId, holdCandidate(record, "held_native_bounds"));
      continue;
    }
    const written = writeCueProbe({
      directory: probeDirectory,
      name: `${source.sourceRecordId}-c${group[0].cueSegmentIds.join("-")}`,
      audio,
      offsetFrame: onset,
      frameCount,
      sourceAudioPath,
      sourceAudioSha256: source.sourceAudioSha256,
      playbackByteOffset: playback.byteOffset,
      playbackByteCount: playback.bytes.length,
      decodedAudioSha256: source.playbackSha256,
      clock: playback.clock,
      segments,
    });
    const native = nativeFromOnset({
      audio,
      onsetFrame: onset,
      sourceAudioSha256: source.sourceAudioSha256,
      decodedAudioSha256: source.playbackSha256,
      probePath: written.path,
      probeSha256: written.sha256,
      pcmSha256: written.pcmSha256,
      cueSegmentIds: group[0].cueSegmentIds,
    });
    for (const record of group) {
      const published = native ? publishNativeStart(record, native) : null;
      if (!published) {
        byQuestion.set(record.questionId, holdCandidate(record, "held_native_bounds"));
        continue;
      }
      if (playback.clock === "normalized_playback_mp3")
        published.reasons.push("normalized_playback_clock");
      published.reasons.push(`decoded_duration_delta_ms:${Math.round(delta)}`);
      byQuestion.set(record.questionId, published);
    }
  }
  return enforceSpokenOrder(records.map((record) => byQuestion.get(record.questionId) ?? record));
}

async function main() {
  const { values } = parseArgs({
    options: {
      inventory: { type: "string" },
      out: { type: "string" },
      "media-bindings": { type: "string" },
      only: { type: "string" },
    },
  });
  if (!values.inventory || !values.out)
    throw new Error("--inventory and --out are required");
  const inventoryPath = resolve(values.inventory);
  const mediaPath = resolve(
    values["media-bindings"] ??
      "C:/Creative/testautocreator/.qa-artifacts/whole-audio-seek-20261005/media-bindings.json",
  );
  const inventoryBytes = readFileSync(inventoryPath);
  const inventorySha256 = createHash("sha256").update(inventoryBytes).digest("hex");
  const inventory = JSON.parse(inventoryBytes.toString("utf8")) as InventoryFile;
  const proofs = JSON.parse(readFileSync(mediaPath, "utf8")) as { proofs: MediaProof[] };
  const storageBySource = new Map(
    proofs.proofs.map((proof) => [proof.sourceRecordId, proof.record?.storage]),
  );
  let assigned = inventory.records.filter((record) => record.assignedAgent === "grok");
  if (values.only)
    assigned = assigned.filter((record) => record.sourceRecordId === values.only);
  const out = resolve(values.out);
  const probeDirectory = resolve(out, "probes");
  mkdirSync(probeDirectory, { recursive: true });
  const sources: SourceInput[] = [];
  const records: SeekRecord[] = [];
  for (const record of assigned) {
    process.stdout.write(`read ${record.sourceRecordId}\n`);
    const source = await toSource(record);
    sources.push(source);
    const playback = loadPlayback(record, storageBySource.get(record.sourceRecordId));
    const admitted = await admitNative(
      source,
      buildSourceRecords(source),
      playback,
      record.sourceAudioPath,
      probeDirectory,
    );
    records.push(...admitted);
    const counts = { candidate: 0, held: 0, existing_verified: 0 };
    for (const item of admitted) counts[item.status] += 1;
    process.stdout.write(
      `clock ${record.sourceRecordId} ${JSON.stringify(counts)}\n`,
    );
  }
  const marks: MarksFile = {
    schemaVersion: 1,
    evidenceContractVersion: 1,
    provider: "grok",
    inventorySha256,
    records,
  };
  const problems = auditMarks(sources, marks, inventorySha256, { requireNative: true });
  if (problems.length > 0) {
    const problemPath = resolve(out, "audit-problems.txt");
    atomicWrite(problemPath, `${problems.join("\n")}\n`);
    process.stderr.write(`${problems.slice(0, 20).join("\n")}\n`);
    throw new Error(`ledger audit failed: ${problems.length} (see ${problemPath})`);
  }
  const marksName = values.only ? "smoke-marks.json" : "marks.json";
  const marksPath = resolve(out, marksName);
  const marksText = `${JSON.stringify(marks, null, 2)}\n`;
  atomicWrite(marksPath, marksText);
  const marksSha256 = createHash("sha256").update(marksText).digest("hex");
  const counts = { candidate: 0, held: 0, existing_verified: 0 };
  const heldReasonCounts: Record<string, number> = {};
  let generatedOrdinalDiffers = 0;
  let nativeMeasured = 0;
  const heldBySource: { sourceRecordId: string; candidate: number; held: number }[] = [];
  const bySource = new Map<string, { candidate: number; held: number }>();
  for (const record of marks.records) {
    counts[record.status] += 1;
    if (record.nativeEvidence) nativeMeasured += 1;
    if (record.reasons.includes("generated_ordinal_differs_from_cue_number"))
      generatedOrdinalDiffers += 1;
    const bucket = bySource.get(record.sourceRecordId) ?? { candidate: 0, held: 0 };
    if (record.status === "candidate") bucket.candidate += 1;
    if (record.status === "held") bucket.held += 1;
    bySource.set(record.sourceRecordId, bucket);
    for (const reason of record.reasons) {
      if (!reason.startsWith("held_")) continue;
      const code = reason.split(":")[0];
      heldReasonCounts[code] = (heldReasonCounts[code] ?? 0) + 1;
    }
  }
  for (const [sourceRecordId, bucket] of bySource) {
    if (bucket.held > 0) heldBySource.push({ sourceRecordId, ...bucket });
  }
  const summary = {
    schemaVersion: 1,
    evidenceContractVersion: 1,
    provider: "grok",
    partial: Boolean(values.only),
    inventoryPath,
    inventorySha256,
    marksPath,
    marksSha256,
    sources: assigned.length,
    questions: marks.records.length,
    ...counts,
    nativeMeasured,
    generatedOrdinalDiffers,
    heldReasonCounts,
    heldBySource,
    gpuTranscriptionLaunched: false,
    playbackEnd: "full_original_duration",
    pcmLayout: "float32le-interleaved",
    probeMaxSeconds: 2,
  };
  atomicWrite(
    resolve(out, values.only ? "smoke-summary.json" : "summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  process.stdout.write(`${JSON.stringify(summary)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
