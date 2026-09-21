import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { MathTextEditor } from "../../src/components/math/editor/MathTextEditor";
import { SourceEditorDisplay } from "../../src/components/math/editor/SourceEditorDisplay";
import NativeProblem from "../../src/components/unified/NativeProblem";
import { ProblemContent } from "../../src/components/math/ProblemContent";
import type { StudioProblem } from "../../src/components/unified/types";
import {
  studioProblem,
  type StudioCrop,
} from "../../src/components/unified/studioHelpers";
import { studioReviewContent } from "../../src/components/unified/studioReviewContent";
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
  // 지면 파서는 아주 짧은 상자(«갑 을»)를 상자로 안 본다 — 상자로 서는 길이로 둔다.
  box: "> <보기>\n> 하나 둘 셋 갑 을",
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
  // 원장님 2026-09-21 «내용 수정할때 표 크기와 실제 렌더링 될때의 표 크기가 너무 다름» — 문명중 1학년 3번 저장본(workspace_document).
  candleTable:
    "[$3\\sim 4$] 길이가 $15\\text{ cm}$인 원기둥 모양의 양초에 불을 붙이면 $1$시간마다 $3\\text{ cm}$씩 길이가 일정하게 줄어든다. 양초에 불을 붙인 지 $x$시간 후의 양초의 길이를 $y\\text{ cm}$라 하자.\n\n| $x\\text{ (시간)}$ | 0 | 1 | 2 | 3 | 4 | 5 |\n| --- | --- | --- | --- | --- | --- | --- |\n| $y\\text{ ( cm )}$ | 15 | a | b | c | d | e |\n| $(x,\\ y)$ | $(0,\\ 15)$ |  |  |  |  |  |\n\n위의 표에서 $a+b+c+d+e$의 값은?\n\n① $30$ ② $31$ ③ $32$ ④ $33$ ⑤ $34$",
  // 트랙 46 — 편집기가 친 네 칸을 저장한 모양(고정 공백 셋 + 보통 공백). 지면·HWPX 가 넓게 싣는가.
  typed: "갑\u00A0\u00A0\u00A0 을",
  // ⑶ 조사용 — 이미 있는 상자 열 수 표기(`<보기:cols=3>`), 항목을 한 줄에 하나씩.
  cols3:
    "다음 이차함수의 그래프에 대한 설명으로 옳지 않은 것은?\n\n> <보기:cols=3>\n> (가) $y = 3x^2$\n> (나) $y = -\\frac{2}{3}x^2$\n> (다) $y = -3x^2$\n> (라) $y = \\frac{4}{3}x^2$\n> (마) $y = \\frac{3}{4}x^2$\n> (바) $y = -5x^2$",
};

/**
 * 지면 단 폭·글자 크기 — 기본은 harness.css 의 88mm·10.5pt(2단 시험지 한 단).
 * 트랙 51: `?paperWidth=180mm`(1단 지면) · `?paperFont=13.2px`(시험지 템플릿 글자)로 바꿔 좁은 단 판정을 잰다.
 */
const PARAMS = new URLSearchParams(location.search);
const PAPER_STYLE = {
  ...(PARAMS.get("paperWidth") ? { width: PARAMS.get("paperWidth")! } : {}),
  ...(PARAMS.get("paperFont") ? { fontSize: PARAMS.get("paperFont")! } : {}),
};

/* ── 트랙 46 — 작업실 문항 사례(검수 카드는 그림 자리까지, 지면은 studioProblem 으로) ─────────── */

/** 그림 대역 — 번호가 보이는 작은 SVG. 스크린샷용으로 실제 그림을 넣으려면 `window.__boxFigures`. */
const stand = (n: number, width: number, height: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><polygon points="8,${height - 8} ${width / 2},8 ${width - 8},${height - 8}" fill="none" stroke="#111" stroke-width="2"/><text x="${width / 2}" y="${height - 14}" font-size="16" text-anchor="middle">그림${n}</text></svg>`,
  )}`;
declare global {
  interface Window {
    __boxFigures?: string[];
  }
}

/** 원장님 문제 22 — 작업실 저장본(62ce7f5e…, crop bb84e38a…)의 원문·블록·그림 자리. */
const Q22_RECTS = [
  { x: 0.1044, y: 0.6173, width: 0.1718, height: 0.0921 },
  { x: 0.3086, y: 0.6176, width: 0.13, height: 0.0871 },
  { x: 0.1029, y: 0.7401, width: 0.1511, height: 0.06 },
  { x: 0.3074, y: 0.7369, width: 0.1296, height: 0.0643 },
];
const blockText = (value: string) => ({
  type: "text" as const,
  value,
  rows: [],
});
const choice = (number: number, value: string) => ({
  number,
  contents: [blockText(value)],
});
const baseCrop = (id: string, content: string): StudioCrop => ({
  id,
  sourceId: "harness",
  sourceLabel: "하네스",
  page: 1,
  rect: { x: 0, y: 0, width: 1, height: 1 },
  image: "",
  sourceWidthMm: 210,
  content,
  answer: "",
  solution: "",
  level: "secondary",
  grade: "중1",
  mode: "text",
  added: false,
});
const q22 = (): StudioCrop => ({
  ...baseCrop(
    "q22",
    "아래 보기에서 $\\angle x$의 크기가 큰 것부터 순서대로 바르게 나열한 것은?\n\n> <보기>\n>\n> ㄱ. [그림1]\n> ㄴ. [그림2]\n> ㄷ. [그림3]\n> ㄹ. [그림4]\n\n① ㄹ-ㄷ-ㄱ-ㄴ ② ㄹ-ㄷ-ㄴ-ㄱ ③ ㄷ-ㄹ-ㄱ-ㄴ ④ ㄹ-ㄱ-ㄷ-ㄴ ⑤ ㄱ-ㄴ-ㄷ-ㄹ",
  ),
  figures: Q22_RECTS.map((rect, index) => ({
    id: `figure-${index + 1}`,
    rect,
    image:
      window.__boxFigures?.[index] ??
      stand(
        index + 1,
        Math.round(rect.width * 700),
        Math.round(rect.height * 990),
      ),
  })),
  ocr: {
    number: 22,
    score: 5,
    blocks: [
      blockText("아래 보기에서 "),
      { type: "equation", value: "\\angle x", rows: [] },
      blockText("의 크기가 큰 것부터 순서대로 바르게 나열한 것은?"),
      blockText("<보기>\nㄱ. [그림1]\nㄴ. [그림2]\nㄷ. [그림3]\nㄹ. [그림4]"),
    ],
    choiceGroups: [
      choice(1, "ㄹ-ㄷ-ㄱ-ㄴ"),
      choice(2, "ㄹ-ㄷ-ㄴ-ㄱ"),
      choice(3, "ㄷ-ㄹ-ㄱ-ㄴ"),
      choice(4, "ㄹ-ㄱ-ㄷ-ㄴ"),
      choice(5, "ㄱ-ㄴ-ㄷ-ㄹ"),
    ],
    subQuestions: [],
    confidence: "high",
    choicesLayout: "2x3",
    bodyMissing: false,
    choicesMissing: false,
  },
});
/** «내용 수정»을 거친 문항 — 지면은 저장 원문(parseProblemContent)으로 그린다. */
const edited = (id: string, content: string): StudioCrop => ({
  ...baseCrop(id, content),
  ocr: {
    number: 9,
    blocks: [],
    choiceGroups: [],
    subQuestions: [],
    confidence: "high",
    choicesLayout: "auto",
    bodyMissing: false,
    choicesMissing: false,
    contentEdited: true,
  },
});
const CROPS: Record<string, () => StudioCrop> = {
  q22,
  q22edited: () => {
    const crop = q22();
    return {
      ...crop,
      id: "q22edited",
      ocr: { ...crop.ocr!, contentEdited: true, blocks: [], choiceGroups: [] },
    };
  },
  box9crop: () => edited("box9crop", CASES.box9!),
  box9cols3: () =>
    edited("box9cols3", CASES.box9!.replace("> <보기>", "> <보기:cols=3>")),
  // 보기 번호 격자 — 분수가 든 칸과 안 든 칸이 한 행에 선다(칸이 위쪽 정렬 → 기준선이 갈린다).
  choicesFrac: () => ({
    ...baseCrop("choicesFrac", ""),
    ocr: {
      number: 3,
      blocks: [blockText("다음 중 가장 큰 수는?")],
      choiceGroups: [
        {
          number: 1,
          contents: [{ type: "equation", value: "\\frac{5}{2}", rows: [] }],
        },
        { number: 2, contents: [{ type: "equation", value: "-3", rows: [] }] },
        {
          number: 3,
          contents: [{ type: "equation", value: "\\frac{1}{3}", rows: [] }],
        },
        { number: 4, contents: [{ type: "equation", value: "2", rows: [] }] },
        {
          number: 5,
          contents: [{ type: "equation", value: "\\frac{7}{4}", rows: [] }],
        },
      ],
      subQuestions: [],
      confidence: "high",
      choicesLayout: "2x3",
      bodyMissing: false,
      choicesMissing: false,
    },
    content: "다음 중 가장 큰 수는?",
  }),
};

/** 검수 카드가 받는 그림 — 작업실 StudioReviewPane 의 visualFigures 와 같은 모양. */
const cardFigures = (crop: StudioCrop) =>
  crop.figures?.map((figure, index) => ({
    svg: figure.svg,
    imageData: figure.image,
    label: `그림 ${index + 1}`,
    box: [
      figure.rect.y * 1000,
      figure.rect.x * 1000,
      (figure.rect.y + figure.rect.height) * 1000,
      (figure.rect.x + figure.rect.width) * 1000,
    ] as [number, number, number, number],
  }));

function CropHarness({ crop }: { crop: StudioCrop }) {
  const source = studioReviewContent(crop);
  const figures = cardFigures(crop);
  return (
    <main>
      <section data-panel="editor">
        <MathTextEditor
          aria-label="문제 내용"
          value={source}
          onChange={() => {}}
          figures={figures}
          choicesLayout={crop.ocr?.choicesLayout}
        />
      </section>
      <output data-stored>{JSON.stringify(source)}</output>
      <section data-panel="card">
        <SourceEditorDisplay
          value={source}
          figures={figures}
          choicesLayout={crop.ocr?.choicesLayout}
        />
      </section>
      <section data-panel="paper">
        <div data-unified-paper style={PAPER_STYLE}>
          <div data-hwpx-body>
            <NativeProblem problem={studioProblem(crop)} print />
          </div>
        </div>
      </section>
    </main>
  );
}

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
        <div data-unified-paper style={PAPER_STYLE}>
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

/** 문제은행 지면(`ProblemContent`) — 작업실이 아닌 문항은 이 렌더러로 선다(UnifiedProblem). */
const BANK: Record<string, string> = {
  bankFrac:
    "다음 중 가장 큰 수는?\n① $\\frac{5}{2}$\n② $-3$\n③ $\\frac{1}{3}$\n④ $2$\n⑤ $\\frac{7}{4}$",
};
function BankHarness({ content }: { content: string }) {
  return (
    <main>
      <section data-panel="paper">
        <div data-unified-paper style={PAPER_STYLE}>
          <div data-hwpx-body>
            <ProblemContent content={content} deferFigures={false} />
          </div>
        </div>
      </section>
    </main>
  );
}

const caseName = new URLSearchParams(location.search).get("case") ?? "";
const cropCase = CROPS[caseName];
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {cropCase ? (
      <CropHarness crop={cropCase()} />
    ) : BANK[caseName] ? (
      <BankHarness content={BANK[caseName]} />
    ) : (
      <Harness />
    )}
  </StrictMode>,
);
