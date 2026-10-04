/** Trusted Node CLI import only. No public upload schema accepts this capability. */
import "server-only";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  decodeMp3,
  parseMp3,
  MAX_DURATION_MS,
  MAX_ORIGINAL_BYTES,
  MAX_PLAYBACK_BYTES,
} from "./mp3";

const brand: unique symbol = Symbol("verified-m4a-playback");
export interface ListeningM4aConversion {
  sourceMimeType: "audio/mp4";
  sourceSha256: string;
  sourcePcmSha256: string;
  sourceSamples: number;
  sampleRate: number;
  channels: number;
  derivedOriginalSha256: string;
  decoder: "ffmpeg-strict";
  encoder: "libmp3lame-q0";
}
export interface VerifiedListeningM4aPlayback {
  readonly [brand]: true;
  readonly bytes: Buffer;
  readonly conversion: Readonly<ListeningM4aConversion>;
}
const prepared = new WeakSet<object>();
const sha = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
const failed = () =>
  new Error("M4A 원본과 MP3 파생 음원을 엄격하게 검증하지 못했습니다.");

/** Reject forged or subsequently mutated source/derivative buffers before network I/O. */
export function verifyListeningM4aPlayback(
  source: Buffer,
  value: VerifiedListeningM4aPlayback,
) {
  if (
    !prepared.has(value) ||
    source.length > MAX_ORIGINAL_BYTES ||
    sha(source) !== value.conversion.sourceSha256 ||
    sha(value.bytes) !== value.conversion.derivedOriginalSha256
  )
    throw failed();
  return value.conversion;
}

async function native(
  ffmpeg: string,
  args: string[],
  consume: (part: Buffer) => void,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  const child = spawn(ffmpeg, args, {
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const closed = new Promise<number>((resolve, reject) => {
    child.once("error", () => reject(failed()));
    child.once("close", (code) =>
      code === 0 ? resolve(code) : reject(failed()),
    );
  });
  void closed.catch(() => {});
  // Consume bounded diagnostic output without exposing paths, metadata or native error bodies.
  let diagnostics = 0;
  child.stderr.on("data", (part: Buffer) => {
    diagnostics += part.length;
    if (diagnostics > 1024 * 1024) child.kill();
  });
  const cancel = () => child.kill();
  signal?.addEventListener("abort", cancel, { once: true });
  const timeout = setTimeout(cancel, 240000);
  try {
    for await (const part of child.stdout) {
      signal?.throwIfAborted();
      consume(Buffer.from(part));
    }
    await closed;
    if (diagnostics) throw failed();
    signal?.throwIfAborted();
  } catch (error) {
    child.kill();
    await closed.catch(() => {});
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }
}

/** PCM float WAV on stdout gives machine-readable format fields without requiring ffprobe. */
function pcmProbe() {
  let header = Buffer.alloc(0),
    format: { rate: number; channels: number } | undefined;
  let pcmBytes = 0,
    tail = Buffer.alloc(0),
    inData = false;
  const digest = createHash("sha256");
  const consumePcm = (part: Buffer) => {
    pcmBytes += part.length;
    if (pcmBytes > MAX_PLAYBACK_BYTES * 2) throw failed();
    digest.update(part);
    const samples = Buffer.concat([tail, part]);
    const end = samples.length - (samples.length % 4);
    for (let i = 0; i < end; i += 4)
      if (!Number.isFinite(samples.readFloatLE(i))) throw failed();
    tail = samples.subarray(end);
  };
  return {
    consume(part: Buffer) {
      if (inData) return consumePcm(part);
      header = Buffer.concat([header, part]);
      if (header.length < 12) return;
      if (
        header.toString("ascii", 0, 4) !== "RIFF" ||
        header.toString("ascii", 8, 12) !== "WAVE"
      )
        throw failed();
      let offset = 12;
      while (offset + 8 <= header.length) {
        const kind = header.toString("ascii", offset, offset + 4),
          length = header.readUInt32LE(offset + 4);
        if (kind === "data") {
          if (!format) throw failed();
          inData = true;
          consumePcm(header.subarray(offset + 8));
          header = Buffer.alloc(0);
          return;
        }
        if (length > 65536 || offset + 8 + length > 65536) throw failed();
        if (offset + 8 + length > header.length) return;
        if (kind === "fmt ") {
          const f = header.subarray(offset + 8, offset + 8 + length);
          if (
            f.length < 16 ||
            ![3, 65534].includes(f.readUInt16LE(0)) ||
            f.readUInt16LE(14) !== 32 ||
            (f.readUInt16LE(0) === 65534 &&
              (f.length < 40 || f.readUInt32LE(24) !== 3))
          )
            throw failed();
          format = { channels: f.readUInt16LE(2), rate: f.readUInt32LE(4) };
          if (
            ![1, 2].includes(format.channels) ||
            ![
              8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000,
            ].includes(format.rate) ||
            f.readUInt16LE(12) !== format.channels * 4 ||
            f.readUInt32LE(8) !== format.rate * format.channels * 4
          )
            throw failed();
        }
        offset += 8 + length + (length % 2);
      }
      if (header.length > 65536) throw failed();
    },
    finish() {
      if (
        !inData ||
        !format ||
        tail.length ||
        !pcmBytes ||
        pcmBytes % (format.channels * 4)
      )
        throw failed();
      const samples = pcmBytes / (format.channels * 4);
      if (samples * 1000 > MAX_DURATION_MS * format.rate) throw failed();
      return { samples, ...format, sha256: digest.digest("hex") };
    },
  };
}

/** Native conversion stays in the explicitly invoked local CLI import boundary.
 * FFmpeg documents transcoding as lossy: the original AAC/M4A is preserved unchanged.
 * https://ffmpeg.org/ffmpeg.html#Transcoding */
export async function prepareListeningM4aPlayback(input: {
  sourcePath: string;
  ffmpegPath: string;
  signal?: AbortSignal;
}): Promise<{
  sourceBytes: Buffer;
  playbackDerivative: VerifiedListeningM4aPlayback;
}> {
  if (!path.isAbsolute(input.sourcePath) || !path.isAbsolute(input.ffmpegPath))
    throw failed();
  const info = await stat(input.sourcePath);
  if (!info.isFile() || !info.size || info.size > MAX_ORIGINAL_BYTES)
    throw failed();
  const sourceBytes = await readFile(input.sourcePath);
  if (
    sourceBytes.length !== info.size ||
    sourceBytes.length < 16 ||
    sourceBytes.toString("ascii", 4, 8) !== "ftyp"
  )
    throw failed();
  const directory = await mkdtemp(path.join(tmpdir(), "listening-m4a-"));
  const sourcePath = path.join(directory, "source.m4a"),
    outputPath = path.join(directory, "playback.mp3");
  try {
    // Snapshot bytes prevent an original path replacement between probe and encode.
    await writeFile(sourcePath, sourceBytes, { flag: "wx", mode: 0o600 });
    const args = [
      "-nostdin",
      "-hide_banner",
      "-loglevel",
      "error",
      "-err_detect",
      "explode",
      "-xerror",
      "-protocol_whitelist",
      "file,pipe",
      "-i",
      sourcePath,
      "-map",
      "0:a:0",
      "-vn",
      "-sn",
      "-dn",
      "-map_metadata",
      "-1",
    ];
    const probe = pcmProbe();
    await native(
      input.ffmpegPath,
      [...args, "-bitexact", "-c:a", "pcm_f32le", "-f", "wav", "pipe:1"],
      probe.consume,
      input.signal,
    );
    const pcm = probe.finish();
    await native(
      input.ffmpegPath,
      [
        ...args,
        "-c:a",
        "libmp3lame",
        "-q:a",
        "0",
        "-id3v2_version",
        "0",
        "-write_id3v1",
        "0",
        "-f",
        "mp3",
        outputPath,
      ],
      () => {},
      input.signal,
    );
    const output = await stat(outputPath);
    if (!output.size || output.size > MAX_ORIGINAL_BYTES) throw failed();
    const bytes = await readFile(outputPath),
      parsed = parseMp3(bytes, MAX_DURATION_MS);
    let decodedBytes = 0;
    await decodeMp3(
      bytes,
      { maxDurationMs: MAX_DURATION_MS, maxPlaybackBytes: MAX_PLAYBACK_BYTES },
      async (part) => {
        decodedBytes += part.length;
      },
      input.signal,
    );
    if (
      parsed.sampleRate !== pcm.rate ||
      parsed.channels !== pcm.channels ||
      decodedBytes / (pcm.channels * 2) !== pcm.samples
    )
      throw failed();
    const conversion = Object.freeze({
      sourceMimeType: "audio/mp4" as const,
      sourceSha256: sha(sourceBytes),
      sourcePcmSha256: pcm.sha256,
      sourceSamples: pcm.samples,
      sampleRate: pcm.rate,
      channels: pcm.channels,
      derivedOriginalSha256: sha(bytes),
      decoder: "ffmpeg-strict" as const,
      encoder: "libmp3lame-q0" as const,
    });
    const playbackDerivative = Object.freeze({
      [brand]: true as const,
      bytes,
      conversion,
    });
    prepared.add(playbackDerivative);
    return { sourceBytes, playbackDerivative };
  } finally {
    // The generated absolute directory is always directly beneath the system temp dir.
    if (path.dirname(directory) !== path.resolve(tmpdir())) throw failed();
    await rm(directory, { recursive: true, force: true });
  }
}
