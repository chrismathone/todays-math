import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { MathTextEditor, type MathEditorFigure } from "../../../src/components/math/editor/MathTextEditor";
import { SourceEditorDisplay } from "../../../src/components/math/editor/SourceEditorDisplay";
import "katex/dist/katex.min.css";

export const initial = String.raw`분수를 계산하세요. $\dfrac{1}{2}$와 $x^2$를 비교하세요.

> <보기:cols=2>
> ㄱ. $a < b$
> ㄴ. $\frac{}{2}$

① $1$ ② $2$ ③ $3$ ④ $4$ ⑤ $5$

| 항목 | 값 |
| --- | --- |
| 분수 | $\frac{3}{4}$ |

[그림1]

마지막 문장.`;
const svg = (label: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 70"><rect x="10" y="10" width="100" height="50" fill="white" stroke="navy"/><text x="25" y="40">${label}</text></svg>`;
function Fixture() {
  const [value, setValue] = useState(initial);
  const [figures, setFigures] = useState<MathEditorFigure[]>([{ svg: svg("Original") }]);
  const [clicked, setClicked] = useState(-1);
  const [saved, setSaved] = useState("");
  const [showRead, setShowRead] = useState(false);
  return <main style={{ maxWidth: 850, margin: "24px auto", fontFamily: "sans-serif" }}>
    <MathTextEditor value={value} onChange={setValue} figures={figures} onFigureClick={setClicked} choicesLayout="2x3" aria-label="문제 본문" />
    <button onClick={() => setSaved(value)}>저장</button>
    <button onClick={() => setFigures([{ svg: svg("Redrawn") }])}>그림 새로 그리기</button>
    <button onClick={() => setValue(initial)}>외부 값 복원</button>
    <button onClick={() => { setFigures([{ svg: svg("Left"), box: [0, 0, 200, 400] }, { svg: svg("Right"), box: [0, 450, 200, 850] }]); }}>두 그림 배치</button>
    <button onClick={() => setShowRead(!showRead)}>읽기 화면 확인</button>
    {showRead && <section data-testid="read"><SourceEditorDisplay value={value} figures={figures} onFigureClick={setClicked} choicesLayout="2x3" /></section>}
    <output data-testid="clicked">{clicked}</output>
    <pre data-testid="value">{value}</pre>
    <pre data-testid="saved">{saved}</pre>
  </main>;
}
createRoot(document.getElementById("root")!).render(<StrictMode><Fixture /></StrictMode>);
