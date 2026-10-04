// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  verifyQuestionAudioEvidence,
  verifyQuestionAudioPassageEvidence,
  type QuestionAudioPassageEvidenceInput,
} from "@/lib/english/listening/questionAudioProof";
import { questionAudioEvidence } from "../fixtures/english-listening/questionAudio";

describe("independent offline passage evidence", () => {
  it("stages a complete passage while an uncertain neighbor keeps whole-source fallback", () => {
    const evidence = questionAudioEvidence();
    evidence.alignment.questions[0].decision = "uncertain";
    evidence.alignment.questions[0].reasons = ["missing last utterance"];
    expect(verifyQuestionAudioPassageEvidence(evidence, [2])).toHaveLength(1);
    expect(() => verifyQuestionAudioEvidence(evidence)).toThrow(/unqualified/);
    expect(() => verifyQuestionAudioPassageEvidence(evidence, [1])).toThrow(
      /unqualified/,
    );
  });

  it("keeps complete source identities and rejects script or identity omissions", () => {
    const evidence = questionAudioEvidence();
    evidence.alignment.questions.shift();
    expect(() => verifyQuestionAudioPassageEvidence(evidence, [2])).toThrow(
      /whole official source|identity/,
    );
    const duplicated = questionAudioEvidence();
    duplicated.alignment.questions[0].questionId =
      duplicated.alignment.questions[1].questionId;
    expect(() => verifyQuestionAudioPassageEvidence(duplicated, [2])).toThrow(
      /identity/,
    );
  });

  it("keeps unresolved ledger identities without inventing cue or copy objects", () => {
    const evidence: QuestionAudioPassageEvidenceInput = questionAudioEvidence();
    evidence.alignment.questions[0] = {
      questionId: evidence.alignment.questions[0].questionId,
      sourceNumber: 1,
      scriptSectionId: "section-1",
      decision: "uncertain",
      cue: null,
      copies: [],
    };
    expect(verifyQuestionAudioPassageEvidence(evidence, [2])).toHaveLength(1);
    expect(() => verifyQuestionAudioPassageEvidence(evidence, [1])).toThrow();
  });

  it("retains every raw segment of a referenced Korean probe and rejects its overshoot", () => {
    const evidence = questionAudioEvidence();
    const korean = {
      ...evidence.asr.auto,
      requestedLanguage: "ko" as const,
      activityPath: evidence.alignment.activity.path,
      activitySha256: evidence.alignment.activity.sha256,
      probes: [1, 4].map((id, i) => ({
        id,
        sourceEventId: id,
        startSample: evidence.activity.events[id - 1].startSample,
        endSample: Math.min(
          evidence.activity.events[id - 1].startSample + 192000,
          evidence.activity.decodedSampleCount,
        ),
        sampleRate: 16000 as const,
        decodedMonoFloat32Sha256: evidence.rawActivity.decodedMonoFloat32Sha256,
        originalSourceAudioSha256: evidence.alignment.sourceAudio.sha256,
        segmentIds: [i + 1],
      })),
      segments: [1, 4].map((probeId, i) => ({
        id: i + 1,
        probeId,
        sourceEventId: probeId,
        text: `${i + 1}번`,
        uncertain: false,
        estimatedStartSeconds:
          evidence.activity.events[probeId - 1].startSample / 16000,
        estimatedEndSeconds:
          evidence.activity.events[probeId - 1].startSample / 16000 +
          (i ? 1 : 12.1),
        localStartSeconds: 0,
        localEndSeconds: i ? 1 : 12.1,
      })),
    };
    const augmented = { ...evidence, asr: { ...evidence.asr, korean } };
    augmented.alignment.questions[1].cue = {
      cache: "korean",
      segmentIds: [2],
      questionNumbers: [2],
    };
    expect(verifyQuestionAudioPassageEvidence(augmented, [2])).toHaveLength(1);
    expect(korean.segments[0].localEndSeconds).toBe(12.1);
    expect(() => verifyQuestionAudioEvidence(augmented)).toThrow();
    korean.segments[1].localEndSeconds = 12.1;
    expect(() => verifyQuestionAudioPassageEvidence(augmented, [2])).toThrow();
  });

  it("checks raw recognition windows used by the selected passage even when their bounds are wrong", () => {
    const evidence = questionAudioEvidence();
    evidence.activity.decodedSampleCount =
      evidence.rawActivity.decodedSampleCount = 400000;
    evidence.activity.events.push({
      id: 7,
      startSample: 352000,
      endSample: 384000,
    });
    evidence.rawActivity.chunks.push({
      startSample: 352000,
      endSample: 384000,
    });
    evidence.rawActivity.unpaddedChunks.push({
      startSample: 358400,
      endSample: 377600,
    });
    evidence.asr.auto.durationSeconds =
      evidence.asr.english.durationSeconds = 25;
    evidence.asr.english.windows = [
      {
        id: 1,
        firstActivityEventId: 1,
        nextActivityEventId: 4,
        startSample: 16000,
        endSample: 160000,
        segmentIds: [1, 2, 3],
        questionNumbers: [1],
      },
      {
        id: 2,
        firstActivityEventId: 4,
        nextActivityEventId: 7,
        startSample: 184000,
        endSample: 320000,
        segmentIds: [4, 5, 6],
        questionNumbers: [2],
      },
    ].map((w) => ({
      ...w,
      cueSegmentIds: [w.segmentIds[0]],
      sampleRate: 16000 as const,
      originalSourceAudioSha256: evidence.alignment.sourceAudio.sha256,
      decodedMonoFloat32Sha256: evidence.rawActivity.decodedMonoFloat32Sha256,
      purpose: "recognition_only_not_clip_boundaries" as const,
    }));
    for (const s of evidence.asr.english.segments) {
      s.windowId = s.id <= 3 ? 1 : 2;
      const start = s.id <= 3 ? 1 : 11.5;
      s.localStartSeconds = s.estimatedStartSeconds - start;
      s.localEndSeconds = s.estimatedEndSeconds - start;
    }
    evidence.asr.english.segments[0].localEndSeconds = 12.1;
    expect(verifyQuestionAudioPassageEvidence(evidence, [2])).toHaveLength(1);
    expect(() => verifyQuestionAudioEvidence(evidence)).toThrow(
      /timestamp offset/,
    );
    evidence.asr.english.segments[5].localEndSeconds! += 0.001;
    expect(() => verifyQuestionAudioPassageEvidence(evidence, [2])).toThrow(
      /timestamp offset/,
    );
    evidence.asr.english.windows[1].startSample = 170000;
    evidence.asr.english.windows[1].endSample = 173000;
    expect(() => verifyQuestionAudioPassageEvidence(evidence, [2])).toThrow(
      /source bounds/,
    );
  });

  it("cannot hide source speech by staging a different question", () => {
    const evidence = questionAudioEvidence();
    evidence.script.sections[0].utterances.pop();
    evidence.script.sections[0].endCharacter =
      evidence.script.sections[0].utterances[0].endCharacter;
    expect(() => verifyQuestionAudioPassageEvidence(evidence, [2])).toThrow(
      /whole official speaker speech/,
    );
  });

  it("retains exact spoken numbering, dialogue coverage, and complete VAD event gates", () => {
    for (const change of [
      (e: ReturnType<typeof questionAudioEvidence>) => {
        e.asr.auto.segments[3].text = "3번";
      },
      (e: ReturnType<typeof questionAudioEvidence>) => {
        e.asr.english.segments[5].text = "Unrelated neighboring speech.";
      },
      (e: ReturnType<typeof questionAudioEvidence>) => {
        e.alignment.questions[1].endSample = 300000;
      },
    ]) {
      const evidence = questionAudioEvidence();
      change(evidence);
      expect(() => verifyQuestionAudioPassageEvidence(evidence, [2])).toThrow();
    }
  });

  it("does not omit unassigned speech inside a selected clip", () => {
    const evidence = questionAudioEvidence();
    evidence.asr.english.segments.push({
      id: 7,
      text: "A neighboring question is also audible.",
      estimatedStartSeconds: 14,
      estimatedEndSeconds: 15,
      uncertain: false,
    });
    expect(() => verifyQuestionAudioPassageEvidence(evidence, [2])).toThrow(
      /unclassified ASR speech/,
    );
  });

  it("cannot stage an incomplete shared passage or numbered scope", () => {
    const evidence = questionAudioEvidence();
    evidence.alignment.questions[0].cue.scopeEvidence = {
      startCharacter: evidence.script.sourceTranscriptText.indexOf("1~2"),
      endCharacter: evidence.script.sourceTranscriptText.indexOf("1~2") + 3,
      text: "1~2",
    };
    evidence.asr.auto.segments[0].text = "Questions one and two.";
    evidence.alignment.questions[0].cue.questionNumbers = [1, 2];
    expect(() => verifyQuestionAudioPassageEvidence(evidence, [1])).toThrow(
      /common numbering scope/,
    );
  });

  it.each(
    [[], [2, 1], [1, 1], [0], [3], [1.5]].map((selection) => ({ selection })),
  )("rejects invalid or unknown selections %j", ({ selection }) => {
    expect(() =>
      verifyQuestionAudioPassageEvidence(questionAudioEvidence(), selection),
    ).toThrow();
  });
});
