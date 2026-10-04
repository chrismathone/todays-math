/** Node-only temporary decoded PCM; never retains a complete WAV in application memory. */
import { createHash, randomUUID } from "node:crypto";
import { open, realpath, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ListeningDraft } from "@/contracts/englishListeningHttp.contract";
import { planListeningWaveClip } from "./clip";
import { decodeMp3, MAX_DURATION_MS, MAX_PLAYBACK_BYTES } from "./mp3";

/** Strict full-source PCM identity for trusted sample-based imports and composition. */
export async function decodeListeningMp3Pcm(
  bytes: Buffer,
  signal?: AbortSignal,
) {
  const file = join(
    await realpath(tmpdir()),
    `listening-clip-${randomUUID()}.wav`,
  );
  const handle = await open(file, "wx", 0o600);
  try {
    await handle.writeFile(Buffer.alloc(44));
    const pcmHash = createHash("sha256");
    const decoded = await decodeMp3(
      bytes,
      {
        maxDurationMs: MAX_DURATION_MS,
        maxPlaybackBytes: MAX_PLAYBACK_BYTES,
      },
      async (pcm) => {
        pcmHash.update(pcm);
        await handle.writeFile(pcm);
      },
      signal,
    );
    await handle.write(decoded.header, 0, 44, 0);
    await handle.close();
    const totalBytes = decoded.header.readUInt32LE(40) + 44;
    return {
      header: decoded.header,
      totalBytes,
      sampleRate: decoded.header.readUInt32LE(24),
      channels: decoded.header.readUInt16LE(22),
      frameCount:
        decoded.header.readUInt32LE(40) / decoded.header.readUInt16LE(32),
      pcmSha256: pcmHash.digest("hex"),
      sourceDurationMs: decoded.durationMs,
      async *readRange(start: number, endExclusive: number) {
        if (
          !Number.isSafeInteger(start) ||
          !Number.isSafeInteger(endExclusive) ||
          start < 0 ||
          start > endExclusive ||
          endExclusive > totalBytes
        )
          throw new Error("Invalid decoded PCM range");
        const reader = await open(file, "r");
        try {
          for (let offset = start; offset < endExclusive;) {
            signal?.throwIfAborted();
            const part = Buffer.alloc(
              Math.min(1024 * 1024, endExclusive - offset),
            );
            const { bytesRead } = await reader.read(
              part,
              0,
              part.length,
              offset,
            );
            if (!bytesRead) throw new Error("Decoded PCM was truncated");
            offset += bytesRead;
            yield part.subarray(0, bytesRead);
          }
        } finally {
          await reader.close();
        }
      },
      dispose: () => unlink(file),
    };
  } catch (error) {
    await handle.close().catch(() => {});
    await unlink(file).catch(() => {});
    throw error;
  }
}

export async function decodeListeningMp3Clip(
  bytes: Buffer,
  questions: ListeningDraft["groups"][number]["questions"],
) {
  const decoded = await decodeListeningMp3Pcm(bytes);
  try {
    return {
      ...decoded,
      plan: planListeningWaveClip(
        decoded.header,
        decoded.totalBytes,
        questions,
      ),
    };
  } catch (error) {
    await decoded.dispose();
    throw error;
  }
}
