import { createRoot } from "react-dom/client";
import { TestPrint } from "@/components/print/TestPrint";
import type { TestPrintDocument, TestPrintProblem } from "@/components/print/types";
import "katex/dist/katex.min.css";
import "@/app/globals.css";

type Candidate = Omit<TestPrintProblem, "id" | "orderIndex"> & {
  externalId: string;
  unitId: string;
  section: string;
  grade: string;
  familyKey: string;
};
const params = new URLSearchParams(location.search);
const mode = params.get("mode") === "answers" ? "answers" : "questions";
const group = params.get("group") ?? "native";
const sentinel = params.get("sentinel") === "1";
const qa = { status: "loading", group, mode, sentinel, rows: 0, ids: [] as string[], expectedSvgRows: 0 };
Object.assign(window, { __BANK_PAPER_QA__: qa });

void fetch("/candidate-batch.json")
  .then(async response => {
    if (!response.ok) throw new Error(`Candidate fixture ${response.status}`);
    return await response.json() as { rows: Candidate[] };
  })
  .then(batch => {
    const rows = batch.rows.filter(row => group === "all" ||
      (group === "native" ? row.questionType === "서술형" : row.unitId === group));
    if (rows.length === 0) throw new Error("No candidates for this paper group");
    qa.rows = rows.length;
    qa.ids = rows.map(row => row.externalId);
    qa.expectedSvgRows = rows.filter(row => row.figureSvg).length;
    const document: TestPrintDocument = {
      testId: null,
      testType: "daily",
      testDate: "2026.10.18",
      className: "수학 보강 검토",
      section: group === "native" ? "서술형 보강" : `${rows[0].grade} ${rows[0].section}`,
      todayGoal: "조건을 읽고 풀이의 근거를 설명한다.",
      conceptNote: "",
      problems: rows.map((row, index) => ({
        ...row,
        id: row.externalId,
        orderIndex: index,
        problemCode: null,
        figureUrls: [],
        solution: sentinel ? `${row.solution ?? ""}\n\n교사용 검수표식 BANK_RUBRIC_PRIVATE_${index}` : row.solution,
      })),
    };
    createRoot(window.document.getElementById("root")!).render(
      <TestPrint data={document} initialMode={mode} />,
    );
    qa.status = "ready";
  })
  .catch(error => {
    qa.status = "error";
    console.error(error instanceof Error ? error.message : "Paper preview failed");
  });
