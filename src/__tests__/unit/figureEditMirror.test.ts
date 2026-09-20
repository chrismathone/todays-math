import { describe, expect, it } from "vitest";
import {
  figureObjects,
  prepareFigureSvg,
  readFigureSvg,
} from "@/components/unified/figure-editor/figureSvgEditing";
import { applyFigureEdits } from "@/components/unified/figure-editor/figureEditApply";
import { mirrorFigureSelection } from "@/components/unified/figure-editor/figureMirror";

/**
 * «요청대로 고치기»의 `mirror` — 편집기 «좌우 대칭»·«상하 대칭» 단추와 **같은 함수**(figureMirror.ts).
 * 원장님 2026-09-20 «대칭(편집기 단추도)». 여기서 보는 것은 «AI 명령이 단추와 한 글자도 다르지 않은가»,
 * 번호·점 이름을 어떻게 받는가, 그리고 단추가 거절하는 것을 똑같이 거절하는가.
 * 그림은 도형 엔진 v2 가 실제로 그린 것(scripts/figure/render_spec.py, 2026-09-19).
 */
const NS = "http://www.w3.org/2000/svg";
const F =
  'font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111"';
const label = (name: string, x: number, y: number, px: number, py: number) =>
  `<text x="${x}" y="${y}" ${F} data-px="${px}" data-py="${py}" data-mj="${name}"><tspan font-style="normal">${name}</tspan></text>`;
const line = (x1: number, y1: number, x2: number, y2: number, extra = "") =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#111111" stroke-width="1.9"${extra} />`;

// 예각삼각형 ABC — A(78.327, 26.807) B(28.327, 176.807) C(258.327, 176.807)
const tri = prepareFigureSvg(`<svg viewBox="0 0 286.654 194.183" xmlns="${NS}">
  <rect width="286.654" height="194.183" fill="#ffffff" />
  <g>${line(78.327, 26.807, 28.327, 176.807)}${line(28.327, 176.807, 258.327, 176.807)}${line(258.327, 176.807, 78.327, 26.807)}</g>
  <g></g>
  <g>${label("A", 70.744, 24.6, 78.327, 26.807)}${label("B", 17.603, 182.183, 28.327, 176.807)}${label("C", 269.051, 182.183, 258.327, 176.807)}</g>
</svg>`);

const ids = (svg: string) => figureObjects(svg).map((o) => o.id);
const elementsXml = (svg: string) =>
  [...readFigureSvg(svg).querySelectorAll("[data-object-id]")].map((el) =>
    new XMLSerializer().serializeToString(el),
  );
const viewBoxOf = (svg: string) =>
  readFigureSvg(svg)
    .documentElement.getAttribute("viewBox")!
    .split(/\s+/)
    .map(Number);

describe("대칭 — 편집기 단추와 같은 함수", () => {
  it("mirrors the whole figure exactly like the editor's 좌우 대칭 button", () => {
    const result = applyFigureEdits(tri, [
      { op: "mirror", targets: "all", axis: "vertical" },
    ]);
    const button = mirrorFigureSelection(tri, ids(tri), "vertical");
    // 요소는 단추와 한 글자도 다르지 않다
    expect(elementsXml(result.svg)).toEqual(elementsXml(button));
    expect(elementsXml(result.svg)).not.toEqual(elementsXml(tri));
    expect(result.applied).toEqual(["그림 전체 좌우 대칭"]);
    // 제 상자 안에서 비치니 틀은 그대로다
    expect(viewBoxOf(result.svg)).toEqual([0, 0, 286.654, 194.183]);
  });

  it("상하 대칭도 단추와 같다", () => {
    const result = applyFigureEdits(tri, [
      { op: "mirror", targets: "all", axis: "horizontal" },
    ]);
    expect(elementsXml(result.svg)).toEqual(
      elementsXml(mirrorFigureSelection(tri, ids(tri), "horizontal")),
    );
    expect(result.applied).toEqual(["그림 전체 상하 대칭"]);
  });

  it("고른 번호만 한 덩어리로 비친다 — 이름은 요소 목록 이름", () => {
    const three = ids(tri).slice(0, 3);
    const result = applyFigureEdits(tri, [
      { op: "mirror", targets: [1, 2, 3], axis: "vertical" },
    ]);
    expect(elementsXml(result.svg)).toEqual(
      elementsXml(mirrorFigureSelection(tri, three, "vertical")),
    );
    expect(result.applied).toEqual(["3개 요소 좌우 대칭"]);
    expect(
      applyFigureEdits(tri, [
        { op: "mirror", targets: [1], axis: "horizontal" },
      ]).applied,
    ).toEqual(["1번 선분 상하 대칭"]);
  });

  it("비춰도 그대로인 것은 바꾸지 않고 그 까닭을 알린다", () => {
    // 2번은 밑변 BC — 가로선이라 제 가로축에 비춰도 자리가 같다
    const result = applyFigureEdits(tri, [
      { op: "mirror", targets: [2], axis: "horizontal" },
    ]);
    expect(result.svg).toBe(tri);
    expect(result.rejected).toEqual(["2번 선분: 대칭할 것이 없습니다"]);
  });

  it("두 점이 정하는 직선에 비춘다 — 점은 이름으로, 그 직선은 그림에 없어도 된다", () => {
    const result = applyFigureEdits(tri, [
      { op: "mirror", targets: [1, 2, 3], axis: ["B", "C"] },
    ]);
    // 밑변 BC 는 가로선 y = 176.807 — 삼각형이 그 아래로 접힌다
    const button = mirrorFigureSelection(tri, ids(tri).slice(0, 3), [
      [28.327, 176.807],
      [258.327, 176.807],
    ]);
    expect(elementsXml(result.svg)).toEqual(elementsXml(button));
    expect(result.applied).toEqual(["3개 요소 직선 BC 대칭"]);
    // 밑변 아래로 나갔으니 틀이 아래만 넓어진다
    const [x, y, w, h] = viewBoxOf(result.svg);
    expect([x, y, w]).toEqual([0, 0, 286.654]);
    expect(h).toBeGreaterThan(194.183);
  });

  it("좌표로도 직선을 줄 수 있다", () => {
    const axis = [
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ] as const;
    const result = applyFigureEdits(tri, [
      { op: "mirror", targets: [1], axis },
    ]);
    expect(elementsXml(result.svg)).toEqual(
      elementsXml(
        mirrorFigureSelection(
          tri,
          [ids(tri)[0]],
          [
            [100, 0],
            [100, 100],
          ],
        ),
      ),
    );
    expect(result.applied).toEqual(["1번 선분 직선 대칭"]);
  });

  it.each([
    [
      tri.replace(
        'stroke-width="1.9"',
        'stroke-width="1.9" data-size-locked="true"',
      ),
      { op: "mirror", targets: "all", axis: "vertical" },
      "그림 전체: 크기 고정한 요소가 있어 대칭할 수 없습니다",
    ],
    [
      tri,
      { op: "mirror", targets: [4], axis: "vertical" },
      "글자 A: 글자는 뒤집히지 않습니다. 함께 옮길 요소를 같이 고르세요",
    ],
    [
      tri,
      { op: "mirror", targets: [9], axis: "horizontal" },
      "9번: 그런 번호의 요소가 없습니다",
    ],
    [
      tri,
      { op: "mirror", targets: [1, 9], axis: "horizontal" },
      "2개 요소: 9번 — 그런 번호의 요소가 없습니다",
    ],
    [
      tri,
      { op: "mirror", targets: [1], axis: ["B", "B"] },
      "1번 선분: 대칭축의 두 점이 같습니다",
    ],
    [
      tri,
      { op: "mirror", targets: [1], axis: ["B", "Z"] },
      "1번 선분: 점 이름 Z — 그림에서 찾지 못했습니다",
    ],
  ])("refuses what the button refuses %#", (svg, command, reason) => {
    const prepared = prepareFigureSvg(svg);
    const result = applyFigureEdits(prepared, [command]);
    expect(result.svg).toBe(prepared);
    expect(result.rejected).toEqual([reason]);
  });

  it("글자 하나라도 직선 축이면 비춘다 — 단추가 막는 것은 세로·가로뿐이다", () => {
    const result = applyFigureEdits(tri, [
      { op: "mirror", targets: [4], axis: ["B", "C"] },
    ]);
    expect(result.rejected).toEqual([]);
    expect(result.applied).toEqual(["글자 A 직선 BC 대칭"]);
    expect(elementsXml(result.svg)).toEqual(
      elementsXml(
        mirrorFigureSelection(
          tri,
          [ids(tri)[3]],
          [
            [28.327, 176.807],
            [258.327, 176.807],
          ],
        ),
      ),
    );
  });
});
