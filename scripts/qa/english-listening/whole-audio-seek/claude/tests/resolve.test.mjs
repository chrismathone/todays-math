import assert from "node:assert/strict";
import { test } from "node:test";
import { energyAtDbfs } from "../lib/activity.mjs";
import { POLICY } from "../lib/policy.mjs";
import { ResolveError, measureStart } from "../lib/resolve.mjs";
import {
  FRAMES,
  ONSETS,
  RATE,
  SHARED_INSTRUCTION,
  buildLedger,
  goodProbes,
  makeNative,
  makeProbe,
  makeRecord,
  probeSet,
} from "./fixture.mjs";
import { questionPlans } from "../lib/questions.mjs";
import { resolveSource } from "../lib/resolve.mjs";

const paint = (native, from, to) => {
  for (let w = from; w < to; w++) native.energy[w] = energyAtDbfs(-12, FRAMES);
};
const startMs = (onsetWindow) =>
  ((onsetWindow - POLICY.leadWindows) * FRAMES * 1000) / RATE;
const row = (ledger, number) =>
  ledger.rows.find((r) => r.sourceNumber === number);

test("every start is the measured frame a fixed lead before its spoken number", () => {
  const record = makeRecord();
  const ledger = buildLedger({
    record,
    native: makeNative(record),
    probes: goodProbes(),
  });
  assert.deepEqual(
    ledger.rows.map((r) => r.status),
    Array(6).fill("candidate"),
  );
  assert.equal(row(ledger, 1).seekStartMs, startMs(ONSETS[1]));
  assert.equal(row(ledger, 4).seekStartMs, startMs(ONSETS[4]));
  // A shared passage has one start for both of its questions.
  assert.equal(row(ledger, 5).seekStartMs, row(ledger, 6).seekStartMs);
  assert.deepEqual(row(ledger, 6).scopeQuestionNumbers, [5, 6]);
  assert.equal(row(ledger, 6).cueNumber, 5);
  // A shared instruction is not a shared passage.
  assert.deepEqual(row(ledger, 3).scopeQuestionNumbers, [3]);
  assert.deepEqual(row(ledger, 3).cueSpokenNumbers, [3, 4]);
  assert.deepEqual(row(ledger, 4).scopeQuestionNumbers, [4]);
  assert.notEqual(row(ledger, 3).seekStartMs, row(ledger, 4).seekStartMs);
  // Playback continues to the end of the whole original from every start.
  for (const r of ledger.rows)
    assert.equal(r.seekEndMs, record.audio.durationMs);
  const native = row(ledger, 1).nativeEvidence;
  assert.equal(
    native.onsetFrame - native.startFrame,
    POLICY.leadWindows * FRAMES,
  );
  assert.equal(native.probeOffsetFrame, native.startFrame);
});

test("a question nobody heard stays held; its start is never filled in", () => {
  const record = makeRecord();
  const probes = goodProbes().filter(
    (p) => p.onsetFrame !== ONSETS[2] * FRAMES,
  );
  const ledger = buildLedger({ record, native: makeNative(record), probes });
  const held = row(ledger, 2);
  assert.equal(held.status, "held");
  assert.equal(held.seekStartMs, null);
  assert.equal(held.seekEndMs, null);
  assert.equal(held.nativeEvidence, null);
  assert.equal(held.cueNumber, null);
  assert.deepEqual(held.reasons, ["no_probe_heard_this_number"]);
  // Neighbours on both sides are known; that still decides nothing.
  assert.equal(row(ledger, 1).status, "candidate");
  assert.equal(row(ledger, 3).status, "candidate");
  const gap = ledger.resolved.openGaps.find((g) => g.sourceNumber === 2);
  assert.ok(gap.afterFrame < gap.beforeFrame);
});

test("the same number proven at two distant places is ambiguous", () => {
  const record = makeRecord();
  const native = makeNative(record);
  // A second number-like island in the quiet before question 3.
  paint(native, 1350, 1390);
  const probes = goodProbes();
  probes.push(
    makeProbe(
      1350,
      "2번. 다음을 듣고, 내일의 날씨로 가장 적절한 것을 고르시오.",
    ),
  );
  const ledger = buildLedger({ record, native, probes });
  const held = row(ledger, 2);
  assert.equal(held.status, "held");
  assert.deepEqual(held.reasons, ["ambiguous_cue_positions"]);
  assert.equal(held.heldDiagnostics.provenStartFrames.length, 2);
});

test("two nearby onsets of one cue are one start, the nearer one", () => {
  const record = makeRecord();
  // A click 1.2 s before the spoken number: both onsets hear the number first.
  const native = makeNative(record);
  const click = ONSETS[2] - 60;
  native.energy[click] = energyAtDbfs(-20, FRAMES);
  const probes = goodProbes();
  probes.push(
    makeProbe(
      click,
      "2번. 다음을 듣고, 내일의 날씨로 가장 적절한 것을 고르시오.",
    ),
  );
  const ledger = buildLedger({ record, native, probes });
  assert.equal(row(ledger, 2).status, "candidate");
  assert.equal(row(ledger, 2).seekStartMs, startMs(ONSETS[2]));
});

test("starts out of question order are held, not reordered", () => {
  const record = makeRecord();
  const native = makeNative(record);
  paint(native, 200, 240);
  paint(native, 270, 400);
  const probes = goodProbes().filter(
    (p) => p.onsetFrame !== ONSETS[2] * FRAMES,
  );
  probes.push(
    makeProbe(
      200,
      "2번. 다음을 듣고, 내일의 날씨로 가장 적절한 것을 고르시오.",
    ),
  );
  const ledger = buildLedger({ record, native, probes });
  const pair = [row(ledger, 1), row(ledger, 2)];
  const held = pair.filter((r) => r.status === "held");
  assert.equal(held.length, 1);
  assert.deepEqual(held[0].reasons, ["ordinal_order_conflict"]);
  const kept = ledger.rows
    .filter((r) => r.status === "candidate")
    .map((r) => r.seekStartMs);
  assert.deepEqual(
    kept,
    [...kept].sort((a, b) => a - b),
  );
});

test("a start without measured quiet before the number is refused", () => {
  const record = makeRecord();
  const native = makeNative(record);
  // Sound right up to the spoken number: no quiet lead exists.
  for (let w = ONSETS[2] - 10; w < ONSETS[2]; w++)
    native.energy[w] = energyAtDbfs(-20, FRAMES);
  const ledger = buildLedger({ record, native, probes: goodProbes() });
  const held = row(ledger, 2);
  assert.equal(held.status, "held");
  assert.ok(
    held.heldDiagnostics.numberHeard.some((n) =>
      n.reasons.includes("quiet_before_onset_too_short"),
    ),
  );
});

test("the lead is re-measured, never taken from the request", () => {
  const record = makeRecord();
  const native = makeNative(record);
  assert.equal(measureStart(native, 100).reason, "start_off_window_grid");
  assert.equal(measureStart(native, 0).reason, "no_sound_at_onset");
  assert.equal(
    measureStart(native, native.energy.length * FRAMES).reason,
    "start_outside_audio",
  );
  const fact = measureStart(native, (ONSETS[1] - POLICY.leadWindows) * FRAMES);
  assert.equal(fact.onsetFrame, ONSETS[1] * FRAMES);
  assert.equal(fact.leadPeakDbfs, null);
  // A probe whose own start is off the window grid proves nothing.
  const probes = goodProbes();
  probes[0].startFrame += 7;
  const ledger = buildLedger({ record, native, probes });
  assert.equal(row(ledger, 1).status, "held");
});

test("an existing verified start is preserved exactly", () => {
  const record = makeRecord();
  record.questions[1].audioRange = {
    startMs: 19613,
    endMs: record.audio.durationMs,
  };
  const ledger = buildLedger({
    record,
    native: makeNative(record),
    probes: goodProbes(),
  });
  const kept = row(ledger, 2);
  assert.equal(kept.status, "existing_verified");
  assert.equal(kept.seekStartMs, 19613);
  assert.equal(kept.seekEndMs, record.audio.durationMs);
  assert.equal(kept.probeEvidence, null);
  assert.ok(
    kept.identityEvidence.includes("existing_verified_start_preserved"),
  );
});

test("a later start may not precede an existing verified one", () => {
  const record = makeRecord();
  // Question 1 is fixed AFTER the place a probe proves for question 2.
  record.questions[0].audioRange = {
    startMs: 25000,
    endMs: record.audio.durationMs,
  };
  const ledger = buildLedger({
    record,
    native: makeNative(record),
    probes: goodProbes(),
  });
  assert.equal(row(ledger, 1).seekStartMs, 25000);
  assert.equal(row(ledger, 2).status, "held");
  assert.deepEqual(row(ledger, 2).reasons, ["ordinal_order_conflict"]);
});

test("a member needs its own number and its own first dialogue", () => {
  const record = makeRecord();
  const native = makeNative(record);
  const withoutDialogue = goodProbes().filter(
    (p) => p.purpose !== "member_dialogue",
  );
  let ledger = buildLedger({ record, native, probes: withoutDialogue });
  assert.equal(row(ledger, 4).status, "held");
  assert.ok(
    row(ledger, 4).heldDiagnostics.numberHeard[0].reasons.includes(
      "member_first_dialogue_not_probed",
    ),
  );
  assert.equal(ledger.resolved.memberDialogue.length, 1);

  const wrongDialogue = withoutDialogue.concat(
    makeProbe(ONSETS[4], "Good morning. Here is the weather for tomorrow.", {
      purpose: "member_dialogue",
      language: "en",
    }),
  );
  ledger = buildLedger({ record, native, probes: wrongDialogue });
  assert.equal(row(ledger, 4).status, "held");
  assert.ok(
    row(ledger, 4).heldDiagnostics.numberHeard[0].reasons.includes(
      "member_first_dialogue_not_heard",
    ),
  );

  // An uncertain number asks for a short number-only listening.
  const unsure = goodProbes().filter((p) => p.purpose === "bridge_onset");
  unsure.push(makeProbe(ONSETS[4], "4번", { uncertain: [true] }));
  ledger = buildLedger({ record, native, probes: unsure });
  assert.equal(row(ledger, 4).status, "held");
  assert.deepEqual(ledger.resolved.cueOnly, [
    { sourceNumber: 4, startFrame: (ONSETS[4] - POLICY.leadWindows) * FRAMES },
  ]);
});

test("the shared sentence after a member's number is not the member's start", () => {
  const record = makeRecord();
  const probes = goodProbes().filter(
    (p) => p.onsetFrame !== ONSETS[4] * FRAMES,
  );
  // The pair's head, mis-heard without its first number.
  probes.push(makeProbe(ONSETS[4], "4번. " + SHARED_INSTRUCTION));
  const ledger = buildLedger({ record, native: makeNative(record), probes });
  assert.equal(row(ledger, 4).status, "held");
});

test("a probe file of another original is refused outright", () => {
  const record = makeRecord();
  const native = makeNative(record);
  const set = probeSet(record, native, goodProbes());
  set.artifact.sourceAudioSha256 = "0".repeat(64);
  assert.throws(
    () =>
      resolveSource({
        record,
        plans: questionPlans(record),
        native,
        probeSets: [set],
        asr: { segments: [] },
        dialogue: null,
        sections: null,
      }),
    ResolveError,
  );
});

test("several frozen-ASR utterances placed elsewhere hold a start", () => {
  const record = makeRecord();
  const asr = {
    segments: [1, 2, 3].map((id) => ({
      id,
      text: "good afternoon hello what can i do",
      estimatedStartSeconds: 50 + id,
      estimatedEndSeconds: 51 + id,
      uncertain: false,
    })),
  };
  const plans = questionPlans(record);
  const native = makeNative(record);
  const dialogue = new Map(plans.map((plan) => [plan.sourceNumber, []]));
  dialogue.set(
    1,
    [1, 2, 3].map((segmentId) => ({ segmentId })),
  );
  const resolved = resolveSource({
    record,
    plans,
    native,
    probeSets: [probeSet(record, native, goodProbes())],
    asr,
    dialogue,
    sections: null,
  });
  assert.equal(resolved.rows[0].status, "held");
  assert.deepEqual(resolved.rows[0].reasons, ["dialogue_anchor_conflict"]);
  // One stray utterance is not a contradiction.
  dialogue.set(1, [{ segmentId: 1 }]);
  const again = resolveSource({
    record,
    plans,
    native,
    probeSets: [probeSet(record, native, goodProbes())],
    asr,
    dialogue,
    sections: null,
  });
  assert.equal(again.rows[0].status, "candidate");
});
