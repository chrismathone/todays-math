/**
 * Writes the first source-bound probe request for ebs-middle-1-2006-1.
 * The hypothesis time only selects the island. It is not stored as a timestamp
 * inside the request the recognizer echoes.
 */
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { planHypothesisProbe } from "./recognition.ts";

const root = "C:/Creative/testautocreator";
const out = resolve(root, "output/listening-assessments/whole-audio-seek-20261005/grok");
const native = JSON.parse(readFileSync(resolve(out, "native/ebs-middle-1-2006-1.native.json"), "utf8"));
const bytes = readFileSync(resolve(out, "native/ebs-middle-1-2006-1.energy.f64"));
const copy = Buffer.from(bytes);
const energy = new Float64Array(copy.buffer, copy.byteOffset, copy.length / 8);
const planned = planHypothesisProbe(energy, native.pcm.sampleRate, native.pcm.frameCount, 68.29);
if (!planned) throw new Error("No quiet-lead island for the 2번 hypothesis");
const inventoryPath = `${root}/.qa-artifacts/whole-audio-seek-20261005/inventory.json`;
const request = {
  schemaVersion: 1,
  provider: "grok",
  round: "001",
  mode: "reconstructed_cue_hypothesis",
  createdAt: new Date().toISOString(),
  inventoryPath,
  inventorySha256: native.inventorySha256,
  language: "ko",
  sources: [
    {
      sourceRecordId: native.sourceRecordId,
      sourceAudioPath: native.sourceAudioPath,
      sourceAudioSha256: native.sourceAudioSha256,
      nativeCachePath: resolve(out, "native/ebs-middle-1-2006-1.native.json"),
      nativeCacheSha256: createHash("sha256").update(readFileSync(resolve(out, "native/ebs-middle-1-2006-1.native.json"))).digest("hex"),
      sampleRate: native.pcm.sampleRate,
      channels: native.pcm.channels,
      frameCount: native.pcm.frameCount,
      pcmSha256: native.pcm.sha256,
      probes: [
        {
          id: 1,
          purpose: planned.purpose,
          startFrame: planned.startFrame,
          frameCount: planned.frameCount,
          onsetFrame: planned.onsetFrame,
          quietBeforeFrames: planned.quietBeforeFrames,
        },
      ],
    },
  ],
};
const dir = resolve(out, "probe-requests");
mkdirSync(dir, { recursive: true });
const requestPath = resolve(dir, "round-001.json");
const text = `${JSON.stringify(request, null, 2)}\n`;
writeFileSync(requestPath, text);
const note = {
  hypothesisSeconds: 68.29,
  hypothesisText: "2번입니다.",
  asrSegmentId: 9,
  onsetSeconds: planned.onsetSeconds,
  hypothesisMayBeLate: planned.hypothesisMayBeLate,
  leadPeakDbfs: planned.leadPeakDbfs,
  seekStartMs: Math.floor((planned.startFrame * 1000) / native.pcm.sampleRate),
  notRecognized: true,
};
writeFileSync(resolve(dir, "round-001.hypothesis.json"), `${JSON.stringify(note, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  requestPath,
  requestSha256: createHash("sha256").update(text).digest("hex"),
  probe: request.sources[0].probes[0],
  note,
})}\n`);
