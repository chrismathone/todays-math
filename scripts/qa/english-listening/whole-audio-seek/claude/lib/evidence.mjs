/**
 * Reads one stored probe and decides what it proves for one question.
 *
 * Arithmetic, bounds and order are decided here in code. Nothing recognized is
 * rewritten: the stored text is quoted, compared and left as it is.
 */
import { POLICY } from "./policy.mjs";
import { coverage, englishWords, leadingCue } from "./text.mjs";

export class EvidenceError extends Error {}

const fail = (message) => {
  throw new EvidenceError(message);
};

const finite = (value) => typeof value === "number" && Number.isFinite(value);

/**
 * Structural check of a stored probe against its native recording. Throws on a
 * malformed record; a probe that merely proves nothing is not an error.
 */
export function assertProbeShape(probe, pcm) {
  const { startFrame, frameCount, sampleRate } = probe;
  if (
    !Number.isSafeInteger(startFrame) ||
    !Number.isSafeInteger(frameCount) ||
    startFrame < 0 ||
    frameCount <= 0
  )
    fail("Probe frames are not whole non-negative numbers: " + probe.id);
  if (sampleRate !== pcm.sampleRate || probe.channels !== pcm.channels)
    fail("Probe is off the native clock: " + probe.id);
  if (startFrame + frameCount > pcm.frameCount)
    fail("Probe runs past the original audio: " + probe.id);
  if (
    !finite(probe.durationSeconds) ||
    Math.abs(probe.durationSeconds * sampleRate - frameCount) > 1e-6
  )
    fail("Probe duration differs from its frame count: " + probe.id);
  if (
    !/^[0-9a-f]{64}$/.test(probe.clipPcmSha256 ?? "") ||
    !/^[0-9a-f]{64}$/.test(probe.inputMonoFloat32Sha256 ?? "")
  )
    fail("Probe input hashes are missing: " + probe.id);
  if (!Array.isArray(probe.segments)) fail("Probe has no segment list");
  let previousId = 0;
  for (const segment of probe.segments) {
    if (!Number.isInteger(segment.id) || segment.id <= previousId)
      fail("Probe segment ids are not increasing: " + probe.id);
    previousId = segment.id;
    if (
      typeof segment.text !== "string" ||
      !finite(segment.localStartSeconds) ||
      !finite(segment.localEndSeconds) ||
      segment.localStartSeconds < 0 ||
      segment.localEndSeconds < segment.localStartSeconds ||
      typeof segment.uncertain !== "boolean"
    )
      fail("Malformed raw segment bounds in probe " + probe.id);
  }
  const latest = probe.segments.reduce(
    (max, segment) => Math.max(max, segment.localEndSeconds),
    0,
  );
  // The stored flag must agree with the stored times; times are never clamped.
  if (latest > probe.durationSeconds + 0.02 !== probe.overflow)
    fail("Probe overflow flag disagrees with its segments: " + probe.id);
}

/**
 * What a probe heard first. `certainText` is the text of the leading run of
 * segments that the recognizer did not mark uncertain.
 */
export function readProbe(probe) {
  const segments = probe.segments;
  const text = segments.map((segment) => segment.text).join(" ");
  const first = segments[0] ?? null;
  const certain = [];
  for (const segment of segments) {
    if (segment.uncertain) break;
    certain.push(segment);
  }
  const certainText = certain.map((segment) => segment.text).join(" ");
  return {
    text,
    cue: leadingCue(text),
    certainCue: leadingCue(certainText),
    certainSegmentIds: certain.map((segment) => segment.id),
    firstUncertain: first ? first.uncertain : null,
    firstSpeechSeconds: first ? first.localStartSeconds : null,
    overflow: probe.overflow,
  };
}

/** Official words compared for a first utterance, and the share that must be heard. */
export const FIRST_DIALOGUE_WORDS = 14;
export const MINIMUM_FIRST_DIALOGUE_SHARE = 0.6;

/**
 * Share of the official first utterance's word trigrams that a probe heard in
 * its certain segments. Used where a question's number is followed directly by
 * its own dialogue, so there is no Korean sentence to compare.
 */
export function firstDialogueShare(officialWords, probe) {
  const official = officialWords.slice(0, FIRST_DIALOGUE_WORDS);
  if (official.length < 5) return 0;
  const heard = englishWords(
    probe.segments
      .filter((segment) => !segment.uncertain)
      .map((segment) => segment.text)
      .join(" "),
  );
  const have = new Set();
  for (let i = 0; i + 3 <= heard.length; i++)
    have.add(heard.slice(i, i + 3).join(" "));
  let found = 0;
  const total = official.length - 2;
  for (let i = 0; i < total; i++)
    if (have.has(official.slice(i, i + 3).join(" "))) found++;
  return found / total;
}

/** Words of an exact official quote, and the fewest that make one. */
export const QUOTE_WORDS = 8;
export const MINIMUM_QUOTE_WORDS = 4;
const WORD = /[A-Za-z0-9]+(?:[’'][A-Za-z]+)*/g;

/**
 * The longest exact opening of the official dialogue (4 to 8 words) that a
 * probe heard word for word, in order, in its certain segments. The opening
 * starts at the first actual utterance; when that utterance is shorter than
 * four words ("Hello?") it continues into the next one. Every utterance before
 * the last is quoted whole and the last as an exact prefix.
 *
 * `utterances` are { start, end, text } from the official script. Returns
 * { quotes: [{ text, startCharacter, endCharacter }], words, segmentIds } or
 * null. A stage direction ends the opening: nothing printed in brackets is
 * spoken text.
 */
export function heardOpening(utterances, probe) {
  if (!utterances?.length) return null;
  const tokens = [];
  // A first utterance of four words or more is quoted alone; the next one is
  // taken in only while the opening is still shorter than a quote.
  for (
    let u = 0;
    u < utterances.length && tokens.length < MINIMUM_QUOTE_WORDS;
    u++
  ) {
    const text = utterances[u].text;
    const direction = text.indexOf("[");
    for (const match of text.matchAll(WORD)) {
      if (direction >= 0 && match.index > direction) break;
      for (const word of englishWords(match[0]))
        tokens.push({ word, utterance: u, end: match.index + match[0].length });
      if (tokens.length >= QUOTE_WORDS) break;
    }
    if (direction >= 0) break;
  }
  const heard = [];
  for (const segment of probe.segments) {
    if (segment.uncertain) continue;
    for (const word of englishWords(segment.text))
      heard.push({ word, id: segment.id });
  }
  for (
    let count = Math.min(QUOTE_WORDS, tokens.length);
    count >= MINIMUM_QUOTE_WORDS;
    count--
  )
    for (let at = 0; at + count <= heard.length; at++) {
      let same = true;
      for (let i = 0; i < count && same; i++)
        same = heard[at + i].word === tokens[i].word;
      if (!same) continue;
      const last = tokens[count - 1];
      const quotes = [];
      for (let u = 0; u <= last.utterance; u++) {
        const { start, end, text } = utterances[u];
        quotes.push(
          u < last.utterance
            ? { text, startCharacter: start, endCharacter: end }
            : {
                text: text.slice(0, last.end),
                startCharacter: start,
                endCharacter: start + last.end,
              },
        );
      }
      return {
        quotes,
        words: count,
        segmentIds: [
          ...new Set(heard.slice(at, at + count).map((item) => item.id)),
        ],
      };
    }
  return null;
}

/** The same for one utterance alone: { quote, startCharacter, words, segmentIds }. */
export function heardFirstUtterance(utterance, probe) {
  const found = utterance ? heardOpening([utterance], probe) : null;
  return found
    ? {
        quote: found.quotes[0].text,
        startCharacter: found.quotes[0].startCharacter,
        words: found.words,
        segmentIds: found.segmentIds,
      }
    : null;
}

const sameNumbers = (a, b) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

/**
 * Does this probe, which begins exactly at its own start frame, prove that the
 * question's own spoken number is the first thing heard there?
 * Returns { ok, reasons, instructionCoverage, cueForm }.
 */
export function judgeProbe(plan, reading, sharedInstruction = null) {
  const reasons = [];
  if (reading.overflow) reasons.push("probe_overflow");
  if (!reading.cue) {
    reasons.push("no_leading_number");
    return { ok: false, reasons, instructionCoverage: null, cueForm: null };
  }
  if (!sameNumbers(reading.cue.numbers, plan.spokenNumbers))
    reasons.push("spoken_number_differs");
  if (reading.firstUncertain) reasons.push("cue_segment_uncertain");
  else if (
    !reading.certainCue ||
    !sameNumbers(reading.certainCue.numbers, reading.cue.numbers)
  )
    reasons.push("cue_spans_uncertain_segment");
  if (
    reading.firstSpeechSeconds === null ||
    reading.firstSpeechSeconds > POLICY.maximumFirstSpeechSeconds
  )
    reasons.push("first_speech_late");
  let instructionCoverage = null;
  const heard = reading.certainCue ? reading.certainCue.rest : "";
  if (plan.officialInstruction) {
    instructionCoverage = coverage(plan.officialInstruction, heard);
    if (instructionCoverage < POLICY.minimumInstructionCoverage)
      reasons.push("official_instruction_not_heard");
  } else if (reading.cue.form === "bare")
    // Digits with only a period prove a number only beside its own sentence.
    reasons.push("bare_number_without_official_instruction");
  if (plan.kind === "shared_instruction_member" && sharedInstruction) {
    const foreign = coverage(sharedInstruction, reading.cue.rest);
    if (foreign > POLICY.maximumForeignInstructionCoverage)
      reasons.push("member_followed_by_shared_instruction");
  }
  return {
    ok: reasons.length === 0,
    reasons,
    instructionCoverage,
    cueForm: reading.cue.form,
  };
}
