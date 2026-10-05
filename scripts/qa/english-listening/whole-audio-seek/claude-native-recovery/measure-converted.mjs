#!/usr/bin/env node
/**
 * Loudness of the one converted original, on its own verified clock.
 *
 *   node measure-converted.mjs
 *
 * `ebs-middle-1-2006-2` is an M4A original whose playback is an authenticated
 * MP3; the frozen clock is that playback's decode, bound to the original by the
 * independent verifier's nine-landmark proof. The decode and the 20 ms loudness
 * come from the verifier's own `codex/native-windows.mts` (read only), which
 * checks the original's hash, the proof and the playback hash and refuses any
 * PCM that is not the clock's. Only the loudness is kept, in the same cache
 * shape as the other sources; the M4A is hashed, never decoded.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { openSession } from "./lib/session.mjs";
import { MAIN, OUT, clockIdentity, sha256 } from "./lib/store.mjs";

const session = openSession({});
const { baseline } = session;
const nativeDir = join(OUT, "native");
mkdirSync(nativeDir, { recursive: true });

for (const record of baseline.inventory.records) {
  const clock = baseline.clockBySource.get(record.sourceRecordId);
  const identity = clockIdentity(record, clock);
  if (!identity.converted) continue;
  const id = record.sourceRecordId;
  const metaPath = join(nativeDir, id + ".native.json");
  if (existsSync(metaPath)) {
    console.log("kept", id);
    continue;
  }
  const done = spawnSync(
    "node",
    [
      join(MAIN, "node_modules/tsx/dist/cli.mjs"),
      join(MAIN, "scripts/qa/english-listening/whole-audio-seek/codex/native-windows.mts"),
    ],
    {
      input: JSON.stringify({
        root: MAIN,
        source: {
          sourceRecordId: id,
          sourceAudioPath: record.sourceAudioPath,
          sourceAudioSha256: record.sourceAudioSha256,
          audio: { sha256: record.audio.sha256 },
        },
        clock,
        probes: [],
      }),
      maxBuffer: 1024 * 1024 * 1024,
    },
  );
  if (done.status !== 0) throw new Error(done.stderr.toString("utf8").slice(-1200));
  const measured = JSON.parse(done.stdout.toString("utf8"));
  if (
    measured.pcmSha256 !== identity.pcmSha256 ||
    measured.frameCount !== identity.frameCount ||
    measured.sampleRate !== identity.sampleRate ||
    measured.channels !== identity.channels ||
    measured.playbackSha256 !== record.audio.sha256 ||
    measured.durationMs !== record.audio.durationMs
  )
    throw new Error("Converted decode does not reproduce the frozen clock: " + id);
  const energyBytes = Buffer.from(measured.energyBase64, "base64");
  if (sha256(energyBytes) !== measured.energySha256)
    throw new Error("Loudness bytes differ from their hash");
  const meta = {
    schemaVersion: 1,
    provider: "claude-native-recovery",
    clockSha256: baseline.inputs.clock.sha256,
    sourceRecordId: id,
    sourceAudioPath: record.sourceAudioPath,
    sourceAudioSha256: record.sourceAudioSha256,
    decodedFrom: "converted-playback-mp3",
    playbackAudioPath: measured.playbackAudioPath,
    convertedClockProof: measured.convertedClockProof,
    playback: { sha256: measured.playbackSha256, durationMs: measured.durationMs },
    decoder: {
      tool: "codex/native-windows.mts",
      decode: "production decodeMp3 (mpg123-decoder, gapless) of the authenticated playback MP3",
    },
    pcm: {
      sampleRate: measured.sampleRate,
      channels: measured.channels,
      frameCount: measured.frameCount,
      sha256: measured.pcmSha256,
    },
    energy: {
      statistic: "max_channel_sum_of_squares_pcm16",
      windowMs: 20,
      windowFrames: measured.windowFrames,
      windowCount: energyBytes.length / 8,
      encoding: "float64le",
      file: id + ".energy.f64",
      sha256: measured.energySha256,
    },
    originalAudioModified: false,
    writesDatabase: false,
    writesStorage: false,
  };
  writeFileSync(join(nativeDir, id + ".energy.f64"), energyBytes, { flag: "wx" });
  writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n", { flag: "wx" });
  console.log("measured", id, measured.sampleRate, measured.channels, measured.frameCount);
}
