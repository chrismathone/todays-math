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
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
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
import { questionPlans } from "./lib/questions.mjs";

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
    modal: { type: "boolean" },
    // gaps mode: "held" listens only for questions still held, "support" only
    // adds English first-utterance listenings to rows that are candidates.
    only: { type: "string" },
    "only-unprobed": { type: "boolean" },
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

/**
 * Listenings that were actually carried out, per source. Read from the stored
 * results, not from requests: a round that was planned but not run for a source
 * has heard nothing there.
 */
const heard = new Map();
for (const record of all) heard.set(record.sourceRecordId, new Set());
const probeRoot = join(values.out, "probes");
for (const round of existsSync(probeRoot) ? readdirSync(probeRoot) : [])
  for (const record of all) {
    const path = join(probeRoot, round, record.sourceRecordId + ".json");
    if (!existsSync(path)) continue;
    for (const probe of JSON.parse(readFileSync(path, "utf8")).probes)
      heard
        .get(record.sourceRecordId)
        .add(probeKey({ ...probe, language: probe.requestedLanguage }));
  }

const ledger = values.ledger
  ? JSON.parse(readFileSync(values.ledger, "utf8"))
  : null;
if (values.mode === "gaps" && !ledger)
  throw new Error("--mode gaps needs --ledger");
const maxPerGap = Number(values["max-per-gap"] ?? 5);
/** A spoken "N번" is longer than this many windows (240 ms). */
const SHORTEST_NUMBER_WINDOWS = 12;
const windowSeconds = Number(values["window-seconds"] ?? 15);

/**
 * Length range of the bridge music: the largest set of long islands whose
 * lengths lie within one second of each other, when it is large enough to be
 * the same clip reused across the recording. Null when no such set exists.
 */
function modalBridge(candidates) {
  const lengths = candidates
    .map((c) => c.previousIslandWindows)
    .filter((n) => n >= POLICY.bridgeIslandWindows)
    .sort((a, b) => a - b);
  let best = { count: 0, from: 0, to: 0 };
  for (let i = 0; i < lengths.length; i++) {
    let j = i;
    while (j < lengths.length && lengths[j] - lengths[i] <= 50) j++;
    if (j - i > best.count)
      best = { count: j - i, from: lengths[i], to: lengths[j - 1] };
  }
  return best.count >= 15 ? { from: best.from - 25, to: best.to + 25 } : null;
}

const sources = [];
for (const record of records) {
  if (
    values["only-unprobed"] &&
    existsSync(probeRoot) &&
    readdirSync(probeRoot).some((round) =>
      existsSync(join(probeRoot, round, record.sourceRecordId + ".json")),
    )
  )
    continue;
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
    const bounds = probeBounds(
      candidate,
      native.energy.length,
      POLICY.probeWindows,
    );
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
    // With --modal, a recording whose long islands cluster at one length (its
    // bridge music, reused before every question) is first heard only after
    // islands of that length; other long islands are left to a gaps round.
    const bridge = values.modal ? modalBridge(candidates) : null;
    for (const candidate of candidates) {
      if (!followsBridge(candidate)) continue;
      if (
        bridge &&
        candidate.quietWindows < POLICY.longQuietWindows &&
        (candidate.previousIslandWindows < bridge.from ||
          candidate.previousIslandWindows > bridge.to)
      )
        continue;
      addCandidate("bridge_onset", candidate);
    }
  } else if (values.mode === "gaps") {
    const source = ledger.sources.find(
      (s) => s.sourceRecordId === record.sourceRecordId,
    );
    if (!source) throw new Error("Ledger lacks " + record.sourceRecordId);
    const fine = onsetCandidates(
      native.energy,
      frames,
      POLICY.fineBridgeWindows,
    );
    const frameOf = (c) => c.startWindow * frames;
    const onset = (c) => c.onsetWindow * frames;
    const at = (startFrame) =>
      candidates.find((c) => frameOf(c) === startFrame) ??
      fine.find((c) => frameOf(c) === startFrame);
    const kindOf = new Map(
      questionPlans(record).map((plan) => [plan.sourceNumber, plan.kind]),
    );
    // A short clip that holds the spoken number alone.
    const addCueOnly = (candidate, sourceNumber) => {
      if (candidate.islandWindows > 100) return;
      const tail = Math.min(candidate.nextGapWindows ?? 15, 15);
      const windows =
        candidate.onsetWindow -
        candidate.startWindow +
        candidate.islandWindows +
        tail;
      add("cue_only", frameOf(candidate), windows * frames, {
        onsetFrame: onset(candidate),
        quietBeforeFrames: candidate.quietWindows * frames,
        questionNumber: sourceNumber,
      });
    };
    // An English recognition from the same frame, for a question whose number
    // is followed directly by its own dialogue instead of a Korean sentence.
    const addDialogue = (candidate, sourceNumber) =>
      addCandidate(
        kindOf.get(sourceNumber) === "shared_instruction_member"
          ? "member_dialogue"
          : "first_dialogue",
        candidate,
        { questionNumber: sourceNumber, language: "en" },
      );
    // A start whose long probe heard the number in an uncertain segment, and
    // any onset right after it: a click before the number makes two onsets.
    const around = (startFrame) => {
      const first = at(startFrame);
      if (!first) return [];
      return [first].concat(
        candidates.filter(
          (c) =>
            c.onsetWindow > first.onsetWindow &&
            c.onsetWindow <= first.onsetWindow + 100,
        ),
      );
    };
    const heldWork = values.only !== "support";
    for (const item of heldWork ? source.cueOnly : [])
      for (const candidate of around(item.startFrame))
        addCueOnly(candidate, item.sourceNumber);
    // English listening from the first measured onsets after the number (and
    // its sentence): a recognizer that hears "Number 20" and then a pause ends
    // its window there, so the dialogue is heard from its own first sound.
    for (const item of [
      ...(values.only === "support" ? [] : (source.memberDialogue ?? [])),
      ...(values.only === "held" ? [] : (source.dialogueWanted ?? [])),
    ]) {
      const after = item.afterFrame ?? item.startFrame + frames;
      const reach = item.reachFrames ?? 6 * sampleRate;
      candidates
        .filter(
          (c) =>
            onset(c) >= after &&
            frameOf(c) > item.startFrame &&
            frameOf(c) <= item.startFrame + reach,
        )
        .slice(0, 2)
        .forEach((candidate) => addDialogue(candidate, item.sourceNumber));
    }

    // A candidate start that sits before a sound too short to be a spoken
    // number (a click after the bridge music): also listen from the next onset,
    // so the start can move up to the number itself if it is heard there.
    for (const item of heldWork ? (source.candidateStarts ?? []) : []) {
      const first = at(item.startFrame);
      if (!first || first.islandWindows > SHORTEST_NUMBER_WINDOWS) continue;
      const next = candidates.find(
        (c) =>
          c.onsetWindow > first.onsetWindow &&
          c.onsetWindow <= first.onsetWindow + 75,
      );
      if (next)
        addCandidate("gap_onset", next, { questionNumber: item.sourceNumber });
    }

    const inGap = (gap, c) =>
      frameOf(c) > gap.afterFrame && onset(c) < gap.beforeFrame;
    // Every first sound after a long island or long quiet that is still unheard
    // inside an open gap, under the normal and the finer split. The finer split
    // finds a spoken number that follows bridge music after a very short quiet.
    for (const [list, purpose] of [
      [candidates, "bridge_onset"],
      [fine, "fine_onset"],
    ])
      for (const candidate of heldWork ? list : []) {
        if (!followsBridge(candidate)) continue;
        const gap = source.openGaps.find((g) => inGap(g, candidate));
        if (gap)
          addCandidate(purpose, candidate, {
            questionNumber: gap.sourceNumber,
          });
      }
    for (const gap of heldWork ? source.openGaps : []) {
      const inside = candidates.filter((c) => inGap(gap, c));
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
      const member =
        kindOf.get(gap.sourceNumber) === "shared_instruction_member";
      let added = 0;
      for (const candidate of pool) {
        if (added >= maxPerGap) break;
        if (
          addCandidate("gap_onset", candidate, {
            questionNumber: gap.sourceNumber,
          })
        ) {
          added++;
          // A member's number stands alone before its dialogue: listen for
          // both at once where the island looks like a spoken number.
          if (member && candidate.islandWindows <= 100) {
            addCueOnly(candidate, gap.sourceNumber);
            const next = candidates.find(
              (c) =>
                c.onsetWindow >=
                candidate.onsetWindow + candidate.islandWindows,
            );
            if (next) addDialogue(next, gap.sourceNumber);
          }
        }
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
