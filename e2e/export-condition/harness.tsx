import { useState } from "react";
import { createRoot } from "react-dom/client";
import WorksheetEditor from "../../src/components/unified/WorksheetEditor";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
  type PrintOptions,
} from "../../src/components/unified/print/types";
import type { StudioProblem } from "../../src/components/unified/types";
import workroom from "../../src/components/unified/Workroom.module.css";
import "../../src/app/globals.css";
import "katex/dist/katex.min.css";

const noop = () => {};
const problem: StudioProblem = {
  id: "synthetic-condition",
  content: "다음 조건을 만족하는 수를 구하시오.",
  answer: "2",
  solution: "",
  grade: "중1",
  chapter: "방정식",
  section: "일차방정식",
  difficulty: "기본",
  problemCode: "",
  figureUrls: [],
  figureSvg: null,
  figureDims: [],
  figureSourceMm: [],
  ocr: {
    number: 1,
    confidence: "high",
    choicesLayout: "auto",
    bodyMissing: false,
    choicesMissing: false,
    blocks: [
      { type: "text", value: "다음 조건을 만족하는 수를 구하시오.", rows: [] },
      {
        type: "text",
        value:
          "<조건> • 첫째 조건은 두 수의 합이 $3$이라는 것이다.\n이 설명도 같은 조건 상자 안에 놓인다. • 둘째 조건은 작은 수가 $1$이라는 것이다.",
        rows: [],
      },
    ],
    choiceGroups: [],
    subQuestions: [],
  },
};
const selected = [
  new URLSearchParams(location.search).has("long")
    ? {
        ...problem,
        section: "긴 단원 이름을 한 행에 유지해야 하는 검증용 자료 ".repeat(8),
      }
    : problem,
];
function Harness() {
  const params = new URLSearchParams(location.search);
  const [notice, setNotice] = useState("");
  const [options, setOptions] = useState<PrintOptions>({
    ...DEFAULT_PRINT_OPTIONS,
    template: (params.get("template") ||
      "jeongtong") as PrintOptions["template"],
    columns: params.get("columns") === "1" ? 1 : 2,
    fontPack: "system",
    showAnswers: false,
  });
  return (
    <>
      <div className={workroom.notifications}>
        {notice && (
          <div className={workroom.notice} role="status">
            <span>{notice}</span>
            <button
              className={workroom.dismiss}
              aria-label="알림 닫기"
              onClick={() => setNotice("")}
            >
              ×
            </button>
          </div>
        )}
      </div>
      <WorksheetEditor
        selected={selected}
        title="조건 상자 검증"
        columns={options.columns}
        answers={false}
        savedAt=""
        printOptions={options}
        printMeta={DEFAULT_PRINT_META}
        setPrintOptions={(patch) => setOptions((old) => ({ ...old, ...patch }))}
        setTitle={noop}
        setColumns={noop}
        setAnswers={noop}
        save={() => setNotice("검증용 저장 알림입니다.")}
        restore={noop}
        download={noop}
        toggle={noop}
        move={noop}
        navigate={noop}
      />
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
