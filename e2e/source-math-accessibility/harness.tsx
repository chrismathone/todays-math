import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { SourceMathTextEditor } from "../../src/components/math/editor/SourceMathTextEditor";
import { SourceEditorDisplay } from "../../src/components/math/editor/SourceEditorDisplay";
import { collectHwpxLayout } from "../../src/lib/export/hwpxLayout";
import "katex/dist/katex.min.css";
import "../../src/app/globals.css";
import "../../src/components/math/editor/math-text-editor.css";

export const SOURCE = String.raw`분수 $\frac{1}{2}$ 와 지수 $x^{2}$ 이다.

$$\frac{x^{2}}{3}$$`;

function Harness() {
  const [value, setValue] = useState(SOURCE);
  const [answer, setAnswer] = useState("$x^{2}$");
  const [stored, setStored] = useState(SOURCE);
  const [revision, setRevision] = useState(0);
  const [layout, setLayout] = useState("");
  const [layoutRevision, setLayoutRevision] = useState(0);
  return (
    <main style={{ width: 680, margin: 20 }}>
      <section data-panel="editor">
        <SourceMathTextEditor
          key={revision}
          value={value}
          onChange={setValue}
          aria-label="문제 본문"
        />
      </section>
      <section data-panel="answer">
        <SourceMathTextEditor
          value={answer}
          onChange={setAnswer}
          aria-label="정답"
        />
      </section>
      <button
        type="button"
        onClick={() => {
          setStored(value);
          setRevision((n) => n + 1);
        }}
      >
        저장 후 다시 열기
      </button>
      <output data-source hidden>
        {JSON.stringify(value)}
      </output>
      <output data-stored hidden>
        {JSON.stringify(stored)}
      </output>
      <button
        type="button"
        onClick={async () => {
          const card = document.querySelector<HTMLElement>(
            '[data-panel="readonly"]',
          )!;
          setLayout(JSON.stringify((await collectHwpxLayout(card)).pages));
          setLayoutRevision((n) => n + 1);
        }}
      >
        수식 내보내기 측정
      </button>
      <output data-layout data-revision={layoutRevision} hidden>
        {layout}
      </output>
      <section data-panel="readonly">
        <div data-unified-paper>
          <SourceEditorDisplay value={value} />
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);
