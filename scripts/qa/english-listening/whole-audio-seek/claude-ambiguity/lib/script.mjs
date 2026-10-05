/**
 * The official script's own numbered sections.
 *
 * A section is the unchanged text between one printed question number and the
 * next. It is found only when the script prints every question number of the
 * source exactly once, in order, in one literal style ("N번" or "N."). A joint
 * heading such as 【19-20】 stands for both numbers of a true shared passage.
 * Anything less is refused: no number is guessed and no text is changed.
 */
import { englishWords, occurrences } from "./words.mjs";

export class ScriptError extends Error {
  constructor(reason) {
    super(reason);
    this.reason = reason;
  }
}

const fail = (reason) => {
  throw new ScriptError(reason);
};

const STYLES = [
  /(?:^|\s)(\d{1,2})번(?=\s)/g,
  /(?:^|\s)(\d{1,2})[ \t]*\.(?=\s)/g,
];
const JOINT = /[\[【]\s*(\d{1,2})\s*[-~～]\s*(\d{1,2})\s*[\]】]/g;
const SPEAKER = /(?:^|\s)(?:M|W|B|G|Man|Woman|Boy|Girl)\s*:\s*/g;
const DIRECTION = /\[[^\]]{1,100}\]/g;
const SHARED_PASSAGE = /물음에\s*답하/;

const squeeze = (text) => text.replace(/\s+/g, "").toLowerCase();

/**
 * One heading per question number, in print order.
 * `questions`: [{ sourceNumber, instruction }] (frozen official fields).
 * Returns [{ numbers, start, headingStart, end }] sorted by position.
 */
export function scriptHeadings(text, questions) {
  const expected = questions.map((q) => q.sourceNumber).sort((a, b) => a - b);
  if (!expected.length || new Set(expected).size !== expected.length)
    fail("official_transcript_numbering_not_unique");
  const joints = [...text.matchAll(JOINT)];
  for (const style of STYLES) {
    const markers = [...text.matchAll(style)].map((match) => ({
      numbers: [Number(match[1])],
      start: match.index,
      headingStart: match.index + match[0].length - match[0].trimStart().length,
      end: match.index + match[0].length,
    }));
    const groups = new Map(
      expected.map((n) => [n, markers.filter((m) => m.numbers[0] === n)]),
    );
    if ([...groups.values()].some((group) => group.length > 1)) continue;
    const missing = new Set(expected.filter((n) => !groups.get(n).length));
    const joint = [];
    for (const match of joints) {
      const numbers = [Number(match[1]), Number(match[2])];
      const peers = questions.filter((q) => numbers.includes(q.sourceNumber));
      const instructions = peers.map((q) => q.instruction).filter(Boolean);
      if (
        numbers[1] === numbers[0] + 1 &&
        numbers.every((n) => missing.has(n)) &&
        peers.length === 2 &&
        instructions.length &&
        instructions.every((i) => i === instructions[0]) &&
        SHARED_PASSAGE.test(instructions[0]) &&
        squeeze(
          text.slice(
            match.index + match[0].length,
            match.index + match[0].length + 200,
          ),
        ).includes(squeeze(instructions[0]))
      ) {
        if (
          joints.filter(
            (other) =>
              Number(other[1]) === numbers[0] &&
              Number(other[2]) === numbers[1],
          ).length !== 1
        )
          fail("official_transcript_numbering_not_unique");
        const heading = {
          numbers,
          start: match.index,
          headingStart: match.index,
          end: match.index + match[0].length,
        };
        joint.push(heading);
        for (const n of numbers) {
          groups.set(n, [heading]);
          missing.delete(n);
        }
      }
    }
    if (missing.size) continue;
    const positions = expected.map((n) => groups.get(n)[0].start);
    if (positions.some((at, i) => i && at < positions[i - 1])) continue;
    return [...markers, ...joint].sort((a, b) => a.start - b.start);
  }
  return fail("official_transcript_numbering_not_unique");
}

/** The turns actually spoken in `body`, with exact character positions. */
export function sectionTurns(body, offset) {
  const speakers = [...body.matchAll(SPEAKER)];
  const turns = [];
  speakers.forEach((speaker, index) => {
    const from = speaker.index + speaker[0].length;
    const to =
      index + 1 < speakers.length ? speakers[index + 1].index : body.length;
    const raw = body.slice(from, to);
    // A printed answer blank or a stage direction is source structure, not speech.
    if (/^[\s_＿]*$/.test(raw.replace(DIRECTION, ""))) return;
    const lead = raw.match(/^\s*(?:\[[^\]]{1,100}\]\s*)*/)[0].length;
    let end = to;
    while (end > from + lead && /\s/.test(body[end - 1])) end--;
    turns.push({
      text: body.slice(from + lead, end),
      startCharacter: offset + from + lead,
      endCharacter: offset + end,
    });
  });
  return { turns, firstSpeakerAt: speakers.length ? speakers[0].index : -1 };
}

/**
 * The section of one question number: its literal bounds, the sentence printed
 * between the number and the first speaker, and its spoken turns.
 */
export function scriptSection(text, questions, number) {
  const headings = scriptHeadings(text, questions);
  const own = headings.filter((h) => h.numbers.includes(number));
  if (own.length !== 1) fail("official_section_not_current_original_number");
  const heading = own[0];
  const following = headings.find((h) => h.start > heading.start);
  const start = heading.end;
  const end = following ? following.headingStart : text.length;
  const body = text.slice(start, end);
  const { turns, firstSpeakerAt } = sectionTurns(body, start);
  let instruction = null;
  if (firstSpeakerAt > 0) {
    const raw = body
      .slice(0, firstSpeakerAt)
      .replace(/(?:\s*\[[^\]]{1,100}\]\s*)+$/, "");
    const lead = raw.length - raw.trimStart().length;
    const value = raw.trim();
    if (value)
      instruction = {
        text: value,
        startCharacter: start + lead,
        endCharacter: start + lead + value.length,
      };
  }
  return {
    numbers: heading.numbers,
    headingStartCharacter: heading.headingStart,
    sectionStartCharacter: start,
    sectionEndCharacter: end,
    instruction,
    turns,
  };
}

/** English words of the whole script as spoken: speaker labels are formatting. */
export const spokenCorpus = (text) => englishWords(text.replace(SPEAKER, " "));

/** The shortest literal prefix of `turn.text` that holds its first `count` words. */
function literalPrefix(turn, count) {
  const words = englishWords(turn.text);
  if (count > words.length) return null;
  for (let end = 1; end <= turn.text.length; end++) {
    const got = englishWords(turn.text.slice(0, end));
    if (
      got.length === count &&
      got.every((word, i) => word === words[i]) &&
      (end === turn.text.length || !/[A-Za-z0-9']/.test(turn.text[end]))
    )
      return {
        text: turn.text.slice(0, end),
        startCharacter: turn.startCharacter,
        endCharacter: turn.startCharacter + end,
      };
  }
  return null;
}

/**
 * Every exact opening of a section that the script holds in one place only,
 * longest first. An opening never skips a word:
 *   first_utterance_prefix      4-8 words of a first utterance of 4+ words
 *   exact_original_opening_v1   a first utterance under 4 words, whole, plus
 *                               the exact start of the next turn(s)
 *   exact_original_opening_v2   a whole first utterance of 4+ words that the
 *                               script prints more than once, plus the exact
 *                               start of the next turn
 */
export function sectionOpenings(text, section) {
  const { turns } = section;
  if (!turns.length) return [];
  const corpus = spokenCorpus(text);
  const labelled = englishWords(text);
  const first = englishWords(turns[0].text);
  const found = [];
  const unique = (words) =>
    occurrences(corpus, words) === 1 && occurrences(labelled, words) <= 1;
  if (first.length >= 4) {
    for (let count = Math.min(8, first.length); count >= 4; count--) {
      const quote = literalPrefix(turns[0], count);
      const words = first.slice(0, count);
      if (
        quote &&
        occurrences(corpus, words) === 1 &&
        occurrences(labelled, words) === 1
      )
        found.push({
          method: "first_utterance_prefix",
          quotes: [quote],
          words,
        });
    }
  }
  const repeated = first.length >= 4 && occurrences(corpus, first) > 1;
  if (first.length < 4 || repeated) {
    const method = repeated
      ? "exact_original_opening_v2"
      : "exact_original_opening_v1";
    for (let last = 1; last < Math.min(3, turns.length); last++) {
      const whole = turns.slice(0, last).map((turn) => ({
        text: turn.text,
        startCharacter: turn.startCharacter,
        endCharacter: turn.endCharacter,
      }));
      const before = turns
        .slice(0, last)
        .flatMap((turn) => englishWords(turn.text));
      const next = englishWords(turns[last].text);
      for (let count = Math.min(8, next.length); count >= 1; count--) {
        const quote = literalPrefix(turns[last], count);
        const words = [...before, ...next.slice(0, count)];
        if (quote && words.length >= 4 && unique(words))
          found.push({ method, quotes: [...whole, quote], words });
      }
    }
  }
  return found;
}
