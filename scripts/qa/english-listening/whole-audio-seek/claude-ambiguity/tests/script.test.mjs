import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ScriptError,
  scriptHeadings,
  scriptSection,
  sectionOpenings,
} from "../lib/script.mjs";
import {
  englishWords,
  hangulCoverage,
  occurrences,
  sentenceRuns,
  strictCoverage,
} from "../lib/words.mjs";

const questions = (numbers, shared = {}) =>
  numbers.map((n) => ({ sourceNumber: n, instruction: shared[n] ?? null }));

const refuses = (run, reason) =>
  assert.throws(
    run,
    (error) => error instanceof ScriptError && error.reason === reason,
  );

test("every question number printed once, in order, gives literal sections", () => {
  const text =
    "머리말 1번 대화를 듣고, 고르시오. M: Hi there, how are you today? W: Fine. 2번 다음을 듣고, 고르시오. W: Good morning, everyone. Welcome back.";
  const one = scriptSection(text, questions([1, 2]), 1);
  assert.equal(
    text
      .slice(one.sectionStartCharacter, one.sectionEndCharacter)
      .trim()
      .startsWith("대화를 듣고"),
    true,
  );
  assert.equal(one.instruction.text, "대화를 듣고, 고르시오.");
  assert.equal(
    text.slice(one.instruction.startCharacter, one.instruction.endCharacter),
    one.instruction.text,
  );
  assert.deepEqual(
    one.turns.map((t) => t.text),
    ["Hi there, how are you today?", "Fine."],
  );
  for (const turn of one.turns)
    assert.equal(text.slice(turn.startCharacter, turn.endCharacter), turn.text);
  const two = scriptSection(text, questions([1, 2]), 2);
  assert.equal(two.sectionEndCharacter, text.length);
  assert.equal(one.sectionEndCharacter, text.indexOf("2번"));
});

test("a number printed twice, missing, or out of order gives no sections at all", () => {
  refuses(
    () =>
      scriptHeadings(
        "1번 가 M: a b c d 1번 나 M: e f g h 2번 다",
        questions([1, 2]),
      ),
    "official_transcript_numbering_not_unique",
  );
  refuses(
    () => scriptHeadings("1번 가 M: a b c d", questions([1, 2])),
    "official_transcript_numbering_not_unique",
  );
  refuses(
    () =>
      scriptHeadings("2번 가 M: a b c d 1번 나 M: e f g h", questions([1, 2])),
    "official_transcript_numbering_not_unique",
  );
  refuses(
    () => scriptHeadings("", questions([1])),
    "official_transcript_numbering_not_unique",
  );
});

test("a date or a decimal inside a dialogue is not a heading when the N번 style is complete", () => {
  const text =
    "1번 대화를 듣고, 고르시오. M: Let us meet on May 2. Is that fine? 2번 다음을 듣고, 고르시오. W: It costs 3. 5 dollars.";
  assert.deepEqual(
    scriptHeadings(text, questions([1, 2])).map((h) => h.numbers[0]),
    [1, 2],
  );
});

test("the other literal style is used only when it is complete by itself", () => {
  const text =
    "1. Listen and choose. M: Hello there, my old friend. 2. Listen and answer. W: Nice to see you again.";
  assert.deepEqual(
    scriptHeadings(text, questions([1, 2])).map((h) => h.numbers[0]),
    [1, 2],
  );
});

test("a joint heading stands for both numbers of a true shared passage only", () => {
  const shared = "다음을 듣고, 물음에 답하시오.";
  const text =
    "18번 대화를 듣고, 고르시오. M: This is the eighteenth one here. 【19-20】 " +
    shared +
    " M: Hello, listeners. My name is Dr. Green.";
  const headings = scriptHeadings(
    text,
    questions([18, 19, 20], { 19: shared, 20: shared }),
  );
  assert.deepEqual(
    headings.map((h) => h.numbers),
    [[18], [19, 20]],
  );
  assert.deepEqual(
    scriptSection(text, questions([18, 19, 20], { 19: shared, 20: shared }), 20)
      .numbers,
    [19, 20],
  );
  // Without the frozen shared instruction the joint heading names nothing.
  refuses(
    () => scriptHeadings(text, questions([18, 19, 20])),
    "official_transcript_numbering_not_unique",
  );
});

test("a printed answer blank and a stage direction are not speech", () => {
  const text =
    "1번 대화를 듣고, 고르시오. [Telephone rings.] M: [Sighs] Hello, this is John speaking. W: ________ 2번 끝";
  const section = scriptSection(text, questions([1, 2]), 1);
  assert.equal(section.instruction.text, "대화를 듣고, 고르시오.");
  assert.deepEqual(
    section.turns.map((t) => t.text),
    ["Hello, this is John speaking."],
  );
});

test("an opening is an exact prefix of the first utterance and the script holds it once", () => {
  const text =
    "1번 가나다. M: Mom, you’d better park your car in the garage. W: Why? 2번 라마바. M: Dad, you’d better park your car in the street.";
  const section = scriptSection(text, questions([1, 2]), 1);
  const openings = sectionOpenings(text, section);
  assert.equal(openings[0].method, "first_utterance_prefix");
  assert.deepEqual(openings[0].words, [
    "mom",
    "you'd",
    "better",
    "park",
    "your",
    "car",
    "in",
    "the",
  ]);
  assert.equal(
    text.slice(
      openings[0].quotes[0].startCharacter,
      openings[0].quotes[0].endCharacter,
    ),
    openings[0].quotes[0].text,
  );
  // Shorter prefixes down to four words are offered too; none skips the first word.
  assert.deepEqual(
    openings.map((o) => o.words.length),
    [8, 7, 6, 5, 4],
  );
  assert.ok(openings.every((o) => o.words[0] === "mom"));
});

test("a first utterance under four words is quoted whole with the exact start of the next turn", () => {
  const text =
    "1번 가나다. M: Hello? W: Hi, this is Jane from the office. 2번 라마바. M: Hello? W: Hey, it is me again.";
  const openings = sectionOpenings(
    text,
    scriptSection(text, questions([1, 2]), 1),
  );
  assert.ok(openings.length);
  assert.ok(
    openings.every(
      (o) =>
        o.method === "exact_original_opening_v1" &&
        o.quotes[0].text === "Hello?" &&
        o.words[0] === "hello",
    ),
  );
  assert.ok(
    openings.every(
      (o) =>
        occurrences(englishWords(text.replace(/[MW]:/g, " ")), o.words) === 1,
    ),
  );
});

test("a whole first utterance printed twice is quoted on into the next turn until it is unique", () => {
  const text =
    "1번 가나다. M: Hello, may I help you? W: Yes, I want a blue shirt. 2번 라마바. M: Hello, may I help you? W: No, thanks. Just looking.";
  const one = sectionOpenings(text, scriptSection(text, questions([1, 2]), 1));
  assert.ok(
    one.length && one.every((o) => o.method === "exact_original_opening_v2"),
  );
  assert.deepEqual(one[0].quotes[0].text, "Hello, may I help you?");
  assert.equal(one[0].words.slice(0, 5).join(" "), "hello may i help you");
  // When even the next turns are the same, nothing is unique and nothing is offered.
  const same =
    "1번 가. M: Hello, may I help you? W: Yes, please. 2번 나. M: Hello, may I help you? W: Yes, please.";
  assert.deepEqual(
    sectionOpenings(same, scriptSection(same, questions([1, 2]), 1)),
    [],
  );
});

test("the Hangul of a sentence is compared literally; a printed English name is listed, not compared", () => {
  const printed =
    "대화를 듣고, Skyview Hot-Air Balloon Program에 관해 언급되지 않은 것을 고르시오.";
  const heard =
    "대화를 듣고 스카이뷰 핫 에어 벌룬 프로그램에 관해 언급되지 않은 것을 고르시오.";
  const hangul = hangulCoverage(printed, heard);
  assert.equal(hangul.share, 1);
  assert.equal(hangul.syllables, 20);
  assert.ok(strictCoverage(printed, heard) < 0.8);
  assert.deepEqual(sentenceRuns(printed).notCompared, [
    "Skyview",
    "Hot-Air",
    "Balloon",
    "Program",
  ]);
  // Another question's sentence is not carried by the same Hangul.
  assert.ok(
    hangulCoverage(
      "다음을 듣고, 남자가 하는 말의 목적으로 가장 적절한 것을 고르시오.",
      heard,
    ).share < 0.5,
  );
});

test("English words: an initialism is one word; a spelling difference is a different word", () => {
  assert.deepEqual(englishWords("Hello, Mr. Watson. It’s 3 p.m."), [
    "hello",
    "mr",
    "watson",
    "it's",
    "3",
    "pm",
  ]);
  assert.deepEqual(englishWords("H.J. is here"), ["hj", "is", "here"]);
  assert.notDeepEqual(
    englishWords("Sara, what’s wrong?"),
    englishWords("Sarah, what's wrong?"),
  );
});
