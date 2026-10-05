#!/usr/bin/env node
/**
 * Plans bounded listenings. A plan only says where to listen; what is heard
 * there decides. Provider and recognizer times are read here and nowhere else.
 *
 *   node plan.mjs --stage headings   --round 001 --scope pilot
 *   node plan.mjs --stage quotes     --round 002 --scope pilot [--controls] [--tile]
 *   node plan.mjs --stage terminal   --round 003 --scope pilot
 *   node plan.mjs --stage gaps       --round 004 --scope pilot
 *   node plan.mjs --stage truncation --round 005 --scope pilot
 *
 * headings    Korean, 8 s, from every measured onset inside the band that the
 *             transcripts point at for each written number.
 * context     Korean, 14 s, from a start where the number was written first and
 *             the announcer's sentence began but eight seconds ended before
 *             its verb (a long shared heading).
 * variants    Korean, 6 s and 4.5 s, from a start where the number was written
 *             first but with a recognizer time that lags the measured onset.
 * quotes      English, up to 60 s: the dialogue of an established passage, from
 *             the end of its heading to the start of the next heading.
 * terminal    Korean, from every long-quiet onset after the last heading.
 * gaps        Korean, from long-quiet onsets between two established headings
 *             whose numbers are not consecutive.
 * truncation  Adversarial clips at established headings: cut after 400 ms, and
 *             begun 300 ms into the number.
 *
 * A start frame someone already listened to in the same language is not asked again.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { resolveOfficial } from "./lib/official.mjs";
import { resolveSource } from "./lib/resolve.mjs";
import {
  RULES,
  establishHeadings,
  headingReading,
  quoteWords,
  readsHeading,
} from "./lib/rules.mjs";
import { openSession } from "./lib/session.mjs";
import { clockIdentity } from "./lib/store.mjs";

const { values } = parseArgs({
  options: {
    stage: { type: "string" },
    round: { type: "string" },
    scope: { type: "string", default: "pilot" },
    "source-id": { type: "string", multiple: true },
    controls: { type: "boolean" },
    tile: { type: "boolean" },
    converted: { type: "boolean" },
    "max-per-number": { type: "string", default: "5" },
    "dry-run": { type: "boolean" },
    out: { type: "string" },
    inventory: { type: "string" },
    "inventory-sha256": { type: "string" },
    clock: { type: "string" },
    "clock-sha256": { type: "string" },
    certificate: { type: "string" },
    "certificate-sha256": { type: "string" },
  },
});
if (!values.stage || !/^\d{3}$/.test(values.round ?? ""))
  throw new Error("--stage and a three digit --round are required");
const session = openSession(values);
// Deliberately damaged clips never share a folder with evidence.
const requestDir = join(
  session.out,
  ...(values.stage === "truncation" ? ["adversarial"] : []),
  "probe-requests",
);
const requestPath = join(requestDir, `round-${values.round}.json`);
if (existsSync(requestPath)) throw new Error("Round exists: " + requestPath);
const cap = Number(values["max-per-number"]);

const HEADING_WINDOWS = 400;
const CONTEXT_WINDOWS = 700;
const QUOTE_WINDOWS = 3000;
const MINIMUM_WINDOWS = 150;

/** Bands (ms) in which the transcripts suggest a number's heading begins. */
function bandsFor(hints) {
  const bands = new Map();
  const add = (number, from, to, why) => {
    if (!bands.has(number)) bands.set(number, []);
    bands.get(number).push({ from, to, why });
  };
  for (const hint of hints.numbers) {
    if (hint.source === "provider_headings") {
      if (hint.nextWordStartMs !== null)
        add(hint.number, hint.nextWordStartMs - 5000, hint.nextWordStartMs - 200, "before_next_word");
      // A 3,000 ms number token is a provider artefact; its time says nothing.
      if (hint.tokenEndMs - hint.tokenStartMs !== 3000)
        add(hint.number, hint.tokenStartMs - 1500, hint.tokenStartMs + 1500, "number_token");
    } else
      add(
        hint.number,
        hint.segmentStartMs - 2500,
        Math.min(hint.segmentEndMs, hint.segmentStartMs + 25000) + 1000,
        "frozen_asr_segment",
      );
  }
  return bands;
}

const sources = [];
const summary = { stage: values.stage, sources: 0, probes: 0, audioSeconds: 0 };
const bump = (key, n = 1) => (summary[key] = (summary[key] ?? 0) + n);

for (const id of session.scope(values.scope, values["source-id"])) {
  // The converted original has its own runner and its own rounds (--converted);
  // an ordinary round never holds it, and a converted round holds nothing else.
  const converted = Boolean(
    clockIdentity(
      session.baseline.recordById.get(id),
      session.baseline.clockBySource.get(id),
    ).converted,
  );
  if (converted !== Boolean(values.converted)) {
    if (converted) bump("convertedSourceLeftToItsOwnRunner");
    continue;
  }
  const w = session.world(id);
  if (w.identity.unavailable) {
    bump("sourcesNotListened");
    continue;
  }
  const { native, onsets } = w;
  const frames = native.windowFrames;
  const rate = native.sampleRate;
  const toWindow = (ms) => (ms * rate) / 1000 / frames;
  const heard = (language) =>
    new Map(
      w.allListenings
        .filter((l) => l.language === language)
        .map((l) => [l.startFrame, l.frameCount]),
    );
  const probes = [];
  const taken = new Set();
  const push = (probe) => {
    const key = probe.language + ":" + probe.startFrame + ":" + probe.frameCount;
    if (taken.has(key)) return;
    taken.add(key);
    probes.push({ id: probes.length + 1, ...probe });
  };
  const korean = (onset, purpose, extra = {}) => {
    const windows = Math.min(HEADING_WINDOWS, native.energy.length - onset.startWindow);
    if (windows < MINIMUM_WINDOWS) return;
    if ((heard("ko").get(onset.startWindow * frames) ?? 0) >= MINIMUM_WINDOWS * frames) {
      bump("alreadyListened");
      return;
    }
    push({
      purpose,
      language: "ko",
      startFrame: onset.startWindow * frames,
      frameCount: windows * frames,
      onsetFrame: onset.onsetWindow * frames,
      onsetMethod: onset.method,
      quietBeforeFrames: onset.quietWindows * frames,
      ...extra,
    });
  };
  const spokenEnough = (o) => o.soundWindows >= RULES.minimumSoundAfterOnsetWindows;

  if (values.stage === "headings") {
    // An official source keeps its certified starts: only a held question's
    // own number and, where it has no certified start, the next one are sought.
    let only = null;
    if (!w.record.reconstructed) {
      const certified = new Set(
        w.certRows
          .filter((r) => r.audioRange)
          .flatMap((r) => r.scopeQuestionNumbers ?? [r.sourceNumber]),
      );
      only = new Set();
      for (const row of w.certRows.filter((r) => r.status === "held")) {
        only.add(row.sourceNumber);
        if (!certified.has(row.sourceNumber + 1)) only.add(row.sourceNumber + 1);
      }
    }
    for (const [number, bands] of bandsFor(w.hints)) {
      if (only && !only.has(number)) continue;
      const within = (why) =>
        onsets.filter(
          (o) =>
            spokenEnough(o) &&
            bands.some(
              (b) =>
                b.why === why &&
                o.onsetWindow >= toWindow(b.from) &&
                o.onsetWindow <= toWindow(b.to),
            ),
        );
      // Every onset in the few seconds before the provider's instruction, and
      // around a plausible number token. The long whole-record segment only
      // adds its longest-quiet onsets, capped.
      const provider = [...within("before_next_word"), ...within("number_token")];
      const asr = within("frozen_asr_segment")
        .sort((a, b) => b.quietWindows - a.quietWindows)
        .slice(0, cap);
      if (!provider.length && !asr.length) bump("numbersWithoutOnsetInBand");
      for (const onset of [...provider, ...asr])
        korean(onset, "heading_onset", { hintedNumber: number });
    }
  } else if (values.stage === "context") {
    // A start where the number was written first and reliably and the
    // announcer's sentence had begun, but eight seconds ended before its verb
    // (a long shared heading): the same start is heard once more for fourteen
    // seconds. The short readings stay on record beside it.
    const byStart = new Map();
    for (const l of w.koListenings) {
      if (!byStart.has(l.startFrame)) byStart.set(l.startFrame, []);
      byStart.get(l.startFrame).push(l);
    }
    for (const [startFrame, list] of byStart) {
      const readings = list.map((l) => ({ l, r: headingReading(l.probe) }));
      const numbered = readings.filter(
        ({ r }) => r.cue && readsHeading(r, r.cue.numbers),
      );
      if (!numbered.length || numbered.some(({ r }) => r.instruction)) continue;
      const begun = numbered.some(
        ({ l, r }) =>
          l.probe.segments
            .map((s) => s.text)
            .join(" ")
            .slice(r.text.length - r.cue.rest.length)
            .replace(/입니다/g, "")
            .replace(/[^가-힣]/g, "").length >= 4,
      );
      if (!begun) continue;
      const windows = Math.min(CONTEXT_WINDOWS, Math.floor((native.frameCount - startFrame) / frames));
      if (list.some((l) => l.frameCount >= windows * frames)) continue;
      const [{ l }] = numbered;
      push({
        purpose: "heading_onset_longer_context",
        language: "ko",
        startFrame,
        frameCount: windows * frames,
        onsetFrame: l.onsetFrame,
        onsetMethod: l.probe.onsetMethod,
        quietBeforeFrames: l.probe.quietBeforeFrames,
      });
    }
  } else if (values.stage === "variants") {
    // A start where the number was written first and reliably, but with a
    // recognizer time that lags the measured onset: the same start is heard
    // again in two shorter bounded clips. Every reading stays on record.
    const byStart = new Map();
    for (const l of w.koListenings) {
      if (!byStart.has(l.startFrame)) byStart.set(l.startFrame, []);
      byStart.get(l.startFrame).push(l);
    }
    for (const [startFrame, list] of byStart) {
      const readings = list.map((l) => ({ l, r: headingReading(l.probe) }));
      const numbered = readings.filter(
        ({ r }) => r.cue && readsHeading(r, r.cue.numbers),
      );
      if (!numbered.length) continue;
      const atOnset = ({ l, r }) => {
        const lead = (l.onsetFrame - startFrame) / rate;
        return r.firstSegmentStartSeconds - 0.5 <= lead && r.firstSegmentEndSeconds >= lead;
      };
      if (numbered.some(atOnset)) continue;
      const [{ l }] = numbered;
      const have = new Set(list.map((x) => x.frameCount));
      for (const windows of [300, 225]) {
        if (have.has(windows * frames)) continue;
        if (startFrame + windows * frames > native.frameCount) continue;
        push({
          purpose: "heading_onset_shorter_clip",
          language: "ko",
          startFrame,
          frameCount: windows * frames,
          onsetFrame: l.onsetFrame,
          onsetMethod: l.probe.onsetMethod,
          quietBeforeFrames: l.probe.quietBeforeFrames,
        });
      }
    }
  } else if (values.stage === "terminal" || values.stage === "gaps") {
    const { headings } = establishHeadings(native, w.koListenings);
    const long = onsets.filter((o) => o.quietWindows >= 50 && spokenEnough(o));
    if (values.stage === "terminal") {
      const last = headings.at(-1);
      if (last)
        for (const onset of long)
          if (onset.startWindow * frames > last.startFrame)
            korean(onset, "terminal_scan");
    } else
      for (let i = 1; i < headings.length; i++) {
        const [a, b] = [headings[i - 1], headings[i]];
        if (b.covers[0] <= a.covers.at(-1) + 1 && a.kind !== "shared_head") continue;
        for (const onset of long)
          if (
            onset.startWindow * frames > a.startFrame &&
            onset.startWindow * frames < b.startFrame
          )
            korean(onset, "gap_scan", { between: [a.numbers, b.numbers] });
      }
  } else if (values.stage === "truncation") {
    const { headings } = establishHeadings(native, w.koListenings.filter((l) => l.own));
    for (const heading of headings) {
      push({
        purpose: "adversarial_cut_after_400ms",
        language: "ko",
        startFrame: heading.startFrame,
        frameCount: heading.onsetFrame - heading.startFrame + 20 * frames,
        onsetFrame: heading.onsetFrame,
        expectedNumbers: heading.numbers,
      });
      const late = heading.onsetFrame + 15 * frames;
      push({
        purpose: "adversarial_begun_300ms_into_number",
        language: "ko",
        startFrame: late,
        frameCount: Math.min(HEADING_WINDOWS * frames, native.frameCount - late),
        onsetFrame: heading.onsetFrame,
        expectedNumbers: heading.numbers,
      });
    }
  } else if (values.stage === "quotes") {
    const base = {
      record: w.record,
      native,
      certRows: w.certRows,
      koListenings: w.koListenings,
      enListenings: w.enListenings,
      generation: w.generation,
      hints: w.hints,
      certificateSha256: session.baseline.inputs.certificate.sha256,
      admissions: session.baseline.admissions,
      terminalScan: session.terminalScan(w),
    };
    const held = w.certRows.filter((r) => r.status === "held" && r.reconstructed);
    const existing = w.certRows.filter((r) => r.audioRange && r.reconstructed);
    const jobs = [];
    if (w.record.reconstructed) {
      jobs.push({ targets: held, blind: false });
      if (values.controls) jobs.push({ targets: existing, blind: true });
    }
    const english = heard("en");
    const planned = [];
    if (!w.record.reconstructed) {
      // An official question keeps its number: the clip is its own passage's.
      const resolved = resolveOfficial({
        ...base,
        script: w.script,
        targets: w.certRows.filter((r) => r.status === "held"),
      });
      for (const row of resolved.rows)
        if (
          row.status === "held" &&
          row.reasons[0] === "own_script_sentence_not_heard_in_passage_clip"
        ) {
          const passage = resolved.passages.find((x) => x.key === row.sourceNumber);
          if (passage) planned.push({ passage, blind: false });
        }
    }
    const flat = [];
    w.hints.englishWords.forEach((word, i) =>
      quoteWords(word.text).forEach((part) => flat.push({ part, i })),
    );
    const WAITING = new Set([
      "anchor_quote_not_heard_in_any_established_passage",
      "not_every_frozen_quote_heard_in_one_passage_clip",
    ]);
    for (const job of jobs) {
      const resolved = resolveSource({ ...base, ...job });
      // Passages near where the transcripts estimate a waiting question's quotes.
      const wanted = new Set();
      for (const row of resolved.rows) {
        if (row.status === "candidate" || !WAITING.has(row.reasons[0])) continue;
        const generation = w.generation.byQuestion.get(row.questionId);
        const spans = [];
        if (generation.estimatedStartMs !== null)
          spans.push([generation.estimatedStartMs, generation.estimatedEndMs]);
        for (const quote of generation.evidenceQuotes) {
          const words = quoteWords(quote);
          if (words.length < RULES.minimumAnchorWords) continue;
          for (let i = 0; i + words.length <= flat.length; i++)
            if (words.every((word, k) => flat[i + k].part === word))
              spans.push([
                w.hints.englishWords[flat[i].i].start,
                w.hints.englishWords[flat[i + words.length - 1].i].end,
              ]);
        }
        for (const passage of resolved.passages) {
          const p0 = (passage.fromFrame * 1000) / rate;
          const p1 = (passage.toFrame * 1000) / rate;
          if (spans.some(([a, b]) => b >= p0 - 10000 && a <= p1 + 10000))
            wanted.add(passage);
        }
      }
      for (const passage of wanted) planned.push({ passage, blind: job.blind });
    }
    {
      for (const { passage, blind } of planned) {
        // One clip for the whole dialogue of the passage: it begins where the
        // heading probe estimated the announcer's sentence to end (a place to
        // start listening, nothing more) and ends at the next heading's start.
        const heading = passage.start.native?.heading ?? null;
        const spoken = heading
          ? heading.probe.segments.filter((s) =>
              (heading.reading.instruction?.segmentIds ?? [heading.reading.firstSegmentId]).includes(s.id),
            )
          : [];
        const after = spoken.length
          ? Math.max(...spoken.map((s) => s.localEndSeconds)) - 0.3
          : 5;
        const first = Math.ceil(passage.fromFrame / frames);
        const last = Math.floor(passage.toFrame / frames);
        const begin = Math.max(first, first + Math.floor((after * rate) / frames));
        const starts = [begin];
        if (last - begin > QUOTE_WINDOWS) starts.push(last - QUOTE_WINDOWS);
        if (values.tile) {
          // Alternate clips of the same passage: one that begins two seconds
          // earlier, and others three seconds later and every fifteen seconds.
          starts.push(Math.max(first, begin - 100));
          for (let at = begin + 150; at < last - MINIMUM_WINDOWS; at += 750)
            starts.push(at);
        }
        for (const startWindow of new Set(starts)) {
          const startFrame = startWindow * frames;
          const windows = Math.min(QUOTE_WINDOWS, last - startWindow);
          if (windows < MINIMUM_WINDOWS) continue;
          if ((english.get(startFrame) ?? 0) >= windows * frames) {
            bump("alreadyListened");
            continue;
          }
          push({
            purpose: "localized_generation",
            language: "en",
            startFrame,
            frameCount: windows * frames,
            passageOriginalNumbers: passage.scope,
            passageFrames: [passage.fromFrame, passage.toFrame],
            forControlReplay: blind,
          });
        }
      }
    }
  } else throw new Error("Unknown stage: " + values.stage);

  if (!probes.length) continue;
  summary.sources++;
  summary.probes += probes.length;
  summary.audioSeconds += probes.reduce((n, p) => n + p.frameCount / rate, 0);
  sources.push({
    sourceRecordId: id,
    sourceAudioPath: w.record.sourceAudioPath,
    sourceAudioSha256: w.record.sourceAudioSha256,
    nativeCachePath: native.cachePath,
    nativeCacheSha256: native.cacheSha256,
    sampleRate: rate,
    channels: native.channels,
    frameCount: native.frameCount,
    pcmSha256: native.pcmSha256,
    ...(native.converted
      ? {
          decodedFrom: "converted-playback-mp3",
          playbackSha256: w.record.audio.sha256,
          playbackAudioPath: native.converted.playbackAudioPath,
          convertedClockProof: native.converted.convertedClockProof,
        }
      : {}),
    probes,
  });
}

summary.audioSeconds = Math.round(summary.audioSeconds);
const request = {
  schemaVersion: 1,
  provider: "claude-native-recovery",
  round: values.round,
  mode: values.stage,
  createdAt: new Date().toISOString(),
  inventoryPath: session.baseline.inputs.inventory.path,
  inventorySha256: session.baseline.inputs.inventory.sha256,
  inputs: session.baseline.inputs,
  rules: RULES,
  language: "ko",
  summary,
  sources,
};
// A round that would listen to nothing is not written.
if (!values["dry-run"] && sources.length) {
  mkdirSync(requestDir, { recursive: true });
  writeFileSync(requestPath, JSON.stringify(request, null, 1), { flag: "wx" });
}
console.log(JSON.stringify({ requestPath, dryRun: Boolean(values["dry-run"]), ...summary }));
