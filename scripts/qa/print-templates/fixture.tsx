import React from "react";
import { createRoot } from "react-dom/client";
import { WorksheetPrint } from "../../../src/components/unified/print/WorksheetPrint";
import {
  DEFAULT_PRINT_OPTIONS,
  type PrintTemplate,
} from "../../../src/components/unified/print/types";
import type { StudioProblem } from "../../../src/components/unified/types";
import "../../../src/app/globals.css";
import "katex/dist/katex.min.css";

// Authored synthetic content: no bank, account, API or database dependency.
const stems = [
  ["다음을 계산하시오. $\\frac{2}{3}+\\frac{1}{6}$", "\\frac{5}{6}"],
  ["$3x+7=22$를 만족하는 $x$의 값은?\n① 3\n② 4\n③ 5\n④ 6\n⑤ 7", "③"],
  [
    "그림은 가로가 8 cm, 세로가 5 cm인 직사각형이다. 이 직사각형의 둘레를 구하시오.",
    "26 cm",
  ],
  [
    "어느 도서관에서 월요일에 빌려 간 책은 120권이었다. 화요일에는 월요일보다 30권 더 빌려 갔고, 수요일에는 화요일에 빌려 간 책의 3분의 2를 빌려 갔다. 세 날 동안 빌려 간 책의 수를 모두 더한 뒤, 하루에 평균 몇 권을 빌려 갔는지 구하시오. 계산 과정을 식으로 나타내시오.",
    "\\frac{370}{3}권",
  ],
  [
    "다음 중 $0.75$와 같은 수를 고르시오.\n① $\\frac{1}{4}$\n② $\\frac{1}{2}$\n③ $\\frac{3}{4}$\n④ $\\frac{4}{5}$\n⑤ $\\frac{5}{4}$",
    "③",
  ],
] as const;
export const fixture: StudioProblem[] = Array.from({ length: 25 }, (_, i) => ({
  id: `print-measure-${String(i + 1).padStart(2, "0")}`,
  content: stems[i % 5][0],
  answer: stems[i % 5][1],
  solution: "조건을 식으로 나타내고 계산한다.",
  grade: "중1",
  chapter: "수와 식",
  section: ["분수 계산", "일차방정식", "도형", "문장제", "수의 표현"][i % 5],
  difficulty: i % 5 === 3 ? "상" : "중",
  problemCode: `QA-${i + 1}`,
  questionType: i % 5 === 1 || i % 5 === 4 ? "multiple-choice" : "short-answer",
  figureUrls: [],
  figureDims: [],
  figureSourceMm: [],
  figureSvg:
    i % 5 === 2
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="110" viewBox="0 0 200 110"><rect x="25" y="20" width="150" height="65" fill="white" stroke="black" stroke-width="2"/><text x="90" y="103" font-size="12">8 cm</text><text x="2" y="56" font-size="12">5</text></svg>'
      : null,
}));
export const meta = {
  title: "수학 종합 확인 · 25문항",
  subject: "수학",
  schoolName: "측정학교",
  grade: "중1",
  semester: "2학기",
  examDate: "2026-10-20",
  examDuration: "50분",
  totalScore: 100,
  examiner: "측정교사",
  academyName: "측정학원",
  instructorName: "측정교사",
  todayGoal: "조건을 읽고 식으로 나타내기",
  conceptNote:
    "분수는 분모를 같게 하여 더합니다. 방정식은 양변에 같은 연산을 하여 풉니다.",
  patternName: "수와 식 종합",
  patternStrategy: "조건 확인 → 식 세우기 → 계산 확인",
};
const template =
  (new URLSearchParams(location.search).get("template") as PrintTemplate) ||
  "jeongtong";
const options = { ...DEFAULT_PRINT_OPTIONS, template };
const onReady = (ready: boolean) => {
  document.documentElement.dataset.ready = String(ready);
};
Object.assign(window, { measurementFixture: { fixture, meta, options } });
createRoot(document.getElementById("root")!).render(
  <WorksheetPrint
    selected={fixture}
    title={meta.title}
    options={options}
    printMeta={meta}
    onReady={onReady}
  />,
);
