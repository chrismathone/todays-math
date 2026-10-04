// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createTextbookRenderModel } from "@/lib/textbook/render/model";
import { projectEditorialSection } from "@/lib/textbook/render/editorialProjection";
import {
  blockWidthMm,
  paginateTextbookSections,
} from "@/lib/textbook/layout/paginate";
import { textbookFixture } from "../helpers/textbookFixture";

describe("reference editorial stages preserve frozen content", () => {
  it("starts each recall form and the practice on separate real pages", () => {
    const exchange = textbookFixture(1, 2);
    const section = exchange.units[0].sections[0];
    section.templateKey = "auto-lesson";
    section.startPolicy = "continue";
    section.blocks.unshift(
      { blockId: "term-title", kind: "text", markdown: "### 용어 백지" },
      {
        blockId: "term-recall",
        kind: "concept-recall",
        phase: "keywords",
        markdown: "[[합]]: 두 수를 더한 값",
        showRepetitionChecks: false,
      },
      { blockId: "cloze-title", kind: "text", markdown: "### 핵심어 빈칸" },
      {
        blockId: "cloze-recall",
        kind: "concept-recall",
        phase: "keywords",
        markdown: "합: 두 수를 [[더한]] 값",
        showRepetitionChecks: false,
      },
      { blockId: "practice-title", kind: "text", markdown: "### 유형 연습" },
    );
    const original = JSON.stringify(exchange);
    const model = createTextbookRenderModel(exchange, "student");
    const measurements = model.sections.flatMap((s) =>
      s.blocks.map((b) => ({
        blockId: b.id,
        widthMm: blockWidthMm(model.config, b),
        heightMm: 12,
      })),
    );
    const result = paginateTextbookSections(
      model.sections,
      measurements,
      model.config,
    );
    const pageFor = (id: string) =>
      result.pages.find((p) => p.blocks.some((b) => b.blockId === id));
    expect(pageFor("term-recall")?.physicalPageIndex).not.toBe(
      pageFor("cloze-recall")?.physicalPageIndex,
    );
    expect(pageFor("cloze-recall")?.physicalPageIndex).not.toBe(
      pageFor("block-0")?.physicalPageIndex,
    );
    expect(result.pages.every((p) => p.blocks.length > 0)).toBe(true);
    expect(
      result.pages.every((p) =>
        p.blocks.some((b) => !b.blockId.endsWith("title")),
      ),
    ).toBe(true);
    expect(result.pageMap.map((p) => p.itemId)).toEqual(
      exchange.items.map((item) => item.itemId),
    );
    expect(JSON.stringify(exchange)).toBe(original);
    expect(JSON.stringify(model)).not.toContain("비공개 정답");
    expect(JSON.stringify(model)).not.toContain("비공개 해설");
  });

  it("exposes a worked example only when the item explicitly declares that stage", () => {
    const exchange = textbookFixture(1, 2);
    exchange.units[0].sections[0].templateKey = "auto-lesson";
    exchange.items[0].learningStage = "worked-example";
    const student = createTextbookRenderModel(exchange, "student");
    const problems = student.sections[0].blocks.filter(
      (block) => block.kind === "problem",
    );
    expect(problems[0].publicWorkedExample?.answer).toBe("비공개 정답 0");
    expect(problems[1].publicWorkedExample).toBeUndefined();
    expect(problems[1].answer).toBeUndefined();
    expect(problems[1].solution).toBeUndefined();
  });

  it("does not add page boundaries to manually composed sections", () => {
    const exchange = textbookFixture();
    const model = createTextbookRenderModel(exchange, "student");
    const section = model.sections[0];
    expect(projectEditorialSection(section)).toBe(section);
    expect(section.blocks.every((block) => !block.startNewPage)).toBe(true);
  });

  it("supplies unit artwork numbers without using opaque UUID keys", () => {
    const exchange = textbookFixture(1, 0);
    exchange.units[0].sections[0].templateKey = "auto-unit-intro";
    exchange.units[0].sections[0].blocks.push({
      blockId: "goals",
      kind: "text",
      markdown: "배울 개념",
    });
    const model = createTextbookRenderModel(exchange, "student");
    const heading = model.sections[0].blocks[0];
    expect(heading.kind).toBe("heading");
    expect(heading.unitNumber).toBe(1);
    expect(heading.editorialStage).toBe("unit");
    if (heading.kind === "heading")
      expect(heading.title).toBe(exchange.units[0].title);
  });
});
