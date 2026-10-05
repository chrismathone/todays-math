import assert from "node:assert/strict";
import { test } from "node:test";
import { heardOpening } from "../lib/evidence.mjs";
import { questionPlans } from "../lib/questions.mjs";
import { scriptSections } from "../lib/script.mjs";
import { verifyMarks } from "../lib/verify.mjs";
import {
  ONSETS,
  TRANSCRIPT,
  buildLedger,
  goodProbes,
  makeNative,
  makeProbe,
  makeRecord,
} from "./fixture.mjs";

/** A member whose first utterance is a one-word greeting. */
const SHORT = TRANSCRIPT.replace(
  "4번 W: Hi Dave, what are you doing here? M: I am waiting for the bus to go home.",
  "4번 [Telephone rings.] W: Hello? M : Hi, this is Minsu. Can I speak to Harry?",
);
const sectionsOf = (transcript) => {
  const plans = questionPlans(makeRecord());
  return scriptSections(
    transcript,
    plans,
    plans.map((plan) => plan.ownSentence),
  ).sections;
};

test("a short first utterance is quoted whole with the start of the next", () => {
  assert.notEqual(SHORT, TRANSCRIPT);
  const utterances = sectionsOf(SHORT).get(4).utterances;
  assert.deepEqual(
    utterances.slice(0, 2).map((u) => u.text),
    ["Hello?", "Hi, this is Minsu. Can I speak to Harry?"],
  );
  // The recognizer spelled the name differently: the opening stops before it.
  const probe = makeProbe(ONSETS[4], [
    "Hello?",
    "Hi, this is Minsoo. Can I speak to Harry?",
  ]);
  const heard = heardOpening(utterances, probe);
  assert.deepEqual(
    heard.quotes.map((q) => q.text),
    ["Hello?", "Hi, this is"],
  );
  assert.equal(heard.words, 4);
  assert.deepEqual(heard.segmentIds, [1, 2]);
  for (const quote of heard.quotes)
    assert.equal(
      SHORT.slice(quote.startCharacter, quote.endCharacter),
      quote.text,
    );
  // Without the greeting the opening was not heard from its beginning.
  const noGreeting = makeProbe(ONSETS[4], "Hi, this is Minsu. Can I speak?");
  assert.equal(heardOpening(utterances, noGreeting), null);
  // Three words in a row are not an opening.
  const three = makeProbe(ONSETS[4], "Hello? Hi, this was fun.");
  assert.equal(heardOpening(utterances, three), null);
});

test("a first utterance of four words or more is quoted alone", () => {
  const utterances = sectionsOf(TRANSCRIPT).get(4).utterances;
  const probe = makeProbe(
    ONSETS[4],
    "Hi Dave, what are you doing here? I am waiting for the bus.",
  );
  const heard = heardOpening(utterances, probe);
  assert.deepEqual(
    heard.quotes.map((q) => q.text),
    ["Hi Dave, what are you doing here"],
  );
});

test("a member grounded by a greeting chain replays; share alone grounds nothing", () => {
  const record = makeRecord();
  const sections = sectionsOf(SHORT);
  const probes = goodProbes().filter((p) => p.purpose !== "member_dialogue");
  probes.push(
    makeProbe(
      ONSETS[4] + 70,
      "Hello? Hi, this is Minsoo. Can I speak to Harry?",
      {
        purpose: "member_dialogue",
        language: "en",
      },
    ),
  );
  const ledger = buildLedger({
    record,
    native: makeNative(record),
    probes,
    sections,
  });
  ledger.env.context = () => ({
    plans: ledger.plans,
    sections,
    transcriptText: SHORT,
    transcriptSha256: "7".repeat(64),
  });
  const member = ledger.rows.find((r) => r.sourceNumber === 4);
  assert.equal(member.status, "candidate");
  assert.equal(member.scriptEvidence.firstDialogueQuote, null);
  assert.deepEqual(
    member.scriptEvidence.firstDialogueOpeningEvidence.quotes.map(
      (q) => q.text,
    ),
    ["Hello?", "Hi, this is"],
  );
  assert.equal(
    member.scriptEvidence.firstDialogueOpeningEvidence.method,
    "exact_original_opening_v1",
  );
  assert.deepEqual(verifyMarks(ledger.marks, ledger.env).errors, []);
  // A changed chain no longer replays.
  member.scriptEvidence.firstDialogueOpeningEvidence.quotes[1].text =
    "Hi, this";
  assert.ok(
    verifyMarks(ledger.marks, ledger.env).errors.some(
      (error) => error.code === "script_quote_differs",
    ),
  );
  // Most of the right words in another order is not an opening.
  const shuffled = goodProbes().filter((p) => p.purpose !== "member_dialogue");
  shuffled.push(
    makeProbe(
      ONSETS[4] + 70,
      "Can I speak to Harry? This is Minsu. Hi, hello?",
      {
        purpose: "member_dialogue",
        language: "en",
      },
    ),
  );
  const loose = buildLedger({
    record,
    native: makeNative(record),
    probes: shuffled,
    sections,
  });
  assert.equal(loose.rows.find((r) => r.sourceNumber === 4).status, "held");
});
