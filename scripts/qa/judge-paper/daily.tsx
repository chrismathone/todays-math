// 판정형 표본을 제품의 **일일테스트 지면**(`TestPrint` — 문제지 · 정답지)으로 그린다. 따로 그리지 않는다.
//   /?set=<묶음>&mode=questions|answers
import { createRoot } from "react-dom/client";

import { TestPrint } from "@/components/print/TestPrint";
import type { TestPrintDocument } from "@/components/print/types";

import "katex/dist/katex.min.css";
import "@/app/globals.css";

type Sample = {
  externalId: string;
  content: string;
  answer: string;
  solution: string;
};
type SampleSet = { section: string; goal: string; samples: Sample[] };

const params = new URLSearchParams(location.search);
const mode = params.get("mode") === "answers" ? "answers" : "questions";
const set = params.get("set") ?? "s1";

void fetch(`/samples-${set}.json`)
  .then((r) => r.json() as Promise<SampleSet>)
  .then((data) => {
    const doc: TestPrintDocument = {
      testId: null,
      testType: "daily",
      testDate: "2026-10-08 (표본)",
      className: "판정형 표본",
      section: data.section,
      todayGoal: data.goal,
      conceptNote: "",
      problems: data.samples.map((s, i) => ({
        id: s.externalId,
        orderIndex: i,
        problemCode: null,
        content: s.content,
        answer: s.answer,
        solution: s.solution,
        questionType: "객관식",
        figureUrls: [],
        figureSvg: null,
      })),
    };
    createRoot(document.getElementById("root")!).render(
      <TestPrint data={doc} initialMode={mode} />,
    );
  });
