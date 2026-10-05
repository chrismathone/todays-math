/**
 * Measure cue onsets from the original MPEG decode. Full PCM is not written.
 * Probe files are float32 little-endian interleaved channel data.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { frameToMs, type NativeEvidence } from "./seekBeginnings.ts";

const require = createRequire("C:/Creative/testautocreator/package.json");
const { MPEGDecoder } = require("mpg123-decoder") as {
  MPEGDecoder: new () => {
    ready: Promise<void>;
    free: () => void;
    decode: (mpegData: Uint8Array) => {
      channelData: Float32Array[];
      samplesDecoded: number;
      sampleRate: number;
      errors: { message: string }[];
    };
  };
};

export type DecodedAudio = {
  channels: Float32Array[];
  sampleRate: number;
  samples: number;
};

export async function decodeMpegBytes(bytes: Uint8Array): Promise<DecodedAudio> {
  const decoder = new MPEGDecoder();
  await decoder.ready;
  try {
    const decoded = decoder.decode(bytes);
    if (decoded.errors.length > 0) {
      throw new Error(decoded.errors.map((error) => error.message).join("; "));
    }
    if (decoded.sampleRate < 1 || decoded.samplesDecoded < 1)
      throw new Error("empty decode");
    return {
      channels: decoded.channelData,
      sampleRate: decoded.sampleRate,
      samples: decoded.samplesDecoded,
    };
  } finally {
    decoder.free();
  }
}

export async function decodeMpegFile(path: string): Promise<DecodedAudio> {
  return decodeMpegBytes(new Uint8Array(readFileSync(path)));
}

export function decodedDurationMs(audio: DecodedAudio): number {
  return (audio.samples / audio.sampleRate) * 1000;
}

/**
 * Speech onset near an ASR cue. The quiet fifth of the window sets the floor,
 * and the admitted frame is the rising edge closest to the estimate.
 * Returns null when no edge falls within 1.2 seconds.
 */
export function measureCueOnset(
  audio: DecodedAudio,
  asrSeconds: number,
): number | null {
  const { channels, sampleRate, samples } = audio;
  if (channels.length === 0 || samples < sampleRate / 10) return null;
  const center = Math.floor(asrSeconds * sampleRate);
  const from = Math.max(0, center - Math.floor(sampleRate * 1.2));
  const to = Math.min(samples, center + Math.floor(sampleRate * 1.2));
  const hop = Math.max(1, Math.floor(sampleRate / 100));
  const energies: number[] = [];
  for (let index = from; index + hop <= to; index += hop) {
    let sum = 0;
    for (const channel of channels) {
      const end = Math.min(index + hop, channel.length);
      for (let sample = index; sample < end; sample += 1)
        sum += channel[sample] * channel[sample];
    }
    energies.push(sum / (hop * channels.length));
  }
  if (energies.length < 8) return null;
  const smooth: number[] = [];
  for (let index = 0; index < energies.length; index += 1) {
    let sum = 0;
    let count = 0;
    for (let offset = -2; offset <= 2; offset += 1) {
      const value = energies[index + offset];
      if (value == null) continue;
      sum += value;
      count += 1;
    }
    smooth.push(sum / count);
  }
  const centerHop = Math.round((center - from) / hop);
  const localRadius = Math.round(sampleRate * 0.5 / hop);
  const local: number[] = [];
  for (
    let index = Math.max(0, centerHop - localRadius);
    index <= Math.min(smooth.length - 1, centerHop + localRadius);
    index += 1
  )
    local.push(smooth[index]);
  const sorted = local.sort((left, right) => left - right);
  const floor = sorted[Math.floor(sorted.length * 0.2)] ?? 0;
  const threshold = Math.max(floor * 6, 1e-5);
  let best: number | null = null;
  let bestDistance = Infinity;
  for (let index = 0; index < smooth.length - 2; index += 1) {
    if (
      smooth[index] <= threshold &&
      smooth[index + 1] > threshold &&
      smooth[index + 2] > threshold
    ) {
      const frame = from + (index + 1) * hop;
      const distance = Math.abs(frame / sampleRate - asrSeconds);
      if (distance < bestDistance) {
        best = frame;
        bestDistance = distance;
      }
    }
  }
  if (best == null || bestDistance > 1.2) return null;
  return best;
}

export function writeFloatProbe(
  directory: string,
  name: string,
  audio: DecodedAudio,
  offsetFrame: number,
  frameCount: number,
): { path: string; sha256: string } {
  const channels = audio.channels.length;
  const interleaved = new Float32Array(frameCount * channels);
  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      interleaved[frame * channels + channel] =
        audio.channels[channel][offsetFrame + frame];
    }
  }
  const bytes = Buffer.from(
    interleaved.buffer,
    interleaved.byteOffset,
    interleaved.byteLength,
  );
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  mkdirSync(directory, { recursive: true });
  const path = resolve(directory, `${name}.f32`);
  writeFileSync(path, bytes);
  return { path, sha256 };
}

export type ProbeSegment = {
  id: number;
  text: string;
  uncertain: boolean;
  avgLogProbability?: number;
  noSpeechProbability?: number;
  compressionRatio?: number;
  rawEstimatedStartSeconds: number;
  rawEstimatedEndSeconds?: number;
  localEstimatedStartSeconds: number;
};

/** JSON probe plus a short float32 PCM window. The JSON hash is the probe hash. */
export function writeCueProbe(input: {
  directory: string;
  name: string;
  audio: DecodedAudio;
  offsetFrame: number;
  frameCount: number;
  sourceAudioPath: string;
  sourceAudioSha256: string;
  playbackByteOffset: number;
  playbackByteCount: number;
  decodedAudioSha256: string;
  clock: "source_playback_slice" | "normalized_playback_mp3";
  segments: ProbeSegment[];
}): { path: string; sha256: string; pcmSha256: string } {
  const pcm = writeFloatProbe(
    input.directory,
    input.name,
    input.audio,
    input.offsetFrame,
    input.frameCount,
  );
  const document = {
    schemaVersion: 1,
    sourceAudioPath: input.sourceAudioPath,
    sourceAudioSha256: input.sourceAudioSha256,
    playbackByteOffset: input.playbackByteOffset,
    playbackByteCount: input.playbackByteCount,
    decodedAudioSha256: input.decodedAudioSha256,
    clock: input.clock,
    sampleRate: input.audio.sampleRate,
    channels: input.audio.channels.length,
    pcmLayout: "float32le-interleaved",
    offsetFrame: input.offsetFrame,
    frameCount: input.frameCount,
    durationSeconds: input.frameCount / input.audio.sampleRate,
    pcm,
    segments: input.segments,
  };
  const text = `${JSON.stringify(document, null, 2)}\n`;
  const path = resolve(input.directory, `${input.name}.probe.json`);
  writeFileSync(path, text);
  return {
    path,
    sha256: createHash("sha256").update(text).digest("hex"),
    pcmSha256: pcm.sha256,
  };
}

export function nativeFromOnset(input: {
  audio: DecodedAudio;
  onsetFrame: number;
  sourceAudioSha256: string;
  decodedAudioSha256: string;
  probePath: string;
  probeSha256: string;
  pcmSha256: string;
  cueSegmentIds: number[];
}): NativeEvidence | null {
  const frameCount = Math.min(
    input.audio.sampleRate * 2,
    input.audio.samples - input.onsetFrame,
  );
  if (frameCount < input.audio.sampleRate / 10) return null;
  const startFrame = input.onsetFrame;
  const seek = frameToMs(startFrame, input.audio.sampleRate);
  const onset = frameToMs(input.onsetFrame, input.audio.sampleRate);
  if (seek == null || onset == null || seek > onset || onset - seek > 500)
    return null;
  return {
    sourceAudioSha256: input.sourceAudioSha256,
    sampleRate: input.audio.sampleRate,
    startFrame,
    probe: { path: input.probePath, sha256: input.probeSha256 },
    probeOffsetFrame: startFrame,
    probeFrameCount: frameCount,
    cueProbeSegmentIds: input.cueSegmentIds,
    cueOnsetFrame: input.onsetFrame,
    pcmSha256: input.pcmSha256,
    decodedAudioSha256: input.decodedAudioSha256,
    channels: input.audio.channels.length,
    pcmLayout: "float32le-interleaved",
  };
}
