// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { textbookFixture } from "../helpers/textbookFixture";
import {
  blockWidthMm,
  paginateTextbookSections,
} from "@/lib/textbook/layout/paginate";
import { renderPageHtml } from "@/lib/textbook/render/html";
import {
  createTextbookRenderModel,
  type RenderBlock,
  type RenderSection,
} from "@/lib/textbook/render/model";

function syntheticLesson() {
  const model = createTextbookRenderModel(textbookFixture(1, 0), "student");
  const base = {
    unitKey: "synthetic-unit",
    sectionKey: "synthetic-opening",
    editorialStage: "opening" as const,
  };
  const speech = (id: string): RenderBlock => ({
    ...base,
    id,
    sourceBlockId: id,
    kind: "dialogue",
    speakerId: "legacy-teacher",
    portraitAssetId: "synthetic-portrait",
    side: "left",
    expression: "neutral",
    mirrorPortrait: false,
    markdown: "합성 발화",
    semantic: { activity: "dialogue" },
    dialogueTopMm: 63.42,
    dialogueGapMm: 0.85,
  });
  const blocks: RenderBlock[] = [
    {
      ...base,
      id: "head",
      sourceBlockId: "head",
      kind: "heading",
      title: "합성 수업",
    },
    speech("first"),
    {
      ...base,
      id: "caption",
      sourceBlockId: "second",
      kind: "text",
      markdown: "두 번째 합성 주제",
      dialogueLesson: {
        lessonKey: "synthetic-second",
        lessonTitle: "두 번째 합성 주제",
      },
      dialogueTopMm: 63.42,
    },
    speech("second"),
  ];
  const section: RenderSection = {
    ...base,
    unitTitle: "합성 단원",
    title: "합성 수업",
    templateKey: "auto-lesson-synthetic",
    startPolicy: "continue",
    blocks,
  };
  model.sections = [section];
  const heights = { head: 20, first: 190, caption: 5.2, second: 11.78 };
  const sizes = blocks.map((block) => ({
    blockId: block.id,
    widthMm: blockWidthMm(model.config, block),
    heightMm: heights[block.id as keyof typeof heights],
  }));
  return { model, section, sizes };
}

describe("synthetic dialogue captions at a measured page boundary", () => {
  it("keeps a new lesson caption with its first speech before the reserved dialogue footer", () => {
    const { model, section, sizes } = syntheticLesson();
    const before = JSON.stringify(model);
    const result = paginateTextbookSections([section], sizes, model.config, {
      firstPhysicalPageIndex: 8,
    });
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0].blocks.map((block) => block.blockId)).toEqual([
      "head",
      "first",
    ]);
    expect(result.pages[1].blocks.map((block) => block.blockId)).toEqual([
      "head",
      "caption",
      "second",
    ]);
    expect(
      result.pages[1].blocks.every(
        (block) => block.yMm + block.heightMm <= 266,
      ),
    ).toBe(true);
    expect(JSON.stringify(model)).toBe(before);
  });

  it("includes a caption before the first speech in that page's single continuous background", () => {
    const { model, section, sizes } = syntheticLesson();
    const result = paginateTextbookSections([section], sizes, model.config, {
      firstPhysicalPageIndex: 8,
    });
    const page = result.pages[1];
    const caption = page.blocks.find((block) => block.blockId === "caption")!;
    const final = page.blocks.find((block) => block.blockId === "second")!;
    const html = renderPageHtml(page, model, {
      assetUrl: () => "/synthetic.png",
      qrDataUrl: () => "",
    });
    expect(html.match(/class="tb-dialogue-backdrop"/g)).toHaveLength(1);
    expect(html).toContain(`top:${caption.yMm - 3}mm`);
    expect(html).toContain(
      `height:${final.yMm + final.heightMm - caption.yMm + 6}mm`,
    );
    expect(html).toContain("두 번째 합성 주제");
  });

  it("counts actual lesson pages and prints the continuation only before the final page", () => {
    const { model, section, sizes } = syntheticLesson();
    const { pages } = paginateTextbookSections([section], sizes, model.config, {
      firstPhysicalPageIndex: 8,
    });
    const resources = { assetUrl: () => "/synthetic.png", qrDataUrl: () => "" };
    const first = renderPageHtml(pages[0], model, resources, pages);
    const last = renderPageHtml(pages[1], model, resources, pages);
    expect(first).toContain('data-dialogue-page="1" data-dialogue-pages="2"');
    expect(first).toContain("다음 쪽에서 이어집니다.");
    expect(last).toContain('data-dialogue-page="2" data-dialogue-pages="2"');
    expect(last).toContain("수업에서 배운 내용을 설명해 보세요.");
    expect(last).not.toContain("다음 쪽에서 이어집니다.");
  });

  it("uses reserved student block identities across publisher fragments and shifted answer pages", () => {
    const { model, section, sizes } = syntheticLesson();
    const { pages } = paginateTextbookSections([section], sizes, model.config, {
      firstPhysicalPageIndex: 8,
    });
    const reserved = pages.map((page, index) => ({
      ...page,
      sectionKey: `${section.sectionKey}.part-${index}`,
    }));
    const answerPage = { ...reserved[1], physicalPageIndex: 40 };
    const html = renderPageHtml(
      answerPage,
      { ...model, variant: "answers" },
      {
        assetUrl: () => "/synthetic.png",
        qrDataUrl: () => "",
      },
      [...reserved, { ...reserved[0], unitKey: "another-unit" }],
    );
    expect(html).toContain('data-dialogue-page="2" data-dialogue-pages="2"');
  });

  it("leaves a saved dialogue without semantic metadata byte-identical when layout context is supplied", () => {
    const { model, section, sizes } = syntheticLesson();
    section.blocks = section.blocks.map((block) => {
      const saved = { ...block };
      delete saved.semantic;
      return saved;
    });
    const { pages } = paginateTextbookSections([section], sizes, model.config, {
      firstPhysicalPageIndex: 8,
    });
    const resources = { assetUrl: () => "/synthetic.png", qrDataUrl: () => "" };
    for (const page of pages)
      expect(renderPageHtml(page, model, resources, pages)).toBe(
        renderPageHtml(page, model, resources),
      );
  });
});
