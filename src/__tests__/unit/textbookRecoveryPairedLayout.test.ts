// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { textbookFixture } from "../helpers/textbookFixture";
import {
  createTextbookRenderModel,
  type RenderBlock,
} from "@/lib/textbook/render/model";
import {
  blockWidthMm,
  paginateTextbookSections,
  studentPageMapFromPages,
  alignTextbookSpreads,
  type TextbookPage,
} from "@/lib/textbook/layout/paginate";
import { renderPageHtml } from "@/lib/textbook/render/html";
import { recallPieces } from "@/lib/textbook/render/markdown";
import { assertRecoveryMeasurementBudget, recallMeasurementModel } from "@/lib/textbook/render/recoveryMeasurement";

function paired() {
  const exchange = textbookFixture();
  const model = createTextbookRenderModel(exchange, "student");
  const section = model.sections[0];
  const original = section.blocks.find(
    (block) => block.kind === "problem",
  )! as Extract<RenderBlock, { kind: "problem" }>;
  const node = {
    kind: "exampleGroup" as const,
    groupId: "paired-1",
    title: "덧셈",
    strategy: "$2+3=5$",
    strategyKind: "captured-solution" as const,
    exampleItemId: "example",
    confirmItemIds: ["confirm1", "confirm2"],
  };
  const semantic = { activity: "workedExamples" as const, node };
  const header: RenderBlock = {
    id: "pair-heading",
    sourceBlockId: "pair-heading",
    unitKey: section.unitKey,
    sectionKey: section.sectionKey,
    kind: "text",
    markdown: "",
    semantic,
    editorialStage: "practice",
  };
  const problems = ["example", "confirm1", "confirm2"].map(
    (itemId, index): RenderBlock => ({
      ...original,
      id: itemId,
      sourceBlockId: itemId,
      itemId,
      displayNumber: String(index + 1),
      semantic,
      editorialStage: "practice",
      content: `$${index + 2}+3$을 계산하시오.`,
      qr: null,
      layout: {
        ...original.layout,
        columnSpan: 1,
        minWorkLines: 2,
        preferredWorkLines: 2,
      },
      ...(index === 0
        ? { publicWorkedExample: { answer: "5", solution: "$2+3=5$" } }
        : {}),
    }),
  );
  section.blocks = [header, ...problems];
  section.templateKey = "auto-lesson-part";
  section.startPolicy = "continue";
  const measurements = section.blocks.map((block, index) => ({
    blockId: block.id,
    widthMm: blockWidthMm(model.config, block),
    heightMm: [20, 45, 30, 30][index],
  }));
  const layout = () =>
    paginateTextbookSections([section], measurements, model.config, {
      firstPhysicalPageIndex: 2,
    });
  return { model, section, measurements, layout };
}

describe("measured linked example columns", () => {
  it("places one solved example left and every confirmation down the right, with unique source references", () => {
    const { model, section, layout } = paired();
    const result = layout();
    expect(result.pages).toHaveLength(1);
    const [header, example, first, second] = result.pages[0].blocks;
    expect(example.column).toBe(1);
    expect([first.column, second.column]).toEqual([2, 2]);
    expect(example.yMm).toBe(header.yMm + header.heightMm);
    expect(first.yMm).toBe(example.yMm + 3);
    expect(second.yMm).toBe(first.yMm + first.heightMm);
    expect(example.xMm).toBeLessThan(first.xMm);
    expect(first.xMm).toBe(second.xMm);
    expect(
      studentPageMapFromPages([section], result.pages, model.config),
    ).toEqual(result.pageMap);
    const html = renderPageHtml(result.pages[0], model, {
      assetUrl: () => "data:image/png;base64,",
      qrDataUrl: () => "",
    });
    expect(html).toContain('class="tb-paired-cols paired-cols"');
    expect(html).toContain('class="tb-paired-worked worked"');
    expect(html).toContain('class="tb-paired-twins twins"');
    expect((html.match(/data-block-id=/g) ?? []).length).toBe(4);
    expect(html).not.toContain('class="tb-example-strategy"');
    expect((html.match(/class="tb-worked-solution"/g) ?? []).length).toBe(1);
  });
  it("rejects incomplete groups, changed order and mismatched actual column widths", () => {
    for (const change of ["missing", "order", "width"] as const) {
      const { section, measurements, layout } = paired();
      if (change === "missing") section.blocks.pop();
      if (change === "order")
        [section.blocks[2], section.blocks[3]] = [
          section.blocks[3],
          section.blocks[2],
        ];
      if (change === "width") measurements[2].widthMm += 1;
      expect(layout).toThrow(/EXAMPLE_GROUP/);
    }
  });
  it("rejects a group whose actual measured content cannot fit with its header", () => {
    const { measurements, layout } = paired();
    measurements[1].heightMm = 260;
    expect(layout).toThrow(/EXAMPLE_GROUP_OVERFLOW/);
  });
});

describe("TeX braces and legacy recall delimiters", () => {
  it("preserves nested TeX braces verbatim while removing complete hidden statements", () => {
    const tex = "$\\frac{\\sqrt{2}}{2}$";
    expect(recallPieces(tex, "study")).toEqual([
      { kind: "text", markdown: tex },
    ]);
    expect(recallPieces(`[[정의]]: ${tex}`, "keywords")).toEqual([
      { kind: "blank", scope: "keyword" },
      { kind: "text", markdown: `: ${tex}` },
    ]);
    expect(recallPieces(`{{${tex}는 양수이다.}}`, "sentences")).toEqual([
      { kind: "blank", scope: "sentence" },
    ]);
    expect(recallPieces(`{{${tex}는 양수이다.}}`, "study")).toEqual([
      { kind: "text", markdown: `${tex}는 양수이다.` },
    ]);
  });
  it("still rejects unmatched or nested recall markers outside mathematics", () => {
    for (const source of ["[[정의", "정의}}", "{{문장 [[중첩]]}}", "[[단어}}"])
      expect(() => recallPieces(source, "study")).toThrow(/짝이 맞지/);
  });
});

describe("corresponding exercise spreads", () => {
  function spread() {
    const { section } = paired();
    const base = section.blocks.find((block) => block.kind === "problem")!;
    const blocks = [0, 1, 2, 3].map((index) => ({
      ...base,
      id: `q${index}`,
      semantic: { activity: "basicCheck" as const },
    }));
    const pages: TextbookPage[] = [2, 3].map((physicalPageIndex, pageIndex) => ({
      physicalPageIndex,
      printedPageLabel: String(physicalPageIndex),
      unitKey: section.unitKey,
      sectionKey: section.sectionKey,
      unitTitle: section.unitTitle,
      sectionTitle: section.title,
      kind: "content",
      editorialStage: "basic",
      blocks: blocks.slice(pageIndex * 2, pageIndex * 2 + 2).map((block, i) => ({
        blockId: block.id,
        itemId: block.id,
        column: (i + 1) as 1 | 2,
        xMm: i ? 108 : 13,
        yMm: pageIndex ? 47 : 45,
        widthMm: 86,
        heightMm: pageIndex ? 100 : 90,
      })),
    }));
    return { pages, sections: [{ ...section, blocks }] };
  }
  it("aligns actual matching two-column exercise rows without changing item membership", () => {
    const { pages, sections } = spread();
    alignTextbookSpreads(pages, sections);
    expect(pages.flatMap((page) => page.blocks.map((block) => [block.yMm, block.heightMm])))
      .toEqual([[47, 100], [47, 100], [47, 100], [47, 100]]);
  });
  it.each(["unit", "section", "row-count", "linked-group", "source-kind", "source-section"])(
    "preserves unrelated %s pages rather than manufacturing an alignment overflow",
    (fault) => {
      const { pages, sections } = spread();
      if (fault === "unit") pages[1].unitKey = "other";
      if (fault === "section") pages[1].sectionKey = "other";
      if (fault === "row-count") pages[1].blocks.pop();
      if (fault === "linked-group") sections[0].blocks[0].semantic = paired().section.blocks[0].semantic;
      if (fault.startsWith("source")) sections[0].blocks.forEach((block, index) => {
        block.semantic = { ...block.semantic!, source: {
          unit: "U01", page: index < 2 ? 16 : 17,
          kind: fault === "source-kind" && index < 2 ? "concept3" : "exercise",
          sectionName: fault === "source-section" && index < 2 ? "개념 이해" : "확인문제",
          path: `pages[${index}]`,
        } };
      });
      const before = structuredClone(pages);
      alignTextbookSpreads(pages, sections);
      expect(pages).toEqual(before);
    },
  );
  it("retains overflow rejection for a truly corresponding spread", () => {
    const { pages, sections } = spread();
    pages[1].blocks.forEach((block) => { block.heightMm = 250; });
    expect(() => alignTextbookSpreads(pages, sections)).toThrow(/SPREAD_ALIGNMENT_OVERFLOW/);
  });
});

describe("private canonical measurement limits", () => {
  it("deduplicates repeated canonical phases while retaining distinct row partitions and excluding problem answers", () => {
    const { model, section } = paired();
    const recalls = ["study", "keywords", "sentences"].flatMap((phase, i) =>
      ["row-a", "row-b"].map((rowKey): RenderBlock => ({
        id: `recall-${i}-${rowKey}`, sourceBlockId: "source-recall",
        unitKey: section.unitKey, sectionKey: section.sectionKey,
        kind: "recall", phase: phase as "study" | "keywords" | "sentences",
        pieces: [], repetitionChecks: false, answersVisible: true,
        semantic: { activity: "conceptStudy", node: { kind: "rows", groupKey: "same-group",
          rows: [{ rowKey, label: "정의", rawText: "canonical private text", textFormat: "markdown" }] } },
        displayRows: [{ rowKey, label: "정의", pieces: [{ kind: "key", markdown: "canonical private text" }], hidden: false, lines: 1 }],
      })),
    );
    const answers = { ...model, variant: "answers" as const,
      sections: [{ ...section, blocks: [...recalls, ...section.blocks] }] };
    const selected = { ...model, sections: [{ ...section, blocks: recalls.slice(4) }] };
    const probes = recallMeasurementModel(answers, selected);
    expect(probes.sections.flatMap((s) => s.blocks).map((b) => b.id))
      .toEqual(["recall-0-row-a", "recall-0-row-b"]);
    expect(probes.sections.every((s) => s.blocks.every((b) => b.kind === "recall"))).toBe(true);
    expect(answers.sections[0].blocks).toHaveLength(10);
  });
  it("counts canonical helpers within the existing 600-block ceiling before a DOM is created", () => {
    const { model, section } = paired();
    const sizing = { ...model, sections: [{ ...section, blocks: Array(599).fill(section.blocks[0]) }] };
    const one = { ...model, sections: [{ ...section, blocks: [section.blocks[0]] }] };
    expect(() => assertRecoveryMeasurementBudget(sizing, one)).not.toThrow();
    expect(() => assertRecoveryMeasurementBudget(sizing, model)).toThrow(/600 projected blocks/);
    expect(() => assertRecoveryMeasurementBudget({ ...model, sections: Array(9).fill(section) }))
      .toThrow(/8 sections/);
  });
});
