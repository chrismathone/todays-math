import assert from "node:assert/strict";
import { test } from "node:test";
import { questionPlans } from "../lib/questions.mjs";
import { scriptSections } from "../lib/script.mjs";
import { TRANSCRIPT, makeRecord } from "./fixture.mjs";

const plans = questionPlans(makeRecord());
const prompts = plans.map((plan) => plan.ownSentence);
const Q1 =
  "1번 대화를 듣고, 남자가 구입할 물병으로 가장 적절한 것을 고르시오. M: Good afternoon. W: Hello, what can I do for you today?";
const Q2 =
  "2번 다음을 듣고, 내일의 날씨로 가장 적절한 것을 고르시오. W: Good morning, here is the weather for tomorrow.";

test("a number printed with a space before its mark is still that number", () => {
  const spaced = TRANSCRIPT.replace("2번 다음을", "2 . 다음을");
  const { sections, reason } = scriptSections(spaced, plans, prompts);
  assert.equal(reason, null);
  assert.deepEqual(sections.get(2).words.slice(0, 2), ["good", "morning"]);
});

test("a section ends at the next number as printed, not as numbered", () => {
  // The transcript prints question 2 before question 1.
  const swapped = TRANSCRIPT.replace(Q1 + " " + Q2, Q2 + " " + Q1);
  assert.notEqual(swapped, TRANSCRIPT);
  // Only single questions can be followed by their own sentence here.
  const singles = plans.slice(0, 2);
  const { sections, reason } = scriptSections(
    swapped,
    singles,
    singles.map((plan) => plan.ownSentence),
  );
  assert.equal(reason, null);
  assert.deepEqual(sections.get(2).words, [
    "good",
    "morning",
    "here",
    "is",
    "the",
    "weather",
    "for",
    "tomorrow",
  ]);
  assert.deepEqual(sections.get(1).words.slice(0, 2), ["good", "afternoon"]);
  assert.equal(
    swapped.slice(
      sections.get(1).firstUtterance.start,
      sections.get(1).firstUtterance.end,
    ),
    "Good afternoon.",
  );
});

test("a printed answer blank is not the first utterance", () => {
  const { sections } = scriptSections(TRANSCRIPT, plans, prompts);
  // Question 3 prints "Woman: ________" before its dialogue.
  const first = sections.get(3).firstUtterance;
  assert.equal(first.text, "Jimin, look at these roses here.");
  assert.equal(TRANSCRIPT.slice(first.start, first.end), first.text);
  assert.equal(
    sections.get(3).instruction.text.startsWith("대화를 듣고"),
    true,
  );
  // A member's number is followed by its dialogue: no sentence of its own.
  assert.equal(sections.get(4).instruction, null);
});

test("out-of-order numbering is followed only when every sentence is unique", () => {
  const swapped = TRANSCRIPT.replace(Q1 + " " + Q2, Q2 + " " + Q1);
  // A member has no own sentence after its number, so nothing can vouch for it.
  assert.equal(
    scriptSections(swapped, plans, prompts).reason,
    "official_script_numbering_not_unique",
  );
});
