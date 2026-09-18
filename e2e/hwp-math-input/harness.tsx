import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import StudioView from "../../src/components/unified/StudioView";
import { DevAiProvider } from "../../src/components/unified/useDevAi";
import type { StudioCrop } from "../../src/components/unified/studioHelpers";
import "katex/dist/katex.min.css";
import "../studio-ai/harness.css";

/** 작업실 화면 그대로 — 보관한 원본을 다시 열어 문제 카드를 띄운다(`e2e/studio-ai` 와 같은 길). */
function Harness() {
  const [restore, setRestore] = useState<{ id: number; crops: StudioCrop[] }>();
  return (
    <>
      <DevAiProvider>
        <StudioView
          onAdd={() => {}}
          onExport={() => {}}
          restoreRequest={restore}
        />
      </DevAiProvider>
      <button
        onClick={() =>
          setRestore({
            id: Date.now(),
            crops: JSON.parse(
              sessionStorage.getItem("studio-test-archive") ?? "[]",
            ),
          })
        }
      >
        보관한 원본 다시 열기
      </button>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);
