import type { TestPrintProblem } from "@/components/print/types";
import {
  EXAM_COLUMN_GEOMETRY,
  estimateExamProblemPx,
  seatExamProblemPx,
} from "@/lib/print/examRuler";
import { packColumns, type PackedColumnPage } from "@/lib/print/packColumns";

/**
 * 기출 2단 시험지를 **장·단으로 나눈다.** 자·안전여유·기하를 한 자리에서 묶는다.
 *
 * 부르는 쪽(화면·인쇄)이 이 셋을 따로 조립하면 배선이 두 벌이 되고, 한쪽만 고치면
 * 「미리보기와 인쇄가 다른 쪽수」가 된다 — 그건 종이를 받고서야 안다.
 */
export interface PackedExamPaper {
  pages: PackedColumnPage<TestPrintProblem>[];
  /**
   * 한 단을 통째로 써도 안 들어가는 문항. **버린 것이 아니라 앉힌 것**이고,
   * 화면이 표시하고 사람이 손대야 하는 목록이다.
   */
  tooTall: TestPrintProblem[];
  /** 문항 id → 자가 잰 세로(안전여유 **없는** 값). 검수 화면이 보여 준다. */
  estimatedPx: Map<string, number>;
}

export function packExamPaper(
  problems: readonly TestPrintProblem[],
): PackedExamPaper {
  const packed = packColumns(problems, seatExamProblemPx, EXAM_COLUMN_GEOMETRY);
  return {
    pages: packed.pages,
    tooTall: packed.tooTall,
    estimatedPx: new Map(problems.map((p) => [p.id, estimateExamProblemPx(p)])),
  };
}
