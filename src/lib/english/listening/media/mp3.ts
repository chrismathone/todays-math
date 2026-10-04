/** Node-only. Inline WASM ships with mpg123-decoder; no ffmpeg process or CDN fetch. */
import { setImmediate } from "node:timers/promises";
import type { ListeningMediaBlocker } from "../../../../contracts/englishListeningMedia.contract";
import {
  LISTENING_MAX_UPLOAD_BYTES,
  LISTENING_MAX_DURATION_MS,
  LISTENING_MAX_PLAYBACK_BYTES,
} from "../../../../contracts/englishListeningSource.contract";

export const MAX_PLAYBACK_BYTES = LISTENING_MAX_PLAYBACK_BYTES;
export const MAX_ORIGINAL_BYTES = LISTENING_MAX_UPLOAD_BYTES;
export const MAX_DURATION_MS = LISTENING_MAX_DURATION_MS;
export class MediaFormatError extends Error {
  constructor(readonly blocker: ListeningMediaBlocker) {
    super(blocker);
  }
}
const invalid = (): never => {
  throw new MediaFormatError("unsupported_or_invalid_mp3");
};

/** Strict Layer III boundaries complement mpg123's deliberately tolerant decoder.
 * No resynchronization over junk, free-format, changing channel/rate or partial frames.
 * Leading ID3v2.2/3/4 and trailing ID3v1 are discarded without parsing their contents.
 * https://id3.org/id3v2.4.0-structure
 * Frame arithmetic: mpg123 src/libmpg123/parse.c (Layer III).
 */
export function parseMp3(bytes: Buffer, maxDurationMs: number) {
  if (bytes.length > MAX_ORIGINAL_BYTES)
    throw new MediaFormatError("output_limit");
  let offset = 0;
  let end = bytes.length;
  if (bytes.subarray(0, 3).toString("ascii") === "ID3") {
    if (bytes.length < 10 || ![2, 3, 4].includes(bytes[3]) || bytes[4] === 255)
      invalid();
    const reserved = bytes[3] === 2 ? 0x3f : bytes[3] === 3 ? 0x1f : 0x0f;
    if (bytes[5] & reserved || bytes.subarray(6, 10).some((n) => n >= 128))
      invalid();
    const size =
      bytes[6] * 2097152 + bytes[7] * 16384 + bytes[8] * 128 + bytes[9];
    const footer = bytes[3] === 4 && (bytes[5] & 16) !== 0;
    offset = 10 + size + (footer ? 10 : 0);
    if (offset > end) invalid();
    if (
      footer &&
      (bytes.subarray(offset - 10, offset - 7).toString("ascii") !== "3DI" ||
        !bytes.subarray(offset - 7, offset).equals(bytes.subarray(3, 10)))
    )
      invalid();
  }
  if (
    end - offset >= 128 &&
    bytes.subarray(end - 128, end - 125).toString("ascii") === "TAG"
  )
    end -= 128;
  const frames: Buffer[] = [];
  let sampleRate = 0;
  let channels = 0;
  let samples = 0;
  let declaredFrames: number | undefined;
  let declaredBytes: number | undefined;
  let gapless:
    { delay: number; padding: number; infoSamples: number } | undefined;
  const audioStart = offset;
  while (offset < end) {
    if (end - offset < 4) invalid();
    const a = bytes[offset + 1],
      b = bytes[offset + 2],
      c = bytes[offset + 3];
    const version = (a >> 3) & 3;
    const rateIndex = (b >> 2) & 3;
    const bitrateIndex = b >> 4;
    if (
      bytes[offset] !== 255 ||
      (a & 0xe0) !== 0xe0 ||
      version === 1 ||
      ((a >> 1) & 3) !== 1 ||
      rateIndex === 3 ||
      bitrateIndex === 0 ||
      bitrateIndex === 15 ||
      (c & 3) === 2
    )
      invalid();
    const rate =
      [44100, 48000, 32000][rateIndex] /
      (version === 3 ? 1 : version === 2 ? 2 : 4);
    const channelCount = c >> 6 === 3 ? 1 : 2;
    const kbps = (
      version === 3
        ? [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
        : [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
    )[bitrateIndex];
    const length =
      Math.floor(((version === 3 ? 144000 : 72000) * kbps) / rate) +
      ((b >> 1) & 1);
    if (
      offset + length > end ||
      (sampleRate && (sampleRate !== rate || channels !== channelCount))
    )
      invalid();
    sampleRate = rate;
    channels = channelCount;
    const frame = bytes.subarray(offset, offset + length);
    if (frames.length === 0) {
      const sideBytes =
        version === 3 ? (channels === 1 ? 17 : 32) : channels === 1 ? 9 : 17;
      const xing = 4 + (a & 1 ? 0 : 2) + sideBytes;
      const marker = frame.subarray(xing, xing + 4).toString("ascii");
      if (marker === "Xing" || marker === "Info") {
        if (xing + 8 > length) invalid();
        const flags = frame.readUInt32BE(xing + 4);
        if (flags & ~15) invalid();
        let p = xing + 8;
        if (flags & 1) {
          if (p + 4 > length) invalid();
          declaredFrames = frame.readUInt32BE(p);
          p += 4;
        }
        if (flags & 2) {
          if (p + 4 > length) invalid();
          declaredBytes = frame.readUInt32BE(p);
          p += 4;
        }
        if (flags & 4) {
          if (p + 100 > length) invalid();
          p += 100;
        }
        if (flags & 8) {
          if (p + 4 > length) invalid();
          p += 4;
        }
        const encoder = frame.subarray(p, p + 4).toString("ascii");
        if (["LAME", "Lavf", "Lavc"].includes(encoder)) {
          if (p + 24 > length) invalid();
          // mpg123/FFmpeg read these two 12-bit values from the Xing extension:
          // https://github.com/madebr/mpg123/blob/master/src/libmpg123/parse.c
          // https://github.com/FFmpeg/FFmpeg/blob/master/libavformat/mp3dec.c
          // A real Info frame has an empty side-info area. Only derive an exact
          // expected sample count for an unprotected header with declared length;
          // other streams retain the existing conservative completeness check.
          if (
            (a & 1) !== 0 &&
            declaredFrames !== undefined &&
            frame.subarray(4, xing).every((n) => n === 0)
          ) {
            gapless = {
              delay: (frame[p + 21] << 4) | (frame[p + 22] >> 4),
              padding: ((frame[p + 22] & 15) << 8) | frame[p + 23],
              infoSamples: version === 3 ? 1152 : 576,
            };
          }
        }
      } else if (frame.subarray(36, 40).toString("ascii") === "VBRI") {
        if (length < 54) invalid();
        declaredBytes = frame.readUInt32BE(46);
        // VBRI counts its first audio frame, unlike Xing's separate information frame.
        declaredFrames = frame.readUInt32BE(50) - 1;
      }
    }
    frames.push(frame);
    samples += version === 3 ? 1152 : 576;
    // Known gapless trim is verified exactly after every frame has been decoded.
    // Keep the previous bound for streams without this recognized metadata.
    const trim = gapless
      ? gapless.infoSamples + gapless.delay + gapless.padding
      : 3456;
    if ((samples - trim) * 1000 > maxDurationMs * sampleRate)
      throw new MediaFormatError("duration_limit");
    offset += length;
  }
  if (
    frames.length < 2 ||
    (declaredFrames !== undefined && declaredFrames !== frames.length - 1) ||
    (declaredBytes !== undefined && declaredBytes !== end - audioStart)
  )
    invalid();
  const expectedSamples = gapless
    ? samples - gapless.infoSamples - gapless.delay - gapless.padding
    : undefined;
  if (expectedSamples !== undefined && expectedSamples <= 0) invalid();
  return {
    frames,
    sampleRate,
    channels,
    samples,
    expectedSamples,
    audioStart,
    audioEnd: end,
  };
}

export function waveHeader(
  samples: number,
  sampleRate: number,
  channels: number,
) {
  const header = Buffer.alloc(44);
  header.write("RIFF");
  header.writeUInt32LE(36 + samples * channels * 2, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * 2, 28);
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(samples * channels * 2, 40);
  return header;
}

/** Decodes EVERY frame, rejecting every reported error and nonfinite output sample.
 * PCM writes are <= 32 frames, with cooperative cancellation between batches. */
export async function decodeMp3(
  bytes: Buffer,
  limits: { maxDurationMs: number; maxPlaybackBytes: number },
  writePcm: (bytes: Buffer) => Promise<void>,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  const parsed = parseMp3(bytes, limits.maxDurationMs);
  const { MPEGDecoder } = await import("mpg123-decoder");
  const decoder = new MPEGDecoder({ enableGapless: true });
  await decoder.ready;
  let samples = 0;
  try {
    for (let offset = 0; offset < parsed.frames.length; offset += 32) {
      signal?.throwIfAborted();
      const output = decoder.decodeFrames(
        parsed.frames.slice(offset, offset + 32),
      );
      if (
        output.errors.length ||
        (output.samplesDecoded && output.sampleRate !== parsed.sampleRate)
      )
        invalid();
      samples += output.samplesDecoded;
      if (samples * 1000 > limits.maxDurationMs * parsed.sampleRate)
        throw new MediaFormatError("duration_limit");
      if (44 + samples * parsed.channels * 2 > limits.maxPlaybackBytes)
        throw new MediaFormatError("output_limit");
      // mpg123-decoder always returns two planes, duplicating mono; preserve mono layout.
      const pcm = Buffer.alloc(output.samplesDecoded * parsed.channels * 2);
      for (let i = 0; i < output.samplesDecoded; i++) {
        for (let c = 0; c < parsed.channels; c++) {
          const value = output.channelData[c]?.[i];
          if (!Number.isFinite(value)) invalid();
          pcm.writeInt16LE(
            Math.max(-32768, Math.min(32767, Math.round(value * 32768))),
            (i * parsed.channels + c) * 2,
          );
        }
      }
      if (pcm.length) await writePcm(pcm);
      await setImmediate(undefined, { signal });
    }
    if (
      !samples ||
      samples > parsed.samples ||
      (parsed.expectedSamples !== undefined
        ? samples !== parsed.expectedSamples
        : parsed.samples - samples > 3456)
    )
      invalid();
    return {
      header: waveHeader(samples, parsed.sampleRate, parsed.channels),
      durationMs: Math.ceil((samples * 1000) / parsed.sampleRate),
    };
  } finally {
    decoder.free();
  }
}
