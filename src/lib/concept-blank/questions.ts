import type {
  ConceptBlankForm,
  ConceptEntry,
} from "@/contracts/conceptBlank.contract";

export const QUESTION_REVISION = "student-clear-20261006-v1";

/** New authoring accepts a reviewed bank revision; frozen older books bypass this loader. */
export function reviewedQuestionMode(
  entries: readonly ConceptEntry[],
): boolean {
  const revised = entries.some(
    (entry) =>
      entry.questionRevision !== undefined ||
      entry.bQuestion !== undefined ||
      entry.clozeQuestion !== undefined,
  );
  if (!revised) return false;
  for (const entry of entries)
    if (
      entry.questionRevision !== QUESTION_REVISION ||
      entry.bQuestion === undefined ||
      entry.clozeQuestion === undefined
    )
      throw new RangeError(
        `질문 판 또는 형식 결정이 일치하지 않습니다: ${entry.id}`,
      );
  return true;
}

/** 옛 동결 payload는 보충하지 않는다. undefined인 옛 필드와 검토 후 제외한 null을 구별한다. */
export function conceptSupportsForm(
  entry: ConceptEntry,
  form: ConceptBlankForm,
): boolean {
  if (form === "term") return entry.bQuestion !== null;
  if (form === "cloze") return entry.clozeQuestion !== null;
  if (form === "map") return entry.bQuestion !== null;
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

export const MAP_NODES_PER_PAGE = 6;
export const QUESTION_MAP_NODES_PER_PAGE = 2;
export function mapQuestionMode(entries: readonly ConceptEntry[]): boolean {
  if (entries.some((entry) => entry.bQuestion === null))
    throw new RangeError("개념 지도에서 제외한 항목이 포함돼 있습니다.");
  const questions = entries.filter((entry) => entry.bQuestion).length;
  if (questions > 0 && questions !== entries.length)
    throw new RangeError(
      "새 질문 지도와 옛 뜻·예 지도를 한 묶음으로 섞을 수 없습니다.",
    );
  return questions > 0;
}
