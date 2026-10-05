#!/usr/bin/env node
/**
 * Replays a ledger against the frozen inputs and prints every disagreement.
 *
 *   node verify-marks.mjs --inventory <inventory.json> --out <claude output dir> --marks <marks.json>
 *
 * Read only. Exit code 1 when anything differs. `--decode` also re-decodes every
 * original and compares its PCM identity and energy with the measured cache.
 */
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { measureEnergy } from "./lib/activity.mjs";
import { sourceContext } from "./lib/context.mjs";
import {
  assertAssignedTotals,
  assignedRecords,
  loadInventory,
  loadLiveSnapshot,
  readBound,
  sha256,
} from "./lib/inventory.mjs";
import { decodeNative, pcmSha256 } from "./lib/mp3.mjs";
import { loadNative } from "./lib/native.mjs";
import { verifyMarks } from "./lib/verify.mjs";

const { values } = parseArgs({
  options: {
    inventory: { type: "string" },
    out: { type: "string" },
    marks: { type: "string" },
    decode: { type: "boolean" },
    "allow-partial": { type: "boolean" },
    "runtime-root": { type: "string" },
  },
});
for (const key of ["inventory", "out", "marks"])
  if (!values[key]) throw new Error(`--${key} is required`);

const { inventory, inventorySha256 } = loadInventory(values.inventory);
let records = assignedRecords(inventory);
assertAssignedTotals(records);
const marksBytes = readFileSync(values.marks);
const marks = JSON.parse(marksBytes.toString("utf8"));
if (values["allow-partial"]) {
  const present = new Set(marks.records.map((row) => row.sourceRecordId));
  records = records.filter((record) => present.has(record.sourceRecordId));
}
const live = loadLiveSnapshot(inventory);
const probeFiles = new Map();

const { errors, counts } = verifyMarks(marks, {
  inventorySha256,
  records,
  context: (record) => sourceContext(record, live),
  native: (record) => loadNative(values.out, record, inventorySha256),
  asr: (record) => {
    readBound(record.preparedPath, record.preparedSha256, "Prepared source");
    return JSON.parse(
      readBound(record.asrPath, record.asrSha256, "Original ASR").toString(
        "utf8",
      ),
    );
  },
  probeFile: (path) => {
    if (!probeFiles.has(path)) {
      const bytes = readFileSync(path);
      probeFiles.set(path, {
        sha256: sha256(bytes),
        artifact: JSON.parse(bytes.toString("utf8")),
      });
    }
    return probeFiles.get(path);
  },
});

let decoded = 0;
if (values.decode) {
  const runtimeRoot = values["runtime-root"] ?? inventory.root;
  for (const record of records) {
    const native = loadNative(values.out, record, inventorySha256);
    const bytes = readBound(
      record.sourceAudioPath,
      record.sourceAudioSha256,
      "Original audio",
    );
    const actual = await decodeNative(bytes, runtimeRoot);
    const energy = measureEnergy(
      actual.planes,
      actual.frameCount,
      actual.sampleRate,
    );
    const energySha = sha256(
      Buffer.from(energy.buffer, energy.byteOffset, energy.byteLength),
    );
    if (
      actual.playback.sha256 !== record.audio.sha256 ||
      actual.frameCount !== native.meta.pcm.frameCount ||
      actual.sampleRate !== native.meta.pcm.sampleRate ||
      pcmSha256(actual.planes, actual.frameCount) !== native.meta.pcm.sha256 ||
      energySha !== native.meta.energy.sha256
    )
      errors.push({
        code: "native_cache_does_not_replay",
        sourceRecordId: record.sourceRecordId,
        sourceNumber: null,
        detail: null,
      });
    decoded++;
  }
}

const byCode = {};
for (const error of errors) byCode[error.code] = (byCode[error.code] ?? 0) + 1;
console.log(
  JSON.stringify(
    {
      marks: values.marks,
      marksSha256: sha256(marksBytes),
      inventorySha256,
      sources: records.length,
      questions: records.reduce((n, r) => n + r.questions.length, 0),
      counts,
      originalsDecodedAgain: decoded,
      errorCount: errors.length,
      errorsByCode: byCode,
      errors: errors.slice(0, 40),
    },
    null,
    1,
  ),
);
process.exitCode = errors.length ? 1 : 0;
