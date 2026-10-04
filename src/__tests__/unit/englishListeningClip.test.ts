// @vitest-environment node
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { planListeningWaveClip } from "@/lib/english/listening/media/clip";
import { englishListeningFixture } from "@/mocks/englishListeningFixture";
import { listeningDraftPrintDocument } from "@/lib/english/listening/draftPrint";
import { listeningComposeInputSchema } from "@/contracts/englishListeningCompose.contract";

function waveHeader(seconds = 15, rate = 8000) {
  const totalBytes = 44 + seconds * rate * 2;
  const header = Buffer.alloc(44);
  header.write("RIFF");
  header.writeUInt32LE(totalBytes - 8, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(totalBytes - 44, 40);
  return { header, totalBytes };
}
describe("selected listening PCM audio", () => {
  it("clips explicit full-question ranges in selected order and remaps evidence", () => {
    const fixture = englishListeningFixture().groups[0].questions;
    const questions = [
      {
        ...fixture[1],
        audioRange: { startMs: 8000, endMs: 15000 },
        evidence: [{ startMs: 9000, endMs: 14000 }],
      },
      {
        ...fixture[0],
        audioRange: { startMs: 0, endMs: 7000 },
        evidence: [{ startMs: 3000, endMs: 6000 }],
      },
    ];
    const { header, totalBytes } = waveHeader();
    const plan = planListeningWaveClip(header, totalBytes, questions);
    expect(plan.ranges).toEqual([
      { start: 44 + 8000 * 16, endExclusive: totalBytes },
      { start: 44, endExclusive: 44 + 7000 * 16 },
    ]);
    expect(plan.durationMs).toBe(14000);
    expect(plan.header.readUInt32LE(40)).toBe(14000 * 16);
    expect(plan.evidenceByQuestionId.get(questions[0].id)).toEqual([
      { startMs: 1000, endMs: 6000 },
    ]);
    expect(plan.evidenceByQuestionId.get(questions[1].id)).toEqual([
      { startMs: 10000, endMs: 13000 },
    ]);
    expect(plan.audioRangeByQuestionId.get(questions[1].id)).toEqual({
      startMs: 7000,
      endMs: 14000,
    });
  });
  it("keeps overlapping shared dialogue once as one release unit", () => {
    const questions = englishListeningFixture().groups[0].questions.map(
      (question, index) => ({
        ...question,
        audioRange: { startMs: index * 3000, endMs: 10000 },
      }),
    );
    const { header, totalBytes } = waveHeader();
    const plan = planListeningWaveClip(header, totalBytes, questions);
    expect(plan.ranges).toHaveLength(1);
    expect(plan.durationMs).toBe(10000);
    expect(plan.evidenceByQuestionId.get(questions[1].id)).toEqual([]);
  });
  it("refuses answer evidence as a substitute for full-question timing", () => {
    const { header, totalBytes } = waveHeader();
    expect(() =>
      planListeningWaveClip(
        header,
        totalBytes,
        englishListeningFixture().groups[0].questions,
      ),
    ).toThrow("문항 음원 구간");
  });
  it("rejects out-of-source timing and malformed canonical headers", () => {
    const question = {
      ...englishListeningFixture().groups[0].questions[0],
      audioRange: { startMs: 14000, endMs: 16000 },
    };
    const { header, totalBytes } = waveHeader();
    expect(() => planListeningWaveClip(header, totalBytes, [question])).toThrow(
      "원본 음원 범위",
    );
    header.writeUInt16LE(8, 34);
    expect(() => planListeningWaveClip(header, totalBytes, [question])).toThrow(
      "PCM",
    );
  });
});
describe("listening compose/print boundaries", () => {
  it("rejects duplicate group and question selections and forged answer material", () => {
    const selection = {
      setId: randomUUID(),
      expectedRevision: 1,
      documentHash: "a".repeat(64),
      groupId: randomUUID(),
      questionIds: [randomUUID()],
    };
    expect(
      listeningComposeInputSchema.safeParse({
        title: "시험",
        selections: [selection, selection],
      }).success,
    ).toBe(false);
    expect(
      listeningComposeInputSchema.safeParse({
        title: "시험",
        selections: [
          {
            ...selection,
            questionIds: [selection.questionIds[0], selection.questionIds[0]],
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      listeningComposeInputSchema.safeParse({
        title: "시험",
        selections: [{ ...selection, answerChoiceId: randomUUID() }],
      }).success,
    ).toBe(false);
  });
  it("omits all student draft answers/transcripts/ranges while retaining source images", () => {
    const fixture = englishListeningFixture();
    fixture.groups[0].questions[0].image = {
      dataUrl: "data:image/png;base64,iVBORw0KGgo=",
      width: 100,
      height: 100,
    };
    const student = listeningDraftPrintDocument(fixture, "student");
    const teacher = listeningDraftPrintDocument(fixture, "teacher");
    expect(student.groups[0].questions[0].image).toEqual(
      fixture.groups[0].questions[0].image,
    );
    const serialized = JSON.stringify(student);
    expect(serialized).not.toMatch(
      /answer|explanation|transcript|translation|evidence|audioRange|At nine/,
    );
    expect(teacher.groups[0].questions[0].answer).toBe(1);
    expect(teacher.groups[0].transcript).toContain("At nine");
  });
});
