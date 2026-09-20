import { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import WorksheetEditor from "../../src/components/unified/WorksheetEditor";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
  type PrintOptions,
} from "../../src/components/unified/print/types";
import type { StudioProblem } from "../../src/components/unified/types";
import "../../src/app/globals.css";

const problems: StudioProblem[] = Array.from({ length: 12 }, (_, index) => ({
  id: `synthetic-${index}`,
  content:
    `${index + 1}번 합성 문항. ` +
    "다음 조건을 읽고 식의 값을 구하시오. 주어진 두 수의 합과 차를 이용하여 계산 과정을 설명하시오. ".repeat(
      index === 0 ? 70 : 3 + (index % 4),
    ),
  answer: "3",
  solution: "합성 해설입니다. 계산 과정을 확인합니다.",
  grade: "중2",
  chapter: "일차방정식",
  section: "계산",
  difficulty: "중",
  problemCode: "",
  figureUrls: [],
  figureSvg: null,
  figureDims: [],
  figureSourceMm: [],
}));

declare global {
  interface Window {
    setSolveFixtureOptions: (patch: Partial<PrintOptions>) => void;
  }
}

function Fixture() {
  const [title, setTitle] = useState("오른쪽 풀이 공간 검증");
  const [meta, setMeta] = useState({ ...DEFAULT_PRINT_META });
  const [options, setOptions] = useState({ ...DEFAULT_PRINT_OPTIONS });
  const setPrintOptions = useCallback(
    (patch: Partial<PrintOptions>) =>
      setOptions((previous) => ({ ...previous, ...patch })),
    [],
  );
  useEffect(() => {
    window.setSolveFixtureOptions = (patch) =>
      flushSync(() => setPrintOptions(patch));
  }, [setPrintOptions]);
  return (
    <WorksheetEditor
      selected={problems}
      title={title}
      setTitle={setTitle}
      columns={options.columns}
      answers={false}
      savedAt=""
      printOptions={options}
      printMeta={meta}
      setPrintOptions={setPrintOptions}
      setPrintMeta={(patch) =>
        setMeta((previous) => ({ ...previous, ...patch }))
      }
      setColumns={() => {}}
      setAnswers={() => {}}
      save={() => {}}
      restore={() => {}}
      download={() => {}}
      toggle={() => {}}
      move={() => {}}
      reorder={() => {}}
      navigate={() => {}}
    />
  );
}

createRoot(document.getElementById("root")!).render(<Fixture />);
