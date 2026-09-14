import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { SourceEditorDisplay } from "../../../src/components/math/editor/SourceEditorDisplay";
import { MathTextEditor } from "../../../src/components/math/editor/MathTextEditor";
import type { DiagramSvgItem } from "../../../src/components/math/editor/SourceEditorRenderer";
import "katex/dist/katex.min.css";
// Deliberately loaded after editor CSS: real host selectors must not resize a figure action.
import host from "../../../src/components/unified/StudioReviewPane.module.css";

const graph = (revision: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 360"><path d="M30 40 Q100 650 200 40 M30 180 H220 M140 20 V340" fill="none" stroke="black"/><text x="112" y="160" text-anchor="middle" font-size="18">$-${revision ? 3 : 2}$</text><text x="156" y="230" font-size="18">$-${revision ? 5 : 4}$</text><text x="156" y="320" font-size="18">$-${revision ? 8 : 7}$</text><text x="148" y="30" font-size="18">y</text></svg>`;
const tiny =
  '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="none" stroke="black"/><text x="30" y="36" text-anchor="middle" font-size="18">$-2$</text></svg>';
const crop = `data:image/svg+xml,${encodeURIComponent(tiny.replaceAll("$", ""))}`;

function Example({
  id,
  value: initialValue,
  kind = "graph",
  align,
}: {
  id: string;
  value: string;
  kind?: string;
  align?: DiagramSvgItem["align"];
}) {
  const [value, setValue] = useState(initialValue);
  const [revision, setRevision] = useState(0);
  const [calls, setCalls] = useState<number[]>([]);
  const diagrams: DiagramSvgItem[] =
    kind === "row"
      ? [
          { svg: graph(revision), box: [100, 50, 400, 230] },
          { svg: tiny, box: [100, 250, 400, 490] },
        ]
      : [{ svg: kind === "tiny" ? tiny : graph(revision), align }];
  const props = {
    value,
    diagramSvgs: diagrams,
    onFigureClick: (index: number) =>
      setCalls((previous) => [...previous, index]),
    isFigureEditable: () => kind !== "locked",
    choicesLayout: "1x5" as const,
  };
  if (kind === "crop") props.diagramSvgs = [];
  return (
    <article id={id} className={host.card}>
      <h2>{id}</h2>
      <button onClick={() => setRevision((n) => n + 1)}>Redraw</button>
      <output>{calls.join(",")}</output>
      <section data-mode="read">
        <SourceEditorDisplay
          {...props}
          imageCrops={kind === "crop" ? [{ src: crop }] : undefined}
        />
      </section>
      <section data-mode="edit">
        <MathTextEditor
          {...props}
          imageCrops={kind === "crop" ? [{ src: crop }] : undefined}
          onChange={setValue}
        />
      </section>
      <pre data-value>{value}</pre>
    </article>
  );
}

createRoot(document.getElementById("root")!).render(
  <div
    className={host.comparison}
    style={{ display: "block", overflow: "visible" }}
  >
    <Example id="standalone" value="그림의 꼭짓점을 구하세요." />
    <Example id="indexed" value={"함수의 그래프입니다.\n\n[그림1]"} />
    <Example id="row" value={"[그림1]\n\n[그림2]"} kind="row" />
    <Example
      id="choices"
      value="① [그림1] ② $2$ ③ $3$ ④ $4$ ⑤ $5$"
      kind="tiny"
    />
    <Example
      id="table"
      value={"| 그림 | 값 |\n| --- | --- |\n| [그림1] | $-2$ |"}
      kind="tiny"
    />
    <Example id="inline" value={`그림\n\n${tiny}`} kind="tiny" />
    <Example id="crop" value="[그림1]" kind="crop" />
    <Example id="locked" value="[그림1]" kind="locked" />
    <Example id="left" value="[그림1]" align="left" />
    <Example id="right" value="[그림1]" align="right" />
  </div>,
);
