// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  renderBlockHtml,
  renderPageHtml,
  measurementHtml,
} from "@/lib/textbook/render/html";
import {
  createTextbookRenderModel,
  type RenderBlock,
} from "@/lib/textbook/render/model";
import {
  paginateTextbookSections,
  blockWidthMm,
  type TextbookPage,
} from "@/lib/textbook/layout/paginate";
import { textbookFixture } from "../helpers/textbookFixture";

const resources = {
  assetUrl: (id: string) => `/assets/${id}.png`,
  qrDataUrl: () => "data:image/png;base64,AA==",
};
const dialogue = (
  speakerId: string,
  expression: string,
  mirrorPortrait = false,
): RenderBlock => ({
  id: "test-dialogue",
  sourceBlockId: "test-dialogue",
  unitKey: "u1",
  sectionKey: "s1",
  kind: "dialogue",
  speakerId,
  expression,
  side: "right",
  portraitAssetId: "frozen-atlas",
  mirrorPortrait,
  markdown: "같은 양을 나누어 봅시다. $12\\div6=2$",
});

describe("v15 portrait and facing page markup", () => {
  it("gives rest stories their own pages without fillers and keeps following lessons separate", () => {
    const exchange = textbookFixture(3, 0);
    exchange.units[0].sections[1].templateKey = "rest";
    exchange.units[0].sections[1].startPolicy = "continue";
    exchange.units[0].sections[2].startPolicy = "continue";
    const model = createTextbookRenderModel(exchange, "student");
    const measurements = model.sections.flatMap((section) =>
      section.blocks.map((block) => ({
        blockId: block.id,
        widthMm: blockWidthMm(model.config, block),
        heightMm: 12,
      })),
    );
    const layout = paginateTextbookSections(
      model.sections,
      measurements,
      model.config,
      { firstPhysicalPageIndex: 2 },
    );
    expect(layout.pages.map((page) => page.physicalPageIndex)).toEqual([
      2, 3, 4,
    ]);
    expect(layout.pages.map((page) => page.sectionKey)).toEqual([
      "section-0",
      "section-1",
      "section-2",
    ]);
    expect(layout.pages.every((page) => page.blocks.length === 1)).toBe(true);
    const nextChunk = paginateTextbookSections(
      [model.sections[2]],
      [measurements[2]],
      model.config,
      {
        firstPhysicalPageIndex: 4,
        previousSectionKey: "section-1",
        previousTemplateKey: "rest",
      },
    );
    expect(nextChunk.pages[0].physicalPageIndex).toBe(4);
  });
  it.each(["neutral", "question", "thinking", "aha"])(
    "clips the %s quadrant for explicit allowlisted identities",
    (expression) => {
      const html = renderBlockHtml(
        dialogue("tb-portrait-student-m1", expression, true),
        resources,
      );
      expect(html).toContain(`tb-expression-${expression}`);
      expect(html).toContain("tb-portrait-frame");
      expect(html).toContain("tb-frame-mirrored");
      expect(html).toContain("tb-speaker-student");
      expect(html).toContain("지호");
      expect(html).toContain("/assets/frozen-atlas.png");
    },
  );

  it("leaves old portraits and non-allowlisted speaker IDs as complete images", () => {
    for (const speaker of [
      "teacher",
      "student1",
      "tb-portrait-custom",
      "student-m1",
    ]) {
      const html = renderBlockHtml(dialogue(speaker, "aha", true), resources);
      expect(html).not.toContain("tb-portrait-frame");
      expect(html).toContain("tb-mirrored");
      expect(html).toContain(`<strong>${speaker}</strong>`);
    }
  });

  it("keeps rest template context identical during measurement and placement, with physical facing margins", () => {
    const exchange = textbookFixture(1, 0);
    exchange.units[0].sections[0].templateKey = "rest";
    const model = createTextbookRenderModel(exchange, "student");
    const base: TextbookPage = {
      physicalPageIndex: 2,
      printedPageLabel: "2",
      unitKey: model.sections[0].unitKey,
      sectionKey: model.sections[0].sectionKey,
      unitTitle: model.sections[0].unitTitle,
      sectionTitle: model.sections[0].title,
      kind: "content",
      blocks: [],
    };
    expect(measurementHtml(model, resources)).toContain(
      'data-template-key="rest"',
    );
    const even = renderPageHtml(base, model, resources);
    expect(even).toContain("tb-page-even");
    expect(even).toContain('tb-footer" style="left:16mm;right:18mm"');
    const odd = renderPageHtml(
      { ...base, physicalPageIndex: 3, printedPageLabel: "3" },
      model,
      resources,
    );
    expect(odd).toContain("tb-page-odd");
    expect(odd).toContain('tb-footer" style="left:18mm;right:16mm"');
    expect(odd).toContain("<strong>3</strong>");
    expect(odd).toContain('data-template-key="rest"');
  });
});
