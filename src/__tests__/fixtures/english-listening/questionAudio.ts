import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PDFDocument } from "pdf-lib";
import { englishListeningFixture } from "@/mocks/englishListeningFixture";
import { listeningQuestionMetadata } from "@/lib/english/listening/metadata";
import { waveHeader } from "@/lib/english/listening/media/mp3";
import {
  questionAudioSha256 as sha,
  type QuestionAudioAlignment,
  type QuestionAudioAsr,
  type QuestionAudioScript,
  type QuestionAudioActivity,
  type QuestionAudioRawActivity,
  type QuestionAudioSnapshot,
} from "@/lib/english/listening/questionAudioProof";
export const audioSourceId = "ebs-middle-1-2026-1";
/** Self-authored text + synthetic tone intervals. This is never a human review fixture. */
export function questionAudioEvidence() {
  const fixture = englishListeningFixture();
  const announcements = "모든 문제는 한 번씩 방송됩니다.\n[1~2]";
  const utterances = [
    ["M: Hello, I’ll meet you at the cafe.", "W: Great, I will bring my book."],
    ["M: Can you show me the blue bag?", "W: Yes, it is on the small table."],
  ];
  const text = announcements + "\n" + utterances.flat().join("\n");
  const intervals = [
    [1600, 3200],
    [4800, 9600],
    [10400, 14400],
    [18400, 20000],
    [20800, 25600],
    [26400, 30400],
  ].map(([start, end]) => [start * 10, end * 10]);
  const audio = Buffer.concat([
    waveHeader(336000, 16000, 1),
    Buffer.alloc(336000 * 2),
  ]);
  for (const [start, end] of intervals)
    for (let sample = start; sample < end; sample++)
      audio.writeInt16LE(
        Math.round(Math.sin(sample * 0.17) * 10000),
        44 + sample * 2,
      );
  const sourceSha = sha(audio),
    pdfSha = sha("temporary self authored PDF proof");
  const assessment = {
    kind: "national_listening" as const,
    provider: "self-authored tests",
    year: 2026,
    round: 1,
    month: null,
    originalFilename: "self-authored.pdf",
  };
  const questions = fixture.groups[0].questions.map((q, index) => {
    const choices = q.choices.map((c) => ({ ...c, id: randomUUID() }));
    const base = {
      ...q,
      id: randomUUID(),
      sourceNumber: index + 1,
      choices,
      answerChoiceId:
        choices[q.choices.findIndex((c) => c.id === q.answerChoiceId)].id,
      evidence: [
        { startMs: index ? 13000 : 3000, endMs: index ? 16000 : 6000 },
      ],
    };
    return {
      ...base,
      metadata: {
        ...listeningQuestionMetadata(base, {
          source: assessment,
          level: "중1",
        }),
        origin: "official_original" as const,
        sourceRecordId: audioSourceId,
        sourceAudioSha256: sourceSha,
        sourceQuestionSha256: pdfSha,
      },
    };
  });
  const span = (value: string) => ({
    startCharacter: text.indexOf(value),
    endCharacter: text.indexOf(value) + value.length,
    text: value,
  });
  const script: QuestionAudioScript = {
    schemaVersion: 1,
    sourceRecordId: audioSourceId,
    sourceAudioSha256: sourceSha,
    sourceTranscriptFileSha256: pdfSha,
    sourceTranscriptSha256: sha(text),
    sourceTranscriptText: text,
    sections: utterances.map((lines, index) => ({
      id: `section-${index + 1}`,
      questionNumbers: [index + 1],
      startCharacter: span(lines[0]).startCharacter,
      endCharacter: span(lines[1]).endCharacter,
      utterances: lines.map(span),
      expectedRepetitions: 1,
      repetitionEvidence: span("모든 문제는 한 번씩 방송됩니다."),
    })),
  };
  const texts = [
    "1번",
    utterances[0][0].replace("I’ll", "I'll"),
    utterances[0][1],
    "2번",
    ...utterances[1],
  ];
  const asr: QuestionAudioAsr = {
    sourceAudioSha256: sourceSha,
    durationSeconds: 21,
    segments: intervals.map(([start, end], index) => ({
      id: index + 1,
      text: texts[index],
      estimatedStartSeconds: start / 16000,
      estimatedEndSeconds: end / 16000,
      uncertain: false,
    })),
  };
  const activity: QuestionAudioActivity = {
    schemaVersion: 1,
    sourceAudioSha256: sourceSha,
    decoder: "pyav-faster-whisper",
    sampleRate: 16000,
    decodedSampleCount: 336000,
    rawArtifact: {
      path: "/temporary/raw-activity.json",
      sha256: sha("temporary"),
    },
    events: intervals.map(([startSample, endSample], index) => ({
      id: index + 1,
      startSample,
      endSample,
    })),
  };
  const ref = { path: "/temporary", sha256: sha("temporary") };
  const alignment: QuestionAudioAlignment = {
    schemaVersion: 1,
    sourceRecordId: audioSourceId,
    humanReviewed: false,
    sourceAudio: { ...ref, sha256: sourceSha },
    prepared: ref,
    asr: { auto: ref, english: ref },
    officialScript: ref,
    activity: ref,
    questions: questions.map((q, index) => ({
      questionId: q.id,
      sourceNumber: index + 1,
      decision: "qualified",
      reasons: [],
      scriptSectionId: `section-${index + 1}`,
      startSample: index === 0 ? 0 : 176000,
      endSample: index === 0 ? 160000 : 320000,
      cue: {
        cache: "auto",
        segmentIds: [index * 3 + 1],
        questionNumbers: [index + 1],
      },
      copies: [
        {
          cache: "english",
          segmentIds: [index * 3 + 2, index * 3 + 3],
          firstSegmentIds: [index * 3 + 2],
          lastSegmentIds: [index * 3 + 3],
        },
      ],
    })),
  };
  const editableInput = {
    title: "Synthetic complete-dialogue clips",
    level: "중1",
    examId: null,
    rights: fixture.rights,
    basis: "Self-authored isolated fixture",
    groups: [
      {
        id: randomUUID(),
        audio: null,
        transcript: { revision: 1, text, spokenText: text, translation: null },
        questions,
      },
    ],
  };
  const float32 = new Float32Array(336000);
  for (let i = 0; i < float32.length; i++)
    float32[i] = audio.readInt16LE(44 + i * 2) / 32768;
  const rawActivity: QuestionAudioRawActivity = {
    schemaVersion: 1,
    sourceAudioSha256: sourceSha,
    decoder: "faster_whisper.audio.decode_audio/PyAV",
    sampleRate: 16000,
    decodedSampleCount: 336000,
    decodedMonoFloat32Sha256: sha(new Uint8Array(float32.buffer)),
    humanReviewed: false,
    originalAudioModified: false,
    options: { threshold: 0.5, minSilenceDurationMs: 2000, speechPadMs: 400 },
    chunks: activity.events.map(({ startSample, endSample }) => ({
      startSample,
      endSample,
    })),
    unpaddedChunks: activity.events.map((e) => ({
      startSample: e.startSample + 6400,
      endSample: e.endSample - 6400,
    })),
  };
  return {
    alignment,
    script,
    asr: { auto: structuredClone(asr), english: structuredClone(asr) },
    activity,
    rawActivity,
    audio,
    assessment,
    editableInput,
  };
}
export async function questionAudioArtifacts(root: string) {
  const evidence = questionAudioEvidence();
  for (const folder of [
    "originals",
    "prepared-registration",
    "prepared-question-audio",
    "question-alignment",
  ])
    await mkdir(resolve(root, folder), { recursive: true });
  const pdf = await PDFDocument.create();
  pdf.addPage().drawText("Self-authored fixture transcript");
  const pdfBytes = Buffer.from(await pdf.save()),
    pdfPath = resolve(root, "originals", "transcript.pdf"),
    audioPath = resolve(root, "originals", "audio.wav");
  await writeFile(pdfPath, pdfBytes);
  await writeFile(audioPath, evidence.audio);
  evidence.script.sourceTranscriptFileSha256 = sha(pdfBytes);
  const rawPrepared = JSON.stringify({
    schemaVersion: 1,
    sourceRecordId: audioSourceId,
    createInput: {
      title: evidence.editableInput.title,
      level: "중1",
      rights: evidence.editableInput.rights,
      basis: evidence.editableInput.basis,
      source: evidence.assessment,
    },
    editableInput: evidence.editableInput,
    sourceFiles: [
      {
        kind: "audio",
        path: audioPath,
        sha256: sha(evidence.audio),
        bytes: evidence.audio.length,
      },
      {
        kind: "transcript",
        path: pdfPath,
        sha256: sha(pdfBytes),
        bytes: pdfBytes.length,
      },
    ],
  });
  const write = async (folder: string, name: string, value: unknown) => {
    const path = resolve(root, folder, name),
      raw = typeof value === "string" ? value : JSON.stringify(value);
    await writeFile(path, raw);
    return { path, sha256: sha(raw) };
  };
  evidence.alignment.sourceAudio = {
    path: audioPath,
    sha256: sha(evidence.audio),
  };
  evidence.alignment.prepared = await write(
    "prepared-registration",
    audioSourceId + ".json",
    rawPrepared,
  );
  evidence.alignment.officialScript = await write(
    "question-alignment",
    "script.json",
    evidence.script,
  );
  evidence.activity.rawArtifact = await write(
    "question-alignment",
    "raw-activity.json",
    evidence.rawActivity,
  );
  evidence.alignment.activity = await write(
    "question-alignment",
    "activity.json",
    evidence.activity,
  );
  evidence.alignment.asr = {
    auto: await write("question-alignment", "auto.json", evidence.asr.auto),
    english: await write(
      "question-alignment",
      "english.json",
      evidence.asr.english,
    ),
  };
  const alignmentRef = await write(
    "question-alignment",
    "alignment.json",
    evidence.alignment,
  );
  const snapshot: QuestionAudioSnapshot = {
    schemaVersion: 1,
    sourceRecordId: audioSourceId,
    alignment: alignmentRef,
    expectedSet: {
      setId: randomUUID(),
      ownerId: randomUUID(),
      branchId: null,
      revision: 1,
      documentSha256: sha("placeholder snapshot"),
      originalAssetId: randomUUID(),
    },
  };
  const snapshotPath = resolve(
    root,
    "prepared-question-audio",
    audioSourceId + ".json",
  );
  await writeFile(snapshotPath, JSON.stringify(snapshot));
  return {
    ...evidence,
    snapshot,
    snapshotPath,
    writeSnapshot: () => writeFile(snapshotPath, JSON.stringify(snapshot)),
  };
}
