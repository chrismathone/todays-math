// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { textbookFixture } from "../helpers/textbookFixture";
import { createTextbookRenderModel } from "@/lib/textbook/render/model";
import { blockWidthMm, paginateTextbookSections } from "@/lib/textbook/layout/paginate";

function layout(source: boolean) {
  const exchange = textbookFixture(1, 4);
  exchange.config.print.outerMarginMm = 13;
  const model = createTextbookRenderModel(exchange, "student");
  const section = model.sections[0];
  section.startPolicy = "continue";
  for (const block of section.blocks) {
    if (source) block.semantic = {
      activity: "practice",
      source: { unit: "U01", page: 22, kind: "drill", path: "synthetic" },
    };
  }
  const measurements = section.blocks.map(block => ({
    blockId: block.id,
    widthMm: blockWidthMm(model.config, block),
    heightMm: block.kind === "problem" ? 25 : 20,
  }));
  return paginateTextbookSections(model.sections, measurements, model.config, {
    firstPhysicalPageIndex: 22,
  });
}

describe("native calculation grid placement", () => {
  it("keeps the native nine-mm gutter and adjoining measured rows", () => {
    const pages = layout(true).pages;
    expect(pages).toHaveLength(1);
    const [a, b, c, d] = pages[0].blocks.filter(block => block.itemId);
    expect(a.widthMm).toBe(85);
    expect(b.xMm - (a.xMm + a.widthMm)).toBe(9);
    expect(b.yMm).toBe(a.yMm);
    expect(c.yMm).toBe(a.yMm + a.heightMm);
    expect(d.yMm).toBe(c.yMm);
  });

  it("preserves the saved ordinary grid's seven-mm gutter and four-mm rows", () => {
    const pages = layout(false).pages;
    const [a, b, c] = pages[0].blocks.filter(block => block.itemId);
    expect(a.widthMm).toBe(86);
    expect(b.xMm - (a.xMm + a.widthMm)).toBe(7);
    expect(c.yMm).toBe(a.yMm + a.heightMm + 4);
  });
});
