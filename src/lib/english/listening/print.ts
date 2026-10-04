import type { EnglishListeningPublication } from "@/contracts/englishListening.contract";

export type ListeningPrintView = "student" | "teacher";
export interface ListeningPrintDocument {
  title: string;
  view: ListeningPrintView;
  publicationId: string;
  groups: {
    id: string;
    questions: {
      id: string;
      number: number;
      prompt: string;
      choices: string[];
      image?: { dataUrl: string; width: number; height: number };
      sourceNumber?: number;
      answer?: number;
      explanation?: string;
    }[];
    transcript?: string;
    translation?: string | null;
  }[];
}

/** Build on the server. Student HTML and hydration props contain no hidden answer material. */
export function listeningPrintDocument(
  publication: EnglishListeningPublication,
  view: ListeningPrintView,
): ListeningPrintDocument {
  let number = 0;
  return {
    title: publication.document.title,
    view,
    publicationId: publication.id,
    groups: publication.document.groups.map((group) => ({
      id: group.id,
      questions: group.questions.map((question) => ({
        id: question.id,
        number: ++number,
        prompt: question.prompt,
        choices: question.choices.map((choice) => choice.text),
        ...(question.image ? { image: { ...question.image } } : {}),
        ...(question.sourceNumber
          ? { sourceNumber: question.sourceNumber }
          : {}),
        ...(view === "teacher"
          ? {
              answer:
                question.choices.findIndex(
                  (choice) => choice.id === question.answerChoiceId,
                ) + 1,
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
