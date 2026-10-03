import React from "react";
import { createRoot } from "react-dom/client";
import { ProblemContent } from "../../src/components/math/ProblemContent";
import { BANK_CHOICE_FIGURES } from "../../src/__tests__/fixtures/bankChoiceFigures";
import "katex/dist/katex.min.css";
import "../../src/app/globals.css";
import "./choice-figures.css";

const params = new URLSearchParams(location.search);
const teacher = params.get("view") === "teacher";
const images = import.meta.glob<string>(
  [
    "../../scripts/import/exam-paper/exams/2025-daeguil-3-2-mid/figures/*.png",
    "../../scripts/import/exam-paper/exams/2025-sinmyeongyeo-3-2-mid/figures/*.png",
  ],
  { eager: true, query: "?url", import: "default" },
);
createRoot(document.getElementById("root")!).render(
  <main data-sheet>
    <h1>보기 그림 검수 · {teacher ? "교사용" : "학생용"}</h1>
    <div data-columns>
      {BANK_CHOICE_FIGURES.map((problem, index) => (
        <section key={problem.id} data-problem={problem.id}>
          <h2>{index + 1}</h2>
          <ProblemContent
            {...problem}
            figureUrls={problem.figureUrls.map((url) => images[`../..${url}`]!)}
            deferFigures={false}
          />
          {teacher ? <p>정답 {problem.answer}</p> : null}
        </section>
      ))}
    </div>
  </main>,
);
