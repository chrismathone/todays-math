import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  assertTextbookReferenceLayoutUnchanged,
  withTextbookPageReferences,
} from "@/lib/textbook/render/pageReferences";
import { createTextbookRenderModel } from "@/lib/textbook/render/model";
import { textbookFixture } from "../helpers/textbookFixture";
import type { TextbookPage } from "@/lib/textbook/layout/paginate";

describe("fixed page references", () => {
  it.each([
    [true, true],
    [true, false],
    [false, true],
    [false, false],
  ])(
    "resolves concept definitions for explicit and saved section targets (definition printed: %s, concept target: %s)",
    (definitionPrinted, explicitTarget) => {
      const exchange = textbookFixture(1, 0);
      const section = exchange.units[0].sections[0];
      section.blocks = [
        {
          blockId: "concept-index",
          kind: "text",
          markdown: "개념 색인",
          semantic: {
            activity: "conceptIndex",
            node: {
              kind: "references",
              entries: [
                {
                  key: "c1",
                  label: "개념",
                  ...(explicitTarget
                    ? { targetConceptId: "c1" }
                    : {
                        targetUnitKey: exchange.units[0].unitKey,
                        targetSectionKey: section.sectionKey,
                      }),
                },
              ],
            },
          },
        },
        ...(["errorCheck", "concepts", "concepts"] as const).map(
          (activity, index) => ({
            blockId: `concept-${index}`,
            kind: "text" as const,
            markdown: "개념",
            semantic: {
              activity,
              node: {
                kind: "concept" as const,
                conceptId: "c1",
                title: "개념",
                rows: [
                  { rowKey: "definition", label: "뜻", rawText: "개념의 뜻" },
                ],
              },
            },
          }),
        ),
      ];
      const manuscript = JSON.stringify(exchange);
      const model = createTextbookRenderModel(exchange, "student");
      const pages: TextbookPage[] = model.sections[0].blocks
        .filter((block) => block.sourceBlockId.startsWith("concept-"))
        .filter((block) => block.semantic?.node?.kind === "concept")
        .filter(
          (block) =>
            definitionPrinted || block.semantic?.activity !== "concepts",
        )
        .map((block, index) => ({
          physicalPageIndex: 11 + index,
          printedPageLabel: String(11 + index),
          unitKey: exchange.units[0].unitKey,
          sectionKey: section.sectionKey,
          unitTitle: "단원",
          sectionTitle: "수업",
          kind: "content",
          blocks: [
            {
              blockId: block.id,
              column: 1,
              xMm: 18,
              yMm: 40,
              widthMm: 176,
              heightMm: 30,
            },
          ],
        }));
      const filled = withTextbookPageReferences(model, pages);
      const node = filled.sections[0].blocks.find(
        (block) => block.sourceBlockId === "concept-index",
      )?.semantic?.node;
      expect(node?.kind === "references" && node.entries[0].pageLabel).toBe(
        definitionPrinted ? "12" : "11",
      );
      expect(JSON.stringify(exchange)).toBe(manuscript);
      expect(() => withTextbookPageReferences(model, [])).toThrow(
        "PAGE_REFERENCE_MISSING",
      );
    },
  );
  it("fills a verified cross-section page without changing the stored manuscript", () => {
    const exchange = textbookFixture(2, 1);
    const target = exchange.units[0].sections[1].sectionKey;
    exchange.units[0].sections[0].blocks.unshift({
      blockId: "toc",
      kind: "text",
      markdown: "목차",
      semantic: {
        activity: "tableOfContents",
        node: {
          kind: "references",
          entries: [{ key: "target", label: "수업", targetSectionKey: target }],
        },
      },
    });
    const before = JSON.stringify(exchange);
    const model = createTextbookRenderModel(exchange, "student");
    const pages: TextbookPage[] = [
      {
        physicalPageIndex: 14,
        printedPageLabel: "14",
        unitKey: exchange.units[0].unitKey,
        sectionKey: target,
        unitTitle: "단원",
        sectionTitle: "수업",
        kind: "content",
        blocks: [],
      },
    ];
    const filled = withTextbookPageReferences(model, pages);
    const node = filled.sections[0].blocks.find(
      (block) => block.sourceBlockId === "toc",
    )?.semantic?.node;
    expect(node?.kind === "references" && node.entries[0].pageLabel).toBe("14");
    expect(JSON.stringify(exchange)).toBe(before);
    expect(() => withTextbookPageReferences(model, [])).toThrow(
      "PAGE_REFERENCE_MISSING",
    );
  });
  it("rejects a changed coordinate, page count or item placement instead of iterating", () => {
    const pages: TextbookPage[] = [
      {
        physicalPageIndex: 2,
        printedPageLabel: "2",
        unitKey: "unit",
        sectionKey: "section",
        unitTitle: "단원",
        sectionTitle: "수업",
        kind: "content",
        blocks: [
          {
            blockId: "block",
            itemId: "item",
            column: 1,
            xMm: 13,
            yMm: 40,
            widthMm: 80,
            heightMm: 50,
          },
        ],
      },
    ];
    expect(() =>
      assertTextbookReferenceLayoutUnchanged(pages, structuredClone(pages)),
    ).not.toThrow();
    const moved = structuredClone(pages);
    moved[0].blocks[0].yMm += 0.2;
    expect(() => assertTextbookReferenceLayoutUnchanged(pages, moved)).toThrow(
      "PAGE_REFERENCE_REFLOW",
    );
    expect(() => assertTextbookReferenceLayoutUnchanged(pages, [])).toThrow(
      "PAGE_REFERENCE_REFLOW",
    );
  });
});
