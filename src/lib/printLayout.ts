import type { TestPrintProblem } from "@/components/print/types";
import { JASEUP_GEOMETRY } from "@/lib/printGeometry";

export interface AnswerKeyPage {
  problems: TestPrintProblem[];
  startingNumber: number;
}

/** 빠른 정답과 해설이 A4 높이를 넘지 않도록 정답 항목을 보수적으로 나눈다. */
export function paginateAnswerKey(
  problems: TestPrintProblem[],
): AnswerKeyPage[] {
  const pages: AnswerKeyPage[] = [];

  for (
    let index = 0;
    index < problems.length;
    index += JASEUP_GEOMETRY.answerEntriesPerPage
  ) {
    pages.push({
      problems: problems.slice(
        index,
        index + JASEUP_GEOMETRY.answerEntriesPerPage,
      ),
      startingNumber: index + 1,
    });
  }

  return pages;
}

/** Keep the existing eight-entry cap; split only pages proven to overflow in the
 * actual two-column DOM. A first-page quick-answer box may need its own page.
 */
export function splitOverflowingAnswerPages(
  pages: AnswerKeyPage[],
  cuts: ReadonlyMap<number, number>,
): AnswerKeyPage[] {
  const result: AnswerKeyPage[] = [];
  for (const [pageIndex, page] of pages.entries()) {
    const cut = cuts.get(pageIndex);
    if (
      cut === undefined ||
      cut < 0 ||
      cut >= page.problems.length ||
      (cut === 0 && pageIndex !== 0)
    ) {
      result.push(page);
      continue;
    }
    result.push({
      problems: page.problems.slice(0, cut),
      startingNumber: page.startingNumber,
    });
    result.push({
      problems: page.problems.slice(cut),
      startingNumber: page.startingNumber + cut,
    });
  }
  return result;
}
