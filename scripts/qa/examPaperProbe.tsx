/**
 * **기출 2단 지면 실측 하네스** — 진짜 A4 지면을 Chromium 에 그려 잰다 (읽기 전용).
 *
 * `paperProbe.tsx` 의 기출 판이다. 쓰는 스타일시트는 같은 셋(KaTeX · Tailwind 산출물 ·
 * 지면 모듈 CSS 원문)이고, 다른 것은 **어떤 DOM 을 그리는가**뿐이다.
 *
 * ## 🔴 왜 마크업을 여기서 다시 짓나 — 그리고 무엇이 그것을 지키나
 *
 * `PastPaperTemplate` 은 CSS 모듈을 들여오므로 node 에서 그대로 못 부른다(빌드가 이름을
 * 해시한다). 그래서 `paperProbe` 와 같은 방식으로 **원문 클래스 이름**으로 DOM 을 짓는다.
 * 그러면 마크업이 두 벌이 되고, 두 벌은 반드시 갈라진다 —
 * `examPaperProbeParity.test.tsx` 가 **제품 컴포넌트가 실제로 낸 마크업**과 여기 것을
 * 대조해 잠근다(클래스 이름·중첩·그림 배선).
 *
 * ## 함정 (paperProbe 가 이미 밟은 것들)
 *  (1) `setContent` 는 about:blank 라 `file://` 스타일시트가 막힌다 → 파일로 써서 `goto`.
 *  (2) `emulateMedia({media:"print"})` 를 **반드시** 켠다 — 그림 상한이 화면 360px ·
 *      인쇄 70mm(264.6px)라 안 켜면 그림 있는 문항이 통째로 높게 나온다.
 *  (3) `page.evaluate` 안에서 이름 붙은 함수를 만들면 esbuild 가 `__name` 을 끼워
 *      ReferenceError 로 죽는다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";

import { ProblemContent } from "../../src/components/math/ProblemContent";
import { PAPER_VARS_ATTR, buildTailwindCss, FIGURE_ROOT } from "./paperProbe";

const ROOT = process.cwd();

export interface ExamSlot {
  id: string;
  number: number;
  content: string;
  questionType?: string | null;
  score?: number | null;
  figureUrls?: string[];
  figureDims?: number[];
  figureSourceMm?: number[];
  /** 보기 그림의 짝 — 알면 제품이 그림을 번호 칸 안에 넣는다(`paperProbe.SlotInput` 과 같은 까닭). */
  choiceFigureIndex?: number[];
  figureSvg?: string | null;
}

/** 기출 지면 CSS 원문 — 클래스 이름을 해시하지 않고 그대로 쓴다. */
export async function examPaperStyles(): Promise<string> {
  const katex = readFileSync(
    path.join(ROOT, "node_modules/katex/dist/katex.min.css"),
    "utf8",
  );
  const tailwind = await buildTailwindCss();
  const shell = readFileSync(
    path.join(ROOT, "src/components/print/TestPrint.module.css"),
    "utf8",
  );
  const paper = readFileSync(
    path.join(ROOT, "src/components/print/PastPaper.module.css"),
    "utf8",
  );
  return `<style>${katex}</style><style>${tailwind}</style><style>${shell}</style><style>${paper}</style>`;
}

function bodyMarkup(slot: ExamSlot): string {
  return renderToStaticMarkup(
    <ProblemContent
      className="problemText"
      content={slot.content}
      deferFigures={false}
      figureDims={slot.figureDims}
      figureSourceMm={slot.figureSourceMm}
      choiceFigureIndex={slot.choiceFigureIndex}
      figureSvg={slot.figureSvg ?? null}
      figureUrls={(slot.figureUrls ?? []).map((url) =>
        url.startsWith("/") ? FIGURE_ROOT + url : url,
      )}
    />,
  );
}

/**
 * `PastPaperTemplate` 의 문항 DOM 과 **같은 모양**. 한 글자라도 다르면 측정이 지면과 갈린다.
 *
 * ⚠️ 답란도 소문항 조각도 없다 — 지면이 안 그리기 때문이다(원장님 확정 2026-09-05).
 */
export function renderExamItem(slot: ExamSlot): string {
  const subjective =
    slot.questionType !== null &&
    slot.questionType !== undefined &&
    slot.questionType !== "객관식";
  const kind = subjective
    ? `<span class="kind">${slot.questionType}</span>`
    : "";
  const score =
    slot.score === null || slot.score === undefined
      ? ""
      : `<span class="score">${slot.score}점</span>`;
  return `<article class="item" data-pid="${slot.id}" data-number="${slot.number}">
  <div class="bandRow"><span class="num"><span class="numWord">문</span> ${slot.number}</span>${kind}${score}</div>
  <div class="body"><div data-paper-view>${bodyMarkup(slot)}</div></div>
</article>`;
}

const META = {
  academy: "오늘 수학",
  title: "JH중 3학년 · 2학기 중간고사 대비",
  subtitle: "삼각비 ~ 원주각 · 100점",
};

/** 첫 장/이어지는 장 — `PastPaperTemplate` 과 같은 머리를 붙인다. */
export function renderExamPage(
  kind: "first" | "continuation",
  columns: string[][],
  pageNumber: number,
): string {
  const head =
    kind === "first"
      ? `<header class="masthead"><div class="mastLeft"><div class="academy">${META.academy}</div><div class="mastEn">PAST PAPER</div></div><div class="mastMid"><h1 class="paperTitle">${META.title}</h1><div class="paperSub">${META.subtitle}</div></div><div class="mastRight"><div>이름 ____________</div><div>반 ________</div></div></header>`
      : `<header class="contHead"><span>${META.academy} · ${META.title}</span><span>p. ${pageNumber}</span></header>`;
  const cols = columns
    .map((items) => `<div class="column">${items.join("\n")}</div>`)
    .join("\n");
  return `<section class="a4Page page" data-page-kind="questions" data-page-number="${pageNumber}" style="${PAPER_VARS_ATTR}">
${head}
<div class="columns">${cols}</div>
</section>`;
}

export async function examDocument(pages: string[]): Promise<string> {
  return `<!doctype html><html><head><meta charset="utf-8">${await examPaperStyles()}
<style>body{margin:0;background:#c9c9c7}.gallery{display:flex;flex-direction:column;align-items:center;gap:28px}</style>
</head><body><div class="gallery">${pages.join("\n")}</div></body></html>`;
}

/**
 * 측정 전 온전성 검사 — 스타일시트가 안 붙으면 값이 **통째로 거짓**이다.
 * 0 이 「깨끗」인지 「못 잼」인지 갈라야 한다.
 */
export const EXAM_GUARD = `(() => {
  const a4 = document.querySelector(".a4Page");
  const text = document.querySelector(".problemText");
  const band = document.querySelector(".bandRow");
  const katex = document.querySelector(".katex-mathml");
  return {
    a4Height: a4 ? a4.getBoundingClientRect().height : 0,
    fontSize: text ? getComputedStyle(text).fontSize : "",
    bandGold: band ? getComputedStyle(band).borderLeftWidth : "",
    katexOk: katex ? getComputedStyle(katex).position === "absolute" : true,
  };
})()`;

export function assertExamSane(g: {
  a4Height: number;
  fontSize: string;
  bandGold: string;
  katexOk: boolean;
}) {
  if (!g.katexOk) throw new Error("KaTeX CSS 미적용 — 측정 중단");
  if (Math.abs(g.a4Height - 1122.5) > 2)
    throw new Error(`A4 높이가 297mm 가 아니다: ${g.a4Height}`);
  if (g.fontSize !== "12.5px")
    throw new Error(`본문 글꼴이 지면과 다르다: ${g.fontSize}`);
  // 머리띠가 안 붙으면 문항 높이가 통째로 낮게 나온다 — 지면 CSS 미적용의 증거.
  if (g.bandGold !== "3px")
    throw new Error(`기출 지면 CSS 미적용 (머리띠 금색 바 ${g.bandGold})`);
}
