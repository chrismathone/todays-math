// @vitest-environment node
/**
 * 한글이 **실제 Chrome 에서** 어절 단위로 줄을 바꾸는가 (D-164 ② · 2026-10-21 합의 C — `mathTextWrap.ts`).
 *
 * jsdom 은 줄을 안 나눈다 — 제품 CSS(KaTeX · Tailwind · `TestPrint.module.css`)와 지면 글꼴을 그대로 실은 Chromium 에서
 * 폭을 바꿔 가며 글자마다 줄을 잰다.
 *
 * 판정 — 한 글 마디 안에서 **이웃한 두 한글 음절이 다른 줄에 섰는가**(어절이 갈렸는가). 그 어절이 제 칸보다 넓으면
 * (`overflow-wrap:anywhere` 가 끊어야 하는 자리) 갈림으로 안 센다 — 넓이는 한 줄로 펼친 폭에서 잰다.
 *
 * 팔 둘 — 같은 제품 마크업에서:
 *   · 대조군: 두 클래스를 걷은 것(2026-10-20 의 지면). **실제로 어절이 갈려야 시험이 유효하다** — 어떤 폭에서도
 *     안 갈리면 «제품이 안 갈린다»는 아무것도 증명하지 못한다(2026-08-20 «양성만 대면 지어냄이 구조적으로 0»).
 *   · 제품: 한 번도 안 갈려야 한다.
 * 그리고 넓이 — 띄어쓰기 없는 긴 마디는 그래도 끊겨야 한다(대조군이 안 넘치는 폭에서 제품만 넘치면 안 된다).
 *
 * 범위(합의 «공용 본문의 영어 분기는 범위를 가른다»): 문제 본문 · 보기 · 상자 · 그림 캡션(`ProblemContent`) · 작업실 원본
 * 문항(`NativeProblem`) · 정답 · 해설(`MathText` — `SolutionText` 가 이것을 지난다). 영어 문항은 이 렌더러를 안 지난다
 * (`ProblemBody` 의 `EnglishQuestion`).
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { SolutionText } from "@/components/math/MathText";
import { MATH_TEXT_WRAP } from "@/components/math/mathTextWrap";
import { ProblemContent } from "@/components/math/ProblemContent";
import NativeProblem from "@/components/unified/NativeProblem";
import {
  studioProblem,
  type StudioCrop,
} from "@/components/unified/studioHelpers";

import { writeProbe } from "../../../scripts/qa/paperProbe";
import { assertPaperFonts, paperDocument } from "../helpers/paperChrome";

const BODY =
  "어떤 수에 3을 더한 다음 2를 곱하였더니 처음 수의 세 배보다 4만큼 작아졌습니다. 처음 수를 구하시오.";
/** 보기마다 240 ~ 460px 칸에서 줄이 한 번은 바뀌는 길이다(짧으면 대조군도 안 갈려 시험이 헛돈다). */
const CHOICES =
  "다음 중 사각형에 대한 설명으로 옳은 것은?\n① 네 변의 길이가 모두 같은 사각형은 항상 정사각형이다.\n② 두 쌍의 대변이 각각 평행한 사각형은 평행사변형이다.\n③ 두 대각선의 길이가 같은 평행사변형은 직사각형이다.\n④ 한 쌍의 대변이 평행한 사각형은 언제나 마름모이다.\n⑤ 이웃하는 두 변의 길이가 같은 직사각형은 마름모가 아니다.";
const BOX =
  "<보기>에서 옳은 것만을 있는 대로 고른 것은?\n< 보 기 >\nㄱ. 두 변의 길이가 같은 삼각형은 이등변삼각형이다.\nㄴ. 네 각의 크기가 모두 같은 사각형은 정사각형이다.\nㄷ. 한 쌍의 대변이 평행한 사각형은 사다리꼴이다.\n1. ㄱ\n2. ㄴ\n3. ㄱ, ㄷ";
const SOLUTION =
  "삼각형의 세 내각의 크기의 합은 $180^{\\circ}$이므로 나머지 한 각의 크기는 $180^{\\circ}-(50^{\\circ}+60^{\\circ})=70^{\\circ}$입니다.\n\n따라서 가장 큰 각의 크기는 $70^{\\circ}$입니다.";
/** 2열 보기(`fitsTwoColumns`) — 칸이 좁아 240 ~ 460px 에서도 보기 안에서 줄이 바뀐다. */
const CHOICES_2COL =
  "다음 중 이등변삼각형인 것은?\n① 정삼각형의 한 변\n② 직각이등변삼각형\n③ 마름모의 대각선\n④ 정사각형의 꼭짓점\n⑤ 사다리꼴의 밑변";
/** 2열 〈보기〉 상자 — 칸이 좁고 상자가 넘친 것을 잘라 그린다(`overflow-hidden`). */
const BOX_2COL =
  "다음 중 옳은 것을 모두 고르시오.\n\n> <보기:cols=2>\n>\n> ㄱ. 두 변의 길이가 같은 삼각형\n>\n> ㄴ. 세 각의 크기가 모두 같은 삼각형\n>\n> ㄷ. 한 내각이 직각인 삼각형\n>\n> ㄹ. 두 대각선이 서로 수직인 사각형";
/** 그림 자리 캡션(D-164 ③④) — 그림 아래 가운데에 붙는 글. */
const CAPTION =
  "다음 그림을 보고 물음에 답하시오.\n\n[그림:1] ⑴ 이등변삼각형의 꼭짓점에서 밑변에 내린 수선의 발을 구하시오.\n\n선분의 길이를 구하시오.";
const CAPTION_FIGURE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='100'/>";
/** 띄어쓰기 없는 한 마디 둘(한글 · 로마자) — 칸보다 넓다. 끊겨야 한다. */
const LONG =
  "다음글자들을띄어쓰기없이길게이어쓴문장이칸보다넓을때도지면밖으로넘치지않아야합니다 abcdefghijklmnopqrstuvwxyzabcdefghijklmnop 의 값을 구하시오.";

const CROP: StudioCrop = {
  id: "wrap",
  sourceId: "src",
  sourceLabel: "어절 줄바꿈",
  page: 1,
  rect: { x: 0, y: 0, width: 1, height: 1 },
  image: "/api/library/assets/crop",
  content: BODY,
  answer: "",
  solution: "",
  level: "secondary",
  grade: "중1",
  mode: "text",
};

/** 지면 셋의 글 틀 — 자습 지면(`.problemText`) · 통합 인쇄(`ProblemBody` 인라인) · 정답 지면(`AnswerPage` 의 절). */
const UNIFIED_STYLE =
  "font-family:var(--paper-font-serif);font-size:13px;line-height:1.85;overflow-wrap:anywhere";
const ANSWER_STYLE =
  "font-family:var(--paper-font-serif);font-size:12px;line-height:1.8;overflow-wrap:anywhere";

const problem = (content: string, className?: string, figureUrls?: string[]) =>
  renderToStaticMarkup(
    <ProblemContent
      content={content}
      className={className}
      figureUrls={figureUrls}
      figureDims={figureUrls ? [160, 100] : undefined}
      deferFigures={false}
    />,
  );
const native = (content: string) =>
  renderToStaticMarkup(
    <NativeProblem problem={studioProblem({ ...CROP, content })} print />,
  );
const solution = (text: string) =>
  renderToStaticMarkup(<SolutionText text={text} />);

const CASES: Array<{ id: string; style: string; html: string }> = [
  { id: "paper:body", style: "", html: problem(BODY, "problemText") },
  { id: "paper:choices", style: "", html: problem(CHOICES, "problemText") },
  { id: "paper:box", style: "", html: problem(BOX, "problemText") },
  {
    id: "paper:choices-2col",
    style: "",
    html: problem(CHOICES_2COL, "problemText"),
  },
  { id: "paper:box-2col", style: "", html: problem(BOX_2COL, "problemText") },
  {
    id: "paper:caption",
    style: "",
    html: problem(CAPTION, "problemText", [CAPTION_FIGURE]),
  },
  { id: "paper:long", style: "", html: problem(LONG, "problemText") },
  { id: "unified:native-body", style: UNIFIED_STYLE, html: native(BODY) },
  { id: "unified:native-choices", style: UNIFIED_STYLE, html: native(CHOICES) },
  { id: "unified:native-long", style: UNIFIED_STYLE, html: native(LONG) },
  { id: "answer:solution", style: ANSWER_STYLE, html: solution(SOLUTION) },
  { id: "screen:body", style: "", html: problem(BODY) },
  { id: "screen:solution", style: "", html: solution(SOLUTION) },
  // 화면에는 조상의 `overflow-wrap` 이 없다 — 긴 마디를 끊는 것은 이 규칙의 둘째 클래스뿐이다
  { id: "screen:long", style: "", html: problem(LONG) },
];

type Arm = "control" | "product";

/** 대조군 — 두 클래스만 걷는다(뿌리에 그 둘뿐이면 속성째). 나머지 마크업은 한 글자도 안 바꾼다. */
function strip(html: string): string {
  return html
    .replaceAll(` class="${MATH_TEXT_WRAP}"`, "")
    .replaceAll(`${MATH_TEXT_WRAP} `, "")
    .replaceAll(` ${MATH_TEXT_WRAP}`, "");
}

function caseHtml(arm: Arm): string {
  return CASES.map(({ id, style, html }) => {
    expect(html, `${id} 의 제품 렌더에 어절 줄바꿈 클래스가 있다`).toContain(
      MATH_TEXT_WRAP,
    );
    const body = arm === "control" ? strip(html) : html;
    if (arm === "control")
      expect(body, `${id} 대조군에서 클래스를 다 걷었다`).not.toContain(
        "keep-all",
      );
    return `<div data-case="${id}" style="${style}">${body}</div>`;
  }).join("\n");
}

const MIN_WIDTH = 240;
const MAX_WIDTH = 460;

/**
 * 재는 글 — 폭 훑기를 페이지 **안에서** 한 번에 돈다. 이름 붙은 함수를 만들지 않는다(esbuild 가 `__name` 을 끼워
 * page 안에서 죽는다 · `paperProbe` 함정 3). KaTeX 속 글은 안 본다(식은 이 규칙의 대상이 아니다).
 * 마디 = 글 마디 안의 빈칸 없는 덩어리. 넓이는 칸을 넉넉히(4000px) 펼친 폭에서 한 번 잰다.
 */
const MEASURE = `(() => {
  const HANGUL = /[\\uAC00-\\uD7A3]/;
  const boxes = [...document.querySelectorAll("[data-case]")];
  const runs = [];
  for (const box of boxes) {
    box.style.width = "4000px";
    const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.parentElement.closest(".katex")) continue;
      let block = n.parentElement;
      while (block !== box && getComputedStyle(block).display.startsWith("inline")) block = block.parentElement;
      for (const m of n.data.matchAll(/\\S+/g)) {
        if (!/[\\uAC00-\\uD7A3]{2}/.test(m[0])) continue;
        const r = document.createRange();
        r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
        runs.push({ box, node: n, block, start: m.index, end: m.index + m[0].length, natural: r.getBoundingClientRect().width });
      }
    }
  }
  const out = [];
  for (let width = ${MIN_WIDTH}; width <= ${MAX_WIDTH}; width += 2) {
    for (const b of boxes) b.style.width = width + "px";
    for (const run of runs) {
      const s = getComputedStyle(run.block);
      const room = run.block.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
      if (run.natural > room - 0.5) continue;
      let lastTop = null;
      for (let i = run.start; i < run.end; i += 1) {
        const r = document.createRange();
        r.setStart(run.node, i); r.setEnd(run.node, i + 1);
        const top = r.getBoundingClientRect().top;
        const ch = run.node.data[i];
        if (lastTop !== null && HANGUL.test(ch) && HANGUL.test(run.node.data[i - 1]) && Math.abs(top - lastTop) > 3) {
          out.push({ id: run.box.dataset.case, width, word: run.node.data.slice(run.start, run.end), at: i - run.start });
          break;
        }
        lastTop = top;
      }
    }
  }
  return { runs: runs.length, splits: out };
})()`;

/** 계산된 스타일 — 글 마디마다 그 부모가 어절 줄바꿈을 받았는가(Tailwind 산출물에 규칙이 실제로 있는가까지). */
const STYLES = `(() => {
  const out = [];
  for (const box of document.querySelectorAll("[data-case]")) {
    const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.data.trim() || n.parentElement.closest(".katex")) continue;
      const s = getComputedStyle(n.parentElement);
      out.push({ id: box.dataset.case, text: n.data.slice(0, 12), wordBreak: s.wordBreak, overflowWrap: s.overflowWrap });
    }
  }
  return out;
})()`;

let browser: Browser;
beforeAll(async () => {
  browser = await chromium.launch({ headless: true });
}, 180_000);
afterAll(async () => {
  await browser?.close();
}, 60_000);

async function openProbe(arm: Arm, media: "screen" | "print"): Promise<Page> {
  const page = await browser.newPage({
    viewport: { width: 4200, height: 900 },
  });
  await page.emulateMedia({ media });
  const html = await paperDocument(
    caseHtml(arm),
    "[data-case]{margin:0 0 24px 8px}",
  );
  await page.goto(writeProbe(`math-text-wrap-${arm}-${media}.html`, html));
  await assertPaperFonts(page, '[data-case="paper:body"] p');
  return page;
}

type Split = { id: string; width: number; word: string; at: number };

async function sweep(arm: Arm, media: "screen" | "print") {
  const page = await openProbe(arm, media);
  const got = (await page.evaluate(MEASURE)) as {
    runs: number;
    splits: Split[];
  };
  await page.close();
  const byCase: Record<string, Split[]> = {};
  for (const s of got.splits) (byCase[s.id] ??= []).push(s);
  return { runs: got.runs, byCase };
}

describe("한글은 Chrome 에서 어절 단위로 줄을 바꾼다 (D-164 ②)", () => {
  it("글 마디마다 keep-all · 긴 마디 끊기를 받는다 — 대조군은 안 받는다", async () => {
    for (const arm of ["product", "control"] as const) {
      const page = await openProbe(arm, "print");
      const styles = (await page.evaluate(STYLES)) as Array<{
        id: string;
        text: string;
        wordBreak: string;
        overflowWrap: string;
      }>;
      await page.close();
      expect(
        new Set(styles.map((s) => s.id)).size,
        "모든 상자에 글이 있다",
      ).toBe(CASES.length);
      for (const s of styles) {
        const where = `${arm} ${s.id} «${s.text}»`;
        if (arm === "product") {
          expect(s.wordBreak, where).toBe("keep-all");
          // 〈보기〉 상자의 칸은 제 클래스(`break-words`)로 끊는다 — 둘 다 칸보다 긴 마디를 끊는다
          expect(["anywhere", "break-word"], where).toContain(s.overflowWrap);
        } else expect(s.wordBreak, where).toBe("normal");
      }
    }
  }, 300_000);

  for (const media of ["print", "screen"] as const)
    it(`${media} 매체 — 대조군은 어절이 실제로 갈리고, 제품은 한 번도 안 갈린다`, async () => {
      const control = await sweep("control", media);
      const product = await sweep("product", media);
      expect(control.runs, "잴 마디가 있다").toBeGreaterThan(40);
      expect(product.runs).toBe(control.runs);
      const idle: string[] = [];
      const split: string[] = [];
      for (const { id } of CASES) {
        if (id.endsWith(":long")) continue; // 긴 마디 상자 — 아래 넓이 시험이 본다
        if (!(control.byCase[id] ?? []).length) idle.push(id);
        for (const s of (product.byCase[id] ?? []).slice(0, 3))
          split.push(`${id} ${s.width}px «${s.word}»`);
      }
      expect(idle, "대조군이 한 번은 어절을 갈라야 시험이 유효하다").toEqual(
        [],
      );
      expect(split, "제품이 어절을 갈랐다").toEqual([]);
    }, 300_000);

  /**
   * 좁은 칸(60~238px) — 어절째 넘기기가 **새 가로 넘침**을 만들지 않는가. 띄어쓰기 없는 긴 마디는 `overflow-wrap` 이
   * 끊는다. 대조군도 넘치는 폭(식 한 덩이가 칸보다 넓다)은 이 규칙 탓이 아니다 — 폭마다 **넘친 양**을 대조군과 견준다.
   * 상자 하나의 `scrollWidth` 만 보면 옆 칸을 침범하되 상자 안에 머무는 것 · 잘려 안 보이는 것(〈보기〉 상자는
   * `overflow-hidden`)을 놓친다 — 그래서 안쪽 상자마다 «제 폭보다 넓게 그려진 내용»도 잰다(KaTeX 속 · SVG 속은 뺀다).
   */
  for (const media of ["print", "screen"] as const)
    it(`${media} 매체 — 좁은 칸에서도 넘친 양이 대조군보다 안 크다 · 긴 마디는 끊긴다`, async () => {
      const OVERFLOW = `(() => {
        const boxes = [...document.querySelectorAll("[data-case]")];
        const out = {};
        for (let width = 60; width < ${MIN_WIDTH}; width += 2) {
          for (const b of boxes) b.style.width = width + "px";
          for (const b of boxes) {
            let inner = 0;
            b.querySelectorAll("*:not(.katex *, svg, svg *)").forEach((el) => {
              if (el.clientWidth > 0 && el.scrollWidth - el.clientWidth > inner) inner = el.scrollWidth - el.clientWidth;
            });
            (out[b.dataset.case] ??= []).push([width, b.scrollWidth - b.clientWidth, inner]);
          }
        }
        return out;
      })()`;
      const over = async (arm: Arm) => {
        const page = await openProbe(arm, media);
        const got = (await page.evaluate(OVERFLOW)) as Record<
          string,
          [number, number, number][]
        >;
        await page.close();
        return got;
      };
      const control = await over("control");
      const product = await over("product");
      const worse: string[] = [];
      for (const { id } of CASES)
        product[id]!.forEach(([width, outer, inner], i) => {
          const [, outerC, innerC] = control[id]![i]!;
          // 긴 마디 상자에는 식이 없다 — 어느 폭에서도 넘치면 안 된다(끊기지 않으면 넘친다)
          const limit = id.endsWith(":long")
            ? [0.5, 0.5]
            : [outerC + 0.5, innerC + 0.5];
          if (outer > limit[0]! || inner > limit[1]!)
            worse.push(
              `${id} ${width}px 칸 ${outer}(대조 ${outerC}) · 안쪽 ${inner}(대조 ${innerC})`,
            );
        });
      expect(worse.slice(0, 8), "제품이 더 넘친 폭").toEqual([]);
    }, 300_000);
});
