// @vitest-environment node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  listeningMediaUploadSchema,
  listeningMediaCompletionSchema,
} from "@/contracts/englishListeningMedia.contract";
import {
  prepareListeningM4aPlayback,
  verifyListeningM4aPlayback,
  type VerifiedListeningM4aPlayback,
} from "@/lib/english/listening/media/trustedM4a";
import {
  decodeMp3,
  MAX_DURATION_MS,
  MAX_PLAYBACK_BYTES,
} from "@/lib/english/listening/media/mp3";
vi.mock("server-only", () => ({}));
const ffmpegPath = process.env.LISTENING_M4A_TEST_FFMPEG_PATH;
const sourcePath = fileURLToPath(
  new URL("../fixtures/english-listening/tone-aac.m4a", import.meta.url),
);
const digest = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
describe("trusted M4A conversion boundary", () => {
  it("rejects forged prepared objects and keeps M4A outside public upload schemas", () => {
    expect(() =>
      verifyListeningM4aPlayback(
        Buffer.alloc(32),
        {} as VerifiedListeningM4aPlayback,
      ),
    ).toThrow("엄격하게 검증");
    expect(
      listeningMediaUploadSchema.safeParse({
        setId: "00000000-0000-4000-8000-000000000000",
        totalBytes: 1,
        mimeType: "audio/mp4",
        expectedSha256: "a".repeat(64),
      }).success,
    ).toBe(false);
  });
  it("rejects non-absolute native command paths before spawning", async () => {
    await expect(
      prepareListeningM4aPlayback({ sourcePath, ffmpegPath: "ffmpeg" }),
    ).rejects.toThrow("엄격하게 검증");
  });
  describe.skipIf(!ffmpegPath || !path.isAbsolute(ffmpegPath))(
    "actual native full decode",
    () => {
      it("preserves source identity, verifies every PCM sample and exact MP3 duration without changing rate or channels", async () => {
        const prepared = await prepareListeningM4aPlayback({
          sourcePath,
          ffmpegPath: ffmpegPath!,
        });
        expect(prepared.sourceBytes).toEqual(readFileSync(sourcePath));
        const conversion = verifyListeningM4aPlayback(
          prepared.sourceBytes,
          prepared.playbackDerivative,
        );
        expect(conversion).toMatchObject({
          sourceMimeType: "audio/mp4",
          sourceSha256: digest(prepared.sourceBytes),
          sampleRate: 48000,
          channels: 2,
          decoder: "ffmpeg-strict",
          encoder: "libmp3lame-q0",
        });
        expect(conversion.sourceSamples).toBeGreaterThanOrEqual(48000);
        let bytes = 0;
        const decoded = await decodeMp3(
          prepared.playbackDerivative.bytes,
          {
            maxDurationMs: MAX_DURATION_MS,
            maxPlaybackBytes: MAX_PLAYBACK_BYTES,
          },
          async (part) => {
            bytes += part.length;
          },
        );
        expect(bytes / 4).toBe(conversion.sourceSamples);
        expect(decoded.durationMs).toBe(
          Math.ceil((conversion.sourceSamples * 1000) / 48000),
        );
        expect(
          listeningMediaCompletionSchema.safeParse({
            assetId: "00000000-0000-4000-8000-000000000001",
            setId: "00000000-0000-4000-8000-000000000000",
            ownerId: "00000000-0000-4000-8000-000000000002",
            branchId: null,
            revision: 1,
            receivedBytes: prepared.sourceBytes.length,
            totalBytes: prepared.sourceBytes.length,
            chunkBytes: 1048576,
            uploadExpiresAt: 1,
            verifiedAt: 1,
            state: "ready",
            publishable: true,
            mimeType: "audio/mpeg",
            sha256: digest(prepared.playbackDerivative.bytes),
            durationMs: decoded.durationMs,
            originalSha256: conversion.sourceSha256,
            playbackBytes: prepared.playbackDerivative.bytes.length,
            playbackRevision: 1,
          }).success,
        ).toBe(true);
        const changed = Buffer.from(prepared.sourceBytes);
        changed[changed.length - 1] ^= 1;
        expect(() =>
          verifyListeningM4aPlayback(changed, prepared.playbackDerivative),
        ).toThrow("엄격하게 검증");
        prepared.playbackDerivative.bytes[
          prepared.playbackDerivative.bytes.length - 1
        ] ^= 1;
        expect(() =>
          verifyListeningM4aPlayback(
            prepared.sourceBytes,
            prepared.playbackDerivative,
          ),
        ).toThrow("엄격하게 검증");
      });
      it("strictly rejects a damaged/truncated M4A instead of issuing a verified capability", async () => {
        const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
        const { tmpdir } = await import("node:os");
        const directory = await mkdtemp(
          path.join(tmpdir(), "listening-m4a-test-"),
        );
        try {
          const file = path.join(directory, "damaged.m4a");
          const bytes = readFileSync(sourcePath);
          await writeFile(
            file,
            bytes.subarray(0, Math.floor(bytes.length / 2)),
          );
          await expect(
            prepareListeningM4aPlayback({
              sourcePath: file,
              ffmpegPath: ffmpegPath!,
            }),
          ).rejects.toThrow("엄격하게 검증");
        } finally {
          if (path.dirname(directory) !== path.resolve(tmpdir()))
            throw Error("Unsafe test cleanup");
          await rm(directory, { recursive: true, force: true });
        }
      });
    },
  );
});
