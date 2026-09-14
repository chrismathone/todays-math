import type { ContentBlock } from "@/lib/mathgen/contracts";
import type { StudioCrop, StudioFigure } from "./studioHelpers";

/** Keep numbered body/choice/table references attached to the same surviving figure. */
export function retainStudioFigures(
  crop: StudioCrop,
  figures: StudioFigure[],
): Partial<StudioCrop> {
  const previous = crop.figures ?? [];
  if (
    previous.length === figures.length &&
    previous.every((figure, index) => figure.id === figures[index].id)
  )
    return { figures };
  const positions = new Map(
    figures.map((figure, index) => [figure.id, index + 1]),
  );
  const remap = (value: string) =>
    value.replace(/\[그림\s*(\d+)\]/g, (marker, raw: string) => {
      const figure = previous[Number(raw) - 1];
      if (!figure) return marker;
      const number = positions.get(figure.id);
      return number === undefined ? "" : `[그림${number}]`;
    });
  const blocks = (items: ContentBlock[]) =>
    items.map((block) => ({
      ...block,
      value: remap(block.value),
      rows: block.rows.map((row) => row.map(remap)),
    }));
  const choices = (items: NonNullable<StudioCrop["ocr"]>["choiceGroups"]) =>
    items.map((choice) => ({ ...choice, contents: blocks(choice.contents) }));
  return {
    figures,
    content: remap(crop.content),
    ...(crop.ocr
      ? {
          ocr: {
            ...crop.ocr,
            blocks: blocks(crop.ocr.blocks),
            choiceGroups: choices(crop.ocr.choiceGroups),
            subQuestions: crop.ocr.subQuestions.map((question) => ({
              ...question,
              contents: blocks(question.contents),
              ...(question.choices
                ? { choices: choices(question.choices) }
                : {}),
            })),
          },
        }
      : {}),
  };
}
