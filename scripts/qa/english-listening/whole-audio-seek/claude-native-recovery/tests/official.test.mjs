import assert from "node:assert/strict";
import test from "node:test";
import {
  OFFICIAL_ROUTE,
  resolveOfficial,
  scriptAnchors,
  sectionSentences,
} from "../lib/official.mjs";
import {
  AT,
  FRAMES,
  QUOTES,
  RATE,
  SCRIPT,
  english,
  makeOfficialInput,
  rowOf,
  startOf,
} from "./fixture.mjs";

const ms = (onsetWindow) => Math.floor((startOf(onsetWindow) * 1000) / RATE);
const reason = (result, id) => rowOf(result, id).reasons?.[0];
const QUESTIONS = [1, 2, 3, 4, 5].map((n) => ({ sourceNumber: n, instruction: null }));

test("a section's sentences keep their literal place in the script, and only script-unique ones anchor", () => {
  const anchors = scriptAnchors(SCRIPT, QUESTIONS);
  const one = anchors.get(1);
  assert.deepEqual(
    one.anchors.map((s) => s.text),
    ["How was your weekend?", QUOTES.a],
  );
  for (const sentence of sectionSentences(one.section))
    assert.equal(SCRIPT.slice(sentence.startCharacter, sentence.endCharacter), sentence.text);
  // "Thank you." has two words; "Hi, Minsoo." has two.
  assert.deepEqual(anchors.get(3).anchors.map((s) => s.text), [QUOTES.c]);
  assert.deepEqual(anchors.get(4).anchors.map((s) => s.text), [QUOTES.d]);
  // A sentence the script prints in two sections anchors neither.
  const twice = scriptAnchors(SCRIPT + "\nM: How was your weekend?", QUESTIONS);
  assert.deepEqual(twice.get(1).anchors.map((s) => s.text), [QUOTES.a]);
});

test("an official question is offered at its own measured number when its own script sentence is heard inside the passage", () => {
  const result = resolveOfficial(makeOfficialInput([2]));
  const row = rowOf(result, "o-2");
  assert.equal(row.status, "candidate");
  assert.equal(row.route, OFFICIAL_ROUTE);
  assert.equal(row.reconstructed, false);
  assert.equal(row.seekStartMs, ms(AT[2]));
  assert.deepEqual(row.scopeQuestionNumbers, [2]);
  assert.match(row.probeEvidence.text, /^2번입니다/);
  assert.match(row.nextProbeEvidence.text, /^3번입니다/);
  const [sentence] = row.scriptEvidence.sentences;
  assert.equal(sentence.text, "First of all, turn off the light when you leave the room.");
  assert.equal(SCRIPT.slice(sentence.startCharacter, sentence.endCharacter), sentence.text);
  assert.equal(row.dialogueProbeEvidence.startFrame, 3400 * FRAMES);
  assert.equal(row.scriptEvidence.transcriptSha256, "5".repeat(64));
});

test("another section's sentence inside the passage, or the own sentence outside it, holds the question", () => {
  const foreign = makeOfficialInput([2]);
  foreign.enListenings.push(english(3450, 600, QUOTES.c));
  assert.equal(reason(resolveOfficial(foreign), "o-2"), "another_sections_sentence_heard_in_passage");
  const outside = makeOfficialInput([2]);
  outside.enListenings.push(english(6000, 500, "First of all, turn off the light when you leave the room."));
  assert.equal(reason(resolveOfficial(outside), "o-2"), "own_script_sentence_heard_outside_passage");
});

test("without its own sentence, its own measured number or a usable script, an official question stays held", () => {
  const unheard = makeOfficialInput([2]);
  unheard.enListenings = unheard.enListenings.filter((l) => l.startFrame !== 3400 * FRAMES);
  assert.equal(reason(resolveOfficial(unheard), "o-2"), "own_script_sentence_not_heard_in_passage_clip");
  // A respelled name ends an exact opening; a later own sentence still counts,
  // but a respelled sentence does not.
  unheard.enListenings.push(english(3400, 1000, "First of all, turn off the lights when you leave the room."));
  assert.equal(reason(resolveOfficial(unheard), "o-2"), "own_script_sentence_not_heard_in_passage_clip");
  const noNumber = makeOfficialInput([2]);
  noNumber.koListenings = noNumber.koListenings.filter((l) => l.startFrame !== startOf(AT[2]));
  assert.equal(reason(resolveOfficial(noNumber), "o-2"), "own_number_not_heard_at_any_measured_onset");
  const noNext = makeOfficialInput([2]);
  noNext.koListenings = noNext.koListenings.filter((l) => l.startFrame !== startOf(AT[3]));
  assert.equal(reason(resolveOfficial(noNext), "o-2"), "next_heading_not_established");
  const empty = makeOfficialInput([2], { script: { text: "", sha256: "0".repeat(64) } });
  assert.equal(reason(resolveOfficial(empty), "o-2"), "official_text_unavailable");
  const doubled = makeOfficialInput([2], {
    script: { text: SCRIPT + "\n2번 다음을 듣고", sha256: "0".repeat(64) },
  });
  assert.match(reason(resolveOfficial(doubled), "o-2"), /^official_script_sections_unavailable:/);
  const unbound = makeOfficialInput([2], { script: { reason: "official_script_not_bound:x" } });
  assert.equal(reason(resolveOfficial(unbound), "o-2"), "official_script_not_bound:x");
});

test("the next number's certified start bounds an official passage", () => {
  const input = makeOfficialInput([2]);
  input.certRows = [
    {
      questionId: "o-3",
      sourceNumber: 3,
      reconstructed: false,
      status: "preserved",
      audioRange: { startMs: ms(AT[3]), endMs: 1 },
    },
  ];
  input.koListenings = input.koListenings.filter((l) => l.startFrame !== startOf(AT[3]));
  const row = rowOf(resolveOfficial(input), "o-2");
  assert.equal(row.status, "candidate");
  assert.equal(row.nativeRecovery.nextBoundary.kind, "existing_certificate_start");
  assert.equal(row.nextProbeEvidence, null);
  assert.equal(row.nativeRecovery.passageFrames.toFrame, startOf(AT[3]));
});
