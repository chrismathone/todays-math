import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PDFDocument } from "pdf-lib";
import { englishListeningFixture } from "@/mocks/englishListeningFixture";
import { listeningQuestionMetadata } from "@/lib/english/listening/metadata";
import { listeningDraftSchema } from "@/contracts/englishListeningHttp.contract";

export const nativeSourceId = "ebs-middle-1-2026-1";
export const nativeSha = (bytes: Uint8Array | string) =>
  createHash("sha256").update(bytes).digest("hex");
export function nativeWave() {
  const wav = Buffer.alloc(44 + 16000);
  wav.write("RIFF");
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24);
  wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(wav.length - 44, 40);
  for (let i = 44; i < wav.length; i += 2)
    wav.writeInt16LE((i % 2000) - 1000, i);
  return wav;
}
const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5CsAAAAASUVORK5CYII=";
export async function nativeArtifacts(root: string, preserveLast = false) {
  const fixture = englishListeningFixture();
  const assessment = {
    kind: "national_listening" as const,
    provider: "self-authored test",
    year: 2026,
    round: 1,
    month: null,
    originalFilename: "self-authored-question.pdf",
  };
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([600, 900]);
  page.drawText("Self-authored native question proof", {
    x: 20,
    y: 870,
    size: 12,
  });
  const prompts = fixture.groups[0].questions.map(
    (_q, i) => `Choose the native response ${i + 1}.`,
  );
  prompts.forEach((prompt, i) =>
    page.drawText(prompt, { x: 20, y: 840 - i * 100, size: 10 }),
  );
  const pdfBytes = Buffer.from(await pdf.save());
  const audio = nativeWave();
  const pdfPath = resolve(root, "originals", "questions.pdf"),
    audioPath = resolve(root, "originals", "audio.wav");
  await mkdir(resolve(root, "originals"), { recursive: true });
  await mkdir(resolve(root, "prepared-registration"), { recursive: true });
  await mkdir(resolve(root, "prepared-native-registration"), {
    recursive: true,
  });
  await writeFile(pdfPath, pdfBytes);
  await writeFile(audioPath, audio);
  const group = fixture.groups[0],
    groupId = randomUUID();
  const oldQuestions = group.questions.map((question, index) => {
    const choices = question.choices.map((choice) => ({
      ...choice,
      id: randomUUID(),
    }));
    const answerIndex = question.choices.findIndex(
      (choice) => choice.id === question.answerChoiceId,
    );
    const base = {
      ...question,
      id: randomUUID(),
      sourceNumber: index + 1,
      prompt: `Original question image ${index + 1}`,
      choices,
      answerChoiceId: choices[answerIndex].id,
      evidence: [{ startMs: 100, endMs: 300 }],
      image: { dataUrl: png, width: 1, height: 1 },
    };
    return {
      ...base,
      metadata: {
        ...listeningQuestionMetadata(base, {
          source: assessment,
          level: "중1",
        }),
        origin: "official_original" as const,
        sourceRecordId: nativeSourceId,
        sourceAudioSha256: nativeSha(audio),
        sourceQuestionSha256: nativeSha(pdfBytes),
      },
    };
  });
  const rights = fixture.rights,
    basis = "Self-authored isolated test source";
  const editableInput = {
    title: "Native adoption test",
    level: "중1",
    examId: null,
    rights,
    basis,
    groups: [
      {
        id: groupId,
        audio: null,
        transcript: group.transcript,
        questions: oldQuestions,
      },
    ],
  };
  const original = {
    schemaVersion: 1 as const,
    sourceRecordId: nativeSourceId,
    createInput: {
      title: editableInput.title,
      level: editableInput.level,
      rights,
      basis,
      source: assessment,
    },
    editableInput,
    sourceFiles: [
      {
        kind: "questions",
        path: pdfPath,
        bytes: pdfBytes.length,
        sha256: nativeSha(pdfBytes),
      },
      {
        kind: "audio",
        path: audioPath,
        bytes: audio.length,
        sha256: nativeSha(audio),
      },
    ],
  };
  const originalPath = resolve(
    root,
    "prepared-registration",
    nativeSourceId + ".json",
  );
  const raw = JSON.stringify(original);
  await writeFile(originalPath, raw);
  const questions = oldQuestions.map((question, index) => {
    const preserved = preserveLast && index === oldQuestions.length - 1;
    return {
      questionId: question.id,
      sourceNumber: question.sourceNumber,
      prompt: preserved ? question.prompt : prompts[index],
      ...(question.instruction ? { instruction: question.instruction } : {}),
      ...(preserved
        ? { image: { ...question.image, role: "question" as const } }
        : {}),
      choices: question.choices.map((choice, i) => ({
        ...choice,
        text: preserved ? choice.text : `Native response ${i + 1}`,
      })),
      answerChoiceId: question.answerChoiceId,
      conversion: {
        method: preserved
          ? ("original_image_preserved" as const)
          : ("pdf_text" as const),
        sourcePage: 1,
        bounds: [20, 20 + index * 100, 580, 100 + index * 100],
        nativePrompt: !preserved,
        nativeChoices: !preserved,
        originalPrompt: preserved ? question.prompt : prompts[index],
        ...(preserved
          ? {
              visualSha256: nativeSha(Buffer.from(png.split(",")[1], "base64")),
              visualBounds: [20, 20 + index * 100, 580, 100 + index * 100],
              reason:
                "Preserve graphic-only native fixture without text extraction.",
            }
          : {}),
      },
    };
  });
  const stage = {
    schemaVersion: 1 as const,
    sourceRecordId: nativeSourceId,
    preparedAt: "2026-10-04T18:43:00+09:00",
    originalPreparedPath: originalPath,
    originalPreparedSha256: nativeSha(raw),
    sourceQuestionPdfSha256: nativeSha(pdfBytes),
    questions,
    conversion: {
      parser: "self-authored-pdf-fixture-v1",
      questionCount: questions.length,
      nativeCount: questions.length - (preserveLast ? 1 : 0),
      preservedImageCount: preserveLast ? 1 : 0,
    },
  };
  const stagePath = resolve(
    root,
    "prepared-native-registration",
    nativeSourceId + ".json",
  );
  await writeFile(stagePath, JSON.stringify(stage));
  const document = listeningDraftSchema.parse({
    ...fixture,
    title: editableInput.title,
    level: editableInput.level,
    source: assessment,
    provenance: { ...fixture.provenance, basis },
    groups: [
      {
        ...editableInput.groups[0],
        audio: fixture.groups[0].audio,
        reviews: { content: null, audio: null, alignment: null },
      },
    ],
  });
  return {
    original,
    stage,
    stagePath,
    originalPath,
    pdfPath,
    audioPath,
    audio,
    document,
  };
}
