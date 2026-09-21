import {
  SVG_NS,
  cleanFigureForSave,
  engineUprightPieces,
} from "./figureSvgEditing";
import {
  labelBackground,
  plainTextBackground,
  textBackgroundColor,
} from "./figureTextBackground";

/**
 * 조판하지 못한 글자(`<text>` 그대로)에 배경색이 있으면 — 조판한 라벨처럼 묶음(`<g>`)에 싸고 뒤에 사각형을 둔다.
 * 요소 아이디·자리(transform)는 묶음으로 옮긴다(끌기 미리보기·조판 이어 쓰기가 조판한 라벨과 같은 모양을 본다).
 */
function wrapPlainText(doc: Document, node: Element, color: string) {
  const wrapper = doc.createElementNS(SVG_NS, "g");
  for (const name of ["data-object-id", "transform"]) {
    const value = node.getAttribute(name);
    if (value === null) continue;
    wrapper.setAttribute(name, value);
    node.removeAttribute(name);
  }
  node.replaceWith(wrapper);
  wrapper.append(plainTextBackground(doc, node, color), node);
}

const color = (value: string | null, fallback: string) =>
  /^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(value ?? "")
    ? value!
    : value === "white"
      ? "#ffffff"
      : fallback;

/** Mathgen's editable-text/rendered-path split, with local lazy-loaded MathJax. */
export async function typesetFigureSvg(
  source: string,
  preserveObjectIds = false,
): Promise<string> {
  const doc = new DOMParser().parseFromString(source, "image/svg+xml");
  const nodes = [...doc.querySelectorAll("text")].filter(
    (node) => !node.closest("defs,clipPath,mask,marker,pattern"),
  );
  if (nodes.length) {
    const { typesetLabel, placeLabel } = await import("./mathjaxLabel");
    for (const node of nodes) {
      const text = node.getAttribute("data-mj") ?? node.textContent ?? "";
      const background = textBackgroundColor(node);
      const weight = node.getAttribute("font-weight") ?? "400";
      const laid = typesetLabel(
        text,
        weight === "bold" || Number(weight) >= 600,
        // 엔진 라벨은 바깥이 기울임이어도 숫자·단위 조각이 정자다 — 통째로 기울이지 않는다.
        // 편집기를 거친 도형이든 아니든(카드·지면) 같은 글씨체로 선다.
        node.getAttribute("font-style") === "italic" &&
          engineUprightPieces(node).length === 0,
      );
      if (!laid) {
        if (background) wrapPlainText(doc, node, background);
        continue;
      }
      const width = Number(node.getAttribute("stroke-width"));
      const anchor = node.getAttribute("text-anchor");
      const fragment = placeLabel(
        laid,
        text,
        Number(node.getAttribute("x") ?? 0),
        Number(node.getAttribute("y") ?? 0),
        Number(node.getAttribute("font-size") ?? 18),
        color(node.getAttribute("fill"), "#111111"),
        width > 0 && node.getAttribute("stroke") !== "none"
          ? { color: color(node.getAttribute("stroke"), "#ffffff"), width }
          : undefined,
        {
          anchor: anchor === "middle" || anchor === "end" ? anchor : "start",
          centerY: ["middle", "central"].includes(
            node.getAttribute("dominant-baseline") ?? "",
          ),
        },
      );
      if (!fragment) {
        if (background) wrapPlainText(doc, node, background);
        continue;
      }
      const parsed = new DOMParser().parseFromString(
        `<svg xmlns="${SVG_NS}">${fragment}</svg>`,
        "image/svg+xml",
      );
      const wrapper = doc.createElementNS(SVG_NS, "g");
      for (const child of [...parsed.documentElement.childNodes])
        wrapper.append(doc.importNode(child, true));
      const label = background && wrapper.querySelector("[data-label]");
      if (label) wrapper.prepend(labelBackground(doc, label, background));
      if (node.hasAttribute("transform"))
        wrapper.setAttribute("transform", node.getAttribute("transform")!);
      if (preserveObjectIds && node.hasAttribute("data-object-id"))
        wrapper.setAttribute(
          "data-object-id",
          node.getAttribute("data-object-id")!,
        );
      node.replaceWith(wrapper);
    }
  }
  const rendered = new XMLSerializer().serializeToString(doc.documentElement);
  return preserveObjectIds ? rendered : cleanFigureForSave(rendered);
}

const labelKey = (node: Element) =>
  [
    node.textContent ?? "",
    ...[...node.attributes]
      .filter((attr) => attr.name !== "transform")
      .map((attr) => `${attr.name}=${attr.value}`)
      .sort(),
  ].join("\n");

/**
 * 조판(350ms 뒤)이 따라오기 전의 화면. 원문에서 **자리(transform)만** 바뀐 라벨은 앞 조판본을 새 자리로
 * 옮겨 쓰고, 내용·크기·색이 바뀐 라벨과 새 라벨만 날것으로 둔다. 전에는 원문이 바뀌면 그림 전체를 날것으로
 * 보여, 끄는 동안·놓은 직후마다 모든 라벨이 `y(\mathrm{m/sec})` 같은 원문으로 바뀌었다(2026-09-18).
 */
export function carryTypeset(
  previousSource: string,
  rendered: string,
  source: string,
): string {
  const read = (svg: string) =>
    new DOMParser().parseFromString(svg, "image/svg+xml");
  const byId = (doc: Document) =>
    new Map(
      [...doc.querySelectorAll("[data-object-id]")].map((node) => [
        node.getAttribute("data-object-id")!,
        node,
      ]),
    );
  const next = read(source);
  const before = byId(read(previousSource)),
    laid = byId(read(rendered));
  for (const node of [...next.querySelectorAll("text[data-object-id]")]) {
    const id = node.getAttribute("data-object-id")!;
    const old = before.get(id),
      wrapper = laid.get(id);
    if (!old || wrapper?.localName !== "g" || labelKey(old) !== labelKey(node))
      continue;
    const carried = next.importNode(wrapper, true) as Element;
    const transform = node.getAttribute("transform");
    if (transform) carried.setAttribute("transform", transform);
    else carried.removeAttribute("transform");
    node.replaceWith(carried);
  }
  return new XMLSerializer().serializeToString(next.documentElement);
}
