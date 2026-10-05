#!/usr/bin/env node
/**
 * Measures the native clock and loudness of each source once: a full decode of
 * the original bytes with the pinned decoder, refused unless it reproduces the
 * frozen clock record (rate, channels, frame count, PCM SHA-256, playback bytes
 * and duration). Only the 20 ms loudness is kept; no PCM is written.
 *
 *   node measure-native.mjs --scope pilot|reconstructed [--source-id <id> ...]
 *
 * An existing cache is verified by the commands that read it and never overwritten.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import {
  WINDOW_MS,
  measureEnergy,
  windowFrames,
} from "../claude/lib/activity.mjs";
import { decodeNative, durationMs, pcmSha256 } from "../claude/lib/mp3.mjs";
import { openSession } from "./lib/session.mjs";
import { OUT, TOOLS, clockIdentity, readBound, sha256 } from "./lib/store.mjs";

const { values } = parseArgs({
  options: {
    scope: { type: "string", default: "pilot" },
    "source-id": { type: "string", multiple: true },
    out: { type: "string", default: OUT },
    inventory: { type: "string" },
    "inventory-sha256": { type: "string" },
    clock: { type: "string" },
    "clock-sha256": { type: "string" },
  },
});
const session = openSession(values);
const { baseline } = session;
const nativeDir = join(values.out, "native");
mkdirSync(nativeDir, { recursive: true });
const decoderVersion = JSON.parse(
  readFileSync(
    join(TOOLS.runtimeRoot, "node_modules", "mpg123-decoder", "package.json"),
    "utf8",
  ),
).version;

for (const id of session.scope(values.scope, values["source-id"])) {
  const record = baseline.recordById.get(id);
  const identity = clockIdentity(record, baseline.clockBySource.get(id));
  if (identity.unavailable) {
    console.log("skipped", id, identity.unavailable);
    continue;
  }
  const metaPath = join(nativeDir, id + ".native.json");
  if (existsSync(metaPath)) {
    console.log("kept", id);
    continue;
  }
  const bytes = readBound(
    record.sourceAudioPath,
    record.sourceAudioSha256,
    "Original audio",
  );
  const native = await decodeNative(bytes, TOOLS.runtimeRoot);
  const pcm = pcmSha256(native.planes, native.frameCount);
  if (
    native.sampleRate !== identity.sampleRate ||
    native.channels !== identity.channels ||
    native.frameCount !== identity.frameCount ||
    pcm !== identity.pcmSha256 ||
    native.playback.sha256 !== record.audio.sha256 ||
    durationMs(native.frameCount, native.sampleRate) !== record.audio.durationMs
  )
    throw new Error("Decode does not reproduce the frozen clock: " + id);
  const energy = measureEnergy(native.planes, native.frameCount, native.sampleRate);
  const energyBytes = Buffer.from(energy.buffer, energy.byteOffset, energy.byteLength);
  const meta = {
    schemaVersion: 1,
    provider: "claude-native-recovery",
    clockSha256: baseline.inputs.clock.sha256,
    sourceRecordId: id,
    sourceAudioPath: record.sourceAudioPath,
    sourceAudioSha256: record.sourceAudioSha256,
    playback: {
      sha256: native.playback.sha256,
      durationMs: record.audio.durationMs,
    },
    decoder: {
      package: "mpg123-decoder",
      version: decoderVersion,
      gapless: true,
      pcm: "int16 = clamp(round(float * 32768))",
    },
    pcm: {
      sampleRate: native.sampleRate,
      channels: native.channels,
      frameCount: native.frameCount,
      sha256: pcm,
    },
    energy: {
      statistic: "max_channel_sum_of_squares_pcm16",
      windowMs: WINDOW_MS,
      windowFrames: windowFrames(native.sampleRate),
      windowCount: energy.length,
      encoding: "float64le",
      file: id + ".energy.f64",
      sha256: sha256(energyBytes),
    },
    originalAudioModified: false,
    writesDatabase: false,
    writesStorage: false,
  };
  writeFileSync(join(nativeDir, id + ".energy.f64"), energyBytes, { flag: "wx" });
  writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n", { flag: "wx" });
  console.log("measured", id, native.sampleRate, native.channels, native.frameCount);
}
