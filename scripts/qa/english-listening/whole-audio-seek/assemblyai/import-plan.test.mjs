import test from "node:test";
import assert from "node:assert/strict";
import { transcriptRow } from "./import-plan.mjs";
import { englishConfig, sha256 } from "./client.mjs";

function evidence() {
  const source = {
    sourceRecordId: "test-source",
    setId: "source-set",
    sourceAudioPath: "C:/test/audio.mp3",
    sourceAudioSha256: "a".repeat(64),
    audio: { assetId: "asset-1", sha256: "b".repeat(64), durationMs: 10000 },
  };
  const baseline = {
    sourceRecordId: source.sourceRecordId,
    setId: source.setId,
    ownerId: "teacher",
    audio: structuredClone(source.audio),
  };
  const configSha256 = sha256(JSON.stringify(englishConfig));
  const raw = {
    id: "real-job-1",
    status: "completed",
    audio_url: "https://cdn.assemblyai.com/upload/test-only",
    text: "Hello, my name is Jane.",
    speech_model_used: "universal-3-5-pro",
    audio_duration: 10,
    words: [
      { text: "Hello,", start: 300, end: 800, confidence: 0.8 },
      { text: "Jane.", start: 2000, end: 2300, confidence: 0.9 },
    ],
  };
  const envelope = {
    provider: "assemblyai",
    sourceRecordId: source.sourceRecordId,
    sourceAudioSha256: source.sourceAudioSha256,
    playbackSha256: source.audio.sha256,
    durationMs: 10000,
    originalAudioPath: source.sourceAudioPath,
    request: englishConfig,
    configSha256,
    requestedModel: "universal-3-5-pro",
    actualModel: "universal-3-5-pro",
    transcriptId: raw.id,
    raw: { sha256: "c".repeat(64) },
    wordCount: 2,
    completedAt: "2026-10-05T14:00:00.000Z",
    writesDatabase: false,
    writesStorage: false,
    originalAudioModified: false,
    humanReviewed: false,
  };
  const job = {
    phase: "completed",
    transcriptId: raw.id,
    sourceRecordId: source.sourceRecordId,
    sourceAudioSha256: source.sourceAudioSha256,
    playbackSha256: source.audio.sha256,
    durationMs: 10000,
    configSha256,
    config: englishConfig,
    uploadUrl: raw.audio_url,
    rawSha256: envelope.raw.sha256,
  };
  return { source, baseline, raw, envelope, job, profile: "english" };
}
test("AI source scripts retain exact text, raw word estimates and explicit unreviewed provenance; originals unchanged", () => {
  const state = evidence(),
    before = structuredClone(state);
  const row = transcriptRow(state);
  assert.equal(row.text, state.raw.text);
  assert.deepEqual(row.words, state.raw.words);
  assert.equal(row.providerTranscriptId, state.raw.id);
  assert.equal(row.reviewStatus, "ai_unreviewed");
  assert.equal(row.model, "universal-3-5-pro");
  assert.equal(row.profile, "english");
  assert.equal(row.audioRange, undefined);
  assert.equal(row.groupTranscript, undefined);
  assert.equal(JSON.stringify(row).includes("cdn.assemblyai.com"), false);
  assert.deepEqual(state, before);
});
for (const [name, mutate] of [
  [
    "a different uploaded original",
    (x) => {
      x.envelope.sourceAudioSha256 = "d".repeat(64);
    },
  ],
  [
    "an ID3-scrubbed playback substituted for original input",
    (x) => {
      x.envelope.sourceAudioSha256 = x.source.audio.sha256;
    },
  ],
  [
    "a different original file path",
    (x) => {
      x.envelope.originalAudioPath = "C:/test/other.mp3";
    },
  ],
  [
    "a changed source set identity",
    (x) => {
      x.baseline.setId = "other-set";
    },
  ],
  [
    "a changed current original asset",
    (x) => {
      x.baseline.audio.assetId = "new-asset";
    },
  ],
  [
    "a changed current whole-audio duration",
    (x) => {
      x.baseline.audio.durationMs = 9999;
    },
  ],
  [
    "a different source playback hash",
    (x) => {
      x.envelope.playbackSha256 = "d".repeat(64);
    },
  ],
  [
    "a mislabeled bilingual profile",
    (x) => {
      x.profile = "bilingual";
    },
  ],
  [
    "an unknown actual ASR model",
    (x) => {
      x.envelope.actualModel = null;
    },
  ],
  [
    "a response from a different request",
    (x) => {
      x.raw.id = "other-job";
    },
  ],
  [
    "a response from another uploaded URL",
    (x) => {
      x.raw.audio_url = "https://cdn.assemblyai.com/another";
    },
  ],
  [
    "changed raw response bytes",
    (x) => {
      x.job.rawSha256 = "d".repeat(64);
    },
  ],
  [
    "changed job model configuration",
    (x) => {
      x.job.config = {
        ...englishConfig,
        prompt: "invent exact expected words",
      };
    },
  ],
  [
    "an incomplete provider job",
    (x) => {
      x.job.phase = "processing";
    },
  ],
  [
    "provider error instead of timed words",
    (x) => {
      x.raw.status = "error";
    },
  ],
  [
    "an invented human-review claim",
    (x) => {
      x.envelope.humanReviewed = true;
    },
  ],
  [
    "an original modification claim",
    (x) => {
      x.envelope.originalAudioModified = true;
    },
  ],
  [
    "a missing full transcript",
    (x) => {
      x.raw.text = "";
    },
  ],
  [
    "missing raw confidence",
    (x) => {
      x.raw.words[0].confidence = undefined;
    },
  ],
  [
    "timestamps in reverse order",
    (x) => {
      x.raw.words[1].start = 200;
    },
  ],
  [
    "a negative word interval",
    (x) => {
      x.raw.words[1].end = 1999;
    },
  ],
  [
    "a missing provider audio duration",
    (x) => {
      x.raw.audio_duration = null;
    },
  ],
])
  test("script plan rejects " + name, () => {
    const state = evidence();
    mutate(state);
    assert.throws(() => transcriptRow(state));
  });
test("out-of-bounds hallucinations are preserved in raw storage but excluded from display and search text", () => {
  const state = evidence();
  state.raw.words.push({
    text: "Fabricated sign-off.",
    start: 40000,
    end: 43000,
    confidence: 0.9,
  });
  state.raw.text += " Fabricated sign-off.";
  state.envelope.wordCount++;
  const before = structuredClone(state);
  const row = transcriptRow(state);
  assert.equal(row.text, state.raw.text);
  assert.deepEqual(row.words, state.raw.words);
  assert.equal(row.displayText, "Hello, Jane.");
  assert.equal(row.timingQuality.outOfBoundsWordCount, 1);
  assert.equal(row.timingQuality.durationMatched, true);
  assert.deepEqual(state, before);
});
test("provider duration mismatch is explicit reading-only metadata, never a repaired clock or question start", () => {
  const state = evidence();
  state.raw.audio_duration = 7;
  const row = transcriptRow(state);
  assert.equal(row.text, state.raw.text);
  assert.equal(row.displayText, state.raw.text);
  assert.deepEqual(row.timingQuality, {
    outOfBoundsWordCount: 0,
    nonPositiveWordCount: 0,
    durationDeltaMs: -3000,
    durationMatched: false,
  });
  assert.equal(row.audioRange, undefined);
  assert.equal(row.durationMs, 10000);
});
