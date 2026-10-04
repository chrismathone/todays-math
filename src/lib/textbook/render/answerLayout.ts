import type { TextbookItem } from "@/contracts/textbookExchange.contract";
import type { TextbookSemantic } from "@/contracts/textbookSemantic.contract";

/**
 * How the answer variant sets one problem. The answer book is paginated on its own, so a
 * problem that sits in one of two columns for students may take the whole row there:
 * the question keeps the column it has in the student book — same width, same line breaks,
 * same figure size — and the answer and solution stand beside it instead of below it.
 *
 * Stacked in one column, a question with a tall figure plus its solution can be taller than a
 * continued page has room for. Beside each other the block is as tall as the taller of the two,
 * so it is never taller than the stacked block was.
 */
export type AnswerPlacement = "beside";

/** The gap between the two columns of a page, which the two halves of the block keep. */
export const ANSWER_CASE_COLUMN_GAP_MM = 7;

type ItemLayout = TextbookItem["layout"];

/**
 * The layout of a problem in the answer variant. Only a problem of a manuscript with semantic
 * metadata is set beside its answer. Unchanged, with no placement, when
 * - the block has no semantic metadata: a manuscript saved before it keeps the answer book it
 *   has always printed, stacked in the student's columns;
 * - the problem already spans both columns: its question keeps the width it was written for;
 * - it belongs to a linked example group: the pair keeps its own columns and widths;
 * - it comes from an original page: that page's layout is its own.
 * The stored layout object is returned as it is, never modified.
 */
export function answerCaseLayout(
  layout: ItemLayout,
  semantic: Pick<TextbookSemantic, "source" | "node"> | undefined,
): { layout: ItemLayout; placement?: AnswerPlacement } {
  if (
    !semantic ||
    layout.columnSpan !== 1 ||
    semantic.node?.kind === "exampleGroup" ||
    semantic.source
  )
    return { layout };
  return { layout: { ...layout, columnSpan: 2 }, placement: "beside" };
}

/** Two equal columns the width of a student column each. */
export const ANSWER_CASE_GRID_STYLE = `display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:${ANSWER_CASE_COLUMN_GAP_MM}mm;align-items:start`;
