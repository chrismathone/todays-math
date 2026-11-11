import {
  editableFigureDoc,
  serializeFigureSvg,
  SVG_NS,
} from "./figureSvgEditing";

/**
 * 도형 채우기의 빗금 — 원장님 2026-11-11 «채우기에 빗금으로 채우기 추가»(«빗금» 단추 하나 · 방향과 간격을
 * 고른다 · 바탕은 투명). 빗금은 그 도형만의 `<pattern>` 이고 도형은 `fill="url(#…)"` 로 가리킨다 — 화살촉
 * (`marker`)과 같은 꼴이라 붙여넣기의 이름 바꾸기 · 정화 · 옮기기(`figureBake` 의 «무늬»)를 그대로 탄다.
 * 방향은 이름으로 적는다 — 정화기는 역슬래시가 든 값을 지운다(`＼` 를 `\` 로 적으면 사라진다).
 */
export const FIGURE_HATCH_DIRECTIONS = ["right", "left", "cross"] as const;
export const FIGURE_HATCH_GAPS = ["fine", "normal", "wide"] as const;
export type FigureHatchDirection = (typeof FIGURE_HATCH_DIRECTIONS)[number];
export type FigureHatchGap = (typeof FIGURE_HATCH_GAPS)[number];
export interface FigureHatch {
  direction: FigureHatchDirection;
  gap: FigureHatchGap;
  color: string;
}
export const DEFAULT_FIGURE_HATCH = {
  direction: "right",
  gap: "normal",
} as const satisfies Omit<FigureHatch, "color">;

export const FIGURE_HATCH_DIRECTION_LABELS: Record<
  FigureHatchDirection,
  string
> = { right: "／", left: "＼", cross: "×" };
export const FIGURE_HATCH_GAP_LABELS: Record<FigureHatchGap, string> = {
  fine: "촘촘",
  normal: "보통",
  wide: "성김",
};

/** 빗금 사이 — 그림 긴 변의 몇 분의 1. 지면에서 그림 폭이 같으니 간격도 그림마다 같다(보통 ≈ 480 의 8). */
const GAP_DIVISOR: Record<FigureHatchGap, number> = {
  fine: 90,
  normal: 60,
  wide: 40,
};
/** SVG 는 y 가 아래로 자라 rotate(45) 가 세로줄을 «／» 로 눕힌다. */
const ANGLE: Record<FigureHatchDirection, number> = {
  right: 45,
  left: -45,
  cross: 45,
};

const isDirection = (value: string | null): value is FigureHatchDirection =>
  (FIGURE_HATCH_DIRECTIONS as readonly string[]).includes(value ?? "");
const isGap = (value: string | null): value is FigureHatchGap =>
  (FIGURE_HATCH_GAPS as readonly string[]).includes(value ?? "");

function objectOf(doc: Document, id: string) {
  return [...doc.querySelectorAll("[data-object-id]")].find(
    (node) => node.getAttribute("data-object-id") === id,
  );
}

function fillOf(node: Element) {
  return (
    (node as SVGElement).style?.getPropertyValue("fill") ||
    node.getAttribute("fill") ||
    ""
  );
}

function setFill(node: Element, value: string) {
  node.setAttribute("fill", value);
  const styled = node as SVGElement;
  if (styled.style?.getPropertyValue("fill"))
    styled.style.setProperty("fill", value);
}

function hatchPatternOf(doc: Document, node: Element) {
  const id = /^url\(\s*["']?#([\w.-]+)["']?\s*\)$/.exec(fillOf(node))?.[1];
  const pattern = id ? doc.getElementById(id) : null;
  return pattern?.localName === "pattern" && pattern.hasAttribute("data-hatch")
    ? pattern
    : null;
}

/** 그 도형이 빗금이면 그 빗금, 아니면 null. */
export function figureHatchOf(svg: string, id: string): FigureHatch | null {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const node = objectOf(doc, id);
  const pattern = node && hatchPatternOf(doc, node);
  if (!pattern) return null;
  const direction = pattern.getAttribute("data-hatch");
  const gap = pattern.getAttribute("data-hatch-gap");
  return {
    direction: isDirection(direction)
      ? direction
      : DEFAULT_FIGURE_HATCH.direction,
    gap: isGap(gap) ? gap : DEFAULT_FIGURE_HATCH.gap,
    color: pattern.querySelector("line")?.getAttribute("stroke") ?? "#111111",
  };
}

function longSide(doc: Document) {
  const box = (doc.documentElement.getAttribute("viewBox") ?? "")
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  return box.length === 4 && box.every(Number.isFinite) && box[2] > 0
    ? Math.max(box[2], box[3])
    : 480;
}

const round = (value: number) => Math.round(value * 100) / 100;

function drawPattern(
  doc: Document,
  pattern: Element,
  { direction, gap, color }: FigureHatch,
) {
  const size = round(longSide(doc) / GAP_DIVISOR[gap]);
  for (const [key, value] of Object.entries({
    patternUnits: "userSpaceOnUse",
    width: String(size),
    height: String(size),
    patternTransform: `rotate(${ANGLE[direction]})`,
    "data-hatch": direction,
    "data-hatch-gap": gap,
  }))
    pattern.setAttribute(key, value);
  pattern.replaceChildren();
  const strokes = direction === "cross" ? 2 : 1;
  for (let index = 0; index < strokes; index++) {
    const line = doc.createElementNS(SVG_NS, "line");
    const middle = String(round(size / 2));
    // 칸 한가운데에 긋는다 — 가장자리에 그으면 선 굵기의 절반이 칸 밖으로 잘린다.
    const [x1, y1, x2, y2] =
      index === 0
        ? [middle, "0", middle, String(size)]
        : ["0", middle, String(size), middle];
    for (const [key, value] of Object.entries({
      x1,
      y1,
      x2,
      y2,
      stroke: color,
      "stroke-width": String(round(size * 0.12)),
    }))
      line.setAttribute(key, value);
    pattern.append(line);
  }
}

function newPattern(doc: Document) {
  const pattern = doc.createElementNS(SVG_NS, "pattern");
  pattern.setAttribute("id", `hatch-${crypto.randomUUID()}`);
  const defs = doc.createElementNS(SVG_NS, "defs");
  defs.append(pattern);
  doc.documentElement.append(defs);
  return pattern;
}

/**
 * 빗금을 켜거나 바꾸거나(같은 패턴을 고친다) 끈다(null — 패턴을 지우고 빗금 색 그대로 보통 채우기로).
 */
export function setFigureHatch(
  svg: string,
  id: string,
  hatch: FigureHatch | null,
): string {
  const doc = editableFigureDoc(svg);
  const node = objectOf(doc, id);
  if (!node) return svg;
  const existing = hatchPatternOf(doc, node);
  if (!hatch) {
    if (!existing) return svg;
    const color =
      existing.querySelector("line")?.getAttribute("stroke") ?? "#111111";
    const defs = existing.parentElement;
    existing.remove();
    if (defs?.localName === "defs" && !defs.children.length) defs.remove();
    setFill(node, color);
    return serializeFigureSvg(doc);
  }
  const pattern = existing ?? newPattern(doc);
  drawPattern(doc, pattern, hatch);
  setFill(node, `url(#${pattern.getAttribute("id")})`);
  return serializeFigureSvg(doc);
}
