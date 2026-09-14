import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import WorksheetEditor from "../../src/components/unified/WorksheetEditor";
import StudioFigureEditor from "../../src/components/unified/figure-editor";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
} from "../../src/components/unified/print/types";
import type { StudioProblem } from "../../src/components/unified/types";
import "../../src/app/globals.css";
import "katex/dist/katex.min.css";

const noop = () => {};
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360"></svg>';
const problems: StudioProblem[] = Array.from({ length: 8 }, (_, index) => ({
  id: `fixture-${index}`,
  content: `문제 ${index + 1}: $x + 1 = ${index + 2}$일 때 $x$의 값을 구하세요.`,
  answer: String(index + 1),
  solution: "양변에서 1을 뺍니다.",
  grade: "중1",
  chapter: "방정식",
  section: "일차방정식",
  difficulty: "기본",
  problemCode: "",
  figureUrls: [],
  figureSvg: null,
  figureDims: [],
  figureSourceMm: [],
}));
function Harness() {
  const params = new URLSearchParams(location.search);
  const [selected, setSelected] = useState(problems);
  const [review, setReview] = useState(false);
  const [options, setOptions] = useState({
    ...DEFAULT_PRINT_OPTIONS,
    fontPack: "system" as const,
    columns: 1 as const,
    layoutMode: "count" as const,
    problemsPerColumn: 2,
    showAnswers: true,
  });
  if (params.has("figure")) {
    const initialSvg = params.has("endpoint")
      ? svg.replace(
          "</svg>",
          `<g transform="${params.has("transformed") ? "translate(25 10) rotate(20 200 150)" : "translate(0 0)"}"><line x1="120" y1="100" x2="280" y2="220" stroke="#111"/></g></svg>`,
        )
      : svg;
    return (
      <StudioFigureEditor
        image={svg}
        initialSvg={initialSvg}
        index={0}
        onSave={noop}
        onClose={noop}
      />
    );
  }
  if (review) return <p>검토 단계로 돌아왔습니다.</p>;
  return (
    <>
      <WorksheetEditor
        selected={selected}
        title="페이지 이동 검증"
        columns={1}
        answers
        savedAt=""
        printOptions={options}
        printMeta={DEFAULT_PRINT_META}
        setPrintOptions={(patch) =>
          setOptions(
            (previous) => ({ ...previous, ...patch }) as typeof options,
          )
        }
        setTitle={noop}
        setColumns={noop}
        setAnswers={noop}
        save={noop}
        restore={noop}
        download={noop}
        toggle={noop}
        move={noop}
        navigate={noop}
        onBackToReview={() => setReview(true)}
      />
      <button
        onClick={() => setSelected(problems.slice(0, 1))}
        data-fixture-control
      >
        문제 수 줄이기
      </button>
      <style>
        {
          "body { margin: 0; } @media print { [data-fixture-control] { display: none; } }"
        }
      </style>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);
