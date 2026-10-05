/**
 * Text comparison for spoken numbers and official instructions.
 *
 * Recognized text is never rewritten. These helpers only read it: they parse a
 * spoken ordinal at the very beginning of an utterance and score how much of an
 * official sentence the recognized text carries.
 */

/** Sino-Korean ordinals as a recognizer may spell them before "번". */
const SPELLED = new Map([
  ["일", 1],
  ["이", 2],
  ["삼", 3],
  ["사", 4],
  ["오", 5],
  ["육", 6],
  ["칠", 7],
  ["팔", 8],
  ["구", 9],
  ["십", 10],
  ["십일", 11],
  ["십이", 12],
  ["십삼", 13],
  ["십사", 14],
  ["십오", 15],
  ["십육", 16],
  ["십칠", 17],
  ["십팔", 18],
  ["십구", 19],
  ["이십", 20],
]);

const DIGITS = /^(\d{1,2})\s*번/;
/** A recognizer sometimes writes the spoken "2번" as "2." before the sentence. */
const BARE = /^(\d{1,2})\s*[.,](?=\s|$)/;
const SPELLED_HEAD =
  /^(이십|십[일이삼사오육칠팔구]?|[일이삼사오육칠팔구])\s*번/;
const JOINER = /^\s*(?:과|와|,|그리고|하고|부터)\s*/;
const LEAD = /^[\s"'“”‘’.,·\-–—(\[]+/;

/**
 * Spoken ordinal(s) at the start of a recognized utterance.
 * Returns { numbers, form, rest } or null. `numbers` has one entry for "5번"
 * and two for the joined form "19번과 20번". `form` is "beon" for digits with
 * "번", "spelled" for a spelled ordinal with "번", and "bare" for digits with
 * only a period or comma. Nothing later in the text is searched, so a number
 * mentioned inside a sentence is never a cue.
 */
export function leadingCue(text) {
  let rest = String(text).replace(LEAD, "");
  const numbers = [];
  let form = "beon";
  for (let i = 0; i < 2; i++) {
    const digits = rest.match(DIGITS);
    const word = digits ? null : rest.match(SPELLED_HEAD);
    const bare = digits || word || i > 0 ? null : rest.match(BARE);
    const head = digits ?? word ?? bare;
    if (!head) break;
    if (word) {
      numbers.push(SPELLED.get(word[1]));
      form = "spelled";
    } else numbers.push(Number(head[1]));
    if (bare) form = "bare";
    rest = rest.slice(head[0].length);
    if (i === 1 || bare) break;
    const joined = rest.match(JOINER);
    if (!joined) break;
    const after = rest.slice(joined[0].length);
    if (!DIGITS.test(after) && !SPELLED_HEAD.test(after)) break;
    rest = after;
  }
  if (!numbers.length) return null;
  if (numbers.some((n) => !Number.isInteger(n) || n < 1 || n > 99)) return null;
  return { numbers, form, rest: rest.replace(LEAD, "") };
}

const ENGLISH_NUMBERS = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
];

/**
 * A number a recognizer may have written for a spoken ordinal in ANY form,
 * including its own English rendering ("Number four."). This only says where to
 * listen next; it is never evidence of a cue.
 */
export function hintNumbers(text) {
  const cue = leadingCue(text);
  if (cue) return cue.numbers;
  const value = String(text).replace(LEAD, "").toLowerCase();
  const numbers = [];
  const pattern = /(?:number|no\.?)\s*(\d{1,2}|[a-z]+)/g;
  let match;
  while ((match = pattern.exec(value)) && match.index < 24) {
    const word = match[1];
    const number = /^\d+$/.test(word)
      ? Number(word)
      : ENGLISH_NUMBERS.indexOf(word) + 1;
    if (number >= 1) numbers.push(number);
  }
  if (numbers.length) return numbers.slice(0, 2);
  const pair = value.match(/^(\d{1,2})\s*(?:and|,|&)\s*(\d{1,2})\b/);
  if (pair) return [Number(pair[1]), Number(pair[2])];
  const bare = value.match(/^(\d{1,2})[.,]?\s/);
  return bare ? [Number(bare[1])] : [];
}

/** Hangul syllables, Latin letters and digits only; everything else is not compared. */
export const compact = (text) =>
  String(text)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^0-9a-z가-힣]/g, "");

const bigrams = (value) => {
  const grams = new Map();
  for (let i = 0; i + 1 < value.length; i++) {
    const gram = value.slice(i, i + 2);
    grams.set(gram, (grams.get(gram) ?? 0) + 1);
  }
  return grams;
};

/**
 * Share of the official sentence's Hangul character bigrams found in the
 * recognized text, counted with multiplicity. 1 means every one was heard.
 *
 * Only Hangul runs of the official sentence are counted: an English name or a
 * numeral printed there is read aloud and may be written either way by a
 * recognizer, so it neither helps nor hurts.
 */
export function coverage(official, recognized) {
  const have = bigrams(compact(recognized));
  const runs = String(official)
    .normalize("NFKC")
    .replace(/[^0-9A-Za-z가-힣]/g, "")
    .split(/[^가-힣]+/);
  let total = 0;
  let found = 0;
  for (const run of runs)
    for (const [gram, count] of bigrams(run)) {
      const heard = Math.min(count, have.get(gram) ?? 0);
      total += count;
      found += heard;
      have.set(gram, (have.get(gram) ?? 0) - heard);
    }
  return total ? found / total : 0;
}

/** Lowercase English words with apostrophes folded; used for dialogue alignment. */
export const englishWords = (text) =>
  String(text)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^a-z0-9' ]+/g, " ")
    .split(/\s+/)
    .map((word) => word.replace(/^'+|'+$/g, ""))
    .filter(Boolean);

/**
 * The Korean instruction sentence of an official prompt: everything up to its
 * first sentence end. A printed answer blank, table or speaker line after it is
 * not part of what the announcer reads.
 */
export function koreanSentence(text) {
  const value = String(text ?? "").trim();
  const sentence = value.match(/^.*?[가-힣]\s*[.?]/);
  if (sentence) return sentence[0].trim();
  const blank = value.search(/\s+(?:[A-Z][A-Za-z.' ]*:|_{3,})/);
  return (blank >= 0 ? value.slice(0, blank) : value).trim();
}

export const hasHangul = (text) => /[가-힣]/.test(String(text ?? ""));
