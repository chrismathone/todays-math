/** Trusted complete-dialogue cuts use exact decoded PCM frames, never guessed milliseconds. */
import { createHash } from "node:crypto";
import { inspectListeningMedia } from "./inspect";
import { MAX_DURATION_MS, MAX_PLAYBACK_BYTES, waveHeader } from "./mp3";

export interface ListeningPcmSource {
  header: Buffer;
  totalBytes: number;
  sampleRate: number;
  channels: number;
  frameCount: number;
  pcmSha256: string;
  sourceDurationMs: number;
  readRange(start: number, endExclusive: number): AsyncIterable<Buffer>;
}
export function planListeningSampleClip(
  source: ListeningPcmSource,
  startFrame: number,
  endFrame: number,
) {
  const inspected = inspectListeningMedia(
    source.header,
    source.totalBytes,
    "audio/wav",
    MAX_DURATION_MS,
  );
  if (
    !inspected.playable ||
    source.sampleRate !== source.header.readUInt32LE(24) ||
    source.channels !== source.header.readUInt16LE(22) ||
    source.frameCount !== (source.totalBytes - 44) / (source.channels * 2)
  )
    throw Error("Verified canonical PCM source required");
  if (
    ![startFrame, endFrame].every(Number.isSafeInteger) ||
    startFrame < 0 ||
    startFrame >= endFrame ||
    endFrame > source.frameCount
  )
    throw Error("Invalid exact sample range");
  const totalBytes = 44 + (endFrame - startFrame) * source.channels * 2;
  if (totalBytes > MAX_PLAYBACK_BYTES)
    throw Error("Sample clip exceeds playback limit");
  const header = waveHeader(
    endFrame - startFrame,
    source.sampleRate,
    source.channels,
  );
  const durationMs = Math.ceil(
    ((endFrame - startFrame) * 1000) / source.sampleRate,
  );
  const start = 44 + startFrame * source.channels * 2,
    endExclusive = 44 + endFrame * source.channels * 2;
  async function* read() {
    yield header;
    let received = 0;
    for await (const part of source.readRange(start, endExclusive)) {
      if (
        part.length > 1024 * 1024 ||
        received + part.length > endExclusive - start
      )
        throw Error("PCM source range changed");
      received += part.length;
      yield part;
    }
    if (received !== endExclusive - start)
      throw Error("PCM source was truncated");
  }
  return { startFrame, endFrame, totalBytes, durationMs, header, read };
}
export async function listeningSampleClipSha256(
  plan: ReturnType<typeof planListeningSampleClip>,
) {
  const hash = createHash("sha256");
  for await (const part of plan.read()) hash.update(part);
  return hash.digest("hex");
}
