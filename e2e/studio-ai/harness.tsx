import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import StudioView from "../../src/components/unified/StudioView";
import { DevAiProvider } from "../../src/components/unified/useDevAi";
import type { StudioProblem } from "../../src/components/unified/types";
import "katex/dist/katex.min.css";
import "./harness.css";

function Harness() {
  const [problems, setProblems] = useState<StudioProblem[]>([]);
  return (
    <>
      <DevAiProvider>
        <StudioView
          onAdd={(next) => setProblems((current) => [...current, ...next])}
          onExport={() => {}}
        />
      </DevAiProvider>
      <output aria-label="시험지 담은 문제">{JSON.stringify(problems)}</output>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);
