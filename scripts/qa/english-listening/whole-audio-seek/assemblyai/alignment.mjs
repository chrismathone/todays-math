/**
 * Whole-original listening seek starts — diagnostic alignment of one completed
 * AssemblyAI transcript with the frozen evidence of its source.
 *
 * For every question the independent certificate still holds, this asks one
 * thing: in which explicitly bounded original passage of the unchanged whole
 * recording was its own evidence heard, and under which spoken number was that
 * passage announced. A reconstructed question is placed by its unchanged
 * generation quotes, an official question by its own script section. The
 * displayed number of a reconstructed question decides nothing.
 *
 * The result is a proposal to look at, never a start. It carries no audioRange,
 * writes no database, Storage or media, and a question that already has a start
 * is only echoed. Provider word times are estimates: an announcement is
 * reported as the silence-bounded window its number was written in, which a
 * native onset measurement still has to narrow. Provider confidence can hold a
 * row; it never admits one.
 *
 * See ALIGNMENT.md for the rules and their limits.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

/** Fixed before any pilot transcript word was read (2026-10-05T14:05Z). */
export const POLICY = Object.freeze({
  minOrdinalConfidence: 0.8,
  minInstructionConfidence: 0.6,
  minQuoteWordConfidence: 0.6,
  minAnchorQuoteWords: 4,
  maxOrdinalToInstructionGapMs: 5000,
  maxInstructionWords: 40,
  existingStartToleranceMs: 2500,
  durationToleranceMs: 1500,
  // Added with the English-only quote transcript, before that pass was run.
  crossTranscriptToleranceMs: 500,
});

export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");

/**
 * binding: the transcript is not this recording's. timing: the provider did not
 * time a number, so what follows it directly is not measured. confidence: only
 * the provider's own doubt. Everything else is what the words themselves show.
 */
export const reasonCategory = (code) =>
  /^(binding_failed|source_)/.test(code)
    ? "binding"
    : /_low_confidence$/.test(code)
      ? "confidence"
      : /(_provider_gap|_timing_unmeasured)$/.test(code)
        ? "timing"
        : "structure";

const holdClass = (reasons) => {
  const categories = new Set(reasons.map(reasonCategory));
  if (categories.has("binding")) return "binding";
  if (categories.has("structure")) return "structure";
  return categories.has("timing") ? "provider_timing" : "confidence_only";
};

const unique = (list) => [...new Set(list)];

// ---------------------------------------------------------------- text ----

/** A word without the punctuation around it. Nothing inside it is changed. */
const core = (text) =>
  text.normalize("NFKC").replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");

const hangul = (text) => text.normalize("NFKC").replace(/[^가-힣]/g, "");

/**
 * Comparison tokens: lower case, apostrophes dropped, every other mark a break.
 * No word is respelled, expanded or reordered.
 */
export const matchTokens = (text) =>
  text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/['’‘`´]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

const HANGUL = /[가-힣]/;
const LATIN_WORD = /[A-Za-z]{2,}/;
/** The verb a spoken question instruction ends on. A greeting ("안녕하세요") is not one. */
const IMPERATIVE =
  /(?:고르|쓰|답하|완성하|찾으|표시하|채우|연결하|나열하|배열하|선택하|적으)(?:시오|시요|세요|십시오)$/;
const CLOSING = /수고하셨습니다|마치겠습니다/;
const PLAIN = new Set(["", "입니다"]);
const FIRST_LINK = new Set(["과", "와", "부터", "에서", "하고"]);
const SECOND_TAIL = new Set([
  "",
  "은",
  "는",
  "까지",
  "까지는",
  "까지의",
  "입니다",
]);

const quoteOf = (words, from, to) =>
  words
    .slice(from, to + 1)
    .map((word) => word.text)
    .join(" ");

const minConfidence = (words, from, to) => {
  let low = 1;
  for (let i = from; i <= to; i++) low = Math.min(low, words[i].confidence);
  return low;
};

// ---------------------------------------------------------- transcript ----

/** The provider's words as they are, with what makes them unusable. */
export function transcriptWords(raw) {
  if (!Array.isArray(raw?.words) || !raw.words.length)
    return { words: [], problems: ["transcript_has_no_words"] };
  const problems = [];
  let previous = 0;
  const words = raw.words.map((word, index) => {
    const row = {
      index,
      text: word?.text,
      startMs: word?.start,
      endMs: word?.end,
      confidence: word?.confidence,
    };
    if (typeof row.text !== "string" || !row.text.trim())
      problems.push("transcript_word_without_text");
    if (
      !Number.isInteger(row.startMs) ||
      !Number.isInteger(row.endMs) ||
      row.startMs < 0 ||
      row.endMs < row.startMs
    )
      problems.push("transcript_word_time_invalid");
    else if (row.startMs < previous)
      problems.push("transcript_words_not_in_time_order");
    else previous = row.startMs;
    if (
      typeof row.confidence !== "number" ||
      !(row.confidence >= 0 && row.confidence <= 1)
    )
      problems.push("transcript_word_confidence_invalid");
    return row;
  });
  return { words, problems: unique(problems) };
}

const tokenStream = (words) =>
  words.flatMap((word) =>
    matchTokens(word.text).map((token) => ({ token, word: word.index })),
  );

/** Every place the token sequence stands word for word, as inclusive word indexes. */
function locate(stream, tokens) {
  const found = [];
  if (!tokens.length) return found;
  for (let s = 0; s + tokens.length <= stream.length; s++) {
    let k = 0;
    while (k < tokens.length && stream[s + k].token === tokens[k]) k++;
    if (k === tokens.length)
      found.push({
        fromWord: stream[s].word,
        toWord: stream[s + k - 1].word,
      });
  }
  return found;
}

/** Longest run of consecutive quote tokens that stands somewhere. A hint for a reader, never evidence. */
function longestExactRun(stream, tokens) {
  let best = null;
  let previous = new Array(tokens.length + 1).fill(0);
  for (let s = 0; s < stream.length; s++) {
    const current = new Array(tokens.length + 1).fill(0);
    for (let t = 0; t < tokens.length; t++) {
      if (stream[s].token !== tokens[t]) continue;
      current[t + 1] = previous[t] + 1;
      if (!best || current[t + 1] > best.tokens)
        best = { tokens: current[t + 1], endStream: s };
    }
    previous = current;
  }
  if (!best) return null;
  return {
    tokens: best.tokens,
    ofTokens: tokens.length,
    fromWord: stream[best.endStream - best.tokens + 1].word,
    toWord: stream[best.endStream].word,
  };
}

// -------------------------------------------------------- announcements ----

/** "N번…" written at word i, as one word or as digits and "번…" in two. */
function ordinalAt(words, i) {
  if (i >= words.length) return null;
  const text = core(words[i].text);
  const joined = /^(\d{1,2})번(.*)$/u.exec(text);
  if (joined) {
    const number = Number(joined[1]);
    return number >= 1 && number <= 50
      ? { number, suffix: joined[2], lastWord: i }
      : null;
  }
  if (!/^\d{1,2}$/.test(text) || i + 1 >= words.length) return null;
  const split = /^번(.*)$/u.exec(core(words[i + 1].text));
  const number = Number(text);
  if (!split || number < 1 || number > 50) return null;
  const suffix = split[1];
  return PLAIN.has(suffix) || FIRST_LINK.has(suffix) || SECOND_TAIL.has(suffix)
    ? { number, suffix, lastWord: i + 1 }
    : null;
}

/**
 * The spoken instruction that follows a number: the very next words, Korean,
 * ending on an instruction verb before any other number. At most two words
 * without Hangul (a name read aloud) may stand inside it. `providerGapMs` is
 * the provider's time between the number and it; the provider leaves some
 * numbers seconds before their speech, and such a gap is reported, not trusted.
 */
function instructionAfter(words, lastWord, stopWord, policy) {
  const first = lastWord + 1;
  if (first >= words.length || first >= stopWord) return null;
  let foreign = 0;
  const limit = Math.min(stopWord, first + policy.maxInstructionWords);
  for (let k = first; k < limit; k++) {
    const text = core(words[k].text);
    if (!HANGUL.test(text)) {
      if (++foreign > 2) return null;
      continue;
    }
    if (IMPERATIVE.test(hangul(text)))
      return {
        firstWord: first,
        lastWord: k,
        quote: quoteOf(words, first, k),
        imperativeConfidence: words[k].confidence,
        providerGapMs: words[first].startMs - words[lastWord].endMs,
      };
  }
  return null;
}

const numberRange = (first, last) =>
  Array.from({ length: last - first + 1 }, (_, i) => first + i);

/**
 * Every written question number, in transcript order.
 *   single  "N번" / "N번입니다"                — a number announced on its own
 *   multi   "N번과 M번은", "N번부터 M번까지"   — one heading for several numbers
 *   bare    "N." directly before an instruction — digits without "번"
 *   mention any other form ("N번째", "N번은")  — recorded, bounds nothing
 * "한 번씩만", "두 번" carry no digits and are not numbers at all.
 */
export function findObservations(words, policy = POLICY) {
  const found = [];
  const taken = new Set();
  for (let i = 0; i < words.length; i++) {
    const first = ordinalAt(words, i);
    if (!first) continue;
    let entry = {
      kind: PLAIN.has(first.suffix) ? "single" : "mention",
      numbers: [first.number],
      firstWord: i,
      lastWord: first.lastWord,
    };
    if (FIRST_LINK.has(first.suffix)) {
      const second = ordinalAt(words, first.lastWord + 1);
      if (
        second &&
        SECOND_TAIL.has(second.suffix) &&
        second.number > first.number
      )
        entry = {
          kind: "multi",
          numbers: numberRange(first.number, second.number),
          firstWord: i,
          lastWord: second.lastWord,
        };
    }
    for (let k = entry.firstWord; k <= entry.lastWord; k++) taken.add(k);
    found.push(entry);
    i = entry.lastWord;
  }
  const headings = () =>
    found
      .filter((entry) => entry.kind !== "mention")
      .sort((a, b) => a.firstWord - b.firstWord);
  const nextHeadingAfter = (word) =>
    headings().find((entry) => entry.firstWord > word)?.firstWord ??
    words.length;
  for (let i = 0; i < words.length; i++) {
    if (taken.has(i) || !/^\d{1,2}[.)]?$/.test(words[i].text.trim())) continue;
    const number = Number(core(words[i].text));
    if (number < 1 || number > 50) continue;
    const lead = instructionAfter(words, i, nextHeadingAfter(i), policy);
    if (lead && lead.providerGapMs <= policy.maxOrdinalToInstructionGapMs)
      found.push({
        kind: "bare",
        numbers: [number],
        firstWord: i,
        lastWord: i,
      });
  }
  found.sort((a, b) => a.firstWord - b.firstWord);
  return found.map((entry, id) => {
    const instruction =
      entry.kind === "mention"
        ? null
        : instructionAfter(
            words,
            entry.lastWord,
            nextHeadingAfter(entry.lastWord),
            policy,
          );
    return {
      id,
      ...entry,
      // Several numbers named without an instruction ("1번부터 15번까지는 한
      // 번만 들려주고") describe the test; they head no passage.
      kind: entry.kind === "multi" && !instruction ? "mention" : entry.kind,
      quote: quoteOf(words, entry.firstWord, entry.lastWord),
      minConfidence: minConfidence(words, entry.firstWord, entry.lastWord),
      tokenStartMs: words[entry.firstWord].startMs,
      tokenEndMs: words[entry.lastWord].endMs,
      instruction,
    };
  });
}

const hasEnglish = (words, from, to) => {
  for (let i = from; i < to; i++)
    if (LATIN_WORD.test(words[i].text)) return true;
  return false;
};

/** What another heading's issues mean for a passage that leans on it, one reason per kind. */
const summarize = (issues, prefix) => {
  const kinds = new Set(issues.map(reasonCategory));
  return [
    ...(kinds.has("structure") || kinds.has("binding")
      ? [prefix + "_unreliable"]
      : []),
    ...(kinds.has("timing") ? [prefix + "_timing_unmeasured"] : []),
    ...(kinds.has("confidence") ? [prefix + "_low_confidence"] : []),
  ];
};

/**
 * One passage per heading: from the heading to the next written number, or to
 * the closing announcement after the last one. `announcementIssues` say why its
 * number is not established, `boundIssues` why its end is not.
 */
export function buildPassages(
  words,
  observations,
  durationMs,
  policy = POLICY,
) {
  const headings = observations.filter((entry) => entry.kind !== "mention");
  if (!headings.length) return [];
  let closing = -1;
  for (let i = headings.at(-1).lastWord + 1; i < words.length; i++)
    if (CLOSING.test(hangul(words[i].text))) {
      closing = i;
      break;
    }
  const passages = headings.map((heading, id) => {
    const next = headings[id + 1];
    const toWordExclusive = next
      ? next.firstWord
      : closing >= 0
        ? closing
        : words.length;
    return {
      id,
      observationId: heading.id,
      kind: null,
      numbers: heading.numbers,
      headPassageId: null,
      firstWord: heading.firstWord,
      headingLastWord: heading.lastWord,
      contentFromWord: Math.min(
        (heading.instruction?.lastWord ?? heading.lastWord) + 1,
        toWordExclusive,
      ),
      toWordExclusive,
      boundedBy: next
        ? {
            kind: "next_announcement",
            observationId: next.id,
            numbers: next.numbers,
          }
        : closing >= 0
          ? { kind: "closing_announcement", wordIndex: closing }
          : { kind: "end_of_transcript" },
      window: {
        fromMs:
          heading.firstWord > 0
            ? Math.min(words[heading.firstWord - 1].endMs, heading.tokenStartMs)
            : 0,
        toMs:
          heading.lastWord + 1 < words.length
            ? words[heading.lastWord + 1].startMs
            : durationMs,
        tokenStartMs: heading.tokenStartMs,
        tokenEndMs: heading.tokenEndMs,
      },
      announcementIssues: [],
      boundIssues: [],
    };
  });

  // A heading for several numbers, then its members in order.
  let head = null;
  let expected = null;
  passages.forEach((passage, k) => {
    const heading = headings[k];
    if (heading.kind === "multi") {
      passage.kind = hasEnglish(
        words,
        passage.contentFromWord,
        passage.toWordExclusive,
      )
        ? "shared_passage"
        : "shared_instruction_head";
      head = passage;
      expected = heading.numbers[0];
    } else if (
      heading.kind === "single" &&
      head &&
      heading.numbers[0] === expected
    ) {
      passage.kind =
        head.kind === "shared_passage"
          ? "shared_passage_member"
          : "shared_instruction_member";
      passage.headPassageId = head.id;
      if (expected < head.numbers.at(-1)) expected++;
      else head = null;
    } else {
      passage.kind = heading.kind === "bare" ? "bare" : "single";
      head = null;
    }
  });

  const isMulti = (k) => headings[k].kind === "multi";
  passages.forEach((passage, k) => {
    const heading = headings[k];
    const issues = passage.announcementIssues;
    if (heading.kind === "bare") issues.push("number_written_as_bare_digits");
    if (heading.minConfidence < policy.minOrdinalConfidence)
      issues.push("ordinal_low_confidence");
    if (heading.instruction) {
      if (
        heading.instruction.imperativeConfidence <
        policy.minInstructionConfidence
      )
        issues.push("instruction_low_confidence");
      if (
        heading.instruction.providerGapMs > policy.maxOrdinalToInstructionGapMs
      )
        issues.push("instruction_after_unmeasured_provider_gap");
    } else if (passage.kind === "shared_instruction_member") {
      // Its instruction is the one spoken once for all its members.
      const shared = passages[passage.headPassageId];
      if (!headings[shared.id].instruction)
        issues.push("instruction_context_missing");
      issues.push(...summarize(shared.announcementIssues, "scope_head"));
    } else issues.push("instruction_context_missing");
    headings.forEach((other, j) => {
      if (j === k) return;
      // A member repeats nothing: its heading names several numbers, it names one.
      if (other.numbers.join() === heading.numbers.join())
        issues.push("number_announced_more_than_once");
      const [earlier, later] = j < k ? [j, k] : [k, j];
      const low = headings[later].numbers[0];
      const before = headings[earlier].numbers[0];
      if (
        low < before ||
        (low === before && !isMulti(earlier) && isMulti(later))
      )
        issues.push("numbering_order_conflict");
    });
    passage.announcementIssues = unique(issues);
  });

  passages.forEach((passage, k) => {
    const next = passages[k + 1];
    const issues = passage.boundIssues;
    if (!next) {
      if (passage.boundedBy.kind === "end_of_transcript")
        issues.push("passage_end_not_marked");
    } else {
      const expectedNext = isMulti(k)
        ? passage.numbers[0]
        : passage.numbers[0] + 1;
      if (
        next.numbers[0] !== expectedNext ||
        (isMulti(k) && next.headPassageId !== passage.id)
      )
        issues.push("next_announcement_not_contiguous");
      else
        issues.push(...summarize(next.announcementIssues, "next_announcement"));
    }
    if (passage.kind !== "shared_instruction_head")
      for (let i = passage.contentFromWord; i < passage.toWordExclusive; i++)
        if (IMPERATIVE.test(hangul(core(words[i].text)))) {
          issues.push("second_instruction_inside_passage");
          break;
        }
    // What may be heard of this passage in another transcript of the same
    // recording: after its own instruction, before the next number's
    // instruction begins. A number without an instruction of its own leaves
    // its whole window to neither side.
    passage.contentMs = {
      fromMs: headings[k].instruction
        ? words[headings[k].instruction.lastWord].endMs
        : passage.window.toMs,
      toMs: next
        ? headings[k + 1].instruction
          ? next.window.toMs
          : next.window.fromMs
        : closing >= 0
          ? words[closing].startMs
          : durationMs,
    };
  });
  return passages;
}

/** Where words [fromWord, toWord] stand among the passages. */
function placeOf(passages, fromWord, toWord) {
  const passage = passages.find(
    (p) => p.firstWord <= fromWord && fromWord < p.toWordExclusive,
  );
  if (!passage) return { placement: "outside", passageId: null };
  if (toWord >= passage.toWordExclusive)
    return { placement: "crosses_announcement", passageId: passage.id };
  if (fromWord < passage.contentFromWord)
    return { placement: "overlaps_heading", passageId: passage.id };
  return { placement: "inside", passageId: passage.id };
}

/**
 * Where a quote written by ANOTHER transcript of the same recording stands
 * among these passages, by the provider's times of both. Both are estimates;
 * a quote that does not lie wholly inside one passage's interval is not placed.
 */
function placeByTime(passages, startMs, endMs, toleranceMs) {
  const begins = passages.filter(
    (p) =>
      startMs >= p.contentMs.fromMs - toleranceMs &&
      startMs <= p.contentMs.toMs + toleranceMs,
  );
  const holds = begins.filter((p) => endMs <= p.contentMs.toMs + toleranceMs);
  if (holds.length === 1)
    return { placement: "inside", passageId: holds[0].id };
  if (holds.length > 1)
    return { placement: "between_two_passages", passageId: null };
  if (begins.length)
    return { placement: "crosses_announcement", passageId: begins[0].id };
  return { placement: "outside", passageId: null };
}

// -------------------------------------------------------------- binding ----

const allEqual = (...values) =>
  values.every(
    (value) => value !== undefined && value !== null && value === values[0],
  );

/**
 * The transcript belongs to this recording, this clock and this certificate —
 * or nothing is read from it. `role` "headings": the transcript that hears
 * Korean and gives the numbers; "quotes": the English-only one that gives the
 * dialogue words (its checks are named english_…).
 */
export function checkBinding({
  envelope,
  raw,
  rawSha256,
  record,
  clock,
  certificateRecords,
  words,
  wordProblems,
  policy,
  inputProblems = [],
  role = "headings",
}) {
  const checks = [];
  const prefix = role === "quotes" ? "english_" : "";
  const check = (name, ok) =>
    checks.push({ name: prefix + name, ok: Boolean(ok) });
  const request = envelope?.request ?? {};
  const audio = record?.audio ?? {};
  check(
    "envelope_schema",
    envelope?.schemaVersion === 1 && envelope?.provider === "assemblyai",
  );
  check(
    "source_record_id",
    allEqual(
      envelope?.sourceRecordId,
      record?.sourceRecordId,
      clock?.sourceRecordId,
    ),
  );
  check(
    "source_audio_sha256",
    allEqual(
      envelope?.sourceAudioSha256,
      record?.sourceAudioSha256,
      clock?.sourceAudioSha256,
    ),
  );
  check(
    "playback_sha256",
    allEqual(envelope?.playbackSha256, audio.sha256, clock?.playbackSha256),
  );
  check(
    "playback_duration_ms",
    allEqual(envelope?.durationMs, audio.durationMs, clock?.durationMs),
  );
  check(
    "clock_passed_without_offset",
    clock?.status === "passed" && clock?.sourceToPlaybackOffsetMs === 0,
  );
  check(
    "clock_document",
    allEqual(clock?.revision, record?.revision) &&
      allEqual(clock?.documentSha256, record?.documentSha256),
  );
  const questionIds = (record?.questions ?? []).map((q) => q.id);
  check(
    "certificate_rows_bound",
    certificateRecords.length === questionIds.length &&
      new Set(questionIds).size === questionIds.length &&
      certificateRecords.every(
        (row) =>
          questionIds.includes(row.questionId) &&
          row.sourceRecordId === record.sourceRecordId &&
          row.sourceAudioSha256 === record.sourceAudioSha256 &&
          row.playbackSha256 === audio.sha256 &&
          row.revision === record.revision &&
          row.documentSha256 === record.documentSha256,
      ) &&
      new Set(certificateRecords.map((row) => row.questionId)).size ===
        questionIds.length,
  );
  check(
    "certificate_row_states",
    certificateRecords.every((row) =>
      row.audioRange
        ? row.status !== "held" &&
          Number.isInteger(row.audioRange.startMs) &&
          row.audioRange.endMs === audio.durationMs
        : row.status === "held",
    ),
  );
  check(
    "raw_response_sha256",
    typeof rawSha256 === "string" && rawSha256 === envelope?.raw?.sha256,
  );
  check(
    "transcript_id",
    typeof raw?.id === "string" && raw.id === envelope?.transcriptId,
  );
  check("transcript_completed", raw?.status === "completed");
  check(
    "speech_model",
    typeof raw?.speech_model_used === "string" &&
      raw.speech_model_used === envelope?.actualModel,
  );
  check(
    "language_codes",
    Array.isArray(request.language_codes)
      ? Array.isArray(raw?.language_codes) &&
          JSON.stringify(raw.language_codes) ===
            JSON.stringify(request.language_codes)
      : typeof request.language_code === "string" &&
          typeof raw?.language_code === "string" &&
          (raw.language_code === request.language_code ||
            raw.language_code.startsWith(request.language_code + "_")),
  );
  check(
    "transcript_role",
    role === "quotes"
      ? request.language_code === "en" && request.language_codes === undefined
      : [...(request.language_codes ?? []), request.language_code].includes(
          "ko",
        ),
  );
  check("word_count", raw?.words?.length === envelope?.wordCount);
  check(
    "provider_duration",
    typeof raw?.audio_duration === "number" &&
      raw.audio_duration === envelope?.providerDurationSeconds &&
      Math.abs(raw.audio_duration * 1000 - envelope?.durationMs) <=
        policy.durationToleranceMs,
  );
  check(
    "original_audio_not_modified",
    envelope?.originalAudioModified === false &&
      envelope?.writesDatabase === false &&
      envelope?.writesStorage === false,
  );
  check("transcript_words_valid", wordProblems.length === 0);
  check(
    "words_within_duration",
    words.every(
      (word) => word.endMs <= envelope?.durationMs + policy.durationToleranceMs,
    ),
  );
  for (const problem of inputProblems) check(problem, false);
  const reasons = checks
    .filter((entry) => !entry.ok)
    .map((entry) => "binding_failed:" + entry.name);
  return {
    status: reasons.length ? "failed" : "passed",
    checks,
    wordProblems,
    reasons,
  };
}

// ------------------------------------------------------- existing starts ----

/**
 * Starts the certificate already holds, by ORIGINAL spoken scope. An official
 * question is printed under its original number; two that begin at the same
 * millisecond share one passage. A reconstructed question's scope is only what
 * its own admission proved.
 */
export function existingStarts(certificateRecords) {
  const withStart = certificateRecords.filter((row) => row.audioRange);
  const groups = new Map();
  for (const row of withStart) {
    const scope = row.reconstructed
      ? (row.scopeQuestionNumbers ??
        row.originalScopeEvidence?.scopeQuestionNumbers ??
        null)
      : (row.scopeQuestionNumbers ??
        withStart
          .filter(
            (other) =>
              !other.reconstructed &&
              other.audioRange.startMs === row.audioRange.startMs,
          )
          .map((other) => other.sourceNumber)
          .sort((a, b) => a - b));
    if (!Array.isArray(scope) || !scope.length) continue;
    const key = scope.join();
    if (!groups.has(key))
      groups.set(key, { scope, startMs: new Set(), questionIds: [] });
    groups.get(key).startMs.add(row.audioRange.startMs);
    groups.get(key).questionIds.push(row.questionId);
  }
  return [...groups.values()].map((group) => ({
    scope: group.scope,
    startMs: group.startMs.size === 1 ? [...group.startMs][0] : null,
    questionIds: group.questionIds,
  }));
}

const passageScope = (passage, passages) =>
  passage.kind === "shared_passage_member"
    ? passages[passage.headPassageId].numbers
    : passage.numbers;

/**
 * Each existing start against the window in which the transcript wrote the
 * same scope's number. One start outside its window means the transcript and
 * the verified clock disagree, and nothing more is read from this transcript.
 */
function checkExistingStarts(existing, passages, observations, policy) {
  return existing.map((group) => {
    const matching = passages.filter(
      (p) =>
        p.kind !== "shared_passage_member" &&
        p.kind !== "bare" &&
        p.numbers.join() === group.scope.join(),
    );
    const base = { scope: group.scope, existingStartMs: group.startMs };
    if (group.startMs === null)
      return {
        ...base,
        status: "not_comparable",
        why: "scope_has_two_existing_starts",
      };
    if (matching.length !== 1)
      return {
        ...base,
        status: "not_comparable",
        why: matching.length
          ? "number_announced_more_than_once"
          : "announcement_not_found",
      };
    const { window } = matching[0];
    const inside =
      group.startMs >= window.fromMs - policy.existingStartToleranceMs &&
      group.startMs <= window.toMs + policy.existingStartToleranceMs;
    return {
      ...base,
      status: inside ? "agrees" : "disagrees",
      passageId: matching[0].id,
      windowMs: { fromMs: window.fromMs, toMs: window.toMs },
      providerTokenStartMinusExistingMs: window.tokenStartMs - group.startMs,
      announcement: {
        quote: observations[matching[0].observationId].quote,
        minConfidence: observations[matching[0].observationId].minConfidence,
      },
    };
  });
}

/** A proposed scope against the starts that exist: same scope shares it, other scopes keep their order. */
function existingStartConflicts(scope, window, existing) {
  const reasons = [];
  let shares = null;
  const low = scope[0];
  const high = scope.at(-1);
  for (const group of existing) {
    if (group.startMs === null) continue;
    if (group.scope.join() === scope.join()) {
      shares = { startMs: group.startMs, questionIds: group.questionIds };
      continue;
    }
    if (group.scope.at(-1) < low) {
      if (!(group.startMs < window.toMs))
        reasons.push("conflicts_with_existing_start_order");
    } else if (group.scope[0] > high) {
      if (!(group.startMs > window.fromMs))
        reasons.push("conflicts_with_existing_start_order");
    } else reasons.push("overlaps_existing_start_scope");
  }
  return { reasons: unique(reasons), shares };
}

// -------------------------------------------------------- official script ----

const PAGE_FURNITURE = /ⓒ[^\n]*?-\s*\d+\s*-/g;
const SCRIPT_MARKER = /(?:^|\s)(\d{1,2})\s?번(?=\s)/g;
const BLOCK_HEAD = /[【\[]\s*(\d{1,2})\s*[-~～∼]\s*(\d{1,2})\s*[】\]]/g;
const SCRIPT_CLOSING = /시그널\s*IN|ANN\s*:/g;
const SPEAKER = /(?:^|\s)[A-Z][A-Za-z]{0,9}\s*:(?=\s)/g;
const DIRECTION = /\[[^\]]{0,48}\]/g;

/** Sentences of a dialogue as printed, each with enough words to stand as an anchor. */
function spokenSentences(text, policy) {
  return text
    .replace(SPEAKER, " \n ")
    .replace(DIRECTION, " ")
    .replace(/_{3,}/g, " \n ")
    .split(/\n|(?<=[.?!])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence && !HANGUL.test(sentence))
    .map((sentence) => ({ text: sentence, tokens: matchTokens(sentence) }))
    .filter((sentence) => sentence.tokens.length >= policy.minAnchorQuoteWords);
}

/**
 * The official script's own numbered sections. Every question number must be
 * printed exactly once, in order; otherwise no section is offered.
 * Returns { sections: Map(number -> { scope, instructionHangul, instructionText, anchors }), reason }.
 */
export function officialSections(scriptText, numbers, policy = POLICY) {
  if (typeof scriptText !== "string" || !/[A-Za-z]{3}/.test(scriptText))
    return { sections: null, reason: "official_script_has_no_text" };
  const text = scriptText.replace(PAGE_FURNITURE, " ");
  const markers = new Map();
  for (const match of text.matchAll(SCRIPT_MARKER)) {
    const number = Number(match[1]);
    if (!markers.has(number)) markers.set(number, []);
    markers.get(number).push({
      at: match.index + match[0].indexOf(match[1]),
      end: match.index + match[0].length,
    });
  }
  const ordered = [...numbers].sort((a, b) => a - b);
  let previous = -1;
  for (const number of ordered) {
    const places = markers.get(number) ?? [];
    if (places.length !== 1 || places[0].at <= previous)
      return { sections: null, reason: "official_script_numbering_not_unique" };
    previous = places[0].at;
  }
  const heads = [...text.matchAll(BLOCK_HEAD)].map((match) => ({
    at: match.index,
    end: match.index + match[0].length,
    numbers: numberRange(Number(match[1]), Number(match[2])),
  }));
  const scriptStream = matchTokens(text).map((token) => ({ token, word: 0 }));
  const onceInScript = (sentence) =>
    locate(scriptStream, sentence.tokens).length === 1;
  const sections = new Map();
  ordered.forEach((number, k) => {
    const marker = markers.get(number)[0];
    const head = heads.find(
      (h) =>
        h.numbers.includes(number) &&
        h.end <= markers.get(h.numbers[0])?.[0].at,
    );
    let body;
    let end;
    if (head) {
      // One passage printed before the first member's own number.
      body = text.slice(head.end, markers.get(head.numbers[0])[0].at);
    } else {
      end =
        k + 1 < ordered.length
          ? markers.get(ordered[k + 1])[0].at
          : text.length;
      const nextHead = heads.find((h) => h.at >= marker.end && h.at < end);
      if (nextHead) end = nextHead.at;
      if (k + 1 === ordered.length) {
        SCRIPT_CLOSING.lastIndex = marker.end;
        const closing = SCRIPT_CLOSING.exec(text);
        if (closing) end = Math.min(end, closing.index);
      }
      body = text.slice(marker.end, end);
    }
    SPEAKER.lastIndex = 0;
    const firstSpeaker = SPEAKER.exec(body);
    const instructionText = (
      firstSpeaker ? body.slice(0, firstSpeaker.index) : body
    ).trim();
    sections.set(number, {
      scope: head ? head.numbers : [number],
      instructionText,
      instructionHangul: hangul(instructionText),
      anchors: firstSpeaker
        ? spokenSentences(body.slice(firstSpeaker.index), policy).filter(
            onceInScript,
          )
        : [],
    });
  });
  return { sections, reason: null };
}

// ------------------------------------------------------------ questions ----

const describePassage = (passage, context) => {
  const { words, observations, passages } = context;
  const heading = observations[passage.observationId];
  const shared =
    passage.headPassageId === null ? null : passages[passage.headPassageId];
  const sharedHeading = shared ? observations[shared.observationId] : null;
  const instruction = heading.instruction ?? null;
  return {
    passageId: passage.id,
    kind: passage.kind,
    spokenNumbers: passage.numbers,
    announcement: {
      wordIndexes: [heading.firstWord, heading.lastWord],
      quote: heading.quote,
      minConfidence: heading.minConfidence,
      providerTokenMs: {
        startMs: heading.tokenStartMs,
        endMs: heading.tokenEndMs,
      },
    },
    instruction: instruction
      ? {
          wordIndexes: [instruction.firstWord, instruction.lastWord],
          quote: instruction.quote,
          imperativeConfidence: instruction.imperativeConfidence,
          providerGapMs: instruction.providerGapMs,
        }
      : null,
    sharedHeading: sharedHeading
      ? {
          spokenNumbers: sharedHeading.numbers,
          wordIndexes: [sharedHeading.firstWord, sharedHeading.lastWord],
          quote: sharedHeading.quote,
          instruction: sharedHeading.instruction
            ? {
                wordIndexes: [
                  sharedHeading.instruction.firstWord,
                  sharedHeading.instruction.lastWord,
                ],
                quote: sharedHeading.instruction.quote,
              }
            : null,
          searchWindowMs: {
            fromMs: shared.window.fromMs,
            toMs: shared.window.toMs,
          },
        }
      : null,
    contentWordIndexes: [passage.contentFromWord, passage.toWordExclusive],
    contentMs: passage.contentMs,
    boundedBy: passage.boundedBy,
    searchWindowMs: {
      fromMs: passage.window.fromMs,
      toMs: passage.window.toMs,
    },
    announcementIssues: passage.announcementIssues,
    boundIssues: passage.boundIssues,
  };
};

const describeOccurrence = (
  occurrence,
  context,
  words = context.quoteWords,
) => ({
  wordIndexes: [occurrence.fromWord, occurrence.toWord],
  transcriptQuote: quoteOf(words, occurrence.fromWord, occurrence.toWord),
  startMs: words[occurrence.fromWord].startMs,
  endMs: words[occurrence.toWord].endMs,
  minConfidence: minConfidence(words, occurrence.fromWord, occurrence.toWord),
  placement: occurrence.placement,
  passageSpokenNumbers:
    occurrence.passageId === null
      ? null
      : context.passages[occurrence.passageId].numbers,
});

/** Among the passages: by time when the quotes are another transcript's, else by word order. */
const placeQuote = (context, fromWord, toWord) =>
  context.quotesByTime
    ? placeByTime(
        context.passages,
        context.quoteWords[fromWord].startMs,
        context.quoteWords[toWord].endMs,
        context.policy.crossTranscriptToleranceMs,
      )
    : placeOf(context.passages, fromWord, toWord);

const occurrencesOf = (tokens, context) =>
  locate(context.quoteStream, tokens).map((occurrence) => ({
    ...occurrence,
    ...placeQuote(context, occurrence.fromWord, occurrence.toWord),
  }));

/** Reasons a passage adds to a question placed in it, and the scope it gives. */
function passageVerdict(passage, context) {
  const reasons = [...passage.announcementIssues, ...passage.boundIssues];
  if (passage.kind === "shared_passage_member")
    reasons.push("evidence_inside_shared_scope_member_question");
  if (passage.kind === "shared_instruction_head")
    reasons.push("evidence_inside_shared_instruction_heading");
  const scope = passageScope(passage, context.passages);
  const conflicts = existingStartConflicts(
    scope,
    passage.window,
    context.existing,
  );
  reasons.push(...conflicts.reasons);
  return { reasons, scope, shares: conflicts.shares };
}

const candidateOf = (passage, verdict, context) => ({
  originalScopeNumbers: verdict.scope,
  evidenceGrade:
    passage.kind === "shared_passage"
      ? "shared_passage_heading"
      : passage.kind === "shared_instruction_member"
        ? "shared_instruction_member_cue"
        : "numbered_announcement",
  announcementSearchWindowMs: {
    fromMs: passage.window.fromMs,
    toMs: passage.window.toMs,
  },
  providerTokenMs: {
    startMs: passage.window.tokenStartMs,
    endMs: passage.window.tokenEndMs,
  },
  wholeOriginalEndMs: context.durationMs,
  sharesExistingStart: verdict.shares,
  providerTimeIsAnEstimateNotAMeasuredOnset: true,
});

/** A reconstructed question, by its unchanged generation quotes alone. */
function alignReconstructed(question, context) {
  const { policy } = context;
  const generated = context.generation?.get(question.questionId);
  if (
    !generated ||
    generated.included !== true ||
    !Array.isArray(generated.evidenceQuotes) ||
    !generated.evidenceQuotes.length
  )
    return {
      reasons: ["generation_evidence_missing"],
      evidence: null,
      candidate: null,
    };
  const quotes = generated.evidenceQuotes.map((text) => {
    const tokens = matchTokens(String(text));
    return {
      text,
      tokens,
      role:
        tokens.length >= policy.minAnchorQuoteWords ? "anchor" : "supporting",
      occurrences: occurrencesOf(tokens, context),
    };
  });
  const reasons = [];
  const anchors = quotes.filter((quote) => quote.role === "anchor");
  if (!anchors.length) reasons.push("generation_quotes_too_short_to_anchor");
  const hit = new Set();
  for (const quote of anchors) {
    if (!quote.occurrences.length)
      reasons.push("generation_quote_missing_in_transcript");
    for (const occurrence of quote.occurrences)
      if (occurrence.placement === "inside") hit.add(occurrence.passageId);
      else
        reasons.push(
          occurrence.placement === "crosses_announcement"
            ? "generation_quote_crosses_announcement"
            : "generation_quote_outside_any_passage",
        );
  }
  if (hit.size > 1) reasons.push("generation_quotes_in_different_passages");
  const passage = hit.size === 1 ? context.passages[[...hit][0]] : null;
  let verdict = null;
  if (passage) {
    let low = 1;
    for (const quote of quotes) {
      const inside = quote.occurrences.filter(
        (o) => o.placement === "inside" && o.passageId === passage.id,
      );
      if (!inside.length) {
        if (quote.role === "supporting")
          reasons.push("supporting_quote_not_heard_in_passage");
        continue;
      }
      const confidences = inside.map((o) =>
        minConfidence(context.quoteWords, o.fromWord, o.toWord),
      );
      // An anchor stands on every place it was written; a short quote on its best one.
      low = Math.min(
        low,
        quote.role === "anchor"
          ? Math.min(...confidences)
          : Math.max(...confidences),
      );
    }
    if (low < policy.minQuoteWordConfidence)
      reasons.push("quote_low_confidence");
    verdict = passageVerdict(passage, context);
    reasons.push(...verdict.reasons);
  }
  const evidence = {
    generatedOrdinal: generated.generatedOrdinal,
    quotes: quotes.map((quote) => ({
      text: quote.text,
      tokens: quote.tokens.length,
      role: quote.role,
      occurrences: quote.occurrences.map((o) => describeOccurrence(o, context)),
      ...(quote.occurrences.length
        ? {}
        : {
            longestExactRunNotEvidence: (() => {
              const run = longestExactRun(context.quoteStream, quote.tokens);
              // A word or two in common points nowhere in particular.
              return run && run.tokens >= policy.minAnchorQuoteWords
                ? {
                    tokens: run.tokens,
                    ofTokens: run.ofTokens,
                    ...describeOccurrence(
                      {
                        ...run,
                        ...placeQuote(context, run.fromWord, run.toWord),
                      },
                      context,
                    ),
                  }
                : null;
            })(),
            // Where the transcript that gave the numbers wrote these words.
            // It is asked for numbers only; this proves nothing.
            ...(context.quotesByTime
              ? {
                  inHeadingsTranscriptNotEvidence: locate(
                    context.stream,
                    quote.tokens,
                  ).map((o) =>
                    describeOccurrence(
                      {
                        ...o,
                        ...placeOf(context.passages, o.fromWord, o.toWord),
                      },
                      context,
                      context.words,
                    ),
                  ),
                }
              : {}),
          }),
    })),
    passage: passage ? describePassage(passage, context) : null,
  };
  const all = unique(reasons);
  return {
    reasons: all,
    evidence,
    candidate: all.length ? null : candidateOf(passage, verdict, context),
  };
}

/** An official question, by its own printed section: its number, and its own dialogue heard there and nowhere else. */
function alignOfficial(question, context) {
  const number = question.sourceNumber;
  if (context.official.reason)
    return {
      reasons: [context.official.reason],
      evidence: null,
      candidate: null,
    };
  const section = context.official.sections.get(number);
  if (!section)
    return {
      reasons: ["official_section_missing"],
      evidence: null,
      candidate: null,
    };
  const shared = section.scope.length > 1;
  const matching = context.passages.filter(
    (p) =>
      p.numbers.join() === section.scope.join() &&
      (shared
        ? p.kind === "shared_passage" || p.kind === "shared_instruction_head"
        : p.kind === "single"),
  );
  const reasons = [];
  if (!matching.length) reasons.push("announcement_not_found");
  if (matching.length > 1) reasons.push("number_announced_more_than_once");
  const passage = matching.length === 1 ? matching[0] : null;
  const own = section.anchors.map((anchor) => ({
    anchor,
    occurrences: occurrencesOf(anchor.tokens, context),
  }));
  const isInside = (o) =>
    passage && o.placement === "inside" && o.passageId === passage.id;
  const heardInside = own.filter((entry) => entry.occurrences.some(isInside));
  const heardElsewhere = own.filter((entry) =>
    entry.occurrences.some((o) => !isInside(o)),
  );
  const foreign = [];
  if (passage)
    for (const [other, otherSection] of context.official.sections) {
      if (section.scope.includes(other)) continue;
      for (const anchor of otherSection.anchors)
        for (const occurrence of occurrencesOf(anchor.tokens, context))
          if (isInside(occurrence))
            foreign.push({
              sectionNumber: other,
              text: anchor.text,
              occurrence,
            });
    }
  let agreement = null;
  let verdict = null;
  if (passage) {
    if (!section.anchors.length)
      reasons.push("official_section_has_no_unique_dialogue");
    else if (!heardInside.length)
      reasons.push("official_section_dialogue_not_heard_in_passage");
    if (heardElsewhere.length)
      reasons.push("official_section_dialogue_heard_outside_passage");
    if (foreign.length) reasons.push("other_section_dialogue_inside_passage");
    const best = Math.max(
      0,
      ...heardInside.flatMap((entry) =>
        entry.occurrences
          .filter(isInside)
          .map((o) => minConfidence(context.quoteWords, o.fromWord, o.toWord)),
      ),
    );
    if (heardInside.length && best < context.policy.minQuoteWordConfidence)
      reasons.push("quote_low_confidence");
    const heard = hangul(
      context.observations[passage.observationId].instruction?.quote ?? "",
    );
    agreement = !heard
      ? "not_heard"
      : heard === section.instructionHangul
        ? "exact"
        : [...context.official.sections.values()].some(
              (other) => other.instructionHangul === heard,
            )
          ? "another_sections_sentence"
          : "inexact";
    if (agreement === "another_sections_sentence")
      reasons.push("heard_instruction_is_another_sections_sentence");
    verdict = passageVerdict(passage, context);
    reasons.push(...verdict.reasons);
  }
  const example = (entry) => ({
    scriptSentence: entry.anchor.text,
    occurrences: entry.occurrences.map((o) => describeOccurrence(o, context)),
  });
  const evidence = {
    officialSectionNumbers: section.scope,
    instruction: {
      script: section.instructionText,
      heard: passage
        ? (context.observations[passage.observationId].instruction?.quote ??
          null)
        : null,
      hangulAgreement: agreement,
    },
    ownDialogue: {
      uniqueScriptSentences: section.anchors.length,
      heardInsidePassage: heardInside.length,
      openingSentenceHeard: heardInside.some(
        (entry) => entry.anchor === section.anchors[0],
      ),
      examples: heardInside.slice(0, 5).map(example),
      heardOutsidePassage: heardElsewhere.slice(0, 5).map(example),
    },
    otherSectionsInsidePassage: foreign.slice(0, 5).map((entry) => ({
      sectionNumber: entry.sectionNumber,
      scriptSentence: entry.text,
      occurrence: describeOccurrence(entry.occurrence, context),
    })),
    passage: passage ? describePassage(passage, context) : null,
  };
  const all = unique(reasons);
  return {
    reasons: all,
    evidence,
    candidate: all.length ? null : candidateOf(passage, verdict, context),
  };
}

// ---------------------------------------------------------------- source ----

/**
 * One source. `input`: { record, clock, certificateRecords, envelope, raw,
 * rawSha256, english? ({ envelope, raw, rawSha256 } of the English-only
 * transcript), generation (Map questionId -> { generatedOrdinal,
 * evidenceQuotes, included }) for a reconstructed source, scriptText for an
 * official one, policy?, inputProblems? }. Reads nothing else and writes
 * nothing.
 *
 * Numbers, instructions and passages always come from `raw`, the transcript
 * that hears Korean. With `english`, the dialogue words come from that
 * transcript alone and are placed among the passages by time; an English word
 * is never read as a number. Without it they come from `raw` and are placed
 * by word order.
 */
export function alignSource(input) {
  const policy = Object.freeze({ ...POLICY, ...(input.policy ?? {}) });
  const { record, clock, envelope, raw, rawSha256, certificateRecords } = input;
  const english = input.english ?? null;
  const { words, problems } = transcriptWords(raw);
  const quoted = english ? transcriptWords(english.raw) : null;
  const bound = [
    checkBinding({
      envelope,
      raw,
      rawSha256,
      record,
      clock,
      certificateRecords,
      words,
      wordProblems: problems,
      policy,
      inputProblems: input.inputProblems,
    }),
  ];
  if (english) {
    bound.push(
      checkBinding({
        envelope: english.envelope,
        raw: english.raw,
        rawSha256: english.rawSha256,
        record,
        clock,
        certificateRecords,
        words: quoted.words,
        wordProblems: quoted.problems,
        policy,
        role: "quotes",
      }),
    );
    const distinct =
      english.envelope?.transcriptId !== envelope?.transcriptId &&
      english.rawSha256 !== rawSha256;
    bound.push({
      checks: [{ name: "english_is_another_transcript", ok: distinct }],
      wordProblems: [],
      reasons: distinct ? [] : ["binding_failed:english_is_another_transcript"],
    });
  }
  const binding = {
    status: bound.some((entry) => entry.reasons.length) ? "failed" : "passed",
    checks: bound.flatMap((entry) => entry.checks),
    wordProblems: unique(bound.flatMap((entry) => entry.wordProblems)),
    reasons: bound.flatMap((entry) => entry.reasons),
  };
  const describeTranscript = (from, hash, list) => ({
    provider: from?.provider ?? null,
    transcriptId: from?.transcriptId ?? null,
    model: from?.actualModel ?? null,
    languages:
      from?.request?.language_codes ??
      (from?.request?.language_code ? [from.request.language_code] : null),
    rawSha256: hash ?? null,
    wordCount: list.length,
  });
  const report = {
    schemaVersion: 1,
    kind: "assemblyai_whole_original_alignment_diagnostic",
    diagnosticOnly: true,
    admissionAuthority: false,
    productionApplicationAuthorized: false,
    writesDatabase: false,
    writesStorage: false,
    writesMedia: false,
    originalAudioModified: false,
    humanReviewed: false,
    providerTimesAreEstimates: true,
    policy,
    policyDiffersFromPreregistered: Object.keys(POLICY).filter(
      (key) => policy[key] !== POLICY[key],
    ),
    source: {
      sourceRecordId: record.sourceRecordId,
      reconstructed: record.reconstructed === true,
      sourceAudioSha256: record.sourceAudioSha256,
      playbackSha256: record.audio?.sha256 ?? null,
      durationMs: record.audio?.durationMs ?? null,
      revision: record.revision,
      documentSha256: record.documentSha256,
    },
    transcripts: {
      headings: describeTranscript(envelope, rawSha256, words),
      quotes: english
        ? describeTranscript(english.envelope, english.rawSha256, quoted.words)
        : "same_as_headings",
      quotesPlacedBy: english ? "provider_time" : "word_order",
    },
    binding,
    existingStartChecks: [],
    observations: [],
    passages: [],
    questions: [],
    counts: null,
  };
  let context = null;
  let sourceReasons = binding.reasons;
  if (binding.status === "passed") {
    const observations = findObservations(words, policy);
    const passages = buildPassages(
      words,
      observations,
      record.audio.durationMs,
      policy,
    );
    const existing = existingStarts(certificateRecords);
    report.existingStartChecks = checkExistingStarts(
      existing,
      passages,
      observations,
      policy,
    );
    if (
      report.existingStartChecks.some((entry) => entry.status === "disagrees")
    )
      sourceReasons = ["source_existing_start_outside_announcement_window"];
    context = {
      policy,
      words,
      stream: tokenStream(words),
      quoteWords: english ? quoted.words : words,
      quoteStream: tokenStream(english ? quoted.words : words),
      quotesByTime: Boolean(english),
      observations,
      passages,
      existing,
      durationMs: record.audio.durationMs,
      generation: input.generation ?? null,
      official:
        record.reconstructed === true
          ? null
          : officialSections(
              input.scriptText,
              record.questions.map((q) => q.sourceNumber),
              policy,
            ),
    };
    report.observations = observations;
    report.passages = passages.map((passage) =>
      describePassage(passage, context),
    );
  }
  const inventoryById = new Map(record.questions.map((q) => [q.id, q]));
  report.questions = certificateRecords.map((row) => {
    const base = {
      questionId: row.questionId,
      displayedNumber: row.sourceNumber,
      reconstructed: row.reconstructed === true,
      certificateStatus: row.status,
    };
    if (row.audioRange)
      return {
        ...base,
        outcome: "existing_start_preserved",
        existingAudioRange: structuredClone(row.audioRange),
      };
    let result = { reasons: sourceReasons, evidence: null, candidate: null };
    if (!sourceReasons.length) {
      const question = {
        questionId: row.questionId,
        sourceNumber: row.sourceNumber,
      };
      if (record.reconstructed === true)
        result = alignReconstructed(question, context);
      else if (
        inventoryById.get(row.questionId)?.metadata?.sourceNumber !==
        row.sourceNumber
      )
        result = {
          reasons: ["official_number_not_recorded"],
          evidence: null,
          candidate: null,
        };
      else result = alignOfficial(question, context);
    }
    const held = result.reasons.length > 0;
    return {
      ...base,
      outcome: held ? "held" : "candidate",
      ...(held
        ? { holdClass: holdClass(result.reasons), reasons: result.reasons }
        : { candidate: result.candidate }),
      evidence: result.evidence,
    };
  });
  const held = report.questions.filter((q) => q.outcome === "held");
  report.counts = {
    questions: report.questions.length,
    existingStartsPreserved: report.questions.filter(
      (q) => q.outcome === "existing_start_preserved",
    ).length,
    candidates: report.questions.filter((q) => q.outcome === "candidate")
      .length,
    held: held.length,
    heldByClass: {
      binding: held.filter((q) => q.holdClass === "binding").length,
      structure: held.filter((q) => q.holdClass === "structure").length,
      provider_timing: held.filter((q) => q.holdClass === "provider_timing")
        .length,
      confidence_only: held.filter((q) => q.holdClass === "confidence_only")
        .length,
    },
  };
  assertExistingStartsUntouched(certificateRecords, report);
  return report;
}

/** Throws unless every existing start is echoed exactly and no held question carries a range. */
export function assertExistingStartsUntouched(certificateRecords, report) {
  const byId = new Map(report.questions.map((q) => [q.questionId, q]));
  if (
    byId.size !== certificateRecords.length ||
    report.questions.length !== certificateRecords.length
  )
    throw new Error("Report does not cover the certificate rows exactly");
  for (const row of certificateRecords) {
    const question = byId.get(row.questionId);
    if (!question)
      throw new Error("Question missing from report: " + row.questionId);
    if ("audioRange" in question)
      throw new Error(
        "A diagnostic row carries an audioRange: " + row.questionId,
      );
    if (row.audioRange) {
      const echoed = question.existingAudioRange;
      if (
        question.outcome !== "existing_start_preserved" ||
        "candidate" in question ||
        !echoed ||
        Object.keys(echoed).length !== Object.keys(row.audioRange).length ||
        echoed.startMs !== row.audioRange.startMs ||
        echoed.endMs !== row.audioRange.endMs
      )
        throw new Error("Existing start touched: " + row.questionId);
    } else if (
      "existingAudioRange" in question ||
      (question.outcome !== "held" && question.outcome !== "candidate")
    )
      throw new Error("Held question given a start: " + row.questionId);
  }
}

// ------------------------------------------------------------------- CLI ----

const TOOL_PATH = fileURLToPath(import.meta.url);

const readJson = (file) => {
  const bytes = readFileSync(file);
  return {
    bytes,
    sha256: sha256(bytes),
    value: JSON.parse(bytes.toString("utf8")),
  };
};

const sameFile = (a, b) =>
  path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();

/** Generation quotes of a reconstructed source, by question id, from the frozen prepared and alignment files. */
function loadGeneration(record, problems) {
  const prepared = readJson(record.preparedPath);
  if (prepared.sha256 !== record.preparedSha256)
    problems.push("prepared_sha256");
  const alignment = readJson(record.alignmentPath);
  if (
    alignment.value.preparedSha256 !== record.preparedSha256 ||
    alignment.value.sourceAudioSha256 !== record.sourceAudioSha256 ||
    alignment.value.sourceRecordId !== record.sourceRecordId
  )
    problems.push("generation_alignment_identity");
  const grounding = new Map(
    (prepared.value.verification?.grounding ?? []).map((row) => [
      row.generatedOrdinal,
      row,
    ]),
  );
  const ids = new Set(record.questions.map((q) => q.id));
  const generation = new Map();
  for (const candidate of alignment.value.candidates ?? []) {
    const row = grounding.get(candidate.generatedOrdinal);
    if (
      !ids.has(candidate.questionId) ||
      generation.has(candidate.questionId) ||
      !row
    ) {
      problems.push("generation_alignment_questions");
      continue;
    }
    generation.set(candidate.questionId, {
      generatedOrdinal: candidate.generatedOrdinal,
      evidenceQuotes: row.evidenceQuotes,
      included: row.included,
    });
  }
  if (generation.size !== ids.size)
    problems.push("generation_alignment_questions");
  return {
    generation,
    inputs: {
      prepared: { path: record.preparedPath, sha256: prepared.sha256 },
      generationAlignment: {
        path: record.alignmentPath,
        sha256: alignment.sha256,
      },
    },
  };
}

/** The official script of one source as the frozen live snapshot holds it. */
function loadScript(record, snapshot, problems) {
  const row = snapshot.value.snapshots.find(
    (entry) => entry.id === record.setId,
  );
  if (
    !row ||
    row.revision !== record.revision ||
    sha256(JSON.stringify(row.document)) !== record.documentSha256 ||
    row.document.groups.length !== 1
  ) {
    problems.push("live_document");
    return null;
  }
  const group = row.document.groups[0];
  if (
    group.questions.map((q) => q.id).join() !==
    record.questions.map((q) => q.id).join()
  )
    problems.push("live_document_questions");
  return group.transcript?.text ?? null;
}

const markdown = (summary, reports) => {
  const lines = [
    "# AssemblyAI whole-original alignment — diagnostic",
    "",
    "Proposals to look at. Nothing here is a start, an admission or a DB write;",
    "provider word times are estimates and every window still needs a measured onset.",
    "",
    `Certificate ${summary.inputs.certificate.sha256}: ${summary.certificate.existingStarts} existing starts (echoed, untouched), ${summary.certificate.held} held.`,
    "",
    "| source | questions | existing | candidates | held: structure | held: provider timing | held: confidence only | held: binding | clock checks |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
  ];
  for (const report of reports) {
    const c = report.counts;
    const checks = report.existingStartChecks;
    const agrees = checks.filter((entry) => entry.status === "agrees").length;
    const disagrees = checks.filter(
      (entry) => entry.status === "disagrees",
    ).length;
    lines.push(
      `| ${report.source.sourceRecordId} | ${c.questions} | ${c.existingStartsPreserved} | ${c.candidates} | ${c.heldByClass.structure} | ${c.heldByClass.provider_timing} | ${c.heldByClass.confidence_only} | ${c.heldByClass.binding} | ${agrees} agree, ${disagrees} disagree, ${checks.length - agrees - disagrees} not comparable |`,
    );
  }
  for (const report of reports) {
    lines.push("", `## ${report.source.sourceRecordId}`, "");
    lines.push(
      `Numbers from ${report.transcripts.headings.model} (${(report.transcripts.headings.languages ?? []).join("+")}); dialogue words from ${
        report.transcripts.quotes === "same_as_headings"
          ? "the same transcript, placed by word order"
          : report.transcripts.quotes.model +
            " (" +
            (report.transcripts.quotes.languages ?? []).join("+") +
            "), placed by provider time"
      }.`,
      "",
      `Binding ${report.binding.status}. Spoken numbers written: ${
        report.passages
          .map(
            (p) =>
              p.spokenNumbers.join("-") +
              (p.announcementIssues.length || p.boundIssues.length ? "*" : ""),
          )
          .join(" ") || "none"
      } (* = not established).`,
      "",
      ...report.existingStartChecks
        .filter((entry) => entry.status !== "not_comparable")
        .map(
          (entry) =>
            `- existing start of original ${entry.scope.join("-")} at ${entry.existingStartMs} ms ${entry.status} with «${entry.announcement.quote}» (confidence ${entry.announcement.minConfidence}, window ${entry.windowMs.fromMs}–${entry.windowMs.toMs}, provider token start ${entry.providerTokenStartMinusExistingMs >= 0 ? "+" : ""}${entry.providerTokenStartMinusExistingMs} ms)`,
        ),
      "",
      "| shown # | outcome | original scope | announcement words | window ms | reasons |",
      "| ---: | --- | --- | --- | --- | --- |",
    );
    for (const q of report.questions) {
      if (q.outcome === "existing_start_preserved") continue;
      const p = q.evidence?.passage;
      lines.push(
        `| ${q.displayedNumber} | ${q.outcome}${q.holdClass ? " (" + q.holdClass + ")" : ""} | ${
          q.candidate
            ? q.candidate.originalScopeNumbers.join("-")
            : p
              ? "(" + p.spokenNumbers.join("-") + ")"
              : ""
        } | ${p ? p.announcement.wordIndexes.join("–") + " «" + p.announcement.quote + "»" : ""} | ${
          p ? p.searchWindowMs.fromMs + "–" + p.searchWindowMs.toMs : ""
        } | ${(q.reasons ?? []).join(", ")} |`,
      );
    }
  }
  return lines.join("\n") + "\n";
};

/** Runs the envelopes given on the command line and writes each report once. */
export function main(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      inventory: { type: "string" },
      certificate: { type: "string" },
      "certificate-sha256": { type: "string" },
      clock: { type: "string" },
      envelope: { type: "string", multiple: true },
      "english-envelope": { type: "string", multiple: true },
      out: { type: "string" },
      policy: { type: "string" },
      "skip-audio-hash": { type: "boolean", default: false },
    },
  });
  for (const key of ["inventory", "certificate", "clock", "out"])
    if (!values[key]) throw new Error("Missing --" + key);
  if (!values.envelope?.length) throw new Error("Missing --envelope");
  const inventory = readJson(values.inventory);
  const certificate = readJson(values.certificate);
  const clock = readJson(values.clock);
  if (
    values["certificate-sha256"] &&
    values["certificate-sha256"] !== certificate.sha256
  )
    throw new Error("Certificate differs from the reviewed hash");
  if (
    certificate.value.inputs?.inventory?.sha256 !== inventory.sha256 ||
    certificate.value.inputs?.clock?.sha256 !== clock.sha256
  )
    throw new Error(
      "Inventory or clock is not the one this certificate was replayed from",
    );
  const policy = values.policy ? readJson(values.policy).value : undefined;
  const out = path.resolve(values.out);
  const englishPaths = values["english-envelope"] ?? [];
  const inputFiles = [
    values.inventory,
    values.certificate,
    values.clock,
    ...values.envelope,
    ...englishPaths,
  ];
  if (inputFiles.some((file) => sameFile(path.dirname(file), out)))
    throw new Error("Output directory holds an input file");
  const headingSources = values.envelope.map(
    (file) => readJson(file).value.sourceRecordId,
  );
  const englishBySource = new Map();
  for (const file of englishPaths) {
    const source = readJson(file).value.sourceRecordId;
    if (!headingSources.includes(source) || englishBySource.has(source))
      throw new Error(
        "English envelope has no single headings envelope: " + file,
      );
    englishBySource.set(source, file);
  }
  // Only these fields are read; the provider's upload URL never leaves the raw file.
  const readable = (value) => ({
    id: value.id,
    status: value.status,
    words: value.words,
    audio_duration: value.audio_duration,
    language_code: value.language_code,
    language_codes: value.language_codes,
    speech_model_used: value.speech_model_used,
  });
  mkdirSync(out, { recursive: true });
  let snapshot = null;
  const reports = [];
  const perSource = [];
  for (const envelopePath of values.envelope) {
    const envelope = readJson(envelopePath);
    const record = inventory.value.records.find(
      (entry) => entry.sourceRecordId === envelope.value.sourceRecordId,
    );
    if (!record)
      throw new Error("Envelope names no inventory source: " + envelopePath);
    const raw = readJson(envelope.value.raw.path);
    const problems = [];
    const inputs = {
      envelope: { path: envelopePath, sha256: envelope.sha256 },
      rawResponse: { path: envelope.value.raw.path, sha256: raw.sha256 },
    };
    let english = null;
    if (englishBySource.has(record.sourceRecordId)) {
      const englishPath = englishBySource.get(record.sourceRecordId);
      const englishEnvelope = readJson(englishPath);
      const englishRaw = readJson(englishEnvelope.value.raw.path);
      english = {
        envelope: englishEnvelope.value,
        raw: readable(englishRaw.value),
        rawSha256: englishRaw.sha256,
      };
      inputs.englishEnvelope = {
        path: englishPath,
        sha256: englishEnvelope.sha256,
      };
      inputs.englishRawResponse = {
        path: englishEnvelope.value.raw.path,
        sha256: englishRaw.sha256,
      };
    }
    if (!values["skip-audio-hash"]) {
      const audio = readFileSync(record.sourceAudioPath);
      if (
        sha256(audio) !== record.sourceAudioSha256 ||
        [envelope.value, ...(english ? [english.envelope] : [])].some(
          (sent) =>
            audio.length !== sent.originalAudioBytes ||
            !sameFile(record.sourceAudioPath, sent.originalAudioPath),
        )
      )
        problems.push("original_audio_file");
      inputs.originalAudio = {
        path: record.sourceAudioPath,
        sha256: sha256(audio),
      };
    }
    let generation = null;
    let scriptText = null;
    if (record.reconstructed === true) {
      const loaded = loadGeneration(record, problems);
      generation = loaded.generation;
      Object.assign(inputs, loaded.inputs);
    } else {
      snapshot ??= readJson(inventory.value.liveSnapshotPath);
      if (snapshot.sha256 !== inventory.value.liveSnapshotSha256)
        problems.push("live_snapshot_sha256");
      scriptText = loadScript(record, snapshot, problems);
      inputs.liveSnapshot = {
        path: inventory.value.liveSnapshotPath,
        sha256: snapshot.sha256,
      };
    }
    const certificateRecords = certificate.value.records.filter(
      (row) => row.sourceRecordId === record.sourceRecordId,
    );
    const report = alignSource({
      record,
      clock: clock.value.records.find(
        (row) => row.sourceRecordId === record.sourceRecordId,
      ),
      certificateRecords,
      envelope: envelope.value,
      raw: readable(raw.value),
      rawSha256: raw.sha256,
      english,
      generation,
      scriptText,
      policy,
      inputProblems: unique(problems),
    });
    report.inputs = inputs;
    const text = JSON.stringify(report, null, 1) + "\n";
    assertExistingStartsUntouched(certificateRecords, JSON.parse(text));
    const file = path.join(out, record.sourceRecordId + ".alignment.json");
    writeFileSync(file, text, { flag: "wx" });
    reports.push(report);
    perSource.push({
      sourceRecordId: record.sourceRecordId,
      report: { path: file, sha256: sha256(Buffer.from(text, "utf8")) },
      binding: report.binding.status,
      counts: report.counts,
    });
  }
  const starts = certificate.value.records.filter((row) => row.audioRange);
  const summary = {
    schemaVersion: 1,
    kind: "assemblyai_whole_original_alignment_summary",
    diagnosticOnly: true,
    admissionAuthority: false,
    writesDatabase: false,
    writesStorage: false,
    writesMedia: false,
    tool: { path: TOOL_PATH, sha256: sha256(readFileSync(TOOL_PATH)) },
    policy: reports[0].policy,
    policyDiffersFromPreregistered: reports[0].policyDiffersFromPreregistered,
    inputs: {
      inventory: { path: values.inventory, sha256: inventory.sha256 },
      certificate: { path: values.certificate, sha256: certificate.sha256 },
      clock: { path: values.clock, sha256: clock.sha256 },
    },
    certificate: {
      questions: certificate.value.records.length,
      existingStarts: starts.length,
      existingStartsSha256: sha256(
        JSON.stringify(
          starts.map((row) => [
            row.questionId,
            row.audioRange.startMs,
            row.audioRange.endMs,
          ]),
        ),
      ),
      held: certificate.value.records.filter((row) => row.status === "held")
        .length,
    },
    sources: perSource,
  };
  writeFileSync(
    path.join(out, "summary.json"),
    JSON.stringify(summary, null, 1) + "\n",
    { flag: "wx" },
  );
  writeFileSync(path.join(out, "REPORT.md"), markdown(summary, reports), {
    flag: "wx",
  });
  return summary;
}

const invoked =
  process.argv[1] && statSync(process.argv[1], { throwIfNoEntry: false });
if (
  invoked &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const summary = main(process.argv.slice(2));
  for (const source of summary.sources)
    console.log(
      source.sourceRecordId,
      source.binding,
      JSON.stringify(source.counts),
    );
}
