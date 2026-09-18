import { useState } from "react";
import StudioProgressStrip from "../../src/components/unified/StudioProgressStrip";
import StudioQueueStatus from "../../src/components/unified/StudioQueueStatus";
import WorkProgress from "../../src/components/unified/WorkProgress";
import s from "../../src/components/unified/StudioView.module.css";

export default function ProgressFixture() {
  const [warning, setWarning] = useState(false);
  const [action, setAction] = useState("");
  return (
    <main className={s.studio} style={{ padding: 8 }}>
      <button onClick={() => setWarning(!warning)}>긴 경고 전환</button>
      <div
        style={{ overflow: "hidden", height: 100, border: "1px solid #ddd" }}
      >
        <StudioProgressStrip
          summaries={[
            { id: "pages", label: "페이지", done: 3, total: 5, active: true },
            { id: "text", label: "문제", done: 6, total: 21, active: true },
            { id: "figures", label: "도형", done: 0, total: 1, active: true },
          ]}
          warningCount={warning ? 1 : 0}
        >
          <StudioQueueStatus
            jobs={Array.from({ length: 5 }, (_, i) => ({
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
            }))}
            sources={[{ id: "source", name: "시험지.pdf" }]}
            onCancel={() => setAction("페이지 취소")}
            onRetry={() => setAction("페이지 재시도")}
            onNavigate={(_, page) => setAction(`${page}쪽 이동`)}
          />
          <WorkProgress
            label="SVG 도형 생성 중"
            completed={0}
            total={1}
            onCancel={() => setAction("도형 취소")}
            cancelLabel="도형 생성 취소"
          />
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
