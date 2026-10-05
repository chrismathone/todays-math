#!/usr/bin/env node
/**
 * Plans bounded listenings for reconstructed questions whose original numbered
 * passage is already established by the frozen mapping audit but whose number
 * nobody heard at a measured place.
 *
 *   node plan-reconstructed-onsets.mjs --out <held-validation dir> --round 003
 *        [--before-seconds 2] [--probe-windows 400]
 *
 * For every such passage it lists each measured onset (the existing absolute
 * loudness policy, under the normal and the finer island split) that lies in
 * the estimated span of the passage's own number in the frozen whole-record
 * recognition, and a little before it. An onset someone already listened to
 * from the same frame is not asked again. The estimated span only says where to
 * listen; what is heard there decides.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { energyAtDbfs } from "../claude/lib/activity.mjs";
import { onsetCandidates } from "../claude/lib/candidates.mjs";
import { POLICY } from "../claude/lib/policy.mjs";
import {
  FROZEN,
  PATHS,
  ProbeStore,
  loadNativeEnergy,
  readFrozen,
} from "./lib/store.mjs";

const { values } = parseArgs({
  options: {
    out: { type: "string" },
    round: { type: "string" },
    "before-seconds": { type: "string", default: "2" },
    "probe-windows": { type: "string", default: "400" },
    "dry-run": { type: "boolean" },
  },
});
for (const key of ["out", "round"])
  if (!values[key]) throw new Error(`--${key} is required`);
if (!/^\d{3}$/.test(values.round)) throw new Error("--round is three digits");
const before = Number(values["before-seconds"]);
const probeWindows = Number(values["probe-windows"]);

const inventory = readFrozen("inventory");
const audit = readFrozen("mappingAudit");
const held = new Set(
  readFrozen("heldDiagnostics")
    .records.filter((r) => r.reconstructed)
    .map((r) => r.questionId),
);
const clockBySource = new Map(
  readFrozen("clock").records.map((r) => [r.sourceRecordId, r]),
);
const recordById = new Map(inventory.records.map((r) => [r.sourceRecordId, r]));
const store = new ProbeStore([PATHS.grokOut, PATHS.heldOut]);

const requestDir = join(values.out, "probe-requests");
mkdirSync(requestDir, { recursive: true });
const requestPath = join(requestDir, `round-${values.round}.json`);
if (existsSync(requestPath)) throw new Error("Round exists: " + requestPath);

/** One passage = one number of the original recording, with every current question mapped to it. */
const passages = new Map();
for (const row of audit.records) {
  if (row.status !== "mapped" || !held.has(row.questionId)) continue;
  const key = row.sourceRecordId + "#" + row.cueSegmentIds.join(",");
  if (!passages.has(key))
    passages.set(key, {
      sourceRecordId: row.sourceRecordId,
      cueSegmentIds: row.cueSegmentIds,
      cueSpokenNumbers: row.cueSpokenNumbers,
      spanStartSeconds: row.rawEstimatedCueStartSeconds,
      spanEndSeconds: row.rawEstimatedCueEndSeconds,
      questionIds: [],
    });
  passages.get(key).questionIds.push(row.questionId);
}

const sources = [];
const summary = {
  passages: passages.size,
  passagesWithoutMeasuredOnset: 0,
  alreadyListened: 0,
  tooShortForANumber: 0,
};
const bySource = new Map();
for (const passage of passages.values()) {
  if (!bySource.has(passage.sourceRecordId))
    bySource.set(passage.sourceRecordId, []);
  bySource.get(passage.sourceRecordId).push(passage);
}
for (const record of inventory.records) {
  const wanted = bySource.get(record.sourceRecordId);
  if (!wanted) continue;
  if (
    clockBySource.get(record.sourceRecordId).convertedClockProof ||
    !/\.mp3$/i.test(record.sourceAudioPath)
  ) {
    // The one converted original has its own measured playback clock; not handled here.
    summary.convertedSourceSkipped = record.sourceRecordId;
    continue;
  }
  const native = loadNativeEnergy(
    PATHS.grokOut,
    record,
    clockBySource.get(record.sourceRecordId),
  );
  const { energy, windowFrames: frames, sampleRate: rate } = native;
  const threshold = energyAtDbfs(POLICY.quietThresholdDbfs, frames);
  const candidates = new Map();
  for (const split of [POLICY.islandBridgeWindows, POLICY.fineBridgeWindows])
    for (const candidate of onsetCandidates(energy, frames, split))
      if (!candidates.has(candidate.onsetWindow))
        candidates.set(candidate.onsetWindow, { ...candidate, split });
  const listened = new Set();
  for (const loaded of store.containers(record.sourceRecordId))
    for (const probe of loaded.container.probes)
      if (
        (probe.requestedLanguage ?? loaded.container.requestedLanguage) ===
          "ko" &&
        probe.frameCount >= probeWindows * frames
      )
        listened.add(probe.startFrame);
  const probes = [];
  const taken = new Set();
  for (const passage of wanted.sort(
    (a, b) => a.spanStartSeconds - b.spanStartSeconds,
  )) {
    const from = Math.floor(
      ((passage.spanStartSeconds - before) * rate) / frames,
    );
    const to = Math.ceil((passage.spanEndSeconds * rate) / frames);
    const inside = [...candidates.values()]
      .filter(
        (c) =>
          c.onsetWindow >= from && c.onsetWindow <= to && c.startWindow >= 0,
      )
      .sort((a, b) => a.onsetWindow - b.onsetWindow);
    if (!inside.length) summary.passagesWithoutMeasuredOnset++;
    for (const candidate of inside) {
      const startFrame = candidate.startWindow * frames;
      if (taken.has(startFrame)) continue;
      // A spoken number holds at least this much sound in its first two seconds.
      let sound = 0;
      for (
        let w = candidate.onsetWindow;
        w < Math.min(energy.length, candidate.onsetWindow + 100);
        w++
      )
        if (energy[w] >= threshold) sound++;
      if (sound < POLICY.minimumSoundAfterOnsetWindows) {
        summary.tooShortForANumber++;
        continue;
      }
      if (listened.has(startFrame)) {
        summary.alreadyListened++;
        continue;
      }
      const windows = Math.min(
        probeWindows,
        energy.length - candidate.startWindow,
      );
      if (windows < POLICY.minimumProbeWindows) continue;
      taken.add(startFrame);
      probes.push({
        id: probes.length + 1,
        purpose: "reconstructed_cue_onset",
        onsetMethod: "absolute_energy_v2",
        startFrame,
        frameCount: windows * frames,
        onsetFrame: candidate.onsetWindow * frames,
        quietBeforeFrames: candidate.quietWindows * frames,
        islandSplitWindows: candidate.split,
        originalCueSegmentIds: passage.cueSegmentIds,
        originalCueSpokenNumbers: passage.cueSpokenNumbers,
        insideEstimatedCueSpan:
          (candidate.onsetWindow * frames) / rate >= passage.spanStartSeconds &&
          (candidate.onsetWindow * frames) / rate <= passage.spanEndSeconds,
      });
    }
  }
  if (!probes.length) continue;
  sources.push({
    sourceRecordId: record.sourceRecordId,
    sourceAudioPath: record.sourceAudioPath,
    sourceAudioSha256: record.sourceAudioSha256,
    nativeCachePath: native.cachePath,
    nativeCacheSha256: native.cacheSha256,
    sampleRate: rate,
    channels: native.channels,
    frameCount: native.frameCount,
    pcmSha256: native.pcmSha256,
    probes,
  });
}

const all = sources.flatMap((s) => s.probes);
summary.sources = sources.length;
summary.probes = all.length;
summary.insideEstimatedCueSpan = all.filter(
  (p) => p.insideEstimatedCueSpan,
).length;
summary.audioSeconds = Math.round(
  sources.reduce(
    (n, s) => n + s.probes.reduce((m, p) => m + p.frameCount / s.sampleRate, 0),
    0,
  ),
);
const request = {
  schemaVersion: 1,
  provider: "claude",
  lane: "grok",
  round: values.round,
  mode: "reconstructed_cue_onsets",
  createdAt: new Date().toISOString(),
  inventoryPath: FROZEN.inventory.path,
  inventorySha256: FROZEN.inventory.sha256,
  mappingAudit: FROZEN.mappingAudit,
  policy: POLICY,
  beforeSeconds: before,
  language: "ko",
  summary,
  sources,
};
if (!values["dry-run"])
  writeFileSync(requestPath, JSON.stringify(request, null, 1), { flag: "wx" });
console.log(JSON.stringify({ requestPath, ...summary }));
