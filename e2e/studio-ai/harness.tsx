import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import StudioView from "../../src/components/unified/StudioView";
import { DevAiProvider } from "../../src/components/unified/useDevAi";
import type { StudioProblem } from "../../src/components/unified/types";
import type { StudioCrop } from "../../src/components/unified/studioHelpers";
import "katex/dist/katex.min.css";
import "./harness.css";
import ProgressFixture from "./progress-fixture";
import ReviewLockFixture from "./review-lock-fixture";

function Harness() {
  const [problems, setProblems] = useState<StudioProblem[]>([]);
  const [restore, setRestore] = useState<{ id: number; crops: StudioCrop[] }>();
  return (
    <>
      <DevAiProvider>
        <StudioView
          onAdd={(next) => setProblems((current) => [...current, ...next])}
          onExport={() => {}}
          restoreRequest={restore}
        />
      </DevAiProvider>
      <output aria-label="시험지 담은 문제">{JSON.stringify(problems)}</output>
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
    {new URLSearchParams(location.search).has("progress-fixture") ? (
      <ProgressFixture />
    ) : new URLSearchParams(location.search).has("review-lock-fixture") ? (
      <ReviewLockFixture />
    ) : (
      <Harness />
    )}
  </StrictMode>,
);
