#!/usr/bin/env node
/**
 * Measures every assigned original once on its native clock and stores the result
 * beside the ledger. Reads the frozen inventory and original audio only.
 *
 *   node measure-native.mjs --inventory <inventory.json> --out <claude output dir>
 *
 * An existing cache is verified and kept; it is never overwritten.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { measureEnergy, windowFrames, WINDOW_MS } from "./lib/activity.mjs";
import {
  assertAssignedTotals,
  assignedRecords,
  loadInventory,
  readBound,
  sha256,
} from "./lib/inventory.mjs";
import { decodeNative, durationMs, pcmSha256 } from "./lib/mp3.mjs";

const { values } = parseArgs({
  options: {
    inventory: { type: "string" },
    out: { type: "string" },
    "runtime-root": { type: "string" },
    "source-id": { type: "string", multiple: true },
  },
});
if (!values.inventory || !values.out)
  throw new Error("--inventory and --out are required");

const { inventory, inventorySha256 } = loadInventory(values.inventory);
const runtimeRoot = values["runtime-root"] ?? inventory.root;
const all = assignedRecords(inventory);
assertAssignedTotals(all);
const wanted = values["source-id"];
const records = wanted
  ? all.filter((r) => wanted.includes(r.sourceRecordId))
  : all;
const nativeDir = join(values.out, "native");
mkdirSync(nativeDir, { recursive: true });

const decoderPackage = JSON.parse(
  readFileSync(
    join(runtimeRoot, "node_modules", "mpg123-decoder", "package.json"),
    "utf8",
  ),
);

for (const record of records) {
  const metaPath = join(nativeDir, record.sourceRecordId + ".native.json");
  const energyPath = join(nativeDir, record.sourceRecordId + ".energy.f64");
  if (existsSync(metaPath)) {
    const meta = JSON.parse(readFileSync(metaPath, "utf8"));
    if (
      meta.inventorySha256 !== inventorySha256 ||
      meta.sourceAudioSha256 !== record.sourceAudioSha256 ||
      sha256(readFileSync(energyPath)) !== meta.energy.sha256
    )
      throw new Error("Existing native cache differs: " + metaPath);
    console.log("kept", record.sourceRecordId);
    continue;
  }
  const bytes = readBound(
    record.sourceAudioPath,
    record.sourceAudioSha256,
    "Original audio",
  );
  const native = await decodeNative(bytes, runtimeRoot);
  if (native.playback.sha256 !== record.audio.sha256)
    throw new Error(
      "Playback bytes are not the original without ID3: " +
        record.sourceRecordId,
    );
  const measuredMs = durationMs(native.frameCount, native.sampleRate);
  if (measuredMs !== record.audio.durationMs)
    throw new Error(
      `Playback duration differs: ${record.sourceRecordId} ${measuredMs} vs ${record.audio.durationMs}`,
    );
  const energy = measureEnergy(
    native.planes,
    native.frameCount,
    native.sampleRate,
  );
  const energyBytes = Buffer.from(
    energy.buffer,
    energy.byteOffset,
    energy.byteLength,
  );
  const meta = {
    schemaVersion: 1,
    provider: "claude",
    inventorySha256,
    sourceRecordId: record.sourceRecordId,
    sourceAudioPath: record.sourceAudioPath,
    sourceAudioSha256: record.sourceAudioSha256,
    sourceAudioBytes: bytes.length,
    playback: {
      derivation: "original bytes without leading ID3v2 and trailing ID3v1",
      byteStart: native.playback.start,
      byteEnd: native.playback.end,
      bytes: native.playback.bytes,
      sha256: native.playback.sha256,
      durationMs: measuredMs,
    },
    decoder: {
      package: "mpg123-decoder",
      version: decoderPackage.version,
      gapless: true,
      pcm: "int16 = clamp(round(float * 32768))",
    },
    pcm: {
      sampleRate: native.sampleRate,
      channels: native.channels,
      frameCount: native.frameCount,
      sha256: pcmSha256(native.planes, native.frameCount),
    },
    energy: {
      statistic: "max_channel_sum_of_squares_pcm16",
      windowMs: WINDOW_MS,
      windowFrames: windowFrames(native.sampleRate),
      windowCount: energy.length,
      encoding: "float64le",
      file: record.sourceRecordId + ".energy.f64",
      sha256: sha256(energyBytes),
    },
    originalAudioModified: false,
    writesDatabase: false,
    writesStorage: false,
  };
  writeFileSync(energyPath, energyBytes, { flag: "wx" });
  writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n", { flag: "wx" });
  console.log(
    "measured",
    record.sourceRecordId,
    native.sampleRate,
    native.channels,
    native.frameCount,
  );
}
