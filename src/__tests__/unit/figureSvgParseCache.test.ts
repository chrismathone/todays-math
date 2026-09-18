import { afterEach, describe, expect, it, vi } from "vitest";
import {
  editableFigureDoc,
  editFigureObject,
  figureObjects,
  prepareFigureSvg,
  readFigureSvg,
  removeFigureObject,
  SVG_NS,
} from "@/components/unified/figure-editor/figureSvgEditing";
import { transformFigureSelection } from "@/components/unified/figure-editor/figureClipboard";
import { previewFigureObjects } from "@/components/unified/figure-editor/figureDragPreview";

/**
 * 끄는 걸음마다 같은 원문을 서너 번 읽고 있었다(원본 편집·미리보기·요소 목록 — 조절점이면 넷).
 * 배포 React · CPU 8배에서 90걸음에 50ms 넘는 프레임이 선 19·조절점 14 (2026-09-18, scripts/perf/figure-drag).
 * 같은 원문은 한 번만 읽고, 고치는 쪽은 **복사본**을 받는다 — 읽기 전용 문서를 고치면 같은 원문을 읽는 곳이 깨진다.
 */
let serial = 0;
const fixture = () =>
  prepareFigureSvg(
    `<svg xmlns="${SVG_NS}" viewBox="0 0 100 ${100 + serial++}"><line x1="0" y1="0" x2="10" y2="10"/><circle cx="5" cy="5" r="2"/></svg>`,
  );
const parsesOf = (spy: { mock: { calls: unknown[][] } }, source: string) =>
  spy.mock.calls.filter((call) => call[0] === source).length;

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("도형 SVG 읽기 기억", () => {
  it("같은 원문은 한 번만 읽는다 — 요소 목록·편집·여럿 옮기기·끌기 미리보기가 한 문서를 나눠 쓴다", () => {
    const svg = fixture();
    const spy = vi.spyOn(DOMParser.prototype, "parseFromString");
    figureObjects(svg);
    figureObjects(svg);
    editFigureObject(svg, "obj-0", { stroke: "#ff0000" });
    transformFigureSelection(svg, [
      { id: "obj-1", transform: "translate(1 1)" },
    ]);
    document.body.innerHTML = svg;
    previewFigureObjects(document.querySelector("svg") as SVGSVGElement, svg, [
      "obj-0",
    ]);
    expect(parsesOf(spy, svg)).toBe(1);
  });
  it("고치는 쪽은 복사본을 받는다 — 편집·삭제 뒤에도 읽기 전용 문서는 그대로다", () => {
    const svg = fixture();
    expect(readFigureSvg(svg)).toBe(readFigureSvg(svg));
    expect(editableFigureDoc(svg)).not.toBe(readFigureSvg(svg));
    expect(editFigureObject(svg, "obj-0", { stroke: "#ff0000" })).toContain(
      'stroke="#ff0000"',
    );
    expect(figureObjects(svg)[0].attrs.stroke).toBeUndefined();
    expect(figureObjects(removeFigureObject(svg, "obj-0"))).toHaveLength(1);
    expect(figureObjects(svg)).toHaveLength(2);
    expect(
      readFigureSvg(svg)
        .querySelector('[data-object-id="obj-1"]')
        ?.getAttribute("transform"),
    ).toBeNull();
    transformFigureSelection(svg, [
      { id: "obj-1", transform: "translate(1 1)" },
    ]);
    expect(
      readFigureSvg(svg)
        .querySelector('[data-object-id="obj-1"]')
        ?.getAttribute("transform"),
    ).toBeNull();
  });
  it("최근 8개만 기억한다 — 아홉째를 읽으면 첫째는 다시 읽는다", () => {
    const first = fixture();
    const spy = vi.spyOn(DOMParser.prototype, "parseFromString");
    figureObjects(first);
    for (let i = 0; i < 8; i++) figureObjects(fixture());
    figureObjects(first);
    expect(parsesOf(spy, first)).toBe(2);
  });
});
