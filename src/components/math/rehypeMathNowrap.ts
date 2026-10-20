import type { Element, ElementContent, Root } from "hast";

import { displayWidth } from "@/lib/math/displayWidth";

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
 * 렌더러(rehype-katex) **뒤**에 돈다 — 식의 너비는 KaTeX 가 남긴 MathML 의 TeX 원문(`annotation`)을 높이 자와 같은
 * 표시폭(`displayWidth`)으로 잰다. 문턱은 시험지 한 단(약 58단위)의 40% 남짓 — TeX 글자 수(40자)로 잡았더니
 * 고등 «$y=-2(x^{2}+2x+2)^{2}+8(x^{2}+2x+2)+k$»(48단위)가 안 끊겨 칸을 넘었다(교차 검수 3회차).
 */
export const MATH_NOWRAP_MAX_UNITS = 24;
const NOWRAP = "white-space:nowrap";

function classes(node: Element): unknown[] {
  // hast 의 className 형은 string 을 안 받는다 — unknown 으로 받아 좁힌다(그대로면 string 갈래가 never 라 tsc 가 죽는다)
  const cls: unknown = node.properties?.className;
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

/**
 * 한 줄에 늘어놓은 기호 보기 «㉠ $식$  ㉡ $식$» — 기호 뒤 빈칸(NBSP 라도)에서 줄이 바뀌어 «㉠» 만 줄 끝에 남았다
 * (교차 검수 4 · 5회차). KaTeX 상자는 원자 인라인이라 NBSP 로는 붙지 않는다 — 기호와 그 식을 한 감싸개로 묶는다.
 * 기호 바로 뒤가 식일 때만이다(«㉠과 ㉡에» 같은 문장 속 기호는 그대로).
 */
const ITEM_MARK = /([㉠-㉭])[ \u00a0]$/;
const glued = new WeakSet<Element>();

function glueItemMarks(node: Root | Element): void {
  if (node.type === "element" && glued.has(node)) return;
  const kids = node.children as ElementContent[];
  for (let i = 0; i + 1 < kids.length; i++) {
    const text = kids[i]!, next = kids[i + 1]!;
    if (text.type !== "text" || next.type !== "element" || next.tagName !== "span" || !classes(next).includes("katex")) continue;
    const m = ITEM_MARK.exec(text.value);
    if (!m) continue;
    const head = text.value.slice(0, m.index);
    const wrap: Element = {
      type: "element", tagName: "span", properties: { style: NOWRAP },
      children: [{ type: "text", value: `${m[1]}\u00a0` }, next],
    };
    glued.add(wrap);
    const replaced: ElementContent[] = head ? [{ type: "text", value: head }, wrap] : [wrap];
    kids.splice(i, 2, ...replaced);
    i += replaced.length - 1;
  }
}

function walk(node: Root | Element): void {
  glueItemMarks(node);
  for (const child of node.children) {
    if (child.type !== "element") continue;
    const list = classes(child);
    if (list.includes("katex-display")) continue;
    if (child.tagName === "span" && list.includes("katex")) {
      const tex = (texOf(child) ?? "").replace(/\\displaystyle\s*/g, "");
      if (displayWidth(`$${tex}$`) <= MATH_NOWRAP_MAX_UNITS) {
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
