import { randomUUID } from "node:crypto";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import type { ManuscriptBlock } from "@/contracts/textbookExchange.contract";
import type { QuickCreateComponents } from "@/contracts/textbookQuickCreate.contract";
import type {
  TextbookActivity,
  TextbookSemantic,
} from "@/contracts/textbookSemantic.contract";
import { conceptMemoryRows, memoryRowMarkdown } from "../conceptRows";
import { conceptScriptFor } from "../conceptScripts";
import { ACTIVITY_LABELS } from "../activities";
import { conceptQuestionBlocks } from "../conceptQuestions";
import { reviewedQuestionMode } from "@/lib/concept-blank/questions";

export function activityText(
  activity: TextbookActivity,
  title: string,
  markdown: string,
  node?: TextbookSemantic["node"],
): ManuscriptBlock {
  return {
    blockId: randomUUID(),
    kind: "text",
    markdown,
    semantic: { activity, title, ...(node ? { node } : {}) },
  };
}
export function writingActivity(
  activity: TextbookActivity,
  title: string,
  prompts: string[],
  lines: number,
): ManuscriptBlock {
  return activityText(activity, title, prompts.join("\n\n"), {
    kind: "writing",
    prompts,
    lines,
  });
}

/** Legacy phases share definition rows; new questions have their own frozen rows and groups. */
export function memoryActivityBlocks(input: {
  entries: readonly ConceptEntry[];
  questionEntries?: readonly ConceptEntry[];
  conceptKey: string;
  components: QuickCreateComponents;
}): ManuscriptBlock[] {
  const phases = [
    {
      enabled: input.components.conceptStudy,
      activity: "conceptStudy",
      title: "개념 학습",
      phase: "study",
    },
    {
      enabled: input.components.clozeRecall,
      activity: "clozeRecall",
      title: "핵심어 빈칸",
      phase: "keywords",
    },
    {
      enabled: input.components.sentenceRecall,
      activity: "sentenceRecall",
      title: "통문장 개념 암기",
      phase: "sentences",
    },
  ] as const;
  return phases
    .filter((option) => option.enabled)
    .flatMap((option) => {
      if (option.phase === "sentences" && reviewedQuestionMode(input.entries))
        return conceptQuestionBlocks({
          entries: input.questionEntries ?? input.entries,
          conceptKey: input.conceptKey,
          activity: "sentenceRecall",
          title: "책 없이 답 쓰기",
        });
      const rows = conceptMemoryRows(
        option.phase === "keywords"
          ? (input.questionEntries ?? input.entries)
          : input.entries,
        option.phase,
      );
      const questionMode = reviewedQuestionMode(input.entries);
      if (option.phase === "keywords" && questionMode && !rows.length)
        throw new Error(
          "빈칸 문항: 출제 가능한 문항이 없습니다. 다른 활동이나 단원을 선택하세요.",
        );
      const blocks: ManuscriptBlock[] = [];
      for (let offset = 0; offset < rows.length; offset += 8) {
        const part = rows.slice(offset, offset + 8);
        blocks.push({
          blockId: randomUUID(),
          kind: "concept-recall",
          conceptKey: input.conceptKey,
          phase: option.phase,
          markdown: part
            .map((row) => memoryRowMarkdown(row, option.phase))
            .join("\n\n"),
          showRepetitionChecks: option.phase === "study",
          semantic: {
            activity: option.activity,
            title:
              option.phase === "keywords" && questionMode
                ? "빈칸 문항"
                : option.title,
            ...(option.phase === "keywords" && questionMode
              ? { subtitle: "문장을 읽고 빈칸에 알맞은 내용을 쓰세요." }
              : {}),
            continuation: offset > 0,
            node: {
              kind: "rows",
              groupKey:
                option.phase === "keywords" && questionMode
                  ? `${input.conceptKey}.question-cloze.v1.${offset / 8}`
                  : `${input.conceptKey}.memory-${offset / 8}`,
              rows: part,
            },
          },
        });
      }
      return blocks;
    });
}

export function additionalConceptActivities(input: {
  entries: readonly ConceptEntry[];
  questionEntries?: readonly ConceptEntry[];
  sectionKey: string;
  conceptKey: string;
  components: QuickCreateComponents;
}): ManuscriptBlock[] {
  const { entries, components } = input;
  const blocks: ManuscriptBlock[] = [];
  if (components.dialogueCheck) {
    const script = conceptScriptFor(input.sectionKey);
    const questions =
      script?.dialogue
        .filter((turn) => turn.purpose === "check-question")
        .map((turn) => turn.markdown) ?? [];
    if (!questions.length)
      throw new Error(`대화 읽기 확인 원고가 없습니다: ${input.sectionKey}`);
    for (let offset = 0; offset < questions.length; offset += 3)
      blocks.push(
        writingActivity(
          "dialogueCheck",
          "대화 읽기 확인",
          [
            "수업을 떠올리며 물음에 답하고, 그렇게 생각한 이유를 쓰세요.",
            ...questions.slice(offset, offset + 3),
          ],
          4,
        ),
      );
  }
  // Versioned rows opt NEW bank activities into native scaffolds. Saved writing
  // nodes and source fragments retain their original render paths and bytes.
  const rows = conceptMemoryRows(entries);
  const scaffolds = [
    {
      activity: "conceptBlankTest",
      title: "자유 개념 백지",
      size: 4,
      instruction:
        "책을 보지 않고 기억나는 개념을 정리하세요. 각 정의에 알맞은 예를 쓰세요.",
    },
    {
      activity: "explainActivity",
      title: "설명 활동",
      size: 2,
      instruction: "예를 들어 설명한 뒤, 친구의 질문에 답하세요.",
    },
    {
      activity: "conceptMap",
      title: "개념 지도",
      size: 4,
      instruction:
        "각 개념의 정의와 예를 쓰고, 직접 설명할 수 있는 관계를 정리하세요.",
    },
  ] as const;
  for (const scaffold of scaffolds) {
    if (!components[scaffold.activity]) continue;
    if (
      scaffold.activity !== "conceptBlankTest" &&
      reviewedQuestionMode(entries)
    ) {
      blocks.push(
        ...conceptQuestionBlocks({
          entries: input.questionEntries ?? entries,
          conceptKey: input.conceptKey,
          activity: scaffold.activity,
          title:
            scaffold.activity === "conceptMap"
              ? "단원 개념 확인 모음"
              : scaffold.title,
        }),
      );
      continue;
    }
    for (let offset = 0; offset < rows.length; offset += scaffold.size) {
      const block = activityText(
        scaffold.activity,
        scaffold.title,
        scaffold.instruction,
        {
          kind: "rows",
          groupKey: `bank-activity.v1.${scaffold.activity}.${offset / scaffold.size}`,
          rows: rows.slice(offset, offset + scaffold.size),
        },
      );
      block.semantic!.continuation = offset > 0;
      blocks.push(block);
    }
  }
  return blocks;
}

export { ACTIVITY_LABELS } from "../activities";
export function selectedLearningGuide(
  components: QuickCreateComponents,
  questionMode = false,
): ManuscriptBlock[] {
  const instructions: Partial<Record<TextbookActivity, string>> = {
    unitIntro: "단원 질문과 목표를 읽고 궁금한 점을 기록하세요.",
    dialogue: "선생님과 학생의 대화를 읽고 판서의 뜻을 설명하세요.",
    concepts: "개념의 뜻·조건·예를 함께 확인하세요.",
    dialogueCheck: "대화를 떠올리며 핵심 물음에 답하세요.",
    conceptStudy: "개념표를 읽고 1~4회 반복한 것을 표시하세요.",
    termRecall: questionMode
      ? "물음을 읽고 요구한 내용에 답하세요."
      : "뜻을 보고 용어를 떠올리세요.",
    clozeRecall: questionMode
      ? "문장을 읽고 빈칸에 알맞은 내용을 쓰세요."
      : "같은 개념표의 핵심어 빈칸을 채우세요.",
    sentenceRecall: questionMode
      ? "같은 물음을 앞에서 풀었다면 책 없이 다시 답해 보세요."
      : "용어를 보고 개념 문장을 쓰세요.",
    conceptBlankTest: "책을 덮고 기억한 개념을 스스로 정리하세요.",
    basicCheck: "짧은 문제로 개념을 바로 적용해 보세요.",
    workedExamples: "예제 풀이를 읽은 뒤 확인 문제를 스스로 푸세요.",
    practice: "유형별 문제를 풀고 사용한 방법을 설명하세요.",
    written: "생각한 순서와 계산 근거를 함께 쓰세요.",
    explainActivity: questionMode
      ? "앞에서 풀었던 물음이라면 다시 답한 뒤 친구와 답을 비교해 보세요."
      : "짝에게 설명하고 질문에 답하세요.",
    conceptMap: questionMode
      ? "같은 단원의 물음을 묶었습니다. 다른 활동에서 풀었다면 다시 답을 써서 확인하세요."
      : "개념 사이의 관계를 자신의 말로 연결하세요.",
    reasoning: "판단의 근거를 쓰고 다른 방법과 비교하세요.",
    errorCheck: "문장의 옳고 그름과 이유를 설명하세요.",
    review: "앞에서 배운 내용을 다시 꺼내 풀어 보세요.",
    assessment: "도움 없이 풀고 다시 공부할 부분을 찾으세요.",
    rest: "이야기를 읽고 함께 생각할 질문을 나누세요.",
    preparation: questionMode
      ? "지금 알고 있는 내용으로 답해 보세요. 아직 배우지 않았다면 ‘아직 모르겠어요’라고 적어도 됩니다."
      : "오늘 배울 개념에 대해 이미 아는 것을 적으세요.",
    learningPlan: "학습할 날과 공부한 날을 기록하세요.",
    questionLog: "막힌 부분과 시도한 방법을 질문으로 남기세요.",
  };
  return [
    activityText(
      "learningGuide",
      "학습 안내",
      Object.entries(instructions)
        .filter(([key]) => components[key as TextbookActivity])
        .map(
          ([key, value], index) =>
            `${index + 1}. **${questionMode ? (({ termRecall: "개념 질문", clozeRecall: "빈칸 문항", sentenceRecall: "책 없이 답 쓰기", conceptMap: "단원 개념 확인 모음" } as Partial<Record<TextbookActivity, string>>)[key as TextbookActivity] ?? ACTIVITY_LABELS[key as TextbookActivity]) : ACTIVITY_LABELS[key as TextbookActivity]}** · ${value}`,
        )
        .join("\n\n") || "선택한 활동을 진행하고 궁금한 점을 기록하세요.",
    ),
  ];
}

export function referenceActivityBlocks(
  activity: "tableOfContents" | "conceptIndex" | "typeIndex",
  entries: Extract<
    NonNullable<TextbookSemantic["node"]>,
    { kind: "references" }
  >["entries"],
): ManuscriptBlock[] {
  const blocks: ManuscriptBlock[] = [];
  for (let offset = 0; offset < entries.length; offset += 18)
    blocks.push(
      activityText(
        activity,
        ACTIVITY_LABELS[activity],
        ACTIVITY_LABELS[activity],
        { kind: "references", entries: entries.slice(offset, offset + 18) },
      ),
    );
  return blocks;
}
