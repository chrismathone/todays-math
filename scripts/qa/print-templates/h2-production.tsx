import React from "react";
import { createRoot } from "react-dom/client";
import { WorksheetPrint } from "@/components/unified/print/WorksheetPrint";
import { DEFAULT_PRINT_OPTIONS } from "@/components/unified/print/types";
import type { StudioProblem } from "@/components/unified/types";
import "@/app/globals.css";
import "katex/dist/katex.min.css";

const params = new URLSearchParams(location.search);
const count = Number(params.get("count") || 25);
const answers = [
  "③",
  "12",
  "①",
  "$\\frac{7}{3}$",
  "⑤",
  "②",
  "$x=2$",
  "④",
  "36",
  "$\\frac{5}{8}$",
  "①",
  "24 cm²",
  "③",
  "$x=1,\\;3$",
  "⑤",
  "②",
  "가로 12 cm, 세로 8 cm",
  "④",
  "$2(a+b)$",
  "①",
  "48",
  "⑤",
  "$\\frac{11}{4}$",
  "③",
  Array.from({ length: 10 }, (_, i) => `(${i + 1}) $${12 * (i + 1)}$`).join(
    " ",
  ),
];
const fixture: StudioProblem[] = Array.from({ length: count }, (_, i) => ({
  id: `h2-${i + 1}`,
  content:
    "다음 식을 계산하고 조건에 맞는 값을 구하시오. $\\frac{2}{3}+\\frac{1}{6}$",
  answer: answers[i % 25],
  solution: `조건을 식으로 나타내어 계산합니다. 정답은 ${answers[i % 25]}입니다.`,
  grade: "중1",
  chapter: "수와 식",
  section: "종합 확인",
  difficulty: "중",
  problemCode: `H2-${i + 1}`,
  figureUrls: [],
  figureDims: [],
  figureSourceMm: [],
  figureSvg: null,
}));
const options = {
  ...DEFAULT_PRINT_OPTIONS,
  showAnswers: true,
  quickAnswerOnly: params.get("quick") === "true",
  columns: Number(params.get("columns") || 2) as 1 | 2,
};
const meta = {
  title: `수학 종합 확인 · ${count}문항`,
  subject: "수학",
  grade: "중1",
  schoolName: "측정학교",
};
Object.assign(window, { measurementFixture: { fixture, options, meta } });
createRoot(document.getElementById("root")!).render(
  <WorksheetPrint
    selected={fixture}
    title={meta.title}
    options={options}
    printMeta={meta}
    onReady={(ready) => {
      document.documentElement.dataset.ready = String(ready);
    }}
  />,
);
