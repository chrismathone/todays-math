import { randomUUID } from "node:crypto";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import type { ManuscriptBlock } from "@/contracts/textbookExchange.contract";
import type { TextbookActivity } from "@/contracts/textbookSemantic.contract";
import { reviewedQuestionMode } from "@/lib/concept-blank/questions";

/** New manuscripts freeze the reviewed question and its key together. Old blocks are untouched. */
export function conceptQuestionBlocks(input: {
  entries: readonly ConceptEntry[];
  conceptKey: string;
  activity: Extract<
    TextbookActivity,
    | "termRecall"
    | "sentenceRecall"
    | "explainActivity"
    | "conceptMap"
    | "preparation"
  >;
  title: string;
}): ManuscriptBlock[] {
  if (!reviewedQuestionMode(input.entries))
    throw new Error("새 질문 활동에는 검토된 질문 판이 필요합니다.");
  const questions = input.entries.flatMap((entry) =>
    entry.bQuestion
      ? [
          {
            entryId: entry.id,
            question: {
              prompt: entry.bQuestion.prompt,
              answer: entry.bQuestion.answer,
              requiredIdeas: entry.bQuestion.requiredIdeas.map((idea) => ({
                anyOf: [...idea.anyOf],
              })),
            },
          },
        ]
      : [],
  );
  if (!questions.length)
    throw new Error(
      `${input.title}: 출제 가능한 개념 질문이 없습니다. 다른 활동이나 단원을 선택하세요.`,
    );
  const blocks: ManuscriptBlock[] = [];
  for (let offset = 0; offset < questions.length; offset += 2) {
    const part = questions.slice(offset, offset + 2);
    blocks.push({
      blockId: randomUUID(),
      kind: "concept-recall",
      phase: "sentences",
      markdown: part.map(({ question }) => question.prompt).join("\n\n"),
      showRepetitionChecks: false,
      conceptKey: input.conceptKey,
      semantic: {
        activity: input.activity,
        title: input.title,
        continuation: offset > 0,
        node: { kind: "conceptQuestions", version: 1, questions: part },
      },
    });
  }
  return blocks;
}
