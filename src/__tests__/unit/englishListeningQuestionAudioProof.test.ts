// @vitest-environment node
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  questionAudioSha256,
  verifyQuestionAudioEvidence,
  questionAudioCueNumbers,
  verifyQuestionAudioSourceSpeech,
  questionAudioKoreanInstructionCueNumbers,
} from "@/lib/english/listening/questionAudioProof";
import { loadListeningQuestionAudioPlan } from "@/lib/english/listening/runtime/questionAudio";
import {
  questionAudioArtifacts,
  questionAudioEvidence,
  audioSourceId,
} from "../fixtures/english-listening/questionAudio";
vi.mock("server-only", () => ({}));
const folders: string[] = [];
afterEach(async () => {
  for (const folder of folders.splice(0))
    await rm(folder, { recursive: true, force: true });
});
describe("complete-source speech evidence", () => {
  it("rejects omitted edge speech even when the producer shortens the section to hide it", () => {
    for (const edge of ["first", "last"] as const) {
      const proof = questionAudioEvidence();
      const section = proof.script.sections[0];
      if (edge === "first") section.utterances.shift();
      else section.utterances.pop();
      section.startCharacter = section.utterances[0].startCharacter;
      section.endCharacter = section.utterances.at(-1)!.endCharacter;
      expect(() => verifyQuestionAudioSourceSpeech(proof.script)).toThrow(
        /whole official speaker speech/,
      );
      expect(() => verifyQuestionAudioEvidence(proof)).toThrow(
        /whole official speaker speech/,
      );
    }
  });
  it("preserves real speaker text while excluding numbered instructions, page footers and blank responses", () => {
    const text =
      "ANN : 모든 문제는 한 번씩 들려드립니다. 1번 다음 대화를 듣고 고르시오. M : Hello, friend. W: Great, see you tomorrow. M: Alex, ____________________\n10 2. SkySymphony에 관한 내용을 듣고 고르시오. M: Welcome to the new school. [Pause] ANN: 수고하셨습니다.";
    const first = text.indexOf("Hello"),
      last = text.indexOf("tomorrow.") + "tomorrow.".length;
    const next = text.indexOf("Welcome"),
      end = text.indexOf(" [Pause]");
    const fixture = questionAudioEvidence().script;
    fixture.sourceTranscriptText = text;
    fixture.sections = [
      {
        ...fixture.sections[0],
        startCharacter: first,
        endCharacter: text.indexOf("____________________"),
      },
      { ...fixture.sections[1], startCharacter: next, endCharacter: end },
    ];
    expect(() => verifyQuestionAudioSourceSpeech(fixture)).not.toThrow();
    fixture.sections[0].endCharacter = last;
    expect(() => verifyQuestionAudioSourceSpeech(fixture)).toThrow(
      /whole official speaker speech/,
    );
    fixture.sections[0].endCharacter = text.indexOf("tomorrow.");
    expect(() => verifyQuestionAudioSourceSpeech(fixture)).toThrow(
      /whole official speaker speech/,
    );
  });
  it("qualifies complete official dialogue, curly punctuation and exact independent passage boundaries", () => {
    const proof = questionAudioEvidence();
    expect(verifyQuestionAudioEvidence(proof)).toHaveLength(2);
    expect(questionAudioCueNumbers("Questions sixteen and seventeen.")).toEqual(
      [16, 17],
    );
    expect(questionAudioCueNumbers("We will meet at sixteen.")).toEqual([]);
  });
  it("accepts digit-dot Korean notation only with the exact original listening instruction", () => {
    const script = questionAudioEvidence().script;
    const instruction =
      "대화를 듣고, 남자의 심정으로 가장 적절한 것을 고르시오.";
    script.sourceTranscriptText = `1번 ${instruction} W: Hello, friend.`;
    const section = {
      ...script.sections[0],
      startCharacter: script.sourceTranscriptText.indexOf("Hello"),
      endCharacter: script.sourceTranscriptText.length,
    };
    script.sections = [section];
    expect(questionAudioCueNumbers(`1. ${instruction}`)).toEqual([]);
    expect(
      questionAudioKoreanInstructionCueNumbers(
        `1. ${instruction.replace(",", "")}`,
        script,
        section,
      ),
    ).toEqual([1]);
    for (const text of [
      `2. ${instruction}`,
      "1. 대화를 듣고 여자가 구입할 로봇을 고르시오.",
      "1. 다음 답을 고르시오.",
      "1. We will meet tomorrow.",
      "1.23 is the correct price.",
    ]) {
      expect(
        questionAudioKoreanInstructionCueNumbers(text, script, section),
      ).toEqual([]);
    }
  });
  it("cannot approve uncertain decisions, missing numbering or source hash disagreement", () => {
    for (const mutate of [
      (p: ReturnType<typeof questionAudioEvidence>) => {
        p.alignment.questions[0].decision = "uncertain";
      },
      (p: ReturnType<typeof questionAudioEvidence>) => {
        p.asr.auto.segments[0].text = "Listen carefully";
      },
      (p: ReturnType<typeof questionAudioEvidence>) => {
        p.activity.sourceAudioSha256 = "f".repeat(64);
      },
    ]) {
      const proof = questionAudioEvidence();
      mutate(proof);
      expect(() => verifyQuestionAudioEvidence(proof)).toThrow();
    }
    const prefix = questionAudioEvidence();
    prefix.alignment.questions = prefix.alignment.questions.slice(0, 1);
    expect(() => verifyQuestionAudioEvidence(prefix)).toThrow(
      /whole official source/,
    );
  });
  it("accepts cue-only Korean probes at proven VAD offsets and refuses shifted or forged local timestamps", () => {
    const proof = questionAudioEvidence(),
      segments = [proof.asr.auto.segments[0], proof.asr.auto.segments[3]];
    const korean = {
      sourceAudioSha256: proof.activity.sourceAudioSha256,
      durationSeconds: 21,
      requestedLanguage: "ko" as const,
      activityPath: "/trusted/raw-activity.json",
      activitySha256: questionAudioSha256("rawactivity"),
      probes: segments.map((s) => ({
        id: s.id,
        sourceEventId: s.id,
        startSample: proof.activity.events[s.id - 1].startSample,
        endSample: Math.min(
          proof.activity.events[s.id - 1].startSample + 12 * 16000,
          336000,
        ),
        sampleRate: 16000 as const,
        decodedMonoFloat32Sha256: questionAudioSha256("source float32 samples"),
        segmentIds: [s.id],
        originalSourceAudioSha256: proof.activity.sourceAudioSha256,
      })),
      segments: segments.map((s) => ({
        ...s,
        probeId: s.id,
        sourceEventId: s.id,
        localStartSeconds: 0,
        localEndSeconds: s.estimatedEndSeconds - s.estimatedStartSeconds,
      })),
    };
    const augmented = { ...proof, asr: { ...proof.asr, korean } };
    for (const q of augmented.alignment.questions) q.cue.cache = "korean";
    expect(verifyQuestionAudioEvidence(augmented)).toHaveLength(2);
    korean.segments[0].localStartSeconds = 0.1;
    expect(() => verifyQuestionAudioEvidence(augmented)).toThrow(
      /timestamp offset/,
    );
  });
  it("checks the whole official middle dialogue and genuine broadcast repetitions", () => {
    const omitted = questionAudioEvidence();
    omitted.script.sections[0].utterances.pop();
    expect(() => verifyQuestionAudioEvidence(omitted)).toThrow(
      /middle dialogue/,
    );
    const repeat = questionAudioEvidence();
    repeat.script.sections[0].expectedRepetitions = 2;
    expect(() => verifyQuestionAudioEvidence(repeat)).toThrow(/repetition/);
    const missing = questionAudioEvidence();
    missing.asr.english.segments[2].text = "Nothing relevant was said here";
    expect(() => verifyQuestionAudioEvidence(missing)).toThrow(/not covered/);
    const middle = questionAudioEvidence();
    middle.alignment.questions[0].copies[0].firstSegmentIds = [3];
    expect(() => verifyQuestionAudioEvidence(middle)).toThrow(
      /prefix or suffix/,
    );
  });
  it("rejects orphan activity between questions even when all selected dialogue remains complete", () => {
    const proof = questionAudioEvidence();
    proof.activity.events.splice(3, 0, {
      id: 7,
      startSample: 162000,
      endSample: 174000,
    });
    proof.rawActivity.chunks.splice(3, 0, {
      startSample: 162000,
      endSample: 174000,
    });
    proof.rawActivity.unpaddedChunks.splice(3, 0, {
      startSample: 164000,
      endSample: 172000,
    });
    expect(() => verifyQuestionAudioEvidence(proof)).toThrow(
      /unassigned.*activity/,
    );
  });
  it("holds extra spoken text in a clip even when the selected official dialogue is complete", () => {
    const proof = questionAudioEvidence();
    proof.asr.english.segments.push({
      id: 7,
      text: "Monica?",
      estimatedStartSeconds: 9.25,
      estimatedEndSeconds: 9.4,
      uncertain: false,
    });
    expect(() => verifyQuestionAudioEvidence(proof)).toThrow(
      /unclassified.*ASR/,
    );
  });
  it("requires the official repetition instruction to apply to the actual question numbers", () => {
    const proof = questionAudioEvidence();
    proof.script.sourceTranscriptText =
      proof.script.sourceTranscriptText.replace(
        "모든 문제는 한 번씩 방송됩니다.",
        "1번부터 1번까지는 한 번씩 방송됩니다.",
      );
    const delta = "1번부터 1번까지는".length - "모든 문제는".length;
    proof.script.sourceTranscriptSha256 = questionAudioSha256(
      proof.script.sourceTranscriptText,
    );
    for (const section of proof.script.sections) {
      section.startCharacter += delta;
      section.endCharacter += delta;
      for (const utterance of section.utterances) {
        utterance.startCharacter += delta;
        utterance.endCharacter += delta;
      }
      section.repetitionEvidence = {
        startCharacter: 0,
        endCharacter: proof.script.sourceTranscriptText.indexOf("\n"),
        text: proof.script.sourceTranscriptText.split("\n")[0],
      };
    }
    expect(() => verifyQuestionAudioEvidence(proof)).toThrow(
      /repetition.*scope/,
    );
  });
  it("cannot substitute all dialogue as the last anchor when the real closing sentence is absent", () => {
    const proof = questionAudioEvidence();
    proof.script.sections[0].utterances[1].text =
      "W: Great, I will bring my book, and my red bag tomorrow. Goodbye.";
    const text = proof.script.sections[0].utterances[1].text;
    const old = "W: Great, I will bring my book.";
    proof.script.sourceTranscriptText =
      proof.script.sourceTranscriptText.replace(old, text);
    proof.script.sourceTranscriptSha256 = questionAudioSha256(
      proof.script.sourceTranscriptText,
    );
    const delta = text.length - old.length;
    proof.asr.english.segments[2].text = text.replace(" Goodbye.", "");
    proof.script.sections[0].utterances[1].endCharacter += delta;
    proof.script.sections[0].endCharacter += delta;
    for (const section of proof.script.sections.slice(1)) {
      section.startCharacter += delta;
      section.endCharacter += delta;
      for (const utterance of section.utterances) {
        utterance.startCharacter += delta;
        utterance.endCharacter += delta;
      }
    }
    proof.alignment.questions[0].copies[0].lastSegmentIds = [2, 3];
    expect(() => verifyQuestionAudioEvidence(proof)).toThrow(/edge.*anchor/);
  });
  it("binds complementary ASR text/time/uncertainty to exact raw origins and rejects overlapping speech inflation", () => {
    const proof = questionAudioEvidence(),
      raw = structuredClone(proof.asr.english),
      hash = questionAudioSha256(JSON.stringify(raw));
    proof.asr.english.derivedFrom = [
      { path: "/trusted/raw.json", sha256: hash },
    ];
    for (const segment of proof.asr.english.segments)
      segment.origin = { artifactSha256: hash, segmentId: segment.id };
    const input = { ...proof, derivedAsrOrigins: { [hash]: raw } };
    expect(verifyQuestionAudioEvidence(input)).toHaveLength(2);
    proof.asr.english.segments[1].text += " changed";
    expect(() => verifyQuestionAudioEvidence(input)).toThrow(
      /exact raw origin/,
    );
    proof.asr.english.segments[1].text = raw.segments[1].text;
    const overlap = questionAudioEvidence();
    overlap.asr.english.segments[2].estimatedStartSeconds = 0.5;
    expect(() => verifyQuestionAudioEvidence(overlap)).toThrow(
      /overlapping speech/,
    );
  });
  it("rejects cut speech and adjacent speech timestamp overflow while allowing silence padding", () => {
    const cut = questionAudioEvidence();
    cut.alignment.questions[0].endSample = 140000;
    expect(() => verifyQuestionAudioEvidence(cut)).toThrow(/speech event/);
    const overflow = questionAudioEvidence();
    overflow.asr.english.segments[2].estimatedEndSeconds = 13;
    expect(() => verifyQuestionAudioEvidence(overflow)).toThrow(
      /adjacent speech/,
    );
    const silence = questionAudioEvidence();
    silence.asr.english.segments[2].estimatedEndSeconds = 10.5;
    expect(verifyQuestionAudioEvidence(silence)).toHaveLength(2);
  });
  it("accepts exact floating-point adjacent timestamps but rejects a positive one-sample speech overlap and insufficient measured pad", () => {
    const proof = questionAudioEvidence(),
      touch = 6.5100000000000007;
    proof.asr.english.segments[1].estimatedEndSeconds = touch;
    proof.asr.english.segments[2].estimatedStartSeconds = touch;
    expect(verifyQuestionAudioEvidence(proof)).toHaveLength(2);
    proof.asr.english.segments[2].estimatedStartSeconds = touch - 1 / 16000;
    expect(() => verifyQuestionAudioEvidence(proof)).toThrow(
      /overlapping speech/,
    );
    const short = questionAudioEvidence();
    short.rawActivity.unpaddedChunks[2].endSample =
      short.alignment.questions[0].endSample - 16;
    expect(() => verifyQuestionAudioEvidence(short)).toThrow(/raw VAD|padding/);
  });
  it("models an official common numbering scope without joining two different dialogues", () => {
    const proof = questionAudioEvidence();
    const text = "[1~2]",
      start = proof.script.sourceTranscriptText.indexOf(text);
    proof.asr.auto.segments[0].text = "Questions one and two.";
    for (const q of proof.alignment.questions)
      q.cue = {
        cache: "auto",
        segmentIds: [1],
        questionNumbers: [1, 2],
        scopeEvidence: {
          startCharacter: start,
          endCharacter: start + text.length,
          text,
        },
      };
    const groups = verifyQuestionAudioEvidence(proof);
    expect(groups.map((g) => g.questions.map((q) => q.sourceNumber))).toEqual([
      [1],
      [2],
    ]);
    proof.alignment.questions[1].cue.scopeEvidence!.text = "[1~3]";
    expect(() => verifyQuestionAudioEvidence(proof)).toThrow(/span/);
  });
  it("retains only a complete, genuinely shared passage as one group", () => {
    const proof = questionAudioEvidence();
    // The official source itself contains one common dialogue, rather than an
    // omitted second dialogue that a producer merely labels as shared.
    proof.script.sourceTranscriptText = proof.script.sourceTranscriptText.slice(
      0,
      proof.script.sections[0].endCharacter,
    );
    proof.script.sourceTranscriptSha256 = questionAudioSha256(
      proof.script.sourceTranscriptText,
    );
    proof.script.sections = [
      { ...proof.script.sections[0], questionNumbers: [1, 2] },
    ];
    proof.asr.auto.segments[0].text = "Questions one and two.";
    proof.alignment.questions = proof.alignment.questions.map((q) => ({
      ...proof.alignment.questions[0],
      questionId: q.questionId,
      sourceNumber: q.sourceNumber,
      cue: { cache: "auto", segmentIds: [1], questionNumbers: [1, 2] },
      sharedPassageQuestionNumbers: [1, 2],
    }));
    expect(verifyQuestionAudioEvidence(proof)).toHaveLength(1);
    delete proof.alignment.questions[1].sharedPassageQuestionNumbers;
    expect(() => verifyQuestionAudioEvidence(proof)).toThrow(/shared passage/);
  });
  it("fully loads and hashes local source PCM, refuses raw artifact tampering and stale decoder frame identity", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "listening-question-proof-"));
    folders.push(root);
    const fixture = await questionAudioArtifacts(root);
    const plan = await loadListeningQuestionAudioPlan(root, audioSourceId);
    try {
      expect(
        plan.groups.map((g) => [g.clip.startFrame, g.clip.endFrame]),
      ).toEqual([
        [0, 160000],
        [176000, 320000],
      ]);
      expect(plan.source.pcmSha256).toBe(
        questionAudioSha256(fixture.audio.subarray(44)),
      );
    } finally {
      await plan.dispose();
    }
    const original = await readFile(fixture.alignment.asr.auto.path);
    await writeFile(
      fixture.alignment.asr.auto.path,
      Buffer.concat([original, Buffer.from(" ")]),
    );
    await expect(
      loadListeningQuestionAudioPlan(root, audioSourceId),
    ).rejects.toThrow(/artifact hash/);
    await writeFile(fixture.alignment.asr.auto.path, original);
    fixture.activity.decodedSampleCount += 2;
    fixture.rawActivity.decodedSampleCount += 2;
    const rawVad = JSON.stringify(fixture.rawActivity);
    await writeFile(fixture.activity.rawArtifact.path, rawVad);
    fixture.activity.rawArtifact.sha256 = questionAudioSha256(rawVad);
    const altered = JSON.stringify(fixture.activity);
    await writeFile(fixture.alignment.activity.path, altered);
    fixture.alignment.activity.sha256 = questionAudioSha256(altered);
    const rawAlignment = JSON.stringify(fixture.alignment);
    await writeFile(fixture.snapshot.alignment.path, rawAlignment);
    fixture.snapshot.alignment.sha256 = questionAudioSha256(rawAlignment);
    await fixture.writeSnapshot();
    await expect(
      loadListeningQuestionAudioPlan(root, audioSourceId),
    ).rejects.toThrow(/frame identity/);
  });
});
