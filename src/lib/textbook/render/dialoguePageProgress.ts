import type { TextbookPage } from "../layout/paginate";
import type { TextbookRenderModel } from "./model";
import { isDialoguePlacement } from "./blocks/dialogue";

/** Count a new lesson's measured pages, including publisher fragments, from layout metadata only. */
export function dialoguePageProgress(
  page: TextbookPage,
  pages: readonly TextbookPage[],
  model: TextbookRenderModel,
): { index: number; total: number } | undefined {
  const semanticDialogueIds = new Set(
    model.sections.flatMap((section) =>
      section.blocks.flatMap((block) =>
        isDialoguePlacement(block) && block.semantic && !block.semantic.source
          ? [block.id]
          : [],
      ),
    ),
  );
  const currentIds = new Set(
    page.blocks.flatMap((block) =>
      semanticDialogueIds.has(block.blockId) ? [block.blockId] : [],
    ),
  );
  if (!currentIds.size) return undefined;
  const key = (value: string) => value.replace(/\.part-\d+$/, "");
  const lessonPages = pages.filter(
    (candidate) =>
      candidate.kind === "content" &&
      candidate.unitKey === page.unitKey &&
      key(candidate.sectionKey) === key(page.sectionKey) &&
      candidate.editorialStage === "opening",
  );
  const index = lessonPages.findIndex((candidate) =>
    candidate.blocks.some((block) => currentIds.has(block.blockId)),
  );
  return index < 0
    ? undefined
    : { index: index + 1, total: lessonPages.length };
}
