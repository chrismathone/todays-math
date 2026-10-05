/**
 * One noise-floor contrast probe per unique full-ASR cue span.
 * A missing rise is a held reason. It is not a seek start.
 *
 * Usage: node --experimental-strip-types planContrastQueue.ts <round>
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { metricsUncertain, planNoiseFloorProbe, spokenNumbers } from "./recognition.ts";

const round = process.argv[2];
if (!/^\d{3}$/.test(round ?? "")) throw new Error("Usage: planContrastQueue.ts <round>");
const root = "C:/Creative/testautocreator";
const dir = `${root}/output/listening-assessments/whole-audio-seek-20261005/grok`;
const inventory = JSON.parse(readFileSync(`${root}/.qa-artifacts/whole-audio-seek-20261005/inventory.json`, "utf8"));
const grok = inventory.records.filter((record: { assignedAgent: string }) => record.assignedAgent === "grok");
const sources = [];
const plan = [];
for (const record of grok) {
  const nativePath = `${dir}/native/${record.sourceRecordId}.native.json`;
  let native: { energy?: { file?: string; sha256?: string }; pcm?: { sampleRate: number; channels: number; frameCount: number; sha256: string } };
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
  const asr = JSON.parse(readFileSync(record.asrPath, "utf8"));
  const segments = [...asr.segments].sort((left: { id: number }, right: { id: number }) => left.id - right.id);
  const cues = segments.filter((segment: { text: string; uncertain?: boolean; avgLogProbability: number; noSpeechProbability: number; compressionRatio: number }) => {
    const spoken = spokenNumbers(segment.text);
    const leading = segment.text.trim().replace(/^[\s"'“”‘’.,·\-–—(\[]+/, "");
    // English "Number one" inside a passage is not an announcer cue.
    const announcer = /^(?:\d{1,2}|이십|십[일이삼사오육칠팔구]?|[일이삼사오육칠팔구])\s*번/.test(leading);
    return announcer && Array.isArray(spoken) && segment.uncertain !== true && !metricsUncertain(segment);
  });
  const seenSpoken = new Map<string, number>();
  for (const cue of cues) {
    const key = (spokenNumbers(cue.text) as number[]).join(",");
    seenSpoken.set(key, (seenSpoken.get(key) ?? 0) + 1);
  }
  const probes = [];
  const held = [];
  const used = new Set<number>();
  for (const cue of cues) {
    const spoken = spokenNumbers(cue.text) as number[];
    const key = spoken.join(",");
    if ((seenSpoken.get(key) ?? 0) !== 1) {
      held.push({ asrSegmentId: cue.id, spoken, reason: "held_cue_not_unique" });
      continue;
    }
    const planned = planNoiseFloorProbe(energy, native.pcm!.sampleRate, native.pcm!.frameCount, {
      fromSeconds: cue.estimatedStartSeconds,
      toSeconds: cue.estimatedEndSeconds,
    });
    if (!planned) {
      held.push({ asrSegmentId: cue.id, spoken, reason: "held_no_contrast_onset_in_cue_span" });
      continue;
    }
    if (used.has(planned.onsetFrame)) {
      held.push({ asrSegmentId: cue.id, spoken, reason: "held_same_onset_as_earlier_cue", onsetFrame: planned.onsetFrame });
      continue;
    }
    used.add(planned.onsetFrame);
    probes.push({
      id: probes.length + 1,
      purpose: planned.purpose,
      asrSegmentId: cue.id,
      spoken,
      startFrame: planned.startFrame,
      frameCount: planned.frameCount,
      onsetFrame: planned.onsetFrame,
      quietBeforeFrames: planned.quietBeforeFrames,
    });
  }
  plan.push({ sourceRecordId: record.sourceRecordId, probes: probes.length, held });
  if (probes.length === 0) continue;
  sources.push({
    sourceRecordId: record.sourceRecordId,
    sourceAudioPath: record.sourceAudioPath,
    sourceAudioSha256: record.sourceAudioSha256,
    nativeCachePath: nativePath,
    nativeCacheSha256: createHash("sha256").update(readFileSync(nativePath)).digest("hex"),
    sampleRate: native.pcm!.sampleRate,
    channels: native.pcm!.channels,
    frameCount: native.pcm!.frameCount,
    pcmSha256: native.pcm!.sha256,
    probes: probes.map(({ spoken: _spoken, ...probe }) => probe),
  });
}
const request = {
  schemaVersion: 1,
  provider: "grok",
  round,
  mode: "noise_floor_contrast_v1",
  createdAt: new Date().toISOString(),
  inventoryPath: "C:/Creative/testautocreator/.qa-artifacts/whole-audio-seek-20261005/inventory.json",
  inventorySha256: "beb63eeb348ea93a39fa87bcc594cb018104260b800c1b423bff378cb7f3c1ef",
  language: "ko",
  sources,
};
const outPath = `${dir}/probe-requests/round-${round}.json`;
const text = `${JSON.stringify(request)}\n`;
writeFileSync(outPath, text);
const planPath = `${dir}/probe-requests/round-${round}.plan.json`;
writeFileSync(planPath, `${JSON.stringify({
  requestSha256: createHash("sha256").update(text).digest("hex"),
  sources: sources.length,
  probes: sources.reduce((sum, source) => sum + source.probes.length, 0),
  plan,
}, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  outPath,
  planPath,
  sources: sources.length,
  probes: sources.reduce((sum, source) => sum + source.probes.length, 0),
  heldSources: plan.filter((item) => item.probes === 0).length,
})}\n`);
