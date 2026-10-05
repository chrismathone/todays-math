import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  auditMarks,
  buildMarks,
  buildSourceRecords,
  dottedInstructionCueNumbers,
  parseCue,
  publishNativeStart,
  questionAudioCueNumbers,
  frameToMs,
  secondsToMs,
  type NativeEvidence,
  type AsrSegment,
  type SourceInput,
} from "./seekBeginnings.ts";

function expect(actual: unknown) {
  const api = {
    toBe(expected: unknown) {
      assert.equal(actual, expected);
    },
    toEqual(expected: unknown) {
      assert.deepEqual(actual, expected);
    },
    toBeNull() {
      assert.equal(actual, null);
    },
    toContain(expected: unknown) {
      if (typeof actual === "string")
        assert.ok(actual.includes(String(expected)), actual);
      else if (Array.isArray(actual))
        assert.ok(actual.includes(expected), JSON.stringify(actual));
      else assert.fail("not a container");
    },
    toHaveLength(length: number) {
      assert.equal((actual as { length: number }).length, length);
    },
    not: {
      toBe(expected: unknown) {
        assert.notEqual(actual, expected);
      },
      toHaveProperty(key: string) {
        assert.equal(
          Object.prototype.hasOwnProperty.call(actual, key),
          false,
        );
      },
    },
  };
  return api;
}

function segment(
  id: number,
  text: string,
  start: number,
  uncertain = false,
): AsrSegment {
  return { id, text, estimatedStartSeconds: start, uncertain };
}

function source(overrides: Partial<SourceInput> = {}): SourceInput {
  const base: SourceInput = {
    sourceRecordId: "ebs-middle-1-2006-1",
    setId: "set-1",
    revision: 5,
    questions: [{ questionId: "q-generated-1", sourceNumber: 1 }],
    preparedQuestions: [{ id: "q-generated-1", sourceNumber: 1 }],
    grounding: [
      {
        generatedOrdinal: 1,
        sourceSegmentIds: [3],
        evidenceQuotes: ["Look at this sign."],
        asrUncertain: false,
        included: true,
      },
    ],
    segments: [
      segment(1, "1번입니다.", 40.44),
      segment(2, "2번입니다.", 68.29),
      segment(3, "Look at this sign.", 101.3),
      segment(4, "3번입니다.", 107.3),
    ],
    sourceAudioSha256: "a".repeat(64),
    actualSourceAudioSha256: "a".repeat(64),
    playbackSha256: "b".repeat(64),
    playbackDurationMs: 905312,
    asrPath: "asr.json",
    asrSha256: "c".repeat(64),
    actualAsrSha256: "c".repeat(64),
    preparedSha256: "d".repeat(64),
    actualPreparedSha256: "d".repeat(64),
    asrDurationMs: 905312,
    asrDeclaredSourceAudioSha256: "a".repeat(64),
    documentSha256: "1".repeat(64),
    alignmentPath: "alignment.json",
    alignmentSha256: "2".repeat(64),
    actualAlignmentSha256: "2".repeat(64),
    alignmentAnchorsByQuestionId: {},
  };
  const merged = { ...base, ...overrides };
  if (!overrides.alignmentAnchorsByQuestionId) {
    const byOrdinal = new Map(
      merged.grounding.map((item) => [item.generatedOrdinal, item.sourceSegmentIds]),
    );
    merged.alignmentAnchorsByQuestionId = Object.fromEntries(
      merged.preparedQuestions.flatMap((question) => {
        const ids = byOrdinal.get(question.sourceNumber);
        return ids ? [[question.id, ids]] : [];
      }),
    );
  }
  return merged;
}

describe("cue text", () => {
  it("keeps the production ordinal grammar", () => {
    const production = readFileSync(
      fileURLToPath(
        new URL(
          "../../../../../src/lib/english/listening/questionAudioProof.ts",
          import.meta.url,
        ),
      ),
      "utf8",
    );
    assert.ok(production.includes("부터|~|～|-|과|와"));
    assert.ok(production.includes("number|questions?"));
    assert.ok(production.includes("and|to|through|~|-"));
    assert.ok(production.includes('"nineteen"'));
    assert.ok(production.includes('"twenty"'));
    assert.deepEqual(questionAudioCueNumbers("2번입니다."), [2]);
    assert.deepEqual(questionAudioCueNumbers("19번과 20번은 대화를 듣고"), [
      19, 20,
    ]);
    assert.deepEqual(questionAudioCueNumbers("Number one."), [1]);
    assert.deepEqual(questionAudioCueNumbers("Look at number one"), []);
    assert.deepEqual(parseCue("2번입니다.").numbers, [2]);
  });

  it("accepts a dotted announcer instruction and rejects a numbered choice", () => {
    expect(
      dottedInstructionCueNumbers(
        "1. 대화를 듣고 탁자 위 물건 배치로 가장 적절한 것을 고르시오.",
      ),
    ).toEqual([1]);
    expect(
      dottedInstructionCueNumbers(
        "8. Listen to the conversation and choose the most appropriate thing.",
      ),
    ).toEqual([8]);
    expect(
      dottedInstructionCueNumbers("3. Where are you from?"),
    ).toBeNull();
    expect(
      dottedInstructionCueNumbers("4. Jackie does homework in the evening."),
    ).toBeNull();
    expect(dottedInstructionCueNumbers("31. 대화를 듣고 고르시오.")).toBe(
      "out_of_range",
    );
  });

  it("rounds ASR seconds to integer milliseconds", () => {
    expect(secondsToMs(68.29)).toBe(68290);
    expect(secondsToMs(101.3)).toBe(101300);
    expect(secondsToMs(40.44)).toBe(40440);
    expect(frameToMs(44100, 44100)).toBe(1000);
    expect(frameToMs(1, 44100)).toBe(0);
  });
});

describe("spoken passage recovery", () => {
  it("maps generated ordinal 1 to spoken cue 2 and seeks the cue, not the quote", () => {
    const [record] = buildSourceRecords(source());
    expect(record.status).toBe("candidate");
    expect(record.sourceNumber).toBe(1);
    expect(record.cueNumber).toBe(2);
    expect(record.scopeQuestionNumbers).toEqual([2]);
    expect(record.seekStartMs).toBe(68290);
    expect(record.seekStartMs).not.toBe(101300);
    expect(record.cueSegmentIds).toEqual([2]);
    expect(record.anchorSegmentIds).toEqual([3]);
    expect(record.reasons).toContain(
      "generated_ordinal_differs_from_cue_number",
    );
    expect(record.reasons).toContain("generated_ordinal_not_used_as_evidence");
    expect(record.nativeEvidence).toBeNull();
    expect(record.seekEndMs).toBeNull();
  });

  it("maps a later generated ordinal onto an earlier spoken item when the quote sits there", () => {
    const [record] = buildSourceRecords(
      source({
        questions: [{ questionId: "q15", sourceNumber: 15 }],
        preparedQuestions: [{ id: "q15", sourceNumber: 15 }],
        grounding: [
          {
            generatedOrdinal: 15,
            sourceSegmentIds: [3],
            evidenceQuotes: ["My father is a police officer."],
            included: true,
          },
        ],
        segments: [
          segment(1, "13번입니다.", 500),
          segment(2, "14번입니다. 다음을 듣고, 존의 어머니의 직업을 고르세요.", 552.5),
          segment(3, "My father is a police officer.", 593.53),
          segment(4, "15번입니다.", 609.01),
        ],
      }),
    );
    expect(record.status).toBe("candidate");
    expect(record.sourceNumber).toBe(15);
    expect(record.cueNumber).toBe(14);
    expect(record.seekStartMs).toBe(secondsToMs(552.5));
    expect(record.scopeQuestionNumbers).toEqual([14]);
  });

  it("does not invent a missing ordinal for the previous clear passage", () => {
    const [record] = buildSourceRecords(
      source({
        grounding: [
          {
            generatedOrdinal: 1,
            sourceSegmentIds: [2],
            evidenceQuotes: ["It is sunny."],
            included: true,
          },
        ],
        segments: [
          segment(1, "2번입니다.", 10),
          segment(2, "It is sunny.", 12),
          segment(3, "4번입니다.", 20),
          segment(4, "Bring a coat.", 22),
        ],
      }),
    );
    expect(record.cueNumber).toBe(2);
    expect(record.scopeQuestionNumbers).toEqual([2]);
    expect(record.reasons.some((reason) => reason.includes("observed_numbers"))).toBe(
      false,
    );
  });

  it("holds a repeated ordinal that returns after a later item", () => {
    const [record] = buildSourceRecords(
      source({
        segments: [
          segment(1, "1번입니다.", 10),
          segment(2, "First dialogue here.", 12),
          segment(3, "6번입니다.", 30),
          segment(4, "Sixth dialogue here.", 32),
          segment(5, "1번입니다. 대화를 듣고 파티가 열리는 요일을 고르세요.", 40),
          segment(6, "The party is on Friday.", 48),
        ],
        grounding: [
          {
            generatedOrdinal: 1,
            sourceSegmentIds: [6],
            evidenceQuotes: ["The party is on Friday."],
            included: true,
          },
        ],
      }),
    );
    expect(record.status).toBe("held");
    expect(record.seekStartMs).toBeNull();
    expect(record.cueNumber).toBeNull();
    expect(record.reasons).toContain("held_duplicate_ordinal");
    expect(record.reasons).toContain("held_non_monotonic_cue");
    expect(record.reasons).toContain("observed_numbers:1");
  });

  it("holds an out-of-range cue and an uncertain cue without adopting the number", () => {
    const outOfRange = buildSourceRecords(
      source({
        segments: [
          segment(1, "6번입니다.", 10),
          segment(2, "31번입니다.", 20),
          segment(3, "Hello there friend.", 22),
        ],
        grounding: [
          {
            generatedOrdinal: 1,
            sourceSegmentIds: [3],
            evidenceQuotes: ["Hello there friend."],
            included: true,
          },
        ],
      }),
    )[0];
    expect(outOfRange.status).toBe("held");
    expect(outOfRange.cueNumber).toBeNull();
    expect(outOfRange.reasons).toContain("held_out_of_range_cue");

    const uncertain = buildSourceRecords(
      source({
        segments: [
          segment(1, "7번입니다.", 20, true),
          segment(2, "Hello there friend.", 22),
        ],
        grounding: [
          {
            generatedOrdinal: 1,
            sourceSegmentIds: [2],
            evidenceQuotes: ["Hello there friend."],
            included: true,
          },
        ],
      }),
    )[0];
    expect(uncertain.status).toBe("held");
    expect(uncertain.cueNumber).not.toBe(7);
    expect(uncertain.seekStartMs).toBeNull();
    expect(uncertain.reasons).toContain("held_uncertain_cue");
  });

  it("holds anchors that cross two spoken items", () => {
    const [record] = buildSourceRecords(
      source({
        segments: [
          segment(1, "2번입니다.", 10),
          segment(2, "Look at this sign.", 12),
          segment(3, "3번입니다.", 20),
          segment(4, "It is raining now.", 22),
        ],
        grounding: [
          {
            generatedOrdinal: 1,
            sourceSegmentIds: [2, 4],
            evidenceQuotes: ["Look at this sign.", "It is raining now."],
            included: true,
          },
        ],
      }),
    );
    expect(record.status).toBe("held");
    expect(record.reasons).toContain("held_anchors_span_multiple_passages");
    expect(record.seekStartMs).toBeNull();
  });

  it("holds a quote that is not in the grounded segments and an uncertain anchor", () => {
    const mismatch = buildSourceRecords(
      source({
        grounding: [
          {
            generatedOrdinal: 1,
            sourceSegmentIds: [3],
            evidenceQuotes: ["this quote was never spoken"],
            included: true,
          },
        ],
      }),
    )[0];
    expect(mismatch.status).toBe("held");
    expect(mismatch.reasons).toContain("held_evidence_quote_mismatch");

    const uncertainAnchor = buildSourceRecords(
      source({
        segments: [
          segment(1, "2번입니다.", 68.29),
          segment(2, "Look at this sign.", 101.3, true),
        ],
        grounding: [
          {
            generatedOrdinal: 1,
            sourceSegmentIds: [2],
            evidenceQuotes: ["Look at this sign."],
            asrUncertain: true,
            included: true,
          },
        ],
      }),
    )[0];
    expect(uncertainAnchor.status).toBe("held");
    expect(uncertainAnchor.reasons).toContain("held_uncertain_anchor");
    expect(uncertainAnchor.reasons).toContain("held_grounding_uncertain");
    expect(uncertainAnchor.seekStartMs).toBeNull();
  });

  it("holds the wrong audio file and the wrong question id without a seek", () => {
    const wrongAudio = buildSourceRecords(
      source({ actualSourceAudioSha256: "e".repeat(64) }),
    )[0];
    expect(wrongAudio.status).toBe("held");
    expect(wrongAudio.seekStartMs).toBeNull();
    expect(wrongAudio.cueNumber).toBeNull();
    expect(wrongAudio.reasons[0]).toContain("held_source_audio_hash_mismatch");

    const wrongQuestion = buildSourceRecords(
      source({
        questions: [{ questionId: "not-in-prepared", sourceNumber: 1 }],
      }),
    )[0];
    expect(wrongQuestion.status).toBe("held");
    expect(wrongQuestion.reasons).toContain("held_question_identity");
    expect(wrongQuestion.anchorSegmentIds).toEqual([]);
  });

  it("keeps an existing verified start instead of replacing it with the cue estimate", () => {
    const [record] = buildSourceRecords(
      source({
        questions: [
          {
            questionId: "q-generated-1",
            sourceNumber: 1,
            existingStartMs: 12000,
            existingEndMs: 905312,
          },
        ],
      }),
    );
    expect(record.status).toBe("existing_verified");
    expect(record.seekStartMs).toBe(12000);
    expect(record.seekEndMs).toBe(905312);
    expect(record.reasons).toContain("existing_verified_range_preserved");
  });

  it("recovers a dotted instruction and ignores an enumerated English choice", () => {
    const dotted = buildSourceRecords(
      source({
        questions: [{ questionId: "q-generated-1", sourceNumber: 5 }],
        preparedQuestions: [{ id: "q-generated-1", sourceNumber: 1 }],
        segments: [
          segment(
            1,
            "1. 대화를 듣고 탁자 위 물건 배치로 가장 적절한 것을 고르시오.",
            58.4,
          ),
          segment(2, "Hello there friend.", 80),
          segment(3, "2번입니다.", 111.6),
        ],
        grounding: [
          {
            generatedOrdinal: 1,
            sourceSegmentIds: [2],
            evidenceQuotes: ["Hello there friend."],
            included: true,
          },
        ],
      }),
    )[0];
    expect(dotted.status).toBe("candidate");
    expect(dotted.sourceNumber).toBe(5);
    expect(dotted.cueNumber).toBe(1);
    expect(dotted.seekStartMs).toBe(58400);
    expect(dotted.reasons).toContain("dotted_instruction_cue");
    expect(dotted.reasons).toContain(
      "inventory_source_number_differs_from_prepared_ordinal",
    );

    const choice = buildSourceRecords(
      source({
        segments: [
          segment(1, "2번입니다.", 10),
          segment(2, "3. Where are you from?", 12),
          segment(3, "I am from Seoul.", 14),
          segment(4, "3번입니다.", 20),
        ],
        grounding: [
          {
            generatedOrdinal: 1,
            sourceSegmentIds: [3],
            evidenceQuotes: ["I am from Seoul."],
            included: true,
          },
        ],
      }),
    )[0];
    expect(choice.cueNumber).toBe(2);
    expect(choice.seekStartMs).toBe(10000);
  });

  it("keeps a shared announcement scope and seeks its first cue", () => {
    const [record] = buildSourceRecords(
      source({
        questions: [{ questionId: "q-generated-1", sourceNumber: 3 }],
        segments: [
          segment(
            1,
            "19번과 20번은 대화를 듣고 남자의 마지막 말에 이어질 여자의 응답으로 가장 알맞은 것을 고르는 문제입니다.",
            772.72,
          ),
          segment(2, "잘 듣고 답하세요.", 803.9),
          segment(3, "19번입니다.", 805.9),
          segment(4, "I need a t-shirt for this summer.", 807.9),
          segment(5, "20번입니다.", 818.3),
        ],
        grounding: [
          {
            generatedOrdinal: 1,
            sourceSegmentIds: [4],
            evidenceQuotes: ["I need a t-shirt for this summer."],
            included: true,
          },
        ],
      }),
    );
    expect(record.status).toBe("candidate");
    expect(record.cueNumber).toBe(19);
    expect(record.scopeQuestionNumbers).toEqual([19]);
    expect(record.seekStartMs).toBe(secondsToMs(805.9));
    expect(record.cueSegmentIds).toEqual([3]);
    expect(record.reasons).toContain("narrowed_shared_announcement");
  });

  it("keeps one shared 16-17 start when an inner label follows the dialogue", () => {
    const records = buildSourceRecords(
      source({
        questions: [
          { questionId: "g16", sourceNumber: 1 },
          { questionId: "g17", sourceNumber: 2 },
        ],
        preparedQuestions: [
          { id: "g16", sourceNumber: 1 },
          { id: "g17", sourceNumber: 2 },
        ],
        segments: [
          segment(1, "16번과 17번을 듣고 고르시오.", 100),
          segment(2, "Hello there friend.", 110),
          segment(3, "16번", 120),
          segment(4, "Yes I agree with you.", 125),
          segment(5, "18번입니다.", 140),
        ],
        grounding: [
          {
            generatedOrdinal: 1,
            sourceSegmentIds: [2],
            evidenceQuotes: ["Hello there friend."],
            included: true,
          },
          {
            generatedOrdinal: 2,
            sourceSegmentIds: [4],
            evidenceQuotes: ["Yes I agree with you."],
            included: true,
          },
        ],
      }),
    );
    expect(records.map((record) => record.status)).toEqual([
      "candidate",
      "candidate",
    ]);
    expect(records.map((record) => record.scopeQuestionNumbers)).toEqual([
      [16, 17],
      [16, 17],
    ]);
    expect(records.map((record) => record.seekStartMs)).toEqual([100000, 100000]);
    expect(records[0].cueSegmentIds).toEqual([1, 3]);
    expect(records[0].reasons).toContain("shared_source_passage");
  });

  it("does not treat two generated questions in one spoken item as separate ordinals", () => {
    const records = buildSourceRecords(
      source({
        questions: [
          { questionId: "g1", sourceNumber: 1 },
          { questionId: "g2", sourceNumber: 2 },
        ],
        preparedQuestions: [
          { id: "g1", sourceNumber: 1 },
          { id: "g2", sourceNumber: 2 },
        ],
        grounding: [
          {
            generatedOrdinal: 1,
            sourceSegmentIds: [2],
            evidenceQuotes: ["Look at this sign."],
            included: true,
          },
          {
            generatedOrdinal: 2,
            sourceSegmentIds: [3],
            evidenceQuotes: ["You cannot take pictures."],
            included: true,
          },
        ],
        segments: [
          segment(1, "5번입니다.", 30),
          segment(2, "Look at this sign.", 40),
          segment(3, "You cannot take pictures.", 44),
          segment(4, "6번입니다.", 50),
        ],
      }),
    );
    expect(records.map((record) => record.cueNumber)).toEqual([5, 5]);
    expect(records.map((record) => record.seekStartMs)).toEqual([30000, 30000]);
    expect(records.map((record) => record.sourceNumber)).toEqual([1, 2]);
  });
});

describe("ledger", () => {
  it("writes one audited record per assigned question and ignores nothing inside the source", () => {
    const input = source();
    const marks = buildMarks([input], "f".repeat(64));
    expect(marks.schemaVersion).toBe(1);
    expect(marks.provider).toBe("grok");
    expect(marks.records).toHaveLength(1);
    expect(auditMarks([input], marks, "f".repeat(64))).toEqual([]);
  });

  it("does not admit an energy edge nearest an ASR estimate", () => {
    const input = source();
    const [provisional] = buildSourceRecords(input);
    const native: NativeEvidence = {
      sourceAudioSha256: provisional.sourceAudioSha256,
      sampleRate: 44100,
      startFrame: 68 * 44100,
      probe: { path: "cue.probe.json", sha256: "ab".repeat(32) },
      probeOffsetFrame: 68 * 44100,
      probeFrameCount: 88200,
      cueProbeSegmentIds: [2],
      cueOnsetFrame: 68 * 44100,
      pcmSha256: "cd".repeat(32),
      decodedAudioSha256: "ef".repeat(32),
      channels: 2,
      pcmLayout: "float32le-interleaved",
    };
    const published = publishNativeStart(provisional, native);
    expect(published?.status).toBe("candidate");
    expect(published?.seekStartMs).toBe(68000);
    expect(published?.seekStartMs).not.toBe(68290);
    expect(published?.reasons).toContain("seek_start_uses_source_frame_clock");
    expect(published?.reasons).toContain("asr_cue_estimate_ms:68290");
    const marks = buildMarks([input], "f".repeat(64));
    marks.records = [published!];
    expect(auditMarks([input], marks, "f".repeat(64), { requireNative: true })).toContain(
      "energy_onset_is_not_recognition q-generated-1",
    );
    expect(
      publishNativeStart(provisional, {
        ...native,
        startFrame: native.cueOnsetFrame + 4410,
        probeOffsetFrame: native.cueOnsetFrame + 4410,
      }),
    ).toBeNull();
  });
});
