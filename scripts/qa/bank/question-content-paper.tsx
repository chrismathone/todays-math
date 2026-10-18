/** Private, local fixture adapter to the real student/teacher TestPrint components. */
import { createRoot } from "react-dom/client";
import { TestPrint } from "@/components/print/TestPrint";
import type {
  TestPrintDocument,
  TestPrintProblem,
} from "@/components/print/types";
import "katex/dist/katex.min.css";
import "@/app/globals.css";

type Candidate = Omit<TestPrintProblem, "id" | "orderIndex"> & {
  externalId: string;
  unitId: string;
  grade: string;
  section: string;
};
const params = new URLSearchParams(location.search);
const mode = params.get("mode") === "answers" ? "answers" : "questions";
const group = params.get("group") ?? "all";
const sentinel = params.get("sentinel") === "1";
const qa = {
  status: "loading",
  group,
  mode,
  sentinel,
  rows: 0,
  ids: [] as string[],
  expectedSvgRows: 0,
};
Object.assign(window, { __QUESTION_CONTENT_PAPER_QA__: qa });
void fetch("/candidate-batch.json")
  .then(async (response) => {
    if (!response.ok) throw new Error(`Private fixture ${response.status}`);
    const batch = (await response.json()) as { rows: Candidate[] };
    const rows = batch.rows.filter(
      (row) => group === "all" || row.unitId === group,
    );
    if (!rows.length) throw new Error("Empty print fixture");
    qa.rows = rows.length;
    qa.ids = rows.map((row) => row.externalId);
    qa.expectedSvgRows = rows.filter((row) => row.figureSvg).length;
    const data: TestPrintDocument = {
      testId: null,
      testType: "daily",
      testDate: "2026.10.18",
      className: "수학 문항 검토",
      section: `${rows[0]!.grade} ${rows[0]!.section}`,
      todayGoal: "조건을 읽고 근거를 확인한다.",
      conceptNote: "",
      problems: rows.map((row, orderIndex) => ({
        ...row,
        id: row.externalId,
        orderIndex,
        figureUrls: [],
        solution: sentinel
          ? `${row.solution ?? ""}\n\nQUESTION_CONTENT_PRIVATE_${orderIndex}`
          : row.solution,
      })),
    };
    createRoot(document.getElementById("root")!).render(
      <TestPrint data={data} initialMode={mode} />,
    );
    qa.status = "ready";
  })
  .catch((error) => {
    qa.status = "error";
    console.error(error);
  });
