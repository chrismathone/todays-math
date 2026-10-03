import type { TestPrintProblem } from "@/components/print/types";
import { parseFigureDimensions } from "@/lib/figurePrintSize";
import { EXAM_MEASURED_PX } from "@/lib/printGeometry";
import { estimateProblemPx, EXAM_RULER } from "@/lib/printOverflow";

/**
 * **기출 2단 지면에서 문항 하나가 먹는 세로 픽셀.**
 *
 * 자체 자를 만들지 않는다 — `estimateProblemPx` 에 기출 **치수**(`EXAM_RULER`)만
 * 끼워 넣는다. 줄 세는 법·상자·보기·그림 규칙은 자습과 한 벌이라, 한쪽만 고쳐
 * 조용히 갈리는 일이 없다.
 *
 * ## 자습 자에 없는 것은 **아무것도 없다**
 *
 * 원장님이 서술형 답란을 **문제지에서 빼기로** 하셨으므로(2026-09-05, 답안지 별도),
 * 이 자는 자습 자에 치수만 갈아 끼운 것 그대로다. 소문항도 안 자른다 —
 * 지면이 안 자르는 것을 자가 자르면 그 순간 둘이 갈린다.
 *
 * ⚠️ 이 값은 추정이다. **참은 실측**이고(`scripts/qa/measure-exam-paper-units.tsx`),
 *    채점은 `scripts/qa/eval-exam-ruler.ts` 가 그 실측에 대고 한다 —
 *    채점의 정답을 제품 상수에서 가져오면 제품이 틀릴수록 점수가 오른다.
 */
export function estimateExamProblemPx(problem: TestPrintProblem): number {
  const figures = parseFigureDimensions(
    (problem.figureUrls ?? []).length,
    problem.figureDims,
    problem.figureSourceMm,
    problem.figureUrls,
  );
  return estimateProblemPx(
    problem.content,
    figures,
    problem.figureSvg ?? null,
    EXAM_RULER,
    problem.choiceFigureIndex,
  );
}

/** 기출 2단 지면의 단 기하 — `packColumns` 에 그대로 넘긴다. */
export const EXAM_COLUMN_GEOMETRY = {
  firstPageColumnPx: EXAM_MEASURED_PX.firstPageColumn,
  continuationColumnPx: EXAM_MEASURED_PX.continuationColumn,
  columnsPerPage: EXAM_MEASURED_PX.columnsPerPage,
  gapPx: EXAM_MEASURED_PX.itemGap,
} as const;

/**
 * 자를 믿고 쓰기 전에 **비워 두는 세로**.
 *
 * 실측 채점(`scripts/qa/eval-exam-ruler.ts`, 정화중 25-2-중간 19문항):
 * ```
 * |오차| <= 20px  18/19 (94.7%)   평균 |오차| 5.8px
 * 과소(놓침 위험)  1건 · 최악 -22px   과대 0건
 * ```
 * 남은 과소는 전부 **객관식**이고 크기가 본문 한 줄(20px) 언저리다 —
 * `displayWidth` 가 글리프 근사라 **보기 한 줄이 접히는 것을 못 보는** 부류다.
 * 자를 19건에 맞춰 깎으면 그 표본에서만 좋아진다(과적합).
 *
 * 🔴 **과소는 곧 놓침이고, 놓침은 겹쳐 찍힌 시험지로 간다.** 그래서 실측 최악
 *    과소(-22px)를 덮는 값을 문항마다 비워 둔다. 대가는 단마다 약 6% 의 여백이다.
 *
 * ⚠️ **이 값은 한 편(19문항)에서 나왔다.** 기출이 더 들어오면 다시 채점하고 이 수를
 *    갱신할 것 — 오늘 자 데이터의 성적을 판정의 성적으로 적지 말 것(CLAUDE.md 2026-08-18).
 */
export const EXAM_SAFETY_PX = 24;

/** 안전여유를 더한 높이 — **배치는 이것을 쓴다.** 채점은 여유 없는 자를 본다. */
export function seatExamProblemPx(problem: TestPrintProblem): number {
  return estimateExamProblemPx(problem) + EXAM_SAFETY_PX;
}
