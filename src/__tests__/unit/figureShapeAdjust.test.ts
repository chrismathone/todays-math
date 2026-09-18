/**
 * 도형 편집기 «노란 조절점»(트랙 4) — 파워포인트처럼 노란 점을 끌어 모양을 바꾼다.
 *
 * 원장님 2026-09-19 «사각형 자체를 각을 기울여서 평행사변형 만들 수 있게» · «노란 점 이동시키면 도형 변화하는 것» ·
 * «삼각형도 추가해 주고». 사각형은 노란 점으로 평행사변형(마주 보는 변 평행 유지), 모서리 조절점은 기울기를 지킨 채 크기만.
 * 삼각형은 상자 안의 삼각형 — 노란 점(꼭짓점)을 윗변 따라 옮겨 이등변·직각·일반 삼각형.
 * 화면과 무관한 순수 계산이다(점 목록 ↔ 매개변수, 조절점 자리, 끌었을 때의 새 점).
 */
import { describe, expect, it } from "vitest";

import type { Point } from "@/components/unified/figure-editor/figureFaceGeometry";
import {
  ADJUST_KEY,
  adjustableShape,
  adjustHandles,
  formatPoints,
  isParallelogram,
  moveAdjustHandle,
  parallelogramFromRect,
  parallelogramHandles,
  parsePoints,
  rectToPolygonAttrs,
  resizeParallelogram,
  resizeTriangle,
  SHAPE_ATTR,
  skewParallelogram,
  triangleFrame,
  triangleFromBox,
  triangleFromFrame,
  triangleHandles,
  moveTriangleApex,
} from "@/components/unified/figure-editor/figureShapeAdjust";

const P = (x: number, y: number): Point => ({ x, y });
const closeTo = (a: Point, b: Point, digits = 6) => {
  expect(a.x).toBeCloseTo(b.x, digits);
  expect(a.y).toBeCloseTo(b.y, digits);
};
const cross = (a: Point, b: Point) => a.x * b.y - a.y * b.x;
const minus = (a: Point, b: Point) => P(a.x - b.x, a.y - b.y);
/** 마주 보는 변이 평행이고 길이가 같다 — A→B 와 D→C, A→D 와 B→C. */
const expectParallelogram = (points: Point[]) => {
  const [a, b, c, d] = points;
  closeTo(minus(b, a), minus(c, d));
  closeTo(minus(d, a), minus(c, b));
};

const rect = parallelogramFromRect(10, 20, 100, 50);

describe("평행사변형 — 사각형을 노란 점으로 기울인다", () => {
  it("사각형 → 네 꼭짓점(왼쪽 위부터 시계 방향)", () => {
    expect(rect).toEqual([P(10, 20), P(110, 20), P(110, 70), P(10, 70)]);
    expect(isParallelogram(rect)).toBe(true);
    expect(isParallelogram([P(0, 0), P(10, 0), P(12, 10), P(0, 10)])).toBe(
      false,
    );
    expect(isParallelogram([P(0, 0), P(10, 0), P(20, 0), P(10, 0)])).toBe(
      false,
    );
  });

  it("조절점 — 꼭짓점 넷(모서리) + 윗변 가운데 노란 점", () => {
    expect(parallelogramHandles(rect)).toEqual([
      { key: "corner-0", x: 10, y: 20, label: "모서리 1" },
      { key: "corner-1", x: 110, y: 20, label: "모서리 2" },
      { key: "corner-2", x: 110, y: 70, label: "모서리 3" },
      { key: "corner-3", x: 10, y: 70, label: "모서리 4" },
      { key: ADJUST_KEY, x: 60, y: 20, label: "모양 조절", adjust: true },
    ]);
  });

  it("노란 점을 오른쪽으로 30 — 윗변만 30 밀리고 밑변은 그대로, 마주 보는 변 평행", () => {
    const skewed = skewParallelogram(rect, P(90, 25));
    expect(skewed).toEqual([P(40, 20), P(140, 20), P(110, 70), P(10, 70)]);
    expectParallelogram(skewed);
    // 되돌리면 다시 직사각형
    expect(skewParallelogram(skewed, P(60, 20))).toEqual(rect);
  });

  it("노란 점이 제자리 근처면 직사각형으로 붙는다", () => {
    expect(skewParallelogram(rect, P(62, 20), 3)).toEqual(rect);
    expect(skewParallelogram(rect, P(62, 20), 1)[0]).toEqual(P(12, 20));
  });

  it("돌아간 평행사변형도 밑변 방향으로 기운다", () => {
    // 밑변 D(0,0)→C(0,100) 세로, 옆변 A−D = (−40, 0)
    const turned = [P(-40, 0), P(-40, 100), P(0, 100), P(0, 0)];
    const skewed = skewParallelogram(turned, P(-40, 70));
    expect(skewed).toEqual([P(-40, 20), P(-40, 120), P(0, 100), P(0, 0)]);
    expectParallelogram(skewed);
  });

  it("모서리를 끌면 기울기를 지킨 채 크기만 — 맞은편 꼭짓점은 그대로", () => {
    const skewed = skewParallelogram(rect, P(90, 20)); // A(40,20) B(140,20) C(110,70) D(10,70)
    const resized = resizeParallelogram(skewed, 2, P(160, 120));
    expectParallelogram(resized);
    expect(resized[0]).toEqual(P(40, 20));
    closeTo(resized[2], P(160, 120));
    // 윗변은 여전히 가로, 옆변은 여전히 (−30, 50) 방향
    expect(resized[1].y).toBeCloseTo(20, 9);
    expect(cross(minus(resized[3], resized[0]), P(-30, 50))).toBeCloseTo(0, 6);
  });

  it("모서리를 맞은편 너머로 끌어도 뒤집히거나 납작해지지 않는다", () => {
    const resized = resizeParallelogram(rect, 2, P(0, 0));
    expectParallelogram(resized);
    const [a, b, , d] = resized;
    expect(Math.abs(cross(minus(b, a), minus(d, a)))).toBeGreaterThan(0);
    expect(b.x).toBeGreaterThan(a.x);
    expect(d.y).toBeGreaterThan(a.y);
  });

  it("옛 <rect> → 기울일 수 있는 다각형 — 서식·변환·묶음·번호는 그대로, 자리 칸만 바꾼다", () => {
    const attrs = rectToPolygonAttrs(
      {
        x: "10",
        y: "20",
        width: "100",
        height: "50",
        rx: "0",
        stroke: "#111111",
        "stroke-width": "1.8",
        fill: "none",
        transform: "translate(5 5)",
        "data-group": "도형",
        "data-object-id": "obj-3",
      },
      skewParallelogram(rect, P(90, 20)),
    );
    expect(attrs).toEqual({
      points: "40 20 140 20 110 70 10 70",
      [SHAPE_ATTR]: "parallelogram",
      stroke: "#111111",
      "stroke-width": "1.8",
      fill: "none",
      transform: "translate(5 5)",
      "data-group": "도형",
      "data-object-id": "obj-3",
    });
  });
});

describe("삼각형 — 상자 안의 삼각형, 노란 점은 꼭짓점", () => {
  const iso = triangleFromBox(P(10, 20), P(110, 100));

  it("끌어서 그리면 상자 안의 이등변삼각형(거꾸로 끌어도 같다)", () => {
    expect(iso).toEqual([P(60, 20), P(110, 100), P(10, 100)]);
    expect(triangleFromBox(P(110, 100), P(10, 20))).toEqual(iso);
  });

  it("점 목록 ↔ 매개변수 왕복(돌아간 삼각형도)", () => {
    const frame = triangleFrame(iso)!;
    expect(frame.left).toEqual(P(10, 100));
    expect(frame.width).toBeCloseTo(100, 9);
    expect(frame.height).toBeCloseTo(80, 9);
    expect(frame.t).toBeCloseTo(0.5, 9);
    triangleFromFrame(frame).forEach((p, i) => closeTo(p, iso[i]));
    const turned = {
      left: P(50, 50),
      u: P(0.6, 0.8),
      n: P(0.8, -0.6),
      width: 100,
      height: 60,
      t: 0.3,
    };
    const back = triangleFrame(triangleFromFrame(turned))!;
    closeTo(back.left, turned.left);
    closeTo(back.u, turned.u);
    closeTo(back.n, turned.n);
    expect(back.width).toBeCloseTo(100, 9);
    expect(back.height).toBeCloseTo(60, 9);
    expect(back.t).toBeCloseTo(0.3, 9);
    expect(triangleFrame([P(0, 0), P(10, 0), P(20, 0)])).toBeNull();
  });

  it("조절점 — 상자 모서리 넷 + 꼭짓점의 노란 점", () => {
    expect(triangleHandles(iso)).toEqual([
      { key: "corner-0", x: 10, y: 20, label: "모서리 1" },
      { key: "corner-1", x: 110, y: 20, label: "모서리 2" },
      { key: "corner-2", x: 110, y: 100, label: "모서리 3" },
      { key: "corner-3", x: 10, y: 100, label: "모서리 4" },
      { key: ADJUST_KEY, x: 60, y: 20, label: "모양 조절", adjust: true },
    ]);
  });

  it("노란 점은 윗변을 따라서만 — 높이는 그대로", () => {
    expect(moveTriangleApex(iso, P(85, 60))[0]).toEqual(P(85, 20));
    // 직각삼각형(왼쪽 끝) · 이등변으로 붙기 · 둔각(상자 밖)도 된다 · 너무 멀면 밑변 한 길이까지
    expect(moveTriangleApex(iso, P(10, 5))[0]).toEqual(P(10, 20));
    expect(moveTriangleApex(iso, P(62, 20), 3)[0]).toEqual(P(60, 20));
    expect(moveTriangleApex(iso, P(108, 20), 3)[0]).toEqual(P(110, 20));
    expect(moveTriangleApex(iso, P(62, 20), 1)[0]).toEqual(P(62, 20));
    expect(moveTriangleApex(iso, P(-30, 20))[0]).toEqual(P(-30, 20));
    expect(moveTriangleApex(iso, P(500, 20))[0]).toEqual(P(210, 20));
    expect(moveTriangleApex(iso, P(-500, 20))[0]).toEqual(P(-90, 20));
    // 밑변은 안 움직인다
    expect(moveTriangleApex(iso, P(85, 60)).slice(1)).toEqual(iso.slice(1));
  });

  it("상자 모서리를 끌면 꼭짓점 비율을 지킨 채 크기만", () => {
    const leaning = moveTriangleApex(iso, P(85, 20)); // t = 0.75
    const resized = resizeTriangle(leaning, 2, P(160, 140));
    resized.forEach((p, i) =>
      closeTo(p, [P(122.5, 20), P(160, 140), P(10, 140)][i]),
    );
    // 맞은편 너머로 끌면 상자가 뒤집혀 정리된다(사각형과 같다) — 꼭짓점은 늘 위
    const flipped = resizeTriangle(iso, 2, P(0, 0));
    const frame = triangleFrame(flipped)!;
    expect(frame.width).toBeCloseTo(10, 9);
    expect(frame.height).toBeCloseTo(20, 9);
    expect(flipped[0].y).toBeCloseTo(0, 9);
  });
});

describe("adjustableShape · adjustHandles · moveAdjustHandle — 요소에서 모양을 읽는다", () => {
  const rectObject = {
    type: "rect",
    attrs: { x: "10", y: "20", width: "100", height: "50" },
  };
  it("사각형·평행사변형·삼각형만, 둥근 사각형·어긋난 점·표지 없는 다각형은 아니다", () => {
    expect(adjustableShape(rectObject)).toEqual({
      kind: "rect",
      name: "사각형",
      points: rect,
    });
    expect(
      adjustableShape({
        type: "rect",
        attrs: { ...rectObject.attrs, rx: "4" },
      }),
    ).toBeNull();
    expect(
      adjustableShape({
        type: "rect",
        attrs: { ...rectObject.attrs, width: "0" },
      }),
    ).toBeNull();
    const para = {
      type: "polygon",
      attrs: {
        points: "40 20 140 20 110 70 10 70",
        [SHAPE_ATTR]: "parallelogram",
      },
    };
    expect(adjustableShape(para)?.kind).toBe("parallelogram");
    expect(adjustableShape(para)?.name).toBe("평행사변형");
    expect(
      adjustableShape({
        type: "polygon",
        attrs: { ...para.attrs, points: "40 20 150 20 110 70 10 70" },
      }),
    ).toBeNull();
    expect(
      adjustableShape({
        type: "polygon",
        attrs: { points: para.attrs.points },
      }),
    ).toBeNull();
    expect(
      adjustableShape({
        type: "polygon",
        attrs: { points: "60 20 110 100 10 100", [SHAPE_ATTR]: "triangle" },
      }),
    ).toEqual({ kind: "triangle", name: "삼각형", points: iso() });
  });

  it("조절점과 끌기 — 사각형의 노란 점은 평행사변형 점을 낸다", () => {
    const shape = adjustableShape(rectObject)!;
    expect(adjustHandles(shape).at(-1)).toMatchObject({
      key: ADJUST_KEY,
      x: 60,
      y: 20,
      adjust: true,
    });
    expect(moveAdjustHandle(shape, ADJUST_KEY, P(90, 20))).toEqual([
      P(40, 20),
      P(140, 20),
      P(110, 70),
      P(10, 70),
    ]);
    const triangle = adjustableShape({
      type: "polygon",
      attrs: { points: "60 20 110 100 10 100", [SHAPE_ATTR]: "triangle" },
    })!;
    expect(moveAdjustHandle(triangle, ADJUST_KEY, P(10, 50))[0]).toEqual(
      P(10, 20),
    );
    expect(moveAdjustHandle(triangle, "corner-2", P(160, 140))[1]).toEqual(
      P(160, 140),
    );
    const para = adjustableShape({
      type: "polygon",
      attrs: {
        points: "40 20 140 20 110 70 10 70",
        [SHAPE_ATTR]: "parallelogram",
      },
    })!;
    expect(moveAdjustHandle(para, "corner-0", P(40, 0))[0]).toEqual(P(40, 0));
  });

  it("점 읽기·쓰기 — 소수 둘째 자리, 쉼표도 읽는다", () => {
    expect(parsePoints("1,2 3.5 4")).toEqual([P(1, 2), P(3.5, 4)]);
    expect(formatPoints([P(1.234, 2), P(3, 4.5)])).toBe("1.23 2 3 4.5");
  });
});

function iso() {
  return [P(60, 20), P(110, 100), P(10, 100)];
}
