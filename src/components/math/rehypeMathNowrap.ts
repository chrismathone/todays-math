import type { Element, Root } from "hast";

/**
 * 짧은 인라인 식은 **안에서 줄을 바꾸지 않게** 한다.
 *
 * KaTeX 는 연산 기호 · 관계 기호 뒤마다 줄바꿈 자리를 둔다. 그래서 시험지 한 단(88mm)에서 «$(n-$ / $1)$개» ·
 * «$\frac18<x<$ / $\frac14$» 처럼 짧은 식이 둘로 갈렸다(2026-10-20 교차 검수 — Codex · Claude · Gemini 셋 다 짚었다).
 * 긴 식은 칸을 넘지 않도록 KaTeX 의 자리를 그대로 둔다.
 *
 * ⚠️ 식 **바깥** 글자는 건드리지 않는다 — 식 뒤 조사를 감싸개로 옮겼더니 글자 마디가 갈려 «…$x$를 유한소수로»를
 *    한 마디로 찾던 화면이 못 찾았다(`ProblemBankFormatFilter`). 그래서 감싸개를 새로 만들지 않고 `.katex` 에 속성만 단다.
 *
 * 렌더러(rehype-katex) **뒤**에 돈다 — 식의 길이는 KaTeX 가 남긴 MathML 의 TeX 원문(`annotation`)으로 잰다.
 */
export const MATH_NOWRAP_MAX_TEX = 40;
const NOWRAP = "white-space:nowrap";

function classes(node: Element): unknown[] {
  const cls = node.properties?.className;
  return Array.isArray(cls) ? cls : typeof cls === "string" ? cls.split(/\s+/) : [];
}

function texOf(node: Element): string | null {
  for (const child of node.children) {
    if (child.type !== "element") continue;
    if (child.tagName === "annotation") {
      const t = child.children[0];
      return t && t.type === "text" ? t.value : "";
    }
    const inner = texOf(child);
    if (inner !== null) return inner;
  }
  return null;
}

function walk(node: Root | Element): void {
  for (const child of node.children) {
    if (child.type !== "element") continue;
    const list = classes(child);
    if (list.includes("katex-display")) continue;
    if (child.tagName === "span" && list.includes("katex")) {
      const tex = (texOf(child) ?? "").replace(/\\displaystyle\s*/g, "");
      if (tex.length <= MATH_NOWRAP_MAX_TEX) {
        const style = typeof child.properties.style === "string" ? child.properties.style : "";
        child.properties.style = style ? `${style};${NOWRAP}` : NOWRAP;
      }
      continue;
    }
    walk(child);
  }
}

export function rehypeMathNowrap() {
  return (tree: Root) => walk(tree);
}
