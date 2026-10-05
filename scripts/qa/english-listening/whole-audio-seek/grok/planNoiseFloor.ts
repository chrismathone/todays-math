/**
 * Write one noise-floor probe request.
 * The rise is a place to listen. quietBeforeFrames stays the absolute -50 count.
 *
 * Usage: node --experimental-strip-types planNoiseFloor.ts <sourceRecordId> <round> <fromSeconds> <toSeconds>
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { planNoiseFloorProbe } from "./recognition.ts";

const sourceRecordId = process.argv[2];
const round = process.argv[3];
const fromSeconds = Number(process.argv[4]);
const toSeconds = Number(process.argv[5]);
if (!sourceRecordId || !/^\d{3}$/.test(round ?? "") || !Number.isFinite(fromSeconds) || !Number.isFinite(toSeconds)) {
  throw new Error("Usage: planNoiseFloor.ts <sourceRecordId> <round> <fromSeconds> <toSeconds>");
}
const root = "C:/Creative/testautocreator";
const dir = `${root}/output/listening-assessments/whole-audio-seek-20261005/grok`;
const nativePath = `${dir}/native/${sourceRecordId}.native.json`;
const native = JSON.parse(readFileSync(nativePath, "utf8"));
const energyPath = `${dir}/native/${native.energy.file}`;
const energyBytes = readFileSync(energyPath);
const energySha256 = createHash("sha256").update(energyBytes).digest("hex");
if (energySha256 !== native.energy.sha256) throw new Error("Energy file does not match its native record");
const copy = Buffer.from(energyBytes);
const energy = new Float64Array(copy.buffer, copy.byteOffset, copy.length / 8);
const planned = planNoiseFloorProbe(energy, native.pcm.sampleRate, native.pcm.frameCount, { fromSeconds, toSeconds });
if (!planned) throw new Error("No noise-floor rise in the search span");
const inventory = JSON.parse(readFileSync(`${root}/.qa-artifacts/whole-audio-seek-20261005/inventory.json`, "utf8"));
const record = inventory.records.find((item: { sourceRecordId: string }) => item.sourceRecordId === sourceRecordId);
if (!record) throw new Error("Missing inventory record");
const request = {
  schemaVersion: 1,
  provider: "grok",
  round,
  mode: "noise_floor_onset",
  createdAt: new Date().toISOString(),
  inventoryPath: "C:/Creative/testautocreator/.qa-artifacts/whole-audio-seek-20261005/inventory.json",
  inventorySha256: "beb63eeb348ea93a39fa87bcc594cb018104260b800c1b423bff378cb7f3c1ef",
  language: "ko",
  sources: [{
    sourceRecordId,
    sourceAudioPath: record.sourceAudioPath,
    sourceAudioSha256: record.sourceAudioSha256,
    nativeCachePath: nativePath,
    nativeCacheSha256: createHash("sha256").update(readFileSync(nativePath)).digest("hex"),
    sampleRate: native.pcm.sampleRate,
    channels: native.pcm.channels,
    frameCount: native.pcm.frameCount,
    pcmSha256: native.pcm.sha256,
    probes: [{
      id: 1,
      purpose: planned.purpose,
      startFrame: planned.startFrame,
      frameCount: planned.frameCount,
      onsetFrame: planned.onsetFrame,
      quietBeforeFrames: planned.quietBeforeFrames,
    }],
  }],
};
const outPath = `${dir}/probe-requests/round-${round}.json`;
const text = `${JSON.stringify(request, null, 2)}\n`;
writeFileSync(outPath, text);
const note = {
  onsetMethod: planned.purpose,
  search: { fromSeconds, toSeconds },
  energySha256,
  energyPath,
  pcmSha256: native.pcm.sha256,
  baselineStartFrame: planned.baselineStartFrame,
  baselineFrameCount: planned.baselineFrameCount,
  medianDbfs: planned.medianDbfs,
  p10Dbfs: planned.p10Dbfs,
  p90Dbfs: planned.p90Dbfs,
  thresholdDbfs: planned.thresholdDbfs,
  contrastDb: planned.contrastDb,
  percentileMethod: "nearest_rank",
  onsetWindow: planned.onsetWindow,
  onsetSeconds: planned.onsetSeconds,
  onsetFrame: planned.onsetFrame,
  quietWindows: planned.quietWindows,
  absoluteQuietWindows: planned.absoluteQuietWindows,
  quietBeforeFrames: planned.quietBeforeFrames,
  leadWindows: planned.leadWindows,
  leadPeakDbfs: planned.leadPeakDbfs,
  startFrame: planned.startFrame,
  notAdmitted: true,
  reason: "quietBeforeFrames counts windows under the measured median-plus-10 threshold. absoluteQuietWindows is the -50 count and stays 0 when the floor is hiss.",
};
const notePath = `${dir}/probe-requests/round-${round}.noise-floor.json`;
writeFileSync(notePath, `${JSON.stringify(note, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  outPath,
  notePath,
  requestSha256: createHash("sha256").update(text).digest("hex"),
  onsetSeconds: planned.onsetSeconds,
  absoluteQuietWindows: planned.absoluteQuietWindows,
  quietWindows: planned.quietWindows,
})}\n`);
