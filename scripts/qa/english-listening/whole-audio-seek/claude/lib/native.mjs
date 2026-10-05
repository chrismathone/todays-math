/** Reads one measured native cache and refuses a cache bound to anything else. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { WINDOW_MS, windowFrames } from "./activity.mjs";
import { sha256 } from "./inventory.mjs";

export class NativeCacheError extends Error {}

const fail = (message) => {
  throw new NativeCacheError(message);
};

export function nativePaths(outDir, sourceRecordId) {
  return {
    metaPath: join(outDir, "native", sourceRecordId + ".native.json"),
    energyPath: join(outDir, "native", sourceRecordId + ".energy.f64"),
  };
}

export function loadNative(outDir, record, inventorySha256) {
  const { metaPath, energyPath } = nativePaths(outDir, record.sourceRecordId);
  const metaBytes = readFileSync(metaPath);
  const meta = JSON.parse(metaBytes.toString("utf8"));
  const energyBytes = readFileSync(energyPath);
  if (meta.inventorySha256 !== inventorySha256)
    fail("Native cache belongs to another inventory: " + metaPath);
  if (
    meta.sourceRecordId !== record.sourceRecordId ||
    meta.sourceAudioSha256 !== record.sourceAudioSha256
  )
    fail("Native cache belongs to another original: " + metaPath);
  if (
    meta.playback.sha256 !== record.audio.sha256 ||
    meta.playback.durationMs !== record.audio.durationMs
  )
    fail("Native cache playback identity differs: " + metaPath);
  if (sha256(energyBytes) !== meta.energy.sha256)
    fail("Native energy file changed: " + energyPath);
  const frames = windowFrames(meta.pcm.sampleRate);
  if (
    meta.energy.windowMs !== WINDOW_MS ||
    meta.energy.windowFrames !== frames ||
    meta.energy.windowCount !== Math.floor(meta.pcm.frameCount / frames) ||
    energyBytes.length !== meta.energy.windowCount * 8
  )
    fail("Native energy shape differs: " + metaPath);
  const energy = new Float64Array(
    energyBytes.buffer.slice(
      energyBytes.byteOffset,
      energyBytes.byteOffset + energyBytes.byteLength,
    ),
  );
  return {
    meta,
    metaPath,
    metaSha256: sha256(metaBytes),
    energyPath,
    energy,
    windowFrames: frames,
  };
}
