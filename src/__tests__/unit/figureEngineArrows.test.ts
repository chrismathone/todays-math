import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { figureObjects, prepareFigureSvg } from "@/components/unified/figure-editor/figureSvgEditing";
import { rotateFigureSelection } from "@/components/unified/figure-editor/figureRotate";

const read = (svg: string) => new DOMParser().parseFromString(svg, "image/svg+xml");
const wrap = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">${body}</svg>`;

describe("엔진 화살표는 편집 요소 하나", () => {
  it.each([[4, 1], [1, 4], [4, 4]])("Python graph-1 화살표 [%s,%s]는 원래 촉 크기로 선에 붙는다", (x, y) => {
    const spec = { version: "graph-1", xRange: [0, 5], yRange: [0, 5], axes: false, segments: [{ from: [1, 1], to: [x, y], arrow: true }] };
    const result = spawnSync("python", ["scripts/figure/render_spec.py"], { input: JSON.stringify(spec), encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
    expect(result.status, result.stderr).toBe(0);
    const raw = JSON.parse(result.stdout).svg as string;
    expect(raw).toContain('data-arrow="end"');
    const svg = prepareFigureSvg(raw);
    expect(figureObjects(svg)).toHaveLength(1);
    const doc = read(svg), line = doc.querySelector("line")!, head = doc.querySelector("marker polygon")!;
    expect(line.getAttribute("marker-end")).toMatch(/^url\(#engine-arrow-\d+\)$/);
    expect(doc.querySelectorAll("polygon[data-object-id]")).toHaveLength(0);
    expect(head.getAttribute("points")!.split(/[\s,]+/).map(Number).every(Number.isFinite)).toBe(true);
    expect(figureObjects(rotateFigureSelection(svg, [figureObjects(svg)[0].id], "cw"))).toHaveLength(1);
    expect(figureObjects(prepareFigureSvg(svg))).toEqual(figureObjects(svg));
  });

  it("표시하지 않은 삼각형은 선 끝에 닿아 있어도 합치지 않는다", () => {
    const svg = prepareFigureSvg(wrap('<line x1="10" y1="50" x2="100" y2="50"/><polygon points="100,50 92,47 92,53" fill="#111"/>'));
    expect(figureObjects(svg).map((o) => o.type)).toEqual(["line", "polygon"]);
  });

  it("선 끝보다 앞으로 나온 원래 화살촉도 보존하고, 양방향 치수는 양 끝에 붙인다", () => {
    const svg = prepareFigureSvg(wrap('<g data-arrow="both"><line x1="10" y1="50" x2="96" y2="50"/><polygon points="10,50 16,47 16,53"/><polygon points="100,50 94,47 94,53"/></g>'));
    const line = read(svg).querySelector("line")!;
    expect(figureObjects(svg)).toHaveLength(1);
    expect(line.hasAttribute("marker-start")).toBe(true);
    expect(line.hasAttribute("marker-end")).toBe(true);
    expect(read(svg).querySelectorAll("marker")[1].querySelector("polygon")?.getAttribute("points")).toContain("4,0");
  });

  it("형식이 잘못된 표시는 도형을 없애지 않는다", () => {
    expect(figureObjects(prepareFigureSvg(wrap('<g data-arrow="end"><line/><polygon points="1,2 3,4 5,6"/></g>')))).toHaveLength(2);
  });
});
