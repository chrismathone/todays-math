import type { Element, ElementContent, Root } from "hast";

import { displayWidth } from "@/lib/math/displayWidth";
import {
  MATH_PARTICLE_JOINER,
  startsWithMathParticle,
} from "@/lib/math/mathParticles";

/**
 * 짧은 인라인 식은 **안에서 줄을 바꾸지 않게** 한다.
 *
 * KaTeX 는 연산 기호 · 관계 기호 뒤마다 줄바꿈 자리를 둔다. 그래서 시험지 한 단(88mm)에서 «$(n-$ / $1)$개» ·
 * «$\frac18<x<$ / $\frac14$» 처럼 짧은 식이 둘로 갈렸다(2026-10-20 교차 검수 — Codex · Claude · Gemini 셋 다 짚었다).
 * 긴 식은 칸을 넘지 않도록 KaTeX 의 자리를 그대로 둔다.
 *
 * ⚠️ 식 **바깥** 글자는 감싸지 않는다 — 식 뒤 조사를 감싸개로 옮겼더니 글자 마디가 갈려 «…$x$를 유한소수로»를
 *    한 마디로 찾던 화면이 못 찾았다(`ProblemBankFormatFilter`). 그래서 감싸개를 새로 만들지 않고 `.katex` 에 속성만 단다.
 *    식 뒤 조사는 그 글 마디 **맨 앞에 글자 하나**(U+2060)를 넣어 잇는다 — 아래 `joinParticles`.
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

function isShortMath(katex: Element): boolean {
  const tex = (texOf(katex) ?? "").replace(/\\displaystyle\s*/g, "");
  return displayWidth(`$${tex}$`) <= MATH_NOWRAP_MAX_UNITS;
}

function addNowrap(node: Element): void {
  const style = typeof node.properties.style === "string" ? node.properties.style : "";
  if (style.includes(NOWRAP)) return;
  node.properties.style = style ? `${style};${NOWRAP}` : NOWRAP;
}

/**
 * 식 뒤 조사 · 서술격을 식에 잇는다 — «$x$ / 의 값» · «$25$ / 입니다» 로 갈리지 않게(D-164 ⑴, 2026-10-21 합의).
 *
 * KaTeX 의 조각(`.katex-base`)은 원자 인라인(inline-block)이라 그 뒤 한글 앞에 줄바꿈 자리가 있다. Chrome 에서 잰 것
 * (2026-10-21 · `mathParticleBreakChrome.test.tsx`): 그 자리는 **조사 앞의 U+2060 하나로는 안 막힌다**(U+FEFF 도 같다).
 * 둘이 함께일 때만 막힌다 — ⑴ 식의 마지막 조각을 감싼 상자가 `nowrap` 이고 ⑵ 조사 글이 U+2060 으로 시작할 때.
 *   · ⑴ 짧은 식은 `.katex` 가 이미 nowrap 이다(`walk`). 긴 식은 안에서 줄을 바꿔야 하므로 **마지막 조각 하나만**
 *     nowrap 상자에 넣는다 — 그 앞 조각 사이의 줄바꿈 자리는 그대로다. 조각이 하나뿐인 긴 식은 안에 줄바꿈 자리가
 *     없으니 `.katex` 에 nowrap 을 단다(조각 구조를 안 바꾼다 — HWPX 기준선이 첫 조각을 `.katex-html > .katex-base` 로 찾는다).
 *   · ⑵ 조사 글 마디 맨 앞에 WORD JOINER 하나 — 감싸개가 아니라서 글 마디가 그대로다(위 머리말 ⚠️). 폭이 없는 글자라
 *     지면에 안 보이고, HWPX 내보내기도 폭 없는 글자는 옮기지 않는다(`hwpxLayout.ts` 의 `rect.width > 0`).
 *
 * 어느 낱말을 잇는지는 `startsWithMathParticle` 한 곳이 정한다(단위 · 의존명사 · «이상» 은 안 잇는다).
 * 앞 마디가 식으로 **끝나면** 잇는다 — 기호 보기 감싸개(`glueItemMarks`) 안에서 끝난 식도.
 * 블록 식(`katex-display`)은 문단이 따로라 대상이 아니다. 이미 이어진 마디(맨 앞이 U+2060)에는 다시 넣지 않는다.
 */
const INLINE_TAGS = new Set(["span", "strong", "em", "b", "i", "u", "mark"]);

/** 이 마디가 인라인 식으로 **끝나면** 그 `.katex` 를 낸다. */
function trailingMath(node: ElementContent): Element | null {
  if (node.type !== "element") return null;
  const list = classes(node);
  if (list.includes("katex-display")) return null;
  if (node.tagName === "span" && list.includes("katex")) return node;
  const last = node.children[node.children.length - 1];
  return INLINE_TAGS.has(node.tagName) && last !== undefined ? trailingMath(last) : null;
}

/** ⑴ — 긴 식의 마지막 조각을 nowrap 상자에 넣는다. 짧은 식은 `walk` 가 `.katex` 에 nowrap 을 단다. */
function pinLastPiece(katex: Element): void {
  if (isShortMath(katex)) return;
  const html = katex.children.find(
    (child): child is Element => child.type === "element" && classes(child).includes("katex-html"),
  );
  if (!html) return;
  const pieces = html.children.filter(
    (child) => child.type === "element" && classes(child).includes("katex-base"),
  );
  const last = html.children[html.children.length - 1];
  if (pieces.length === 1) addNowrap(katex);
  else if (pieces.length > 1 && last !== undefined && pieces.includes(last))
    html.children[html.children.length - 1] = {
      type: "element", tagName: "span", properties: { style: NOWRAP }, children: [last],
    };
}

function joinParticles(node: Root | Element): void {
  const kids = node.children as ElementContent[];
  for (let i = 1; i < kids.length; i++) {
    const text = kids[i]!;
    if (text.type !== "text") continue;
    const joined = text.value.startsWith(MATH_PARTICLE_JOINER);
    if (!startsWithMathParticle(joined ? text.value.slice(1) : text.value)) continue;
    const katex = trailingMath(kids[i - 1]!);
    if (!katex) continue;
    pinLastPiece(katex);
    if (!joined) text.value = MATH_PARTICLE_JOINER + text.value;
  }
}

function walk(node: Root | Element): void {
  // 잇기가 감싸기보다 먼저다 — 감싸개가 생겨도 조사 마디는 그 감싸개 바로 뒤에 그대로 남는다.
  joinParticles(node);
  glueItemMarks(node);
  for (const child of node.children) {
    if (child.type !== "element") continue;
    const list = classes(child);
    if (list.includes("katex-display")) continue;
    if (child.tagName === "span" && list.includes("katex")) {
      if (isShortMath(child)) addNowrap(child);
      continue;
    }
    walk(child);
  }
}

export function rehypeMathNowrap() {
  return (tree: Root) => walk(tree);
}
