/**
 * Write one follows-bridge probe request for a source that already has energy.
 * A probe is a place to listen. It is not a seek start.
 *
 * Usage: node --experimental-strip-types planFollows.ts <sourceRecordId> <round>
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import {
  energyThreshold,
  LEAD_WINDOWS,
  MIN_PROBE_WINDOWS,
  PROBE_WINDOWS,
  quietBefore,
  soundIslands,
  windowFrames,
} from "./recognition.ts";

const sourceRecordId = process.argv[2];
const round = process.argv[3];
if (!sourceRecordId || !/^\d{3}$/.test(round ?? "")) throw new Error("Usage: planFollows.ts <sourceRecordId> <round>");
const root = "C:/Creative/testautocreator";
const dir = `${root}/output/listening-assessments/whole-audio-seek-20261005/grok`;
const nativePath = `${dir}/native/${sourceRecordId}.native.json`;
const native = JSON.parse(readFileSync(nativePath, "utf8"));
const bytes = readFileSync(`${dir}/native/${native.energy.file}`);
const energy = new Float64Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 8);
const frames = windowFrames(native.pcm.sampleRate);
const threshold = energyThreshold(frames);
const islands = soundIslands(energy, threshold, 15);
const probes = [];
for (let index = 0; index < islands.length; index += 1) {
  const quiet = quietBefore(energy, threshold, islands[index].start);
  if (quiet < 5) continue;
  const previous = islands[index - 1];
  const previousWindows = previous ? previous.end - previous.start : 0;
  if (previousWindows < 300 && quiet < 150) continue;
  const lead = Math.min(LEAD_WINDOWS, quiet);
  if (islands[index].start - lead < 0) continue;
  const startFrame = (islands[index].start - lead) * frames;
  const wanted = Math.min(PROBE_WINDOWS, Math.floor((native.pcm.frameCount - startFrame) / frames));
  if (wanted < MIN_PROBE_WINDOWS) continue;
  probes.push({
    id: probes.length + 1,
    purpose: "follows_bridge",
    startFrame,
    frameCount: wanted * frames,
    onsetFrame: islands[index].start * frames,
    quietBeforeFrames: quiet * frames,
  });
}
const inventory = JSON.parse(readFileSync(`${root}/.qa-artifacts/whole-audio-seek-20261005/inventory.json`, "utf8"));
const record = inventory.records.find((item: { sourceRecordId: string }) => item.sourceRecordId === sourceRecordId);
if (!record) throw new Error("Missing inventory record");
const request = {
  schemaVersion: 1,
  provider: "grok",
  round,
  mode: "follows_bridge",
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
    probes,
  }],
};
const outPath = `${dir}/probe-requests/round-${round}.json`;
writeFileSync(outPath, JSON.stringify(request, null, 2));
process.stdout.write(`${JSON.stringify({ sourceRecordId, round, probes: probes.length, outPath })}\n`);
