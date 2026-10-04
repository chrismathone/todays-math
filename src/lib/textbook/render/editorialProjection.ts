import type {
  RenderBlock,
  RenderSection,
  TextbookEditorialStage,
} from "./model";

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
export function projectEditorialSection(section: RenderSection): RenderSection {
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
