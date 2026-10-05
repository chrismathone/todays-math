import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { energyAtDbfs } from "../../claude/lib/activity.mjs";
import { resolveSource } from "../lib/resolve.mjs";
import {
  Hold,
  NOISE_TIERS,
  clipInside,
  establishHeadings,
  estimateContradiction,
  headingCue,
  headingReading,
  hearQuote,
  measuredStart,
  noiseFloor,
  quoteWords,
  readsHeading,
} from "../lib/rules.mjs";
import { FrozenInputError, ProbeStore, TOOLS, sha256 } from "../lib/store.mjs";
import {
  AT,
  FRAMES,
  QUOTES,
  RATE,
  english,
  heading,
  koreanListenings,
  englishListenings,
  listening,
  makeInput,
  makeNative,
  rowOf,
  segment,
  startOf,
} from "./fixture.mjs";

const ms = (onsetWindow) => Math.floor((startOf(onsetWindow) * 1000) / RATE);
const reason = (result, id) => rowOf(result, id).reasons?.[0];

test("a spoken number is read only at the very start, in its literal forms", () => {
  assert.deepEqual(headingCue("5번입니다. 다음을 듣고").numbers, [5]);
  assert.equal(headingCue("십이번입니다.").form, "spelled");
  assert.deepEqual(headingCue("19번과 20번은 대화를").covers, [19, 20]);
  assert.deepEqual(headingCue("18번부터 20번까지는").covers, [18, 19, 20]);
  assert.equal(headingCue("18번부터 20번까지는").form, "range");
  assert.equal(headingCue("3. 다음을 듣고").form, "bare");
  assert.equal(headingCue("다음을 듣고 5번을 고르세요"), null);
  assert.equal(headingCue("한 번만 들려드립니다"), null);
  assert.equal(headingCue("20번과 19번"), null);
  assert.equal(headingCue("1번부터 15번까지는"), null);
});

test("offers each question in the passage where its own quote is heard, never by its shown number", () => {
  const result = resolveSource(makeInput());
  const a = rowOf(result, "q-a");
  assert.equal(a.status, "candidate");
  assert.equal(a.sourceNumber, 9);
  assert.deepEqual(a.scopeQuestionNumbers, [1]);
  assert.equal(a.seekStartMs, ms(AT[1]));
  assert.equal(a.kind, "single");
  assert.deepEqual(rowOf(result, "q-b").scopeQuestionNumbers, [2]);
  assert.equal(rowOf(result, "q-c").nativeRecovery.nextBoundary.kind, "next_heading_native_probe");
  assert.deepEqual(a.nativeRecovery.passageFrames, {
    fromFrame: startOf(AT[1]),
    toFrame: startOf(AT[2]),
  });
  // The verifier's shape: head, next head and one English clip, each by reference.
  assert.equal(a.evidenceAdapter, "native-localized-generation-v2");
  assert.match(a.probeEvidence.text, /^1번입니다\. /);
  assert.match(a.nextProbeEvidence.text, /^2번입니다\. /);
  assert.equal(a.nextNativeEvidence.startFrame, startOf(AT[2]));
  assert.equal(a.dialogueProbeEvidence.startFrame, 900 * FRAMES);
  assert.equal(a.nativeEvidence.onsetFrame, AT[1] * FRAMES);
  assert.equal(a.seekStartMs, Math.floor((a.nativeEvidence.startFrame * 1000) / RATE));
});

test("the first member of a shared instruction keeps the shared heading; a later member starts at its own number", () => {
  const result = resolveSource(makeInput());
  const d = rowOf(result, "q-d");
  assert.equal(d.kind, "shared_instruction_head");
  assert.deepEqual(d.cueSpokenNumbers, [4, 5]);
  assert.deepEqual(d.scopeQuestionNumbers, [4]);
  assert.equal(d.seekStartMs, ms(AT.head));
  assert.notEqual(d.seekStartMs, ms(AT[4]));
  const e = rowOf(result, "q-e");
  assert.equal(e.kind, "shared_instruction_member");
  assert.equal(e.seekStartMs, ms(AT[5]));
  assert.deepEqual(e.nativeRecovery.sharedHeadCovers, [4, 5]);
  assert.match(e.sharedHeadProbeEvidence.text, /^4번과 5번은/);
  assert.equal(e.sharedHeadNativeEvidence.startFrame, startOf(AT.head));
  assert.equal(e.nativeRecovery.nextBoundary.kind, "closing_announcement");
  assert.match(e.terminalProbeEvidence.text, /수고하셨습니다/);
  assert.equal(e.nextProbeEvidence, null);
  // The first member's next boundary is the second member's own number.
  assert.match(d.nextProbeEvidence.text, /^5번입니다/);
  assert.equal(d.sharedHeadProbeEvidence, null);
});

test("a member number without its shared heading, and a single number without an instruction, start nothing", () => {
  const input = makeInput();
  input.koListenings = input.koListenings.filter((l) => l.startFrame !== startOf(AT.head));
  const result = resolveSource(input);
  assert.equal(result.table.held[4], "instruction_context_not_heard");
  assert.equal(rowOf(result, "q-d").status, "held");
  assert.equal(rowOf(result, "q-e").status, "held");
});

test("the neighbouring number, bare digits, a flagged or late number are not this heading", () => {
  const good = headingReading(heading(AT[2], "2번입니다. 다음을 듣고 고르세요.").probe);
  assert.equal(readsHeading(good, [2]), true);
  assert.equal(readsHeading(good, [1]), false);
  assert.equal(readsHeading(good, [3]), false);
  assert.equal(readsHeading(good, [2, 3]), false);
  const bare = headingReading(heading(AT[2], "2. 다음을 듣고 고르세요.").probe);
  assert.equal(readsHeading(bare, [2]), false);
  const flagged = heading(AT[2], "2번입니다. 다음을 듣고 고르세요.");
  flagged.probe.segments[0].avgLogProbability = -1.2;
  assert.equal(readsHeading(headingReading(flagged.probe), [2]), false);
  const late = heading(AT[2], "2번입니다. 다음을 듣고 고르세요.");
  late.probe.segments[0].words[0].localStartSeconds = 2.4;
  assert.equal(readsHeading(headingReading(late.probe), [2]), false);
  const overflow = heading(AT[2], "2번입니다. 다음을 듣고 고르세요.");
  overflow.probe.segments[0].localEndSeconds = 9;
  assert.equal(headingReading(overflow.probe).unusable, "probe_overflow");
});

test("another number written from the same start holds the heading", () => {
  const input = makeInput();
  input.koListenings.push(heading(AT[2], "3번입니다. 다음을 듣고 고르세요."));
  const result = resolveSource(input);
  assert.equal(result.table.held[2], "contradictory_number_at_same_start");
  assert.equal(rowOf(result, "q-b").status, "held");
  // Passage 1 lost its next heading with it.
  assert.equal(rowOf(result, "q-a").status, "held");
});

test("a number announced at two distant places is not chosen between", () => {
  const input = makeInput();
  input.native = makeNative([[2000, 150]]);
  input.koListenings.push(heading(2000, "2번입니다. 대화를 듣고 고르세요."));
  const result = resolveSource(input);
  assert.equal(result.table.held[2], "number_heard_at_two_distant_places");
  assert.equal(rowOf(result, "q-b").status, "held");
});

test("a skipped next number leaves the passage open: its quote could be the missing passage's", () => {
  const input = makeInput();
  input.koListenings = input.koListenings.filter((l) => l.startFrame !== startOf(AT[2]));
  const result = resolveSource(input);
  assert.equal(result.table.held["1:next"], "next_heading_not_established");
  assert.equal(reason(result, "q-a"), "anchor_quote_not_heard_in_any_established_passage");
  assert.equal(rowOf(result, "q-c").status, "candidate");
});

test("another number written inside a passage, however unreliably, holds that passage", () => {
  // Number 2 was heard only as bare digits; number 3 stands. Passage 1 has no
  // next heading, and nothing may treat [1, 3) as one passage.
  const bare = makeInput();
  bare.koListenings = bare.koListenings.map((l) =>
    l.startFrame === startOf(AT[2]) ? heading(AT[2], "2. 대화를 듣고 고르세요.") : l,
  );
  const result = resolveSource(bare);
  assert.equal(rowOf(result, "q-a").status, "held");
  assert.equal(rowOf(result, "q-b").status, "held");
  // After the last standing heading, later numbers were written but not
  // established: the closing does not make everything after 3 "passage 3".
  const lost = makeInput();
  lost.koListenings = lost.koListenings.filter((l) => l.startFrame !== startOf(AT.head));
  const after = resolveSource(lost);
  assert.equal(after.table.held["3:next"], "terminal_boundary_not_established");
  assert.equal(rowOf(after, "q-c").status, "held");
  assert.equal(rowOf(after, "q-d").status, "held");
  // A flagged other number inside an otherwise established passage.
  const stray = makeInput();
  stray.native = makeNative([[2000, 150]]);
  const flagged = heading(2000, "7번입니다.");
  flagged.probe.segments[0].avgLogProbability = -1.4;
  stray.koListenings.push(flagged);
  const held = resolveSource(stray);
  assert.equal(held.table.held["1:inside"], "unresolved_number_reading_inside_passage");
  assert.equal(rowOf(held, "q-a").status, "held");
  assert.equal(rowOf(held, "q-b").status, "candidate");
  // The first member's own number inside the shared head's passage is expected.
  assert.equal(rowOf(resolveSource(makeInput()), "q-d").status, "candidate");
});

test("an answer option read aloud inside a question is not a missed heading; a bare number before an instruction is", () => {
  assert.equal(headingCue("5번째, 영어 시험에서"), null);
  // "Number 4. You don't look well" as a Korean recognizer writes it.
  const option = makeInput();
  option.native = makeNative([[2000, 150]]);
  option.koListenings.push(heading(2000, "4. 당신은 잘 보이지 않습니다. 무엇이 잘못되나요?"));
  assert.equal(rowOf(resolveSource(option), "q-a").status, "candidate");
  const missed = makeInput();
  missed.native = makeNative([[2000, 150]]);
  missed.koListenings.push(heading(2000, "4. 대화를 듣고 남자가 할 일을 고르세요."));
  const result = resolveSource(missed);
  assert.equal(result.table.held["1:inside"], "unresolved_number_reading_inside_passage");
  assert.equal(rowOf(result, "q-a").status, "held");
});

test("a second bounded reading from the same start may place the number at the onset; a different number still holds it", () => {
  const lagging = () => {
    const late = heading(AT[2], "2번입니다. 대화를 듣고 남자가 할 일을 고르세요.");
    late.probe.segments[0].localStartSeconds = 1.0;
    late.probe.segments[0].words[0].localStartSeconds = 1.0;
    return late;
  };
  const input = makeInput();
  input.koListenings = input.koListenings.map((l) =>
    l.startFrame === startOf(AT[2]) ? lagging() : l,
  );
  assert.equal(rowOf(resolveSource(input), "q-b").status, "held");
  const shorter = listening("ko", startOf(AT[2]), 300, [
    segment("2번입니다. 대화를 듣고 남자가 할 일을 고르세요.", 0.3, 4.5),
  ]);
  input.koListenings.push(shorter);
  const row = rowOf(resolveSource(input), "q-b");
  assert.equal(row.status, "candidate");
  assert.equal(row.probeEvidence.frameCount, 300 * FRAMES);
  assert.equal(row.nativeRecovery.siblingReadings.length, 1);
  assert.deepEqual(row.nativeRecovery.siblingReadings[0].numbers, [2]);
  input.koListenings.push(
    listening("ko", startOf(AT[2]), 225, [segment("3번입니다.", 0.3, 1.5)]),
  );
  assert.equal(
    resolveSource(input).table.held[2],
    "contradictory_number_at_same_start",
  );
});

test("a start that is not the measured lead before a measured onset is no heading", () => {
  const native = makeNative();
  const onset = AT[2] * FRAMES;
  assert.throws(() => measuredStart(native, onset + 15 * FRAMES, onset), /start_is_not_the_measured_lead/);
  assert.throws(() => measuredStart(native, onset - 10 * FRAMES, onset), /start_is_not_the_measured_lead/);
  assert.throws(() => measuredStart(native, startOf(AT[2]) + 1, onset), /start_not_on_measurement_grid/);
  assert.throws(() => measuredStart(native, (900 - 20) * FRAMES, 900 * FRAMES), /no_measured_quiet_before_onset/);
  const input = makeInput();
  // Begun 300 ms into the number: the recognizer still writes it, physics refuses it.
  input.koListenings = input.koListenings.map((l) =>
    l.startFrame === startOf(AT[2])
      ? { ...l, startFrame: onset + 15 * FRAMES, onsetFrame: onset }
      : l,
  );
  const result = resolveSource(input);
  assert.match(result.table.held[2], /heading_start_not_measured/);
  assert.equal(rowOf(result, "q-b").status, "held");
});

test("a click followed by silence is not a spoken number", () => {
  const native = makeNative();
  native.energy.fill(0, AT[3] + 5, AT[3] + 150);
  assert.throws(
    () => measuredStart(native, startOf(AT[3]), AT[3] * FRAMES),
    /too_little_sound_after_onset/,
  );
});

test("a quote is evidence only from a clip that lies wholly inside the passage", () => {
  const input = makeInput();
  // The same words, from a clip that runs across the next heading.
  input.enListenings = input.enListenings.filter((l) => l.startFrame !== 900 * FRAMES);
  input.enListenings.push(english(2500, 1000, QUOTES.a));
  const result = resolveSource(input);
  assert.equal(reason(result, "q-a"), "anchor_quote_not_heard_in_any_established_passage");
  assert.equal(clipInside({ startFrame: 10, frameCount: 5 }, 10, 15), true);
  assert.equal(clipInside({ startFrame: 10, frameCount: 6 }, 10, 15), false);
  assert.equal(clipInside({ startFrame: 9, frameCount: 5 }, 10, 15), false);
});

test("a quote cut short, respelled, or interrupted by a flagged segment is not heard", () => {
  const words = quoteWords(QUOTES.a);
  const hears = (segments) => hearQuote(english(900, 1000, "x").probe && { ...english(900, 1000, "x").probe, segments }, words).length;
  assert.equal(hears([segment(QUOTES.a, 0, 3)]), 1);
  assert.equal(hears([segment("I moved to a new house last", 0, 3)]), 0);
  assert.equal(hears([segment("I moved to a new home last Saturday.", 0, 3)]), 0);
  assert.equal(hears([segment("I moved to a new house", 0, 2), segment("last Saturday.", 2, 3)]), 1);
  assert.equal(
    hears([
      segment("I moved to a new house", 0, 2),
      segment("uh", 2, 2.2, { avgLogProbability: -1.5 }),
      segment("last Saturday.", 2.2, 3),
    ]),
    0,
  );
  assert.equal(hears([segment(QUOTES.a, 0, 3, { compressionRatio: 2.6 })]), 0);
  assert.equal(hearQuote({ ...english(900, 1000, QUOTES.a).probe, overflow: true }, words).length, 0);
  assert.equal(hears([segment("i MOVED to a new house, last saturday", 0, 3)]), 1);
});

test("a quote heard in two passages, or in a clip wholly elsewhere, binds to neither", () => {
  const input = makeInput();
  input.enListenings.push(english(3500, 800, QUOTES.a));
  assert.equal(reason(resolveSource(input), "q-a"), "quote_heard_in_two_passages");
  // A clip before the first heading is in no passage at all.
  const stray = makeInput();
  stray.enListenings.push(english(100, 300, QUOTES.a));
  assert.equal(reason(resolveSource(stray), "q-a"), "quote_heard_in_two_passages");
});

test("a short quote cannot anchor, and one heard in another passage holds the question", () => {
  const short = makeInput({ targets: [{ questionId: "q-s", sourceNumber: 1, quotes: ["Yes, I do."] }] });
  assert.equal(reason(resolveSource(short), "q-s"), "no_anchor_quote_of_four_words");
  const split = makeInput({
    targets: [{ questionId: "q-x", sourceNumber: 1, quotes: [QUOTES.a, "Thank you."] }],
  });
  assert.equal(
    reason(resolveSource(split), "q-x"),
    "not_every_frozen_quote_heard_in_one_passage_clip",
  );
});

test("one convenient quote is not enough: every frozen quote in one clip inside the passage", () => {
  const second = "It has three rooms and a small garden.";
  const targets = [{ questionId: "q-2", sourceNumber: 5, quotes: [QUOTES.a, second] }];
  const asrSegments = [
    { id: 201, text: QUOTES.a, startSeconds: 20, endSeconds: 25 },
    { id: 202, text: second, startSeconds: 25, endSeconds: 30 },
  ];
  // The second anchor was never heard.
  const missing = makeInput({ targets, asrSegments });
  assert.equal(
    reason(resolveSource(missing), "q-2"),
    "not_every_frozen_quote_heard_in_one_passage_clip",
  );
  // Heard, but by another clip of the same passage: still no single clip holds both.
  const apart = makeInput({ targets, asrSegments });
  apart.enListenings.push(english(1900, 900, second));
  assert.equal(
    reason(resolveSource(apart), "q-2"),
    "not_every_frozen_quote_heard_in_one_passage_clip",
  );
  // The second anchor is in the neighbouring passage.
  const across = makeInput({ targets, asrSegments });
  across.enListenings.push(english(3500, 800, second));
  assert.equal(reason(resolveSource(across), "q-2"), "quote_heard_in_two_passages");
  const together = makeInput({ targets, asrSegments });
  together.enListenings.push(english(1000, 1500, QUOTES.a + " " + second));
  const row = rowOf(resolveSource(together), "q-2");
  assert.equal(row.status, "candidate");
  assert.deepEqual(
    row.localizedMappingEvidence.quotes.map((q) => q.text),
    [QUOTES.a, second],
  );
  assert.equal(row.dialogueProbeEvidence.startFrame, 1000 * FRAMES);
  assert.deepEqual(row.anchorSegmentIds, [201, 202]);
});

test("a frozen quote must stand literally, and once, in the frozen recognition the generation named", () => {
  const respelled = makeInput({
    asrSegments: [{ id: 301, text: "I moved to a new house last saturday", startSeconds: 20, endSeconds: 25 }],
    targets: [{ questionId: "q-r", sourceNumber: 1, quotes: [QUOTES.a], segmentIds: [301] }],
  });
  assert.equal(
    reason(resolveSource(respelled), "q-r"),
    "frozen_quote_not_literal_in_generation_segments",
  );
  const twice = makeInput({
    asrSegments: [
      { id: 301, text: QUOTES.a, startSeconds: 20, endSeconds: 25 },
      { id: 302, text: "He said: " + QUOTES.a, startSeconds: 300, endSeconds: 305 },
    ],
    targets: [{ questionId: "q-t", sourceNumber: 1, quotes: [QUOTES.a], segmentIds: [301] }],
  });
  assert.equal(reason(resolveSource(twice), "q-t"), "quote_repeats_in_frozen_recognition");
  const changed = makeInput();
  changed.generation.byQuestion.get("q-a").groundingIntact = false;
  assert.equal(reason(resolveSource(changed), "q-a"), "generation_grounding_differs_from_alignment");
  // A named anchor segment that no quote touches is said, not hidden.
  const loose = makeInput({
    targets: [{ questionId: "q-l", sourceNumber: 1, quotes: [QUOTES.a], segmentIds: [101, 106] }],
  });
  const row = rowOf(resolveSource(loose), "q-l");
  assert.deepEqual(row.nativeRecovery.uncoveredAnchorSegmentIds, [106]);
  assert.equal(row.nativeRecovery.verifierPreconditions.everyAnchorSegmentTouchedByAQuote, false);
  assert.equal(row.nativeRecovery.verifierPreconditions.anchorSegmentsContiguous, false);
});

test("a number written long after the measured onset is not what sounds at that onset", () => {
  const input = makeInput();
  input.koListenings = input.koListenings.map((l) => {
    if (l.startFrame !== startOf(AT[2])) return l;
    const late = heading(AT[2], "2번입니다. 대화를 듣고 남자가 할 일을 고르세요.");
    late.probe.segments[0].localStartSeconds = 1.2;
    late.probe.segments[0].words[0].localStartSeconds = 1.2;
    return late;
  });
  const result = resolveSource(input);
  assert.match(result.table.held[2], /number_not_at_the_measured_onset/);
  assert.equal(rowOf(result, "q-b").status, "held");
});

test("the neighbour's quote does not carry a question into this passage", () => {
  const input = makeInput({
    targets: [{ questionId: "q-n", sourceNumber: 1, quotes: [QUOTES.b] }],
  });
  const row = rowOf(resolveSource(input), "q-n");
  assert.deepEqual(row.scopeQuestionNumbers, [2]);
  assert.notDeepEqual(row.scopeQuestionNumbers, [1]);
});

test("a passage that already has a certified start gives exactly that start", () => {
  const input = makeInput();
  const certifiedMs = ms(AT[2]) - 400;
  input.certRows = [
    {
      questionId: "q-old",
      reconstructed: true,
      status: "preserved",
      audioRange: { startMs: certifiedMs, endMs: 1 },
      originalScopeEvidence: { scopeQuestionNumbers: [2], onsetFrame: 123 },
    },
  ];
  // The native heading of number 2 is 400 ms later than the certified start:
  // a peer of that passage cannot say it begins at the certified frame.
  const result = resolveSource(input);
  assert.equal(reason(result, "q-b"), "native_heading_differs_from_certified_start");
  assert.equal(rowOf(result, "q-b").tested.certifiedStartMs, certifiedMs);
  // Passage 1 ends at the earlier of the two starts of number 2.
  const a = rowOf(result, "q-a");
  assert.equal(a.nativeRecovery.passageFrames.toFrame, (certifiedMs * RATE) / 1000);
  assert.equal(a.nativeRecovery.nextBoundary.existing.questionId, "q-old");
  assert.match(a.nextProbeEvidence.text, /^2번입니다/);
  // Identical frames: the peer takes exactly the certified start, with its own proof.
  input.certRows[0].audioRange.startMs = ms(AT[2]);
  input.certRows[0].originalScopeEvidence.onsetFrame = AT[2] * FRAMES;
  const same = rowOf(resolveSource(input), "q-b");
  assert.equal(same.status, "candidate");
  assert.equal(same.seekStartMs, ms(AT[2]));
  assert.equal(same.nativeRecovery.existingCertifiedStart.questionId, "q-old");
  // Same start, another onset: not the same native proof.
  input.certRows[0].originalScopeEvidence.onsetFrame = AT[2] * FRAMES - FRAMES;
  assert.equal(
    reason(resolveSource(input), "q-b"),
    "native_heading_differs_from_certified_start",
  );
  // The control replay does not read the certificate at all.
  input.certRows[0].audioRange.startMs = certifiedMs;
  const blind = resolveSource({ ...input, blind: true });
  assert.equal(rowOf(blind, "q-b").seekStartMs, ms(AT[2]));
  assert.equal(rowOf(blind, "q-b").nativeRecovery.existingCertifiedStart, null);
});

test("a native start on the wrong side of a certified start is dropped", () => {
  const input = makeInput();
  input.certRows = [
    {
      questionId: "q-old",
      reconstructed: true,
      status: "admitted",
      audioRange: { startMs: 1000, endMs: 1 },
      scopeQuestionNumbers: [3],
    },
  ];
  const result = resolveSource(input);
  assert.equal(result.table.held[2], "original_order_conflict");
  assert.equal(rowOf(result, "q-b").status, "held");
});

test("the last passage needs a literal closing, no larger number anywhere, and every long-quiet onset listened to", () => {
  const noClosing = makeInput();
  noClosing.koListenings = noClosing.koListenings.filter((l) => l.startFrame !== startOf(AT.closing));
  assert.equal(resolveSource(noClosing).table.held["5:next"], "terminal_boundary_not_established");
  const larger = makeInput();
  larger.hints.numbers.push({ source: "frozen_asr", number: 6, segmentStartMs: 1, segmentEndMs: 2 });
  assert.equal(rowOf(resolveSource(larger), "q-e").status, "held");
  const unscanned = makeInput({ terminalScan: () => ({ onsetsAfterLongQuiet: 3, missing: 1 }) });
  assert.equal(rowOf(resolveSource(unscanned), "q-e").status, "held");
  const scanned = makeInput({ terminalScan: () => ({ onsetsAfterLongQuiet: 3, missing: 0 }) });
  assert.equal(rowOf(resolveSource(scanned), "q-e").status, "candidate");
});

test("estimates can hold a row and never admit one", () => {
  assert.equal(estimateContradiction([100, 140], [{ midSeconds: 120 }], [101, 110]), null);
  assert.equal(estimateContradiction([100, 140], [{ midSeconds: 149 }], null), null);
  assert.equal(
    estimateContradiction([100, 140], [{ midSeconds: 120 }, { midSeconds: 300 }], null),
    "quote_also_placed_elsewhere_by_frozen_transcript",
  );
  assert.equal(
    estimateContradiction([100, 140], [], [200, 210]),
    "frozen_anchor_segments_outside_passage",
  );
  // The provider places the quote in passage 1; nobody heard it there.
  const input = makeInput();
  input.enListenings = input.enListenings.filter((l) => l.startFrame !== 900 * FRAMES);
  input.hints.englishWords = quoteWords(QUOTES.a).map((text, i) => ({
    text,
    start: 20000 + i * 300,
    end: 20000 + i * 300 + 250,
  }));
  assert.equal(rowOf(resolveSource(input), "q-a").status, "held");
  // Heard in passage 1, but the provider wrote the same words ten minutes later.
  const far = makeInput();
  far.hints.englishWords = quoteWords(QUOTES.a).map((text, i) => ({
    text,
    start: 200000 + i * 300,
    end: 200000 + i * 300 + 250,
  }));
  assert.equal(reason(resolveSource(far), "q-a"), "quote_also_placed_elsewhere_by_frozen_transcript");
});

test("over steady hiss an onset is measured against its own noise floor, and only a stationary one", () => {
  const native = makeNative();
  const hiss = energyAtDbfs(-44, FRAMES);
  for (let w = 0; w < native.energy.length; w++)
    if (native.energy[w] === 0) native.energy[w] = hiss * (1 + (w % 3) * 0.05);
  const onset = AT[2] * FRAMES;
  assert.throws(() => measuredStart(native, startOf(AT[2]), onset), /no_measured_quiet_before_onset/);
  const place = measuredStart(native, startOf(AT[2]), onset, "noise_floor_contrast_v1");
  assert.equal(place.leadFrames, 20 * FRAMES);
  assert.equal(place.noiseFloorEvidence.baselineFrameCount, 100 * FRAMES);
  assert.equal(place.noiseFloorEvidence.contrastDb, 10);
  assert.match(place.noiseFloorEvidence.baselineEnergySha256, /^[0-9a-f]{64}$/);
  assert.equal(NOISE_TIERS.noise_floor_contrast_1second_v1, 50);
  // Earlier speech inside the baseline is not a noise floor.
  native.energy.fill(energyAtDbfs(-20, FRAMES), AT[2] - 60, AT[2] - 40);
  assert.throws(() => noiseFloor(native, AT[2], 100), /noise_baseline_not_stationary|noise_baseline_contains_prior_signal/);
  assert.throws(() => measuredStart(native, startOf(AT[2]), onset, "some_other_tier"), /unsupported_native_onset_method/);
  // A single loud window is a click.
  const click = makeNative();
  for (let w = 0; w < click.energy.length; w++) if (click.energy[w] === 0) click.energy[w] = hiss;
  click.energy.fill(hiss, AT[3] + 1, AT[3] + 150);
  assert.throws(() => noiseFloor(click, AT[3], 100), /noise_onset_is_isolated_transient/);
});

test("the heading table is the same whatever order the recognitions are read in", () => {
  const native = makeNative();
  const forward = establishHeadings(native, koreanListenings());
  const backward = establishHeadings(native, koreanListenings().reverse());
  assert.deepEqual(
    forward.headings.map((h) => [h.numbers, h.kind, h.startFrame]),
    backward.headings.map((h) => [h.numbers, h.kind, h.startFrame]),
  );
  assert.equal(forward.closings.length, 1);
});

test("an offered row names its own frozen quote and the probe that heard it", () => {
  const row = rowOf(resolveSource(makeInput()), "q-c");
  const [quote] = row.localizedMappingEvidence.quotes;
  assert.equal(quote.text, QUOTES.c);
  assert.deepEqual(quote.sourceSegmentIds, [103]);
  assert.equal(quote.startCharacter, 0);
  assert.equal(quote.endCharacter, QUOTES.c.length);
  assert.deepEqual(quote.probeSegmentIds, row.dialogueProbeEvidence.segmentIds);
  assert.equal(row.dialogueProbeEvidence.text, QUOTES.c + " Thank you.");
  assert.equal(row.dialogueProbeEvidence.startFrame, 5900 * FRAMES);
  assert.deepEqual(row.anchorSegmentIds, [103]);
  assert.deepEqual(row.mappingEvidence.sourceSegmentIds, [103]);
  assert.equal(row.localizedMappingEvidence.prepared.path, "prepared.json");
  assert.equal(row.nativeRecovery.verifierPreconditions.everyAnchorSegmentTouchedByAQuote, true);
  assert.equal(row.revision, 7);
  assert.equal(row.seekEndMs, makeInput().record.audio.durationMs);
  assert.throws(() => {
    throw new Hold("x");
  }, Hold);
});

test("a bounded recognition of other bytes, another clock, model or request is refused", () => {
  const root = mkdtempSync(join(tmpdir(), "native-recovery-"));
  mkdirSync(join(root, "probes", "round-001"), { recursive: true });
  const requestPath = join(root, "request.json");
  writeFileSync(requestPath, "{}");
  const record = { sourceRecordId: "ebs-test-1", sourceAudioSha256: "a".repeat(64) };
  const identity = { sampleRate: RATE, channels: 2, frameCount: 1000 * FRAMES, pcmSha256: "p".repeat(64) };
  const container = (overrides = {}) => ({
    sourceRecordId: "ebs-test-1",
    sourceAudioSha256: "a".repeat(64),
    nativePcm: { sampleRate: RATE, frameCount: 1000 * FRAMES, sha256: "p".repeat(64) },
    modelSnapshotRevision: TOOLS.modelRevision,
    vadFilter: false,
    conditionOnPreviousText: false,
    requestPath,
    requestSha256: sha256(Buffer.from("{}")),
    requestedLanguage: "ko",
    probes: [
      { id: 1, sampleRate: RATE, startFrame: 0, frameCount: FRAMES * 10, durationSeconds: 0.2, segments: [] },
    ],
    ...overrides,
  });
  const load = (value) => {
    writeFileSync(join(root, "probes", "round-001", "ebs-test-1.json"), JSON.stringify(value));
    return new ProbeStore([root]).listenings(record, identity);
  };
  assert.equal(load(container()).length, 1);
  for (const bad of [
    { sourceAudioSha256: "b".repeat(64) },
    { nativePcm: { sampleRate: RATE, frameCount: 1000 * FRAMES, sha256: "q".repeat(64) } },
    { modelSnapshotRevision: "another" },
    { requestSha256: "0".repeat(64) },
    { vadFilter: true },
    { probes: [{ id: 1, sampleRate: RATE, startFrame: 995 * FRAMES, frameCount: FRAMES * 10, durationSeconds: 0.2, segments: [] }] },
    { probes: [{ id: 1, sampleRate: RATE, startFrame: 0, frameCount: FRAMES * 10, durationSeconds: 8, segments: [] }] },
  ])
    assert.throws(() => load(container(bad)), FrozenInputError);
});

test("the fixture's own listenings are what the tests say they are", () => {
  assert.equal(englishListenings().length, 5);
  assert.equal(koreanListenings().length, 7);
});
