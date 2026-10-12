import type { ProblemSourceReference } from "@/contracts/problemSourceReference.contract";

export type SourceReferenceInput = {
  source?: string;
  sourceReference?: ProblemSourceReference | null;
};

const text = (value: string | null | undefined) => value?.trim() || "";
const positiveInteger = (value: number | null | undefined) =>
  value != null && Number.isInteger(value) && value > 0 ? value : null;
const numberLabel = (value: number | null | undefined) => {
  const number = positiveInteger(value);
  return number === null ? "" : `${number}번`;
};

/** Supplied source metadata only: a problem code is never decoded into an exam date. */
function referenceDetail(reference: ProblemSourceReference): string {
  const { exam, material } = reference;
  if (exam) {
    const year = positiveInteger(exam.year);
    const semester = positiveInteger(exam.semester);
    return [
      text(exam.school) || text(reference.school),
      year === null ? "" : `${year}년`,
      semester === null ? "" : `${semester}학기`,
      text(exam.round),
      numberLabel(exam.number ?? reference.questionNumber),
    ]
      .filter(Boolean)
      .join(" ");
  }
  if (material) {
    const publisher = text(material.publisher);
    const author = text(material.author);
    const book = [
      publisher && author ? `${publisher}(${author})` : publisher || author,
      text(material.title),
    ]
      .filter(Boolean)
      .join(" ");
    return [
      ...new Set(
        [
          book,
          text(material.curriculum),
          text(material.kind),
          text(material.materialTitle),
          text(material.unitRaw),
          numberLabel(reference.questionNumber),
        ].filter(Boolean),
      ),
    ].join(" · ");
  }
  // Keep the recorded code visible when the original exam/material cannot be resolved.
  return [
    text(reference.problemCode),
    text(reference.school),
    text(reference.subject),
    numberLabel(reference.questionNumber),
  ]
    .filter(Boolean)
    .join(" · ");
}

/** A reference supplements the origin badge; it never changes how this question was made. */
export function sourceReferenceLabel(
  problem: SourceReferenceInput,
): string | null {
  const reference = problem.sourceReference;
  if (!reference) return null;

  const kind =
    reference.exam || reference.source === "past_exam"
      ? "기출"
      : reference.source === "school_textbook"
        ? "교과서"
        : reference.source === "transformed"
          ? "문제집"
          : "원문";
  const detail = referenceDetail(reference) || text(reference.problemCode);
  if (!detail) return null;

  return problem.source === "transformed"
    ? `${kind} 변형 · ${detail} 기반`
    : `${kind} 기반 · ${detail}`;
}
