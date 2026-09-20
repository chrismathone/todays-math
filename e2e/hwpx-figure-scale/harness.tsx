import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import WorksheetEditor from "../../src/components/unified/WorksheetEditor";
import { SourceEditorDisplay } from "../../src/components/math/editor/SourceEditorDisplay";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
} from "../../src/components/unified/print/types";
import type { StudioProblem } from "../../src/components/unified/types";
import type { StudioCrop } from "../../src/components/unified/studioHelpers";
import "../../src/app/globals.css";
import "katex/dist/katex.min.css";
import { collectHwpxLayout } from "../../src/lib/export/hwpxLayout";
import {
  HUGE_DATA_URL,
  HUGE_SVG,
  TRIANGLE_DATA_URL,
  TRIANGLE_SOURCE_PX,
  TRIANGLE_SVG,
} from "./fixture";

Object.assign(window, { collectHwpxLayout });

const noop = () => {};
const BODY = "이등변삼각형 ABC 에서 밑변의 길이를 구하시오. [그림1]";

/** 작업실 크롭 — `studioProblem()` 이 만드는 것과 같은 모양. */
const crop: StudioCrop = {
  id: "crop-1",
  sourceId: "src-1",
  sourceLabel: "측정용 원본",
  page: 1,
  rect: { x: 0, y: 0, width: 1, height: 1 },
  image: TRIANGLE_DATA_URL,
  content: BODY,
  answer: "6",
  solution: "",
  level: "secondary",
  grade: "중2",
  mode: "text",
  added: true,
  sourceSize: { width: 1654, height: 2339 },
  figures: [
    {
      id: "fig-1",
      rect: { x: 0.1, y: 0.2, width: 0.14, height: 0.1 },
      image: TRIANGLE_DATA_URL,
      svg: TRIANGLE_SVG,
    },
  ],
};

/** ① 작업실 경로 — SVG 가 `figureUrls` 의 data URL 로 실린다(`studioProblem()`). */
const studioProblem: StudioProblem = {
  id: "studio",
  studioCrop: crop,
  content: BODY,
  answer: "6",
  solution: "",
  grade: "중2",
  chapter: "직접 가져온 문제",
  section: "",
  difficulty: "",
  problemCode: "",
  figureUrls: [TRIANGLE_DATA_URL],
  figureSvg: null,
  figureDims: [...TRIANGLE_SOURCE_PX],
  figureSourceMm: [],
};

/** ② 엔진 경로 — 같은 SVG 가 `figureSvg` 로 인라인된다(`ProblemContent`). */
const engineProblem: StudioProblem = {
  id: "engine",
  content: BODY,
  answer: "6",
  solution: "",
  grade: "중2",
  chapter: "삼각형",
  section: "이등변삼각형",
  difficulty: "기본",
  problemCode: "",
  figureUrls: [],
  figureSvg: TRIANGLE_SVG,
  figureDims: [],
  figureSourceMm: [],
};

/** ③ 그림이 없는 문항 — 이미지 요소가 하나도 안 생겨야 한다. */
const plainProblem: StudioProblem = {
  id: "plain",
  content: "$2x + 3 = 11$ 을 푸시오.",
  answer: "4",
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
};

/** ④ 아주 큰 그림 — 작업실 경로로 들어오는 viewBox 900 짜리. */
const hugeProblem: StudioProblem = {
  id: "huge",
  studioCrop: {
    ...crop,
    id: "crop-2",
    content: "넓은 그림 문항입니다. [그림1]",
    figures: [
      {
        id: "fig-2",
        rect: { x: 0.05, y: 0.4, width: 0.6, height: 0.2 },
        image: HUGE_DATA_URL,
        svg: HUGE_SVG,
      },
    ],
  },
  content: "넓은 그림 문항입니다. [그림1]",
  answer: "-",
  solution: "",
  grade: "중2",
  chapter: "직접 가져온 문제",
  section: "",
  difficulty: "",
  problemCode: "",
  figureUrls: [HUGE_DATA_URL],
  figureSvg: null,
  figureDims: [992, 463],
  figureSourceMm: [],
};

/** ⑤ 아주 큰 **엔진 인라인** 그림 — `wide` 등급 틀이 실제로 쓰이는 유일한 자리. */
const hugeEngineProblem: StudioProblem = {
  id: "huge-engine",
  content: "넓은 엔진 도형 문항입니다.",
  answer: "-",
  solution: "",
  grade: "중2",
  chapter: "삼각형",
  section: "넓은 도형",
  difficulty: "기본",
  problemCode: "",
  figureUrls: [],
  figureSvg: HUGE_SVG,
  figureDims: [],
  figureSourceMm: [],
};

function Harness() {
  return (
    <>
      {/* 검수 단계 — StudioReviewPane 의 `.content` 와 같은 글자 크기·줄 높이 */}
      <section
        data-probe="review"
        style={{
          width: 560,
          fontSize: 14,
          lineHeight: 1.85,
          padding: 12,
          background: "white",
        }}
      >
        <SourceEditorDisplay
          value={BODY}
          figures={[{ svg: TRIANGLE_SVG, label: "도형 1-1" }]}
        />
      </section>
      <section data-probe="sheet">
        <WorksheetEditor
          selected={[
            studioProblem,
            engineProblem,
            plainProblem,
            hugeProblem,
            hugeEngineProblem,
          ]}
          title="도형 비례 측정"
          columns={1}
          answers={false}
          savedAt=""
          printOptions={{
            ...DEFAULT_PRINT_OPTIONS,
            fontPack: "system",
            columns: 1,
            layoutMode: "count",
            problemsPerColumn: 2,
            showAnswers: false,
          }}
          printMeta={DEFAULT_PRINT_META}
          setPrintOptions={noop}
          setTitle={noop}
          setColumns={noop}
          setAnswers={noop}
          save={noop}
          restore={noop}
          download={noop}
          toggle={noop}
          move={noop}
          navigate={noop}
        />
      </section>
      <style>{"body { margin: 0; }"}</style>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);
