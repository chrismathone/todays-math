// 「문제 순서」 칸 전용 합성 픽스처 — 서버·DB·AI 없이 WorksheetEditor 만 띄운다.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import WorksheetEditor from "../../src/components/unified/WorksheetEditor";
import type { StudioProblem } from "../../src/components/unified/types";
import type { StudioCrop } from "../../src/components/unified/studioHelpers";
import "../../src/app/globals.css";

const FILE = "[경신중][2][25-2-중간][미래엔] (원본).pdf";

function crop(page: number): StudioCrop {
  return {
    id: `crop-${page}`,
    sourceId: "source-a",
    sourceLabel: FILE,
    page,
    rect: { x: 0, y: 0, width: 1, height: 1 },
    image:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    content: "",
    answer: "",
    solution: "",
    level: "secondary",
    grade: "중2",
    mode: "image",
    added: true,
  };
}

/** 원본 차례가 아닌 목록 — 「순서 초기화」가 할 일이 있는 상태로 시작한다. */
const PLACES: [number, number | undefined][] = [
  [3, 1],
  [1, 2],
  [1, 5],
  [2, 4],
  [12, undefined],
  [2, 1],
];

const problems: StudioProblem[] = PLACES.map(([page, number], index) => ({
  id: `synthetic-${index}`,
  content: `${index + 1}번 합성 문항. 다음 식의 값을 구하시오.`,
  answer: "3",
  solution: "",
  grade: "중2",
  chapter: "직접 가져온 문제",
  section: "",
  difficulty: "",
  problemCode: "",
  figureUrls: [],
  figureSvg: null,
  figureDims: [],
  figureSourceMm: [],
  studioCrop: crop(page),
  sourceLabel: `${FILE} · ${page}쪽`,
  ...(number === undefined
    ? {}
    : {
        ocr: {
          number,
          blocks: [],
          choiceGroups: [],
          subQuestions: [],
          confidence: "high" as const,
          choicesLayout: "auto" as const,
          bodyMissing: false,
          choicesMissing: false,
        },
      }),
}));

function Fixture() {
  const [selected, setSelected] = useState(problems);
  const [title, setTitle] = useState("문제 순서 칸 검증");
  return (
    <WorksheetEditor
      selected={selected}
      title={title}
      setTitle={setTitle}
      columns={2}
      answers={false}
      savedAt=""
      setColumns={() => {}}
      setAnswers={() => {}}
      save={() => {}}
      restore={() => {}}
      download={() => {}}
      toggle={(problem) =>
        setSelected((current) => current.filter((p) => p.id !== problem.id))
      }
      move={(index, direction) =>
        setSelected((current) => {
          if (index + direction < 0 || index + direction >= current.length)
            return current;
          const next = [...current];
          [next[index], next[index + direction]] = [
            next[index + direction],
            next[index],
          ];
          return next;
        })
      }
      reorder={(next) => setSelected(next)}
      navigate={() => {}}
      onEditSource={() => {}}
    />
  );
}

createRoot(document.getElementById("root")!).render(<Fixture />);
