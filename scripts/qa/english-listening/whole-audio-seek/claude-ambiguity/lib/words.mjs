/**
 * Word and character comparison used by the identity replay.
 *
 * Nothing here rewrites a source or a recognition: these helpers only read
 * text. The English word rule is the independent verifier's
 * `dotted_initialism_v1`; the builder also compares it with the producer's own
 * rule and refuses a quote on which the two disagree.
 */

/** Lower-case English words; "H.J." and "p.m." are one word each. */
export function englishWords(text) {
  const normalized = String(text)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/\b(?:[a-z]\.)+[a-z](?:\.)?(?![a-z])/g, (run) =>
      run.replace(/\./g, ""),
    );
  return normalized.match(/[a-z0-9]+(?:'[a-z]+)?/g) ?? [];
}

/** Hangul syllables, Latin letters and digits only. */
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

/** Share of ALL the official sentence's character bigrams that were heard. */
export function strictCoverage(official, heard) {
  const have = bigrams(compact(heard));
  let total = 0;
  let found = 0;
  for (const [gram, count] of bigrams(compact(official))) {
    total += count;
    found += Math.min(count, have.get(gram) ?? 0);
  }
  return total ? found / total : 0;
}

/**
 * The official sentence split into what a Korean recognizer can write
 * literally (Hangul runs) and what it cannot (Latin words and numerals the
 * announcer reads aloud). Returned in print order.
 */
export function sentenceRuns(official) {
  const value = String(official).normalize("NFKC");
  const hangul = [];
  const notCompared = [];
  for (const match of value.matchAll(/[가-힣]+|[A-Za-z0-9][A-Za-z0-9'’.\-]*/g))
    (/[가-힣]/.test(match[0]) ? hangul : notCompared).push(match[0]);
  return { hangul, notCompared };
}

/**
 * Share of the official sentence's Hangul bigrams (inside each printed run,
 * with multiplicity) that were heard, and how many Hangul syllables that is.
 */
export function hangulCoverage(official, heard) {
  const have = bigrams(compact(heard));
  const value = String(official)
    .normalize("NFKC")
    .replace(/[^0-9A-Za-z가-힣]/g, "");
  let total = 0;
  let found = 0;
  let syllables = 0;
  for (const run of value.split(/[^가-힣]+/)) {
    syllables += run.length;
    for (const [gram, count] of bigrams(run)) {
      const hit = Math.min(count, have.get(gram) ?? 0);
      total += count;
      found += hit;
      have.set(gram, (have.get(gram) ?? 0) - hit);
    }
  }
  return { share: total ? found / total : 0, syllables };
}

/** How often `needle` occurs as a contiguous run inside `haystack`. */
export function occurrences(haystack, needle) {
  if (!needle.length) return 0;
  let count = 0;
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    let same = true;
    for (let k = 0; k < needle.length; k++)
      if (haystack[i + k] !== needle[k]) {
        same = false;
        break;
      }
    if (same) count++;
  }
  return count;
}

/** White space removed and quotes folded; used for literal sentence identity. */
export const squeeze = (text) =>
  String(text)
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, "")
    .toLowerCase();
