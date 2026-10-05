/**
 * Further measured onsets for the converted 2006-2 hearings.
 * A late ordinal is only a place to look. The onset still comes from
 * absolute_energy_v2 or noise_floor_contrast_v1. Empty, instruction, and
 * jingle clips contribute the next onset inside the same search region.
 *
 * Usage: node --experimental-strip-types planConvertedFollowups.ts <round> [--dry-run]
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { planCleanSourceProbe, planNoiseFloorProbe, spokenNumbers } from "./recognition.ts";

const SOURCE_ID = "ebs-middle-1-2006-2";
const LOOKBACK_SECONDS = 2;
const LOOKAHEAD_SECONDS = 0.4;
const ADJACENT_SECONDS = 4;
const round = process.argv[2];
const dryRun = process.argv.includes("--dry-run");
if (!/^\d{3}$/.test(round ?? "") || Number(round) <= 10) {
  throw new Error("Usage: planConvertedFollowups.ts <round after 010> [--dry-run]");
}

const root = "C:/Creative/testautocreator";
const dir = `${root}/output/listening-assessments/whole-audio-seek-20261005/grok`;
const prior = JSON.parse(readFileSync(`${dir}/probe-requests/round-010.json`, "utf8"));
const heard = JSON.parse(readFileSync(`${dir}/probes/round-010/${SOURCE_ID}.json`, "utf8"));
const source = prior.sources.find((item: { sourceRecordId: string }) => item.sourceRecordId === SOURCE_ID);
if (!source || heard.sourceRecordId !== SOURCE_ID) throw new Error("Round 010 is not the converted source");
const native = JSON.parse(readFileSync(`${dir}/native/${SOURCE_ID}.native.json`, "utf8"));
const energyBytes = readFileSync(`${dir}/native/${native.energy.file}`);
if (createHash("sha256").update(energyBytes).digest("hex") !== native.energy.sha256) {
  throw new Error("Energy hash mismatch");
}
const copy = Buffer.from(energyBytes);
const energy = new Float64Array(copy.buffer, copy.byteOffset, copy.length / 8);
const rate = native.pcm.sampleRate as number;
const frameCount = native.pcm.frameCount as number;
const duration = frameCount / rate;
const inventory = JSON.parse(readFileSync(`${root}/.qa-artifacts/whole-audio-seek-20261005/inventory.json`, "utf8"));
const record = inventory.records.find((item: { sourceRecordId: string }) => item.sourceRecordId === SOURCE_ID);
const asr = JSON.parse(readFileSync(record.asrPath, "utf8"));
const segments = [...asr.segments].sort((left: { id: number }, right: { id: number }) => left.id - right.id);
const announcer = /^(?:\d{1,2}|이십|십[일이삼사오육칠팔구]?|[일이삼사오육칠팔구])\s*번/;
const cues = segments.filter((segment: { text: string; uncertain?: boolean; estimatedStartSeconds: number; estimatedEndSeconds: number }) => {
  const spoken = spokenNumbers(segment.text);
  const leading = segment.text.trim().replace(/^[\s"'“”‘’.,·\-–—(\[]+/, "");
  return announcer.test(leading)
    && Array.isArray(spoken)
    && segment.uncertain !== true
    && Number.isFinite(segment.estimatedStartSeconds)
    && segment.estimatedEndSeconds > segment.estimatedStartSeconds;
}).sort((left: { estimatedStartSeconds: number; id: number }, right: { estimatedStartSeconds: number; id: number }) =>
  left.estimatedStartSeconds - right.estimatedStartSeconds || left.id - right.id);

const used = new Set<number>(source.probes.map((probe: { onsetFrame: number }) => probe.onsetFrame));
const probes: Array<{
  id: number; purpose: string; asrSegmentId: number;
  startFrame: number; frameCount: number; onsetFrame: number;
  quietBeforeFrames: number; search: string; onsetSeconds: number;
  discovery: object | null;
}> = [];
const notes = [];

function collect(fromSeconds: number, toSeconds: number, label: string, limit: number) {
  const hits = [];
  let cursor = fromSeconds;
  while (cursor + 0.02 < toSeconds && hits.length < limit) {
    const search = { fromSeconds: cursor, toSeconds };
    const noise = planNoiseFloorProbe(energy, rate, frameCount, search);
    const clean = planCleanSourceProbe(energy, rate, frameCount, search);
    const found = [noise, clean].filter((item) => item != null);
    if (found.length === 0) break;
    found.sort((left, right) => left.onsetSeconds - right.onsetSeconds);
    const earliest = found[0].onsetSeconds;
    let advanced = false;
    for (const planned of found) {
      if (planned.onsetSeconds > earliest + 0.02) continue;
      advanced = true;
      if (used.has(planned.onsetFrame)) continue;
      used.add(planned.onsetFrame);
      hits.push({ label, planned });
    }
    if (!advanced) break;
    cursor = earliest + 0.02;
  }
  return hits;
}

function pushHits(cue: { id: number; text: string }, hits: Array<{ label: string; planned: { purpose: string; startFrame: number; frameCount: number; onsetFrame: number; quietBeforeFrames: number; onsetSeconds: number } }>, discovery: object | null) {
  for (const hit of hits) {
    probes.push({
      id: probes.length + 1,
      purpose: hit.planned.purpose,
      asrSegmentId: cue.id,
      startFrame: hit.planned.startFrame,
      frameCount: hit.planned.frameCount,
      onsetFrame: hit.planned.onsetFrame,
      quietBeforeFrames: hit.planned.quietBeforeFrames,
      search: hit.label,
      onsetSeconds: Number(hit.planned.onsetSeconds.toFixed(3)),
      discovery,
    });
  }
}

for (const cue of cues) {
  const index = cues.indexOf(cue);
  const previous = index > 0 ? cues[index - 1] : null;
  const next = index + 1 < cues.length ? cues[index + 1] : null;
  const passageFrom = previous ? previous.estimatedEndSeconds : 0;
  const passageTo = next ? next.estimatedStartSeconds : duration;
  const heardProbes = heard.probes.filter((probe: { asrSegmentId: number }) => probe.asrSegmentId === cue.id);
  if (heardProbes.length === 0) continue;
  const discoveries = [];
  for (const probe of heardProbes) {
    for (const segment of probe.segments) {
      const leading = String(segment.text).trim().replace(/^[\s"'“”‘’.,·\-–—(\[]+/, "");
      if (!announcer.test(leading) || !Array.isArray(spokenNumbers(segment.text))) continue;
      const word = (segment.words ?? []).find((item: { text: string }) =>
        announcer.test(String(item.text).trim().replace(/^[\s"'“”‘’.,·\-–—(\[]+/, "")));
      const local = word ? word.localStartSeconds : segment.localStartSeconds;
      if (!(local >= 0)) continue;
      const anchor = probe.startFrame / rate + local;
      discoveries.push({
        priorProbeId: probe.id,
        text: segment.text,
        uncertain: segment.uncertain === true,
        localStartSeconds: local,
        anchorSeconds: Number(anchor.toFixed(3)),
      });
      const hits = collect(
        Math.max(passageFrom, anchor - LOOKBACK_SECONDS),
        Math.min(passageTo, anchor + LOOKAHEAD_SECONDS),
        "around-heard-ordinal",
        4,
      );
      pushHits(cue, hits, discoveries.at(-1) ?? null);
    }
  }
  const onsetSeconds = heardProbes.map((probe: { onsetFrame: number }) => probe.onsetFrame / rate);
  const earliest = Math.min(...onsetSeconds);
  const latest = Math.max(...onsetSeconds);
  let regionTo = cue.estimatedEndSeconds;
  if (earliest < cue.estimatedStartSeconds) regionTo = cue.estimatedStartSeconds;
  if (earliest >= cue.estimatedEndSeconds) {
    regionTo = Math.min(passageTo, cue.estimatedEndSeconds + ADJACENT_SECONDS);
  }
  const more = collect(latest + 0.02, regionTo, "next-in-same-region", 4);
  pushHits(cue, more, null);
  notes.push({
    asrSegmentId: cue.id,
    spoken: spokenNumbers(cue.text),
    discoveries: discoveries.length,
    added: probes.filter((probe) => probe.asrSegmentId === cue.id).length,
  });
}

const requestProbes = probes.map(({ search: _search, onsetSeconds: _onset, discovery: _discovery, ...probe }) => probe);
const request = {
  ...prior,
  round,
  createdAt: new Date().toISOString(),
  sources: [{ ...source, probes: requestProbes }],
};
const summary = {
  round,
  dryRun,
  probes: requestProbes.length,
  aroundHeard: probes.filter((probe) => probe.search === "around-heard-ordinal").length,
  nextInRegion: probes.filter((probe) => probe.search === "next-in-same-region").length,
  notes,
};
if (!dryRun) {
  const outPath = `${dir}/probe-requests/round-${round}.json`;
  const planPath = `${dir}/probe-requests/round-${round}.plan.json`;
  if (existsSync(outPath) || existsSync(planPath)) throw new Error(`Refusing to overwrite ${outPath}`);
  const text = `${JSON.stringify(request)}\n`;
  writeFileSync(outPath, text);
  writeFileSync(planPath, `${JSON.stringify({
    requestSha256: createHash("sha256").update(text).digest("hex"),
    ...summary,
    probes,
  }, null, 2)}\n`);
}
process.stdout.write(`${JSON.stringify(summary)}\n`);
