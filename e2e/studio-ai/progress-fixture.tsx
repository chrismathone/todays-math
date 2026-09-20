import { useState } from "react";
import StudioProgressStrip from "../../src/components/unified/StudioProgressStrip";
import StudioQueueStatus from "../../src/components/unified/StudioQueueStatus";
import StudioFigureFailures from "../../src/components/unified/StudioFigureFailures";
import WorkProgress from "../../src/components/unified/WorkProgress";
import s from "../../src/components/unified/StudioView.module.css";

/** 쪽이 많은 경우 — 파일 둘에 걸쳐 40쪽. 「줄이 터지지 않는가」를 재는 표본이다. */
const manySources = [
  { id: "source", name: "시험지.pdf" },
  { id: "second", name: "2학기 중간.pdf" },
];
const manyJobs = Array.from({ length: 40 }, (_, i) => ({
  key: String(i),
  sourceId: i < 18 ? "source" : "second",
  page: (i < 18 ? i : i - 18) + 1,
  state:
    i < 12
      ? ("complete" as const)
      : i < 14
        ? ("running" as const)
        : ("queued" as const),
}));

export default function ProgressFixture() {
  const [warning, setWarning] = useState(false);
  const [many, setMany] = useState(false);
  const [failed, setFailed] = useState(false);
  const [action, setAction] = useState("");
  const sources = many ? manySources : [{ id: "source", name: "시험지.pdf" }];
  const jobs = many
    ? manyJobs
    : Array.from({ length: 5 }, (_, i) => ({
        key: String(i),
        sourceId: "source",
        page: i + 1,
        state: i < 3 ? ("complete" as const) : ("running" as const),
        textLayerWarning:
          warning && i === 0
            ? {
                summary:
                  "OCR가 PDF 원문과 56%만 일치 — 본문 누락 의심 (검토 권장). ".repeat(
                    8,
                  ),
                detail: "PDF 텍스트와 원문을 비교해 주세요.",
              }
            : undefined,
      }));
  return (
    <main className={s.studio} style={{ padding: 8 }}>
      <button onClick={() => setWarning(!warning)}>긴 경고 전환</button>
      <button onClick={() => setMany(!many)}>쪽 많이 전환</button>
      <button onClick={() => setFailed(!failed)}>도형 실패 전환</button>
      <div
        style={{ overflow: "hidden", height: 100, border: "1px solid #ddd" }}
      >
        <StudioProgressStrip
          summaries={[
            {
              id: "pages",
              label: "페이지",
              done: 3,
              total: jobs.length,
              active: true,
            },
            { id: "text", label: "문제", done: 6, total: 21, active: true },
            {
              id: "figures",
              label: "도형",
              done: 2,
              total: 4,
              active: !failed,
            },
          ]}
          warningCount={warning ? 1 : 0}
        >
          <StudioQueueStatus
            jobs={jobs}
            sources={sources}
            onCancel={() => setAction("페이지 취소")}
            onRetry={() => setAction("페이지 재시도")}
            onNavigate={(sourceId, page) =>
              setAction(`${sourceId} ${page}쪽 이동`)
            }
          />
          {failed ? (
            <>
              <div className={s.queueSummary} role="status">
                <strong>도형 2 / 4 완료 · 실패 2개</strong>
                <button onClick={() => setAction("도형 다시 생성")}>
                  실패 2개 다시 생성
                </button>
              </div>
              <StudioFigureFailures
                items={[
                  {
                    key: "a",
                    cropId: "c1",
                    label: "도형 1-1",
                    error: "SVG 생성에 실패했습니다. 원본 그림을 유지했습니다.",
                  },
                  {
                    key: "b",
                    cropId: "c3",
                    label: "도형 3-2",
                    error: "응답이 지연됩니다. 원본 그림을 유지했습니다.",
                  },
                ]}
                onSelect={(cropId) => setAction(`${cropId} 검수 이동`)}
              />
            </>
          ) : (
            <WorkProgress
              label="SVG 도형 생성 중"
              completed={0}
              total={1}
              onCancel={() => setAction("도형 취소")}
              cancelLabel="도형 생성 취소"
            />
          )}
          <WorkProgress
            label="문제 인식 중"
            completed={6}
            total={21}
            onCancel={() => setAction("문자 취소")}
            cancelLabel="문자 인식 취소"
          />
        </StudioProgressStrip>
        <div data-canvas style={{ height: 56, background: "#edf2fc" }}>
          원본 지면
        </div>
      </div>
      <output aria-label="진행 동작 결과">{action}</output>
      <button style={{ marginTop: 520 }}>외부 버튼</button>
    </main>
  );
}
