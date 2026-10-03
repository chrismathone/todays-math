import type { z } from "zod";
import type {
  ListeningDraft,
  listeningUpdateSetSchema,
} from "@/contracts/englishListeningHttp.contract";

export type ListeningEdit = Omit<
  z.infer<typeof listeningUpdateSetSchema>,
  "expectedRevision"
>;
export type ListeningEditGroup = ListeningEdit["groups"][number];
export type ListeningEditQuestion = ListeningEditGroup["questions"][number];

export function emptyListeningEdit(): ListeningEdit {
  return {
    title: "",
    level: null,
    examId: null,
    basis: "",
    rights: { rightsStatus: "unknown", allowedUses: [] },
    groups: [],
  };
}

export function editListeningDraft(document: ListeningDraft): ListeningEdit {
  return {
    title: document.title,
    level: document.level,
    examId: document.examId,
    basis: document.provenance.basis,
    rights: document.rights,
    groups: document.groups.map((group) => ({
      id: group.id,
      audio: group.audio,
      transcript: { ...group.transcript },
      questions: group.questions.map((question) => ({
        ...question,
        choices: question.choices.map((choice) => ({ ...choice })),
        evidence: question.evidence.map((range) => ({ ...range })),
      })),
    })),
  };
}

export function newListeningQuestion(): ListeningEditQuestion {
  return {
    id: crypto.randomUUID(),
    prompt: "",
    explanation: "",
    answerChoiceId: null,
    choices: [0, 1].map(() => ({ id: crypto.randomUUID(), text: "" })),
    evidence: [],
  };
}

export function newListeningGroup(): ListeningEditGroup {
  return {
    id: crypto.randomUUID(),
    audio: null,
    transcript: { revision: 1, text: "", spokenText: "", translation: null },
    questions: [newListeningQuestion()],
  };
}
