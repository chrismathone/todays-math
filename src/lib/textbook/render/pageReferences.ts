import type { TextbookExchange } from "@/contracts/textbookExchange.contract";
import type { TextbookPage } from "../layout/paginate";
import type { TextbookRenderModel } from "./model";

export function hasTextbookPageReferences(exchange: TextbookExchange): boolean {
  return exchange.units.some((unit) =>
    unit.sections.some((section) =>
      section.blocks.some(
        (block) => block.semantic?.node?.kind === "references",
      ),
    ),
  );
}

/** Fill reserved page-number cells once, using only verified server layout positions. */
export function withTextbookPageReferences(
  model: TextbookRenderModel,
  pages: readonly TextbookPage[],
  requireAll = true,
): TextbookRenderModel {
  const sections = new Map<string, string>();
  const items = new Map<string, string>();
  const concepts = new Map<string, string>();
  const blocks = new Map(
    model.sections.flatMap((section) =>
      section.blocks.map((block) => [block.id, block] as const),
    ),
  );
  for (const page of pages) {
    if (page.kind !== "content") continue;
    const sectionKey = `${page.unitKey}:${page.sectionKey}`;
    if (!sections.has(sectionKey))
      sections.set(sectionKey, page.printedPageLabel);
    for (const placement of page.blocks) {
      const block = blocks.get(placement.blockId);
      if (block) {
        const ownerKey = `${block.unitKey}:${block.sectionKey}`;
        if (!sections.has(ownerKey))
          sections.set(ownerKey, page.printedPageLabel);
        if (
          block.semantic?.node?.kind === "concept" &&
          !concepts.has(block.semantic.node.conceptId)
        )
          concepts.set(block.semantic.node.conceptId, page.printedPageLabel);
      }
      if (placement.itemId) items.set(placement.itemId, page.printedPageLabel);
    }
  }
  return {
    ...model,
    sections: model.sections.map((section) => ({
      ...section,
      blocks: section.blocks.map((block) => {
        const semantic = block.semantic;
        if (semantic?.node?.kind !== "references") return block;
        return {
          ...block,
          semantic: {
            ...semantic,
            node: {
              ...semantic.node,
              entries: semantic.node.entries.map((entry) => {
                const sectionMatches =
                  entry.targetSectionKey && !entry.targetUnitKey
                    ? [...sections].filter(([key]) =>
                        key.endsWith(`:${entry.targetSectionKey}`),
                      )
                    : [];
                if (
                  sectionMatches.length > 1 &&
                  !sections.has(`${block.unitKey}:${entry.targetSectionKey}`)
                )
                  throw new Error(`PAGE_REFERENCE_AMBIGUOUS: ${entry.key}`);
                const pageLabel = entry.targetItemId
                  ? items.get(entry.targetItemId)
                  : entry.targetConceptId
                    ? concepts.get(entry.targetConceptId)
                    : entry.targetSectionKey
                      ? (sections.get(
                          `${entry.targetUnitKey ?? block.unitKey}:${entry.targetSectionKey}`,
                        ) ??
                        (!entry.targetUnitKey
                          ? sectionMatches[0]?.[1]
                          : undefined))
                      : entry.pageLabel;
                if (!pageLabel && requireAll)
                  throw new Error(`PAGE_REFERENCE_MISSING: ${entry.key}`);
                return { ...entry, ...(pageLabel ? { pageLabel } : {}) };
              }),
            },
          },
        };
      }),
    })),
  };
}

/** A filled reference cannot move a page, block, writing space or item placement. */
export function assertTextbookReferenceLayoutUnchanged(
  reserved: readonly TextbookPage[],
  final: readonly TextbookPage[],
): void {
  const fail = () => {
    throw new Error(
      "PAGE_REFERENCE_REFLOW: 쪽수 참조를 채운 뒤 배치가 달라졌습니다.",
    );
  };
  if (reserved.length !== final.length) fail();
  reserved.forEach((before, pageIndex) => {
    const after = final[pageIndex];
    if (
      !after ||
      before.physicalPageIndex !== after.physicalPageIndex ||
      before.sectionKey !== after.sectionKey ||
      before.blocks.length !== after.blocks.length
    )
      fail();
    before.blocks.forEach((block, blockIndex) => {
      const other = after.blocks[blockIndex];
      if (
        !other ||
        block.blockId !== other.blockId ||
        block.itemId !== other.itemId ||
        block.column !== other.column ||
        ["xMm", "yMm", "widthMm", "heightMm"].some(
          (key) => Math.abs(block[key as "xMm"] - other[key as "xMm"]) > 0.01,
        )
      )
        fail();
    });
  });
}
