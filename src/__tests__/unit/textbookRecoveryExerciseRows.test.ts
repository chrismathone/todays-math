// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { textbookFixture } from "../helpers/textbookFixture";
import { createTextbookRenderModel } from "@/lib/textbook/render/model";
import {
  A4,
  alignTextbookSpreads,
  blockWidthMm,
  paginateTextbookSections,
  studentPageMapFromPages,
} from "@/lib/textbook/layout/paginate";

function measured(source = false, short = false) {
  const exchange = textbookFixture(1, 8);
  const model = createTextbookRenderModel(exchange, "student");
  const section = model.sections[0];
  section.templateKey = "auto-lesson-part";
  section.startPolicy = "continue";
  let problemIndex = 0;
  const measurements = section.blocks.map((block) => {
    block.editorialStage = "practice";
    if (block.kind === "problem") {
      block.semantic = {
        activity: "practice",
        ...(source
          ? {
              source: {
                unit: "U01",
                page: 24,
                kind: "exercise",
                sectionName: "합성 연습",
                path: "synthetic",
              },
            }
          : {}),
      };
    }
    return {
      blockId: block.id,
      widthMm: blockWidthMm(model.config, block),
      heightMm:
        block.kind === "problem"
          ? short
            ? 30
            : [30, 30, 150, 150, 150, 150, 30, 30][problemIndex++]
          : 20,
    };
  });
  return { exchange, model, measurements };
}

describe("automatic exercise rows reserve their measured spread space", () => {
  it("keeps long and short questions in order while aligned rows fit on every page", () => {
    const { exchange, model, measurements } = measured();
    const originalMeasurements = JSON.stringify(measurements);
    const layout = paginateTextbookSections(
      model.sections,
      measurements,
      model.config,
      { firstPhysicalPageIndex: 2 },
    );
    expect(layout.pages).toHaveLength(4);
    expect(() =>
      alignTextbookSpreads(layout.pages, model.sections),
    ).not.toThrow();
    const problems = layout.pages.flatMap((page) =>
      page.blocks.filter((block) => block.itemId),
    );
    expect(problems.map((block) => block.itemId)).toEqual(
      exchange.items.map((item) => item.itemId),
    );
    expect(new Set(problems.map((block) => block.heightMm))).toEqual(
      new Set([150]),
    );
    expect(
      problems.every((block) => block.yMm + block.heightMm <= A4.bodyBottomMm),
    ).toBe(true);
    expect(
      studentPageMapFromPages(model.sections, layout.pages, model.config),
    ).toEqual(layout.pageMap);
    expect(JSON.stringify(measurements)).toBe(originalMeasurements);
  });

  it("does not inflate a short run that already fits on one page", () => {
    const { model, measurements } = measured(false, true);
    const layout = paginateTextbookSections(
      model.sections,
      measurements,
      model.config,
      { firstPhysicalPageIndex: 2 },
    );
    expect(layout.pages).toHaveLength(1);
    expect(
      layout.pages[0].blocks
        .filter((block) => block.itemId)
        .every((block) => block.heightMm === 30),
    ).toBe(true);
  });

  it("keeps original source row heights and refuses a source spread that actually overflows", () => {
    const { model, measurements } = measured(true);
    const layout = paginateTextbookSections(
      model.sections,
      measurements,
      model.config,
      { firstPhysicalPageIndex: 2 },
    );
    expect(layout.pages).toHaveLength(2);
    expect(() => alignTextbookSpreads(layout.pages, model.sections)).toThrow(
      "SPREAD_ALIGNMENT_OVERFLOW",
    );
  });
});
