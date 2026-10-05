import type {
  RenderBlock,
  RenderSection,
  TextbookEditorialStage,
} from "./model";

/** The six learning tabs and supporting page archetypes from the v15 reference. */
export type EditorialStage = TextbookEditorialStage;

export const EDITORIAL_STAGES = {
  opening: {
    label: "단원을 여는 수업",
    tab: 0,
    number: "01",
    subtitle: "대화를 읽으며 선생님의 질문에 먼저 답해 봅시다.",
  },
  concept: {
    label: "개념 이해",
    tab: 0,
    number: "01",
    subtitle: "정의의 조건과 예를 함께 읽고, 내 말로 설명해 봅시다.",
  },
  recall: {
    label: "개념 정리",
    tab: 1,
    number: "02",
    subtitle: "개념학습 → 빈칸개념암기 → 통문장개념암기",
  },
  basic: {
    label: "기본 확인",
    tab: 2,
    number: "03",
    subtitle: "개념의 조건과 계산을 확인해 봅시다.",
  },
  practice: {
    label: "유형 연습",
    tab: 3,
    number: "04",
    subtitle: "대표예제의 방법을 읽고 스스로 적용해 봅시다.",
  },
  application: {
    label: "설명·적용",
    tab: 4,
    number: "05",
    subtitle: "풀이 과정과 이유를 빠짐없이 써 봅시다.",
  },
  review: {
    label: "다시 꺼내기",
    tab: 5,
    number: "06",
    subtitle: "이전 풀이를 보지 않고 풀고, 다시 확인할 개념을 찾아봅시다.",
  },
  guide: {
    label: "학습 안내",
    tab: -1,
    number: "00",
    subtitle: "개념을 읽고, 풀이를 설명하다",
  },
  unit: {
    label: "단원 안내",
    tab: -1,
    number: "01",
    subtitle: "이번 단원에서 무엇을 배우게 될까?",
  },
  rest: {
    label: "쉬어가는 수학",
    tab: -1,
    number: "",
    subtitle: "잠깐 쉬며, 수학으로 세상을 바라봅시다.",
  },
} as const;

export type EditorialBlock = RenderBlock;
export type EditorialSection = RenderSection;

export function editorialStage(
  block?: EditorialBlock,
  section?: EditorialSection,
): EditorialStage {
  if (
    block?.editorialStage &&
    Object.hasOwn(EDITORIAL_STAGES, block.editorialStage)
  )
    return block.editorialStage;
  if (
    section?.editorialStage &&
    Object.hasOwn(EDITORIAL_STAGES, section.editorialStage)
  )
    return section.editorialStage;
  const template = section?.templateKey;
  if (template === "rest") return "rest";
  if (template === "unit-intro" || template === "auto-unit-intro")
    return "unit";
  if (block?.kind === "unit-intro") return "unit";
  if (block?.kind === "dialogue") return "opening";
  if (block?.kind === "concept") return "concept";
  if (block?.kind === "recall") return "recall";
  if (block?.kind === "problem") {
    const learningStage = (block as RenderBlock & { learningStage?: string })
      .learningStage;
    if (block.publicWorkedExample || learningStage === "worked-example")
      return "practice";
    if (
      ["application", "error-check", "written", "unit-assessment"].includes(
        learningStage ?? "",
      )
    )
      return "application";
    if (learningStage === "cumulative-review") return "review";
    if (learningStage === "type-practice") return "practice";
    return "basic";
  }
  if (template === "concept-recall" || template === "recall") return "recall";
  if (template === "practice" || template === "types") return "practice";
  if (template === "application") return "application";
  if (template === "review") return "review";
  if (template === "guide") return "guide";
  if (template === "basic") return "basic";
  return "concept";
}

/** Context is copied into the render DTO only; frozen source blocks are never mutated. */
export function editorialBlock(
  block: RenderBlock,
  section?: EditorialSection,
): EditorialBlock {
  return { ...block, editorialStage: editorialStage(block, section) };
}

export function editorialUnitNumber(block: EditorialBlock): number {
  if (
    block.unitNumber &&
    Number.isInteger(block.unitNumber) &&
    block.unitNumber > 0
  )
    return block.unitNumber;
  const match = /^(?:u|unit[-_]?)(\d{1,2})(?:$|[-_])/i.exec(block.unitKey);
  return match && Number(match[1]) > 0 ? Number(match[1]) : 1;
}

export function editorialUnitAsset(block: EditorialBlock): string {
  return `u${String(((editorialUnitNumber(block) - 1) % 6) + 1).padStart(2, "0")}.png`;
}

/** Native section captions are distinct from the bank's selected activity. */
export function sourceStageLabel(
  block: RenderBlock | undefined,
  stage: EditorialStage,
): string {
  return (
    block?.semantic?.source?.sectionName?.replace(
      /누적 복습 Daily \d+/,
      "누적 복습",
    ) || EDITORIAL_STAGES[stage].label
  );
}

/** Native fullSheet progress classification; memory sheets retain their own three steps. */
export function sourceProgressTab(
  block: RenderBlock,
  stage: EditorialStage,
): number {
  const source = block.semantic?.source;
  if (!source) return EDITORIAL_STAGES[stage].tab;
  const byName: Record<string, number> = {
    "개념 이해": 0,
    "개념 정리": 1,
    "기본 확인": 2,
    "유형 연습": 3,
    "누적 복습": 5,
  };
  if (source.sectionName && byName[source.sectionName] !== undefined)
    return byName[source.sectionName];
  if (block.semantic?.activity === "review") return 5;
  if (
    source.kind === "lesson" ||
    (source.kind.startsWith("concept") && source.kind !== "conceptindex")
  )
    return 0;
  if (["typepage", "paired", "types"].includes(source.kind)) return 3;
  if (["unitmap", "mindmap"].includes(source.kind)) return 1;
  if (["basic", "drill", "scriptcheck"].includes(source.kind)) return 2;
  return 4;
}
