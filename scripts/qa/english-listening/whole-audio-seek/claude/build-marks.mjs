#!/usr/bin/env node
/**
 * Builds the complete start ledger of the assigned originals.
 *
 *   node build-marks.mjs --inventory <inventory.json> --out <claude output dir> --run <name>
 *
 * Writes <out>/runs/<name>/marks.json (one row per current question) and
 * ledger.json (what to listen to next for the rows still held). An existing run
 * directory is refused. Reads frozen inputs only; writes no database, storage,
 * original audio, original ASR cache or prepared file.
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { sourceContext } from "./lib/context.mjs";
import {
  assertAssignedTotals,
  assignedRecords,
  loadInventory,
  loadLiveSnapshot,
  readBound,
  sha256,
} from "./lib/inventory.mjs";
import { loadNative } from "./lib/native.mjs";
import { POLICY } from "./lib/policy.mjs";
import { resolveSource } from "./lib/resolve.mjs";
import { assembleRow } from "./lib/rows.mjs";
import { alignDialogue } from "./lib/script.mjs";

const { values } = parseArgs({
  options: {
    inventory: { type: "string" },
    out: { type: "string" },
    run: { type: "string" },
    "source-id": { type: "string", multiple: true },
    "allow-partial": { type: "boolean" },
  },
});
for (const key of ["inventory", "out", "run"])
  if (!values[key]) throw new Error(`--${key} is required`);

const { inventory, inventorySha256 } = loadInventory(values.inventory);
const all = assignedRecords(inventory);
assertAssignedTotals(all);
const wanted = values["source-id"];
const records = wanted
  ? all.filter((r) => wanted.includes(r.sourceRecordId))
  : all;
if (wanted && !values["allow-partial"])
  throw new Error("A partial ledger needs --allow-partial");
const live = loadLiveSnapshot(inventory);

const runDir = join(values.out, "runs", values.run);
if (existsSync(runDir)) throw new Error("Run exists: " + runDir);

const here = dirname(fileURLToPath(import.meta.url));
// Hashed with line ends folded to LF, so a checkout that converts line ends
// names the same tools.
const toolSha256 = {};
for (const file of [
  "build-marks.mjs",
  ...readdirSync(join(here, "lib")).map((name) => "lib/" + name),
])
  toolSha256[file] = sha256(
    Buffer.from(
      readFileSync(join(here, file), "utf8").replaceAll("\r\n", "\n"),
      "utf8",
    ),
  );
const git = (args) => {
  const run = spawnSync("git", args, { cwd: here, encoding: "utf8" });
  return run.status === 0 ? run.stdout.trim() : null;
};
const toolGit = {
  commit: git(["rev-parse", "HEAD"]),
  uncommittedToolFiles: (git(["status", "--porcelain", "--", "."]) ?? "")
    .split("\n")
    .filter(Boolean).length,
};

const probeRoot = join(values.out, "probes");
const rounds = existsSync(probeRoot) ? readdirSync(probeRoot).sort() : [];

const rows = [];
const sources = [];
const ledgerSources = [];
for (const record of records) {
  const asrBytes = readBound(record.asrPath, record.asrSha256, "Original ASR");
  readBound(record.preparedPath, record.preparedSha256, "Prepared source");
  const asr = JSON.parse(asrBytes.toString("utf8"));
  if (asr.sourceAudioSha256 !== record.sourceAudioSha256)
    throw new Error(
      "ASR belongs to another original: " + record.sourceRecordId,
    );
  const native = loadNative(values.out, record, inventorySha256);
  const { plans, sections, scriptReason, transcriptSha256 } = sourceContext(
    record,
    live,
  );
  const dialogue = sections
    ? alignDialogue(asr.segments, sections, plans)
    : null;
  const probeSets = [];
  for (const round of rounds) {
    const path = join(probeRoot, round, record.sourceRecordId + ".json");
    if (!existsSync(path)) continue;
    const bytes = readFileSync(path);
    const artifact = JSON.parse(bytes.toString("utf8"));
    if (artifact.inventorySha256 !== inventorySha256)
      throw new Error("Probe file belongs to another inventory: " + path);
    probeSets.push({ path, sha256: sha256(bytes), round, artifact });
  }
  const resolved = resolveSource({
    record,
    plans,
    native,
    probeSets,
    asr,
    dialogue,
    sections,
  });
  const pcm = native.meta.pcm;
  for (const row of resolved.rows)
    rows.push(
      assembleRow({
        record,
        native,
        row,
        section: sections?.get(row.plan.sourceNumber) ?? null,
        check:
          resolved.heard.find(
            (item) =>
              item.probe.purpose === "existing_verified_check" &&
              item.probe.questionNumber === row.plan.sourceNumber,
          ) ?? null,
      }),
    );
  sources.push({
    sourceRecordId: record.sourceRecordId,
    setId: record.setId,
    revision: record.revision,
    documentSha256: record.documentSha256,
    sourceAudioPath: record.sourceAudioPath,
    sourceAudioSha256: record.sourceAudioSha256,
    playbackSha256: record.audio.sha256,
    playbackDurationMs: record.audio.durationMs,
    asr: { path: record.asrPath, sha256: record.asrSha256 },
    prepared: { path: record.preparedPath, sha256: record.preparedSha256 },
    officialTranscriptSha256: transcriptSha256,
    officialScriptSections: sections ? "available" : scriptReason,
    nativeCache: {
      path: native.metaPath,
      sha256: native.metaSha256,
      energyPath: native.energyPath,
      energySha256: native.meta.energy.sha256,
      pcmSha256: pcm.sha256,
      sampleRate: pcm.sampleRate,
      channels: pcm.channels,
      frameCount: pcm.frameCount,
    },
    probeFiles: probeSets.map((set) => ({
      path: set.path,
      sha256: set.sha256,
      round: set.round,
      probes: set.artifact.probes.length,
    })),
  });
  ledgerSources.push({
    sourceRecordId: record.sourceRecordId,
    openGaps: resolved.openGaps,
    cueOnly: resolved.cueOnly,
    memberDialogue: resolved.memberDialogue,
  });
}

const count = (status) => rows.filter((row) => row.status === status).length;
const reasonCounts = {};
for (const row of rows)
  if (row.status === "held")
    for (const reason of row.reasons)
      reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
const marks = {
  schemaVersion: 1,
  evidenceContractVersion: 1,
  provider: "claude",
  createdAt: new Date().toISOString(),
  inventoryPath: values.inventory,
  inventorySha256,
  liveSnapshotSha256: inventory.liveSnapshotSha256,
  policy: POLICY,
  statement:
    "seekStartMs is a measured native frame of the original recording, a fixed lead inside quiet before the question's spoken number. Playback continues to playbackEndMs, the full original duration. No clip, cut end, equal division or model timestamp is used as a start.",
  toolSha256,
  toolGit,
  writesDatabase: false,
  writesStorage: false,
  originalAudioModified: false,
  officialContentModified: false,
  humanReviewed: false,
  counts: {
    sources: sources.length,
    questions: rows.length,
    candidate: count("candidate"),
    held: count("held"),
    existing_verified: count("existing_verified"),
    heldReasons: reasonCounts,
  },
  sources,
  records: rows,
};
mkdirSync(runDir, { recursive: true });
writeFileSync(
  join(runDir, "marks.json"),
  JSON.stringify(marks, null, 1) + "\n",
  {
    flag: "wx",
  },
);
writeFileSync(
  join(runDir, "ledger.json"),
  JSON.stringify(
    {
      schemaVersion: 1,
      inventorySha256,
      run: values.run,
      sources: ledgerSources,
    },
    null,
    1,
  ) + "\n",
  { flag: "wx" },
);
console.log(JSON.stringify({ runDir, ...marks.counts }));
