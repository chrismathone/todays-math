import assert from "node:assert/strict";
import { test } from "node:test";
import { heardFirstUtterance } from "../lib/evidence.mjs";
import { strictCoverage, coverage } from "../lib/text.mjs";
import { verifyMarks } from "../lib/verify.mjs";
import {
  ONSETS,
  SHARED_INSTRUCTION,
  TRANSCRIPT,
  buildLedger,
  goodProbes,
  makeNative,
  makeProbe,
  makeRecord,
  sectionsFor,
} from "./fixture.mjs";

const row = (ledger, number) =>
  ledger.rows.find((r) => r.sourceNumber === number);
const fresh = () => {
  const record = makeRecord();
  return buildLedger({
    record,
    native: makeNative(record),
    probes: goodProbes(),
  });
};
const codes = (ledger) =>
  verifyMarks(ledger.marks, ledger.env).errors.map((error) => error.code);

test("an official first utterance is quoted only as far as it was heard exactly", () => {
  const utterance = {
    start: 100,
    text: "Hi Dave, what are you doing here? [Pause] I am waiting.",
  };
  const full = makeProbe(ONSETS[4], [
    "20번",
    "Hi Dave, what are you doing here? I am waiting for the bus.",
  ]);
  const heard = heardFirstUtterance(utterance, full);
  // The quote stops before the stage direction and is exact transcript text.
  assert.equal(heard.quote, "Hi Dave, what are you doing here");
  assert.equal(heard.words, 7);
  assert.equal(heard.startCharacter, 100);
  assert.deepEqual(heard.segmentIds, [2]);
  const partial = makeProbe(ONSETS[4], "Hi Dave, what are we going to do?");
  assert.equal(
    heardFirstUtterance(utterance, partial).quote,
    "Hi Dave, what are",
  );
  // Fewer than four words in a row is not a quote.
  const three = makeProbe(ONSETS[4], "Hi Dave, what is that?");
  assert.equal(heardFirstUtterance(utterance, three), null);
  // Later related text is not the first utterance.
  const later = makeProbe(ONSETS[4], "I am waiting for the bus to go home.");
  assert.equal(heardFirstUtterance(utterance, later), null);
  const unsure = makeProbe(ONSETS[4], "Hi Dave, what are you doing here?", {
    uncertain: [true],
  });
  assert.equal(heardFirstUtterance(utterance, unsure), null);
  assert.equal(heardFirstUtterance(null, full), null);
});

test("strict coverage counts printed English; the Hangul share does not", () => {
  const official =
    "대화를 듣고, Dream Bank의 위치로 가장 알맞은 것을 고르시오.";
  const heard = "대화를 듣고 드림뱅크의 위치로 가장 알맞은 것을 고르시오.";
  assert.equal(coverage(official, heard), 1);
  assert.ok(strictCoverage(official, heard) < 0.8);
  assert.equal(strictCoverage(official, official), 1);
});

test("each candidate states how it is grounded and quotes the official script exactly", () => {
  const ledger = fresh();
  assert.deepEqual(
    ledger.rows.map((r) => r.startGrade),
    [
      "instruction_grounded",
      "instruction_grounded",
      "instruction_grounded",
      "first_dialogue_grounded",
      "instruction_grounded",
      "instruction_grounded",
    ],
  );
  assert.deepEqual(
    ledger.rows.map((r) => r.cueForm),
    Array(6).fill("beon"),
  );
  const member = row(ledger, 4).scriptEvidence;
  assert.equal(member.instructionQuote, null);
  assert.equal(member.firstDialogueQuote, "Hi Dave, what are you doing here");
  assert.equal(
    TRANSCRIPT.slice(
      member.firstDialogueStartCharacter,
      member.firstDialogueStartCharacter + member.firstDialogueQuote.length,
    ),
    member.firstDialogueQuote,
  );
  assert.deepEqual(member.dialogueProbeSegmentIds, [1]);
  const single = row(ledger, 1).scriptEvidence;
  assert.equal(
    single.instructionQuote,
    "대화를 듣고, 남자가 구입할 물병으로 가장 적절한 것을 고르시오.",
  );
  assert.equal(
    TRANSCRIPT.slice(
      single.sectionStartCharacter - 2,
      single.sectionStartCharacter,
    ),
    "1번",
  );
  // The shared instruction is printed once, before the first member's number.
  assert.equal(
    row(ledger, 3).scriptEvidence.instructionQuote,
    SHARED_INSTRUCTION,
  );
  assert.equal(
    row(ledger, 5).scriptEvidence.instructionQuote,
    "다음을 듣고, 물음에 답하시오.",
  );
});

test("a number without any official text is an ordinal-only start and says so", () => {
  const record = makeRecord();
  record.questions[0].prompt = "원본 문제지 1번 문항";
  const probes = goodProbes();
  probes[0] = makeProbe(ONSETS[1], ["1번", "어떤 문장"]);
  const native = makeNative(record);
  const ledger = buildLedger({ record, native, probes, sections: null });
  const first = row(ledger, 1);
  assert.equal(first.status, "candidate");
  assert.equal(first.startGrade, "ordinal_only");
  assert.deepEqual(first.reasons, ["official_text_unavailable"]);
  assert.ok(
    first.identityEvidence.includes(
      "frozen_prompt_names_original_question_number",
    ),
  );
  assert.equal(first.scriptEvidence, null);
  assert.deepEqual(verifyMarks(ledger.marks, ledger.env).errors, []);
  // The reason may not be dropped from an ordinal-only row.
  first.reasons = [];
  assert.ok(codes(ledger).includes("ordinal_only_without_stated_reason"));
  // Bare digits alone are never an ordinal-only start.
  probes[0] = makeProbe(ONSETS[1], "1. 어떤 문장");
  const bare = buildLedger({ record, native, probes, sections: null });
  assert.equal(row(bare, 1).status, "held");
  // Without a script a member has only its number; that is said, not hidden.
  const member = row(ledger, 4);
  assert.equal(member.startGrade, "ordinal_only");
  assert.ok(
    member.notes.includes(
      "member_first_dialogue_unverifiable_no_official_script",
    ),
  );
});

test("bare digits and Hangul-only matches ask for the first dialogue as support", () => {
  const record = makeRecord();
  record.questions[1].prompt =
    "다음을 듣고, Dream Bank Tower Building의 위치로 가장 적절한 것을 고르시오.";
  const probes = goodProbes();
  probes[0] = makeProbe(
    ONSETS[1],
    "1. 대화를 듣고 남자가 구입할 물병으로 가장 적절한 것을 고르시오.",
  );
  probes[1] = makeProbe(
    ONSETS[2],
    "2번 다음을 듣고 드림뱅크 타워 빌딩의 위치로 가장 적절한 것을 고르시오.",
  );
  const native = makeNative(record);
  const sections = sectionsFor();
  let ledger = buildLedger({ record, native, probes, sections });
  assert.equal(row(ledger, 1).status, "candidate");
  assert.equal(row(ledger, 1).cueForm, "bare");
  assert.ok(
    row(ledger, 1).notes.includes("bare_digits_without_first_dialogue_support"),
  );
  assert.ok(
    row(ledger, 2).notes.includes(
      "official_instruction_matched_on_hangul_only",
    ),
  );
  assert.deepEqual(
    ledger.resolved.dialogueWanted.map((item) => item.sourceNumber),
    [1, 2],
  );
  // With an English listening from the same frame the support is recorded.
  probes.push(
    makeProbe(
      ONSETS[1],
      "Good afternoon. Hello, what can I do for you today?",
      {
        purpose: "first_dialogue",
        language: "en",
      },
    ),
  );
  ledger = buildLedger({ record, native, probes, sections });
  const supported = row(ledger, 1);
  assert.equal(supported.startGrade, "instruction_grounded");
  assert.ok(
    supported.identityEvidence.includes("official_first_dialogue_at_start"),
  );
  assert.equal(supported.dialogueProbeEvidence.requestedLanguage, "en");
  assert.equal(
    supported.notes.includes("bare_digits_without_first_dialogue_support"),
    false,
  );
  assert.deepEqual(
    ledger.resolved.dialogueWanted.map((item) => item.sourceNumber),
    [2],
  );
});

test("the stated form, grade and script quotes are recomputed on replay", () => {
  const rowOf = (ledger, number) =>
    ledger.marks.records.find((r) => r.sourceNumber === number);
  const form = fresh();
  rowOf(form, 1).cueForm = "bare";
  assert.ok(codes(form).includes("cue_form_differs"));
  const grade = fresh();
  rowOf(grade, 4).startGrade = "instruction_grounded";
  assert.ok(codes(grade).includes("start_grade_differs"));
  const quote = fresh();
  rowOf(quote, 4).scriptEvidence.firstDialogueQuote = "Hi Dave, what are";
  assert.ok(codes(quote).includes("script_quote_differs"));
  const moved = fresh();
  rowOf(moved, 1).scriptEvidence.instructionStartCharacter += 1;
  assert.ok(codes(moved).includes("script_quote_differs"));
  const section = fresh();
  rowOf(section, 2).scriptEvidence.sectionEndCharacter += 5;
  assert.ok(codes(section).includes("script_quote_differs"));
  const dropped = fresh();
  rowOf(dropped, 3).scriptEvidence = null;
  assert.ok(codes(dropped).includes("script_evidence_presence_differs"));
  // A member whose English listening is removed is no longer proven.
  const noDialogue = fresh();
  rowOf(noDialogue, 4).dialogueProbeEvidence = null;
  assert.ok(codes(noDialogue).includes("first_dialogue_not_proven"));
});

test("a garbled sentence is rescued only by the exact official first utterance", () => {
  const record = makeRecord();
  const native = makeNative(record);
  const sections = sectionsFor();
  // The recognizer heard the number but garbled the sentence after it.
  const garbled = "2번. 다음을 듣고 내 이름 날짜로 가자 정절 한 거슬 고르시오.";
  const probes = goodProbes().filter((p) => p.onsetFrame !== ONSETS[2] * 960);
  probes.push(makeProbe(ONSETS[2], garbled));
  let ledger = buildLedger({ record, native, probes, sections });
  assert.equal(row(ledger, 2).status, "held");
  assert.ok(
    row(ledger, 2).heldDiagnostics.numberHeard[0].reasons.includes(
      "first_dialogue_not_probed",
    ),
  );
  // The next round is asked to listen in English from the same frame.
  assert.deepEqual(
    ledger.resolved.memberDialogue.map((item) => item.sourceNumber),
    [2],
  );
  // Related words that are not the first utterance do not rescue it.
  const related = probes.concat(
    makeProbe(ONSETS[2], "Here is the weather for tomorrow, everyone.", {
      purpose: "first_dialogue",
      language: "en",
    }),
  );
  ledger = buildLedger({ record, native, probes: related, sections });
  assert.equal(row(ledger, 2).status, "held");
  // The exact first utterance does, and the row says how it is grounded.
  const exact = probes.concat(
    makeProbe(ONSETS[2], "Good morning, here is the weather for tomorrow.", {
      purpose: "first_dialogue",
      language: "en",
    }),
  );
  ledger = buildLedger({ record, native, probes: exact, sections });
  const rescued = row(ledger, 2);
  assert.equal(rescued.status, "candidate");
  assert.equal(rescued.startGrade, "first_dialogue_grounded");
  assert.ok(rescued.notes.includes("official_instruction_not_fully_heard"));
  assert.equal(
    rescued.identityEvidence.includes("official_instruction_after_ordinal"),
    false,
  );
  assert.equal(rescued.scriptEvidence.instructionProbeSegmentIds, null);
  assert.equal(
    rescued.scriptEvidence.firstDialogueQuote,
    "Good morning, here is the weather for tomorrow",
  );
  assert.deepEqual(verifyMarks(ledger.marks, ledger.env).errors, []);
  // Bare digits with a garbled sentence are never rescued this way.
  const bare = probes
    .slice(0, -1)
    .concat(makeProbe(ONSETS[2], garbled.replace("2번.", "2.")), exact.at(-1));
  ledger = buildLedger({ record, native, probes: bare, sections });
  assert.equal(row(ledger, 2).status, "held");
});
