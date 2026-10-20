/**
 * 렌더된 HTML 에서 **사람 눈에 보이는 글자**만 뽑는다 — 값(문자열)이 아니라 지면을 본다.
 *
 * KaTeX 가 조판한 수식(`.katex`)은 `⟦수식⟧` 한 덩어리, 회색 폴백(`.math-raw`)은 `⟦날것:…⟧`,
 * 붉은 원문(`.katex-error` · `color:#cc0000`)은 `⟦붉은:…⟧` 로 적는다. 그 밖의 글자에 남은
 * `\명령` · `\(` `\[` · 외톨이 `\` · `$` 가 «새는 글자»다(후보정 감사 재현기 `pipeline.mts` 의 판정과 같은 자).
 */
export interface VisibleMath {
  /** 보이는 글자(공백은 한 칸으로). */
  text: string;
  /** 수식 밖 보이는 글자에 남은 날 TeX 조각. */
  leaks: string[];
  /** 조판된 수식 수. */
  math: number;
  /** 붉은 원문 수. */
  red: number;
  /** 회색 폴백 수. */
  raw: number;
  /** 화면에 보이는 한글 글자 수(수식 안 `\text{한글}` 포함). */
  hangul: number;
}

const LEAK = /\\[A-Za-z]+|\\[()[\]{}]|\\(?![A-Za-z()[\]{}])|\$+/g;
const HANGUL = /[가-힣]/g;

export function visibleMath(html: string): VisibleMath {
  const root = document.createElement("div");
  root.innerHTML = html;
  let text = "";
  let shown = "";
  let math = 0;
  let red = 0;
  let raw = 0;
  const textOf = (node: Node): string =>
    node.nodeType === Node.TEXT_NODE
      ? (node.textContent ?? "")
      : node instanceof Element && node.classList.contains("katex-mathml")
        ? ""
        : [...node.childNodes].map(textOf).join("");
  const walk = (node: Node, inMath: boolean) => {
    if (node.nodeType === Node.TEXT_NODE) {
      shown += node.textContent ?? "";
      if (!inMath) text += node.textContent ?? "";
      return;
    }
    if (!(node instanceof Element)) return;
    if (node.classList.contains("katex-mathml")) return;
    if (
      node.classList.contains("katex-error") ||
      /#cc0000/i.test(node.getAttribute("style") ?? "")
    ) {
      red++;
      const t = textOf(node);
      shown += t;
      text += ` ⟦붉은:${t}⟧ `;
      return;
    }
    if (node.classList.contains("math-raw")) {
      raw++;
      const t = textOf(node);
      shown += t;
      text += ` ⟦날것:${t}⟧ `;
      return;
    }
    const isKatex = node.classList.contains("katex");
    if (isKatex) math++;
    if (isKatex && !inMath) text += " ⟦수식⟧ ";
    for (const child of node.childNodes) walk(child, inMath || isKatex);
  };
  walk(root, false);
  // 식 뒤 조사 앞의 WORD JOINER(U+2060 — `rehypeMathNowrap` 의 `joinParticles`, D-164 ⑴)는 폭이 없어 안 보인다.
  text = text.replace(/\u2060/g, "").replace(/\s+/g, " ").trim();
  return {
    text,
    // 붉은 원문은 조판이 아니라 노출이다 — 샘으로 센다. 회색 폴백은 따로(`raw`).
    leaks:
      text
        .replace(/⟦붉은:([^⟧]*)⟧/g, "$1")
        .replace(/⟦날것:[^⟧]*⟧/g, "")
        .match(LEAK) ?? [],
    math,
    red,
    raw,
    hangul: shown.match(HANGUL)?.length ?? 0,
  };
}

/** 원문의 한글 글자 수 — 지면이 한글을 삼켰는지 견줄 때. */
export const hangulCount = (source: string) =>
  source.match(HANGUL)?.length ?? 0;
