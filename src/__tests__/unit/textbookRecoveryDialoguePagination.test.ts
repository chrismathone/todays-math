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
});
