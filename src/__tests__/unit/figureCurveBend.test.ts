/**
 * 곡선 도구 — 한가운데 노란 손잡이 · 처음 휘어짐 (원장님 2026-09-22).
 * «치수선이 없을때 사용자가 곡선을 이용해 치수선을 만들려고하면, 자꾸 함수처럼 너무 과하게 곡선이 그려지는데,
 *  꺾이는곳에 도형처럼 노란원을 배치해서 곡선 정도를 조정할 수 있게» → «둘 다 넣기».
 *
 * 곡선은 `M P0 Q C P2` 한 토막이다. 곡선의 한가운데 점은 (P0 + 2C + P2) / 4 — 옅은 파란 «휘어짐 조절»(C)은
 * 곡선에서 꼭대기의 두 배만큼 떨어져 있어 끌어도 곡선이 손을 안 따라온다. 노란 손잡이는 곡선 **위**에 있고,
 * 끈 자리 M 을 곡선이 지나가게 C = 2M − (P0 + P2) / 2 로 되짚는다.
 */
import { describe, expect, it } from "vitest";

import { describeFigureForEdit } from "@/components/unified/figure-editor/figureEditElements";
import {
  CURVE_BEND_HANDLE,
  figureHandles,
  moveFigureHandle,
} from "@/components/unified/figure-editor/figureHandles";
import {
  addFigureObject,
  figureObjects,
  prepareFigureSvg,
  SVG_NS,
} from "@/components/unified/figure-editor/figureSvgEditing";

const EMPTY = prepareFigureSvg(
  `<svg xmlns="${SVG_NS}" viewBox="0 0 400 300"></svg>`,
);
const withPath = (d: string) =>
  prepareFigureSvg(
    `<svg xmlns="${SVG_NS}" viewBox="0 0 400 300"><path d="${d}" stroke="#111" fill="none"/></svg>`,
  );
const curveOf = (svg: string) => figureObjects(svg)[0];
/** `M x0 y0 Q cx cy x2 y2` → 네 점. */
const read = (d: string) => {
  const [x0, y0, cx, cy, x2, y2] = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  return { x0, y0, cx, cy, x2, y2 };
};
const middle = (d: string) => {
  const { x0, y0, cx, cy, x2, y2 } = read(d);
  return { x: (x0 + 2 * cx + x2) / 4, y: (y0 + 2 * cy + y2) / 4 };
};

describe("노란 손잡이 — 곡선 한가운데 위", () => {
  it("한 토막 곡선에는 곡선 위 한가운데에 노란 손잡이가 선다", () => {
    const svg = withPath("M 100 200 Q 200 100 300 200");
    const bend = figureHandles(curveOf(svg)).find(
      (h) => h.key === CURVE_BEND_HANDLE,
    );
    expect(bend).toMatchObject({ x: 200, y: 150, adjust: true });
    // AI 에게 보내는 꼭짓점 번호에는 안 들어간다(조절점은 꼭짓점이 아니다)
    expect(bend?.control).toBe(true);
  });

  it("끌어 놓은 자리를 곡선이 지나간다 — 두 끝은 그대로", () => {
    const svg = withPath("M 100 200 Q 200 100 300 200");
    const id = curveOf(svg).id;
    const moved = moveFigureHandle(svg, id, CURVE_BEND_HANDLE, {
      x: 210,
      y: 185,
    });
    const d = curveOf(moved).attrs.d;
    expect(middle(d)).toEqual({ x: 210, y: 185 });
    expect(read(d)).toMatchObject({ x0: 100, y0: 200, x2: 300, y2: 200 });
  });

  it("줄 위로 끌면 곧게 펴진다", () => {
    const svg = withPath("M 100 200 Q 200 100 300 200");
    const moved = moveFigureHandle(svg, curveOf(svg).id, CURVE_BEND_HANDLE, {
      x: 200,
      y: 200,
    });
    expect(read(curveOf(moved).attrs.d)).toMatchObject({ cx: 200, cy: 200 });
  });

  it.each([
    [
      "두 토막 곡선(값 자리를 비운 치수선)",
      "M 0 0 Q 20 -10 40 -10 M 60 -10 Q 80 -10 100 0",
    ],
    ["3차 곡선", "M 0 0 C 10 -20 30 -20 40 0"],
    ["꺾은선", "M 0 0 L 20 10 L 40 0"],
  ])("%s에는 노란 손잡이가 없다", (_what, d) => {
    expect(
      figureHandles(curveOf(withPath(d))).some(
        (h) => h.key === CURVE_BEND_HANDLE,
      ),
    ).toBe(false);
  });

  it("AI 자료 목록의 곡선 꼭짓점은 두 끝 그대로다", () => {
    const svg = withPath("M 100 200 Q 200 100 300 200");
    expect(describeFigureForEdit(svg).elements[0].points).toEqual([
      [100, 200],
      [300, 200],
    ]);
  });
});

describe("처음 휘어짐 — 줄 길이의 12%, 줄에 수직으로", () => {
  const drawn = (
    from: { x: number; y: number },
    to: { x: number; y: number },
  ) => curveOf(addFigureObject(EMPTY, "curve", from, to).svg).attrs.d;
  const bulge = (d: string) => {
    const { x0, y0, x2, y2 } = read(d);
    const m = middle(d);
    const length = Math.hypot(x2 - x0, y2 - y0);
    // 줄(현)에서 곡선 한가운데까지의 거리 / 줄 길이
    return (
      Math.abs((x2 - x0) * (y0 - m.y) - (x0 - m.x) * (y2 - y0)) /
      length /
      length
    );
  };

  it("가로 줄 — 위로 12%", () => {
    const d = drawn({ x: 100, y: 200 }, { x: 300, y: 200 });
    expect(bulge(d)).toBeCloseTo(0.12, 3);
    expect(middle(d)).toEqual({ x: 200, y: 176 });
  });

  it("비스듬한 줄도 줄에 수직으로 — 한쪽으로 쏠린 포물선이 아니다", () => {
    const d = drawn({ x: 100, y: 100 }, { x: 200, y: 200 });
    expect(bulge(d)).toBeCloseTo(0.12, 3);
    const m = middle(d);
    // 한가운데가 줄의 수직 이등분선 위에 있다
    expect(m.x - 150).toBeCloseTo(-(m.y - 150), 6);
    expect(m.y).toBeLessThan(150);
  });

  it("세로 줄 — 왼쪽으로 12% (예전에는 거의 안 휘었다)", () => {
    const d = drawn({ x: 200, y: 100 }, { x: 200, y: 300 });
    expect(bulge(d)).toBeCloseTo(0.12, 3);
    expect(middle(d).x).toBeLessThan(200);
  });

  it("점 하나(끌지 않음)도 깨지지 않는다", () => {
    const d = drawn({ x: 100, y: 100 }, { x: 100, y: 100 });
    expect(read(d)).toMatchObject({ cx: 100, cy: 100 });
  });
});
