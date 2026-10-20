import {
  blankKeywords,
  CONCEPT_BLANK_FORMS,
  type ConceptBlankBank,
  type ConceptBlankSelection,
} from "@/contracts/conceptBlank.contract";
import { composeSheets } from "@/lib/concept-blank/compose";
import { FIXTURE_BANK } from "@/lib/concept-blank/fixture";

/** 인쇄 회귀 전용. 옛 동결 자료와 새 질문을 같은 다섯 형식으로 비교한다. */
export const writingAreaBanks: Record<
  "legacy" | "questions",
  ConceptBlankBank
> = {
  legacy: FIXTURE_BANK,
  questions: {
    ...FIXTURE_BANK,
    concepts: FIXTURE_BANK.concepts.map((entry) => ({
      ...entry,
      questionRevision: "writing-area-regression",
      bQuestion: {
        prompt: `${entry.term}의 뜻과 성질을 설명하세요.`,
        answer: entry.definition.replace(/[{}]/g, ""),
        requiredIdeas: blankKeywords(entry.definition).map((idea) => ({
          anyOf: [idea],
        })),
      },
      clozeQuestion: {
        sentence: entry.definition,
        acceptedAnswers: blankKeywords(entry.definition).map((idea) => [idea]),
      },
    })),
  },
};

export const writingAreaSelection: ConceptBlankSelection = {
  sections: [...new Set(FIXTURE_BANK.concepts.map((entry) => entry.section))],
  forms: CONCEPT_BLANK_FORMS.map((form) => ({
    form,
    counts: { 하: 40, 중: 40, 상: 40 },
    extras: { 하: 40, 중: 40, 상: 40 },
  })),
  date: "2026-10-20",
};

export function writingAreaSheets(mode: keyof typeof writingAreaBanks) {
  return composeSheets(writingAreaSelection, writingAreaBanks[mode]);
}
