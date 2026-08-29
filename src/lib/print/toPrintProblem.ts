/**
 * DB 행 → 시험지 지면이 받는 문항(`TestPrintProblem`).
 *
 * ## 🔴 왜 함수로 뺐나 (2026-08-29)
 *
 * 이 매핑이 인쇄 페이지 안에 **인라인으로** 있었고, 그래서 `problem.figureSvg`
 * 컬럼이 생긴 뒤로도 아무도 안 담았다. 결과: 엔진 문항(실측 4,640건)의 그림이
 * **시험지에 한 장도 안 나갔다** — 화면(`ProblemCard`)은 넘기는데 지면만 안 넘겼고,
 * 「다음 그림에서…」라고 적힌 문항이 그림 없이 인쇄됐다.
 *
 * 인라인 매핑은 **시험할 자리가 없다.** 여기로 옮기면 「그림에 관한 컬럼을 다
 * 담았는가」를 시험이 물을 수 있다(`toPrintProblem.test.ts`).
 *
 * ⚠️ 그림에 관한 컬럼을 새로 만들면 **여기와 `PRINT_FIGURE_FIELDS` 에 같이 넣어라.**
 *    안 넣으면 지면은 조용히 옛 모습으로 남고, 그건 원장님이 종이에서 찾아 주실
 *    때까지 아무도 모른다(CLAUDE.md 2026-08-20 「배포본만 조용히 깨진다」와 같은 자리).
 */
import type { TestPrintProblem } from "@/components/print/types";

/** 지면이 읽는 DB 행 — 이 함수가 보는 것은 이 컬럼들뿐이다. */
export interface PrintableProblemRow {
  id: string;
  problemCode?: string | null;
  content: string;
  answer: string;
  solution: string | null;
  questionType?: string | null;
  figureUrls?: string[];
  figureDims?: number[];
  figureSourceMm?: number[];
  figureSvg?: string | null;
}

/**
 * 그림이 지면까지 가는 데 필요한 컬럼 목록. **시험이 이 배열을 읽어**
 * 「하나도 안 빠졌는가」를 묻는다 — 손 목록을 두 벌 두지 않는다.
 */
export const PRINT_FIGURE_FIELDS = [
  "figureUrls",
  "figureDims",
  "figureSourceMm",
  "figureSvg",
] as const satisfies readonly (keyof TestPrintProblem)[];

export function toPrintProblem(
  problem: PrintableProblemRow,
  orderIndex: number,
): TestPrintProblem {
  return {
    id: problem.id,
    orderIndex,
    problemCode: problem.problemCode,
    content: problem.content,
    answer: problem.answer,
    solution: problem.solution,
    // 본문에서 원본 라벨 `[서술형 3]` 을 걷어낸 뒤로 지면의 「서술형 n」 표시는
    // **이 컬럼 하나**에 달려 있다(assignEssayLabels).
    questionType: problem.questionType,
    // 원본에서 오려 온 그림 — 인쇄물에도 같이 나가야 문제가 성립한다.
    figureUrls: problem.figureUrls,
    // 그림 원본 치수 — 넘침 판정이 그림 높이를 계산하는 유일한 근거다.
    // 판정은 브라우저에서 돌아 이미지 파일을 읽을 수 없다(printOverflow.ts).
    figureDims: problem.figureDims,
    // 원본 지면에서 그 그림이 차지하던 **물리 폭(mm)** — 「얼마로 그린다」의
    // 유일한 근거다. 비면 «모른다»라 픽셀로 그린다.
    figureSourceMm: problem.figureSourceMm,
    // 엔진이 그린 인라인 SVG — **엔진 문항의 그림은 이것뿐**이고 `figureUrls` 는
    // 비어 있다. 안 담으면 그림 없는 시험지가 나간다(2026-08-29 까지 그랬다).
    figureSvg: problem.figureSvg,
  };
}
