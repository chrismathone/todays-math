#!/usr/bin/env node
/**
 * Plans number-only listenings for starts whose number a long probe wrote as
 * bare digits ("2.") or not at all.
 *
 *   node plan-cue-clips.mjs --inventory <inventory.json> --native <claude out dir> \
 *        --targets <targets.json> --out <held-validation dir> --round 001
 *
 * targets: [{ sourceRecordId, sourceNumber, startFrame, onsetFrame }]
 *
 * Two listenings per start, both beginning at the already measured start frame:
 * "cue_only" ends a short quiet tail after the sound island that begins at the
 * measured onset (the spoken number alone when the announcer pauses after it),
 * and "cue_context" is a fixed four seconds from the same frame. The request is written once and
 * read by ../claude/run_probes.py as is. A clip is a place to listen: what it
 * hears is evidence only together with everything else a start needs.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import {
  energyAtDbfs,
  quietBefore,
  soundIslands,
} from "../claude/lib/activity.mjs";
import { loadInventory } from "../claude/lib/inventory.mjs";
import { loadNative } from "../claude/lib/native.mjs";
import { POLICY, leadFor } from "../claude/lib/policy.mjs";

const { values } = parseArgs({
  options: {
    inventory: { type: "string" },
    native: { type: "string" },
    targets: { type: "string" },
    out: { type: "string" },
    round: { type: "string" },
  },
});
for (const key of ["inventory", "native", "targets", "out", "round"])
  if (!values[key]) throw new Error(`--${key} is required`);
if (!/^\d{3}$/.test(values.round)) throw new Error("--round is three digits");

const { inventory, inventorySha256 } = loadInventory(values.inventory);
const targets = JSON.parse(readFileSync(values.targets, "utf8"));
const requestDir = join(values.out, "probe-requests");
mkdirSync(requestDir, { recursive: true });
const requestPath = join(requestDir, `round-${values.round}.json`);
if (existsSync(requestPath)) throw new Error("Round exists: " + requestPath);

/** Longest clip that is still "the number alone": a number is under two seconds. */
const MAXIMUM_CLIP_WINDOWS = 150;
const TAIL_WINDOWS = 15;
const CONTEXT_WINDOWS = 200;

const bySource = new Map();
for (const target of targets) {
  if (!bySource.has(target.sourceRecordId))
    bySource.set(target.sourceRecordId, []);
  bySource.get(target.sourceRecordId).push(target);
}

const sources = [];
const skipped = [];
for (const record of inventory.records) {
  const wanted = bySource.get(record.sourceRecordId);
  if (!wanted) continue;
  const native = loadNative(values.native, record, inventorySha256);
  const { energy, windowFrames: frames, meta } = native;
  const threshold = energyAtDbfs(POLICY.quietThresholdDbfs, frames);
  const probes = [];
  for (const target of wanted.sort((a, b) => a.startFrame - b.startFrame)) {
    const onsetWindow = target.onsetFrame / frames;
    const startWindow = target.startFrame / frames;
    const quiet = quietBefore(energy, threshold, onsetWindow);
    // The start must be the measured policy start of this onset, nothing else.
    if (
      !Number.isInteger(onsetWindow) ||
      !Number.isInteger(startWindow) ||
      energy[onsetWindow] < threshold ||
      quiet < POLICY.minimumQuietBeforeWindows ||
      onsetWindow - startWindow !== leadFor(quiet)
    ) {
      skipped.push({ ...target, reason: "not_a_measured_policy_start" });
      continue;
    }
    const island = soundIslands(
      energy,
      threshold,
      POLICY.islandBridgeWindows,
      onsetWindow,
      Math.min(energy.length, onsetWindow + 1000),
    )[0];
    const next = soundIslands(
      energy,
      threshold,
      POLICY.islandBridgeWindows,
      island.end,
      Math.min(energy.length, island.end + 1000),
    )[0];
    const gap = next ? next.start - island.end : TAIL_WINDOWS;
    const windows =
      onsetWindow -
      startWindow +
      (island.end - island.start) +
      Math.min(gap, TAIL_WINDOWS);
    const common = {
      startFrame: target.startFrame,
      onsetFrame: target.onsetFrame,
      quietBeforeFrames: quiet * frames,
      questionNumber: target.sourceNumber,
      islandFrames: (island.end - island.start) * frames,
    };
    // The number runs into its sentence without a measurable pause: no clip
    // of the number alone exists there.
    if (windows > MAXIMUM_CLIP_WINDOWS)
      skipped.push({ ...target, reason: "number_island_not_separate" });
    else
      probes.push({
        id: probes.length + 1,
        purpose: "cue_only",
        frameCount: windows * frames,
        ...common,
      });
    // The same start with a little of what follows the number: a fixed four
    // seconds, so the recognizer has more than one word to stand on.
    const context = Math.min(CONTEXT_WINDOWS, energy.length - startWindow);
    if (context > windows)
      probes.push({
        id: probes.length + 1,
        purpose: "cue_context",
        frameCount: context * frames,
        ...common,
      });
  }
  if (!probes.length) continue;
  sources.push({
    sourceRecordId: record.sourceRecordId,
    sourceAudioPath: record.sourceAudioPath,
    sourceAudioSha256: record.sourceAudioSha256,
    nativeCachePath: native.metaPath,
    nativeCacheSha256: native.metaSha256,
    sampleRate: meta.pcm.sampleRate,
    channels: meta.pcm.channels,
    frameCount: meta.pcm.frameCount,
    pcmSha256: meta.pcm.sha256,
    probes,
  });
}

const request = {
  schemaVersion: 1,
  provider: "claude",
  round: values.round,
  mode: "cue_clips",
  createdAt: new Date().toISOString(),
  inventoryPath: values.inventory.replace(/\\/g, "/"),
  inventorySha256,
  policy: POLICY,
  language: "ko",
  skipped,
  sources,
};
writeFileSync(requestPath, JSON.stringify(request, null, 1), { flag: "wx" });
console.log(
  JSON.stringify({
    requestPath,
    sources: sources.length,
    probes: sources.reduce((n, s) => n + s.probes.length, 0),
    skipped: skipped.length,
  }),
);
