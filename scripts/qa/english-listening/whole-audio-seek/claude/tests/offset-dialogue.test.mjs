import assert from "node:assert/strict";
import { test } from "node:test";
import { POLICY } from "../lib/policy.mjs";
import { verifyMarks } from "../lib/verify.mjs";
import {
  FRAMES,
  ONSETS,
  buildLedger,
  goodProbes,
  makeNative,
  makeProbe,
  makeRecord,
} from "./fixture.mjs";

const DIALOGUE =
  "Hi Dave, what are you doing here? I am waiting for the bus to go home.";
const row = (ledger, number) =>
  ledger.rows.find((r) => r.sourceNumber === number);
/** The fixture's number island is 40 windows; what follows starts 70 after it. */
const AFTER_NUMBER = 70;

const withMemberDialogueAt = (onsetWindow, text = DIALOGUE) => {
  const record = makeRecord();
  const probes = goodProbes().filter((p) => p.purpose !== "member_dialogue");
  // The same-frame English listening heard only the number and stopped.
  probes.push(
    makeProbe(ONSETS[4], "Number 4.", {
      purpose: "member_dialogue",
      language: "en",
    }),
    makeProbe(onsetWindow, text, {
      purpose: "member_dialogue",
      language: "en",
    }),
  );
  return buildLedger({ record, native: makeNative(record), probes });
};

test("a member's first utterance may be heard from the next measured onset", () => {
  const ledger = withMemberDialogueAt(ONSETS[4] + AFTER_NUMBER);
  const member = row(ledger, 4);
  assert.equal(member.status, "candidate");
  assert.equal(member.startGrade, "first_dialogue_grounded");
  // The start itself stays at the spoken number.
  assert.equal(
    member.nativeEvidence.startFrame,
    (ONSETS[4] - POLICY.leadWindows) * FRAMES,
  );
  assert.equal(
    member.dialogueProbeEvidence.offsetFromStartFrames,
    AFTER_NUMBER * FRAMES,
  );
  assert.equal(
    member.dialogueProbeEvidence.startFrame,
    member.nativeEvidence.startFrame + AFTER_NUMBER * FRAMES,
  );
  assert.deepEqual(verifyMarks(ledger.marks, ledger.env).errors, []);
});

test("a later listening must hear this question's own first utterance", () => {
  const ledger = withMemberDialogueAt(
    ONSETS[4] + AFTER_NUMBER,
    "Good morning, here is the weather for tomorrow.",
  );
  assert.equal(row(ledger, 4).status, "held");
});

test("a listening that begins after another question's number is not this one's", () => {
  // Question 5's block starts 10 s after question 4 in the fixture: an English
  // listening from there cannot ground question 4, whatever it heard.
  const ledger = withMemberDialogueAt(ONSETS[5] + AFTER_NUMBER);
  assert.equal(row(ledger, 4).status, "held");
});

test("a replay refuses a dialogue probe moved out of reach or onto no onset", () => {
  const codes = (ledger) =>
    verifyMarks(ledger.marks, ledger.env).errors.map((error) => error.code);
  const far = withMemberDialogueAt(ONSETS[4] + AFTER_NUMBER);
  const probe = far.set.artifact.probes.find(
    (p) => p.purpose === "member_dialogue" && p.segments[0].text === DIALOGUE,
  );
  // Seven seconds after the start is past a member's reach.
  probe.startFrame += 350 * FRAMES;
  row(far, 4).dialogueProbeEvidence.startFrame = probe.startFrame;
  assert.ok(codes(far).includes("probe_does_not_begin_at_start"));
  const early = withMemberDialogueAt(ONSETS[4] + AFTER_NUMBER);
  const before = early.set.artifact.probes.find(
    (p) => p.purpose === "member_dialogue" && p.segments[0].text === DIALOGUE,
  );
  before.startFrame = row(early, 4).nativeEvidence.startFrame - 50 * FRAMES;
  assert.ok(codes(early).includes("probe_does_not_begin_at_start"));
});

test("the next round is asked to listen after the number, not at it", () => {
  const record = makeRecord();
  const probes = goodProbes().filter((p) => p.purpose !== "member_dialogue");
  const ledger = buildLedger({
    record,
    native: makeNative(record),
    probes,
  });
  const [wanted] = ledger.resolved.memberDialogue;
  assert.equal(wanted.sourceNumber, 4);
  assert.ok(wanted.afterFrame > wanted.startFrame);
  assert.equal(wanted.reachFrames, 6 * 48000);
});
