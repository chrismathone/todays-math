/**
 * 글자 배경색 — 원장님 2026-09-19 «글자 배경색도 추가할 수 있도록».
 *
 * SVG `<text>` 에는 배경이 없다. 원문 `<text>` 에는 **색만** `data-text-bg` 로 남기고(되돌리기·저장·다시 열기를
 * 같이 탄다), 조판할 때(`typesetFigureSvg` — 화면·저장 이미지·인쇄가 모두 이 길) 글자 뒤에 채운 사각형을 둔다.
 * 사각형은 라벨 묶음(`<g data-object-id>`) **안** 맨 앞에 들어가 글자와 같이 움직이고, 요소 번호를 받지 않는다
 * (번호는 원문의 도형 요소에만 붙는다 — 트랙 2 가 고친 «바탕 rect 가 1번 요소» 함정을 피한다).
 */
import { SVG_NS } from "./figureSvgEditing";

export const TEXT_BG_ATTR = "data-text-bg";
/** 글자 둘레 여백 — 글자 크기에 비례(흰 테두리 halo 보다 조금 넓게). */
const PAD_EM = 0.15;
/** 조판 못 한 글자(`<text>` 그대로)의 어림 — 한글·전각은 1em, 빈칸 0.25em, 나머지 0.55em. */
const FULL_WIDTH = /[ᄀ-ᇿ①-⓿⺀-鿿가-힯＀-￯※]/u;
const ASCENT_EM = 0.86;
const DESCENT_EM = 0.14;

/** 원문 `<text>` 의 배경색 — `#rrggbb` 만 그린다(다른 값은 없음으로 본다). */
export function textBackgroundColor(node: Element): string | null {
  const value = node.getAttribute(TEXT_BG_ATTR) ?? "";
  return /^#[\da-f]{6}$/i.test(value) ? value : null;
}

/** 글자 상자 — 둘레 여백(글자 크기 비례)까지. 배경 사각형과 «뒤 선 끊기» 구멍(`figureMidLabel`)이 같이 쓴다. */
export type TextBox = { x: number; y: number; width: number; height: number };

function padded(
  box: { left: number; top: number; width: number; height: number },
  fontSize: number,
): TextBox {
  const pad = PAD_EM * fontSize;
  return {
    x: box.left - pad,
    y: box.top - pad,
    width: box.width + pad * 2,
    height: box.height + pad * 2,
  };
}

function rect(doc: Document, color: string, box: TextBox) {
  const node = doc.createElementNS(SVG_NS, "rect");
  const f = (value: number) => value.toFixed(2);
  node.setAttribute("x", f(box.x));
  node.setAttribute("y", f(box.y));
  node.setAttribute("width", f(box.width));
  node.setAttribute("height", f(box.height));
  node.setAttribute("fill", color);
  node.setAttribute("stroke", "none");
  return node;
}

/**
 * 조판한 라벨(`<g data-label …>`)의 상자. 라벨이 적어 둔 **그 상자**(`data-x`·`data-w`·`data-base`·`data-a`·`data-d`
 * — `placeLabel` 이 판정기용으로 남기는 치수)를 그대로 쓴다. 자식 `<path>` 를 되짚는 어림을 하나 더 두지 않는다.
 */
export function labelBox(label: Element): TextBox {
  const n = (name: string) => Number(label.getAttribute(name)) || 0;
  const width = n("data-w"),
    x = n("data-x");
  const anchor = label.getAttribute("data-anchor");
  const left =
    anchor === "end" ? x - width : anchor === "middle" ? x - width / 2 : x;
  return padded(
    {
      left,
      top: n("data-base") - n("data-a"),
      width,
      height: n("data-a") + n("data-d"),
    },
    n("data-fs"),
  );
}

/** 조판한 라벨 뒤의 사각형. */
export const labelBackground = (doc: Document, label: Element, color: string) =>
  rect(doc, color, labelBox(label));

/**
 * 조판하지 못한 글자(한글 일반 글자 등 — `<text>` 그대로 남는다)의 상자. 글꼴을 모르는 자리라 **어림**이다
 * (한글·전각 1em). 여백이 어림의 어긋남을 덮는다.
 */
export function plainTextBox(text: Element): TextBox {
  const fontSize = Number(text.getAttribute("font-size")) || 18;
  const x = Number(text.getAttribute("x")) || 0;
  const y = Number(text.getAttribute("y")) || 0;
  const width =
    [...(text.textContent ?? "")].reduce(
      (sum, char) =>
        sum + (FULL_WIDTH.test(char) ? 1 : char === " " ? 0.25 : 0.55),
      0,
    ) * fontSize;
  const anchor = text.getAttribute("text-anchor");
  const left =
    anchor === "end" ? x - width : anchor === "middle" ? x - width / 2 : x;
  const middle = ["middle", "central"].includes(
    text.getAttribute("dominant-baseline") ?? "",
  );
  const top = middle
    ? y - ((ASCENT_EM + DESCENT_EM) / 2) * fontSize
    : y - ASCENT_EM * fontSize;
  return padded(
    { left, top, width, height: (ASCENT_EM + DESCENT_EM) * fontSize },
    fontSize,
  );
}

/** 조판하지 못한 글자 뒤의 사각형. */
export const plainTextBackground = (
  doc: Document,
  text: Element,
  color: string,
) => rect(doc, color, plainTextBox(text));
