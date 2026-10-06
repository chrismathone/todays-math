import {
  conceptEntrySchema,
  type ConceptBlankBank,
  type ConceptEntry,
} from "@/contracts/conceptBlank.contract";

import { QUESTION_REVISION } from "../questions";
export { QUESTION_REVISION };
export type ConceptAssessment = Pick<
  ConceptEntry,
  "bQuestion" | "clozeQuestion" | "questionExclusions"
> & {
  bQuestion: NonNullable<ConceptEntry["bQuestion"]> | null;
  clozeQuestion: NonNullable<ConceptEntry["clozeQuestion"]> | null;
};
export type AssessmentTable = Readonly<Record<string, ConceptAssessment>>;

/** 모든 ID 검토를 마친 현재 은행에만 붙인다. 옛 동결 payload를 이 함수에 통과시키지 않는다. */
export function withAssessments(
  bank: ConceptBlankBank,
  table: AssessmentTable,
): ConceptBlankBank {
  return {
    ...bank,
    concepts: bank.concepts.map((entry) => {
      const assessment = table[entry.id];
      if (
        !assessment ||
        assessment.bQuestion === undefined ||
        assessment.clozeQuestion === undefined
      )
        throw new Error(`검토한 개념 질문이 없습니다: ${entry.id}`);
      if (
        (assessment.bQuestion === null &&
          !assessment.questionExclusions?.term) ||
        (assessment.clozeQuestion === null &&
          !assessment.questionExclusions?.cloze)
      )
        throw new Error(`형식별 제외 사유가 없습니다: ${entry.id}`);
      return conceptEntrySchema.parse({
        ...entry,
        ...assessment,
        questionRevision: QUESTION_REVISION,
      });
    }),
  };
}
