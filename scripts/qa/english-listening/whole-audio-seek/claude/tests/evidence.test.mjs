import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EvidenceError,
  assertProbeShape,
  firstDialogueShare,
  judgeProbe,
  readProbe,
} from "../lib/evidence.mjs";
import { questionPlans } from "../lib/questions.mjs";
import {
  MEMBER_WORDS,
  ONSETS,
  SHARED_INSTRUCTION,
  makeNative,
  makeProbe,
  makeRecord,
} from "./fixture.mjs";

const record = makeRecord();
const pcm = makeNative(record).meta.pcm;
const plans = questionPlans(record);
const plan = (number) => plans.find((p) => p.sourceNumber === number);
const good = () =>
  makeProbe(
    ONSETS[1],
    "1번 대화를 듣고 남자가 구입할 물병으로 가장 적절한 것을 고르시오.",
  );

test("a well formed probe on the native clock is accepted", () => {
  assert.doesNotThrow(() => assertProbeShape(good(), pcm));
});

test("an off-clock probe is rejected", () => {
  const wrongRate = { ...good(), sampleRate: 44100 };
  assert.throws(() => assertProbeShape(wrongRate, pcm), EvidenceError);
  const wrongChannels = { ...good(), channels: 1 };
  assert.throws(() => assertProbeShape(wrongChannels, pcm), EvidenceError);
  const pastEnd = { ...good(), startFrame: pcm.frameCount - 10 };
  assert.throws(() => assertProbeShape(pastEnd, pcm), /past the original/);
  const fractional = { ...good(), startFrame: 480000.5 };
  assert.throws(() => assertProbeShape(fractional, pcm), EvidenceError);
  const negative = { ...good(), startFrame: -960 };
  assert.throws(() => assertProbeShape(negative, pcm), EvidenceError);
  // A stated duration that is not the real frame count is a different clock.
  const stretched = { ...good(), durationSeconds: 15 };
  assert.throws(() => assertProbeShape(stretched, pcm), /duration/);
});

test("malformed raw segment bounds are rejected", () => {
  const mutate = (change) => {
    const probe = good();
    change(probe.segments[0]);
    return probe;
  };
  for (const change of [
    (s) => (s.localEndSeconds = s.localStartSeconds - 1),
    (s) => (s.localStartSeconds = -0.5),
    (s) => (s.localEndSeconds = Number.NaN),
    (s) => (s.localStartSeconds = "0"),
    (s) => delete s.uncertain,
    (s) => (s.text = null),
    (s) => (s.id = 0),
  ])
    assert.throws(() => assertProbeShape(mutate(change), pcm), EvidenceError);
  const repeated = makeProbe(ONSETS[1], ["1번", "대화를 듣고"]);
  repeated.segments[1].id = 1;
  assert.throws(() => assertProbeShape(repeated, pcm), /increasing/);
});

test("recognized time past the real clip is overflow and is never hidden", () => {
  const probe = good();
  probe.segments[0].localEndSeconds = probe.durationSeconds + 3;
  // The stored flag still says false: the record contradicts itself.
  assert.throws(() => assertProbeShape(probe, pcm), /overflow flag/);
  probe.overflow = true;
  assert.doesNotThrow(() => assertProbeShape(probe, pcm));
  const verdict = judgeProbe(plan(1), readProbe(probe));
  assert.equal(verdict.ok, false);
  assert.ok(verdict.reasons.includes("probe_overflow"));
});

test("missing hashes are rejected", () => {
  assert.throws(
    () => assertProbeShape({ ...good(), inputMonoFloat32Sha256: "" }, pcm),
    /hashes/,
  );
});

test("the question's own number and sentence prove a start", () => {
  const verdict = judgeProbe(plan(1), readProbe(good()));
  assert.equal(verdict.ok, true);
  assert.equal(verdict.cueForm, "beon");
  assert.ok(verdict.instructionCoverage >= 0.8);
});

test("a probe that heard no number proves nothing", () => {
  const probe = makeProbe(
    ONSETS[1],
    "대화를 듣고 남자가 구입할 물병으로 가장 적절한 것을 고르시오.",
  );
  const verdict = judgeProbe(plan(1), readProbe(probe));
  assert.equal(verdict.ok, false);
  assert.deepEqual(verdict.reasons, ["no_leading_number"]);
});

test("another question's number is refused", () => {
  const verdict = judgeProbe(plan(2), readProbe(good()));
  assert.equal(verdict.ok, false);
  assert.ok(verdict.reasons.includes("spoken_number_differs"));
});

test("the right number with another question's sentence is refused", () => {
  const probe = makeProbe(
    ONSETS[1],
    "1번 다음을 듣고, 내일의 날씨로 가장 적절한 것을 고르시오.",
  );
  const verdict = judgeProbe(plan(1), readProbe(probe));
  assert.equal(verdict.ok, false);
  assert.deepEqual(verdict.reasons, ["official_instruction_not_heard"]);
});

test("an uncertain number is refused", () => {
  const first = makeProbe(
    ONSETS[1],
    ["1번", "대화를 듣고 남자가 구입할 물병으로 가장 적절한 것을 고르시오."],
    {
      uncertain: [true, false],
    },
  );
  assert.ok(
    judgeProbe(plan(1), readProbe(first)).reasons.includes(
      "cue_segment_uncertain",
    ),
  );
  const second = makeProbe(ONSETS[3], ["3번과", "4번. " + SHARED_INSTRUCTION], {
    uncertain: [false, true],
  });
  assert.ok(
    judgeProbe(plan(3), readProbe(second)).reasons.includes(
      "cue_spans_uncertain_segment",
    ),
  );
});

test("a sentence heard only in an uncertain segment is not heard", () => {
  const probe = makeProbe(
    ONSETS[1],
    ["1번", "대화를 듣고 남자가 구입할 물병으로 가장 적절한 것을 고르시오."],
    {
      uncertain: [false, true],
    },
  );
  const verdict = judgeProbe(plan(1), readProbe(probe));
  assert.deepEqual(verdict.reasons, ["official_instruction_not_heard"]);
});

test("speech that starts late does not begin at the start", () => {
  const probe = good();
  probe.segments[0].localStartSeconds = 6;
  assert.ok(
    judgeProbe(plan(1), readProbe(probe)).reasons.includes("first_speech_late"),
  );
});

test("a shared pair needs both spoken numbers in order", () => {
  const head = makeProbe(ONSETS[3], "3번과 4번. " + SHARED_INSTRUCTION);
  assert.equal(judgeProbe(plan(3), readProbe(head)).ok, true);
  const onlyFirst = makeProbe(ONSETS[3], "3번. " + SHARED_INSTRUCTION);
  assert.ok(
    judgeProbe(plan(3), readProbe(onlyFirst)).reasons.includes(
      "spoken_number_differs",
    ),
  );
  const passage = makeProbe(
    ONSETS[5],
    "5번과 6번 다음을 듣고 물음에 답하시오.",
  );
  assert.equal(judgeProbe(plan(5), readProbe(passage)).ok, true);
  assert.equal(judgeProbe(plan(6), readProbe(passage)).ok, true);
  // The second number alone, spoken after the passage, is not the block start.
  const later = makeProbe(ONSETS[5], "6번. 언급된 동물이 아닌 것을 고르시오.");
  assert.equal(judgeProbe(plan(6), readProbe(later)).ok, false);
});

test("a member's number followed by the shared sentence is the pair's head", () => {
  const split = makeProbe(ONSETS[3], "4번. " + SHARED_INSTRUCTION);
  const verdict = judgeProbe(plan(4), readProbe(split), SHARED_INSTRUCTION);
  assert.equal(verdict.ok, false);
  assert.deepEqual(verdict.reasons, ["member_followed_by_shared_instruction"]);
});

test("bare digits need the question's own sentence", () => {
  const withSentence = makeProbe(
    ONSETS[2],
    "2. 다음을 듣고, 내일의 날씨로 가장 적절한 것을 고르시오.",
  );
  const verdict = judgeProbe(plan(2), readProbe(withSentence));
  assert.equal(verdict.ok, true);
  assert.equal(verdict.cueForm, "bare");
  const alone = makeProbe(ONSETS[4], "4.");
  assert.ok(
    judgeProbe(plan(4), readProbe(alone), SHARED_INSTRUCTION).reasons.includes(
      "bare_number_without_official_instruction",
    ),
  );
});

test("the official first utterance must be heard in certain segments", () => {
  const heard = makeProbe(
    ONSETS[4],
    "Hi Dave, what are you doing here? I am waiting for the bus to go home.",
  );
  assert.equal(firstDialogueShare(MEMBER_WORDS, heard), 1);
  const other = makeProbe(
    ONSETS[4],
    "Good morning. Here is the weather for tomorrow.",
  );
  assert.equal(firstDialogueShare(MEMBER_WORDS, other), 0);
  const unsure = makeProbe(
    ONSETS[4],
    "Hi Dave, what are you doing here? I am waiting for the bus to go home.",
    {
      uncertain: [true],
    },
  );
  assert.equal(firstDialogueShare(MEMBER_WORDS, unsure), 0);
  assert.equal(firstDialogueShare(["too", "short"], heard), 0);
});
