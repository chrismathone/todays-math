// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  A4,
  blockWidthMm,
  paginateTextbookSections,
  alignTextbookSpreads,
  pageBudgetIssues,
} from "@/lib/textbook/layout/paginate";
import { createTextbookRenderModel } from "@/lib/textbook/render/model";
import {
  recallPieces,
  renderTextbookMarkdown,
} from "@/lib/textbook/render/markdown";
import { textbookFixture } from "../helpers/textbookFixture";

function fixture(sections = 1, problemHeight = 140) {
  const e = textbookFixture(sections),
    model = createTextbookRenderModel(e, "student");
  const measurements = model.sections.flatMap((s) =>
    s.blocks.map((b) => ({
      blockId: b.id,
      widthMm: blockWidthMm(e.config, b),
      heightMm: b.kind === "problem" ? problemHeight : 14,
    })),
  );
  return { e, model, measurements };
}
describe("measured semantic textbook pagination", () => {
  it("starts majors on actual even pages and retains every item without filler", () => {
    const { e, model, measurements } = fixture(101),
      layout = paginateTextbookSections(
        model.sections,
        measurements,
        e.config,
        { includeCover: true },
      );
    alignTextbookSpreads(layout.pages);
    expect(layout.pages).toHaveLength(203);
    expect(layout.pageMap).toHaveLength(404);
    expect(new Set(layout.pageMap.map((p) => p.itemId)).size).toBe(404);
    for (let i = 1; i < layout.pages.length; i += 2) {
      const left = layout.pages[i],
        right = layout.pages[i + 1];
      expect(left.physicalPageIndex % 2).toBe(0);
      expect(left.blocks.find((b) => b.itemId)?.yMm).toBe(
        right.blocks.find((b) => b.itemId)?.yMm,
      );
    }
    expect(layout.pages.slice(1).every((p) => p.blocks.length > 0)).toBe(true);
  });
  it("reports the preceding section when an odd content count breaks parity", () => {
    const { e, model, measurements } = fixture(2, 30);
    expect(() =>
      paginateTextbookSections(model.sections, measurements, e.config, {
        includeCover: true,
      }),
    ).toThrow(/SECTION_PARITY[\s\S]*section-0/);
  });
  it("rejects missing measurements, block overflow and render-width drift", () => {
    const { e, model, measurements } = fixture();
    expect(() =>
      paginateTextbookSections(
        model.sections,
        measurements.slice(1),
        e.config,
        { includeCover: true },
      ),
    ).toThrow(/MISSING_MEASUREMENT/);
    measurements[1].heightMm = 300;
    expect(() =>
      paginateTextbookSections(model.sections, measurements, e.config, {
        includeCover: true,
      }),
    ).toThrow(/BLOCK_OVERFLOW/);
    measurements[1].heightMm = 140;
    measurements[1].widthMm += 2;
    expect(() =>
      paginateTextbookSections(model.sections, measurements, e.config, {
        includeCover: true,
      }),
    ).toThrow(/MEASUREMENT_WIDTH/);
  });
  it("keeps a unit intro on two actual manuscript pages and refuses missing right content", () => {
    const e = textbookFixture(1, 1);
    e.units[0].sections[0].templateKey = "unit-intro";
    const model = createTextbookRenderModel(e, "student"),
      measurements = model.sections[0].blocks.map((b) => ({
        blockId: b.id,
        widthMm: blockWidthMm(e.config, b),
        heightMm: 30,
      }));
    const layout = paginateTextbookSections(
      model.sections,
      measurements,
      e.config,
      { includeCover: true },
    );
    expect(layout.pages).toHaveLength(3);
    expect(layout.pages[1].blocks[0].heightMm).toBe(
      A4.bodyBottomMm - A4.bodyTopMm,
    );
    expect(layout.pageMap[0].physicalPageIndex).toBe(3);
    model.sections[0].blocks.pop();
    expect(() =>
      paginateTextbookSections(model.sections, measurements, e.config, {
        includeCover: true,
      }),
    ).toThrow(/UNIT_INTRO_CONTENT/);
  });
  it("continues in available space and treats page budget as an issue, not content removal", () => {
    const { e, model, measurements } = fixture(2, 25);
    model.sections[1].startPolicy = "continue";
    const layout = paginateTextbookSections(
      model.sections,
      measurements,
      e.config,
      { includeCover: true },
    );
    expect(layout.pages).toHaveLength(2);
    expect(layout.pageMap).toHaveLength(8);
    e.config.pageBudget = { target: 20, tolerance: 0, strict: true };
    expect(pageBudgetIssues(2, e.config)[0].severity).toBe("error");
    expect(layout.pageMap).toHaveLength(8);
  });
  it("student rendering uses an allowlist and explicit worked examples", () => {
    const e = textbookFixture(),
      student = createTextbookRenderModel(e, "student");
    expect(JSON.stringify(student)).not.toContain("비공개");
    expect(JSON.stringify(student)).not.toContain("rawSource");
    e.items[0].learningStage = "worked-example";
    expect(JSON.stringify(createTextbookRenderModel(e, "student"))).toContain(
      "비공개 정답 0",
    );
  });
  it("rejects executable math and raw HTML, and removes recall answers before HTML", () => {
    expect(renderTextbookMarkdown("<script>alert(1)</script>")).not.toContain(
      "<script>",
    );
    expect(() =>
      renderTextbookMarkdown("$\\href{javascript:alert(1)}{x}$"),
    ).toThrow();
    const pieces = recallPieces(
      "공통인 [[약수]]를 {{공약수라고 한다.}}",
      "sentences",
    );
    expect(JSON.stringify(pieces)).not.toContain("공약수라고 한다.");
  });
});
