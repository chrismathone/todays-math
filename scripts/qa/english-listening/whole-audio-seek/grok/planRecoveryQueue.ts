/**
 * Broader cue recovery. Round 008 heard unique in-span noise-floor rises.
 * This round adds absolute_energy_v2 (-50 dBFS, >=100 ms quiet, lead
 * min(400 ms, that quiet)) and searches 4 s adjacent to a coarse full-ASR
 * span when the span itself has no measured onset. Duplicate announcer
 * numbers stay in the plan. The same physical onset is heard once.
 * Nothing here is a seek start.
 *
 * Usage: node --experimental-strip-types planRecoveryQueue.ts <round> [--dry-run]
 * Refuses rounds 001-008.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { metricsUncertain, planCleanSourceProbe, planNoiseFloorProbe, spokenNumbers } from "./recognition.ts";

const onlyArg = process.argv.find((arg) => arg.startsWith("--only="));
const onlySource = onlyArg ? onlyArg.slice("--only=".length) : "";
const includeBlocked = process.argv.includes("--include-blocked");
const adjacentArg = process.argv.find((arg) => arg.startsWith("--adjacent="));
const ADJACENT_SECONDS = adjacentArg ? Number(adjacentArg.slice("--adjacent=".length)) : 4;
if (!Number.isFinite(ADJACENT_SECONDS) || ADJACENT_SECONDS < 0 || ADJACENT_SECONDS > 30)
  throw new Error("adjacent seconds must be between 0 and 30");
const round = process.argv[2];
const dryRun = process.argv.includes("--dry-run");
if (!/^\d{3}$/.test(round ?? "")) throw new Error("Usage: planRecoveryQueue.ts <round> [--dry-run]");
if (Number(round) <= 8) throw new Error("Refusing to rewrite rounds 001-008");

const root = "C:/Creative/testautocreator";
const dir = `${root}/output/listening-assessments/whole-audio-seek-20261005/grok`;
const prior = JSON.parse(readFileSync(`${dir}/probe-requests/round-008.json`, "utf8"));
const queued = new Map<string, Set<string>>();
for (const source of prior.sources) {
  const keys = new Set<string>();
  for (const probe of source.probes) keys.add(`${probe.startFrame}:${probe.onsetFrame}:${probe.quietBeforeFrames}`);
  queued.set(source.sourceRecordId, keys);
}

const inventory = JSON.parse(readFileSync(`${root}/.qa-artifacts/whole-audio-seek-20261005/inventory.json`, "utf8"));
const grok = inventory.records.filter((record: { assignedAgent: string }) => record.assignedAgent === "grok");
const sources = [];
const plan = [];
let cueCount = 0;
let duplicateCues = 0;
const byPurpose: Record<string, number> = {};
const byRegion: Record<string, number> = {};
let blockedProbes = 0;

for (const record of grok) {
  if (onlySource && record.sourceRecordId !== onlySource) continue;
  const nativePath = `${dir}/native/${record.sourceRecordId}.native.json`;
  let native: {
    energy?: { file?: string; sha256?: string };
    pcm?: { sampleRate: number; channels: number; frameCount: number; sha256: string };
  };
  try {
    native = JSON.parse(readFileSync(nativePath, "utf8"));
  } catch {
    plan.push({ sourceRecordId: record.sourceRecordId, probes: 0, held: ["held_no_native_energy"] });
    continue;
  }
  const energyPath = `${dir}/native/${native.energy?.file}`;
  const energyBytes = readFileSync(energyPath);
  const energySha256 = createHash("sha256").update(energyBytes).digest("hex");
  if (energySha256 !== native.energy?.sha256) throw new Error(`Energy hash mismatch ${record.sourceRecordId}`);
  const copy = Buffer.from(energyBytes);
  const energy = new Float64Array(copy.buffer, copy.byteOffset, copy.length / 8);
  const duration = native.pcm!.frameCount / native.pcm!.sampleRate;
  const asr = JSON.parse(readFileSync(record.asrPath, "utf8"));
  const segments = [...asr.segments].sort((left: { id: number }, right: { id: number }) => left.id - right.id);
  const cues = segments.filter((segment: {
    text: string;
    uncertain?: boolean;
    avgLogProbability: number;
    noSpeechProbability: number;
    compressionRatio: number;
    estimatedStartSeconds: number;
    estimatedEndSeconds: number;
  }) => {
    const spoken = spokenNumbers(segment.text);
    const leading = segment.text.trim().replace(/^[\s"'“”‘’.,·\-–—(\[]+/, "");
    const announcer = /^(?:\d{1,2}|이십|십[일이삼사오육칠팔구]?|[일이삼사오육칠팔구])\s*번/.test(leading);
    return announcer
      && Array.isArray(spoken)
      && segment.uncertain !== true
      && !metricsUncertain(segment)
      && Number.isFinite(segment.estimatedStartSeconds)
      && Number.isFinite(segment.estimatedEndSeconds)
      && segment.estimatedEndSeconds > segment.estimatedStartSeconds;
  }).sort((left: { estimatedStartSeconds: number; id: number }, right: { estimatedStartSeconds: number; id: number }) =>
    left.estimatedStartSeconds - right.estimatedStartSeconds || left.id - right.id);
  const seenSpoken = new Map<string, number>();
  for (const cue of cues) {
    const key = (spokenNumbers(cue.text) as number[]).join(",");
    seenSpoken.set(key, (seenSpoken.get(key) ?? 0) + 1);
  }
  const probes = [];
  const held = [];
  const usedFrames = new Set<number>();
  const priorKeys = queued.get(record.sourceRecordId) ?? new Set<string>();

  type Hit = {
    region: string;
    planned: {
      purpose: string;
      startFrame: number;
      frameCount: number;
      onsetFrame: number;
      quietBeforeFrames: number;
    };
  };
  const foundIn = (fromSeconds: number, toSeconds: number, region: string): Hit[] => {
    if (!(toSeconds > fromSeconds)) return [];
    const search = { fromSeconds, toSeconds };
    const hits: Hit[] = [];
    const noise = planNoiseFloorProbe(energy, native.pcm!.sampleRate, native.pcm!.frameCount, search);
    const clean = planCleanSourceProbe(energy, native.pcm!.sampleRate, native.pcm!.frameCount, search);
    if (noise) hits.push({ region, planned: noise });
    if (clean) hits.push({ region, planned: clean });
    return hits;
  };
  const classify = (hits: Hit[]) => {
    const distinct: Hit[] = [];
    const seen = new Set<string>();
    let alreadyQueued = false;
    let shared = false;
    for (const hit of hits) {
      const id = `${hit.planned.startFrame}:${hit.planned.onsetFrame}:${hit.planned.quietBeforeFrames}`;
      if (seen.has(id)) continue;
      seen.add(id);
      if (priorKeys.has(id)) {
        alreadyQueued = true;
        continue;
      }
      if (usedFrames.has(hit.planned.onsetFrame)) {
        shared = true;
        continue;
      }
      distinct.push(hit);
    }
    return { distinct, alreadyQueued, shared };
  };

  for (let index = 0; index < cues.length; index += 1) {
    const cue = cues[index];
    cueCount += 1;
    const spoken = spokenNumbers(cue.text) as number[];
    const key = spoken.join(",");
    const duplicateSpoken = (seenSpoken.get(key) ?? 0) !== 1;
    if (duplicateSpoken) duplicateCues += 1;
    const previous = index > 0 ? cues[index - 1] : null;
    const next = index + 1 < cues.length ? cues[index + 1] : null;
    const spanStart = cue.estimatedStartSeconds;
    const spanEnd = cue.estimatedEndSeconds;
    const inside = classify(foundIn(spanStart, spanEnd, "span"));
    let chosen = inside.distinct;
    if (chosen.length === 0 && inside.alreadyQueued) {
      held.push({ asrSegmentId: cue.id, spoken, duplicateSpoken, reason: "held_onset_already_queued" });
      continue;
    }
    if (chosen.length === 0 && inside.shared) {
      held.push({ asrSegmentId: cue.id, spoken, duplicateSpoken, reason: "held_same_onset_as_earlier_cue" });
      continue;
    }
    if (chosen.length === 0) {
      const beforeFrom = Math.max(previous ? previous.estimatedEndSeconds : 0, spanStart - ADJACENT_SECONDS);
      const afterTo = Math.min(next ? next.estimatedStartSeconds : duration, spanEnd + ADJACENT_SECONDS);
      const adjacent = classify([
        ...foundIn(beforeFrom, spanStart, "before"),
        ...foundIn(spanEnd, afterTo, "after"),
      ]);
      chosen = adjacent.distinct;
      if (chosen.length === 0) {
        held.push({
          asrSegmentId: cue.id,
          spoken,
          duplicateSpoken,
          reason: adjacent.alreadyQueued
            ? "held_onset_already_queued"
            : adjacent.shared
              ? "held_same_onset_as_earlier_cue"
              : "held_no_measured_onset_in_adjacent_window",
        });
        continue;
      }
    }
    for (const hit of chosen) {
      usedFrames.add(hit.planned.onsetFrame);
      probes.push({
        id: probes.length + 1,
        purpose: hit.planned.purpose,
        region: hit.region,
        asrSegmentId: cue.id,
        spoken,
        duplicateSpoken,
        startFrame: hit.planned.startFrame,
        frameCount: hit.planned.frameCount,
        onsetFrame: hit.planned.onsetFrame,
        quietBeforeFrames: hit.planned.quietBeforeFrames,
      });
    }
  }
  const extractorBlocked = record.sourceRecordId === "ebs-middle-1-2006-2";
  for (const probe of probes) {
    byPurpose[probe.purpose] = (byPurpose[probe.purpose] ?? 0) + 1;
    byRegion[probe.region] = (byRegion[probe.region] ?? 0) + 1;
  }
  if (extractorBlocked) blockedProbes += probes.length;
  plan.push({
    sourceRecordId: record.sourceRecordId,
    probes: extractorBlocked ? 0 : probes.length,
    plannedProbes: probes.length,
    extractorBlocked,
    byPurpose: {
      absolute_energy_v2: probes.filter((probe) => probe.purpose === "absolute_energy_v2").length,
      noise_floor_contrast_v1: probes.filter((probe) => probe.purpose === "noise_floor_contrast_v1").length,
    },
    held,
  });
  // Claude's extractor reads sourceAudioPath and decodes it as MPEG.
  // 2006-2 stays out of that request unless this round explicitly includes
  // the converted-playback exception for our own runner.
  if (probes.length === 0 || (extractorBlocked && !includeBlocked)) continue;
  const nativeRecord = native as {
    playback?: { sha256?: string };
    playbackAudioPath?: string;
    convertedClockProof?: { path: string; sha256: string };
    decodedFrom?: string;
  };
  sources.push({
    sourceRecordId: record.sourceRecordId,
    sourceAudioPath: record.sourceAudioPath,
    sourceAudioSha256: record.sourceAudioSha256,
    ...(nativeRecord.decodedFrom === "converted-playback-mp3"
      ? {
          decodedFrom: nativeRecord.decodedFrom,
          playbackAudioPath: nativeRecord.playbackAudioPath,
          playbackSha256: nativeRecord.playback?.sha256,
          convertedClockProof: nativeRecord.convertedClockProof,
        }
      : {}),
    nativeCachePath: nativePath,
    nativeCacheSha256: createHash("sha256").update(readFileSync(nativePath)).digest("hex"),
    sampleRate: native.pcm!.sampleRate,
    channels: native.pcm!.channels,
    frameCount: native.pcm!.frameCount,
    pcmSha256: native.pcm!.sha256,
    probes: probes.map(({ spoken: _spoken, duplicateSpoken: _duplicate, region: _region, ...probe }) => probe),
  });
}

const request = {
  schemaVersion: 1,
  provider: "grok",
  round,
  mode: "absolute_energy_v2_and_noise_floor_contrast_v1",
  adjacentSeconds: ADJACENT_SECONDS,
  createdAt: new Date().toISOString(),
  inventoryPath: "C:/Creative/testautocreator/.qa-artifacts/whole-audio-seek-20261005/inventory.json",
  inventorySha256: "beb63eeb348ea93a39fa87bcc594cb018104260b800c1b423bff378cb7f3c1ef",
  language: "ko",
  sources,
};
const summary = {
  round,
  dryRun,
  adjacentSeconds: ADJACENT_SECONDS,
  cues: cueCount,
  duplicateCues,
  sources: sources.length,
  probes: sources.reduce((sum, source) => sum + source.probes.length, 0),
  blockedProbes,
  byPurpose,
  byRegion,
  heldSources: plan.filter((item) => item.probes === 0).length,
  heldReasons: {} as Record<string, number>,
};
for (const item of plan) {
  const rows = Array.isArray(item.held) ? item.held : [];
  for (const row of rows) {
    const reason = typeof row === "string" ? row : row.reason;
    summary.heldReasons[reason] = (summary.heldReasons[reason] ?? 0) + 1;
  }
}
if (!dryRun) {
  const outPath = `${dir}/probe-requests/round-${round}.json`;
  const planPath = `${dir}/probe-requests/round-${round}.plan.json`;
  if (existsSync(outPath) || existsSync(planPath)) throw new Error(`Refusing to overwrite ${outPath}`);
  const text = `${JSON.stringify(request)}\n`;
  writeFileSync(outPath, text);
  writeFileSync(planPath, `${JSON.stringify({
    requestSha256: createHash("sha256").update(text).digest("hex"),
    ...summary,
    plan,
  }, null, 2)}\n`);
}
process.stdout.write(`${JSON.stringify(summary)}\n`);
