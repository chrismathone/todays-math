import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { MathTextEditor } from "../../src/components/math/editor/MathTextEditor";
import { SourceEditorDisplay } from "../../src/components/math/editor/SourceEditorDisplay";
import NativeProblem from "../../src/components/unified/NativeProblem";
import type { StudioProblem } from "../../src/components/unified/types";
import { collectHwpxLayout } from "../../src/lib/export/hwpxLayout";
import "katex/dist/katex.min.css";
// 지면의 격자·여백은 Tailwind 클래스로 선다 — 앱과 같은 스타일을 얹어야 지면 모양을 잴 수 있다.
import "../../src/app/globals.css";
import "./harness.css";

/**
 * 같은 원문 하나를 세 자리에 그린다 — 작업실 «내용 수정» 편집기 · 검수 카드(읽기) · 지면.
 * «저장»은 작업실처럼 편집기가 낸 원문을 저장본으로 삼고 편집기를 **다시 연다**(재파싱).
 */
const CASES: Record<string, string> = {
  spaces: "갑 을",
  box: "> <보기>\n> 갑 을",
  // 인식이 `equation_block` 을 낸 모양 — blocksToMarkdown 이 `$$…$$` 를 따로 문단으로 세운다.
  q7display:
    "한 자리의 자연수 $a$, $b$, $c$에 대하여 이차방정식\n\n$$x^2-ax+4=0$$\n\n의 해가 $x = b \\pm \\sqrt{c}$일 때, $a + b + c$의 값은? \\[5점\\]\n\n① $12$ ② $14$ ③ $16$ ④ $18$ ⑤ $20$",
  // 원장님이 고친 뒤의 저장본(workspace_document, 2026-09-21) — 인라인.
  q7inline:
    "한 자리의 자연수 $a$, $b$, $c$에 대하여 이차방정식 $x^2-ax+4=0$의 해가 $x = b \\pm \\sqrt{c}$일 때, $a + b + c$의 값은? \\[5점\\]\n\n① $12$\n② $14$\n③ $16$\n④ $18$\n⑤ $20$",
  // 원문 줄바꿈이 수식 앞에 남은 모양 — 인라인 `$…$` 가 줄머리에 온다.
  q7newline:
    "한 자리의 자연수 $a$, $b$, $c$에 대하여 이차방정식\n$x^2-ax+4=0$의 해가 $x = b \\pm \\sqrt{c}$일 때, $a + b + c$의 값은? \\[5점\\]\n\n① $12$ ② $14$ ③ $16$ ④ $18$ ⑤ $20$",
  // 9번 저장본(workspace_document, 2026-09-21) — 원장님이 (마)(바) 사이에 네 칸을 친 채 저장된 모양.
  box9: "다음 이차함수의 그래프에 대한 설명으로 옳지 않은 것은? \\[4점\\]\n\n> <보기>\n> (가) $y = 3x^2$ (나) $y = -\\frac{2}{3}x^2$ (다) $y = -3x^2$\n> (라) $y = \\frac{4}{3}x^2$(마) $y = \\frac{3}{4}x^2$    (바) $y = -5x^2$\n\n① 모두 원점이 꼭짓점이다.\n\n② 그래프의 폭이 가장 좁은 것은 (바)이다.\n\n③ 그래프의 폭이 가장 넓은 것은 (나)이다.\n\n④ 위로 볼록한 포물선 모양은 (가), (라), (마)이다.\n\n⑤ $x$축에 대하여 서로 대칭인 것은 (가)와 (다)이다.",
  // ⑶ 조사용 — 이미 있는 상자 열 수 표기(`<보기:cols=3>`), 항목을 한 줄에 하나씩.
  cols3:
    "다음 이차함수의 그래프에 대한 설명으로 옳지 않은 것은?\n\n> <보기:cols=3>\n> (가) $y = 3x^2$\n> (나) $y = -\\frac{2}{3}x^2$\n> (다) $y = -3x^2$\n> (라) $y = \\frac{4}{3}x^2$\n> (마) $y = \\frac{3}{4}x^2$\n> (바) $y = -5x^2$",
};

function paperProblem(content: string): StudioProblem {
  return {
    id: "harness",
    content,
    answer: "",
    solution: "",
    grade: "중3",
    chapter: "",
    section: "",
    difficulty: "",
    problemCode: "",
    figureUrls: [],
    figureSvg: null,
    figureDims: [],
    figureSourceMm: [],
    // 작업실에서 «내용 수정»을 거친 문항은 저장 원문을 그대로 지면에 싣는다(NativeProblem 의 fallback).
    ocr: {
      number: 1,
      blocks: [],
      choiceGroups: [],
      subQuestions: [],
      confidence: "high",
      choicesLayout: "auto",
      bodyMissing: false,
      choicesMissing: false,
      contentEdited: true,
    } as unknown as StudioProblem["ocr"],
  };
}

function Harness() {
  const name = new URLSearchParams(location.search).get("case") ?? "spaces";
  const [stored, setStored] = useState(CASES[name] ?? "");
  const [draft, setDraft] = useState(stored);
  const [opened, setOpened] = useState(0);
  return (
    <main>
      <section data-panel="editor">
        <MathTextEditor
          key={opened}
          aria-label="문제 내용"
          value={draft}
          onChange={setDraft}
        />
      </section>
      <button
        type="button"
        onClick={() => {
          setStored(draft);
          setOpened((count) => count + 1);
        }}
      >
        저장
      </button>
      <output data-draft>{JSON.stringify(draft)}</output>
      <output data-stored>{JSON.stringify(stored)}</output>
      <section data-panel="card">
        <SourceEditorDisplay value={stored} />
      </section>
      <section data-panel="paper">
        <div data-unified-paper>
          <div data-hwpx-body>
            <NativeProblem problem={paperProblem(stored)} print />
          </div>
        </div>
      </section>
    </main>
  );
}

declare global {
  interface Window {
    collectPaperHwpx: () => ReturnType<typeof collectHwpxLayout>;
  }
}
window.collectPaperHwpx = () =>
  collectHwpxLayout(
    document.querySelector<HTMLElement>('[data-panel="paper"]')!,
  );

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);
