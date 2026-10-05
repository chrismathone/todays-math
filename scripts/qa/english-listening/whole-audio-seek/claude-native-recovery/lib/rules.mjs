/**
 * Route `native_numbered_passage_literal_quote_v1`: the rules, as pure
 * functions over measured loudness and stored bounded recognitions.
 *
 * Nothing here reads a file, a clock or a transcript time. A heading is a
 * measured native onset where a Korean recognition that begins at the start
 * writes the literal number first; a passage is the native frames between two
 * consecutive headings; a question belongs to the passage in which its own
 * frozen quote is heard word for word by an English recognition whose whole
 * clip lies inside those frames. Recognized text is never rewritten.
 */
import { createHash } from "node:crypto";
import {
  dbfsOfEnergy,
  energyAtDbfs,
  quietBefore,
} from "../../claude/lib/activity.mjs";
// The independent verifier's own English word rule (`dotted_initialism_v1`).
import { englishWords } from "../../claude-ambiguity/lib/words.mjs";

export const ROUTE = "native_numbered_passage_literal_quote_v1";

export const RULES = Object.freeze({
  id: ROUTE,
  windowMs: 20,
  quietThresholdDbfs: -50,
  leadWindows: 20,
  minimumQuietBeforeWindows: 5,
  minimumSoundAfterOnsetWindows: 12,
  soundAfterOnsetSpanWindows: 100,
  maximumHeadingProbeSeconds: 14,
  maximumQuoteProbeSeconds: 60,
  maximumFirstSpeechSeconds: 2,
  minimumAnchorWords: 4,
  /** Hearings of one number closer together than this are one place. */
  onePlaceSeconds: 3,
  /** Estimates may only hold a row; this is how far outside a passage they may point. */
  holdOnlyToleranceSeconds: 10,
  maximumRangeMembers: 6,
});

export class Hold extends Error {
  constructor(reason, detail) {
    super(reason);
    this.reason = reason;
    this.detail = detail ?? null;
  }
}

const hold = (reason, detail) => {
  throw new Hold(reason, detail);
};

// ---------------------------------------------------------------- text ----

const SPELLED = new Map(
  "일 이 삼 사 오 육 칠 팔 구 십 십일 십이 십삼 십사 십오 십육 십칠 십팔 십구 이십"
    .split(" ")
    .map((word, index) => [word, index + 1]),
);
const NUMBER = "(\\d{1,2}|이십|십[일이삼사오육칠팔구]?|[일이삼사오육칠팔구])";
// "5번째" is an ordinal word ("the fifth"), not a question number.
const HEAD = new RegExp("^" + NUMBER + "\\s*번(?!째)");
const BARE = /^(\d{1,2})\s*[.,](?=\s|$)/;
const PAIR = /^\s*(?:과|와|,|그리고|하고)\s*/;
const RANGE = /^\s*(?:부터|에서)\s*/;
const LEAD = /^[\s"'“”‘’.,·\-–—(\[]+/;

const numberOf = (text) =>
  /^\d+$/.test(text) ? Number(text) : (SPELLED.get(text) ?? NaN);

/**
 * The spoken number(s) at the very start of a recognized utterance.
 * `form`: "beon" (digits + 번), "spelled", "pair" (19번과 20번), "range"
 * (18번부터 20번) or "bare" (digits and a period only). `covers` lists every
 * original number the heading names. Nothing later in the text is searched.
 */
export function headingCue(text) {
  let rest = String(text ?? "").replace(LEAD, "");
  const first = rest.match(HEAD);
  if (!first) {
    const bare = rest.match(BARE);
    if (!bare) return null;
    const number = Number(bare[1]);
    return number >= 1
      ? {
          numbers: [number],
          covers: [number],
          form: "bare",
          rest: rest.slice(bare[0].length),
        }
      : null;
  }
  const a = numberOf(first[1]);
  rest = rest.slice(first[0].length);
  let form = /^\d/.test(first[1]) ? "beon" : "spelled";
  let numbers = [a];
  let covers = [a];
  for (const [pattern, joined] of [
    [PAIR, "pair"],
    [RANGE, "range"],
  ]) {
    const joiner = rest.match(pattern);
    if (!joiner) continue;
    const second = rest.slice(joiner[0].length).match(HEAD);
    if (!second) continue;
    const b = numberOf(second[1]);
    if (!(b > a) || b - a >= RULES.maximumRangeMembers) return null;
    numbers = [a, b];
    covers =
      joined === "pair"
        ? [a, b]
        : Array.from({ length: b - a + 1 }, (_, i) => a + i);
    form = joined;
    rest = rest.slice(joiner[0].length + second[0].length);
    break;
  }
  if (numbers.some((n) => !Number.isInteger(n) || n < 1 || n > 99)) return null;
  return { numbers, covers, form, rest: rest.replace(LEAD, "") };
}

/** Verbs that end the announcer's instruction for a question. */
const INSTRUCTION_VERB =
  /(고르(?:세요|시오|십시오)|답하(?:세요|시오|십시오)|쓰(?:세요|시오)|완성하(?:세요|시오)|찾(?:으세요|으시오)|표시하(?:세요|시오)|문제입니다)/;
const VERIFIER_INSTRUCTION = /듣고|고르시오|고르세요|답하시오|선택하시오/;
const CLOSING = /수고하셨습니다|마치겠습니다/;

export const instructionVerb = (text) =>
  String(text ?? "").match(INSTRUCTION_VERB)?.[1] ?? null;
export const isClosing = (text) => CLOSING.test(String(text ?? ""));

/** The recognizer's own flag, recomputed from its raw metrics; never cleared. */
export const uncertain = (segment) =>
  Boolean(
    segment.uncertain ||
    segment.avgLogProbability < -1 ||
    segment.compressionRatio > 2.4 ||
    (segment.noSpeechProbability > 0.6 && segment.avgLogProbability < -0.6),
  );

const spoken = (probe) =>
  (probe.segments ?? []).filter((s) => String(s.text ?? "").trim());

/** A probe proves nothing when its recognized times leave its real duration. */
export function probeUsable(probe, maximumSeconds) {
  if (probe.overflow) return "probe_overflow";
  if (!(probe.durationSeconds > 0) || probe.durationSeconds > maximumSeconds)
    return "probe_longer_than_route_allows";
  for (const segment of probe.segments ?? []) {
    if (
      segment.localStartSeconds < 0 ||
      segment.localEndSeconds > probe.durationSeconds + 1e-9
    )
      return "probe_overflow";
    // A segment without duration is a recognizer artefact; the independent
    // verifier refuses the whole probe for it, and so does this producer.
    if (!(segment.localStartSeconds < segment.localEndSeconds))
      return "probe_segment_without_duration";
    for (const word of segment.words ?? [])
      if (
        word.localStartSeconds < 0 ||
        word.localEndSeconds > probe.durationSeconds + 1e-9
      )
        return "probe_overflow";
  }
  return null;
}

/**
 * What a Korean recognition that begins at a proposed start wrote first.
 * Returns { cue, reliable, firstSpeechSeconds, firstSegmentId, text,
 * instruction, closing, unusable }.
 */
export function headingReading(probe) {
  const unusable = probeUsable(probe, RULES.maximumHeadingProbeSeconds);
  const segments = spoken(probe);
  const first = segments[0];
  if (unusable || !first)
    return {
      cue: null,
      reliable: false,
      unusable: unusable ?? "nothing_recognized",
    };
  const reliable = !uncertain(first);
  const cue = headingCue(first.text);
  // Korean text of the reliable segments that follow, up to the first flagged one.
  const run = [];
  for (const segment of segments) {
    if (uncertain(segment)) break;
    run.push(segment);
  }
  let instruction = null;
  if (cue && reliable) {
    const texts = run.map((s) => s.text.trim());
    texts[0] = cue.rest;
    for (let i = 0; i < run.length; i++) {
      const verb = instructionVerb(texts[i]);
      if (verb) {
        const text = texts.slice(0, i + 1).join(" ").trim();
        // The independent verifier's own instruction pattern must hold too.
        if (VERIFIER_INSTRUCTION.test(text))
          instruction = {
            segmentIds: run.slice(0, i + 1).map((s) => s.id),
            text,
            rawText: run
              .slice(0, i + 1)
              .map((s) => s.text)
              .join(" "),
            verb,
          };
        break;
      }
      // English ends the announcer's sentence: the dialogue began.
      if (/[A-Za-z]{3,}/.test(texts[i]) && !/[가-힣]/.test(texts[i])) break;
    }
  }
  return {
    cue,
    reliable,
    firstSpeechSeconds:
      first.words?.[0]?.localStartSeconds ?? first.localStartSeconds,
    firstSegmentId: first.id,
    firstSegmentStartSeconds: first.localStartSeconds,
    firstSegmentEndSeconds: first.localEndSeconds,
    text: first.text.trim(),
    rawText: first.text,
    instruction,
    closing: reliable && !cue && run.some((s) => isClosing(s.text)),
    unusable: null,
  };
}

/** A heading's instruction: its own reading's, or a same-start bare sibling's. */
export const instructed = (heading) =>
  heading.reading.instruction ?? heading.instructionSibling?.reading.instruction ?? null;

/** True when the reading is this literal heading, first and reliably. */
export function readsHeading(reading, numbers) {
  return Boolean(
    reading.cue &&
    reading.reliable &&
    reading.cue.form !== "bare" &&
    reading.firstSpeechSeconds <= RULES.maximumFirstSpeechSeconds &&
    reading.cue.numbers.length === numbers.length &&
    reading.cue.numbers.every((n, i) => n === numbers[i]),
  );
}

// ------------------------------------------------------------- physics ----

export const ABSOLUTE = "absolute_energy_v2";
/** The verifier's named stationary-noise tiers: 100 or 50 windows of baseline. */
export const NOISE_TIERS = Object.freeze({
  noise_floor_contrast_v1: 100,
  noise_floor_contrast_1second_v1: 50,
});

const FULL_SCALE_SQUARE = 32768 * 32768;

/**
 * Stationary hiss can be louder than the absolute threshold. The baseline is
 * the windows immediately before the onset: all positive, nearest-rank p90-p10
 * at most 6 dB, every one below median + 10 dB; the onset and at least three of
 * its first five windows are at or above that level. Same definition and field
 * names as the independent verifier's `noise_floor.py`.
 */
export function noiseFloor(native, onsetWindow, baselineWindows) {
  const { energy, windowFrames: frames } = native;
  if (onsetWindow < baselineWindows || onsetWindow + 5 > energy.length)
    hold("noise_baseline_or_confirmation_overflow");
  const baseline = energy.subarray(onsetWindow - baselineWindows, onsetWindow);
  const levels = new Float64Array(baselineWindows);
  for (let i = 0; i < baselineWindows; i++) {
    if (!(baseline[i] > 0)) hold("noise_baseline_zero_or_invalid_energy");
    levels[i] = 10 * Math.log10(baseline[i] / frames / FULL_SCALE_SQUARE);
  }
  levels.sort();
  const rank = (p) => levels[Math.ceil(p * baselineWindows) - 1];
  const [median, p10, p90] = [rank(0.5), rank(0.1), rank(0.9)];
  const threshold = median + 10;
  if (p90 - p10 > 6) hold("noise_baseline_not_stationary");
  const limit = frames * FULL_SCALE_SQUARE * 10 ** (threshold / 10);
  for (let i = 0; i < baselineWindows; i++)
    if (baseline[i] >= limit) hold("noise_baseline_contains_prior_signal");
  if (energy[onsetWindow] < limit) hold("noise_onset_has_no_measured_contrast");
  let confirmed = 0;
  for (let w = onsetWindow; w < onsetWindow + 5; w++)
    if (energy[w] >= limit) confirmed++;
  if (confirmed < 3) hold("noise_onset_is_isolated_transient");
  return {
    limit,
    evidence: {
      baselineStartFrame: (onsetWindow - baselineWindows) * frames,
      baselineFrameCount: baselineWindows * frames,
      baselineEnergySha256: createHash("sha256")
        .update(
          Buffer.from(baseline.buffer, baseline.byteOffset, baseline.byteLength),
        )
        .digest("hex"),
      medianDbfs: median,
      p10Dbfs: p10,
      p90Dbfs: p90,
      thresholdDbfs: threshold,
      contrastDb: 10,
      percentileMethod: "nearest_rank",
    },
  };
}

/**
 * A start is the measured lead before a measured onset. `native`:
 * { energy, windowFrames, sampleRate }. Quiet is measured against -50 dBFS, or
 * against the measured noise floor of a named noise tier. Returns the
 * measurements or throws.
 */
export function measuredStart(native, startFrame, onsetFrame, method = ABSOLUTE) {
  const { energy, windowFrames: frames } = native;
  if (
    !Number.isSafeInteger(startFrame) ||
    !Number.isSafeInteger(onsetFrame) ||
    startFrame % frames ||
    onsetFrame % frames
  )
    hold("start_not_on_measurement_grid");
  const onset = onsetFrame / frames;
  const start = startFrame / frames;
  if (onset <= 0 || onset >= energy.length || start < 0)
    hold("start_outside_original");
  let threshold = energyAtDbfs(RULES.quietThresholdDbfs, frames);
  let noiseFloorEvidence = null;
  if (method !== ABSOLUTE) {
    if (!(method in NOISE_TIERS)) hold("unsupported_native_onset_method");
    const noise = noiseFloor(native, onset, NOISE_TIERS[method]);
    threshold = noise.limit;
    noiseFloorEvidence = noise.evidence;
  }
  if (energy[onset] < threshold) hold("onset_is_not_sound");
  const quiet = quietBefore(energy, threshold, onset);
  if (quiet < RULES.minimumQuietBeforeWindows)
    hold("no_measured_quiet_before_onset");
  const lead = Math.min(RULES.leadWindows, quiet);
  if (onset - start !== lead) hold("start_is_not_the_measured_lead");
  let sound = 0;
  const end = Math.min(energy.length, onset + RULES.soundAfterOnsetSpanWindows);
  for (let w = onset; w < end; w++) if (energy[w] >= threshold) sound++;
  if (sound < RULES.minimumSoundAfterOnsetWindows)
    hold("too_little_sound_after_onset");
  let peak = 0;
  for (let w = start; w < onset; w++) if (energy[w] > peak) peak = energy[w];
  return {
    onsetMethod: method,
    startFrame,
    onsetFrame,
    quietBeforeFrames: quiet * frames,
    leadFrames: lead * frames,
    leadPeakDbfs: dbfsOfEnergy(peak, frames),
    soundWindowsInFirstTwoSeconds: sound,
    ...(noiseFloorEvidence ? { noiseFloorEvidence } : {}),
  };
}

export const startMsOf = (startFrame, sampleRate) =>
  Math.floor((startFrame * 1000) / sampleRate);

// ------------------------------------------------------------ headings ----

/**
 * Every heading of one source that the stored Korean recognitions establish.
 *
 * `listenings`: [{ ref, startFrame, onsetFrame, probe }] — Korean probes that
 * begin at a proposed start. Returns { headings, closings, held } where
 * `headings` is ordered by onset: { numbers, covers, form, kind, startFrame,
 * onsetFrame, place, ref, reading, siblings }, kind "single" | "shared_head" |
 * "member". `held` maps an original number to the reason no heading stands.
 */
export function establishHeadings(native, listenings, options = {}) {
  const rate = native.sampleRate;
  const byStart = new Map();
  for (const listening of listenings) {
    const reading = headingReading(listening.probe);
    const entry = { ...listening, reading };
    if (!byStart.has(listening.startFrame))
      byStart.set(listening.startFrame, []);
    byStart.get(listening.startFrame).push(entry);
  }
  // Every number any recognition wrote first, in any form and however
  // unreliably: never a heading by itself, but a reason to doubt a passage.
  const written = [];
  for (const [startFrame, entries] of byStart)
    for (const entry of entries)
      if (entry.reading.cue)
        written.push({
          startFrame,
          numbers: entry.reading.cue.numbers,
          covers: entry.reading.cue.covers,
          form: entry.reading.cue.form,
          reliable: entry.reading.reliable,
          // Bare digits are a possible heading only before an instruction:
          // "4. 대화를 듣고 …" may be question 4, "4. You don't look well" is
          // an answer option read aloud inside another question.
          possibleHeading:
            entry.reading.cue.form !== "bare" ||
            Boolean(
              instructionVerb(
                spoken(entry.probe)
                  .map((s) => s.text)
                  .join(" "),
              ),
            ),
          text: entry.reading.text,
          ref: entry.ref,
        });
  const places = [];
  const closings = [];
  const held = new Map();
  for (const [startFrame, entries] of byStart) {
    const numbered = entries.filter(
      (e) => e.reading.cue && e.reading.cue.form !== "bare",
    );
    const good = entries.filter(
      (e) => e.reading.cue && readsHeading(e.reading, e.reading.cue.numbers),
    );
    if (!good.length) {
      const closing = entries.find((e) => e.reading.closing);
      if (closing)
        try {
          closings.push({
            startFrame,
            onsetFrame: closing.onsetFrame,
            place: measuredStart(
              native,
              startFrame,
              closing.onsetFrame,
              closing.probe.onsetMethod,
            ),
            ref: closing.ref,
            probe: closing.probe,
            reading: closing.reading,
          });
        } catch (error) {
          if (!(error instanceof Hold)) throw error;
        }
      continue;
    }
    // A recognizer's own time for the number may lag the sound by a second.
    // Among the readings from this start, one whose number sits at the measured
    // onset is preferred; then the one with an instruction after the number.
    // Every other reading stays listed as a sibling, and a different number in
    // any of them holds the start.
    const atOnset = (e) => {
      const lead = (e.onsetFrame - startFrame) / rate;
      return (
        e.reading.firstSegmentStartSeconds - 0.5 <= lead &&
        e.reading.firstSegmentEndSeconds >= lead
      );
    };
    const chosen = [...good].sort(
      (a, b) =>
        atOnset(b) - atOnset(a) ||
        Boolean(b.reading.instruction) - Boolean(a.reading.instruction) ||
        a.reading.firstSpeechSeconds - b.reading.firstSpeechSeconds,
    )[0];
    const key = chosen.reading.cue.numbers.join(",");
    const siblings = entries
      .filter((e) => e !== chosen)
      .map((e) => ({
        ref: e.ref,
        text: e.reading.text ?? null,
        numbers: e.reading.cue?.numbers ?? null,
        form: e.reading.cue?.form ?? null,
        flaggedUncertain: !e.reading.reliable,
      }));
    const contradiction = numbered.some(
      (e) => e.reading.cue.numbers.join(",") !== key,
    );
    let place = null;
    let reason = contradiction ? "contradictory_number_at_same_start" : null;
    if (!reason)
      try {
        place = measuredStart(
          native,
          startFrame,
          chosen.onsetFrame,
          chosen.probe.onsetMethod,
        );
        // The number is what sounds at the measured onset: its segment begins
        // no later than half a second after it and does not end before it.
        const lead = place.leadFrames / rate;
        if (
          chosen.reading.firstSegmentStartSeconds - 0.5 > lead ||
          chosen.reading.firstSegmentEndSeconds < lead
        )
          hold("number_not_at_the_measured_onset");
      } catch (error) {
        if (!(error instanceof Hold)) throw error;
        reason = "heading_start_not_measured:" + error.reason;
      }
    places.push({
      numbers: chosen.reading.cue.numbers,
      covers: chosen.reading.cue.covers,
      form: chosen.reading.cue.form,
      startFrame,
      onsetFrame: chosen.onsetFrame,
      place,
      ref: chosen.ref,
      probe: chosen.probe,
      reading: chosen.reading,
      siblings,
      // Official recordings: a long recognition often writes the number as
      // bare digits before the instruction, while a short clip from the same
      // start writes the literal number alone. Together they are one heading;
      // the bare reading only lends its instruction, never a number.
      instructionSibling:
        options.instructionFromBareSibling && !chosen.reading.instruction
          ? (entries.find(
              (e) =>
                e !== chosen &&
                e.reading.reliable &&
                e.reading.cue?.form === "bare" &&
                e.reading.cue.numbers.join(",") === key &&
                e.reading.instruction,
            ) ?? null)
          : null,
      reason,
    });
  }
  places.sort((a, b) => a.onsetFrame - b.onsetFrame);
  closings.sort((a, b) => a.onsetFrame - b.onsetFrame);

  // One place per literal heading: a click and then the number are one place;
  // two distant places hold the number.
  const groups = new Map();
  for (const place of places) {
    const key = place.numbers.join(",");
    if (!groups.has(key)) groups.set(key, []);
    const list = groups.get(key);
    const last = list.at(-1);
    if (
      last &&
      (place.onsetFrame - last.at(-1).onsetFrame) / rate <= RULES.onePlaceSeconds
    )
      last.push(place);
    else list.push([place]);
  }
  const headings = [];
  for (const [key, list] of groups) {
    const numbers = key.split(",").map(Number);
    if (list.length > 1) {
      for (const n of numbers) held.set(n, "number_heard_at_two_distant_places");
      continue;
    }
    const usable = list[0].filter((p) => !p.reason);
    if (!usable.length) {
      for (const n of numbers) held.set(n, list[0][0].reason);
      continue;
    }
    // Within one place: a reading that also carries the instruction, then the
    // onset where the number begins right at the start, then the later onset.
    const [best, ...others] = [...usable].sort(
      (a, b) =>
        Boolean(instructed(b)) - Boolean(instructed(a)) ||
        a.reading.firstSpeechSeconds - b.reading.firstSpeechSeconds ||
        b.onsetFrame - a.onsetFrame,
    );
    // The other measured onsets of the same place stay known: a certified
    // start of this number may sit at one of them.
    best.alternates = others;
    headings.push(best);
  }
  headings.sort((a, b) => a.onsetFrame - b.onsetFrame);

  // Kinds. A pair or range with an instruction is a shared head; a single
  // number with an instruction is a question; a single number without one is a
  // member only inside the nearest earlier shared head that names it.
  let head = null;
  const out = [];
  for (const heading of headings) {
    if (heading.numbers.length > 1) {
      if (!instructed(heading)) {
        for (const n of heading.covers)
          if (!held.has(n)) held.set(n, "instruction_context_not_heard");
        head = null;
        continue;
      }
      heading.kind = "shared_head";
      head = heading;
      out.push(heading);
      continue;
    }
    const [n] = heading.numbers;
    if (head && head.covers.includes(n)) {
      heading.kind = "member";
      heading.sharedHead = head;
      out.push(heading);
      continue;
    }
    if (!instructed(heading)) {
      held.set(n, "instruction_context_not_heard");
      continue;
    }
    heading.kind = "single";
    head = null;
    out.push(heading);
  }
  return { headings: out, closings, held, written };
}

/**
 * Passage starts by original number from native headings alone.
 * Returns Map number -> { number, kind, cueSpokenNumbers, cueForm, heading }.
 * The first number of a shared head starts at the head; later members start at
 * their own cue; a member cue of the first number starts nothing.
 */
export function passageStarts(headings) {
  const starts = new Map();
  const put = (number, value) => {
    if (starts.has(number)) starts.set(number, { conflict: true });
    else starts.set(number, value);
  };
  for (const heading of headings) {
    if (heading.kind === "single")
      put(heading.numbers[0], {
        number: heading.numbers[0],
        kind: "single",
        cueSpokenNumbers: heading.numbers,
        cueForm: heading.form,
        heading,
      });
    else if (heading.kind === "shared_head")
      put(heading.covers[0], {
        number: heading.covers[0],
        kind: "shared_instruction_head",
        cueSpokenNumbers: heading.numbers,
        cueForm: heading.form,
        heading,
      });
    else if (heading.numbers[0] !== heading.sharedHead.covers[0])
      put(heading.numbers[0], {
        number: heading.numbers[0],
        kind: "shared_instruction_member",
        cueSpokenNumbers: heading.numbers,
        cueForm: heading.form,
        heading,
      });
  }
  for (const [number, value] of starts) if (value.conflict) starts.delete(number);
  return starts;
}

// -------------------------------------------------------------- quotes ----

export const quoteWords = (text) => englishWords(text);

/**
 * Where an English probe wrote a quote word for word. Only runs of reliable
 * segments are read; a flagged segment is a barrier. Returns
 * [{ segmentIds, wordRange:[from,to] }] (word positions in the probe's
 * reliable word list) — empty when it was not written.
 */
export function hearQuote(probe, words) {
  if (probeUsable(probe, RULES.maximumQuoteProbeSeconds) || !words.length)
    return [];
  const found = [];
  let run = [];
  let offset = 0;
  const flush = () => {
    const flat = run.flatMap((s) =>
      englishWords(s.text).map((word) => ({ word, id: s.id })),
    );
    for (let i = 0; i + words.length <= flat.length; i++)
      if (words.every((word, k) => flat[i + k].word === word))
        found.push({
          segmentIds: [
            ...new Set(flat.slice(i, i + words.length).map((w) => w.id)),
          ],
          wordRange: [offset + i, offset + i + words.length],
        });
    offset += flat.length;
    run = [];
  };
  for (const segment of spoken(probe)) {
    if (uncertain(segment)) flush();
    else run.push(segment);
  }
  flush();
  return found;
}

/** A probe lies inside a passage when its whole clip does. */
export const clipInside = (clip, fromFrame, toFrame) =>
  clip.startFrame >= fromFrame && clip.startFrame + clip.frameCount <= toFrame;

/**
 * The one passage and the one English clip that account for every frozen quote
 * of a question, or why there is none.
 *
 * `quotes`: every literal frozen string of the question, short ones included.
 * `passages`: [{ key, fromFrame, toFrame }] (established on both sides).
 * `listenings`: English probes of the source, [{ ref, startFrame, frameCount,
 * probe }].
 *
 * A quote of four words or more is an anchor: the anchors must be heard in
 * exactly one passage and in no clip that lies wholly elsewhere. Every quote,
 * anchors and short ones alike, must then be written word for word by ONE clip
 * that lies wholly inside that passage. One convenient quote is not enough.
 * `required`: frozen generation segments ({ id, text }) that no quote touches;
 * the same clip must write each of them whole, exactly once.
 */
export function bindQuotes(quotes, passages, listenings, required = []) {
  if (required.some((segment) => !/[A-Za-z]/.test(segment.text)))
    hold("generation_segment_without_quote_has_no_english_words");
  const rows = quotes.map((text, index) => {
    const words = quoteWords(text);
    return {
      index,
      text,
      words: words.length,
      anchor: words.length >= RULES.minimumAnchorWords,
      heard: [],
      heardOutside: [],
      _words: words,
    };
  });
  const clean = () => rows.map(({ _words, ...row }) => row);
  if (!rows.length || rows.some((row) => !row.words))
    hold("frozen_quote_has_no_english_words");
  if (!rows.some((row) => row.anchor)) hold("no_anchor_quote_of_four_words");
  const keys = new Set();
  for (const row of rows)
    for (const listening of listenings) {
      const hits = hearQuote(listening.probe, row._words);
      if (!hits.length) continue;
      const passage = passages.find((p) =>
        clipInside(listening, p.fromFrame, p.toFrame),
      );
      for (const hit of hits) {
        const entry = {
          ref: listening.ref,
          startFrame: listening.startFrame,
          frameCount: listening.frameCount,
          ...hit,
        };
        if (!passage) row.heardOutside.push(entry);
        else {
          row.heard.push({ ...entry, passageKey: passage.key });
          if (row.anchor) keys.add(passage.key);
        }
      }
    }
  if (!keys.size)
    hold("anchor_quote_not_heard_in_any_established_passage", {
      quotes: clean(),
    });
  if (keys.size > 1) hold("quote_heard_in_two_passages", { quotes: clean() });
  const [key] = keys;
  // A clip that straddles a heading proves nothing either way; one that lies
  // wholly elsewhere and still wrote an anchor is a second place.
  const chosen = passages.find((p) => p.key === key);
  const elsewhere = (clip) =>
    clip.startFrame + clip.frameCount <= chosen.fromFrame ||
    clip.startFrame >= chosen.toFrame;
  if (rows.some((row) => row.anchor && row.heardOutside.some(elsewhere)))
    hold("quote_heard_in_two_passages", { quotes: clean() });
  // One clip inside the passage that wrote them all; the earliest, then the longest.
  const clips = new Map();
  for (const row of rows)
    for (const hit of row.heard) {
      if (hit.passageKey !== key) continue;
      const id = hit.ref.path + "#" + hit.ref.probeId;
      if (!clips.has(id))
        clips.set(id, { ref: hit.ref, startFrame: hit.startFrame, frameCount: hit.frameCount, hits: new Map() });
      const clip = clips.get(id);
      if (!clip.hits.has(row.index)) clip.hits.set(row.index, hit);
    }
  const complete = [...clips.values()]
    .filter((clip) => clip.hits.size === rows.length)
    .sort((a, b) => a.startFrame - b.startFrame || b.frameCount - a.frameCount);
  if (!complete.length)
    hold("not_every_frozen_quote_heard_in_one_passage_clip", {
      quotes: clean(),
    });
  // A generation segment that no quote touches must itself be written, whole
  // and once, by the same clip.
  const withSegments = [];
  for (const clip of complete) {
    const listening = listenings.find(
      (l) => l.ref.path === clip.ref.path && l.ref.probeId === clip.ref.probeId,
    );
    const anchorSegments = [];
    for (const segment of required) {
      const hits = hearQuote(listening.probe, quoteWords(segment.text));
      if (hits.length !== 1) break;
      anchorSegments.push({
        sourceSegmentId: segment.id,
        text: segment.text,
        probeSegmentIds: hits[0].segmentIds,
      });
    }
    if (anchorSegments.length === required.length)
      withSegments.push({ clip, anchorSegments });
  }
  if (!withSegments.length)
    hold("generation_segment_without_quote_not_heard_in_passage_clip", {
      quotes: clean(),
    });
  const [{ clip, anchorSegments }] = withSegments;
  return {
    passageKey: key,
    clip: { ref: clip.ref, startFrame: clip.startFrame, frameCount: clip.frameCount },
    quotes: clean().map((row) => ({
      ...row,
      probeSegmentIds: clip.hits.get(row.index).segmentIds,
      wordRange: clip.hits.get(row.index).wordRange,
    })),
    anchorSegments,
    anchorsTotal: rows.filter((row) => row.anchor).length,
  };
}

/**
 * Where a frozen quote stands, character for character, in the frozen
 * whole-record recognition segments the generation named for the question.
 * `segments`: every frozen segment in array order ({ id, text }); `ids`: the
 * question's frozen anchor ids. Returns { sourceSegmentIds, startCharacter,
 * endCharacter } for the shortest contiguous run of anchors whose texts, joined
 * by one space, hold the quote; null when no run does.
 */
export function locateFrozenQuote(quote, ids, segments) {
  const position = new Map(segments.map((s, i) => [s.id, i]));
  for (let length = 1; length <= ids.length; length++)
    for (let from = 0; from + length <= ids.length; from++) {
      const run = ids.slice(from, from + length);
      if (run.some((id) => !position.has(id))) continue;
      if (run.some((id, i) => i && position.get(id) !== position.get(run[i - 1]) + 1))
        continue;
      const text = run.map((id) => segments[position.get(id)].text).join(" ");
      const at = text.indexOf(quote);
      if (at < 0) continue;
      return {
        sourceSegmentIds: run,
        startCharacter: at,
        endCharacter: at + quote.length,
      };
    }
  return null;
}

/** How often a word sequence stands in a longer one. */
export function countOccurrences(needle, haystack) {
  let count = 0;
  for (let i = 0; i + needle.length <= haystack.length; i++)
    if (needle.every((word, k) => haystack[i + k] === word)) count++;
  return count;
}

/**
 * Hold-only use of estimates: a literal occurrence a frozen transcript places
 * far outside the passage, or frozen anchor segments that do not reach it.
 * `occurrences`: [{ source, midSeconds }]; `frozenSpanSeconds`: [from, to] | null.
 */
export function estimateContradiction(passageSeconds, occurrences, frozenSpanSeconds) {
  const [from, to] = passageSeconds;
  const slack = RULES.holdOnlyToleranceSeconds;
  if (occurrences.some((o) => o.midSeconds < from - slack || o.midSeconds > to + slack))
    return "quote_also_placed_elsewhere_by_frozen_transcript";
  if (
    frozenSpanSeconds &&
    (frozenSpanSeconds[1] < from - slack || frozenSpanSeconds[0] > to + slack)
  )
    return "frozen_anchor_segments_outside_passage";
  return null;
}
