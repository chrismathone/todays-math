import type { ListeningDraft } from "@/contracts/englishListeningHttp.contract";
import type { ListeningPrintDocument, ListeningPrintView } from "./print";

/** Only this projection enters student print HTML or hydration data. */
export function listeningDraftPrintDocument(
  document: ListeningDraft,
  view: ListeningPrintView,
): ListeningPrintDocument {
  let number = 0;
  return {
    title: document.title,
    view,
    publicationId: document.id,
    groups: document.groups.map((group) => ({
      id: group.id,
      questions: group.questions.map((question) => ({
        id: question.id,
        number: ++number,
        prompt: question.prompt,
        choices: question.choices.map((choice) => choice.text),
        ...(question.sourceNumber
          ? { sourceNumber: question.sourceNumber }
          : {}),
        ...("image" in question ? { image: question.image } : {}),
        ...(view === "teacher"
          ? {
              ...(question.answerChoiceId &&
              question.choices.some(
                (choice) => choice.id === question.answerChoiceId,
              )
                ? {
                    answer:
                      question.choices.findIndex(
                        (choice) => choice.id === question.answerChoiceId,
                      ) + 1,
                  }
                : {}),
              explanation: question.explanation,
            }
          : {}),
      })),
      ...(view === "teacher"
        ? {
            transcript: group.transcript.text,
            translation: group.transcript.translation,
          }
        : {}),
    })),
  };
}
