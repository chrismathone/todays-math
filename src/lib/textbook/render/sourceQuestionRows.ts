import type { TextbookRenderModel } from "./model";

/** The native template aligns the heading and prompt within each two-column row. */
export function sourceQuestionRowPlan(model: TextbookRenderModel): Array<{
  ids: string[];
  alignPrompt: boolean;
}> {
  const groups: Array<{ ids: string[]; alignPrompt: boolean }> = [];
  for (const section of model.sections) {
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
  }
  return groups;
}
