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

/** Selected phases use identical source rows and identical eight-row partitions. */
export function memoryActivityBlocks(input: {
  entries: readonly ConceptEntry[];
  conceptKey: string;
  components: QuickCreateComponents;
}): ManuscriptBlock[] {
  const rows = conceptMemoryRows(input.entries);
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
            title: option.title,
            continuation: offset > 0,
            node: {
              kind: "rows",
              groupKey: `${input.conceptKey}.memory-${offset / 8}`,
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
    blocks.push(
      writingActivity(
        "dialogueCheck",
        "대화 읽기 확인",
        [
          "수업을 떠올리며 물음에 답하고, 그렇게 생각한 이유를 쓰세요.",
          ...questions,
        ],
        4,
      ),
    );
  }
  if (components.conceptBlankTest)
    blocks.push(
      writingActivity(
        "conceptBlankTest",
        "자유 개념 백지",
        [
          "책을 덮고 기억나는 개념을 정리하세요. 뜻, 조건, 예를 자신의 말과 그림으로 표현하세요.",
        ],
        16,
      ),
    );
  if (components.explainActivity)
    blocks.push(
      writingActivity(
        "explainActivity",
        "설명 활동",
        [
          "짝에게 설명한 뒤 서로 질문하세요. 설명에서 빠진 조건을 찾아 고쳐 쓰세요.",
          ...entries.map(
            (entry) =>
              `${entry.term}의 뜻과 사용할 때의 조건을 예와 함께 설명하세요.`,
          ),
        ],
        3,
      ),
    );
  if (components.conceptMap)
    blocks.push(
      writingActivity(
        "conceptMap",
        "개념 지도",
        [
          "아래 개념을 써 놓고, 직접 설명할 수 있는 관계를 선과 문장으로 연결하세요.",
          entries.map((entry) => entry.term).join(" · "),
        ],
        15,
      ),
    );
  return blocks;
}

export const ACTIVITY_LABELS: Record<TextbookActivity, string> = {
  cover: "표지",
  unitIntro: "단원 도입",
  dialogue: "개념 대화",
  concepts: "개념 이해",
  termRecall: "용어 암기",
  clozeRecall: "핵심어 빈칸",
  sentenceRecall: "통문장 개념 암기",
  practice: "유형 연습",
  workedExamples: "대표예제와 확인",
  review: "누적 복습",
  assessment: "단원 평가",
  written: "서술형",
  rest: "쉬어가기",
  learningGuide: "학습 안내",
  learningPlan: "학습 계획",
  questionLog: "질문 기록",
  preparation: "준비 학습",
  errorCheck: "오류 점검",
  tableOfContents: "목차",
  dialogueCheck: "대화 읽기 확인",
  conceptStudy: "개념 학습",
  conceptBlankTest: "자유 개념 백지",
  basicCheck: "개념 기초 확인",
  explainActivity: "설명 활동",
  conceptMap: "개념 지도",
  reasoning: "추론 활동",
  conceptIndex: "개념 색인",
  typeIndex: "유형 색인",
};
export function selectedLearningGuide(
  components: QuickCreateComponents,
): ManuscriptBlock[] {
  const instructions: Partial<Record<TextbookActivity, string>> = {
    unitIntro: "단원 질문과 목표를 읽고 궁금한 점을 기록하세요.",
    dialogue: "선생님과 학생의 대화를 읽고 판서의 뜻을 설명하세요.",
    concepts: "개념의 뜻·조건·예를 함께 확인하세요.",
    dialogueCheck: "대화를 떠올리며 핵심 물음에 답하세요.",
    conceptStudy: "개념표를 읽고 1~4회 반복한 것을 표시하세요.",
    termRecall: "뜻을 보고 용어를 떠올리세요.",
    clozeRecall: "같은 개념표의 핵심어 빈칸을 채우세요.",
    sentenceRecall: "용어를 보고 개념 문장을 쓰세요.",
    conceptBlankTest: "책을 덮고 기억한 개념을 스스로 정리하세요.",
    basicCheck: "짧은 문제로 개념을 바로 적용해 보세요.",
    workedExamples: "예제 풀이를 읽은 뒤 확인 문제를 스스로 푸세요.",
    practice: "유형별 문제를 풀고 사용한 방법을 설명하세요.",
    written: "생각한 순서와 계산 근거를 함께 쓰세요.",
    explainActivity: "짝에게 설명하고 질문에 답하세요.",
    conceptMap: "개념 사이의 관계를 자신의 말로 연결하세요.",
    reasoning: "판단의 근거를 쓰고 다른 방법과 비교하세요.",
    errorCheck: "문장의 옳고 그름과 이유를 설명하세요.",
    review: "앞에서 배운 내용을 다시 꺼내 풀어 보세요.",
    assessment: "도움 없이 풀고 다시 공부할 부분을 찾으세요.",
    rest: "이야기를 읽고 함께 생각할 질문을 나누세요.",
    preparation: "오늘 배울 개념에 대해 이미 아는 것을 적으세요.",
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
            `${index + 1}. **${ACTIVITY_LABELS[key as TextbookActivity]}** · ${value}`,
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
