#!/usr/bin/env node
/**
 * Cuts the requested probe inputs of ONE source out of its native PCM.
 *
 *   node extract-clips.mjs --requests <round.json> --source-id <id> \
 *        --tmp <empty dir> [--runtime-root <checkout with node_modules>]
 *
 * The clips are temporary recognition inputs on the exact native frame clock.
 * They are deleted by the runner after recognition; nothing here is a derivative
 * meant to be played, stored or uploaded. The original file is only read.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { readBound } from "./lib/inventory.mjs";
import { decodeNative, pcmSha256 } from "./lib/mp3.mjs";

const { values } = parseArgs({
  options: {
    requests: { type: "string" },
    "source-id": { type: "string" },
    tmp: { type: "string" },
    "runtime-root": { type: "string" },
  },
});
for (const key of ["requests", "source-id", "tmp"])
  if (!values[key]) throw new Error(`--${key} is required`);

const request = JSON.parse(readFileSync(values.requests, "utf8"));
const source = request.sources.find(
  (s) => s.sourceRecordId === values["source-id"],
);
if (!source) throw new Error("Source is not in this round");
const runtimeRoot =
  values["runtime-root"] ??
  JSON.parse(readFileSync(request.inventoryPath, "utf8")).root;

mkdirSync(values.tmp, { recursive: true });
if (readdirSync(values.tmp).length) throw new Error("Temporary dir not empty");

const bytes = readBound(
  source.sourceAudioPath,
  source.sourceAudioSha256,
  "Original audio",
);
const native = await decodeNative(bytes, runtimeRoot);
if (
  native.sampleRate !== source.sampleRate ||
  native.channels !== source.channels ||
  native.frameCount !== source.frameCount ||
  pcmSha256(native.planes, native.frameCount) !== source.pcmSha256
)
  throw new Error("Decoded PCM differs from the measured native cache");

const waveHeader = (frames) => {
  const header = Buffer.alloc(44);
  const dataBytes = frames * native.channels * 2;
  header.write("RIFF");
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(native.channels, 22);
  header.writeUInt32LE(native.sampleRate, 24);
  header.writeUInt32LE(native.sampleRate * native.channels * 2, 28);
  header.writeUInt16LE(native.channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataBytes, 40);
  return header;
};

const clips = [];
for (const probe of source.probes) {
  const { startFrame, frameCount } = probe;
  if (
    !Number.isSafeInteger(startFrame) ||
    !Number.isSafeInteger(frameCount) ||
    startFrame < 0 ||
    frameCount <= 0 ||
    startFrame + frameCount > native.frameCount
  )
    throw new Error("Probe is outside the original audio: " + probe.id);
  const pcm = Buffer.alloc(frameCount * native.channels * 2);
  for (let i = 0; i < frameCount; i++)
    for (let c = 0; c < native.channels; c++)
      pcm.writeInt16LE(
        native.planes[c][startFrame + i],
        (i * native.channels + c) * 2,
      );
  const file = join(values.tmp, `probe-${probe.id}.wav`);
  writeFileSync(file, Buffer.concat([waveHeader(frameCount), pcm]), {
    flag: "wx",
  });
  clips.push({
    id: probe.id,
    file,
    startFrame,
    frameCount,
    sampleRate: native.sampleRate,
    channels: native.channels,
    clipPcmSha256: createHash("sha256").update(pcm).digest("hex"),
  });
}
writeFileSync(
  join(values.tmp, "clips.json"),
  JSON.stringify({
    sourceRecordId: source.sourceRecordId,
    sourceAudioSha256: source.sourceAudioSha256,
    pcmSha256: source.pcmSha256,
    clips,
  }),
  { flag: "wx" },
);
console.log(JSON.stringify({ clips: clips.length }));
