import { describe, expect, it } from "vitest";
import { rotateFigureSelection } from "@/components/unified/figure-editor/figureRotate";
import { mirrorFigureSelection } from "@/components/unified/figure-editor/figureMirror";
import { alignFigureSelection, spreadFigureSelection } from "@/components/unified/figure-editor/figureAlign";
import { applyPoint, elementMatrix, type Point } from "@/components/unified/figure-editor/figureEditGeometry";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
<g data-object-id="a" transform="translate(100 80) scale(2)"><g transform="translate(5 10)"><path d="M 0 0 L 20 0 L 20 40 L 0 40 Z"/></g></g>
<g data-object-id="b" transform="translate(200 50)"><rect width="20" height="40"/></g>
<g data-object-id="c" transform="translate(300 60)"><rect width="20" height="40"/></g>
</svg>`;
const at = (source: string, id: string, point: Point): Point => {
  const doc = new DOMParser().parseFromString(source, "image/svg+xml");
  const shape = doc.querySelector(`[data-object-id="${id}"] path, [data-object-id="${id}"] rect`)!;
  return applyPoint(elementMatrix(shape), point);
};

describe("그림 에셋 배치 변환", () => {
  it("내부 변환을 포함한 중심으로 회전하고 네 번 돌면 원위치", () => {
    let result = rotateFigureSelection(svg, ["a"], "cw");
    expect(at(result, "a", [0, 0])).toEqual([170, 120]);
    for (let i = 0; i < 3; i++) result = rotateFigureSelection(result, ["a"], "cw");
    expect(at(result, "a", [0, 0])).toEqual([110, 100]);
    expect(at(result, "a", [20, 40])).toEqual([150, 180]);
  });
  it.each(["vertical", "horizontal"] as const)("%s 대칭을 두 번 적용하면 원위치", (axis) => {
    const result = mirrorFigureSelection(svg, ["a"], axis);
    expect(at(result, "a", [0, 0])).toEqual(axis === "vertical" ? [150, 100] : [110, 180]);
    expect(at(mirrorFigureSelection(result, ["a"], axis), "a", [0, 0])).toEqual([110, 100]);
  });
  it("그림과 다른 요소의 보이는 경계를 정렬", () => {
    const result = alignFigureSelection(svg, ["a", "b"], "left");
    expect(at(result, "a", [0, 0])[0]).toBe(110);
    expect(at(result, "b", [0, 0])[0]).toBe(110);
  });
  it("세 그림 사이 간격을 균등하게 배치", () => {
    const result = spreadFigureSelection(svg, ["a", "b", "c"], "horizontal");
    expect(at(result, "b", [0, 0])[0]).toBe(215);
  });
});
