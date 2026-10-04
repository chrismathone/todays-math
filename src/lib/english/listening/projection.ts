/** Explicit server allowlist projection. Never spread a teacher document into a student DTO. */
import { englishListeningAssignmentSchema } from "@/contracts/englishListening.contract";
import {
  englishListeningStudentViewSchema,
  type EnglishListeningStudentView,
} from "@/contracts/englishListeningStudent.contract";
import {
  freezeListeningValue,
  validateListeningPublication,
} from "./publication";
import {
  decideListeningRelease,
  type ListeningReleaseContext,
} from "./release";

export function projectListeningStudentView(
  publicationInput: unknown,
  assignmentInput: unknown,
  attemptInput: unknown,
  context: ListeningReleaseContext,
): EnglishListeningStudentView {
  const publication = validateListeningPublication(publicationInput);
  const assignment = englishListeningAssignmentSchema.parse(assignmentInput);
  const releases = decideListeningRelease(
    publication,
    assignment,
    attemptInput,
    context,
  );
  const studentAudio = assignment.audioSource === "student_device";
  const groups = publication.document.groups.map((group) => {
    const released = releases.find(
      (release) => release.groupId === group.id,
    )!.released;
    const questions = group.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      ...(question.image
        ? {
            image: {
              dataUrl: question.image.dataUrl,
              width: question.image.width,
              height: question.image.height,
            },
          }
        : {}),
      choices: question.choices.map((choice) => ({
        id: choice.id,
        text: choice.text,
      })),
      ...(released
        ? {
            answerChoiceId: question.answerChoiceId,
            explanation: question.explanation,
            ...(studentAudio
              ? {
                  evidence: question.evidence.map((range) => ({
                    startMs: range.startMs,
                    endMs: range.endMs,
                  })),
                }
              : {}),
          }
        : {}),
    }));
    return {
      id: group.id,
      state: released ? "review" : "locked",
      questions,
      ...(released
        ? {
            transcript: {
              text: group.transcript.text,
              translation: group.transcript.translation,
            },
          }
        : {}),
      ...(studentAudio
        ? {
            audio: {
              assetId: group.audio.assetId,
              durationMs: group.audio.durationMs,
            },
          }
        : {}),
    };
  });
  return freezeListeningValue(
    englishListeningStudentViewSchema.parse({
      schemaVersion: 1,
      publicationId: publication.id,
      assignmentId: assignment.id,
      title: publication.document.title,
      audioSource: assignment.audioSource,
      groups,
    }),
  );
}
