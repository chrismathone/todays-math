/**
 * Synthetic transcripts only: no corpus, network, GPU or provider call.
 * The spoken lines copy the forms the provider really wrote in the pilot
 * ("1번", "5번.", "1번입니다.", "19번과 20번은", "한 번씩만").
 */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  POLICY,
  alignSource,
  assertExistingStartsUntouched,
  findObservations,
  main,
  matchTokens,
  officialSections,
  reasonCategory,
  sha256,
  transcriptWords,
} from "./alignment.mjs";

const AUDIO = "a".repeat(64);
const PLAYBACK = "b".repeat(64);
const DOCUMENT = "d".repeat(64);
const RAW = "c".repeat(64);
const RAW_ENGLISH = "f".repeat(64);
const UPLOAD_URL = "https://cdn.example.invalid/upload/private-token-123";

const say = (text, at, options = {}) =>
  text.split(/\s+/).map((piece, k) => ({
    text: piece,
    start: at + 500 * k,
    end: at + 500 * k + 400,
    confidence: options.low?.[piece] ?? options.confidence ?? 0.95,
    speaker: null,
  }));

/**
 * Speaks the lines in order on one clock: 400 ms a word, 100 ms between words,
 * a pause before each line. Returns what the transcript that hears Korean
 * wrote (`words`) and what the English-only one wrote (`english`): no Korean
 * line, unless the line gives it words to write. Line options: pauseMs, low,
 * confidence; onlyInEnglish (the other transcript dropped it); english (other
 * words for the same speech); englishFirstWordMs / englishLastWordMs (that
 * word left early or late by the provider).
 */
function speak(lines) {
  const words = [];
  const english = [];
  let at = 10_000;
  for (const line of lines) {
    const [text, options = {}] = Array.isArray(line) ? line : [line];
    at += options.pauseMs ?? 1500;
    const spoken = say(text, at, options);
    if (!options.onlyInEnglish) words.push(...spoken);
    if (options.english !== undefined || !/[가-힣]/.test(text)) {
      const heard = say(options.english ?? text, at, { confidence: 0.99 });
      for (const [word, shift] of [
        [heard[0], options.englishFirstWordMs],
        [heard.at(-1), options.englishLastWordMs],
      ])
        if (shift) {
          word.start += shift;
          word.end += shift;
        }
      english.push(...heard);
    }
    at += 500 * spoken.length;
  }
  english.sort((a, b) => a.start - b.start);
  return { words, english };
}

/**
 * One whole source. `questions`: { id, shown, quotes?, existingStartMs?,
 * existingScope? } — `shown` is the current displayed number.
 */
function source({
  lines,
  questions,
  reconstructed = true,
  scriptText = null,
  dual = false,
}) {
  const { words, english } = speak(lines);
  const durationMs = Math.ceil((words.at(-1).end + 5000) / 1000) * 1000;
  const record = {
    sourceRecordId: "fixture-source",
    setId: "fixture-set",
    revision: 5,
    documentSha256: DOCUMENT,
    reconstructed,
    sourceAudioSha256: AUDIO,
    audio: { sha256: PLAYBACK, assetId: "fixture-asset", durationMs },
    questions: questions.map((q) => ({
      id: q.id,
      sourceNumber: q.shown,
      metadata: { sourceNumber: reconstructed ? null : q.shown },
    })),
  };
  const certificateRecords = questions.map((q) => ({
    sourceRecordId: record.sourceRecordId,
    setId: record.setId,
    revision: 5,
    documentSha256: DOCUMENT,
    questionId: q.id,
    sourceNumber: q.shown,
    provider: "fixture",
    sourceAudioSha256: AUDIO,
    playbackSha256: PLAYBACK,
    reconstructed,
    ...(q.existingStartMs === undefined
      ? { status: "held", reasons: ["provider_held:fixture"] }
      : {
          status: "preserved",
          reasons: [],
          audioRange: { endMs: durationMs, startMs: q.existingStartMs },
          ...(reconstructed
            ? {
                originalScopeEvidence: {
                  method: "fixture",
                  scopeQuestionNumbers: q.existingScope,
                },
              }
            : {}),
        }),
  }));
  return {
    record,
    clock: {
      sourceRecordId: record.sourceRecordId,
      status: "passed",
      sourceAudioSha256: AUDIO,
      playbackSha256: PLAYBACK,
      documentSha256: DOCUMENT,
      revision: 5,
      durationMs,
      sourceToPlaybackOffsetMs: 0,
    },
    certificateRecords,
    envelope: {
      schemaVersion: 1,
      provider: "assemblyai",
      sourceRecordId: record.sourceRecordId,
      sourceAudioSha256: AUDIO,
      playbackSha256: PLAYBACK,
      durationMs,
      request: {
        speech_models: ["universal-2"],
        language_codes: ["en", "ko"],
        punctuate: true,
        format_text: false,
      },
      requestedModel: "universal-2",
      actualModel: "universal-2",
      transcriptId: "transcript-1",
      raw: { path: "raw.json", sha256: RAW },
      wordCount: words.length,
      providerDurationSeconds: durationMs / 1000,
      writesDatabase: false,
      writesStorage: false,
      originalAudioModified: false,
      humanReviewed: false,
      alignmentVerified: false,
    },
    raw: {
      id: "transcript-1",
      status: "completed",
      words,
      audio_duration: durationMs / 1000,
      language_codes: ["en", "ko"],
      speech_model_used: "universal-2",
      audio_url: UPLOAD_URL,
    },
    rawSha256: RAW,
    generation: reconstructed
      ? new Map(
          questions
            .filter((q) => q.quotes)
            .map((q) => [
              q.id,
              {
                generatedOrdinal: q.shown,
                evidenceQuotes: q.quotes,
                included: true,
              },
            ]),
        )
      : null,
    scriptText,
    // The English-only transcript of the same bytes, as the provider shapes it.
    ...(dual
      ? {
          english: {
            envelope: {
              schemaVersion: 1,
              provider: "assemblyai",
              sourceRecordId: record.sourceRecordId,
              sourceAudioSha256: AUDIO,
              playbackSha256: PLAYBACK,
              durationMs,
              request: {
                speech_models: ["universal-3-5-pro"],
                language_code: "en",
                punctuate: true,
                format_text: false,
              },
              requestedModel: "universal-3-5-pro",
              actualModel: "universal-3-5-pro",
              transcriptId: "transcript-english",
              raw: { path: "english.raw.json", sha256: RAW_ENGLISH },
              wordCount: english.length,
              providerDurationSeconds: durationMs / 1000,
              writesDatabase: false,
              writesStorage: false,
              originalAudioModified: false,
              humanReviewed: false,
              alignmentVerified: false,
            },
            raw: {
              id: "transcript-english",
              status: "completed",
              words: english,
              audio_duration: durationMs / 1000,
              language_code: "en_us",
              speech_model_used: "universal-3-5-pro",
              audio_url: UPLOAD_URL,
            },
            rawSha256: RAW_ENGLISH,
          },
        }
      : {}),
  };
}

const PREAMBLE =
  "여러분 안녕하십니까? 답안지에 반, 번호 그리고 이름을 써넣으시기 바랍니다. 모든 문제는 한 번씩만 들려드리니 잘 듣고 지시에 따라 물음에 답하시기 바랍니다. 이제 시작하겠습니다.";
const H1 = "1번 대화를 듣고 여자가 구입할 시계를 고르시오.";
const D1 =
  "How may I help you? I'm looking for a clock for my new house. I'd like a square one.";
const H2 = "2번 대화를 듣고 여자가 전화한 목적으로 가장 적절한 것을 고르시오.";
const D2 =
  "Hello, this is Mega Home Shopping. The t-shirts you ordered will be delayed for a few days.";
const H3 = "3번 다음을 듣고 무엇에 관한 설명인지 고르시오.";
const D3 =
  "We offer a free shuttle bus every hour. The center is open from nine to seven.";
const H4 = "4번 대화를 듣고 두 사람의 관계로 가장 적절한 것을 고르시오.";
const D4 =
  "Thank you for being a guest on our show. Congratulations on your new book.";
const CLOSING =
  "수고하셨습니다. 이상으로 영어 듣기 능력평가를 모두 마치겠습니다.";
const LINES = [PREAMBLE, H1, D1, H2, D2, H3, D3, H4, D4, CLOSING];

const CLOCK = "I'm looking for a clock for my new house.";
const SHIRTS = "The t-shirts you ordered will be delayed for a few days.";
const BUS = "We offer a free shuttle bus every hour.";
const BOOK = "Congratulations on your new book.";

/** The shown numbers deliberately disagree with where the evidence is: b is shown as 2 and heard under 3. */
const QUESTIONS = [
  { id: "q-a", shown: 1, quotes: [CLOCK] },
  { id: "q-b", shown: 2, quotes: [BUS] },
  { id: "q-c", shown: 3, quotes: [SHIRTS] },
  { id: "q-d", shown: 4, quotes: [BOOK] },
];

const replace = (lines, from, ...to) =>
  lines.flatMap((line) => (line === from ? to : [line]));
const row = (report, id) => report.questions.find((q) => q.questionId === id);
const run = (options, change) => {
  const input = source({ lines: LINES, questions: QUESTIONS, ...options });
  change?.(input);
  return { input, report: alignSource(input) };
};
const wordIndex = (input, text, nth = 0) =>
  input.raw.words.flatMap((word, index) => (word.text === text ? [index] : []))[
    nth
  ];

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of value instanceof Map
      ? value.values()
      : Object.values(value))
      deepFreeze(item);
  }
  return value;
}

// ------------------------------------------------------------- identity ----

test("a reconstructed question is placed by its quotes, never by its shown number", () => {
  const { input, report } = run();
  assert.equal(report.binding.status, "passed");
  assert.deepEqual(report.counts, {
    questions: 4,
    existingStartsPreserved: 0,
    candidates: 4,
    held: 0,
    heldByClass: {
      binding: 0,
      structure: 0,
      provider_timing: 0,
      confidence_only: 0,
    },
  });
  // Shown as 2, heard under "3번"; shown as 3, heard under "2번".
  assert.deepEqual(row(report, "q-b").candidate.originalScopeNumbers, [3]);
  assert.deepEqual(row(report, "q-c").candidate.originalScopeNumbers, [2]);
  assert.deepEqual(row(report, "q-a").candidate.originalScopeNumbers, [1]);
  assert.deepEqual(row(report, "q-d").candidate.originalScopeNumbers, [4]);

  const b = row(report, "q-b");
  const heading = wordIndex(input, "3번");
  assert.deepEqual(b.evidence.passage.announcement.wordIndexes, [
    heading,
    heading,
  ]);
  assert.equal(b.evidence.passage.announcement.quote, "3번");
  assert.equal(
    b.evidence.passage.instruction.quote,
    "다음을 듣고 무엇에 관한 설명인지 고르시오.",
  );
  const [occurrence] = b.evidence.quotes[0].occurrences;
  assert.equal(occurrence.transcriptQuote, BUS);
  assert.equal(input.raw.words[occurrence.wordIndexes[0]].text, "We");
  assert.equal(input.raw.words[occurrence.wordIndexes[1]].text, "hour.");
  assert.equal(occurrence.placement, "inside");
  assert.deepEqual(b.evidence.passage.boundedBy.numbers, [4]);
  // The announcement is a window between the neighbouring words, not a point.
  assert.deepEqual(b.candidate.announcementSearchWindowMs, {
    fromMs: input.raw.words[heading - 1].end,
    toMs: input.raw.words[heading + 1].start,
  });
  assert.equal(b.candidate.wholeOriginalEndMs, input.record.audio.durationMs);
  assert.equal(b.candidate.providerTimeIsAnEstimateNotAMeasuredOnset, true);
  assert.equal(
    d(report).evidence.passage.boundedBy.kind,
    "closing_announcement",
  );
  function d(r) {
    return row(r, "q-d");
  }
});

test("a shown number that was announced perfectly proves nothing without generation evidence", () => {
  const questions = [
    ...QUESTIONS.slice(0, 3),
    { id: "q-d", shown: 4 }, // no quotes at all
    {
      id: "q-e",
      shown: 2,
      quotes: ["I would like to return this sweater today."],
    },
    { id: "q-f", shown: 3, quotes: [] },
  ];
  const { report } = run({ questions });
  // "4번", "2번" and "3번" are all written and established; none is used.
  for (const [id, reason] of [
    ["q-d", "generation_evidence_missing"],
    ["q-e", "generation_quote_missing_in_transcript"],
    ["q-f", "generation_evidence_missing"],
  ]) {
    const question = row(report, id);
    assert.equal(question.outcome, "held");
    assert.deepEqual(question.reasons, [reason]);
    assert.equal(question.candidate, undefined);
    assert.equal(question.evidence?.passage ?? null, null);
  }
  // One word in common with the transcript is not even worth a hint.
  assert.equal(
    row(report, "q-e").evidence.quotes[0].longestExactRunNotEvidence,
    null,
  );
});

test("quotes are compared word for word: a respelled or reworded quote is missing", () => {
  const questions = [
    {
      id: "q-a",
      shown: 1,
      quotes: ["I am looking for a clock for my new house."],
    },
    { id: "q-b", shown: 2, quotes: ["We offer a free shuttle bus each hour."] },
    {
      id: "q-c",
      shown: 3,
      quotes: ["the T-SHIRTS you ordered, will be delayed for a few days"],
    },
    { id: "q-d", shown: 4, quotes: [BOOK] },
  ];
  const { report } = run({ questions });
  assert.deepEqual(row(report, "q-a").reasons, [
    "generation_quote_missing_in_transcript",
  ]);
  assert.deepEqual(row(report, "q-b").reasons, [
    "generation_quote_missing_in_transcript",
  ]);
  // Case and punctuation are not words.
  assert.equal(row(report, "q-c").outcome, "candidate");
  const run7 = row(report, "q-b").evidence.quotes[0].longestExactRunNotEvidence;
  assert.equal(run7.tokens, 6);
  assert.equal(run7.transcriptQuote, "We offer a free shuttle bus");
  assert.deepEqual(matchTokens("It’s 7:10, isn't it?"), [
    "its",
    "7",
    "10",
    "isnt",
    "it",
  ]);
});

test("a short quote cannot anchor a question and must be heard in the anchored passage", () => {
  const short = run({
    questions: [
      { id: "q-a", shown: 1, quotes: ["a square one."] },
      ...QUESTIONS.slice(1),
    ],
  });
  assert.deepEqual(row(short.report, "q-a").reasons, [
    "generation_quotes_too_short_to_anchor",
  ]);
  const supported = run({
    questions: [
      { id: "q-a", shown: 1, quotes: [CLOCK, "a square one."] },
      ...QUESTIONS.slice(1),
    ],
  });
  assert.equal(row(supported.report, "q-a").outcome, "candidate");
  const elsewhere = run({
    questions: [
      { id: "q-a", shown: 1, quotes: [CLOCK, "nine to seven."] },
      ...QUESTIONS.slice(1),
    ],
  });
  assert.deepEqual(row(elsewhere.report, "q-a").reasons, [
    "supporting_quote_not_heard_in_passage",
  ]);
});

// ---------------------------------------------------- repeats and bounds ----

test("a number announced twice is not chosen between", () => {
  const again = "2번 대화를 듣고 남자가 할 일로 가장 적절한 것을 고르시오.";
  const lines = replace(
    LINES,
    H4,
    again,
    "Could you send them as soon as possible please?",
    H4,
  );
  const { report } = run({ lines });
  const c = row(report, "q-c"); // heard under the first "2번"
  assert.equal(c.outcome, "held");
  assert.equal(c.holdClass, "structure");
  assert.ok(c.reasons.includes("number_announced_more_than_once"));
  assert.equal(c.evidence.passage.announcement.quote, "2번");
  // Its neighbours lose their bound with it; "3번" is followed by a lower number.
  assert.ok(
    row(report, "q-a").reasons.includes("next_announcement_unreliable"),
  );
  const b = row(report, "q-b");
  assert.ok(b.reasons.includes("next_announcement_not_contiguous"));
  assert.ok(b.reasons.includes("numbering_order_conflict"));
  assert.equal(report.counts.candidates, 1);
  assert.equal(row(report, "q-d").outcome, "candidate");
});

test("a number written twice in a row is a repeat, not a heading for two questions", () => {
  const lines = replace(
    LINES,
    H2,
    "2번입니다.",
    "2번입니다. 대화를 듣고 여자가 전화한 목적을 고르세요.",
  );
  const { report } = run({ lines });
  assert.ok(
    row(report, "q-c").reasons.includes("number_announced_more_than_once"),
  );
  assert.equal(report.observations.filter((o) => o.kind === "multi").length, 0);
  assert.equal(report.observations.filter((o) => o.numbers[0] === 2).length, 2);
});

test("a quote that runs across the next announcement is refused", () => {
  const crossing = "I'd like a square one. 2번 대화를 듣고";
  const { report } = run({
    questions: [
      { id: "q-a", shown: 1, quotes: [crossing] },
      ...QUESTIONS.slice(1),
    ],
  });
  const a = row(report, "q-a");
  assert.equal(a.outcome, "held");
  assert.deepEqual(a.reasons, ["generation_quote_crosses_announcement"]);
  assert.equal(
    a.evidence.quotes[0].occurrences[0].placement,
    "crosses_announcement",
  );
  assert.equal(a.evidence.passage, null);
});

test("quotes heard in two passages, before the first number or after the closing hold the question", () => {
  const two = run({
    questions: [
      { id: "q-a", shown: 1, quotes: [CLOCK, BUS] },
      ...QUESTIONS.slice(1),
    ],
  });
  assert.deepEqual(row(two.report, "q-a").reasons, [
    "generation_quotes_in_different_passages",
  ]);

  const repeated = run({ lines: replace(LINES, D3, D3 + " " + CLOCK) });
  assert.deepEqual(row(repeated.report, "q-a").reasons, [
    "generation_quotes_in_different_passages",
  ]);

  const before = run({
    lines: ["Welcome to the listening test for today everyone.", ...LINES],
    questions: [
      {
        id: "q-a",
        shown: 1,
        quotes: ["Welcome to the listening test for today everyone."],
      },
      ...QUESTIONS.slice(1),
    ],
  });
  assert.deepEqual(row(before.report, "q-a").reasons, [
    "generation_quote_outside_any_passage",
  ]);

  const after = run({
    lines: [...LINES, "Please hand in your answer sheets now."],
    questions: [
      ...QUESTIONS.slice(0, 3),
      {
        id: "q-d",
        shown: 4,
        quotes: ["Please hand in your answer sheets now."],
      },
    ],
  });
  assert.deepEqual(row(after.report, "q-d").reasons, [
    "generation_quote_outside_any_passage",
  ]);
});

test("a passage is bounded only by the very next number or the closing announcement", () => {
  // "3번" was not written: what follows "2번" may belong to either.
  const missing = run({ lines: LINES.filter((line) => line !== H3) });
  const c = row(missing.report, "q-c");
  assert.ok(c.reasons.includes("next_announcement_not_contiguous"));
  // The lost heading left its instruction's dialogue inside the passage of "2번".
  const b = row(missing.report, "q-b");
  assert.deepEqual(b.evidence.passage.spokenNumbers, [2]);
  assert.equal(b.outcome, "held");

  // Only the number was lost; its instruction sentence is still there.
  const instructionLeft = run({
    lines: replace(LINES, H3, "다음을 듣고 무엇에 관한 설명인지 고르시오."),
  });
  assert.ok(
    row(instructionLeft.report, "q-c").reasons.includes(
      "second_instruction_inside_passage",
    ),
  );

  const noClosing = run({ lines: LINES.filter((line) => line !== CLOSING) });
  assert.deepEqual(row(noClosing.report, "q-d").reasons, [
    "passage_end_not_marked",
  ]);
  assert.equal(noClosing.report.counts.candidates, 3);
});

// ------------------------------------------------- numbers and confidence ----

test("counting words, number mentions and option numbers are not announcements", () => {
  const lines = [
    PREAMBLE,
    "1번부터 4번까지는 듣고 답하는 문제입니다. 두 번 들려주지 않습니다.",
    H1,
    D1 +
      " This is my third time. 휴대전화번호를 알려주세요. 세 번째 시도입니다. 3번째 줄에 서세요.",
    H2,
    D2,
    H3,
    "Number 1. " + D3 + " Number 2. Press 1. to continue please.",
    H4,
    D4,
    CLOSING,
  ];
  const { report } = run({ lines });
  assert.equal(report.counts.candidates, 4);
  assert.deepEqual(
    report.passages.map((p) => [p.kind, p.spokenNumbers.join()]),
    [
      ["single", "1"],
      ["single", "2"],
      ["single", "3"],
      ["single", "4"],
    ],
  );
  assert.deepEqual(
    report.observations.filter((o) => o.kind === "mention").map((o) => o.quote),
    ["1번부터 4번까지는", "3번째"],
  );
});

test("the same digits without an instruction make the number ambiguous", () => {
  // "두 번 들려줍니다" written with a digit by the recognizer.
  const { report } = run({ lines: replace(LINES, H1, "2번 들려줍니다.", H1) });
  const c = row(report, "q-c");
  assert.ok(c.reasons.includes("number_announced_more_than_once"));
  assert.ok(row(report, "q-a").reasons.includes("numbering_order_conflict"));
});

test("a number without its instruction, in bare digits or out of order is not established", () => {
  const noInstruction = run({ lines: replace(LINES, H3, "3번") });
  assert.ok(
    row(noInstruction.report, "q-b").reasons.includes(
      "instruction_context_missing",
    ),
  );
  assert.ok(
    row(noInstruction.report, "q-c").reasons.includes(
      "next_announcement_unreliable",
    ),
  );

  const lateInstruction = run({
    lines: replace(LINES, H3, "3번", [
      "다음을 듣고 무엇에 관한 설명인지 고르시오.",
      { pauseMs: 9000 },
    ]),
  });
  // The provider left the number nine seconds before the sentence after it:
  // what follows it directly is not measured, and that is not called structure.
  const late = row(lateInstruction.report, "q-b");
  assert.deepEqual(late.reasons, ["instruction_after_unmeasured_provider_gap"]);
  assert.equal(late.holdClass, "provider_timing");
  assert.equal(late.evidence.passage.instruction.providerGapMs, 9000 + 100);
  const beforeIt = row(lateInstruction.report, "q-c");
  assert.deepEqual(beforeIt.reasons, ["next_announcement_timing_unmeasured"]);
  assert.equal(beforeIt.holdClass, "provider_timing");
  assert.equal(reasonCategory(late.reasons[0]), "timing");
  // A bare digit is a heading only when its instruction follows at once.
  const lateBare = run({
    lines: replace(LINES, H3, "3.", [
      "다음을 듣고 무엇에 관한 설명인지 고르시오.",
      { pauseMs: 9000 },
    ]),
  });
  assert.equal(
    lateBare.report.passages.some((p) => p.spokenNumbers[0] === 3),
    false,
  );

  const bare = run({ lines: replace(LINES, H3, H3.replace("3번", "3.")) });
  const b = row(bare.report, "q-b");
  assert.ok(b.reasons.includes("number_written_as_bare_digits"));
  assert.equal(b.evidence.passage.kind, "bare");
  assert.equal(b.candidate, undefined);

  const swapped = run({
    lines: [PREAMBLE, H1, D1, H3, D3, H2, D2, H4, D4, CLOSING],
  });
  for (const id of ["q-b", "q-c"])
    assert.ok(
      row(swapped.report, id).reasons.includes("numbering_order_conflict"),
    );
  assert.ok(
    row(swapped.report, "q-a").reasons.includes(
      "next_announcement_not_contiguous",
    ),
  );
  // "4번" after them is announced in order and bounded by the closing.
  assert.equal(swapped.report.counts.candidates, 1);
  assert.equal(row(swapped.report, "q-d").outcome, "candidate");
});

test("provider doubt holds a row and is told apart from a structural hold", () => {
  const { report } = run({
    lines: replace(LINES, H3, [H3, { low: { "3번": 0.63 } }]),
  });
  const b = row(report, "q-b"); // heard under "3번"
  assert.equal(b.outcome, "held");
  assert.deepEqual(b.reasons, ["ordinal_low_confidence"]);
  assert.equal(b.holdClass, "confidence_only");
  // The passage before it is bounded by that doubted number.
  const c = row(report, "q-c");
  assert.deepEqual(c.reasons, ["next_announcement_low_confidence"]);
  assert.equal(c.holdClass, "confidence_only");
  assert.deepEqual(report.counts.heldByClass, {
    binding: 0,
    structure: 0,
    provider_timing: 0,
    confidence_only: 2,
  });
  // The evidence is still written out, with the doubted value.
  assert.equal(b.evidence.passage.announcement.minConfidence, 0.63);

  const instruction = run({
    lines: replace(LINES, H3, [H3, { low: { "고르시오.": 0.4 } }]),
  });
  assert.deepEqual(row(instruction.report, "q-b").reasons, [
    "instruction_low_confidence",
  ]);

  const quote = run({
    lines: replace(LINES, D3, [D3, { low: { shuttle: 0.2 } }]),
  });
  assert.deepEqual(row(quote.report, "q-b").reasons, ["quote_low_confidence"]);

  assert.equal(reasonCategory("ordinal_low_confidence"), "confidence");
  assert.equal(reasonCategory("number_announced_more_than_once"), "structure");
  assert.equal(reasonCategory("binding_failed:playback_sha256"), "binding");
});

test("a changed policy is recorded, and confidence never rescues a structural hold", () => {
  const lines = replace(LINES, H3, [
    H3.replace("3번", "3."),
    { low: { "3.": 0.63 } },
  ]);
  const strict = run({ lines });
  assert.deepEqual(strict.report.policyDiffersFromPreregistered, []);
  const loose = run({ lines }, (input) => {
    input.policy = {
      minOrdinalConfidence: 0,
      minInstructionConfidence: 0,
      minQuoteWordConfidence: 0,
    };
  });
  assert.deepEqual(loose.report.policyDiffersFromPreregistered, [
    "minOrdinalConfidence",
    "minInstructionConfidence",
    "minQuoteWordConfidence",
  ]);
  assert.deepEqual(row(loose.report, "q-b").reasons, [
    "number_written_as_bare_digits",
  ]);

  const doubted = replace(LINES, H3, [H3, { low: { "3번": 0.63 } }]);
  const rescued = run({ lines: doubted }, (input) => {
    input.policy = { minOrdinalConfidence: 0.5 };
  });
  assert.equal(rescued.report.counts.candidates, 4);
  assert.deepEqual(rescued.report.policyDiffersFromPreregistered, [
    "minOrdinalConfidence",
  ]);
  assert.equal(POLICY.minOrdinalConfidence, 0.8);
});

// ------------------------------------------------------- hash and clock ----

test("a transcript of another recording, clock or certificate is not read at all", () => {
  const changes = {
    source_audio_sha256: (i) => (i.envelope.sourceAudioSha256 = "e".repeat(64)),
    playback_sha256: (i) => (i.envelope.playbackSha256 = "e".repeat(64)),
    playback_duration_ms: (i) => (i.envelope.durationMs += 40),
    clock_passed_without_offset: (i) =>
      (i.clock.sourceToPlaybackOffsetMs = 120),
    clock_document: (i) => (i.clock.revision = 6),
    raw_response_sha256: (i) => (i.rawSha256 = "e".repeat(64)),
    transcript_id: (i) => (i.raw.id = "transcript-2"),
    transcript_completed: (i) => (i.raw.status = "processing"),
    speech_model: (i) => (i.raw.speech_model_used = "universal-3-pro"),
    language_codes: (i) => (i.raw.language_codes = ["ko"]),
    word_count: (i) => (i.envelope.wordCount += 1),
    provider_duration: (i) => {
      i.raw.audio_duration += 5;
      i.envelope.providerDurationSeconds += 5;
    },
    original_audio_not_modified: (i) =>
      (i.envelope.originalAudioModified = true),
    certificate_rows_bound: (i) =>
      (i.certificateRecords[2].playbackSha256 = "e".repeat(64)),
    transcript_words_valid: (i) =>
      (i.raw.words[40].start = i.raw.words[39].start - 1),
    words_within_duration: (i) =>
      (i.raw.words.at(-1).end = i.envelope.durationMs + 9000),
    original_audio_file: (i) => (i.inputProblems = ["original_audio_file"]),
  };
  for (const [name, change] of Object.entries(changes)) {
    const { report } = run({}, change);
    assert.equal(report.binding.status, "failed", name);
    assert.ok(report.binding.reasons.includes("binding_failed:" + name), name);
    assert.equal(report.counts.candidates, 0, name);
    assert.deepEqual(
      report.counts.heldByClass,
      { binding: 4, structure: 0, provider_timing: 0, confidence_only: 0 },
      name,
    );
    assert.deepEqual(report.observations, [], name);
    assert.deepEqual(report.passages, [], name);
    for (const question of report.questions)
      assert.equal(question.evidence, null, name);
  }
  const stopped = run({}, (i) => (i.clock.status = "failed"));
  assert.ok(
    stopped.report.binding.reasons.includes(
      "binding_failed:clock_passed_without_offset",
    ),
  );
});

test("an existing start outside the window of its own number stops the whole source", () => {
  const probe = source({ lines: LINES, questions: QUESTIONS });
  const heading = wordIndex(probe, "2번");
  const spoken = probe.raw.words[heading].start;
  const questions = (startMs) => [
    QUESTIONS[0],
    QUESTIONS[1],
    { id: "q-c", shown: 3, existingStartMs: startMs, existingScope: [2] },
    QUESTIONS[3],
    // A second current question of the same original passage, still held.
    { id: "q-e", shown: 5, quotes: ["Hello, this is Mega Home Shopping."] },
  ];
  const agrees = run({ questions: questions(spoken - 380) });
  assert.deepEqual(
    agrees.report.existingStartChecks.map((entry) => [
      entry.scope,
      entry.status,
    ]),
    [[[2], "agrees"]],
  );
  assert.equal(
    agrees.report.existingStartChecks[0].providerTokenStartMinusExistingMs,
    380,
  );
  const e = row(agrees.report, "q-e");
  assert.equal(e.outcome, "candidate");
  assert.deepEqual(e.candidate.originalScopeNumbers, [2]);
  assert.deepEqual(e.candidate.sharesExistingStart, {
    startMs: spoken - 380,
    questionIds: ["q-c"],
  });
  assert.equal(agrees.report.counts.candidates, 4);

  // The same transcript against a start 20 s away: another clock, or another number.
  const disagrees = run({ questions: questions(spoken + 20_000) });
  assert.equal(disagrees.report.existingStartChecks[0].status, "disagrees");
  assert.equal(disagrees.report.counts.candidates, 0);
  for (const id of ["q-a", "q-b", "q-d", "q-e"]) {
    assert.deepEqual(row(disagrees.report, id).reasons, [
      "source_existing_start_outside_announcement_window",
    ]);
    assert.equal(row(disagrees.report, id).holdClass, "binding");
  }
});

test("a proposal may not fall on the wrong side of an existing start", () => {
  const probe = source({ lines: LINES, questions: QUESTIONS });
  const afterEverything =
    probe.raw.words[wordIndex(probe, "4번")].start + 60_000;
  // Scope 9 does not exist in this transcript, so its start is not comparable;
  // but nothing numbered below 9 may begin after it... and scope 1 may not begin after scope 0.
  const { report } = run({
    questions: [
      ...QUESTIONS,
      {
        id: "q-x",
        shown: 9,
        existingStartMs: afterEverything,
        existingScope: [1, 2],
      },
    ],
  });
  assert.equal(report.existingStartChecks[0].status, "not_comparable");
  assert.ok(
    row(report, "q-a").reasons.includes("overlaps_existing_start_scope"),
  );
  assert.ok(
    row(report, "q-c").reasons.includes("overlaps_existing_start_scope"),
  );
  // Passages 3 and 4 lie before a start that belongs to lower numbers.
  assert.deepEqual(row(report, "q-b").reasons, [
    "conflicts_with_existing_start_order",
  ]);
  assert.deepEqual(row(report, "q-d").reasons, [
    "conflicts_with_existing_start_order",
  ]);

  // And the other way: a start of a higher number that lies before them all.
  const early = run({
    questions: [
      ...QUESTIONS,
      { id: "q-y", shown: 9, existingStartMs: 1000, existingScope: [9] },
    ],
  });
  assert.equal(early.report.existingStartChecks[0].status, "not_comparable");
  for (const id of ["q-a", "q-b", "q-c", "q-d"])
    assert.deepEqual(row(early.report, id).reasons, [
      "conflicts_with_existing_start_order",
    ]);
});

// ------------------------------------------------------- existing starts ----

test("a question that already has a start is echoed exactly and never proposed", () => {
  const probe = source({ lines: LINES, questions: QUESTIONS });
  const startMs = probe.raw.words[wordIndex(probe, "3번")].start - 380;
  const questions = [
    QUESTIONS[0],
    // Its quotes would place it perfectly; it is not a subject.
    {
      id: "q-b",
      shown: 2,
      quotes: [BUS],
      existingStartMs: startMs,
      existingScope: [3],
    },
    QUESTIONS[2],
    QUESTIONS[3],
  ];
  const input = deepFreeze(source({ lines: LINES, questions }));
  const before = JSON.stringify(input.certificateRecords);
  const report = alignSource(input); // frozen: any write to an input throws
  assert.equal(JSON.stringify(input.certificateRecords), before);
  const b = row(report, "q-b");
  assert.deepEqual(Object.keys(b), [
    "questionId",
    "displayedNumber",
    "reconstructed",
    "certificateStatus",
    "outcome",
    "existingAudioRange",
  ]);
  assert.equal(b.outcome, "existing_start_preserved");
  assert.deepEqual(b.existingAudioRange, {
    endMs: input.record.audio.durationMs,
    startMs,
  });
  assert.equal(report.counts.existingStartsPreserved, 1);
  assert.equal(report.counts.candidates, 3);
  for (const question of report.questions)
    assert.equal("audioRange" in question, false);
  assert.doesNotThrow(() =>
    assertExistingStartsUntouched(input.certificateRecords, report),
  );

  const doctor = (change) => {
    const copy = structuredClone(report);
    change(copy);
    return () => assertExistingStartsUntouched(input.certificateRecords, copy);
  };
  const find = (copy, id) => copy.questions.find((q) => q.questionId === id);
  assert.throws(
    doctor((c) => (find(c, "q-b").existingAudioRange.startMs += 1)),
    /Existing start touched/,
  );
  assert.throws(
    doctor((c) => (find(c, "q-b").existingAudioRange.endMs -= 1000)),
    /Existing start touched/,
  );
  assert.throws(
    doctor((c) => (find(c, "q-b").candidate = find(c, "q-a").candidate)),
    /Existing start touched/,
  );
  assert.throws(
    doctor((c) => (find(c, "q-b").outcome = "candidate")),
    /Existing start touched/,
  );
  assert.throws(
    doctor((c) => delete find(c, "q-b").existingAudioRange),
    /Existing start touched/,
  );
  assert.throws(
    doctor((c) => (find(c, "q-a").audioRange = { startMs: 1, endMs: 2 })),
    /carries an audioRange/,
  );
  assert.throws(
    doctor(
      (c) => (find(c, "q-a").existingAudioRange = { startMs: 1, endMs: 2 }),
    ),
    /Held question given a start/,
  );
  assert.throws(
    doctor((c) => c.questions.pop()),
    /does not cover/,
  );
  assert.throws(
    doctor((c) => (c.questions[3] = c.questions[0])),
    /does not cover|missing/,
  );
});

test("a certificate row whose state and range disagree is not trusted", () => {
  const heldWithRange = run({}, (i) => {
    i.certificateRecords[1].audioRange = {
      startMs: 5000,
      endMs: i.record.audio.durationMs,
    };
  });
  assert.ok(
    heldWithRange.report.binding.reasons.includes(
      "binding_failed:certificate_row_states",
    ),
  );
  assert.equal(heldWithRange.report.counts.candidates, 0);

  const clipped = run(
    {
      questions: [
        { ...QUESTIONS[0], existingStartMs: 5000, existingScope: [1] },
        ...QUESTIONS.slice(1),
      ],
    },
    (i) => (i.certificateRecords[0].audioRange.endMs -= 60_000), // not the whole original
  );
  assert.ok(
    clipped.report.binding.reasons.includes(
      "binding_failed:certificate_row_states",
    ),
  );
});

// ---------------------------------------------------------- shared scopes ----

test("one heading for two numbers is a shared scope; its members are not repeats", () => {
  const lines = [
    PREAMBLE,
    H1,
    D1,
    H2,
    D2,
    "3번과 4번, 다음을 듣고 물음에 답하시오.",
    "Good morning, class. Today we're going to look at the history of ocean exploration.",
    "3번. 여자가 하는 말의 주제로 가장 적절한 것을 고르시오.",
    "4번. 항해를 했던 사람들로 언급되지 않은 것을 고르시요.",
    CLOSING,
  ];
  const questions = [
    { id: "q-a", shown: 1, quotes: [CLOCK] },
    {
      id: "q-b",
      shown: 2,
      quotes: [
        "Today we're going to look at the history of ocean exploration.",
      ],
    },
    { id: "q-c", shown: 3, quotes: [SHIRTS] },
    {
      id: "q-d",
      shown: 4,
      quotes: ["Good morning, class. Today we're going to look at the history"],
    },
  ];
  const { input, report } = run({ lines, questions });
  assert.deepEqual(
    report.passages.map((p) => [p.kind, p.spokenNumbers.join()]),
    [
      ["single", "1"],
      ["single", "2"],
      ["shared_passage", "3,4"],
      ["shared_passage_member", "3"],
      ["shared_passage_member", "4"],
    ],
  );
  for (const id of ["q-b", "q-d"]) {
    const question = row(report, id);
    assert.equal(question.outcome, "candidate");
    assert.deepEqual(question.candidate.originalScopeNumbers, [3, 4]);
    assert.equal(question.candidate.evidenceGrade, "shared_passage_heading");
    assert.equal(question.evidence.passage.announcement.quote, "3번과 4번,");
  }
  const heading = wordIndex(input, "3번과");
  assert.equal(
    row(report, "q-b").candidate.announcementSearchWindowMs.fromMs,
    input.raw.words[heading - 1].end,
  );
  // "2번" is bounded by the shared heading that starts at 3.
  assert.equal(row(report, "q-c").outcome, "candidate");
  assert.equal(report.counts.candidates, 4);
});

test("one instruction for two numbers, then each number with its own dialogue", () => {
  const lines = [
    PREAMBLE,
    H1,
    D1,
    H2,
    D2,
    "3번과 4번은 대화를 듣고 남자의 마지막 말에 이어질 여자의 응답으로 가장 알맞은 것을 고르는 문제입니다. 잘 듣고 답하세요.",
    "3번입니다.",
    D3,
    "4번입니다.",
    D4,
    CLOSING,
  ];
  const { report } = run({ lines });
  assert.deepEqual(
    report.passages.slice(2).map((p) => [p.kind, p.spokenNumbers.join()]),
    [
      ["shared_instruction_head", "3,4"],
      ["shared_instruction_member", "3"],
      ["shared_instruction_member", "4"],
    ],
  );
  const b = row(report, "q-b");
  assert.equal(b.outcome, "candidate");
  assert.deepEqual(b.candidate.originalScopeNumbers, [3]);
  assert.equal(b.candidate.evidenceGrade, "shared_instruction_member_cue");
  assert.equal(b.evidence.passage.announcement.quote, "3번입니다.");
  assert.equal(b.evidence.passage.instruction, null);
  assert.equal(b.evidence.passage.sharedHeading.quote, "3번과 4번은");
  assert.match(
    b.evidence.passage.sharedHeading.instruction.quote,
    /답하세요\.$/,
  );
  assert.deepEqual(row(report, "q-d").candidate.originalScopeNumbers, [4]);

  // Without the shared instruction a bare "3번입니다." has no instruction of its own.
  const alone = run({
    lines: lines.filter((line) => !line.startsWith("3번과")),
  });
  assert.ok(
    row(alone.report, "q-b").reasons.includes("instruction_context_missing"),
  );

  // A member that was not written leaves the dialogues of both under the heading.
  const lost = run({ lines: lines.filter((line) => line !== "3번입니다.") });
  assert.equal(row(lost.report, "q-b").outcome, "held");
  assert.ok(
    row(lost.report, "q-b").reasons.includes(
      "next_announcement_not_contiguous",
    ),
  );
});

// --------------------------------------------------------------- official ----

const SCRIPT = [
  "ⓒ 본 평가 문항의 저작권은 교육청에 있습니다.(고3) - 1 -  시그널 IN ANN : 여러분 안녕하십니까? 시그널 OUT ANN : 이제 시작하겠습니다.",
  "ⓒ 본 평가 문항의 저작권은 교육청에 있습니다.(고3) - 2 -  1번 대화를 듣고, 남자의 마지막 말에 대한 여자의 응답으로 가장 적절한 것을 고르시오. M:   Ms. Smith, how is your stay? Is there anything I can help you with? W: Well, I have some valuables with me. M:   The hotel has a safe. Would you like to use it? W: ______________________ 2번 대화를 듣고, 여자의 마지막 말에 대한 남자의 응답으로 가장 적절한 것을 고르시오. W: Excuse me. I have to get to London by eleven. M:   Hold on, please. [ Typing sound]   You’ve just missed one. 3번 다음을 듣고, 여자가 하는 말의 주제로 가장 적절한 것을 고르시오. W: Hi,   what   did   you   have   for   dessert   today? Dessert has become a habit for some people. 【4-5】 다음을 듣고, 물음에 답하시오. W: Good morning class! Today we’re going to look at the history of ocean exploration. 4번   여자가 하는 말의 주제로 가장 적절한 것을 고르시오. 5번 항해를 했던 사람들로 언급되지 않은 것을 고르시오.",
  "ⓒ 본 평가 문항의 저작권은 교육청에 있습니다.(고3) - 3 -  시그널 IN ANN : 수고하셨습니다. 시그널 OUT",
].join("\n");

const O1 =
  "1번 대화를 듣고 남자의 마지막 말에 대한 여자의 응답으로 가장 적절한 것을 고르시오";
const OD1 =
  "미스 스미스, 어떻게 지내고 있나요? 제가 도움이 되었나요? The hotel has a safe. Would you like to use it?";
const O2 =
  "2번. 대화를 듣고 여자의 마지막 말에 대한 남자의 응답으로 가장 적절한 것을 고르시오.";
const OD2 =
  "Excuse me. I have to get to London by eleven. Hold on, please. You've just missed one.";
const O3 = "3번 다음을 듣고 여자가 하는 말의 주제로 가장 적절한 것을 고르시오.";
const OD3 =
  "Hi, what did you have for dessert today? Dessert has become a habit for some people.";
const O45 = "4번과 5번, 다음을 듣고 물음에 답하시오.";
const OD45 =
  "Good morning, class. Today we're going to look at the history of ocean exploration.";
const O4 = "4번. 여자가 하는 말의 주제로 가장 적절한 것을 고르시오.";
const O5 = "5번. 항해를 했던 사람들로 언급되지 않은 것을 고르시요.";
/** What the English-only transcript wrote where the other wrote Korean for English speech. */
const OD1_ENGLISH =
  "Ms. Smith, how is your stay? The hotel has a safe. Would you like to use it?";
const OFFICIAL_LINES = [
  "이제 시작하겠습니다",
  O1,
  [OD1, { english: OD1_ENGLISH }],
  O2,
  OD2,
  O3,
  OD3,
  O45,
  OD45,
  O4,
  O5,
  CLOSING,
];
const OFFICIAL = [1, 2, 3, 4, 5].map((shown) => ({ id: "o-" + shown, shown }));
const official = (options = {}, change) =>
  run(
    {
      reconstructed: false,
      lines: OFFICIAL_LINES,
      questions: OFFICIAL,
      scriptText: SCRIPT,
      ...options,
    },
    change,
  );

test("the official script is cut at its own numbers into sections with their sentences", () => {
  const { sections, reason } = officialSections(SCRIPT, [1, 2, 3, 4, 5]);
  assert.equal(reason, null);
  assert.deepEqual(sections.get(1).scope, [1]);
  assert.deepEqual(
    sections.get(1).anchors.map((anchor) => anchor.text),
    [
      "Smith, how is your stay?",
      "Is there anything I can help you with?",
      "Well, I have some valuables with me.",
      "The hotel has a safe.",
      "Would you like to use it?",
    ],
  );
  assert.deepEqual(
    sections.get(2).anchors.map((anchor) => anchor.text),
    ["I have to get to London by eleven.", "You’ve just missed one."],
  );
  assert.deepEqual(sections.get(4).scope, [4, 5]);
  assert.deepEqual(sections.get(5).scope, [4, 5]);
  assert.equal(sections.get(4).anchors.length, 1);
  assert.equal(
    sections.get(4).instructionText,
    "다음을 듣고, 물음에 답하시오.",
  );
  // A sentence the script prints twice identifies no section.
  const twice = SCRIPT.replace(
    "Dessert has become a habit for some people.",
    "Would you like to use it?",
  );
  assert.deepEqual(
    officialSections(twice, [1, 2, 3, 4, 5])
      .sections.get(1)
      .anchors.map((a) => a.text)
      .slice(-1),
    ["The hotel has a safe."],
  );
});

test("an official question is placed by its number and its own dialogue heard in that passage", () => {
  const { report } = official();
  assert.equal(report.binding.status, "passed");
  assert.equal(report.counts.candidates, 5);
  const one = row(report, "o-1");
  assert.deepEqual(one.candidate.originalScopeNumbers, [1]);
  assert.equal(one.evidence.instruction.hangulAgreement, "exact");
  assert.equal(one.evidence.ownDialogue.uniqueScriptSentences, 5);
  assert.equal(one.evidence.ownDialogue.heardInsidePassage, 2);
  // Its opening was written in Korean by the recognizer; two later sentences were not.
  assert.equal(one.evidence.ownDialogue.openingSentenceHeard, false);
  assert.deepEqual(
    one.evidence.ownDialogue.examples.map(
      (e) => e.occurrences[0].transcriptQuote,
    ),
    ["The hotel has a safe.", "Would you like to use it?"],
  );
  for (const id of ["o-4", "o-5"]) {
    const member = row(report, id);
    assert.deepEqual(member.candidate.originalScopeNumbers, [4, 5]);
    assert.equal(member.candidate.evidenceGrade, "shared_passage_heading");
    assert.equal(member.evidence.passage.announcement.quote, "4번과 5번,");
  }
});

test("own dialogue elsewhere, another section's dialogue inside, or none at all hold an official question", () => {
  // The recognizer wrote the numbers of sections 2 and 3 the other way round.
  const swapped = official({
    lines: [
      "이제 시작하겠습니다",
      O1,
      OD1,
      O2,
      OD3,
      O3.replace("3번", "3번."),
      OD2,
      O45,
      OD45,
      O4,
      O5,
      CLOSING,
    ],
  });
  for (const id of ["o-2", "o-3"]) {
    const question = row(swapped.report, id);
    assert.equal(question.outcome, "held");
    for (const reason of [
      "official_section_dialogue_not_heard_in_passage",
      "official_section_dialogue_heard_outside_passage",
      "other_section_dialogue_inside_passage",
    ])
      assert.ok(question.reasons.includes(reason), id + " " + reason);
  }
  assert.equal(row(swapped.report, "o-1").outcome, "candidate");

  const translated = official({
    lines: replace(
      OFFICIAL_LINES,
      OD3,
      "안녕하세요, 오늘 디저트로 무엇을 드셨나요?",
    ),
  });
  assert.deepEqual(row(translated.report, "o-3").reasons, [
    "official_section_dialogue_not_heard_in_passage",
  ]);

  const unannounced = official({
    lines: OFFICIAL_LINES.filter((line) => line !== O3),
  });
  assert.deepEqual(row(unannounced.report, "o-3").reasons, [
    "announcement_not_found",
  ]);
  assert.ok(
    row(unannounced.report, "o-2").reasons.includes(
      "next_announcement_not_contiguous",
    ),
  );
  assert.ok(
    row(unannounced.report, "o-2").reasons.includes(
      "other_section_dialogue_inside_passage",
    ),
  );
});

test("an instruction sentence heard under a number that the script prints for another is a contradiction", () => {
  const { report } = official({
    lines: replace(
      OFFICIAL_LINES,
      O2,
      O2.replace(
        "여자의 마지막 말에 대한 남자의",
        "남자의 마지막 말에 대한 여자의",
      ),
    ),
  });
  const two = row(report, "o-2");
  assert.equal(
    two.evidence.instruction.hangulAgreement,
    "another_sections_sentence",
  );
  assert.deepEqual(two.reasons, [
    "heard_instruction_is_another_sections_sentence",
  ]);
  const inexact = official({
    lines: replace(OFFICIAL_LINES, O2, O2.replace("가장 적절한", "알맞은")),
  });
  assert.equal(
    row(inexact.report, "o-2").evidence.instruction.hangulAgreement,
    "inexact",
  );
  assert.equal(row(inexact.report, "o-2").outcome, "candidate");
});

test("a script whose numbering cannot be followed offers no section", () => {
  const twice = official({
    scriptText: SCRIPT.replace("3번 다음을", "2번 다음을"),
  });
  for (const question of twice.report.questions)
    assert.deepEqual(question.reasons, [
      "official_script_numbering_not_unique",
    ]);
  // Every number printed, one of them twice; and every number once, out of order.
  for (const scriptText of [
    SCRIPT.replace("Dessert has become", "2번 Dessert has become"),
    SCRIPT.replace("1번 대화를", "9번 대화를")
      .replace("2번 대화를", "1번 대화를")
      .replace("9번 대화를", "2번 대화를"),
  ]) {
    assert.notEqual(scriptText, SCRIPT);
    assert.equal(
      officialSections(scriptText, [1, 2, 3, 4, 5]).reason,
      "official_script_numbering_not_unique",
    );
  }
  const none = official({ scriptText: "" });
  assert.deepEqual(row(none.report, "o-1").reasons, [
    "official_script_has_no_text",
  ]);
  const unrecorded = official(
    {},
    (i) => (i.record.questions[0].metadata.sourceNumber = null),
  );
  assert.deepEqual(row(unrecorded.report, "o-1").reasons, [
    "official_number_not_recorded",
  ]);
  assert.equal(unrecorded.report.counts.candidates, 4);
});

test("official existing starts check the clock by their printed numbers and shared starts", () => {
  const probe = source({
    reconstructed: false,
    lines: OFFICIAL_LINES,
    questions: OFFICIAL,
    scriptText: SCRIPT,
  });
  const at = (text) => probe.raw.words[wordIndex(probe, text)].start - 380;
  const questions = [
    OFFICIAL[0],
    OFFICIAL[1],
    { id: "o-3", shown: 3, existingStartMs: at("3번") },
    { id: "o-4", shown: 4, existingStartMs: at("4번과") },
    { id: "o-5", shown: 5, existingStartMs: at("4번과") },
  ];
  const { report } = official({ questions });
  assert.deepEqual(
    report.existingStartChecks.map((entry) => [
      entry.scope.join(),
      entry.status,
    ]),
    [
      ["3", "agrees"],
      ["4,5", "agrees"],
    ],
  );
  assert.equal(report.counts.candidates, 2);
  assert.equal(report.counts.existingStartsPreserved, 3);
});

// -------------------------------------------------------- two transcripts ----

/** The numbers from the transcript that hears Korean, the dialogue from the English-only one. */
const dual = (options = {}, change) => run({ dual: true, ...options }, change);

test("with an English-only transcript, numbers come from one and dialogue from the other", () => {
  const { input, report } = dual();
  assert.equal(report.binding.status, "passed");
  assert.equal(report.transcripts.quotesPlacedBy, "provider_time");
  assert.equal(report.transcripts.headings.model, "universal-2");
  assert.deepEqual(report.transcripts.quotes.languages, ["en"]);
  assert.equal(report.counts.candidates, 4);
  const b = row(report, "q-b");
  assert.deepEqual(b.candidate.originalScopeNumbers, [3]);
  const [occurrence] = b.evidence.quotes[0].occurrences;
  // The quote's word indexes are the English transcript's own.
  const english = input.english.raw.words;
  assert.equal(english[occurrence.wordIndexes[0]].text, "We");
  assert.equal(english[occurrence.wordIndexes[1]].text, "hour.");
  assert.equal(occurrence.transcriptQuote, BUS);
  assert.equal(occurrence.placement, "inside");
  // The announcement's are the other's.
  const heading = wordIndex(input, "3번");
  assert.deepEqual(b.evidence.passage.announcement.wordIndexes, [
    heading,
    heading,
  ]);
  // A passage holds what is spoken after its own instruction and before the
  // next number's instruction begins.
  assert.deepEqual(b.evidence.passage.contentMs, {
    fromMs: input.raw.words[wordIndex(input, "고르시오.", 2)].end,
    toMs: input.raw.words[wordIndex(input, "4번") + 1].start,
  });
  assert.ok(b.evidence.passage.contentMs.fromMs <= occurrence.startMs);
  assert.ok(occurrence.endMs <= b.evidence.passage.contentMs.toMs);
  assert.equal(JSON.stringify(report).includes(UPLOAD_URL), false);
});

test("dialogue the Korean-hearing transcript dropped is heard in the English one, inside the same bounds", () => {
  // As the provider really wrote: "3번 … 고르시오. 4번 …" with nothing between.
  const lines = replace(LINES, D3, [D3, { onlyInEnglish: true }]);
  const single = run({ lines });
  assert.deepEqual(row(single.report, "q-b").reasons, [
    "generation_quote_missing_in_transcript",
  ]);
  const { report } = dual({ lines });
  const b = row(report, "q-b");
  assert.equal(b.outcome, "candidate");
  assert.deepEqual(b.candidate.originalScopeNumbers, [3]);
  assert.deepEqual(
    b.evidence.passage.contentWordIndexes[0],
    b.evidence.passage.contentWordIndexes[1],
  );
  assert.equal(report.counts.candidates, 4);
});

test("a quote the English transcript runs across a Korean heading it did not write is refused", () => {
  // Contiguous in the English transcript: it wrote no "2번 …" between the two.
  const crossing = "I'd like a square one. Hello, this is Mega Home Shopping.";
  const { input, report } = dual({
    questions: [
      { id: "q-a", shown: 1, quotes: [crossing] },
      ...QUESTIONS.slice(1),
    ],
  });
  const heard = matchTokens(
    input.english.raw.words.map((w) => w.text).join(" "),
  ).join(" ");
  assert.ok(heard.includes(matchTokens(crossing).join(" ")));
  const a = row(report, "q-a");
  assert.deepEqual(a.reasons, ["generation_quote_crosses_announcement"]);
  assert.equal(
    a.evidence.quotes[0].occurrences[0].placement,
    "crosses_announcement",
  );
  assert.equal(a.evidence.passage, null);
});

test("an English rendering of a Korean heading is never a number", () => {
  // The transcript that hears Korean lost "3번 …"; the English one wrote this for it.
  const lines = replace(LINES, H3, [
    H3,
    {
      onlyInEnglish: true,
      english: "Number three. 3번 Listen and choose what this is about.",
    },
  ]);
  const { input, report } = dual({ lines });
  assert.ok(input.english.raw.words.some((word) => word.text === "3번"));
  assert.deepEqual(
    report.passages.map((p) => p.spokenNumbers.join()),
    ["1", "2", "4"],
  );
  for (const question of report.questions)
    assert.notDeepEqual(question.candidate?.originalScopeNumbers, [3]);
  // What followed the lost heading lies under "2번", whose end is not established.
  const b = row(report, "q-b");
  assert.equal(b.outcome, "held");
  assert.deepEqual(b.evidence.passage.spokenNumbers, [2]);
  assert.ok(b.reasons.includes("next_announcement_not_contiguous"));
});

test("words only the Korean-hearing transcript wrote are not the English evidence", () => {
  // One wrote digits, the English one spelled the numbers out.
  const lines = replace(LINES, D3, [
    D3.replace("nine to seven", "9 to 7"),
    { english: D3 },
  ]);
  const questions = [
    QUESTIONS[0],
    { id: "q-b", shown: 2, quotes: ["The center is open from 9 to 7."] },
    QUESTIONS[2],
    QUESTIONS[3],
  ];
  assert.equal(
    row(run({ lines, questions }).report, "q-b").outcome,
    "candidate",
  );
  const { report } = dual({ lines, questions });
  const b = row(report, "q-b");
  assert.deepEqual(b.reasons, ["generation_quote_missing_in_transcript"]);
  const [quote] = b.evidence.quotes;
  assert.deepEqual(quote.occurrences, []);
  assert.equal(
    quote.longestExactRunNotEvidence.transcriptQuote,
    "The center is open from",
  );
  assert.equal(quote.inHeadingsTranscriptNotEvidence.length, 1);
  assert.equal(quote.inHeadingsTranscriptNotEvidence[0].placement, "inside");
  assert.deepEqual(
    quote.inHeadingsTranscriptNotEvidence[0].passageSpokenNumbers,
    [3],
  );
});

test("a word the provider left seconds early does not move its quote into a passage", () => {
  // "We" timed inside the Korean instruction before its own dialogue.
  const outside = dual({
    lines: replace(LINES, D3, [D3, { englishFirstWordMs: -3000 }]),
  });
  assert.deepEqual(row(outside.report, "q-b").reasons, [
    "generation_quote_outside_any_passage",
  ]);
  // … and before that instruction began, where the passage of "2번" still runs.
  const across = dual({
    lines: replace(LINES, D3, [D3, { englishFirstWordMs: -4300 }]),
  });
  const b = row(across.report, "q-b");
  assert.deepEqual(b.reasons, ["generation_quote_crosses_announcement"]);
  assert.deepEqual(
    b.evidence.quotes[0].occurrences[0].passageSpokenNumbers,
    [2],
  );
  // Up to the tolerance between two transcripts' clocks is not that.
  const near = dual({
    lines: replace(LINES, D3, [D3, { englishFirstWordMs: -2000 }]),
  });
  assert.equal(row(near.report, "q-b").outcome, "candidate");
  const far = dual({
    lines: replace(LINES, D3, [D3, { englishFirstWordMs: -2200 }]),
  });
  assert.equal(row(far.report, "q-b").outcome, "held");
});

test("English words in the window of a number without its own instruction go to neither side", () => {
  const lines = [
    PREAMBLE,
    H1,
    D1,
    H2,
    D2,
    "3번과 4번은 대화를 듣고 남자의 마지막 말에 이어질 여자의 응답으로 가장 알맞은 것을 고르는 문제입니다. 잘 듣고 답하세요.",
    "3번입니다.",
    D3,
    "4번입니다.",
    [D4, { onlyInEnglish: true }], // "4번입니다. 수고하셨습니다." in the other
    CLOSING,
  ];
  const { report } = dual({ lines });
  const b = row(report, "q-b");
  assert.equal(b.outcome, "candidate");
  assert.equal(b.candidate.evidenceGrade, "shared_instruction_member_cue");
  // Dropped words between the number and the closing could as well be the
  // end of the dialogue before it: the provider did not time the number.
  const d = row(report, "q-d");
  assert.deepEqual(d.reasons, ["generation_quote_outside_any_passage"]);
  assert.equal(d.evidence.passage, null);

  // The provider can write a whole sentence into a tenth of a second. Where a
  // number without an instruction is followed at once by its dialogue, such
  // words fit the end of the passage before and the start of its own alike.
  const tight = dual(
    {
      lines: [
        ...lines.slice(0, 8),
        ["4번입니다.", { pauseMs: 0 }],
        [D4, { pauseMs: 0 }],
        CLOSING,
      ],
    },
    (i) => {
      const cue = i.raw.words[wordIndex(i, "4번입니다.")];
      for (const word of i.english.raw.words)
        if (word.start > cue.start) {
          word.start = cue.start + 100;
          word.end = cue.start + 200;
        }
    },
  );
  assert.equal(tight.report.binding.status, "passed");
  const between = row(tight.report, "q-d");
  assert.deepEqual(between.reasons, ["generation_quote_outside_any_passage"]);
  assert.equal(
    between.evidence.quotes[0].occurrences[0].placement,
    "between_two_passages",
  );
});

test("the English transcript must be of the same bytes and clock, English-only, and another transcript", () => {
  const changes = {
    english_source_audio_sha256: (i) =>
      (i.english.envelope.sourceAudioSha256 = "e".repeat(64)),
    english_playback_sha256: (i) =>
      (i.english.envelope.playbackSha256 = "e".repeat(64)),
    english_playback_duration_ms: (i) => (i.english.envelope.durationMs += 40),
    english_raw_response_sha256: (i) => (i.english.rawSha256 = "e".repeat(64)),
    english_transcript_id: (i) => (i.english.raw.id = "transcript-other"),
    english_transcript_completed: (i) => (i.english.raw.status = "error"),
    english_speech_model: (i) =>
      (i.english.raw.speech_model_used = "universal-2"),
    english_language_codes: (i) => (i.english.raw.language_code = "ko"),
    english_transcript_role: (i) => {
      i.english.envelope.request = { ...i.envelope.request };
      i.english.raw.language_codes = ["en", "ko"];
    },
    english_word_count: (i) => (i.english.envelope.wordCount -= 1),
    english_provider_duration: (i) => {
      i.english.raw.audio_duration += 5;
      i.english.envelope.providerDurationSeconds += 5;
    },
    english_original_audio_not_modified: (i) =>
      (i.english.envelope.writesStorage = true),
    english_transcript_words_valid: (i) =>
      (i.english.raw.words[7].confidence = 7),
    english_words_within_duration: (i) =>
      (i.english.raw.words.at(-1).end += 60_000),
    english_is_another_transcript: (i) => {
      i.english.envelope.transcriptId = i.envelope.transcriptId;
      i.english.raw.id = i.envelope.transcriptId;
    },
  };
  // The very same response bytes offered under another transcript id.
  const sameBytes = dual({}, (i) => {
    i.english.rawSha256 = i.rawSha256;
    i.english.envelope.raw.sha256 = i.rawSha256;
  });
  assert.deepEqual(sameBytes.report.binding.reasons, [
    "binding_failed:english_is_another_transcript",
  ]);
  for (const [name, change] of Object.entries(changes)) {
    const { report } = dual({}, change);
    assert.equal(report.binding.status, "failed", name);
    assert.deepEqual(report.binding.reasons, ["binding_failed:" + name], name);
    assert.equal(report.counts.candidates, 0, name);
    assert.equal(report.counts.heldByClass.binding, 4, name);
    assert.deepEqual(report.passages, [], name);
  }
  // The transcript asked for the numbers must have been asked to hear Korean.
  const deaf = run({}, (i) => {
    i.envelope.request = {
      speech_models: ["universal-3-5-pro"],
      language_code: "en",
    };
    i.raw.language_code = "en_us";
    delete i.raw.language_codes;
  });
  assert.deepEqual(deaf.report.binding.reasons, [
    "binding_failed:transcript_role",
  ]);
});

test("an official section's own dialogue is taken from the English transcript", () => {
  // The Korean-hearing transcript wrote this monologue in Korean.
  const lines = replace(OFFICIAL_LINES, OD3, [
    "안녕하세요, 오늘 디저트로 무엇을 드셨나요? 디저트는 일부 사람들에게 하나의 습관이 되었습니다. 그들은 디저트에 더 많은 돈을 씁니다.",
    { english: OD3 },
  ]);
  const single = official({ lines });
  assert.deepEqual(row(single.report, "o-3").reasons, [
    "official_section_dialogue_not_heard_in_passage",
  ]);
  const { report } = official({ lines, dual: true });
  assert.equal(report.counts.candidates, 5);
  const three = row(report, "o-3");
  assert.equal(three.evidence.ownDialogue.heardInsidePassage, 2);
  assert.equal(three.evidence.ownDialogue.openingSentenceHeard, true);
  // Sections 2 and 3 heard under each other's numbers are still refused.
  const swapped = official({
    dual: true,
    lines: [
      "이제 시작하겠습니다",
      O1,
      OD1,
      O2,
      OD3,
      O3.replace("3번", "3번."),
      OD2,
      O45,
      OD45,
      O4,
      O5,
      CLOSING,
    ],
  });
  for (const id of ["o-2", "o-3"])
    for (const reason of [
      "official_section_dialogue_not_heard_in_passage",
      "official_section_dialogue_heard_outside_passage",
      "other_section_dialogue_inside_passage",
    ])
      assert.ok(
        row(swapped.report, id).reasons.includes(reason),
        id + " " + reason,
      );
});

test("a first sentence the English provider timed over its own heading is not heard, and not elsewhere", () => {
  // "Hi," left three seconds early: inside the Korean instruction of "3번".
  const early = official({
    dual: true,
    lines: replace(OFFICIAL_LINES, OD3, [OD3, { englishFirstWordMs: -3000 }]),
  });
  const three = row(early.report, "o-3");
  assert.equal(three.outcome, "candidate");
  assert.equal(three.evidence.ownDialogue.heardInsidePassage, 1);
  assert.equal(three.evidence.ownDialogue.openingSentenceHeard, false);
  assert.deepEqual(three.evidence.ownDialogue.heardOutsidePassage, []);
  assert.deepEqual(
    three.evidence.ownDialogue.timedOverOwnHeadingNotCounted.map(
      (entry) => entry.scriptSentence,
    ),
    ["Hi,   what   did   you   have   for   dessert   today?"],
  );
  // If that were the only sentence of the section, nothing would be heard.
  const only = official({
    dual: true,
    lines: replace(OFFICIAL_LINES, OD3, [
      OD3,
      {
        english: "Hi, what did you have for dessert today?",
        englishFirstWordMs: -3000,
      },
    ]),
  });
  assert.deepEqual(row(only.report, "o-3").reasons, [
    "official_section_dialogue_not_heard_in_passage",
  ]);
  // Left early enough to begin while the passage of "2번" still runs: elsewhere.
  const before = official({
    dual: true,
    lines: replace(OFFICIAL_LINES, OD3, [OD3, { englishFirstWordMs: -8000 }]),
  });
  assert.ok(
    row(before.report, "o-3").reasons.includes(
      "official_section_dialogue_heard_outside_passage",
    ),
  );
  // A last word left late, over the instruction of the next number: the
  // sentence runs out of its passage, and that is not waved through.
  const late = official({
    dual: true,
    lines: replace(OFFICIAL_LINES, OD3, [OD3, { englishLastWordMs: 4000 }]),
  });
  assert.ok(
    row(late.report, "o-3").reasons.includes(
      "official_section_dialogue_heard_outside_passage",
    ),
  );
  // The same early word in a transcript placed by word order changes nothing.
  assert.equal(official().report.counts.candidates, 5);
});

// ------------------------------------------------------------------ words ----

test("only digits followed by 번 are numbers; the raw words are never repaired", () => {
  const words = transcriptWords({
    words: speak([
      "한 번씩만 두 번 번호 1 번입니다. 12번. 0번 51번 3 번째 7번이 8번부터 10번까지는 문제입니다.",
    ]).words,
  }).words;
  const seen = findObservations(words).map((o) => [
    o.kind,
    o.numbers.join(),
    o.quote,
  ]);
  assert.deepEqual(seen, [
    ["single", "1", "1 번입니다."],
    ["single", "12", "12번."],
    ["mention", "7", "7번이"],
    ["mention", "8,9,10", "8번부터 10번까지는"],
  ]);
  assert.deepEqual(transcriptWords({ words: [] }).problems, [
    "transcript_has_no_words",
  ]);
  assert.deepEqual(
    transcriptWords({ words: [{ text: "a", start: 5, end: 4, confidence: 2 }] })
      .problems,
    ["transcript_word_time_invalid", "transcript_word_confidence_invalid"],
  );
});

test("the same input gives the same report, byte for byte", () => {
  const first = JSON.stringify(run().report);
  assert.equal(JSON.stringify(run().report), first);
  assert.equal(first.includes(UPLOAD_URL), false);
});

// -------------------------------------------------------------------- CLI ----

/** Writes one reconstructed and one official source as the real files are shaped. */
function corpus({ dual = false } = {}) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "assemblyai-alignment-"));
  const write = (name, value) => {
    const file = path.join(dir, name);
    const bytes = Buffer.isBuffer(value)
      ? value
      : Buffer.from(JSON.stringify(value), "utf8");
    writeFileSync(file, bytes);
    return { file, sha256: sha256(bytes) };
  };
  const records = [];
  const certificateRows = [];
  const clocks = [];
  const snapshots = [];
  const envelopes = [];
  const englishEnvelopes = [];
  const build = (name, input, extra) => {
    const audio = write(
      name + ".mp3",
      Buffer.from("not really audio: " + name),
    );
    const raw = write(name + ".raw.json", input.raw);
    const record = {
      ...input.record,
      sourceRecordId: name,
      setId: name + "-set",
      sourceAudioSha256: audio.sha256,
      sourceAudioPath: audio.file,
      ...extra(audio),
    };
    records.push(record);
    for (const item of input.certificateRecords)
      certificateRows.push({
        ...item,
        sourceRecordId: name,
        sourceAudioSha256: audio.sha256,
        documentSha256: record.documentSha256,
      });
    clocks.push({
      ...input.clock,
      sourceRecordId: name,
      sourceAudioSha256: audio.sha256,
      documentSha256: record.documentSha256,
    });
    envelopes.push(
      write(name + ".envelope.json", {
        ...input.envelope,
        sourceRecordId: name,
        sourceAudioSha256: audio.sha256,
        originalAudioPath: audio.file,
        originalAudioBytes: readFileSync(audio.file).length,
        raw: { path: raw.file, sha256: raw.sha256 },
      }).file,
    );
    if (!input.english) return;
    const englishRaw = write(name + ".english.raw.json", input.english.raw);
    englishEnvelopes.push(
      write(name + ".english.envelope.json", {
        ...input.english.envelope,
        sourceRecordId: name,
        sourceAudioSha256: audio.sha256,
        originalAudioPath: audio.file,
        originalAudioBytes: readFileSync(audio.file).length,
        raw: { path: englishRaw.file, sha256: englishRaw.sha256 },
      }).file,
    );
  };
  const generated = source({ lines: LINES, questions: QUESTIONS, dual });
  build("generated", generated, (audio) => {
    const prepared = write("generated.prepared.json", {
      verification: {
        grounding: QUESTIONS.map((q) => ({
          generatedOrdinal: q.shown,
          evidenceQuotes: q.quotes,
          included: true,
        })),
      },
    });
    const alignment = write("generated.question-alignment.json", {
      sourceRecordId: "generated",
      sourceAudioSha256: audio.sha256,
      preparedSha256: prepared.sha256,
      candidates: QUESTIONS.map((q) => ({
        questionId: q.id,
        generatedOrdinal: q.shown,
      })),
    });
    return {
      preparedPath: prepared.file,
      preparedSha256: prepared.sha256,
      alignmentPath: alignment.file,
    };
  });
  const printed = source({
    reconstructed: false,
    lines: OFFICIAL_LINES,
    questions: OFFICIAL,
    scriptText: SCRIPT,
    dual,
  });
  const document = {
    groups: [
      {
        id: "group",
        questions: OFFICIAL.map((q) => ({ id: q.id })),
        transcript: { text: SCRIPT },
      },
    ],
  };
  build("printed", printed, () => ({
    documentSha256: sha256(JSON.stringify(document)),
  }));
  snapshots.push({ id: "printed-set", revision: 5, document });
  const snapshot = write("live-snapshot.json", { snapshots });
  const inventory = write("inventory.json", {
    schemaVersion: 1,
    liveSnapshotPath: snapshot.file,
    liveSnapshotSha256: snapshot.sha256,
    records,
  });
  const clock = write("clock.json", { records: clocks });
  const certificate = write("certificate.json", {
    inputs: {
      inventory: { sha256: inventory.sha256 },
      clock: { sha256: clock.sha256 },
    },
    records: certificateRows,
  });
  return { dir, inventory, clock, certificate, envelopes, englishEnvelopes };
}

const cli = (files, out, extra = []) => [
  "--inventory",
  files.inventory.file,
  "--certificate",
  files.certificate.file,
  "--clock",
  files.clock.file,
  ...files.envelopes.flatMap((file) => ["--envelope", file]),
  ...(files.englishEnvelopes ?? []).flatMap((file) => [
    "--english-envelope",
    file,
  ]),
  "--out",
  out,
  ...extra,
];

test("the command reads bound files, writes each report once and leaves every input as it was", () => {
  const files = corpus();
  const before = readdirSync(files.dir).map((name) => [
    name,
    sha256(readFileSync(path.join(files.dir, name))),
  ]);
  const out = path.join(files.dir, "out");
  const summary = main(
    cli(files, out, ["--certificate-sha256", files.certificate.sha256]),
  );
  assert.deepEqual(
    summary.sources.map((entry) => [
      entry.sourceRecordId,
      entry.binding,
      entry.counts.candidates,
      entry.counts.held,
    ]),
    [
      ["generated", "passed", 4, 0],
      ["printed", "passed", 5, 0],
    ],
  );
  assert.deepEqual(summary.certificate, {
    questions: 9,
    existingStarts: 0,
    existingStartsSha256: sha256("[]"),
    held: 9,
  });
  assert.deepEqual(readdirSync(out).sort(), [
    "REPORT.md",
    "generated.alignment.json",
    "printed.alignment.json",
    "summary.json",
  ]);
  for (const name of readdirSync(out)) {
    const text = readFileSync(path.join(out, name), "utf8");
    assert.equal(text.includes(UPLOAD_URL), false, name);
    assert.equal(text.includes("audio_url"), false, name);
  }
  const written = JSON.parse(
    readFileSync(path.join(out, "generated.alignment.json"), "utf8"),
  );
  assert.equal(written.diagnosticOnly, true);
  assert.equal(written.admissionAuthority, false);
  assert.equal(written.writesDatabase, false);
  assert.equal(
    sha256(readFileSync(path.join(out, "generated.alignment.json"))),
    summary.sources[0].report.sha256,
  );
  // Nothing outside the output directory changed.
  for (const [name, hash] of before)
    assert.equal(sha256(readFileSync(path.join(files.dir, name))), hash, name);
  // A report is written once; a second run replaces nothing that is there.
  for (const name of readdirSync(out))
    writeFileSync(path.join(out, name), "kept: " + name);
  assert.throws(() => main(cli(files, out)), /EEXIST/);
  for (const name of readdirSync(out))
    assert.equal(readFileSync(path.join(out, name), "utf8"), "kept: " + name);
});

test("the command refuses unreviewed, unbound or misplaced inputs", () => {
  const files = corpus();
  const out = path.join(files.dir, "out");
  assert.throws(
    () => main(cli(files, out, ["--certificate-sha256", "0".repeat(64)])),
    /reviewed hash/,
  );
  assert.throws(() => main(cli(files, files.dir)), /holds an input file/);
  assert.throws(
    () => main(cli({ ...files, envelopes: [] }, out)),
    /Missing --envelope/,
  );
  const otherClock = path.join(files.dir, "other-clock.json");
  writeFileSync(
    otherClock,
    readFileSync(files.clock.file, "utf8").replace('"passed"', '"passed" '),
  );
  assert.throws(
    () => main(cli({ ...files, clock: { file: otherClock } }, out)),
    /not the one this certificate/,
  );
  const otherInventory = path.join(files.dir, "other-inventory.json");
  writeFileSync(
    otherInventory,
    readFileSync(files.inventory.file, "utf8") + "\n",
  );
  assert.throws(
    () => main(cli({ ...files, inventory: { file: otherInventory } }, out)),
    /not the one this certificate/,
  );
  assert.deepEqual(readdirSync(files.dir).includes("out"), false);
});

test("a changed original audio, prepared file or live document fails the binding of that source alone", () => {
  /** Runs a fresh corpus after `change` and returns [generated, printed] binding reasons. */
  const reasonsAfter = (change) => {
    const files = corpus();
    change(JSON.parse(readFileSync(files.inventory.file, "utf8")), files);
    const summary = main(cli(files, path.join(files.dir, "out")));
    return summary.sources.map((entry) => {
      const report = JSON.parse(readFileSync(entry.report.path, "utf8"));
      assert.equal(
        report.counts.candidates,
        entry.binding === "passed" ? report.counts.questions : 0,
      );
      return report.binding.reasons;
    });
  };
  const flipFirstByte = (file) => {
    const bytes = readFileSync(file);
    bytes[0] ^= 1; // the same length, other bytes
    writeFileSync(file, bytes);
  };
  assert.deepEqual(
    reasonsAfter((inventory) =>
      flipFirstByte(inventory.records[0].sourceAudioPath),
    ),
    [["binding_failed:original_audio_file"], []],
  );
  // The envelope says the provider was sent another number of bytes.
  assert.deepEqual(
    reasonsAfter((inventory, files) =>
      writeFileSync(
        files.envelopes[0],
        readFileSync(files.envelopes[0], "utf8").replace(
          /"originalAudioBytes":(\d+)/,
          (whole, bytes) => `"originalAudioBytes":${Number(bytes) + 1}`,
        ),
      ),
    ),
    [["binding_failed:original_audio_file"], []],
  );
  assert.deepEqual(
    reasonsAfter((inventory) =>
      writeFileSync(
        inventory.records[0].sourceAudioPath,
        Buffer.concat([
          readFileSync(inventory.records[0].sourceAudioPath),
          Buffer.from("tag"),
        ]),
      ),
    ),
    [["binding_failed:original_audio_file"], []],
  );
  assert.deepEqual(
    reasonsAfter((inventory) =>
      writeFileSync(
        inventory.records[0].preparedPath,
        JSON.stringify({ verification: { grounding: [] } }),
      ),
    ),
    [
      [
        "binding_failed:prepared_sha256",
        "binding_failed:generation_alignment_questions",
      ],
      [],
    ],
  );
  // The alignment file names another recording's generation.
  assert.deepEqual(
    reasonsAfter((inventory) =>
      writeFileSync(
        inventory.records[0].alignmentPath,
        readFileSync(inventory.records[0].alignmentPath, "utf8").replace(
          inventory.records[0].sourceAudioSha256,
          "e".repeat(64),
        ),
      ),
    ),
    [["binding_failed:generation_alignment_identity"], []],
  );
  assert.deepEqual(
    reasonsAfter((inventory) =>
      writeFileSync(
        inventory.liveSnapshotPath,
        readFileSync(inventory.liveSnapshotPath, "utf8").replace(
          "Ms. Smith",
          "Ms. Smyth",
        ),
      ),
    ),
    [
      [],
      ["binding_failed:live_snapshot_sha256", "binding_failed:live_document"],
    ],
  );
});

test("the command pairs each English envelope with the headings envelope of its source", () => {
  const files = corpus({ dual: true });
  const out = path.join(files.dir, "out");
  const summary = main(cli(files, out));
  assert.deepEqual(
    summary.sources.map((entry) => [entry.binding, entry.counts.candidates]),
    [
      ["passed", 4],
      ["passed", 5],
    ],
  );
  const report = JSON.parse(
    readFileSync(summary.sources[0].report.path, "utf8"),
  );
  assert.equal(report.transcripts.quotesPlacedBy, "provider_time");
  assert.equal(report.inputs.englishEnvelope.path, files.englishEnvelopes[0]);
  assert.equal(
    report.inputs.englishRawResponse.sha256,
    report.transcripts.quotes.rawSha256,
  );
  for (const name of readdirSync(out))
    assert.equal(
      readFileSync(path.join(out, name), "utf8").includes(UPLOAD_URL),
      false,
      name,
    );

  // An English envelope with no headings envelope, or two for one source.
  const alone = corpus({ dual: true });
  assert.throws(
    () =>
      main(
        cli(
          { ...alone, envelopes: alone.envelopes.slice(1) },
          path.join(alone.dir, "out"),
        ),
      ),
    /no single headings envelope/,
  );
  assert.throws(
    () =>
      main(
        cli(
          {
            ...alone,
            englishEnvelopes: [
              alone.englishEnvelopes[0],
              alone.englishEnvelopes[0],
            ],
          },
          path.join(alone.dir, "out"),
        ),
      ),
    /no single headings envelope/,
  );

  // The English envelope says other bytes were sent.
  const other = corpus({ dual: true });
  writeFileSync(
    other.englishEnvelopes[0],
    readFileSync(other.englishEnvelopes[0], "utf8").replace(
      /"originalAudioBytes":(\d+)/,
      (whole, bytes) => `"originalAudioBytes":${Number(bytes) + 1}`,
    ),
  );
  const changed = main(cli(other, path.join(other.dir, "out")));
  assert.deepEqual(
    JSON.parse(readFileSync(changed.sources[0].report.path, "utf8")).binding
      .reasons,
    ["binding_failed:original_audio_file"],
  );
  assert.equal(changed.sources[1].binding, "passed");
});
