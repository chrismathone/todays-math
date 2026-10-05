import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  anchorsInsidePassage,
  copiedFullAsrProbe,
  energyThreshold,
  interpretCueProbe,
  nativeLeadProblem,
  planCleanSourceProbe,
  planHypothesisProbe,
  planNoiseFloor1SecondProbe,
  planNoiseFloorProbe,
  seekStartMs,
  windowFrames,
  type RecognitionClock,
  type WhisperProbe,
  type WhisperSegment,
} from "./recognition.ts";

const RATE = 44100;
const FRAMES = 882;

function energyWithIsland(onset: number, quiet = 30, length = 900): Float64Array {
  const energy = new Float64Array(length);
  const loud = energyThreshold(FRAMES) * 4;
  for (let window = onset; window < length; window += 1) energy[window] = loud;
  assert.ok(quiet >= 20);
  return energy;
}

function segment(over: Partial<WhisperSegment> = {}): WhisperSegment {
  return {
    id: 1,
    text: "2번입니다.",
    localStartSeconds: 0.4,
    localEndSeconds: 1.2,
    avgLogProbability: -0.2,
    noSpeechProbability: 0.1,
    compressionRatio: 1.1,
    words: [
      { text: " 2번입니다.", localStartSeconds: 0.4, localEndSeconds: 1.2, probability: 0.9 },
    ],
    ...over,
  };
}

function probe(over: Partial<WhisperProbe> = {}): WhisperProbe {
  const start = 60 * FRAMES;
  return {
    id: 1,
    startFrame: start,
    frameCount: 700 * FRAMES,
    onsetFrame: start + 20 * FRAMES,
    quietBeforeFrames: 30 * FRAMES,
    sampleRate: RATE,
    durationSeconds: 14,
    overflow: false,
    segments: [segment()],
    ...over,
  };
}

const clock: RecognitionClock = {
  sampleRate: RATE,
  channels: 2,
  frameCount: 39924224,
  durationMs: 905312,
  pcmSha256: "ab".repeat(32),
  sourceAudioSha256: "cd".repeat(32),
  playbackSha256: "ef".repeat(32),
};

describe("hypothesis probes", () => {
  it("listens at the quiet-lead island and ignores an interior energy edge", () => {
    const energy = energyWithIsland(80);
    energy[130] = energyThreshold(FRAMES) * 20;
    const planned = planHypothesisProbe(energy, RATE, energy.length * FRAMES, 80 * 0.02 + 1);
    assert.ok(planned);
    assert.equal(planned.onsetFrame, 80 * FRAMES);
    assert.equal(planned.startFrame, 60 * FRAMES);
    assert.equal(planned.onsetFrame - planned.startFrame, 20 * FRAMES);
    assert.equal(planned.frameCount, 700 * FRAMES);
    assert.equal(seekStartMs(planned.startFrame, RATE), 1200);
    assert.equal(planned.hypothesisMayBeLate, false);
    assert.notEqual(planned.onsetSeconds, 130 * 0.02);
  });

  it("returns no probe when the hypothesis sits inside continuous sound", () => {
    const energy = new Float64Array(400);
    energy.fill(energyThreshold(FRAMES) * 4);
    assert.equal(planHypothesisProbe(energy, RATE, energy.length * FRAMES, 2), null);
  });

  it("can look further back without treating an interior edge as the onset", () => {
    const energy = energyWithIsland(80);
    const hypothesis = 80 * 0.02 + 4;
    assert.equal(planHypothesisProbe(energy, RATE, energy.length * FRAMES, hypothesis), null);
    const recovered = planHypothesisProbe(energy, RATE, energy.length * FRAMES, hypothesis, { before: 8 });
    assert.ok(recovered);
    assert.equal(recovered.onsetFrame, 80 * FRAMES);
    assert.equal(recovered.hypothesisMayBeLate, true);
  });

  it("marks a late ASR estimate without moving the onset onto it", () => {
    const energy = energyWithIsland(200);
    const hypothesis = 200 * 0.02 + 2.2;
    const planned = planHypothesisProbe(energy, RATE, energy.length * FRAMES, hypothesis);
    assert.ok(planned);
    assert.equal(planned.onsetSeconds, 4);
    assert.equal(planned.hypothesisMayBeLate, true);
    assert.ok(Math.abs(planned.onsetSeconds - hypothesis) > 2);
  });
});

describe("whisper reading", () => {
  it("reads the spoken cue from the probe and not the generated ordinal", () => {
    const reading = interpretCueProbe(probe(), [2]);
    assert.equal(reading.ok, true);
    if (reading.ok) assert.deepEqual(reading.spoken, [2]);
    assert.equal(nativeLeadProblem(probe(), clock), null);
  });

  it("holds a copied full-ASR probe, an uncertain cue, and a late first word", () => {
    assert.equal(copiedFullAsrProbe({ pcmLayout: "float32le-interleaved", segments: [] }), true);
    const copied = probe({
      pcmLayout: "float32le-interleaved",
      segments: [
        segment({
          localEndSeconds: 30,
          words: [{ text: " 2번", localStartSeconds: 0, localEndSeconds: 30, probability: 1 }],
        }),
      ],
    });
    (copied.segments[0] as unknown as Record<string, number>).rawEstimatedStartSeconds = 68.29;
    assert.deepEqual(interpretCueProbe(copied, [2]), { ok: false, reasons: ["held_copied_asr_probe"] });
    assert.deepEqual(
      interpretCueProbe(probe({ segments: [segment({ avgLogProbability: -1.4 })] }), [2]),
      { ok: false, reasons: ["held_uncertain_cue"] },
    );
    assert.deepEqual(
      interpretCueProbe(
        probe({
          segments: [
            segment({
              localStartSeconds: 2.4,
              localEndSeconds: 3,
              words: [{ text: " 2번입니다.", localStartSeconds: 2.4, localEndSeconds: 3, probability: 0.9 }],
            }),
          ],
        }),
        [2],
      ),
      { ok: false, reasons: ["held_cue_not_at_probe_start"] },
    );
  });

  it("holds a word that runs past the clip and a cue that is not the expected passage", () => {
    const overflow = probe({
      segments: [
        segment({
          words: [{ text: " 2번입니다.", localStartSeconds: 0.4, localEndSeconds: 14.01, probability: 0.5 }],
        }),
      ],
    });
    assert.deepEqual(interpretCueProbe(overflow, [2]), { ok: false, reasons: ["held_probe_time_overflow"] });
    assert.deepEqual(
      interpretCueProbe(probe({ segments: [segment({ text: "3번입니다." })] }), [2]),
      { ok: false, reasons: ["held_probe_cue_mismatch"] },
    );
    assert.deepEqual(
      interpretCueProbe(probe({ segments: [segment({ text: "Look at this sign." })] }), [2]),
      { ok: false, reasons: ["held_probe_does_not_begin_with_cue"] },
    );
  });

  it("keeps one shared 16-17 cue and rejects a zero-lead onset", () => {
    const shared = interpretCueProbe(
      probe({ segments: [segment({ text: "16번과 17번입니다." })] }),
      [16, 17],
    );
    assert.equal(shared.ok, true);
    if (shared.ok) assert.deepEqual(shared.spoken, [16, 17]);
    assert.equal(
      nativeLeadProblem(probe({ onsetFrame: probe().startFrame }), clock),
      "held_native_lead",
    );
    const shortQuiet = probe().startFrame;
    assert.equal(
      nativeLeadProblem(
        probe({
          startFrame: shortQuiet,
          onsetFrame: shortQuiet + 17 * FRAMES,
          quietBeforeFrames: 17 * FRAMES,
        }),
        clock,
      ),
      null,
    );
    assert.equal(
      nativeLeadProblem(
        probe({
          startFrame: shortQuiet - 3 * FRAMES,
          onsetFrame: shortQuiet + 17 * FRAMES,
          quietBeforeFrames: 17 * FRAMES,
        }),
        clock,
      ),
      "held_native_lead",
    );
  });

  it("keeps grounding anchors inside the spoken passage and holds anchors past the next cue", () => {
    const segments = [
      { id: 9, text: "2번입니다.", estimatedStartSeconds: 68.29 },
      { id: 13, text: "Look at this sign.", estimatedStartSeconds: 101.3 },
      { id: 14, text: "You cannot take pictures in the museum.", estimatedStartSeconds: 103.3 },
      { id: 16, text: "3번입니다.", estimatedStartSeconds: 107.3 },
    ];
    assert.equal(anchorsInsidePassage(segments, 9, [13, 14]), true);
    assert.equal(anchorsInsidePassage(segments, 16, [13, 14]), false);
  });
});

describe("measured 2006-1 energy", () => {
  it("places the 2번 hypothesis on the quiet-lead island, not the interior edge at 68.23s", () => {
    const bytes = readFileSync(
      "C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/grok/native/ebs-middle-1-2006-1.energy.f64",
    );
    const copy = Buffer.from(bytes);
    const energy = new Float64Array(copy.buffer, copy.byteOffset, copy.length / 8);
    const planned = planHypothesisProbe(energy, RATE, 39924224, 68.29);
    assert.ok(planned);
    assert.ok(planned.onsetSeconds > 65 && planned.onsetSeconds < 67.5);
    assert.ok(Math.abs(planned.onsetSeconds - 68.23) > 1);
    assert.equal(planned.hypothesisMayBeLate, true);
    assert.equal(planned.onsetFrame - planned.startFrame, 20 * FRAMES);
    assert.equal(planned.frameCount / RATE, 14);
  });

  it("selects the 92.04s rise from the measured hiss floor and does not call that floor quiet", () => {
    const path = "C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/grok/native/ebs-middle-1-2006-1.energy.f64";
    const bytes = readFileSync(path);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      "877729dbb33b42171a899d4aa91b3c874a49d91442fc445a709196508b7c5f36",
    );
    const copy = Buffer.from(bytes);
    const energy = new Float64Array(copy.buffer, copy.byteOffset, copy.length / 8);
    const planned = planNoiseFloorProbe(energy, RATE, 39924224, { fromSeconds: 68.29, toSeconds: 93.3 });
    assert.ok(planned);
    assert.equal(planned.purpose, "noise_floor_contrast_v1");
    assert.equal(planned.onsetWindow, 4602);
    assert.equal(planned.onsetSeconds, 92.04);
    assert.equal(planned.baselineStartFrame, 3970764);
    assert.equal(planned.baselineFrameCount, 100 * FRAMES);
    assert.ok(Math.abs(planned.medianDbfs - -46.03755040145689) < 1e-8);
    assert.ok(Math.abs(planned.p10Dbfs - -46.55362846446592) < 1e-8);
    assert.ok(Math.abs(planned.p90Dbfs - -45.521646015262355) < 1e-8);
    assert.ok(planned.p90Dbfs - planned.p10Dbfs <= 6);
    assert.equal(planned.quietWindows, 127);
    assert.equal(planned.absoluteQuietWindows, 0);
    assert.equal(planned.quietBeforeFrames, 127 * FRAMES);
    assert.equal(planned.startFrame, 4041324);
    assert.equal(planned.onsetFrame, 4058964);
    assert.equal(planned.onsetFrame - planned.startFrame, 20 * FRAMES);
    assert.ok(planned.leadPeakDbfs != null && Math.abs(planned.leadPeakDbfs - -44.86753161662287) < 1e-8);
    const cleanOnHiss = planCleanSourceProbe(energy, RATE, 39924224, {
      fromSeconds: 68.29,
      toSeconds: 93.3,
    });
    if (cleanOnHiss) {
      assert.ok(cleanOnHiss.quietWindows >= 5);
      assert.equal(cleanOnHiss.leadWindows, Math.min(20, cleanOnHiss.quietWindows));
      assert.notEqual(cleanOnHiss.onsetFrame, planned.onsetFrame);
    }
    const clock: RecognitionClock = {
      sampleRate: RATE,
      channels: 2,
      frameCount: 39924224,
      durationMs: 905312,
      pcmSha256: "a71554b09a530fbdafd44d80d5bd489d9713888eb30e1cc43675120e12c4a1a7",
      sourceAudioSha256: "ed621f67a023e1449bb18fbcde7a669e0db58b86625752b6fd93aea6c91bb12d",
      playbackSha256: "3888e7b4c772a0c342a66944beb331222bce8483a2a575b20ed339d0a09d9fbc",
    };
    assert.equal(
      nativeLeadProblem(
        {
          id: 1,
          startFrame: planned.startFrame,
          frameCount: planned.frameCount,
          onsetFrame: planned.onsetFrame,
          quietBeforeFrames: planned.absoluteQuietWindows * FRAMES,
          sampleRate: RATE,
          durationSeconds: planned.frameCount / RATE,
          overflow: false,
          segments: [],
        },
        clock,
      ),
      "held_native_lead",
    );
  });
});

describe("one-second stationary floor", () => {
  it("does not let a 50-bin floor satisfy the two-second tier", () => {
    const floor = FRAMES * 32768 * 32768 * 10 ** (-40 / 10);
    const speech = FRAMES * 32768 * 32768 * 10 ** (-20 / 10);
    const energy = new Float64Array(120);
    for (let index = 0; index < 50; index += 1) energy[index] = speech;
    for (let index = 50; index < 100; index += 1) energy[index] = floor;
    for (let index = 100; index < 120; index += 1) energy[index] = speech;
    const search = { fromSeconds: 0, toSeconds: 2.4 };
    const sourceFrames = 1000 * FRAMES;
    assert.equal(planNoiseFloorProbe(energy, RATE, sourceFrames, search), null);
    const planned = planNoiseFloor1SecondProbe(energy, RATE, sourceFrames, search);
    assert.ok(planned);
    assert.equal(planned.purpose, "noise_floor_contrast_1second_v1");
    assert.equal(planned.onsetWindow, 100);
    assert.equal(planned.baselineFrameCount, 50 * FRAMES);
    assert.equal(planned.onsetFrame - planned.startFrame, 20 * FRAMES);
    assert.equal(planned.quietWindows, 50);
  });
});

describe("clean-source v2", () => {
  const clock: RecognitionClock = {
    sampleRate: RATE,
    channels: 2,
    frameCount: 400 * FRAMES,
    durationMs: Math.round((400 * FRAMES * 1000) / RATE),
    pcmSha256: "0",
    sourceAudioSha256: "0",
    playbackSha256: "0",
  };

  function reading(planned: {
    startFrame: number;
    frameCount: number;
    onsetFrame: number;
    quietBeforeFrames: number;
  }): WhisperProbe {
    return {
      id: 1,
      startFrame: planned.startFrame,
      frameCount: planned.frameCount,
      onsetFrame: planned.onsetFrame,
      quietBeforeFrames: planned.quietBeforeFrames,
      sampleRate: RATE,
      durationSeconds: planned.frameCount / RATE,
      overflow: false,
      segments: [],
    };
  }

  it("keeps a 140 ms lead and does not stretch it to 400 ms", () => {
    const energy = new Float64Array(400);
    const loud = energyThreshold(FRAMES) * 4;
    for (let window = 7; window < energy.length; window += 1) energy[window] = loud;
    const planned = planCleanSourceProbe(energy, RATE, energy.length * FRAMES, {
      fromSeconds: 0,
      toSeconds: 8,
    });
    assert.ok(planned);
    assert.equal(planned.purpose, "absolute_energy_v2");
    assert.equal(planned.onsetWindow, 7);
    assert.equal(planned.quietWindows, 7);
    assert.equal(planned.leadWindows, 7);
    assert.equal(planned.quietBeforeFrames, 7 * FRAMES);
    assert.equal(planned.onsetFrame - planned.startFrame, 7 * FRAMES);
    assert.equal(nativeLeadProblem(reading(planned), clock), null);
  });

  it("returns null when the gap is shorter than 100 ms", () => {
    const energy = new Float64Array(400);
    const loud = energyThreshold(FRAMES) * 4;
    for (let window = 4; window < energy.length; window += 1) energy[window] = loud;
    assert.equal(
      planCleanSourceProbe(energy, RATE, energy.length * FRAMES, { fromSeconds: 0, toSeconds: 8 }),
      null,
    );
  });

  it("caps a longer quiet at a 400 ms lead", () => {
    const energy = new Float64Array(400);
    const loud = energyThreshold(FRAMES) * 4;
    for (let window = 30; window < energy.length; window += 1) energy[window] = loud;
    const planned = planCleanSourceProbe(energy, RATE, energy.length * FRAMES, {
      fromSeconds: 0,
      toSeconds: 8,
    });
    assert.ok(planned);
    assert.equal(planned.quietWindows, 30);
    assert.equal(planned.leadWindows, 20);
    assert.equal(planned.quietBeforeFrames, 30 * FRAMES);
    assert.equal(planned.onsetFrame - planned.startFrame, 20 * FRAMES);
    assert.equal(nativeLeadProblem(reading(planned), clock), null);
  });
});

describe("runner contract", () => {
  it("unloads Whisper before releasing the shared lock and refuses a foreign lock", () => {
    const source = readFileSync(
      fileURLToPath(new URL("./run_one_probe.py", import.meta.url)),
      "utf8",
    );
    const finallyAt = source.lastIndexOf("finally:");
    const tail = source.slice(finallyAt);
    const drop = tail.indexOf("model = None");
    const collect = tail.indexOf("gc.collect()");
    const release = tail.indexOf("lock.release()");
    assert.ok(drop >= 0 && collect > drop && release > collect);
    assert.match(source, /refusing to remove it/);
    assert.doesNotMatch(source, /os\.remove\(self\.path\)[\s\S]{0,80}if current/);
  });
});

describe("assigned inventory replay", () => {
  it("replays all 72 grok sources against the production clock and playback slices", () => {
    const root = "C:/Creative/testautocreator";
    const inventory = JSON.parse(readFileSync(
      `${root}/.qa-artifacts/whole-audio-seek-20261005/inventory.json`,
      "utf8",
    ));
    const bindings = JSON.parse(readFileSync(
      `${root}/.qa-artifacts/whole-audio-seek-20261005/media-bindings.json`,
      "utf8",
    ));
    const clockFile = JSON.parse(readFileSync(
      `${root}/output/listening-assessments/whole-audio-seek-20261005/codex/complete-native-clock.json`,
      "utf8",
    ));
    const grok = inventory.records.filter((record: { assignedAgent: string }) => record.assignedAgent === "grok");
    assert.equal(grok.length, 72);
    assert.equal(grok.reduce((sum: number, record: { questions: unknown[] }) => sum + record.questions.length, 0), 1282);
    const proofs = new Map(bindings.proofs.map((proof: { sourceRecordId: string }) => [proof.sourceRecordId, proof]));
    const clocks = new Map(clockFile.records.map((record: { sourceRecordId: string }) => [record.sourceRecordId, record]));
    let slices = 0;
    for (const record of grok) {
      const timed = clocks.get(record.sourceRecordId) as {
        status: string;
        sourceAudioSha256: string;
        playbackSha256: string;
        sourceToPlaybackOffsetMs: number;
        durationMs: number;
        sampleRate: number;
      };
      assert.equal(timed.status, "passed");
      assert.equal(timed.sourceAudioSha256, record.sourceAudioSha256);
      assert.equal(timed.playbackSha256, record.audio.sha256);
      assert.equal(timed.sourceToPlaybackOffsetMs, 0);
      assert.equal(timed.durationMs, record.audio.durationMs);
      assert.equal(windowFrames(timed.sampleRate) > 0, true);
      const file = readFileSync(record.sourceAudioPath);
      assert.equal(createHash("sha256").update(file).digest("hex"), record.sourceAudioSha256);
      const proof = proofs.get(record.sourceRecordId) as {
        originalMimeType: string | null;
        record?: { storage?: { start?: number; endExclusive?: number } };
      };
      const storage = proof.record?.storage;
      if (Number.isInteger(storage?.start) && Number.isInteger(storage?.endExclusive)) {
        const slice = file.subarray(storage.start, storage.endExclusive);
        assert.equal(createHash("sha256").update(slice).digest("hex"), record.audio.sha256);
        slices += 1;
      } else {
        assert.equal(record.sourceRecordId, "ebs-middle-1-2006-2");
        assert.equal(proof.originalMimeType, "audio/mp4");
      }
    }
    assert.equal(slices, 71);
  });
});
