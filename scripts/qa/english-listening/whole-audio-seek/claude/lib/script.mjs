/**
 * Official script sections.
 *
 * Splits the stored official transcript at its own printed question numbers and
 * returns the English words spoken in each question. The transcript text is
 * read, never changed. When the printed numbering cannot be followed without a
 * tie, no sections are returned and dialogue anchors are simply unavailable for
 * that source.
 */
import { coverage, englishWords } from "./text.mjs";

const MARKER = /(?:^|\s)(\d{1,2}) ?(번|\.)(?=\s)/g;
const SPEAKER = /(?:^|\s)(?:M|W|B|G|Man|Woman|Boy|Girl)\s*:/g;
const DIRECTION = /\[[^\]]{0,48}\]/g;
const PAGE_FURNITURE = /ⓒ[^\n]*?-\s*\d+\s*-/g;
const BLOCK_HEAD = /[【\[]\s*(\d{1,2})\s*[-~～∼]\s*(\d{1,2})\s*[】\]]/g;
const CLOSING = /시그널\s*IN|ANN\s*:/g;
const FIRST_SPEECH = /(?:^|\s)(?:\[|[A-Z][A-Za-z]*\s*:)/;
const ANY_SPEAKER = /(?:^|\s)[A-Z][A-Za-z]*\s*:/g;
const LEADING_DIRECTIONS = /^\s*(?:\[[^\]]{0,48}\]\s*)*/;

/** All printed positions of a number followed by "번" or ".". */
function markerPositions(text) {
  const found = new Map();
  for (const match of text.matchAll(MARKER)) {
    const number = Number(match[1]);
    const at = match.index + match[0].indexOf(match[1]);
    const end = match.index + match[0].length;
    if (!found.has(number)) found.set(number, []);
    found.get(number).push({ at, end });
  }
  return found;
}

/**
 * Picks one increasing marker per question. Each candidate is scored by how much
 * of the question's own official sentence follows it. Returns null on a tie or
 * when a number is not printed.
 */
function chooseMarkers(text, plans, prompts) {
  const positions = markerPositions(text);
  const options = plans.map((plan, index) => {
    const official = prompts[index];
    return (positions.get(plan.sourceNumber) ?? []).map((marker) => ({
      ...marker,
      score: official
        ? coverage(
            official,
            text.slice(marker.end, marker.end + official.length + 24),
          )
        : 0.5,
    }));
  });
  if (options.some((list) => !list.length)) return null;
  // best[i][j]: best total for questions 0..i ending at candidate j, with a tie flag.
  let previous = options[0].map((option) => ({
    total: option.score,
    tie: false,
    from: -1,
  }));
  const back = [previous];
  for (let i = 1; i < options.length; i++) {
    const current = options[i].map((option) => {
      let best = null;
      options[i - 1].forEach((prior, j) => {
        if (prior.end > option.at) return;
        const total = previous[j].total + option.score;
        if (!best || total > best.total)
          best = { total, tie: previous[j].tie, from: j };
        else if (total === best.total) best.tie = true;
      });
      return best ?? { total: -Infinity, tie: false, from: -1 };
    });
    back.push(current);
    previous = current;
  }
  let end = -1;
  let tie = false;
  previous.forEach((cell, j) => {
    if (end < 0 || cell.total > previous[end].total) {
      end = j;
      tie = false;
    } else if (cell.total === previous[end].total) tie = true;
  });
  if (end < 0 || !Number.isFinite(previous[end].total)) return null;
  if (tie || previous[end].tie) return null;
  const chosen = new Array(options.length);
  for (let i = options.length - 1, j = end; i >= 0; i--) {
    chosen[i] = options[i][j];
    j = back[i][j].from;
  }
  return chosen;
}

/**
 * For a transcript that prints its numbers out of question order: every question
 * must have exactly one number that is followed by its own official sentence.
 * Returns null when any question lacks such a unique place.
 */
function chooseByOwnSentence(text, plans, prompts) {
  const positions = markerPositions(text);
  const chosen = [];
  for (let index = 0; index < plans.length; index++) {
    const official = prompts[index];
    if (!official) return null;
    const matching = (positions.get(plans[index].sourceNumber) ?? []).filter(
      (marker) =>
        coverage(
          official,
          text.slice(marker.end, marker.end + official.length + 24),
        ) >= 0.9,
    );
    if (matching.length !== 1) return null;
    chosen.push(matching[0]);
  }
  return chosen;
}

const spokenEnglish = (text) =>
  englishWords(
    text
      .replace(PAGE_FURNITURE, " ")
      .replace(DIRECTION, " ")
      .replace(SPEAKER, " "),
  );

/** Exact transcript substring of [from, to) without surrounding white space. */
function exactSpan(transcript, from, to) {
  const raw = transcript.slice(from, to);
  const lead = raw.length - raw.trimStart().length;
  const text = raw.trim();
  if (!text || text.includes("ⓒ")) return null;
  return { start: from + lead, end: from + lead + text.length, text };
}

/**
 * The first utterance actually spoken in [from, to): the exact transcript text
 * after the first speaker label that carries English words. An answer blank
 * printed before the dialogue has no words and is skipped.
 */
function firstSpokenUtterance(transcript, from, to) {
  const labels = [];
  ANY_SPEAKER.lastIndex = from;
  for (let match; (match = ANY_SPEAKER.exec(transcript)) && match.index < to;)
    labels.push({ at: match.index, end: match.index + match[0].length });
  for (let i = 0; i < labels.length; i++) {
    const stop = Math.min(labels[i + 1]?.at ?? to, to);
    let raw = transcript.slice(labels[i].end, stop);
    const furniture = raw.indexOf("ⓒ");
    if (furniture >= 0) raw = raw.slice(0, furniture);
    const lead = raw.match(LEADING_DIRECTIONS)[0].length;
    const start = labels[i].end + lead;
    const text = raw.slice(lead).trimEnd();
    const words = englishWords(text.replace(DIRECTION, " "));
    if (words.length) return { start, end: start + text.length, text, words };
  }
  return null;
}

/** First index at or after `from` where `pattern` matches, or `fallback`. */
function nextMatch(text, pattern, from, fallback) {
  pattern.lastIndex = from;
  const match = pattern.exec(text);
  return match ? match.index : fallback;
}

/**
 * Returns { sections, reason }. `sections` maps a source number to
 * { words, charStart, charEnd, sharedWith } or is null with a reason.
 * `prompts[i]` is the official sentence printed after question i's own number
 * (its prompt), or null when nothing but the dialogue follows the number.
 */
export function scriptSections(transcript, plans, prompts) {
  if (!/[A-Za-z]{3}/.test(transcript))
    return { sections: null, reason: "official_script_has_no_text" };
  const markers =
    chooseMarkers(transcript, plans, prompts) ??
    chooseByOwnSentence(transcript, plans, prompts);
  if (!markers)
    return { sections: null, reason: "official_script_numbering_not_unique" };
  const printed = [...markers].sort((a, b) => a.at - b.at);
  const heads = [...transcript.matchAll(BLOCK_HEAD)].map((match) => ({
    at: match.index,
    end: match.index + match[0].length,
    first: Number(match[1]),
    last: Number(match[2]),
  }));
  const sections = new Map();
  plans.forEach((plan, index) => {
    const marker = markers[index];
    if (plan.kind === "shared_passage") {
      const head = heads.find(
        (h) =>
          h.first === plan.scopeQuestionNumbers[0] &&
          h.last === plan.scopeQuestionNumbers.at(-1),
      );
      const firstMarker =
        markers[
          plans.findIndex(
            (p) => p.sourceNumber === plan.scopeQuestionNumbers[0],
          )
        ];
      if (!head || head.end > firstMarker.at) return;
      const speechAt = transcript
        .slice(head.end, firstMarker.at)
        .search(FIRST_SPEECH);
      sections.set(plan.sourceNumber, {
        words: spokenEnglish(transcript.slice(head.end, firstMarker.at)),
        charStart: head.end,
        charEnd: firstMarker.at,
        sharedWith: plan.scopeQuestionNumbers,
        headText: "",
        instruction:
          speechAt > 0
            ? exactSpan(transcript, head.end, head.end + speechAt)
            : null,
        firstUtterance: firstSpokenUtterance(
          transcript,
          head.end,
          firstMarker.at,
        ),
      });
      return;
    }
    // The next number as PRINTED: a transcript may print a page out of order.
    const nextMarker = printed[printed.indexOf(marker) + 1];
    let end = nextMarker ? nextMarker.at : transcript.length;
    const head = heads.find((h) => h.at >= marker.end && h.at < end);
    if (head) end = head.at;
    if (!nextMarker) end = nextMatch(transcript, CLOSING, marker.end, end);
    const body = transcript.slice(marker.end, end);
    const dialogueAt = body.search(FIRST_SPEECH);
    // A shared instruction is printed once, between the block head and the
    // first member's own number.
    const blockHead =
      plan.kind === "shared_instruction_head"
        ? heads.find(
            (h) =>
              h.first === plan.spokenNumbers[0] &&
              h.last === plan.spokenNumbers[1] &&
              h.end <= marker.at,
          )
        : null;
    sections.set(plan.sourceNumber, {
      instruction: blockHead
        ? exactSpan(transcript, blockHead.end, marker.at)
        : dialogueAt > 0
          ? exactSpan(transcript, marker.end, marker.end + dialogueAt)
          : null,
      firstUtterance: firstSpokenUtterance(transcript, marker.end, end),
      words: spokenEnglish(body),
      charStart: marker.end,
      charEnd: end,
      sharedWith: null,
      // The sentence printed between the number and the first speaker label.
      headText:
        dialogueAt > 0
          ? body.slice(0, dialogueAt).replace(PAGE_FURNITURE, " ").trim()
          : "",
    });
  });
  for (const plan of plans) {
    const section = sections.get(plan.sourceNumber);
    if (!section || section.words.length < 4)
      return { sections: null, reason: "official_script_section_empty" };
  }
  return { sections, reason: null };
}

const grams = (words, size) => {
  const out = [];
  for (let i = 0; i + size <= words.length; i++)
    out.push(words.slice(i, i + size).join(" "));
  return out;
};

/**
 * Assigns recognized English segments to the one question whose official words
 * contain them. A segment is owned only when a single question explains it.
 * Returns Map(sourceNumber -> [{ segmentId, share, firstWordIndex }]) in id order.
 */
export function alignDialogue(segments, sections, plans) {
  const blocks = [];
  for (const plan of plans) {
    const section = sections.get(plan.sourceNumber);
    if (section.sharedWith && section.sharedWith[0] !== plan.sourceNumber)
      continue;
    const trigrams = new Map();
    grams(section.words, 3).forEach((gram, index) => {
      if (!trigrams.has(gram)) trigrams.set(gram, index);
    });
    blocks.push({
      numbers: section.sharedWith ?? [plan.sourceNumber],
      trigrams,
    });
  }
  const owned = new Map(plans.map((plan) => [plan.sourceNumber, []]));
  for (const segment of segments) {
    const words = englishWords(segment.text);
    const wanted = grams(words, 3);
    if (wanted.length < 2) continue;
    let best = null;
    let second = 0;
    for (const block of blocks) {
      let hits = 0;
      let first = Infinity;
      for (const gram of wanted) {
        const at = block.trigrams.get(gram);
        if (at === undefined) continue;
        hits++;
        if (at < first) first = at;
      }
      const share = hits / wanted.length;
      if (!best || share > best.share) {
        second = best ? best.share : 0;
        best = { block, share, first };
      } else if (share > second) second = share;
    }
    if (!best || best.share < 0.6 || second > best.share / 2) continue;
    for (const number of best.block.numbers)
      owned.get(number).push({
        segmentId: segment.id,
        share: best.share,
        firstWordIndex: best.first,
      });
  }
  return owned;
}
