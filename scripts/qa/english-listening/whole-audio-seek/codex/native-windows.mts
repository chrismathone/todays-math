/** Independent streaming source/energy/probe replay. Emits PCM only over stdout IPC. */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const spec = JSON.parse(fs.readFileSync(0, "utf8"));
const { source, clock, probes, root } = spec;
if (probes.length > 128) throw Error("Unbounded replay probe count");
const { parseMp3, decodeMp3, MAX_DURATION_MS, MAX_PLAYBACK_BYTES } = await import(
  pathToFileURL(path.join(root, "src/lib/english/listening/media/mp3.ts")).href
);
const original = fs.readFileSync(source.sourceAudioPath);
if (sha(original) !== source.sourceAudioSha256) throw Error("Source hash changed");
let decodeBytes = original;
let convertedProof: any = null;
if (clock.convertedClockProof) {
  if (source.sourceRecordId !== "ebs-middle-1-2006-2") throw Error("Unrecognized converted source exception");
  const ref = clock.convertedClockProof;
  const bytes = fs.readFileSync(ref.path);
  if (sha(bytes) !== ref.sha256) throw Error("Converted clock proof changed");
  convertedProof = JSON.parse(bytes.toString("utf8"));
  if (convertedProof.status !== "passed" || convertedProof.sourceRecordId !== source.sourceRecordId ||
      convertedProof.original.sha256 !== source.sourceAudioSha256 ||
      path.resolve(convertedProof.original.path) !== path.resolve(source.sourceAudioPath) ||
      convertedProof.playback.sha256 !== source.audio.sha256 ||
      convertedProof.clock.sourceToPlaybackOffsetMs !== 0 || convertedProof.clock.maxOffsetVariationMs !== 0 ||
      convertedProof.clock.sourceFrameCount !== convertedProof.clock.playbackFrameCount ||
      convertedProof.clock.landmarks.length !== 9 ||
      !convertedProof.clock.landmarks.every((x: any) => x.playbackMinusSourceFramesAt16000 === 0 && x.correlation >= .99))
    throw Error("Actual converted playback source clock is unverified");
  decodeBytes = fs.readFileSync(convertedProof.playback.path);
  if (sha(decodeBytes) !== source.audio.sha256) throw Error("Actual converted playback changed");
}
const parsed = parseMp3(decodeBytes, MAX_DURATION_MS);
const playbackSha256 = sha(decodeBytes.subarray(parsed.audioStart, parsed.audioEnd));
if (playbackSha256 !== source.audio.sha256) throw Error("Playback hash changed");
const rate = parsed.sampleRate, channels = parsed.channels, frameBytes = channels * 2;
const windowFrames = rate / 50;
if (!Number.isSafeInteger(windowFrames)) throw Error("Unsupported native 20ms clock");
let allocated = 0;
const clips = probes.map((p: { id: string; startFrame: number; frameCount: number; maxDurationSeconds?: number }) => {
  const limit = p.maxDurationSeconds ?? 14;
  if (![14, 60].includes(limit) || !Number.isSafeInteger(p.startFrame) || !Number.isSafeInteger(p.frameCount) || p.startFrame < 0 || p.frameCount <= 0 || p.frameCount > limit * rate || p.startFrame + p.frameCount > clock.frameCount)
    throw Error("Probe outside actual source or its explicit cue/dialogue duration bound");
  allocated += p.frameCount * frameBytes;
  if (allocated > 512 * 1024 * 1024) throw Error("Unbounded replay PCM allocation");
  return { ...p, pcm: Buffer.alloc(p.frameCount * frameBytes), copied: 0 };
});
let frame = 0, inWindow = 0;
const sums = new Array(channels).fill(0);
const energy: number[] = [];
const pcmHash = createHash("sha256");
const decoded = await decodeMp3(decodeBytes, { maxDurationMs: MAX_DURATION_MS, maxPlaybackBytes: MAX_PLAYBACK_BYTES }, async (pcm: Buffer) => {
  pcmHash.update(pcm);
  const count = pcm.length / frameBytes;
  for (const p of clips) {
    const start = Math.max(frame, p.startFrame), end = Math.min(frame + count, p.startFrame + p.frameCount);
    if (start < end) {
      const bytes = (end - start) * frameBytes;
      pcm.copy(p.pcm, (start - p.startFrame) * frameBytes, (start - frame) * frameBytes, (end - frame) * frameBytes);
      p.copied += bytes;
    }
  }
  for (let i = 0; i < count; i++) {
    for (let c = 0; c < channels; c++) {
      const n = pcm.readInt16LE((i * channels + c) * 2);
      sums[c] += n * n;
    }
    if (++inWindow === windowFrames) {
      energy.push(Math.max(...sums));
      sums.fill(0);
      inWindow = 0;
    }
  }
  frame += count;
});
if (decoded.durationMs !== clock.durationMs || frame !== clock.frameCount) throw Error("Native clock differs from first independent replay");
const pcmSha256 = pcmHash.digest("hex");
if (pcmSha256 !== clock.decodedInterleavedInt16Sha256) throw Error("Full PCM differs from first independent replay");
const energyBytes = Buffer.alloc(energy.length * 8);
energy.forEach((e, i) => energyBytes.writeDoubleLE(e, i * 8));
const output = {
  sourceRecordId: source.sourceRecordId, sourceAudioSha256: source.sourceAudioSha256,
  playbackSha256, sampleRate: rate, channels, frameCount: frame, durationMs: decoded.durationMs,
  pcmSha256, windowFrames, energySha256: sha(energyBytes), energyBase64: energyBytes.toString("base64"),
  ...(convertedProof ? { playbackAudioPath: convertedProof.playback.path, convertedClockProof: clock.convertedClockProof } : {}),
  probes: clips.map(p => {
    if (p.copied !== p.pcm.length) throw Error("Incomplete actual native probe decode");
    return { id: p.id, startFrame: p.startFrame, frameCount: p.frameCount, clipPcmSha256: sha(p.pcm), pcmBase64: p.pcm.toString("base64") };
  }),
};
process.stdout.write(JSON.stringify(output));
