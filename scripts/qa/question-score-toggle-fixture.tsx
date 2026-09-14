import { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import WorksheetEditor from "../../src/components/unified/WorksheetEditor";
import { createWorkspaceDraftStore } from "../../src/components/unified/draftStore";
import {
  DEFAULT_PRINT_META,
  type PrintOptions,
} from "../../src/components/unified/print/types";
import type { StudioProblem } from "../../src/components/unified/types";
import type { ContentBlock } from "../../src/lib/mathgen/contracts";
import "../../src/app/globals.css";
import "katex/dist/katex.min.css";

const canvas = document.createElement("canvas");
canvas.width = 220;
canvas.height = 60;
const context = canvas.getContext("2d")!;
context.fillStyle = "white";
context.fillRect(0, 0, 220, 60);
context.fillStyle = "black";
context.font = "18px sans-serif";
context.fillText("원본 그림 A [8점]", 8, 34);
const sourceImage = canvas.toDataURL("image/png");
const text = (value: string): ContentBlock => ({
  type: "text",
  value,
  rows: [],
});
const base: StudioProblem = {
  id: "native",
  content: "원본 내용 [3점]",
  answer: "3",
  solution: "x=3을 대입합니다.",
  grade: "중1",
  chapter: "수와 연산",
  section: "계산",
  difficulty: "중",
  problemCode: "",
  figureUrls: [],
  figureDims: [],
  figureSourceMm: [],
  figureSvg: null,
};
const native: StudioProblem = {
  ...base,
  ocr: {
    number: 1,
    blocks: [text("1. 다음 식의 값을 구하시오. $x=3$ [3점]")],
    choiceGroups: [],
    subQuestions: [
      {
        number: 1,
        contents: [text("(1) 이유를 쓰시오. [2점]")],
        score: 2,
        printedScore: "2.0",
      },
    ],
    score: 3,
    printedScore: "3.0",
    confidence: "high",
    choicesLayout: "auto",
    bodyMissing: false,
    choicesMissing: false,
  },
};
const problems: StudioProblem[] = [
  native,
  {
    ...base,
    id: "plain",
    content: String.raw`세 점 A, B, C를 확인하고 $x=3$의 값을 구하시오. 이길 때마다 $3\text{점}$을 얻는다. [4점]
(1) 두 수를 더하시오. \[4.5점\]
(2) $[3,5]$에서 최솟값을 구하시오. $[5점]$`,
  },
  {
    ...native,
    id: "edited",
    content: "직접 고친 문제입니다. $x=3$ [6점]",
    ocr: { ...native.ocr!, contentEdited: true, printedScore: "99.0" },
  },
  {
    ...base,
    id: "figure",
    content: "원본 그림의 A를 확인하시오. [7.5점]",
    figureSvg:
      '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="45" viewBox="0 0 180 45"><text x="10" y="25">A [7점]</text></svg>',
    figureUrls: [sourceImage],
    figureDims: [220, 60],
    figureSourceMm: [45],
  },
  {
    ...native,
    id: "image-only",
    content: "이미지 원본 [8점]",
    croppedImage: sourceImage,
  },
];
const original = JSON.stringify(problems);
// Exercise the real draft parser/persistence using synthetic, private in-memory storage.
const values = new Map<string, string>();
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => {
    values.set(key, value);
  },
};
let store = createWorkspaceDraftStore(() => storage);
store.hydrate();
store.importDraft({
  version: 1,
  title: "배점 표시 검증",
  problems,
  printOptions: { columns: 1 },
});

declare global {
  interface Window {
    scoreFixture: {
      snapshot: () => { options: PrintOptions; sourceUnchanged: boolean };
      restore: () => void;
    };
  }
}

function Fixture() {
  const [title, setTitle] = useState("배점 표시 검증");
  const [meta, setMeta] = useState({ ...DEFAULT_PRINT_META });
  const [options, setOptions] = useState(
    store.getSnapshot().draft.printOptions,
  );
  const setPrintOptions = useCallback((patch: Partial<PrintOptions>) => {
    store.setPrintOptions(patch);
    setOptions(store.getSnapshot().draft.printOptions);
  }, []);
  useEffect(() => {
    window.scoreFixture = {
      snapshot: () => ({
        options: store.getSnapshot().draft.printOptions,
        sourceUnchanged:
          JSON.stringify(problems) === original &&
          JSON.stringify(store.getSnapshot().draft.problems) === original,
      }),
      restore: () => {
        store.saveNow();
        store = createWorkspaceDraftStore(() => storage);
        store.hydrate();
        flushSync(() => setOptions(store.getSnapshot().draft.printOptions));
      },
    };
  }, []);
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
      save={() => store.saveNow()}
      restore={() => {}}
      download={() => {}}
      toggle={() => {}}
      move={() => {}}
      navigate={() => {}}
    />
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
