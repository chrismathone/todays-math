import type {
  RenderBlock,
  RenderSection,
  TextbookEditorialStage,
} from "./model";
import { ACTIVITY_LABELS } from "../activities";
import type { TextbookActivity } from "@/contracts/textbookSemantic.contract";

const ACTIVITY_STAGE: Record<TextbookActivity, TextbookEditorialStage> = {
  cover: "guide",
  unitIntro: "unit",
  dialogue: "opening",
  concepts: "concept",
  termRecall: "recall",
  conceptStudy: "recall",
  clozeRecall: "recall",
  sentenceRecall: "recall",
  practice: "practice",
  workedExamples: "practice",
  review: "review",
  assessment: "application",
  written: "application",
  rest: "rest",
  learningGuide: "guide",
  learningPlan: "guide",
  questionLog: "guide",
  preparation: "basic",
  errorCheck: "application",
  tableOfContents: "guide",
  dialogueCheck: "basic",
  conceptBlankTest: "recall",
  basicCheck: "basic",
  explainActivity: "application",
  conceptMap: "recall",
  reasoning: "application",
  conceptIndex: "guide",
  typeIndex: "guide",
};
const MEMORY_COPY = {
  conceptStudy: ["개념학습", "정의와 성질을 읽고 예를 들어 설명하시오."],
  clozeRecall: ["빈칸개념암기", "빈칸에 알맞은 용어와 식을 쓰시오."],
  sentenceRecall: [
    "통문장개념암기",
    "책을 보지 않고 각 항목을 문장으로 쓰시오.",
  ],
} as const;

function semanticProjection(
  section: RenderSection,
  enabledActivities?: readonly TextbookActivity[],
): RenderSection {
  const source = section.blocks.filter(
    (block) => block.sourceBlockId !== "section-heading",
  );
  const steps = [
    ...new Set(
      source.flatMap((block) =>
        block.semantic ? [block.semantic.activity] : [],
      ),
    ),
  ].map((activity) => ({ activity, label: ACTIVITY_LABELS[activity] }));
  const enabled = enabledActivities ?? steps.map((step) => step.activity);
  const phases = enabled
    .filter((activity) => Object.hasOwn(MEMORY_COPY, activity))
    .map((activity) => ({
      activity,
      label: MEMORY_COPY[activity as keyof typeof MEMORY_COPY][0],
    }));
  const majorSteps = (
    [
      ["concept", "개념 이해"],
      ["recall", "개념 정리"],
      ["basic", "기본 확인"],
      ["practice", "유형 연습"],
      ["application", "설명·적용"],
      ["review", "다시 꺼내기"],
    ] as const
  )
    .filter(([stage]) =>
      enabled.some((activity) => ACTIVITY_STAGE[activity] === stage),
    )
    .map(([activity, label]) => ({ activity, label }));
  const blocks: RenderBlock[] = [];
  let current: TextbookActivity | undefined;
  let lessonTitle = "";
  for (const block of source) {
    const semantic = block.semantic;
    const activity = semantic?.activity ?? current;
    const stage = activity ? ACTIVITY_STAGE[activity] : "guide";
    if (activity && activity !== current) {
      const memory = Object.hasOwn(MEMORY_COPY, activity)
        ? MEMORY_COPY[activity as keyof typeof MEMORY_COPY]
        : undefined;
      const skip =
        section.templateKey.startsWith("reference-unitSpread") ||
        section.templateKey === "auto-unit-intro";
      if (!skip)
        blocks.push({
          id: `${block.id}.activity-heading`,
          sourceBlockId: block.sourceBlockId,
          unitKey: section.unitKey,
          sectionKey: section.sectionKey,
          kind: "heading",
          editorialStage: stage,
          semantic: { ...semantic!, node: undefined },
          title:
            activity === "dialogue"
              ? "단원을 여는 수업"
              : (memory?.[0] ??
                (section.templateKey.startsWith("reference-")
                  ? section.title
                  : ACTIVITY_LABELS[activity])),
          subtitle:
            activity === "dialogue" && block.kind === "dialogue"
              ? (block.presentation?.lessonTitle ?? section.title)
              : (memory?.[1] ?? section.title),
          stageNumber: String(
            steps.findIndex((step) => step.activity === activity) + 1,
          ).padStart(2, "0"),
          progressSteps:
            activity === "dialogue" || stage === "guide"
              ? []
              : memory
                ? phases
                : majorSteps,
          unitNumber: section.blocks.find((candidate) => candidate.unitNumber)
            ?.unitNumber,
          startNewPage: blocks.length > 0,
        });
      if (
        activity === "dialogue" &&
        (semantic?.source?.scriptIndex === 1 || !semantic?.source)
      )
        blocks.push({
          id: `${block.id}.dialogue-guide`,
          sourceBlockId: block.sourceBlockId,
          kind: "text",
          markdown: "",
          unitKey: section.unitKey,
          sectionKey: section.sectionKey,
          editorialStage: "opening",
          dialogueGuide: semantic?.source
            ? "민서와 지호의 대화를 읽으며, 선생님의 질문에 먼저 답해 보시오."
            : "학생들의 대화를 읽으며, 선생님의 질문에 먼저 답해 보시오.",
        });
      current = activity;
    }
    if (
      block.kind === "text" &&
      !semantic?.node &&
      /^#{1,6}\s+[^\n]+\s*$/.test(block.markdown)
    )
      continue;
    if (
      block.kind === "dialogue" &&
      block.presentation?.lessonTitle !== lessonTitle
    ) {
      if (lessonTitle && block.presentation)
        blocks.push({
          id: `${block.id}.lesson-title`,
          sourceBlockId: block.sourceBlockId,
          unitKey: block.unitKey,
          sectionKey: block.sectionKey,
          kind: "text",
          markdown: block.presentation.lessonTitle,
          editorialStage: "opening",
          dialogueLesson: {
            lessonKey: block.presentation.lessonKey,
            lessonTitle: block.presentation.lessonTitle,
          },
        });
      lessonTitle = block.presentation?.lessonTitle ?? "";
    }
    blocks.push({
      ...block,
      editorialStage: stage,
      ...(block.kind === "recall" && Object.hasOwn(MEMORY_COPY, activity ?? "")
        ? { memoryPhases: [] }
        : {}),
    });
  }
  return { ...section, blocks, editorialStage: blocks[0]?.editorialStage };
}

const labels: Record<TextbookEditorialStage, string> = {
  opening: "단원을 여는 수업",
  concept: "개념 이해",
  recall: "개념 정리",
  basic: "기본 확인",
  practice: "예제로 익히기",
  application: "설명·적용",
  review: "다시 꺼내기",
  guide: "학습 안내",
  unit: "이번 단원에서 무엇을 배우게 될까?",
  rest: "쉬어가기",
};

function titleStage(title: string): TextbookEditorialStage | undefined {
  if (/준비 학습|선수 개념|기본 확인/.test(title)) return "basic";
  if (/오류 점검|서술형|단원 평가|설명·적용/.test(title)) return "application";
  if (/용어 백지|핵심어 빈칸|문장 백지|개념 정리/.test(title)) return "recall";
  if (/유형 연습|대표예제|예제로 익히기/.test(title)) return "practice";
  if (/누적 복습|다시 꺼내기/.test(title)) return "review";
  return undefined;
}

function blockStage(
  block: RenderBlock,
  current: TextbookEditorialStage,
): TextbookEditorialStage {
  if (block.kind === "dialogue") return "opening";
  if (block.kind === "concept") return "concept";
  if (block.kind === "recall")
    return current === "application" ? current : "recall";
  if (block.kind === "problem") {
    switch (block.learningStage) {
      case "worked-example":
      case "type-practice":
      case "basic":
        return "practice";
      case "cumulative-review":
        return "review";
      case "written":
      case "unit-assessment":
      case "application":
      case "error-check":
        return "application";
      case "preparation":
      case "concept-check":
        return "basic";
    }
  }
  if (block.kind === "text") {
    const heading = /^#{1,6}\s+([^\n]+)/.exec(block.markdown)?.[1];
    return (heading && titleStage(heading)) || current;
  }
  return current;
}

/** Editorial metadata affects only the render projection, never saved manuscript bytes. */
export function projectEditorialSection(
  section: RenderSection,
  enabledActivities?: readonly TextbookActivity[],
): RenderSection {
  if (
    section.blocks.some((block) => block.semantic) &&
    (section.templateKey.startsWith("auto-") ||
      section.templateKey.startsWith("reference-"))
  )
    return semanticProjection(section, enabledActivities);
  if (section.templateKey !== "auto-lesson") {
    const editorialStage =
      section.templateKey === "rest"
        ? "rest"
        : section.templateKey.includes("unit-intro")
          ? "unit"
          : section.templateKey.startsWith("auto-")
            ? "guide"
            : undefined;
    return editorialStage
      ? {
          ...section,
          editorialStage,
          blocks: section.blocks.map((block) => ({
            ...block,
            editorialStage,
            ...(block.kind === "heading" && editorialStage === "unit"
              ? {
                  title: section.unitTitle,
                  subtitle: "개념을 읽고, 풀이를 설명하다",
                }
              : {}),
          })),
        }
      : section;
  }

  const source = section.blocks;
  let stage: TextbookEditorialStage = "concept";
  const first = source.find((block) => block.kind !== "heading");
  if (first) stage = blockStage(first, stage);
  const blocks: RenderBlock[] = [];
  const heading = (
    sourceBlock: RenderBlock,
    title: string,
    nextStage: TextbookEditorialStage,
    keepId = false,
  ) => {
    blocks.push({
      id: keepId ? sourceBlock.id : `${sourceBlock.id}.editorial-heading`,
      sourceBlockId: sourceBlock.sourceBlockId,
      unitKey: section.unitKey,
      sectionKey: section.sectionKey,
      kind: "heading",
      title,
      subtitle: section.title,
      stageNumber: {
        opening: "01",
        concept: "01",
        recall: "02",
        basic: "03",
        practice: "04",
        application: "05",
        review: "06",
        guide: "00",
        unit: "01",
        rest: "",
      }[nextStage],
      unitNumber: source.find((block) => block.unitNumber)?.unitNumber,
      editorialStage: nextStage,
      startNewPage: blocks.length > 0,
    });
    stage = nextStage;
  };

  for (const block of source) {
    if (block.kind === "heading" && blocks.length === 0) {
      if (
        first?.kind === "text" &&
        /^#{1,6}\s+([^\n]+)\s*$/.test(first.markdown) &&
        titleStage(first.markdown)
      )
        continue;
      heading(block, labels[stage], stage, true);
      continue;
    }
    const nextStage = blockStage(block, stage);
    const title =
      block.kind === "text"
        ? /^#{1,6}\s+([^\n]+)\s*$/.exec(block.markdown)
        : null;
    if (title && titleStage(title[1])) {
      heading(block, title[1], nextStage, true);
      continue;
    }
    if (nextStage !== stage) heading(block, labels[nextStage], nextStage);
    blocks.push({ ...block, editorialStage: nextStage });
  }
  return { ...section, editorialStage: blocks[0]?.editorialStage, blocks };
}
