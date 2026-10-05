/**
 * Read-only access to the frozen baseline, the measured native caches, stored
 * bounded recognitions and the search hints. Every file is read as bytes once
 * and its SHA-256 is of those bytes; a bound input whose hash differs is
 * refused. Nothing under the main checkout is opened for writing except this
 * producer's own new output files, each written once.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { headingCue } from "./rules.mjs";

export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");

export class FrozenInputError extends Error {}

export const MAIN = "C:/Creative/testautocreator";
const SEEK5 = MAIN + "/output/listening-assessments/whole-audio-seek-20261005";
const HELD5 = SEEK5 + "/codex-held-validation-20261005";

export const OUT =
  MAIN +
  "/output/listening-assessments/whole-audio-seek-20261006/native-recovery/claude";

const REBASE6 =
  MAIN +
  "/output/listening-assessments/whole-audio-seek-20261006/native-recovery/rebase-baseline-001";

/**
 * The fresh exact-live baseline of 2026-10-06 (all 2,727 starts in the live
 * documents) and the certificate that proved them. Another exact rebase is
 * passed on the command line with its hashes.
 */
export const DEFAULT_INPUTS = Object.freeze({
  inventory: {
    path: REBASE6 + "/inventory.json",
    sha256: "58a53b05cced7b7f9f2b99cc641d8e84e6cf4ee7771bea3f7efa745449fda913",
  },
  clock: {
    path: REBASE6 + "/clock.json",
    sha256: "bb8b37ddcd038f2f4bd2bafd346873705275aa88b2d78d605815665589f16591",
  },
  certificate: {
    path: HELD5 + "/replay-final-002/certificate.json",
    sha256: "776d313ae3ffc626627c722a93e2c24e7eff0284890f4e268bf676114d6e6046",
  },
});

/** Family-separated partition of the certified controls, frozen by the coordinator. */
export const GROUPED_CONTROLS = Object.freeze({
  path:
    MAIN +
    "/.qa-artifacts/listening-seek-research-20261006/grouped-controls-001.json",
  sha256: "b47efb3b546d39857a47c209073b38027781a7ccc690ccb2a84f21940819e52f",
});

/** The research plan's 35 pilot questions (diagnostic scopes, no measured start). */
export const PILOT_PLAN = Object.freeze({
  path: MAIN + "/.qa-artifacts/listening-seek-research-20261006/pilot-plan.json",
  sha256: "5cd2a36c076379a11041dce24ec52457e1153ebd8dfaa2292ba6c64c86c439ff",
});

/**
 * Sources whose stored recognitions or loudness were read by eye while these
 * rules were being written. Control figures for them are reported apart: a
 * rule shaped on a recording is not tested by that recording.
 */
export const INSPECTED_DURING_DEVELOPMENT = Object.freeze([
  "ebs-middle-1-2007-2",
  "ebs-middle-1-2009-2",
  "ebs-middle-2-2007-2",
]);

export const TOOLS = Object.freeze({
  python: SEEK5 + "/claude/asr-venv/Scripts/python.exe",
  lock: SEEK5 + "/gpu-probe.lock",
  modelCache: MAIN + "/output/listening-assessments/reconstruction/model-cache",
  modelRevision: "08e178d48790749d25932bbc082711ddcfdfbc4f",
  runtimeRoot: SEEK5 + "/decoder-runtime",
  transcripts: MAIN + "/.qa-artifacts/assemblyai-seek-20261005/transcripts",
  /** Earlier bounded recognitions written by the same runner; read by hash only. */
  priorProbeRoots: [SEEK5 + "/claude-held-validation-20261005"],
});

const parse = (bytes) =>
  JSON.parse(bytes.toString("utf8").replace(/^\uFEFF/, ""));

export function readBound(path, expectedSha256, label) {
  const bytes = readFileSync(path);
  const actual = sha256(bytes);
  if (actual !== expectedSha256)
    throw new FrozenInputError(
      `${label} changed: ${path} expected ${expectedSha256} got ${actual}`,
    );
  return bytes;
}

export const readBoundJson = (path, expectedSha256, label) =>
  parse(readBound(path, expectedSha256, label));

/** `overrides`: { inventory, inventorySha256, clock, clockSha256, certificate, certificateSha256 }. */
export function loadBaseline(overrides = {}) {
  const inputs = {};
  for (const name of ["inventory", "clock", "certificate"]) {
    const path = overrides[name] ?? DEFAULT_INPUTS[name].path;
    const expected = overrides[name]
      ? overrides[name + "Sha256"]
      : DEFAULT_INPUTS[name].sha256;
    if (!expected)
      throw new FrozenInputError(`--${name}-sha256 is required with --${name}`);
    inputs[name] = { path: path.replace(/\\/g, "/"), sha256: expected };
  }
  const inventory = readBoundJson(
    inputs.inventory.path,
    inputs.inventory.sha256,
    "Inventory",
  );
  const clock = readBoundJson(inputs.clock.path, inputs.clock.sha256, "Clock");
  const certificate = readBoundJson(
    inputs.certificate.path,
    inputs.certificate.sha256,
    "Certificate",
  );
  if (clock.inventorySha256 && overrides.requireClockOfInventory)
    if (clock.inventorySha256 !== inputs.inventory.sha256)
      throw new FrozenInputError("Clock belongs to another inventory");
  const certBySource = new Map();
  for (const row of certificate.records) {
    if (!certBySource.has(row.sourceRecordId))
      certBySource.set(row.sourceRecordId, []);
    certBySource.get(row.sourceRecordId).push(row);
  }
  return {
    inputs,
    inventory,
    recordById: new Map(inventory.records.map((r) => [r.sourceRecordId, r])),
    clockBySource: new Map(clock.records.map((r) => [r.sourceRecordId, r])),
    certificate,
    certBySource,
  };
}

/** Physical identity of a source on the frozen clock, or the reason it cannot be listened to here. */
export function clockIdentity(record, clock) {
  if (!clock) return { unavailable: "clock_record_missing" };
  if (
    clock.status !== "passed" ||
    clock.sourceToPlaybackOffsetMs !== 0 ||
    clock.sourceAudioSha256 !== record.sourceAudioSha256 ||
    clock.playbackSha256 !== record.audio.sha256 ||
    clock.durationMs !== record.audio.durationMs
  )
    return { unavailable: "clock_record_does_not_bind_this_source" };
  if (clock.convertedClockProof || !/\.mp3$/i.test(record.sourceAudioPath))
    return { unavailable: "converted_playback_clock_source_not_listened" };
  return {
    sampleRate: clock.sampleRate,
    channels: clock.channels,
    frameCount: clock.frameCount,
    pcmSha256: clock.decodedInterleavedInt16Sha256,
  };
}

/** Measured loudness of one source, bound to the frozen clock's full-PCM identity. */
export function loadNativeCache(outDir, record, identity) {
  const metaPath = join(outDir, "native", record.sourceRecordId + ".native.json");
  const energyPath = join(outDir, "native", record.sourceRecordId + ".energy.f64");
  const metaBytes = readFileSync(metaPath);
  const meta = parse(metaBytes);
  const energyBytes = readFileSync(energyPath);
  const problems = [];
  if (
    meta.sourceRecordId !== record.sourceRecordId ||
    meta.sourceAudioSha256 !== record.sourceAudioSha256
  )
    problems.push("native_cache_wrong_source");
  if (sha256(energyBytes) !== meta.energy.sha256)
    problems.push("native_energy_hash_mismatch");
  if (
    meta.pcm.sha256 !== identity.pcmSha256 ||
    meta.pcm.sampleRate !== identity.sampleRate ||
    meta.pcm.frameCount !== identity.frameCount ||
    meta.pcm.channels !== identity.channels
  )
    problems.push("native_full_pcm_differs_from_clock");
  if (
    energyBytes.length !== meta.energy.windowCount * 8 ||
    meta.energy.windowCount !==
      Math.floor(meta.pcm.frameCount / meta.energy.windowFrames)
  )
    problems.push("native_energy_shape_mismatch");
  if (problems.length)
    throw new FrozenInputError(problems.join(",") + ": " + metaPath);
  return {
    energy: new Float64Array(
      energyBytes.buffer.slice(
        energyBytes.byteOffset,
        energyBytes.byteOffset + energyBytes.byteLength,
      ),
    ),
    windowFrames: meta.energy.windowFrames,
    sampleRate: meta.pcm.sampleRate,
    frameCount: meta.pcm.frameCount,
    channels: meta.pcm.channels,
    pcmSha256: meta.pcm.sha256,
    cachePath: metaPath.replace(/\\/g, "/"),
    cacheSha256: sha256(metaBytes),
    energyPath: energyPath.replace(/\\/g, "/"),
    energySha256: meta.energy.sha256,
  };
}

/**
 * Stored bounded recognitions of one source across output folders. A probe is
 * offered only from a container that names this source's bytes and full PCM,
 * the frozen model snapshot, and a request file whose hash it records.
 */
export class ProbeStore {
  constructor(roots) {
    this.roots = roots;
    this.cache = new Map();
    this.requests = new Map();
    /** Every container read, used or not: [{ path, sha256, ... }]. */
    this.catalog = [];
  }

  requestSha(path) {
    const key = resolve(path);
    if (!this.requests.has(key))
      this.requests.set(
        key,
        existsSync(key) ? sha256(readFileSync(key)) : null,
      );
    return this.requests.get(key);
  }

  /** [{ ref, language, purpose, startFrame, frameCount, onsetFrame, probe, own }] */
  listenings(record, identity) {
    const id = record.sourceRecordId;
    if (this.cache.has(id)) return this.cache.get(id);
    const out = [];
    this.roots.forEach((root, rootIndex) => {
      const probes = join(root, "probes");
      if (!existsSync(probes)) return;
      for (const round of readdirSync(probes).sort()) {
        const path = join(probes, round, id + ".json");
        if (!existsSync(path)) continue;
        const bytes = readFileSync(path);
        const container = parse(bytes);
        if (
          container.sourceRecordId !== id ||
          container.sourceAudioSha256 !== record.sourceAudioSha256 ||
          container.nativePcm?.sha256 !== identity.pcmSha256 ||
          container.nativePcm?.sampleRate !== identity.sampleRate ||
          container.nativePcm?.frameCount !== identity.frameCount ||
          container.modelSnapshotRevision !== TOOLS.modelRevision ||
          container.vadFilter !== false ||
          container.conditionOnPreviousText !== false ||
          this.requestSha(container.requestPath) !== container.requestSha256
        )
          throw new FrozenInputError("Probe container is not bound: " + path);
        const containerSha256 = sha256(bytes);
        const language = (probe) =>
          probe.requestedLanguage ?? container.requestedLanguage;
        this.catalog.push({
          path: resolve(path).replace(/\\/g, "/"),
          sha256: containerSha256,
          sourceRecordId: id,
          root: root.replace(/\\/g, "/"),
          round,
          requestPath: String(container.requestPath).replace(/\\/g, "/"),
          requestSha256: container.requestSha256,
          probes: container.probes.length,
          koProbes: container.probes.filter((x) => language(x) === "ko").length,
          enProbes: container.probes.filter((x) => language(x) === "en").length,
        });
        for (const probe of container.probes) {
          if (
            probe.sampleRate !== identity.sampleRate ||
            !Number.isSafeInteger(probe.startFrame) ||
            !Number.isSafeInteger(probe.frameCount) ||
            probe.startFrame < 0 ||
            probe.startFrame + probe.frameCount > identity.frameCount ||
            Math.abs(
              probe.durationSeconds - probe.frameCount / identity.sampleRate,
            ) > 1e-9
          )
            throw new FrozenInputError("Probe bounds are wrong: " + path);
          out.push({
            ref: {
              path: resolve(path).replace(/\\/g, "/"),
              sha256: containerSha256,
              probeId: probe.id,
              startFrame: probe.startFrame,
              frameCount: probe.frameCount,
              clipPcmSha256: probe.clipPcmSha256,
              inputMonoFloat32Sha256: probe.inputMonoFloat32Sha256,
            },
            language: probe.requestedLanguage ?? container.requestedLanguage,
            purpose: probe.purpose ?? null,
            startFrame: probe.startFrame,
            frameCount: probe.frameCount,
            onsetFrame: probe.onsetFrame ?? null,
            probe,
            own: rootIndex === 0,
          });
        }
      }
    });
    this.cache.set(id, out);
    return out;
  }
}

// ------------------------------------------------------------- mapping ----

/** Frozen generation quotes by question id, through the prepared and alignment files. */
export function loadGeneration(record) {
  const prepared = readBoundJson(
    record.preparedPath,
    record.preparedSha256,
    "Prepared file",
  );
  const alignmentBytes = readFileSync(record.alignmentPath);
  const alignment = parse(alignmentBytes);
  if (
    alignment.preparedSha256 !== record.preparedSha256 ||
    alignment.sourceAudioSha256 !== record.sourceAudioSha256 ||
    alignment.sourceRecordId !== record.sourceRecordId
  )
    throw new FrozenInputError(
      "Generation alignment is not of this source: " + record.alignmentPath,
    );
  const grounding = new Map(
    (prepared.verification?.grounding ?? []).map((row) => [
      row.generatedOrdinal,
      row,
    ]),
  );
  const ids = new Set(record.questions.map((q) => q.id));
  const byQuestion = new Map();
  for (const candidate of alignment.candidates ?? []) {
    const row = grounding.get(candidate.generatedOrdinal);
    if (!ids.has(candidate.questionId) || !row) continue;
    if (byQuestion.has(candidate.questionId))
      throw new FrozenInputError("Question aligned twice: " + candidate.questionId);
    const segmentIds = candidate.sourceSegmentIds ?? [];
    byQuestion.set(candidate.questionId, {
      generatedOrdinal: candidate.generatedOrdinal,
      evidenceQuotes: Array.isArray(row.evidenceQuotes) ? row.evidenceQuotes : [],
      frozenSourceSegmentIds: segmentIds,
      // The grounding the generation kept must be the alignment's, unchanged.
      groundingIntact:
        alignment.asrSha256 === record.asrSha256 &&
        candidate.method === "verified_generation_evidence_segments" &&
        row.included === true &&
        JSON.stringify(row.sourceSegmentIds) === JSON.stringify(segmentIds),
      estimatedStartMs: candidate.estimatedStartMs ?? null,
      estimatedEndMs: candidate.estimatedEndMs ?? null,
    });
  }
  return {
    byQuestion,
    inputs: {
      prepared: {
        path: record.preparedPath.replace(/\\/g, "/"),
        sha256: record.preparedSha256,
      },
      generationAlignment: {
        path: record.alignmentPath.replace(/\\/g, "/"),
        sha256: sha256(alignmentBytes),
      },
    },
  };
}

// --------------------------------------------------------------- hints ----

const NUMBER_TOKEN = /^(\d{1,2})번/;

/**
 * Where to listen, never what was heard: numbers and words as the two provider
 * transcripts and the frozen whole-record recognition wrote them, with their
 * estimated times. A transcript whose bytes do not match its envelope, or that
 * is of other audio, gives no hints.
 */
export function loadHints(record) {
  const hints = { numbers: [], englishWords: [], asrSegments: [], inputs: {} };
  const dir = join(TOOLS.transcripts, record.sourceRecordId);
  if (existsSync(dir))
    for (const job of readdirSync(dir).sort()) {
      const envelopePath = join(dir, job, "envelope.json");
      if (!existsSync(envelopePath)) continue;
      const envelope = parse(readFileSync(envelopePath));
      if (envelope.sourceAudioSha256 !== record.sourceAudioSha256) continue;
      const rawBytes = readFileSync(envelope.raw.path);
      if (sha256(rawBytes) !== envelope.raw.sha256) continue;
      const words = (parse(rawBytes).words ?? []).filter(
        (w) => Number.isFinite(w.start) && Number.isFinite(w.end),
      );
      const bilingual = (envelope.request.language_codes ?? []).includes("ko");
      hints.inputs[bilingual ? "providerHeadings" : "providerEnglish"] = {
        path: envelope.raw.path.replace(/\\/g, "/"),
        sha256: envelope.raw.sha256,
        model: envelope.actualModel,
      };
      if (!bilingual) {
        hints.englishWords = words;
        continue;
      }
      for (let i = 0; i < words.length; i++) {
        const token = String(words[i].text).match(NUMBER_TOKEN);
        if (!token) continue;
        let next = i + 1;
        while (next < words.length && NUMBER_TOKEN.test(String(words[next].text)))
          next++;
        hints.numbers.push({
          source: "provider_headings",
          number: Number(token[1]),
          tokenStartMs: words[i].start,
          tokenEndMs: words[i].end,
          nextWordStartMs: words[next]?.start ?? null,
        });
      }
    }
  if (record.asrPath && existsSync(record.asrPath)) {
    const asr = readBoundJson(
      record.asrPath,
      record.asrSha256,
      "Whole-record recognition",
    );
    hints.inputs.frozenAsr = {
      path: record.asrPath.replace(/\\/g, "/"),
      sha256: record.asrSha256,
    };
    hints.asrSegments = asr.segments.map((s) => ({
      id: s.id,
      text: s.text,
      startSeconds: s.estimatedStartSeconds,
      endSeconds: s.estimatedEndSeconds,
    }));
    for (const segment of hints.asrSegments) {
      const cue = headingCue(segment.text);
      if (!cue) continue;
      for (const number of cue.numbers)
        hints.numbers.push({
          source: "frozen_asr",
          number,
          segmentStartMs: Math.round(segment.startSeconds * 1000),
          segmentEndMs: Math.round(segment.endSeconds * 1000),
        });
    }
  }
  return hints;
}
