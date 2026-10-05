import type {
  TextbookSemantic,
  TextbookSourceFragment,
} from "@/contracts/textbookSemantic.contract";
import type { TextbookRenderModel } from "./model";

/** The native template aligns the heading and prompt within each two-column row. */
export function sourceQuestionRowPlan(
  model: TextbookRenderModel,
  firstPhysicalPageIndex?: number,
): Array<{
  ids: string[];
  alignPrompt: boolean;
}> {
  const groups: Array<{ ids: string[]; alignPrompt: boolean }> = [];
  const grids: Array<{
    sectionIndex: number;
    ids: string[];
    source: NonNullable<TextbookSemantic["source"]>;
    daily: boolean;
  }> = [];
  const hasDaily = (node: TextbookSourceFragment): boolean =>
    Boolean(
      node.attributes?.className?.split(/\s+/).includes("daily-banner") ||
      node.children?.some(hasDaily),
    );
  for (const [sectionIndex, section] of model.sections.entries()) {
    let row: string[] = [];
    const flush = () => {
      if (row.length === 2) groups.push({ ids: row, alignPrompt: true });
      row = [];
    };
    for (const block of section.blocks) {
      if (
        block.kind === "problem" &&
        block.semantic?.source &&
        block.semantic.node?.kind !== "exampleGroup" &&
        block.layout.columnSpan === 1
      ) {
        row.push(block.id);
        if (row.length === 2) flush();
      } else {
        flush();
        if (
          block.kind === "text" &&
          block.semantic?.source &&
          block.semantic.node?.kind === "exampleGroup"
        ) {
          const group = block.semantic.node;
          const pair = [group.exampleItemId, group.confirmItemIds[0]].map(
            (id) =>
              section.blocks.find(
                (member) => member.kind === "problem" && member.itemId === id,
              )?.id,
          );
          if (pair.every((id) => id !== undefined))
            groups.push({ ids: pair as string[], alignPrompt: false });
        }
      }
    }
    flush();
    // The first direct native grid is a consecutive run; linked example groups
    // and later grids retain their separate local alignment.
    const start = section.blocks.findIndex(
      (block) =>
        block.kind === "problem" &&
        block.semantic?.source?.kind === "exercise" &&
        block.semantic.node?.kind !== "exampleGroup" &&
        block.layout.columnSpan === 1,
    );
    if (start >= 0) {
      const source = section.blocks[start].semantic!.source!;
      const ids: string[] = [];
      for (const block of section.blocks.slice(start)) {
        if (
          block.kind !== "problem" ||
          block.layout.columnSpan !== 1 ||
          block.semantic?.node?.kind === "exampleGroup" ||
          block.semantic?.source?.kind !== "exercise" ||
          block.semantic.source.unit !== source.unit ||
          block.semantic.source.page !== source.page ||
          (block.semantic.source.sectionName ?? "") !==
            (source.sectionName ?? "")
        )
          break;
        ids.push(block.id);
      }
      grids.push({
        sectionIndex,
        ids,
        source,
        daily: section.blocks.some(
          (block) =>
            block.semantic?.node?.kind === "fragments" &&
            block.semantic.node.fragments.some(hasDaily),
        ),
      });
    }
  }
  // A bounded source chunk must start on its authored physical page before the
  // native even/odd pairing is known. Other placements keep local pairs.
  const firstSource = model.sections
    .flatMap((section) => section.blocks)
    .find((block) => block.semantic?.source)?.semantic?.source;
  if (
    model.variant !== "student" ||
    firstPhysicalPageIndex === undefined ||
    firstSource?.page !== firstPhysicalPageIndex
  )
    return groups;
  for (let index = 0; index < grids.length - 1; index++) {
    const left = grids[index],
      right = grids[index + 1];
    if (
      right.sectionIndex !== left.sectionIndex + 1 ||
      left.source.page % 2 ||
      right.source.page !== left.source.page + 1 ||
      left.source.unit !== right.source.unit ||
      (left.source.sectionName ?? "") !== (right.source.sectionName ?? "") ||
      !left.ids.length ||
      left.ids.length % 2 ||
      left.ids.length !== right.ids.length ||
      left.daily !== right.daily
    )
      continue;
    for (let at = 0; at < left.ids.length; at += 2) {
      const leftPair = left.ids.slice(at, at + 2),
        rightPair = right.ids.slice(at, at + 2);
      const leftGroup = groups.find(
        (group) =>
          group.alignPrompt && group.ids.join("\0") === leftPair.join("\0"),
      );
      const rightIndex = groups.findIndex(
        (group) =>
          group.alignPrompt && group.ids.join("\0") === rightPair.join("\0"),
      );
      if (!leftGroup || rightIndex < 0)
        throw new Error("Missing native source spread row");
      leftGroup.ids.push(...rightPair);
      groups.splice(rightIndex, 1);
    }
    index++;
  }
  return groups;
}
