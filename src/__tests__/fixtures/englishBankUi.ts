import type { EnglishBankQuestion } from "@/contracts/englishQuestionBank.contract";
import { SAMPLE_SET, SAMPLE_EXAM } from "./englishPrintSet";

export function bankUiItem(
  index = 0,
  overrides: Partial<EnglishBankQuestion> = {},
): EnglishBankQuestion {
  const item: EnglishBankQuestion = {
    setId: SAMPLE_SET.id,
    revision: SAMPLE_SET.revision,
    questionIndex: index,
    key: "",
    examId: SAMPLE_SET.examId,
    school: SAMPLE_EXAM.school,
    grade: SAMPLE_EXAM.grade,
    examTitle: SAMPLE_EXAM.title,
    title: SAMPLE_SET.title,
    status: SAMPLE_SET.status,
    source: SAMPLE_SET.source,
    passage: SAMPLE_SET.passage,
    question: SAMPLE_SET.questions[index]!,
    difficulty: null,
    updatedAt: SAMPLE_SET.updatedAt,
    ...overrides,
  };
  item.key = `${item.setId}:${item.revision}:${item.questionIndex}`;
  return item;
}
