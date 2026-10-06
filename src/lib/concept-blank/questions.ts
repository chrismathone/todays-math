import type {
  ConceptBlankForm,
  ConceptEntry,
} from "@/contracts/conceptBlank.contract";

/** 옛 동결 payload는 보충하지 않는다. undefined인 옛 필드와 검토 후 제외한 null을 구별한다. */
export function conceptSupportsForm(
  entry: ConceptEntry,
  form: ConceptBlankForm,
): boolean {
  if (form === "term") return entry.bQuestion !== null;
  if (form === "cloze") return entry.clozeQuestion !== null;
  if (form === "recall") return !entry.givenCase;
  return form !== "figure";
}

export function termPrompt(entry: ConceptEntry): string {
  if (entry.bQuestion === null)
    throw new RangeError(`개념 질문에서 제외한 항목: ${entry.id}`);
  return entry.bQuestion?.prompt ?? entry.term;
}

export function termAnswer(entry: ConceptEntry): string {
  if (entry.bQuestion === null)
    throw new RangeError(`개념 질문에서 제외한 항목: ${entry.id}`);
  return entry.bQuestion?.answer ?? entry.definition;
}

export function clozeSentence(entry: ConceptEntry): string {
  if (entry.clozeQuestion === null)
    throw new RangeError(`빈칸 문항에서 제외한 항목: ${entry.id}`);
  return entry.clozeQuestion?.sentence ?? entry.definition;
}

/** 교사가 확인하는 의미 기준. 각 줄은 필수 내용이고 한 줄 안의 표현은 대안이다. */
export function termCriteria(entry: ConceptEntry): string[] {
  return (
    entry.bQuestion?.requiredIdeas.map((idea) => idea.anyOf.join(" / ")) ?? []
  );
}

export function clozeAlternatives(entry: ConceptEntry): string[] {
  return (
    entry.clozeQuestion?.acceptedAnswers.flatMap((answers, index) =>
      answers.length > 1 ? [`빈칸 ${index + 1}: ${answers.join(" / ")}`] : [],
    ) ?? []
  );
}
