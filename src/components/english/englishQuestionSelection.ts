import type { EnglishSet } from "@/contracts/english.contract";
import type { EnglishBankQuestion } from "@/contracts/englishQuestionBank.contract";

export const ENGLISH_SELECTION_MAX = 80;

/** A newer version replaces its old selection in place; one source question appears once. */
export function addBankQuestions(
  current: EnglishBankQuestion[],
  incoming: EnglishBankQuestion[],
) {
  const next = [...current];
  for (const item of incoming) {
    const at = next.findIndex(
      (old) =>
        old.setId === item.setId && old.questionIndex === item.questionIndex,
    );
    if (at >= 0) next[at] = item;
    else if (next.length < ENGLISH_SELECTION_MAX) next.push(item);
  }
  return next;
}

export function groupBankQuestions(items: readonly EnglishBankQuestion[]) {
  const groups = new Map<
    string,
    {
      set: EnglishSet;
      numbers: number[];
      exam: {
        school: string;
        grade: EnglishBankQuestion["grade"];
        title: string;
      };
    }
  >();
  items.forEach((item, index) => {
    const key = `${item.setId}:${item.revision}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        set: {
          id: item.setId,
          examId: item.examId,
          title: item.title,
          status: item.status,
          source: item.source,
          revision: item.revision,
          passage: item.passage,
          questions: [],
          questionCount: 0,
          types: [],
          createdAt: item.updatedAt,
          updatedAt: item.updatedAt,
        },
        exam: { school: item.school, grade: item.grade, title: item.examTitle },
        numbers: [],
      };
      groups.set(key, group);
    }
    group.set.questions.push(item.question);
    group.set.questionCount++;
    if (!group.set.types.includes(item.question.type))
      group.set.types.push(item.question.type);
    group.numbers.push(index + 1);
  });
  return [...groups.values()];
}
