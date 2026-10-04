// @vitest-environment node
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { decodeListeningMp3Pcm } from "@/lib/english/listening/media/mp3Clip";
import {
  planListeningSampleClip,
  listeningSampleClipSha256,
} from "@/lib/english/listening/media/sampleClip";
import {
  decodeMp3,
  MAX_DURATION_MS,
  MAX_PLAYBACK_BYTES,
  waveHeader,
} from "@/lib/english/listening/media/mp3";
const sha = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
async function collect(value: AsyncIterable<Buffer>) {
  const parts: Buffer[] = [];
  for await (const part of value) parts.push(part);
  return Buffer.concat(parts);
}
describe("strict PCM sample clipping", () => {
  it("cuts stereo frames exactly including bounds that cannot be represented in whole milliseconds", async () => {
    const bytes = readFileSync(
      new URL(
        "../fixtures/english-listening/tone-vbr-stereo.mp3",
        import.meta.url,
      ),
    );
    const parts: Buffer[] = [];
    const original = await decodeMp3(
      bytes,
      { maxDurationMs: MAX_DURATION_MS, maxPlaybackBytes: MAX_PLAYBACK_BYTES },
      async (p) => {
        parts.push(p);
      },
    );
    const decoded = await decodeListeningMp3Pcm(bytes);
    try {
      const pcm = Buffer.concat(parts);
      expect(decoded.pcmSha256).toBe(sha(pcm));
      const clip = planListeningSampleClip(decoded, 17, 9051),
        actual = await collect(clip.read());
      expect(actual).toEqual(
        Buffer.concat([
          waveHeader(9034, decoded.sampleRate, decoded.channels),
          pcm.subarray(17 * decoded.channels * 2, 9051 * decoded.channels * 2),
        ]),
      );
      expect(await listeningSampleClipSha256(clip)).toBe(sha(actual));
      expect(decoded.header).toEqual(original.header);
    } finally {
      await decoded.dispose();
    }
  });
  it("refuses non-integer sample positions, truncated sources and cancelled range reads", async () => {
    const bytes = readFileSync(
        new URL("../fixtures/english-listening/tone.mp3", import.meta.url),
      ),
      abort = new AbortController(),
      decoded = await decodeListeningMp3Pcm(bytes, abort.signal);
    try {
      expect(() => planListeningSampleClip(decoded, 0.5, 100)).toThrow(/range/);
      expect(() =>
        planListeningSampleClip(decoded, 100, decoded.frameCount + 1),
      ).toThrow(/range/);
      const truncated = {
        ...decoded,
        readRange: async function* () {
          yield Buffer.alloc(1);
        },
      };
      await expect(
        collect(planListeningSampleClip(truncated, 0, 100).read()),
      ).rejects.toThrow(/truncated/);
      abort.abort();
      await expect(
        collect(planListeningSampleClip(decoded, 0, 100).read()),
      ).rejects.toThrow();
    } finally {
      await decoded.dispose();
    }
  });
  it("runs default CLI help without any DB or Storage credentials and refuses approval bypass", () => {
    const script =
      "scripts/qa/english-listening/adopt-listening-question-audio.mts";
    const env = {
      ...process.env,
      DATABASE_URL: "",
      DIRECT_URL: "",
      SUPABASE_SECRET_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      ENGLISH_LISTENING_STORAGE_SERVICE_KEY: "",
    };
    const args = ["--conditions=react-server", "--import=tsx", script];
    expect(
      execFileSync(process.execPath, [...args, "--help"], {
        env,
        windowsHide: true,
        encoding: "utf8",
      }),
    ).toContain("Default: read-only");
    expect(() =>
      execFileSync(
        process.execPath,
        [...args, "ebs-middle-1-2026-1", "--approve"],
        { env, windowsHide: true, stdio: "pipe" },
      ),
    ).toThrow();
  });
});
