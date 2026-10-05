#!/usr/bin/env node
/**
 * Writes one round of bounded probe requests from measured native audio.
 *
 *   node plan-probes.mjs --inventory <inventory.json> --out <claude output dir> \
 *        --round 001 --mode bridge
 *
 * mode bridge   every first sound after a long island or long quiet, plus the
 *               existing verified starts as an independent check of the method
 * mode gaps     every remaining onset between two already confirmed starts of a
 *               source, for questions round one did not confirm (needs --ledger)
 *
 * A request file is never overwritten. Probes are places to listen, not starts.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import {
  followsBridge,
  onsetCandidates,
  probeBounds,
} from "./lib/candidates.mjs";
import {
  assertAssignedTotals,
  assignedRecords,
  loadInventory,
} from "./lib/inventory.mjs";
import { loadNative } from "./lib/native.mjs";
import { POLICY } from "./lib/policy.mjs";

const { values } = parseArgs({
  options: {
    inventory: { type: "string" },
    out: { type: "string" },
    round: { type: "string" },
    mode: { type: "string" },
    ledger: { type: "string" },
    "max-per-gap": { type: "string" },
    "window-seconds": { type: "string" },
    "dry-run": { type: "boolean" },
    "source-id": { type: "string", multiple: true },
  },
});
for (const key of ["inventory", "out", "round", "mode"])
  if (!values[key]) throw new Error(`--${key} is required`);
if (!/^\d{3}$/.test(values.round)) throw new Error("--round is three digits");

const { inventory, inventorySha256 } = loadInventory(values.inventory);
const all = assignedRecords(inventory);
assertAssignedTotals(all);
const wanted = values["source-id"];
const records = wanted
  ? all.filter((r) => wanted.includes(r.sourceRecordId))
  : all;

const requestDir = join(values.out, "probe-requests");
mkdirSync(requestDir, { recursive: true });
const requestPath = join(requestDir, `round-${values.round}.json`);
if (existsSync(requestPath)) throw new Error("Round exists: " + requestPath);

/** One listening: where, how long, and in which fixed language. */
const probeKey = (probe) =>
  `${probe.startFrame}:${probe.frameCount}:${probe.language ?? "ko"}`;

/** Listenings already requested in earlier rounds, per source. */
const heard = new Map();
for (const record of all) heard.set(record.sourceRecordId, new Set());
for (let n = 1; n < Number(values.round); n++) {
  const prior = join(requestDir, `round-${String(n).padStart(3, "0")}.json`);
  if (!existsSync(prior)) continue;
  for (const source of JSON.parse(readFileSync(prior, "utf8")).sources)
    for (const probe of source.probes)
      heard.get(source.sourceRecordId).add(probeKey(probe));
}

const ledger = values.ledger
  ? JSON.parse(readFileSync(values.ledger, "utf8"))
  : null;
if (values.mode === "gaps" && !ledger)
  throw new Error("--mode gaps needs --ledger");
const maxPerGap = Number(values["max-per-gap"] ?? 5);
const windowSeconds = Number(values["window-seconds"] ?? 15);

const sources = [];
for (const record of records) {
  const native = loadNative(values.out, record, inventorySha256);
  const { sampleRate, channels, frameCount, sha256: pcm } = native.meta.pcm;
  const frames = native.windowFrames;
  const candidates = onsetCandidates(native.energy, frames);
  const seen = heard.get(record.sourceRecordId);
  const probes = [];
  const add = (purpose, startFrame, count, extra) => {
    const key = probeKey({ startFrame, frameCount: count, ...extra });
    if (seen.has(key)) return false;
    seen.add(key);
    probes.push({
      id: probes.length + 1,
      purpose,
      startFrame,
      frameCount: count,
      ...extra,
    });
    return true;
  };
  const addCandidate = (purpose, candidate, extra = {}) => {
    const bounds = probeBounds(candidate, native.energy.length);
    if (!bounds) return false;
    return add(
      purpose,
      bounds.startWindow * frames,
      bounds.windowCount * frames,
      {
        onsetFrame: candidate.onsetWindow * frames,
        quietBeforeFrames: candidate.quietWindows * frames,
        ...extra,
      },
    );
  };
  if (values.mode === "bridge") {
    for (const question of record.questions) {
      if (!question.audioRange) continue;
      // A stored start is whole milliseconds; at 44.1 kHz that is not always a
      // whole frame. The probe listens from the nearest frame; the stored value
      // itself is never changed.
      const exact = (question.audioRange.startMs * sampleRate) / 1000;
      const startFrame = Math.round(exact);
      const count = Math.min(
        POLICY.probeWindows * frames,
        frameCount - startFrame,
      );
      add("existing_verified_check", startFrame, count, {
        questionNumber: question.sourceNumber,
        existingStartMs: question.audioRange.startMs,
        wholeFrame: Number.isInteger(exact),
      });
    }
    for (const candidate of candidates)
      if (followsBridge(candidate)) addCandidate("bridge_onset", candidate);
  } else if (values.mode === "gaps") {
    const source = ledger.sources.find(
      (s) => s.sourceRecordId === record.sourceRecordId,
    );
    if (!source) throw new Error("Ledger lacks " + record.sourceRecordId);
    // A short clip that holds the spoken number alone, at a start whose long
    // probe heard this number but in a segment the recognizer marked uncertain.
    for (const item of source.cueOnly) {
      const candidate = candidates.find(
        (c) => c.startWindow * frames === item.startFrame,
      );
      if (!candidate || candidate.islandWindows > 100) continue;
      const tail = Math.min(candidate.nextGapWindows ?? 15, 15);
      add(
        "cue_only",
        item.startFrame,
        (POLICY.leadWindows + candidate.islandWindows + tail) * frames,
        {
          onsetFrame: candidate.onsetWindow * frames,
          quietBeforeFrames: candidate.quietWindows * frames,
          questionNumber: item.sourceNumber,
        },
      );
    }
    // An English recognition from the same frame, for a question whose number
    // is followed directly by its own dialogue instead of a Korean sentence.
    for (const item of source.memberDialogue ?? []) {
      const candidate = candidates.find(
        (c) => c.startWindow * frames === item.startFrame,
      );
      if (!candidate) continue;
      addCandidate("member_dialogue", candidate, {
        questionNumber: item.sourceNumber,
        language: "en",
      });
    }
    for (const gap of source.openGaps) {
      const onset = (c) => c.onsetWindow * frames;
      const inside = candidates.filter(
        (c) =>
          c.startWindow * frames > gap.afterFrame && onset(c) < gap.beforeFrame,
      );
      const pad = 1.5 * sampleRate;
      let pool = inside.filter((c) =>
        gap.hints.some(
          (hint) =>
            onset(c) >= hint.fromFrame - pad && onset(c) <= hint.toFrame + pad,
        ),
      );
      let anchor = (c) =>
        Math.min(...gap.hints.map((hint) => Math.abs(onset(c) - hint.toFrame)));
      if (!pool.length) {
        const expected = gap.expectedFrame;
        pool =
          expected === null
            ? inside
            : inside.filter(
                (c) =>
                  Math.abs(onset(c) - expected) <= windowSeconds * sampleRate,
              );
        anchor = (c) =>
          expected === null ? onset(c) : Math.abs(onset(c) - expected);
      }
      pool.sort((x, y) => anchor(x) - anchor(y));
      let added = 0;
      for (const candidate of pool) {
        if (added >= maxPerGap) break;
        if (
          addCandidate("gap_onset", candidate, {
            questionNumber: gap.sourceNumber,
          })
        )
          added++;
      }
    }
  } else throw new Error("Unknown mode " + values.mode);
  probes.sort((a, b) => a.startFrame - b.startFrame);
  probes.forEach((probe, index) => (probe.id = index + 1));
  sources.push({
    sourceRecordId: record.sourceRecordId,
    sourceAudioPath: record.sourceAudioPath,
    sourceAudioSha256: record.sourceAudioSha256,
    nativeCachePath: native.metaPath,
    nativeCacheSha256: native.metaSha256,
    sampleRate,
    channels,
    frameCount,
    pcmSha256: pcm,
    probes,
  });
}

const request = {
  schemaVersion: 1,
  provider: "claude",
  round: values.round,
  mode: values.mode,
  createdAt: new Date().toISOString(),
  inventoryPath: values.inventory,
  inventorySha256,
  policy: POLICY,
  language: "ko",
  sources,
};
if (!values["dry-run"])
  writeFileSync(requestPath, JSON.stringify(request, null, 1) + "\n", {
    flag: "wx",
  });
console.log(
  JSON.stringify({
    requestPath: values["dry-run"] ? null : requestPath,
    sources: sources.length,
    sourcesWithProbes: sources.filter((s) => s.probes.length).length,
    byPurpose: sources
      .flatMap((s) => s.probes)
      .reduce((n, p) => ({ ...n, [p.purpose]: (n[p.purpose] ?? 0) + 1 }), {}),
    probes: sources.reduce((n, s) => n + s.probes.length, 0),
  }),
);
