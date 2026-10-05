import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ActivityError,
  dbfsOfEnergy,
  energyAtDbfs,
  measureEnergy,
  quietBefore,
  soundIslands,
  windowFrames,
} from "../lib/activity.mjs";
import {
  fineTailCandidates,
  followsBridge,
  onsetCandidates,
  probeBounds,
} from "../lib/candidates.mjs";
import {
  InventoryError,
  assertAssignedTotals,
  assignedRecords,
} from "../lib/inventory.mjs";
import {
  Mp3Error,
  durationMs,
  firstFrameLayout,
  playbackBounds,
} from "../lib/mp3.mjs";
import { POLICY } from "../lib/policy.mjs";
import { QuestionPlanError, questionPlans } from "../lib/questions.mjs";
import { alignDialogue, scriptSections } from "../lib/script.mjs";
import {
  PASSAGE_INSTRUCTION,
  SHARED_INSTRUCTION,
  makeRecord,
} from "./fixture.mjs";

test("windows are whole 20 ms spans of the native rate", () => {
  assert.equal(windowFrames(48000), 960);
  assert.equal(windowFrames(44100), 882);
  assert.throws(() => windowFrames(11025), ActivityError);
});

test("energy is the larger channel's exact sum of squares", () => {
  const left = new Int16Array(1920).fill(100);
  const right = new Int16Array(1920).fill(-200);
  const energy = measureEnergy([left, right], 1920 + 5, 48000);
  assert.deepEqual([...energy], [960 * 200 * 200, 960 * 200 * 200]);
  assert.ok(Math.abs(dbfsOfEnergy(energyAtDbfs(-50, 960), 960) + 50) < 1e-9);
  assert.equal(dbfsOfEnergy(0, 960), -Infinity);
});

test("a short quiet does not split a sound island; a long one does", () => {
  const loud = 10;
  const energy = new Float64Array(100);
  for (const w of [10, 11, 12, 20, 21, 60]) energy[w] = loud;
  assert.deepEqual(soundIslands(energy, loud, 15), [
    { start: 10, end: 22 },
    { start: 60, end: 61 },
  ]);
  assert.equal(quietBefore(energy, loud, 60), 38);
  assert.equal(quietBefore(energy, loud, 10), 10);
  assert.throws(() => soundIslands(energy, loud, 15, 0, 101), ActivityError);
  assert.throws(() => quietBefore(energy, loud, 101), ActivityError);
});

test("candidates are onsets with measured quiet; bridges are long islands or long quiets", () => {
  const frames = 960;
  const loud = energyAtDbfs(-10, frames);
  const energy = new Float64Array(2000);
  const paint = (from, to) => energy.fill(loud, from, to);
  paint(100, 420); // long island
  paint(450, 480); // after a bridge, 30 quiet windows
  paint(490, 600); // only 10 quiet windows before: not a candidate
  paint(800, 830); // after a long quiet
  const found = onsetCandidates(energy, frames);
  assert.deepEqual(
    found.map((c) => c.onsetWindow),
    [100, 450, 800],
  );
  assert.equal(found[1].startWindow, 450 - POLICY.leadWindows);
  assert.equal(followsBridge(found[1]), true);
  assert.equal(followsBridge(found[2]), true);
  assert.equal(
    followsBridge({ previousIslandWindows: 10, quietWindows: 30 }),
    false,
  );
  assert.deepEqual(probeBounds(found[1], 2000), {
    startWindow: 430,
    windowCount: 700,
  });
  assert.equal(probeBounds({ startWindow: 1950 }, 2000), null);
  assert.equal(probeBounds({ startWindow: -5 }, 2000), null);
});

test("the finer split finds a number that follows bridge music closely", () => {
  const frames = 960;
  const loud = energyAtDbfs(-10, frames);
  const energy = new Float64Array(2000);
  energy.fill(loud, 100, 600); // bridge music
  energy.fill(loud, 607, 640); // spoken number after 140 ms of quiet
  energy.fill(loud, 690, 900); // its sentence
  // The normal split sees one island of music and number.
  assert.deepEqual(
    onsetCandidates(energy, frames).map((c) => c.onsetWindow),
    [100, 690],
  );
  const fine = onsetCandidates(energy, frames, POLICY.fineBridgeWindows);
  const number = fine.find((c) => c.onsetWindow === 607);
  // The start is the first quiet window after the music, not 400 ms back.
  assert.equal(number.startWindow, 600);
  assert.equal(number.quietWindows, 7);
  assert.equal(followsBridge(number), true);
  assert.deepEqual(
    fineTailCandidates(energy, frames, 690).map((c) => c.onsetWindow),
    [607],
  );
  // A dip shorter than 100 ms is not an onset under any split.
  energy.fill(loud, 600, 604);
  assert.equal(
    onsetCandidates(energy, frames, POLICY.fineBridgeWindows).some(
      (c) => c.onsetWindow === 607,
    ),
    false,
  );
});

test("playback bytes are the original without its ID3 containers", () => {
  const audio = Buffer.from([0xff, 0xfb, 0x90, 0x00, 1, 2, 3, 4]);
  const id3 = Buffer.concat([
    Buffer.from("ID3\u0003\u0000\u0000", "latin1"),
    Buffer.from([0, 0, 0, 5]),
    Buffer.alloc(5),
  ]);
  const tag = Buffer.concat([Buffer.from("TAG"), Buffer.alloc(125)]);
  const padded = Buffer.concat([audio, Buffer.alloc(200, 1)]);
  assert.deepEqual(playbackBounds(Buffer.concat([id3, padded, tag])), {
    start: id3.length,
    end: id3.length + padded.length,
  });
  assert.deepEqual(playbackBounds(padded), { start: 0, end: padded.length });
  assert.throws(
    () =>
      playbackBounds(
        Buffer.from("ID3\u0009\u0000\u0000\u0000\u0000\u0000\u0005", "latin1"),
      ),
    Mp3Error,
  );
  assert.deepEqual(firstFrameLayout(audio, 0), {
    sampleRate: 44100,
    channels: 2,
  });
  assert.throws(() => firstFrameLayout(Buffer.from([0, 0, 0, 0]), 0), Mp3Error);
  assert.equal(durationMs(48001, 48000), 1001);
});

test("the three spoken forms come from the official fields", () => {
  const plans = questionPlans(makeRecord());
  assert.deepEqual(
    plans.map((p) => p.kind),
    [
      "single",
      "single",
      "shared_instruction_head",
      "shared_instruction_member",
      "shared_passage",
      "shared_passage",
    ],
  );
  assert.deepEqual(plans[2].spokenNumbers, [3, 4]);
  assert.deepEqual(plans[2].scopeQuestionNumbers, [3]);
  assert.equal(plans[2].officialInstruction, SHARED_INSTRUCTION);
  assert.deepEqual(plans[3].spokenNumbers, [4]);
  assert.equal(plans[3].officialInstruction, null);
  assert.deepEqual(plans[5].spokenNumbers, [5, 6]);
  assert.deepEqual(plans[5].scopeQuestionNumbers, [5, 6]);
  assert.equal(plans[5].blockHead, 5);
  assert.equal(plans[5].officialInstruction, PASSAGE_INSTRUCTION);
});

test("an image-only question keeps its number and takes no invented sentence", () => {
  const record = makeRecord();
  record.questions[0].prompt = "원본 문제지 1번 문항";
  // Its pair partner alone carries the separate instruction.
  record.questions[4].prompt = "원본 문제지 5번 문항";
  delete record.questions[4].instruction;
  record.questions[5].prompt = PASSAGE_INSTRUCTION + " 원본 문제지 6번 문항";
  const plans = questionPlans(record);
  assert.equal(plans[0].officialInstruction, null);
  assert.equal(plans[0].placeholderNumber, 1);
  assert.equal(plans[4].kind, "shared_passage");
  assert.equal(plans[4].inferredPair, true);
  assert.deepEqual(plans[4].spokenNumbers, [5, 6]);
});

test("a separate instruction that pairs with nothing is refused", () => {
  const record = makeRecord();
  record.questions[1].instruction = SHARED_INSTRUCTION;
  record.questions[2].instruction = SHARED_INSTRUCTION;
  record.questions[3].instruction = SHARED_INSTRUCTION;
  assert.throws(() => questionPlans(record), QuestionPlanError);
  const lone = makeRecord();
  lone.questions[1].instruction = "혼자 있는 지시문을 듣고 고르시오.";
  assert.throws(() => questionPlans(lone), QuestionPlanError);
});

const TRANSCRIPT = [
  "ANN : 이제 시작하겠습니다.",
  "1번 대화를 듣고, 남자가 구입할 물병으로 가장 적절한 것을 고르시오. M: Good afternoon. W: Hello, what can I do for you today?",
  "2번 다음을 듣고, 내일의 날씨로 가장 적절한 것을 고르시오. W: Good morning, here is the weather for tomorrow.",
  "【3-4】대화를 듣고, 남자의 마지막 말에 이어질 여자의 응답으로 가장 적절한 것을 고르시오.",
  "3번 Woman: ________ M: Jimin, look at these roses here. W: Wow, they are really beautiful.",
  "4번 W: Hi Dave, what are you doing here? M: I am waiting for the bus to go home.",
  "【5-6】 다음을 듣고, 물음에 답하시오. W: Hello everyone, some animals find their way home without a map.",
  "5번 여자가 하는 말의 주제로 가장 적절한 것을 고르시오. 6번 언급된 동물이 아닌 것을 고르시오.",
  "시그널 IN ANN : 수고하셨습니다.",
].join(" ");

test("the official script is split at its own printed numbers", () => {
  const plans = questionPlans(makeRecord());
  const { sections, reason } = scriptSections(
    TRANSCRIPT,
    plans,
    plans.map((plan) => plan.ownSentence),
  );
  assert.equal(reason, null);
  assert.deepEqual(sections.get(1).words.slice(0, 3), [
    "good",
    "afternoon",
    "hello",
  ]);
  assert.equal(
    sections.get(1).headText,
    "대화를 듣고, 남자가 구입할 물병으로 가장 적절한 것을 고르시오.",
  );
  assert.deepEqual(sections.get(4).words.slice(0, 4), [
    "hi",
    "dave",
    "what",
    "are",
  ]);
  // Both questions of a shared passage own the one passage.
  assert.deepEqual(sections.get(5).words, sections.get(6).words);
  assert.deepEqual(sections.get(6).sharedWith, [5, 6]);
  assert.ok(!sections.get(3).words.includes("hi"));
});

test("a script without text or with untraceable numbering gives no sections", () => {
  const plans = questionPlans(makeRecord());
  const prompts = plans.map((plan) => plan.ownSentence);
  assert.equal(
    scriptSections("\n\n\n", plans, prompts).reason,
    "official_script_has_no_text",
  );
  assert.equal(
    scriptSections(TRANSCRIPT.replace("2번 다음을", "다음을"), plans, prompts)
      .reason,
    "official_script_numbering_not_unique",
  );
});

test("a recognized utterance belongs to the one question that explains it", () => {
  const plans = questionPlans(makeRecord());
  const { sections } = scriptSections(
    TRANSCRIPT,
    plans,
    plans.map((plan) => plan.ownSentence),
  );
  const owned = alignDialogue(
    [
      { id: 1, text: "Hello, what can I do for you today?" },
      { id: 2, text: "Hi Dave, what are you doing here?" },
      { id: 3, text: "Some animals find their way home without a map." },
      { id: 4, text: "Completely unrelated words spoken by nobody here." },
      { id: 5, text: "Okay." },
    ],
    sections,
    plans,
  );
  assert.deepEqual(
    owned.get(1).map((o) => o.segmentId),
    [1],
  );
  assert.deepEqual(
    owned.get(4).map((o) => o.segmentId),
    [2],
  );
  assert.deepEqual(
    owned.get(5).map((o) => o.segmentId),
    [3],
  );
  assert.deepEqual(
    owned.get(6).map((o) => o.segmentId),
    [3],
  );
  assert.deepEqual(owned.get(2), []);
});

test("the assigned share is checked before anything is read from it", () => {
  const record = makeRecord();
  const inventory = {
    records: [record, { ...makeRecord(), assignedAgent: "grok" }],
  };
  assert.equal(assignedRecords(inventory).length, 1);
  assert.throws(() => assertAssignedTotals([record]), InventoryError);
  const twice = { records: [record, makeRecord()] };
  assert.throws(() => assignedRecords(twice), /Duplicate source/);
  const foreign = makeRecord();
  foreign.questions[2].metadata = {
    ...foreign.questions[2].metadata,
    sourceAudioSha256: "0".repeat(64),
  };
  assert.throws(
    () => assignedRecords({ records: [foreign] }),
    /audio identity/,
  );
  const repeated = makeRecord();
  repeated.questions[1].sourceNumber = 1;
  assert.throws(
    () => assignedRecords({ records: [repeated] }),
    /Duplicate question/,
  );
  assert.throws(
    () => assignedRecords({ records: [makeRecord({ reconstructed: true })] }),
    /Reconstructed/,
  );
});
