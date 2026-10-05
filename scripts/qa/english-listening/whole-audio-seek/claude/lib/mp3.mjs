/**
 * Native clock of one original MP3.
 *
 * The stored playback asset is the original file without its ID3 containers, so
 * both share one MPEG frame sequence. Decoding that sequence with the product's
 * decoder (mpg123, gapless) gives the frame clock every seek start is stated on.
 * Nothing here resamples, trims or writes audio.
 */
import { createHash } from "node:crypto";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export class Mp3Error extends Error {}

const fail = (message) => {
  throw new Mp3Error(message);
};

/** Same container bounds as src/lib/english/listening/media/mp3.ts parseMp3. */
export function playbackBounds(bytes) {
  let start = 0;
  let end = bytes.length;
  if (bytes.subarray(0, 3).toString("ascii") === "ID3") {
    if (bytes.length < 10 || ![2, 3, 4].includes(bytes[3]) || bytes[4] === 255)
      fail("Invalid ID3v2 header");
    if (bytes.subarray(6, 10).some((n) => n >= 128)) fail("Invalid ID3v2 size");
    const size =
      bytes[6] * 2097152 + bytes[7] * 16384 + bytes[8] * 128 + bytes[9];
    const footer = bytes[3] === 4 && (bytes[5] & 16) !== 0;
    start = 10 + size + (footer ? 10 : 0);
    if (start > end) fail("ID3v2 exceeds file");
  }
  if (
    end - start >= 128 &&
    bytes.subarray(end - 128, end - 125).toString("ascii") === "TAG"
  )
    end -= 128;
  if (end - start < 4) fail("No MPEG audio");
  return { start, end };
}

/** Channel count and rate of the first Layer III frame header. */
export function firstFrameLayout(bytes, offset) {
  const a = bytes[offset + 1];
  const b = bytes[offset + 2];
  const c = bytes[offset + 3];
  const version = (a >> 3) & 3;
  const rateIndex = (b >> 2) & 3;
  if (
    bytes[offset] !== 255 ||
    (a & 0xe0) !== 0xe0 ||
    version === 1 ||
    ((a >> 1) & 3) !== 1 ||
    rateIndex === 3
  )
    fail("First frame is not MPEG Layer III");
  const sampleRate =
    [44100, 48000, 32000][rateIndex] /
    (version === 3 ? 1 : version === 2 ? 2 : 4);
  return { sampleRate, channels: c >> 6 === 3 ? 1 : 2 };
}

const pcm16 = (value) =>
  Math.max(-32768, Math.min(32767, Math.round(value * 32768)));

/**
 * Decodes the whole playback stream and returns PCM16 planes on the native clock.
 * `runtimeRoot` is the installed checkout whose node_modules holds mpg123-decoder.
 */
export async function decodeNative(bytes, runtimeRoot) {
  const bounds = playbackBounds(bytes);
  const layout = firstFrameLayout(bytes, bounds.start);
  const playback = bytes.subarray(bounds.start, bounds.end);
  const moduleUrl = pathToFileURL(
    join(runtimeRoot, "node_modules", "mpg123-decoder", "index.js"),
  ).href;
  const { MPEGDecoder } = await import(moduleUrl);
  const decoder = new MPEGDecoder({ enableGapless: true });
  await decoder.ready;
  let output;
  try {
    output = decoder.decode(playback);
  } finally {
    decoder.free();
  }
  if (output.errors.length) fail("Decoder reported errors");
  if (!output.samplesDecoded) fail("Decoder produced no audio");
  if (output.sampleRate !== layout.sampleRate)
    fail("Decoded rate differs from the frame header");
  const frameCount = output.samplesDecoded;
  const planes = [];
  for (let c = 0; c < layout.channels; c++) {
    const source = output.channelData[c];
    if (!source || source.length < frameCount) fail("Missing channel plane");
    const plane = new Int16Array(frameCount);
    for (let i = 0; i < frameCount; i++) {
      const value = source[i];
      if (!Number.isFinite(value)) fail("Nonfinite sample");
      plane[i] = pcm16(value);
    }
    planes.push(plane);
  }
  return {
    playback: {
      start: bounds.start,
      end: bounds.end,
      bytes: playback.length,
      sha256: createHash("sha256").update(playback).digest("hex"),
    },
    sampleRate: layout.sampleRate,
    channels: layout.channels,
    frameCount,
    planes,
  };
}

/** SHA-256 of interleaved PCM16LE, the identity the product records as pcmSha256. */
export function pcmSha256(planes, frameCount) {
  const hash = createHash("sha256");
  const channels = planes.length;
  const block = 65536;
  for (let offset = 0; offset < frameCount; offset += block) {
    const count = Math.min(block, frameCount - offset);
    const part = Buffer.alloc(count * channels * 2);
    for (let i = 0; i < count; i++)
      for (let c = 0; c < channels; c++)
        part.writeInt16LE(planes[c][offset + i], (i * channels + c) * 2);
    hash.update(part);
  }
  return hash.digest("hex");
}

/** Same rounding as the product: the stored duration is the ceiling in milliseconds. */
export const durationMs = (frameCount, sampleRate) =>
  Math.ceil((frameCount * 1000) / sampleRate);
