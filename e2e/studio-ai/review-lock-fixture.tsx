import { useState } from "react";
import StudioReviewPane from "../../src/components/unified/StudioReviewPane";
import type {
  StudioCrop,
  StudioFigure,
} from "../../src/components/unified/studioHelpers";
import s from "../../src/components/unified/StudioView.module.css";

const image =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const figure: StudioFigure = {
  id: "figure-1",
  rect: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
  image,
};
const crop = (id: string, number: number, reviewed: boolean): StudioCrop => ({
  id,
  sourceId: "source-1",
  sourceLabel: "시험지.pdf",
  page: 1,
  rect: { x: 0, y: 0, width: 1, height: 1 },
  image,
  figures: [figure],
  content: `${number}. 다음 식의 값을 구하시오.`,
  answer: "2",
  solution: "",
  level: "secondary",
  grade: "중1",
  mode: "text",
  added: false,
  reviewed,
  ocr: {
    number,
    blocks: [],
    choiceGroups: [],
    subQuestions: [],
    confidence: "high",
    choicesLayout: "auto",
    bodyMissing: false,
    choicesMissing: false,
  },
});

/** 검수 완료 잠금을 실제 브라우저에서 보는 픽스처 — 1번은 잠김, 2번은 검수 전. */
export default function ReviewLockFixture() {
  const [crops, setCrops] = useState([
    crop("c1", 1, true),
    crop("c2", 2, false),
  ]);
  const [action, setAction] = useState("");
  return (
    <main className={s.studio} style={{ height: 760, padding: 8 }}>
      <StudioReviewPane
        crops={crops}
        allCrops={crops}
        activeId="c1"
        original={image}
        page={1}
        jobs={[]}
        figureJobs={[]}
        available
        onSelect={() => {}}
        onUpdate={(id, patch) => {
          setAction(`${id} ${JSON.stringify(patch)}`);
          setCrops((current) =>
            current.map((item) =>
              item.id === id ? { ...item, ...patch } : item,
            ),
          );
        }}
        onRun={(action, ids) => setAction(`run ${action} ${ids.join(",")}`)}
        onCancel={() => {}}
        onRetry={() => {}}
        onCrop={() => {}}
        onEditFigure={() => setAction("그림 편집")}
        onRetryPage={() => {}}
        onRenderFigure={() => setAction("SVG 생성")}
        onCancelFigure={() => {}}
      />
      <output aria-label="검수 동작 결과">{action}</output>
    </main>
  );
}
