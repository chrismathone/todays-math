/**
 * 모눈 배경 — math-figure-editor 2026-10-21 «배경을 모눈으로 만들고 그 위에 그린다. 배경 전체가 모눈이면 안 되고
 * 원본처럼 여백은 남겨서(복사·붙여넣기에 좋게). 가로세로 선을 조절할 수 있게».
 *
 * 모눈은 **요소가 아니라 배경 층 하나**다 — `<g data-grid="x y 칸폭 칸높이 열 행">` 안의 `<path>` 한 줄.
 * - 엔진(`scripts/figure/graph_scene.py` 의 `grid_svg`)이 graph-1 `grid` 칸으로 같은 모양을 낸다. 두 곳이 같은
 *   속성을 읽고 쓴다 — 엔진이 그린 모눈도 여기서 칸 수·간격을 고친다.
 * - 편집기는 `[data-grid]` 안을 요소로 세지 않는다(`prepareFigureSvg` 의 번호 매기기). 그래서 고르기·옮기기·
 *   AI «요청대로 고치기»의 요소 목록에 안 걸리고, 모눈 위를 눌러도 빈 곳을 누른 것과 같다.
 * - 칸은 화면에서 정사각형이 기본이다(인쇄 모눈종이). 엔진이 낸 모눈도 칸폭 = 칸높이다.
 *
 * todays-math 상류에는 없는 파일이다(이 저장소에서 처음 생겼다).
 */
import {
  editableFigureDoc,
  readFigureSvg,
  serializeFigureSvg,
  SVG_NS,
} from "./figureSvgEditing";
import { isFigureGridLayer, parseFigureGridData } from './figureGridMetadata';

export interface FigureGrid {
  /** 왼쪽 위 모서리(그림 좌표) */
  x: number;
  y: number;
  /** 칸 한 변(그림 좌표) — 가로·세로 */
  cellW: number;
  cellH: number;
  cols: number;
  rows: number;
  color: string;
  width: number;
  dashed: boolean;
}

export const GRID_MAX_CELLS = 60;
export const GRID_COLORS = [
  ["연하게", "#cccccc"],
  ["보통", "#aaaaaa"],
  ["진하게", "#777777"],
] as const;
export const GRID_WIDTHS = [0.5, 0.8, 1.2] as const;
const DEFAULT_COLOR = "#aaaaaa";
const DEFAULT_WIDTH = 0.8;
const DASH = "3 3";
const NON_RENDERING = new Set(
  "defs title desc clipPath mask marker pattern linearGradient radialGradient".split(
    " ",
  ),
);

const round = (v: number) => Math.round(v * 100) / 100;
const clampInt = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, Math.round(v)));

/** 모눈 선 — 바깥 테두리까지 열+1·행+1 줄. 엔진 `grid_svg` 와 같은 꼴(M x y V y1 · M x y H x1). */
export function figureGridPath(g: FigureGrid): string {
  const x1 = g.x + g.cellW * g.cols;
  const y1 = g.y + g.cellH * g.rows;
  let d = "";
  for (let i = 0; i <= g.cols; i++)
    d += `M${round(g.x + g.cellW * i)} ${round(g.y)}V${round(y1)}`;
  for (let j = 0; j <= g.rows; j++)
    d += `M${round(g.x)} ${round(g.y + g.cellH * j)}H${round(x1)}`;
  return d;
}

function gridElement(doc: Document) {
  return [...doc.querySelectorAll('g[data-grid]')].find(isFigureGridLayer);
}

function parseGrid(node: Element): FigureGrid | null {
  const parsed = parseFigureGridData(node.getAttribute('data-grid'));
  if (!parsed) return null;
  const dash = node.getAttribute("stroke-dasharray");
  return {
    ...parsed,
    color: node.getAttribute("stroke") ?? DEFAULT_COLOR,
    width: Number(node.getAttribute("stroke-width")) || DEFAULT_WIDTH,
    dashed: !!dash && dash !== "none",
  };
}

/** 그림의 모눈 — 없으면 null. */
export function readFigureGrid(svg: string): FigureGrid | null {
  const doc = readFigureSvg(svg);
  const node = gridElement(doc);
  return node ? parseGrid(node) : null;
}

const viewBoxOf = (root: Element) => {
  const v = (root.getAttribute("viewBox") ?? "")
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  return v.length === 4 && v.every(Number.isFinite) && v[2] > 0 && v[3] > 0
    ? v
    : null;
};

/**
 * 새로 깔 모눈 — 지금 틀 안에 **여백을 남기고** 정사각형 칸으로 채운다. 칸 크기는 짧은 변을 12칸쯤으로.
 * 이미 그려 둔 것은 그대로다(모눈은 맨 뒤 층).
 */
export function defaultFigureGrid(svg: string): FigureGrid {
  const root = readFigureSvg(svg).documentElement;
  const [vx, vy, vw, vh] = viewBoxOf(root) ?? [0, 0, 480, 360];
  const margin = Math.max(8, Math.min(vw, vh) * 0.08);
  const cell = Math.max(6, Math.round((Math.min(vw, vh) - margin * 2) / 12));
  const cols = clampInt((vw - margin * 2) / cell, 1, GRID_MAX_CELLS);
  const rows = clampInt((vh - margin * 2) / cell, 1, GRID_MAX_CELLS);
  return {
    x: round(vx + (vw - cols * cell) / 2),
    y: round(vy + (vh - rows * cell) / 2),
    cellW: cell,
    cellH: cell,
    cols,
    rows,
    color: DEFAULT_COLOR,
    width: DEFAULT_WIDTH,
    dashed: false,
  };
}

/**
 * 모눈을 깔거나 고치거나(grid) 걷는다(null). 모눈이 틀 밖으로 나가면 **틀을 넓혀** 여백까지 들인다
 * (줄이지는 않는다 — 줄이기는 «다 보이게»). 모눈은 늘 맨 뒤 층이다.
 */
export function setFigureGrid(svg: string, grid: FigureGrid | null): string {
  if (grid && (!parseFigureGridData([grid.x, grid.y, grid.cellW, grid.cellH, grid.cols, grid.rows].join(' ')) ||
      !parseFigureGridData([grid.x, grid.y, grid.cellW, grid.cellH, grid.cols, grid.rows].map(round).join(' ')) ||
      !Number.isFinite(grid.width) || grid.width <= 0 || grid.width > 256)) {
    throw new Error('모눈은 유한한 정사각형 칸과 1~60개의 정수 칸 수여야 합니다.');
  }
  const doc = editableFigureDoc(svg);
  const root = doc.documentElement;
  const old = gridElement(doc);
  if (!grid) {
    if (!old) return svg;
    old.remove();
    return serializeFigureSvg(doc);
  }
  const g: FigureGrid = {
    ...grid,
    cols: clampInt(grid.cols, 1, GRID_MAX_CELLS),
    rows: clampInt(grid.rows, 1, GRID_MAX_CELLS),
    cellW: Math.max(1, grid.cellW),
    cellH: Math.max(1, grid.cellH),
  };
  const node = doc.createElementNS(SVG_NS, "g");
  node.setAttribute(
    "data-grid",
    [g.x, g.y, g.cellW, g.cellH, g.cols, g.rows].map(round).join(" "),
  );
  node.setAttribute("fill", "none");
  node.setAttribute("stroke", /^#[0-9a-f]{6}$/i.test(g.color) ? g.color : DEFAULT_COLOR);
  node.setAttribute("stroke-width", String(g.width > 0 ? g.width : DEFAULT_WIDTH));
  if (g.dashed) node.setAttribute("stroke-dasharray", DASH);
  const path = doc.createElementNS(SVG_NS, "path");
  path.setAttribute("d", figureGridPath(g));
  node.append(path);
  if (old) old.replaceWith(node);
  else {
    const first = [...root.children].find(
      (child) => !NON_RENDERING.has(child.localName),
    );
    root.insertBefore(node, first ?? null);
  }
  growFrame(root, g);
  return serializeFigureSvg(doc);
}

function growFrame(root: Element, g: FigureGrid) {
  const view = viewBoxOf(root);
  if (!view) return;
  const [vx, vy, vw, vh] = view;
  const margin = Math.max(8, Math.min(g.cellW * g.cols, g.cellH * g.rows) * 0.05);
  const left = Math.min(vx, g.x - margin);
  const top = Math.min(vy, g.y - margin);
  const right = Math.max(vx + vw, g.x + g.cellW * g.cols + margin);
  const bottom = Math.max(vy + vh, g.y + g.cellH * g.rows + margin);
  if (left === vx && top === vy && right === vx + vw && bottom === vy + vh)
    return;
  const w = right - left;
  const h = bottom - top;
  root.setAttribute("viewBox", [left, top, w, h].map(round).join(" "));
  // width·height 는 원문에 있을 때만 — 틀과 같은 비로 늘린다.
  if (root.hasAttribute("width")) root.setAttribute("width", String(round(w)));
  if (root.hasAttribute("height")) root.setAttribute("height", String(round(h)));
}

/**
 * 모눈을 틀 가운데로 — 칸 수·크기는 그대로. **칸 단위로만** 옮긴다: 그림의 끝점이 격자점에 놓여 있으므로
 * 반 칸이라도 밀면 모든 끝점이 격자에서 벗어난다.
 */
export function centerFigureGrid(svg: string, grid: FigureGrid): FigureGrid {
  const root = readFigureSvg(svg).documentElement;
  const view = viewBoxOf(root);
  if (!view) return grid;
  const [vx, vy, vw, vh] = view;
  const shiftX = Math.round((vx + (vw - grid.cellW * grid.cols) / 2 - grid.x) / grid.cellW);
  const shiftY = Math.round((vy + (vh - grid.cellH * grid.rows) / 2 - grid.y) / grid.cellH);
  return {
    ...grid,
    x: round(grid.x + shiftX * grid.cellW),
    y: round(grid.y + shiftY * grid.cellH),
  };
}

/**
 * 칸 수 바꾸기 — 2026-10-21 «칸수를 늘리더라도 그림이 찌그러지지 않게». 그림은 손대지 않고 모눈만 늘고 준다.
 * 늘거나 준 칸은 **양쪽에 반씩**(홀수면 오른쪽·아래가 한 칸 더), 그리고 칸 단위라 격자점이 그대로다.
 */
export function resizeFigureGrid(grid: FigureGrid, axis: "x" | "y", count: number): FigureGrid {
  if (!Number.isFinite(count)) throw new Error('모눈 칸 수는 유한한 수여야 합니다.');
  const n = Math.min(GRID_MAX_CELLS, Math.max(1, Math.round(count)));
  const current = axis === "x" ? grid.cols : grid.rows;
  const lead = Math.trunc((n - current) / 2);
  return axis === "x"
    ? { ...grid, cols: n, x: round(grid.x - lead * grid.cellW) }
    : { ...grid, rows: n, y: round(grid.y - lead * grid.cellH) };
}

export interface FigureBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 그림의 선·도형이 차지한 상자(그림 좌표). 글자는 뺀다 — 축 이름처럼 모눈 밖에 두는 글자가 흔하다.
 * 화면에 몰래 그려 잰다(`fitFigureViewport` 와 같은 방식). 잴 수 없는 환경이면 null.
 */
export function measureFigureContent(svg: string): FigureBox | null {
  if (typeof document === "undefined") return null;
  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-20000px;top:0;width:800px;visibility:hidden;pointer-events:none";
  host.innerHTML = svg;
  document.body.append(host);
  try {
    const root = host.querySelector("svg");
    const toUser = root?.getScreenCTM?.()?.inverse();
    if (!root || !toUser) return null;
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (const el of root.querySelectorAll<SVGGraphicsElement>("[data-object-id]")) {
      if (el.localName === "text" || el.closest("text,[data-grid]")) continue;
      const b = el.getBBox?.();
      const m = el.getScreenCTM?.();
      if (!b || !m || (b.width === 0 && b.height === 0)) continue;
      for (const [px, py] of [
        [b.x, b.y],
        [b.x + b.width, b.y],
        [b.x, b.y + b.height],
        [b.x + b.width, b.y + b.height],
      ] as const) {
        const p = new DOMPoint(px, py).matrixTransform(m).matrixTransform(toUser);
        left = Math.min(left, p.x);
        top = Math.min(top, p.y);
        right = Math.max(right, p.x);
        bottom = Math.max(bottom, p.y);
      }
    }
    return Number.isFinite(left)
      ? { x: left, y: top, width: right - left, height: bottom - top }
      : null;
  } catch {
    return null;
  } finally {
    host.remove();
  }
}

/** 그림이 모눈 밖으로 나간 칸 수(쪽마다). 선 굵기만큼은 봐준다(칸의 0.15). */
export function gridShortfall(grid: FigureGrid, box: FigureBox) {
  const need = (overflow: number, cell: number) =>
    overflow > cell * 0.15 ? Math.ceil(overflow / cell - 0.15) : 0;
  return {
    left: need(grid.x - box.x, grid.cellW),
    right: need(box.x + box.width - (grid.x + grid.cellW * grid.cols), grid.cellW),
    top: need(grid.y - box.y, grid.cellH),
    bottom: need(box.y + box.height - (grid.y + grid.cellH * grid.rows), grid.cellH),
  };
}

/** 모자란 칸만큼 늘려 그림이 다 들어가게 — 칸 단위라 격자점이 그대로다. */
export function coverFigureGrid(grid: FigureGrid, box: FigureBox): FigureGrid {
  const s = gridShortfall(grid, box);
  return {
    ...grid,
    x: round(grid.x - s.left * grid.cellW),
    y: round(grid.y - s.top * grid.cellH),
    cols: Math.min(GRID_MAX_CELLS, grid.cols + s.left + s.right),
    rows: Math.min(GRID_MAX_CELLS, grid.rows + s.top + s.bottom),
  };
}

export function figureGridSummary(grid: FigureGrid | null, content?: FigureBox | null) {
  if (!grid) return "없음 · 깔기";
  const s = content ? gridShortfall(grid, content) : null;
  const short = s && s.left + s.right + s.top + s.bottom > 0;
  return `${grid.cols} × ${grid.rows} 칸${short ? " · ⚠ 그림이 모눈 밖" : ""}`;
}
