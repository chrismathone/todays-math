import type { StudentExamReport } from "@/contracts/examReport.contract";
import { mmToCssPx, parseFigureDimensions } from "@/lib/figurePrintSize";
import { estimateProblemPx, type RulerMetrics } from "@/lib/printOverflow";
import { solutionForDisplay } from "@/lib/solutionSteps";

export type ExamReportQuestion = StudentExamReport["wrongQuestions"][number];

/** H1: 297mm − 위/아래 24 − 머리 35 − 쪽수 9 − 사이 여백 15 − 여유 7. 실측값은 아니다. */
export const WRONG_PAGE_BODY_MM = 207;
export const WRONG_QUESTION_GAP_MM = 8;
export const EXAM_REPORT_BODY_WIDTH_MM = 180;

const mmPerPx = 25.4 / 96;
const bodyWidth = mmToCssPx(EXAM_REPORT_BODY_WIDTH_MM);
const ruler: RulerMetrics = {
  unit: (11 * 96) / 72 / 2,
  line: ((11 * 96) / 72) * 1.65,
  problemColumn: bodyWidth,
  choiceTextColumn: (bodyWidth - 32) / 2 - 20,
  boxItemColumn: bodyWidth - 32,
  boxChrome: 64,
  fixedChrome: 0,
  choiceGridTop: 16,
  choiceRowGap: 8,
  figureBlockTop: 12,
  figureGap: 16,
  figureMaxWidth: mmToCssPx(70),
};

/** 기존 본문·그림·해설 규칙을 재사용한다. 조판 전 추정치이며 실측값은 아니다. */
export function estimateWrongQuestionMm(question: ExamReportQuestion): number {
  const figures = parseFigureDimensions(
    question.figureUrls.length,
    question.figureDims,
    question.figureSourceMm,
    question.figureUrls,
  );
  const stem = estimateProblemPx(
    question.content,
    figures,
    question.figureSvg,
    ruler,
    question.choiceFigureIndex,
  );
  const answer = estimateProblemPx(question.answer, [], null, {
    ...ruler,
    problemColumn: bodyWidth - mmToCssPx(15),
  });
  const solution = estimateProblemPx(
    solutionForDisplay(question.solution) || "해설이 등록되지 않았습니다.",
    [],
    null,
    {
      ...ruler,
      line: ((10 * 96) / 72) * 1.65,
      problemColumn: bodyWidth - mmToCssPx(15),
    },
  );
  // 표제·본문 위아래 18mm·정답/해설 간격·선. 긴 단원/유형도 표제 줄에 포함한다.
  const heading = estimateProblemPx(
    `${question.no}번 ${question.unitName} ${question.typeLabel ?? ""}`,
    [],
    null,
    ruler,
  );
  return Math.ceil((stem + answer + solution + heading) * mmPerPx + 26);
}

/** 문항을 통째로 옮긴다. 순서·원문·글자 크기를 바꾸지 않고 H1의 두 칸을 상한으로 쓴다. */
export function paginateWrongQuestions(
  questions: readonly ExamReportQuestion[],
): ExamReportQuestion[][] {
  const pages: ExamReportQuestion[][] = [];
  let page: ExamReportQuestion[] = [];
  let used = 0;
  for (const question of questions) {
    const height = estimateWrongQuestionMm(question);
    if (height > WRONG_PAGE_BODY_MM)
      throw new Error(
        `${question.no}번 문항이 한 쪽보다 깁니다. 문항·그림·해설의 지면을 확인해 주세요.`,
      );
    // H1의 두 칸은 같은 높이다. 합계만 맞아도 긴 쪽이 반쪽 칸을 넘을 수 있다.
    const slot = (WRONG_PAGE_BODY_MM - WRONG_QUESTION_GAP_MM) / 2;
    if (page.length && (page.length === 2 || Math.max(used, height) > slot)) {
      pages.push(page);
      page = [];
      used = 0;
    }
    used += (page.length ? WRONG_QUESTION_GAP_MM : 0) + height;
    page.push(question);
  }
  if (page.length) pages.push(page);
  return pages;
}
