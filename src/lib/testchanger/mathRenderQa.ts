import katex from "katex";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import { unified } from "unified";

import { UI_KATEX_OPTIONS } from "@/lib/math/katexRender";
import { preprocessMarkdown } from "@/lib/math/markdownPreprocess";
import { normalizeOcrText } from "@/lib/problem/parseProblemContent";
import { solutionForDisplay } from "@/lib/solutionSteps";

import type {
  CorpusMathCandidate,
  MathCorpusInventory,
} from "./mathCorpusInventory";

export interface PaperRenderCheck {
  /** 지면에 그려지는 모양(수식은 KaTeX HTML, 글은 이스케이프한 글자) */
  html: string;
  safe: boolean;
  /** 안전하지 않은 까닭 */
  why: string[];
}

const HANGUL = /[가-힣]/g;
const countHangul = (text: string): number => text.match(HANGUL)?.length ?? 0;
const escapeHtml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
}

/**
 * 운영 해설 출구(`SolutionText`)와 **같은 조합**으로 그린 지면을 판정한다 —
 *  `solutionForDisplay` → `normalizeOcrText`(MathText) → `preprocessMarkdown`(MarkdownRenderer)
 *  → remark-parse + remark-math(react-markdown 이 쓰는 파서) → 수식 조각만 KaTeX(`UI_KATEX_OPTIONS`).
 *
 * 🔴 2026-09-26 전에는 문자열 경로(`renderMathHtml` — `tokenizeMath` + KaTeX)로 쟀다. 어떤 운영
 *    화면과도 같은 조합이 아니었다(후보정 조사 J). remark-math 는 줄머리 `$$` 뒤 같은 줄 글을
 *    메타로 버리고, `$A$$B$` 를 한 수식으로 읽는다 — 그런 지면을 자는 «안전»이라 했고, 반대로
 *    문자열 경로만 회색 폴백으로 떨어지는 멀쩡한 식은 «위험»이라 했다.
 *
 * `react-dom/server` 를 쓰지 않는다 — 이 자는 서버 컴포넌트(`/dev/transfer-qa`)와 tsx 스크립트가 부른다.
 */
export function checkPaperRender(text: string): PaperRenderCheck {
  const markdown = preprocessMarkdown(
    normalizeOcrText(solutionForDisplay(text) ?? ""),
  );
  const tree = unified().use(remarkParse).use(remarkMath).parse(markdown);
  let html = "";
  let visible = "";
  let shownHangul = 0;
  let failed = 0;
  const walk = (node: MdNode) => {
    if (node.type === "inlineMath" || node.type === "math") {
      const value = node.value ?? "";
      const out = katex.renderToString(value, {
        ...UI_KATEX_OPTIONS,
        throwOnError: false,
        displayMode: node.type === "math",
      });
      if (out.includes("katex-error") || /#cc0000/i.test(out)) failed += 1;
      html += out;
      shownHangul += countHangul(value);
      return;
    }
    // 글·코드·날 HTML — 마크다운이 글자로 그린다(이스케이프는 이미 풀렸다).
    if (typeof node.value === "string") {
      visible += node.value;
      html += escapeHtml(node.value);
      shownHangul += countHangul(node.value);
    }
    for (const child of node.children ?? []) walk(child);
  };
  walk(tree as unknown as MdNode);

  const why: string[] = [];
  if (failed > 0) why.push("붉은 KaTeX");
  // 외톨이 역슬래시도 샘이다(`\\$x$` → 지면 `\ ⟦x⟧`) — 시험의 지면 자(paperView LEAK)와 같은 규칙.
  if (/\\(?:[A-Za-z]+|[()[\]{}])|\\(?![A-Za-z()[\]{}])|\$/.test(visible))
    why.push("수식 밖에 명령·구분자가 남았다");
  if (shownHangul < countHangul(text)) why.push("한글이 지면에서 사라졌다");
  return { html, safe: why.length === 0, why };
}

export interface RenderedCorpusSpecimen extends CorpusMathCandidate {
  html: string;
  safe: boolean;
  coveredKeys: string[];
}

export interface MathRenderQa {
  inventory: MathCorpusInventory;
  specimens: RenderedCorpusSpecimen[];
  missingUnicodeSymbols: string[];
  missingLatexCommands: string[];
  renderedUnicodeSymbols: number;
  renderedLatexCommands: number;
}

function renderCandidate(
  candidate: CorpusMathCandidate,
): RenderedCorpusSpecimen {
  // 운영 해설 지면과 같은 조합으로 잰다 — `checkPaperRender` 주석.
  const { html, safe } = checkPaperRender(candidate.renderText);
  return {
    ...candidate,
    html,
    safe,
    coveredKeys: [
      ...candidate.commands.map((token) => `command:${token}`),
      ...candidate.unicodeSymbols.map((token) => `unicode:${token}`),
    ],
  };
}

function greedyCover(
  candidates: RenderedCorpusSpecimen[],
  universe: Set<string>,
): RenderedCorpusSpecimen[] {
  const uncovered = new Set(universe);
  const remaining = [...candidates];
  const selected: RenderedCorpusSpecimen[] = [];
  while (uncovered.size > 0) {
    let bestIndex = -1;
    let bestCoverage = 0;
    for (let index = 0; index < remaining.length; index += 1) {
      const coverage = remaining[index].coveredKeys.filter((key) =>
        uncovered.has(key),
      ).length;
      if (coverage > bestCoverage) {
        bestCoverage = coverage;
        bestIndex = index;
      }
    }
    if (bestIndex < 0 || bestCoverage === 0) break;
    const [best] = remaining.splice(bestIndex, 1);
    selected.push(best);
    best.coveredKeys.forEach((key) => uncovered.delete(key));
  }
  return selected;
}

export function buildMathRenderQa(
  inventory: MathCorpusInventory,
): MathRenderQa {
  const rendered = inventory.candidates.map(renderCandidate);
  const universe = new Set([
    ...inventory.latexCommands.map((item) => `command:${item.token}`),
    ...inventory.unicodeSymbols.map((item) => `unicode:${item.token}`),
  ]);
  // 시각 표본에는 이미 fallback으로 판정된 후보를 선택하지 않는다. 같은 토큰을
  // 안전하게 그리는 다른 실제 코퍼스 문맥이 있으면 그 문맥만 greedy cover에 쓴다.
  const specimens = greedyCover(
    rendered.filter((candidate) => candidate.safe),
    universe,
  );

  const missingLatexCommands = inventory.latexCommands
    .filter(
      ({ token }) =>
        !rendered.some(
          (item) =>
            item.commands.includes(token) &&
            item.safe &&
            item.html.includes("katex"),
        ),
    )
    .map(({ token }) => token);
  const missingUnicodeSymbols = inventory.unicodeSymbols
    .filter(({ token, mathContextCount }) => {
      if (mathContextCount === 0) return false;
      return !rendered.some(
        (item) =>
          item.unicodeSymbols.includes(token) &&
          item.safe &&
          item.html.includes("katex"),
      );
    })
    .map(({ token }) => token);

  return {
    inventory,
    specimens,
    missingUnicodeSymbols,
    missingLatexCommands,
    renderedUnicodeSymbols:
      inventory.unicodeSymbols.length - missingUnicodeSymbols.length,
    renderedLatexCommands:
      inventory.latexCommands.length - missingLatexCommands.length,
  };
}
