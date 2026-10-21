// math-figure-editor → todays-math: 패치 01·02 가 넣는 것의 시험. 위치 제안: src/__tests__/unit/figureGridLabels.test.ts
// (모눈 배경 층 · 칸 수 바꾸기/모자람 경고 · 라벨 표기 · 글자를 놓는 순간의 한글 수식 변환)
import { describe, expect, it } from "vitest";
import {
  centerFigureGrid,
  coverFigureGrid,
  defaultFigureGrid,
  gridShortfall,
  readFigureGrid,
  resizeFigureGrid,
  setFigureGrid,
  type FigureGrid,
} from "@/components/unified/figure-editor/figureGrid";
import { figureObjects, prepareFigureSvg } from "@/components/unified/figure-editor/figureSvgEditing";
import { hwpLabelToTex } from "@/components/unified/figure-editor/FigureLabelInput";
import { figureLabelMarks } from "@/lib/figure/vectorLabel";

const BASE = prepareFigureSvg(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><line x1="20" y1="20" x2="200" y2="150" stroke="#000"/></svg>',
);

describe("모눈 배경", () => {
  it("깔면 여백을 남긴 정사각형 칸 — 요소로 세지 않는다", () => {
    const grid = defaultFigureGrid(BASE);
    expect(grid.cellW).toBe(grid.cellH);
    expect(grid.x).toBeGreaterThan(0);
    expect(grid.x + grid.cellW * grid.cols).toBeLessThan(300);
    const svg = setFigureGrid(BASE, grid);
    expect(readFigureGrid(svg)).toMatchObject({ cols: grid.cols, rows: grid.rows });
    expect(figureObjects(prepareFigureSvg(svg))).toHaveLength(1);
    expect(svg.indexOf("data-grid")).toBeLessThan(svg.indexOf("<line"));
  });
  it("엔진이 낸 모눈(graph-1 grid)도 읽고, 요소로 세지 않는다", () => {
    const engine = prepareFigureSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 518.4 360"><g data-grid="48.00 48.00 26.400 26.400 16 10" fill="none" stroke="#aaaaaa" stroke-width="0.8"><path d="M48 48V312"/></g><line x1="1" y1="1" x2="9" y2="9" stroke="#000"/></svg>',
    );
    expect(readFigureGrid(engine)).toMatchObject({ x: 48, y: 48, cellW: 26.4, cols: 16, rows: 10 });
    expect(figureObjects(engine)).toHaveLength(1);
  });
  it("지우면 모눈만 없어진다", () => {
    const svg = setFigureGrid(setFigureGrid(BASE, defaultFigureGrid(BASE)), null);
    expect(readFigureGrid(svg)).toBeNull();
    expect(figureObjects(svg)).toHaveLength(1);
  });
});

describe("칸 수 바꾸기 — 그림은 그대로, 격자점도 그대로", () => {
  const grid: FigureGrid = { x: 40, y: 30, cellW: 20, cellH: 20, cols: 10, rows: 6, color: "#aaaaaa", width: 0.8, dashed: false };
  it("늘리고 줄이면 양쪽에 반씩(칸 단위)", () => {
    expect(resizeFigureGrid(grid, "x", 14)).toMatchObject({ cols: 14, x: 0 });
    expect(resizeFigureGrid(grid, "x", 11)).toMatchObject({ cols: 11, x: 40 });
    expect(resizeFigureGrid(grid, "x", 6)).toMatchObject({ cols: 6, x: 80 });
  });
  it("모눈이 그림보다 작으면 모자란 칸 수를 쪽마다 — 늘리기는 칸 단위", () => {
    const box = { x: 25, y: 30, width: 230, height: 118 };
    expect(gridShortfall(grid, box)).toEqual({ left: 1, right: 1, top: 0, bottom: 0 });
    const covered = coverFigureGrid(grid, box);
    expect(covered).toMatchObject({ x: 20, cols: 12 });
    expect(gridShortfall(covered, box)).toEqual({ left: 0, right: 0, top: 0, bottom: 0 });
  });
  it("가운데로도 칸 단위로만", () => {
    const centered = centerFigureGrid(BASE, grid);
    expect((centered.x - grid.x) % grid.cellW).toBe(0);
    expect((centered.y - grid.y) % grid.cellH).toBe(0);
  });
});

describe("라벨 표기 — todays-math 본문 조판과 같게", () => {
  it("벡터·호·선분", () => {
    expect(figureLabelMarks("\\vec{AB}")).toBe("\\overrightarrow{\\mathrm{AB}}");
    expect(figureLabelMarks("\\vec{a}+\\vec{b}")).toBe("\\vec{a}+\\vec{b}");
    expect(figureLabelMarks("\\overset{\\frown}{AB}")).toBe("\\overparen{\\mathrm{AB}}");
    expect(figureLabelMarks("\\overline{A'B'}")).toBe("\\overline{\\mathrm{A'B'}}");
  });
  it("수식 칸의 한글 수식은 놓는 순간에도 TeX 로", () => {
    expect(hwpLabelToTex("$root2$")).toBe("$\\sqrt{2}$");
    expect(hwpLabelToTex("root2")).toBe("root2");
  });
});
