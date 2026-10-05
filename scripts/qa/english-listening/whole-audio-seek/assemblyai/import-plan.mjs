/** Build a private, append-only script plan without modifying source documents. */
import { readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import {
  englishConfig,
  transcriptionConfig,
  sha256,
  fileSha256,
  libraryTranscript,
} from "./client.mjs";

export function requireProof(condition, message) {
  if (!condition) throw new Error(message);
}
export function transcriptRow({
  source,
  baseline,
  envelope,
  raw,
  job,
  profile,
}) {
  const config = profile === "english" ? englishConfig : transcriptionConfig;
  requireProof(
    profile === "english" || profile === "bilingual",
    "Unknown script profile",
  );
  requireProof(
    source.sourceRecordId === baseline.sourceRecordId &&
      source.setId === baseline.setId &&
      source.audio.assetId === baseline.audio.assetId &&
      source.audio.sha256 === baseline.audio.sha256 &&
      source.audio.durationMs === baseline.audio.durationMs,
    "Current original-source identity differs",
  );
  requireProof(
    envelope.provider === "assemblyai" &&
      envelope.sourceRecordId === source.sourceRecordId &&
      envelope.sourceAudioSha256 === source.sourceAudioSha256 &&
      envelope.playbackSha256 === source.audio.sha256 &&
      envelope.durationMs === source.audio.durationMs &&
      resolve(envelope.originalAudioPath) === resolve(source.sourceAudioPath),
    "Transcription envelope has different original audio or playback clock",
  );
  const configSha256 = sha256(JSON.stringify(config));
  requireProof(
    JSON.stringify(envelope.request) === JSON.stringify(config) &&
      envelope.configSha256 === configSha256 &&
      envelope.requestedModel === config.speech_models[0] &&
      envelope.actualModel === config.speech_models[0],
    "Transcription has different or unknown model/language provenance",
  );
  requireProof(
    job.phase === "completed" &&
      job.transcriptId === raw.id &&
      raw.id === envelope.transcriptId &&
      job.sourceRecordId === source.sourceRecordId &&
      job.sourceAudioSha256 === source.sourceAudioSha256 &&
      job.playbackSha256 === source.audio.sha256 &&
      job.durationMs === source.audio.durationMs &&
      job.configSha256 === configSha256 &&
      JSON.stringify(job.config) === JSON.stringify(config) &&
      raw.audio_url === job.uploadUrl &&
      job.rawSha256 === envelope.raw.sha256,
    "Transcription job does not bind the actual completed original upload",
  );
  requireProof(
    envelope.writesDatabase === false &&
      envelope.writesStorage === false &&
      envelope.originalAudioModified === false &&
      envelope.humanReviewed === false,
    "Unexpected transcription provenance or review claim",
  );
  requireProof(
    typeof raw.text === "string" &&
      raw.text.trim().length > 0 &&
      raw.text.length <= 100000,
    "Missing or oversized source transcript",
  );
  const library = libraryTranscript(raw, source.audio.durationMs, config);
  requireProof(
    typeof library.displayText === "string" &&
      library.displayText.trim().length > 0,
    "No displayable transcript words inside the original audio",
  );
  requireProof(
    raw.words.length === envelope.wordCount &&
      Number.isFinite(Date.parse(envelope.completedAt)),
    "Transcription word count or completion receipt differs",
  );
  return {
    setId: source.setId,
    assetId: source.audio.assetId,
    ownerId: baseline.ownerId,
    sourceRecordId: source.sourceRecordId,
    sourceAudioSha256: source.sourceAudioSha256,
    playbackSha256: source.audio.sha256,
    durationMs: source.audio.durationMs,
    provider: "assemblyai",
    profile,
    model: envelope.actualModel,
    providerTranscriptId: raw.id,
    text: raw.text,
    displayText: library.displayText,
    timingQuality: library.timingQuality,
    words: raw.words.map(({ text, start, end, confidence }) => ({
      text,
      start,
      end,
      confidence,
    })),
    requestConfig: config,
    rawResponseSha256: envelope.raw.sha256,
    reviewStatus: "ai_unreviewed",
    generatedAt: envelope.completedAt,
  };
}

export async function buildTranscriptPlan({ inventory, baseline, directory }) {
  requireProof(
    inventory.records.length === 193 &&
      baseline.records.length === 193 &&
      baseline.sources === 193 &&
      baseline.questions === 3699 &&
      baseline.existingStarts === 2727 &&
      baseline.heldQuestions === 972 &&
      baseline.project === "jyaguxwuaxgdnovtulna" &&
      baseline.writesDatabase === false &&
      baseline.writesStorage === false,
    "Unexpected or unverified current original-source baseline",
  );
  const current = new Map(
    baseline.records.map((source) => [source.sourceRecordId, source]),
  );
  requireProof(
    current.size === 193 &&
      new Set(inventory.records.map((source) => source.sourceRecordId)).size ===
        193,
    "Duplicate source identity",
  );
  const rows = [],
    references = [],
    ids = new Set();
  for (const source of inventory.records) {
    requireProof(
      (await fileSha256(source.sourceAudioPath)) === source.sourceAudioSha256,
      "Original source audio changed: " + source.sourceRecordId,
    );
    for (const [profile, config] of [
      ["english", englishConfig],
      ["bilingual", transcriptionConfig],
    ]) {
      const root = resolve(
        directory,
        source.sourceRecordId,
        sha256(JSON.stringify(config)).slice(0, 12),
      );
      const envelopePath = join(root, "envelope.json");
      const envelope = JSON.parse(await readFile(envelopePath, "utf8"));
      const rawPath = join(root, "raw.json"),
        jobPath = join(root, "job.json");
      requireProof(
        resolve(envelope.raw.path) === rawPath &&
          (await fileSha256(rawPath)) === envelope.raw.sha256,
        "Immutable completed raw transcription changed: " +
          source.sourceRecordId,
      );
      const raw = JSON.parse(await readFile(rawPath, "utf8")),
        job = JSON.parse(await readFile(jobPath, "utf8"));
      const row = transcriptRow({
        source,
        baseline: current.get(source.sourceRecordId),
        envelope,
        raw,
        job,
        profile,
      });
      requireProof(
        !ids.has(row.providerTranscriptId),
        "Repeated provider transcript identity",
      );
      ids.add(row.providerTranscriptId);
      rows.push(row);
      references.push({
        sourceRecordId: source.sourceRecordId,
        profile,
        envelope: {
          path: envelopePath,
          sha256: await fileSha256(envelopePath),
        },
        raw: { path: rawPath, sha256: envelope.raw.sha256 },
        job: { path: jobPath, sha256: await fileSha256(jobPath) },
      });
    }
  }
  requireProof(
    rows.length === 386,
    "Incomplete full-source transcript library",
  );
  return {
    rows,
    references,
    counts: {
      sources: 193,
      transcripts: rows.length,
      english: rows.filter((row) => row.profile === "english").length,
      bilingual: rows.filter((row) => row.profile === "bilingual").length,
      words: rows.reduce((sum, row) => sum + row.words.length, 0),
      textCharacters: rows.reduce((sum, row) => sum + row.text.length, 0),
      excludedWords: rows.reduce(
        (sum, row) => sum + row.timingQuality.outOfBoundsWordCount,
        0,
      ),
      zeroDurationWordEstimates: rows.reduce(
        (sum, row) => sum + row.timingQuality.nonPositiveWordCount,
        0,
      ),
      providerDurationMismatches: rows.filter(
        (row) => !row.timingQuality.durationMatched,
      ).length,
    },
  };
}
