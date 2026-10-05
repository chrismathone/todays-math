import assert from "node:assert/strict";
import { test } from "node:test";
import { verifyMarks } from "../lib/verify.mjs";
import {
  FRAMES,
  buildLedger,
  goodProbes,
  makeNative,
  makeRecord,
} from "./fixture.mjs";

const fresh = (change = () => {}) => {
  const record = makeRecord();
  change(record);
  return buildLedger({
    record,
    native: makeNative(record),
    probes: goodProbes(),
  });
};
const codes = (ledger) =>
  verifyMarks(ledger.marks, ledger.env).errors.map((error) => error.code);
const rowOf = (ledger, number) =>
  ledger.marks.records.find((row) => row.sourceNumber === number);

test("a ledger built from the evidence replays without a disagreement", () => {
  const ledger = fresh();
  const { errors, counts } = verifyMarks(ledger.marks, ledger.env);
  assert.deepEqual(errors, []);
  assert.deepEqual(counts, { candidate: 6, held: 0, existing_verified: 0 });
});

test("a row of another question is a wrong identity", () => {
  for (const field of [
    "questionId",
    "sourceNumber",
    "documentSha256",
    "revision",
    "asrSha256",
    "playbackSha256",
  ]) {
    const ledger = fresh();
    rowOf(ledger, 2)[field] = field === "revision" ? 99 : "tampered";
    assert.ok(codes(ledger).includes("wrong_question_identity"), field);
  }
});

test("a missing, extra or reordered row is found", () => {
  const missing = fresh();
  missing.marks.records.pop();
  assert.ok(codes(missing).includes("row_count_differs"));
  assert.ok(codes(missing).includes("missing_row"));
  const swapped = fresh();
  swapped.marks.records.reverse();
  assert.ok(codes(swapped).includes("wrong_question_identity"));
  const extra = fresh();
  extra.marks.records.push({ ...extra.marks.records[0] });
  assert.ok(codes(extra).includes("row_count_differs"));
});

test("a start that is not the measured native frame is rejected", () => {
  const shifted = fresh();
  rowOf(shifted, 1).seekStartMs += 1;
  assert.ok(codes(shifted).includes("seek_start_off_native_clock"));
  // Moving the frame itself lands in sound or loses the quiet lead.
  const moved = fresh();
  rowOf(moved, 1).nativeEvidence.startFrame += 30 * FRAMES;
  assert.ok(codes(moved).includes("quiet_before_onset_too_short"));
  const offGrid = fresh();
  rowOf(offGrid, 1).nativeEvidence.startFrame += 13;
  assert.ok(codes(offGrid).includes("start_off_window_grid"));
  const otherClock = fresh();
  rowOf(otherClock, 1).nativeEvidence.sampleRate = 44100;
  assert.ok(codes(otherClock).includes("off_native_clock"));
  const otherPcm = fresh();
  rowOf(otherPcm, 1).nativeEvidence.pcmSha256 = "0".repeat(64);
  assert.ok(codes(otherPcm).includes("off_native_clock"));
});

test("playback must continue to the end of the whole original", () => {
  const ledger = fresh();
  rowOf(ledger, 1).seekEndMs -= 1000;
  assert.ok(codes(ledger).includes("continuation_must_end_at_full_original"));
});

test("an existing verified start cannot change or be invented", () => {
  const withExisting = (change) =>
    fresh((record) => {
      record.questions[1].audioRange = {
        startMs: 19613,
        endMs: record.audio.durationMs,
      };
      change?.(record);
    });
  const clean = withExisting();
  assert.deepEqual(codes(clean), []);
  assert.equal(rowOf(clean, 2).seekStartMs, 19613);
  const changed = withExisting();
  rowOf(changed, 2).seekStartMs = 19600;
  assert.ok(codes(changed).includes("existing_verified_changed"));
  const demoted = withExisting();
  rowOf(demoted, 2).status = "held";
  assert.ok(codes(demoted).includes("existing_verified_changed"));
  const invented = fresh();
  rowOf(invented, 2).status = "existing_verified";
  assert.ok(codes(invented).includes("fabricated_existing_verification"));
});

test("a held row carries reasons and no start", () => {
  const record = makeRecord();
  const probes = goodProbes().slice(1);
  const ledger = buildLedger({ record, native: makeNative(record), probes });
  assert.equal(rowOf(ledger, 1).status, "held");
  assert.deepEqual(codes(ledger), []);
  rowOf(ledger, 1).seekStartMs = 9600;
  assert.ok(codes(ledger).includes("held_row_has_start"));
  const silent = buildLedger({ record, native: makeNative(record), probes });
  rowOf(silent, 1).reasons = [];
  assert.ok(codes(silent).includes("held_without_reason"));
});

test("the stored probe is re-read; a changed quote or file is rejected", () => {
  const quote = fresh();
  rowOf(quote, 1).probeEvidence.text = "1번 다른 글";
  assert.ok(codes(quote).includes("probe_quote_differs"));
  const file = fresh();
  rowOf(file, 1).probeEvidence.sha256 = "0".repeat(64);
  assert.ok(codes(file).includes("probe_file_changed"));
  const path = fresh();
  rowOf(path, 1).probeEvidence.path = "elsewhere.json";
  assert.ok(codes(path).includes("probe_file_unreadable"));
  const id = fresh();
  rowOf(id, 1).probeEvidence.probeId = 999;
  assert.ok(codes(id).includes("unknown_probe_id"));
  // Another question's probe does not begin at this start.
  const borrowed = fresh();
  rowOf(borrowed, 1).probeEvidence = { ...rowOf(borrowed, 2).probeEvidence };
  assert.ok(codes(borrowed).includes("probe_does_not_begin_at_start"));
});

test("a probe changed after the fact no longer proves its row", () => {
  const number = fresh();
  number.set.artifact.probes[0].segments[0].text =
    "2번 대화를 듣고 남자가 구입할 물병으로 가장 적절한 것을 고르시오.";
  assert.ok(codes(number).includes("probe_quote_differs"));
  const bounds = fresh();
  bounds.set.artifact.probes[0].segments[0].localEndSeconds = -1;
  assert.ok(codes(bounds).includes("malformed_probe"));
  const clock = fresh();
  clock.set.artifact.probes[0].sampleRate = 16000;
  assert.ok(codes(clock).includes("malformed_probe"));
  const unsure = fresh();
  unsure.set.artifact.probes[0].segments[0].uncertain = true;
  assert.ok(codes(unsure).length > 0);
});

test("the declared spoken scope must be the official one", () => {
  const number = fresh();
  rowOf(number, 1).cueNumber = 2;
  assert.ok(codes(number).includes("spoken_scope_differs"));
  const scope = fresh();
  rowOf(scope, 3).scopeQuestionNumbers = [3, 4];
  assert.ok(codes(scope).includes("spoken_scope_differs"));
  const kind = fresh();
  rowOf(kind, 4).kind = "single";
  assert.ok(codes(kind).includes("spoken_scope_differs"));
});

test("a shared passage keeps one start and starts stay in order", () => {
  const split = fresh();
  const six = rowOf(split, 6);
  six.status = "held";
  six.seekStartMs =
    six.seekEndMs =
    six.nativeEvidence =
    six.probeEvidence =
    six.cueNumber =
      null;
  six.reasons = ["test"];
  split.marks.counts = { candidate: 5, held: 1, existing_verified: 0 };
  assert.ok(codes(split).includes("shared_passage_rows_disagree"));
  // Question 1 fixed after question 2's proven start.
  const order = fresh((record) => {
    record.questions[0].audioRange = {
      startMs: 25000,
      endMs: record.audio.durationMs,
    };
  });
  assert.deepEqual(codes(order), []);
  const forced = fresh();
  forced.env.records[0].questions[0].audioRange = {
    startMs: 25000,
    endMs: forced.env.records[0].audio.durationMs,
  };
  const one = rowOf(forced, 1);
  one.status = "existing_verified";
  one.seekStartMs = 25000;
  forced.marks.counts = { candidate: 5, held: 0, existing_verified: 1 };
  assert.ok(codes(forced).includes("ordinal_order_conflict"));
});

test("frozen ASR quotes are replayed by raw id", () => {
  const ledger = fresh();
  const one = rowOf(ledger, 1);
  assert.deepEqual(one.cueSegmentIds, [1]);
  assert.equal(one.cueText, "1번");
  assert.deepEqual(codes(ledger), []);
  one.cueText = "1번.";
  assert.ok(codes(ledger).includes("full_asr_quote_changed"));
  const unknown = fresh();
  rowOf(unknown, 1).cueSegmentIds = [77];
  assert.ok(codes(unknown).includes("unknown_segment_id"));
  const wrong = fresh();
  rowOf(wrong, 1).cueSegmentIds = [3];
  rowOf(wrong, 1).cueText = "2번";
  assert.ok(codes(wrong).includes("cue_segment_has_another_number"));
  const twice = fresh();
  rowOf(twice, 1).cueSegmentIds = [1, 1];
  assert.ok(codes(twice).includes("malformed_segment_reference"));
});

test("the header binds the inventory, the provider and the policy", () => {
  const inventory = fresh();
  inventory.marks.inventorySha256 = "0".repeat(64);
  assert.ok(codes(inventory).includes("wrong_inventory"));
  const provider = fresh();
  provider.marks.provider = "someone";
  assert.ok(codes(provider).includes("wrong_provider"));
  const policy = fresh();
  policy.marks.policy = { ...policy.marks.policy, leadWindows: 5 };
  assert.ok(codes(policy).includes("policy_differs"));
  const count = fresh();
  count.marks.counts.candidate = 5;
  assert.ok(codes(count).includes("stated_count_differs"));
});
