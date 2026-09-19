/**
 * 도형 편집기 — 고른 요소를 시계·반시계 90° 회전 (원장님 2026-09-19 «회전 옵션 추가 가능한지. 시계 반시계 90도 방향»).
 *
 * - 회전 중심은 고른 것 전체의 경계 상자 가운데 — 여럿·묶음은 한 덩어리로 돈다(각자 제자리에서 돌지 않는다).
 * - 선·다각형·곡선(조절점)·원·타원·호·각 표시·면·노란 조절점이 **기하 그대로** 돈다. 축에 붙은 사각형·타원은
 *   폭과 높이가 바뀐다(변환 행렬을 덧씌우지 않고 좌표를 돌려 적는다 — 정밀 수치·뒤 편집이 맞게).
 * - 글자는 똑바로 선 채 자리만 돈다(원장님 항목 22 «각도가 기울어지지 않게»).
 * - 크기 고정 요소가 섞이면 돌리지 않는다.
 * 화면과 무관한 순수 계산이다.
 */
import { describe, expect, it } from "vitest";

import {
  applyPoint,
  elementMatrix,
  multiply,
  type Affine,
  type Point,
} from "@/components/unified/figure-editor/figureEditGeometry";
import {
  bucketFill,
  syncFigureFaces,
} from "@/components/unified/figure-editor/figureFaceEditing";
import {
  ROTATE_BLOCKED,
  rotateFigureSelection,
  rotationBlock,
  type RotateTurn,
} from "@/components/unified/figure-editor/figureRotate";
import {
  ADJUST_KEY,
  adjustableShape,
  adjustHandles,
  isParallelogram,
  moveAdjustHandle,
} from "@/components/unified/figure-editor/figureShapeAdjust";
import {
  figureObjects,
  prepareFigureSvg,
  SVG_NS,
} from "@/components/unified/figure-editor/figureSvgEditing";

const NUMBER = /[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi;
const numbers = (value?: string | null) =>
  (value?.match(NUMBER) ?? []).map(Number);
const figure = (body: string, viewBox = "0 0 480 360") =>
  prepareFigureSvg(`<svg xmlns="${SVG_NS}" viewBox="${viewBox}">${body}</svg>`);
const read = (svg: string) =>
  new DOMParser().parseFromString(svg, "image/svg+xml");
const node = (svg: string, id: string) =>
  read(svg).querySelector(`[data-object-id="${id}"]`)!;
const attr = (svg: string, id: string, name: string) =>
  node(svg, id).getAttribute(name);
const ids = (svg: string) => figureObjects(svg).map((o) => o.id);
const turn = (svg: string, list: readonly string[], ...turns: RotateTurn[]) =>
  turns.reduce((source, t) => rotateFigureSelection(source, list, t), svg);

/** 그림 좌표의 90° 회전 — 시계(화면 기준, y 가 아래로) : (x, y) → (cx+cy−y, x−cx+cy). */
const rotation = (turn: RotateTurn, [cx, cy]: Point): Affine =>
  turn === "cw"
    ? [0, 1, -1, 0, cx + cy, cy - cx]
    : [0, -1, 1, 0, cx - cy, cx + cy];
const closeTo = (a: readonly number[], b: readonly number[], digits = 6) => {
  expect(a.length).toBe(b.length);
  a.forEach((value, i) => expect(value).toBeCloseTo(b[i], digits));
};

/** 요소마다 속성 이름·숫자가 같은가 — 네 번 돌리면 원위치 · 시계∘반시계 = 원위치. */
function expectSameFigure(after: string, before: string) {
  const a = figureObjects(after),
    b = figureObjects(before);
  expect(a.map((o) => o.id)).toEqual(b.map((o) => o.id));
  a.forEach((o, i) => {
    const original = b[i];
    expect(o.type).toBe(original.type);
    expect(Object.keys(o.attrs).sort()).toEqual(
      Object.keys(original.attrs).sort(),
    );
    for (const [name, value] of Object.entries(original.attrs)) {
      if (name === "d") {
        // 명령 글자도 제자리로(H → V → H …)
        expect(o.attrs.d.replace(NUMBER, "#").replace(/[\s,]+/g, "")).toBe(
          value.replace(NUMBER, "#").replace(/[\s,]+/g, ""),
        );
      }
      const want = numbers(value);
      if (want.length && !/^(?:data-object-id|style|stroke|fill)$/.test(name))
        closeTo(numbers(o.attrs[name]), want);
      else expect(o.attrs[name]).toBe(value);
    }
  });
}

const ALL = figure(
  [
    `<line x1="100" y1="100" x2="200" y2="100" stroke="#111"/>`,
    `<polyline points="100 200 140 220 180 200" stroke="#111" fill="none"/>`,
    `<polygon points="120 40 220 40 200 90 100 90" data-shape="parallelogram" stroke="#111" fill="none"/>`,
    `<rect x="300" y="40" width="60" height="30" stroke="#111" fill="none"/>`,
    `<circle cx="300" cy="200" r="25" stroke="#111" fill="none"/>`,
    `<ellipse cx="380" cy="260" rx="40" ry="20" stroke="#111" fill="none"/>`,
    `<path d="M 200 300 Q 240 260 280 300" stroke="#111" fill="none"/>`,
    `<path d="M 10 10 L 20 10 H 40 V 30 h 10 v 10 l 5 5 C 60 60 70 60 80 50 S 100 40 110 50 q 5 -10 10 0 t 10 0 A 10 10 0 0 1 150 70 a 5 5 0 0 0 10 0 Z m 5 5 l 3 0 z" stroke="#111" fill="none"/>`,
    `<path d="M 110 100 A 10 10 0 0 0 100 90" stroke="#111" fill="none"/>`,
    `<text x="250" y="150" font-size="18" text-anchor="middle" data-px="240" data-py="160" data-mj="A">A</text>`,
    `<polygon points="150 60 200 140 100 140" data-shape="triangle" stroke="#111" fill="none"/>`,
    `<g transform="translate(12 12)"><line x1="20" y1="300" x2="60" y2="340" transform="translate(5 -3)" stroke="#111"/></g>`,
  ].join(""),
);

describe("회전 — 요소 종류별 좌표", () => {
  it("선분 하나는 자기 가운데를 두고 돈다 — 시계는 오른쪽이 아래로", () => {
    const svg = figure(
      `<line x1="100" y1="100" x2="200" y2="100" stroke="#111"/>`,
    );
    const cw = rotateFigureSelection(svg, ["obj-0"], "cw");
    closeTo(
      ["x1", "y1", "x2", "y2"].map((n) => Number(attr(cw, "obj-0", n))),
      [150, 50, 150, 150],
    );
    const ccw = rotateFigureSelection(svg, ["obj-0"], "ccw");
    closeTo(
      ["x1", "y1", "x2", "y2"].map((n) => Number(attr(ccw, "obj-0", n))),
      [150, 150, 150, 50],
    );
    // 변환 행렬을 덧씌우지 않는다
    expect(attr(cw, "obj-0", "transform")).toBeNull();
  });

  it("사각형은 사각형으로 남고 폭·높이가 바뀐다", () => {
    const svg = figure(
      `<rect x="300" y="40" width="60" height="30" stroke="#111" fill="none"/>`,
    );
    const cw = rotateFigureSelection(svg, ["obj-0"], "cw");
    const rect = node(cw, "obj-0");
    expect(rect.localName).toBe("rect");
    closeTo(
      ["x", "y", "width", "height"].map((n) => Number(rect.getAttribute(n))),
      [315, 25, 30, 60],
    );
    expect(rect.getAttribute("transform")).toBeNull();
  });

  it("타원은 가로·세로 반지름이 바뀌고, 원은 반지름 그대로 중심만 돈다", () => {
    const svg = figure(
      `<ellipse cx="380" cy="260" rx="40" ry="20"/><circle cx="300" cy="260" r="25"/>`,
    );
    // 두 요소의 경계 상자: x 275..420, y 235..285 → 가운데 (347.5, 260)
    const cw = rotateFigureSelection(svg, ids(svg), "cw");
    const ellipse = node(cw, "obj-0"),
      circle = node(cw, "obj-1");
    closeTo(
      ["cx", "cy", "rx", "ry"].map((n) => Number(ellipse.getAttribute(n))),
      [347.5, 292.5, 20, 40],
    );
    closeTo(
      ["cx", "cy", "r"].map((n) => Number(circle.getAttribute(n))),
      [347.5, 212.5, 25],
    );
  });

  it("곡선은 조절점까지 돌고, 가로·세로 명령은 서로 바뀐다", () => {
    const svg = figure(
      `<path d="M 0 0 H 10 V 10 h -10 v -10" stroke="#111" fill="none"/>`,
    );
    const cw = rotateFigureSelection(svg, ["obj-0"], "cw");
    expect(attr(cw, "obj-0", "d")).toBe("M 10 0 V 10 H 0 v -10 h 10");
    const quad = figure(
      `<path d="M 200 300 Q 240 260 280 300" stroke="#111" fill="none"/>`,
    );
    // 조절점을 포함한 상자: x 200..280, y 260..300 → 가운데 (240, 280). 위로 볼록 → 오른쪽으로 볼록
    expect(
      attr(rotateFigureSelection(quad, ["obj-0"], "cw"), "obj-0", "d"),
    ).toBe("M 220 240 Q 260 280 220 320");
  });

  it("호(각 표시)는 끝점이 돌고 반지름·방향 표시는 그대로다 — 붙여 쓴 플래그도 읽는다", () => {
    const svg = figure(
      `<path d="M 110 100 A 10 10 0 0 0 100 90" stroke="#111" fill="none"/>` +
        `<path d="M0 0A5 5 0 0110 0" stroke="#111" fill="none"/>`,
    );
    const cw = rotateFigureSelection(svg, ["obj-0"], "cw");
    expect(attr(cw, "obj-0", "d")).toBe("M 100 100 A 10 10 0 0 0 110 90");
    const compact = rotateFigureSelection(svg, ["obj-1"], "cw");
    expect(attr(compact, "obj-1", "d")).toBe("M 5 -5 A 5 5 0 0 1 5 5");
  });

  it("평행사변형은 점 차례를 지킨 채 돌고, 돈 뒤에도 노란 점이 밑변 방향으로 기울인다", () => {
    const svg = figure(
      `<polygon points="120 40 220 40 200 90 100 90" data-shape="parallelogram" stroke="#111" fill="none"/>`,
    );
    const cw = rotateFigureSelection(svg, ["obj-0"], "cw");
    const object = figureObjects(cw)[0];
    const shape = adjustableShape(object)!;
    expect(shape.kind).toBe("parallelogram");
    // 상자 x 100..220, y 40..90 → 가운데 (160, 65): (x, y) → (225−y, x−95)
    closeTo(
      shape.points.flatMap((p) => [p.x, p.y]),
      [185, 25, 185, 125, 135, 105, 135, 5],
    );
    const adjust = adjustHandles(shape).find((h) => h.adjust)!;
    closeTo([adjust.x, adjust.y], [185, 75]);
    // 밑변(D→C)은 이제 세로 — 노란 점을 아래로 10 끌면 윗변만 10 밀리고 밑변은 그대로다
    const skewed = moveAdjustHandle(shape, ADJUST_KEY, {
      x: adjust.x,
      y: adjust.y + 10,
    });
    expect(isParallelogram(skewed)).toBe(true);
    closeTo(
      skewed.flatMap((p) => [p.x, p.y]),
      [185, 35, 185, 135, 135, 105, 135, 5],
    );
  });

  it("삼각형(노란 점)도 꼭짓점·밑변 차례 그대로 돈다", () => {
    const svg = figure(
      `<polygon points="150 60 200 140 100 140" data-shape="triangle" stroke="#111" fill="none"/>`,
    );
    const cw = rotateFigureSelection(svg, ["obj-0"], "cw");
    const shape = adjustableShape(figureObjects(cw)[0])!;
    expect(shape.kind).toBe("triangle");
    // 상자 가운데 (150, 100): (x, y) → (250−y, x−50)
    closeTo(
      shape.points.flatMap((p) => [p.x, p.y]),
      [190, 100, 110, 150, 110, 50],
    );
    expect(adjustHandles(shape).find((h) => h.adjust)).toMatchObject({
      x: 190,
      y: 100,
    });
  });

  it("글자는 똑바로 선 채 자리만 돈다 — 회전각 없이 옮기기만, 임자 꼭짓점(data-px)은 같이 돈다", () => {
    const svg = figure(
      `<line x1="100" y1="100" x2="200" y2="100" stroke="#111"/>` +
        `<text x="150" y="80" font-size="18" text-anchor="middle" data-px="150" data-py="100" data-mj="A">A</text>`,
    );
    // 글자 가운데를 편집기가 재어 넘긴다 — (150, 80). 상자 x 100..200, y 80..100 → 가운데 (150, 90)
    const cw = rotateFigureSelection(svg, ids(svg), "cw", {
      textCenters: new Map([["obj-1", [150, 80]]]),
    });
    closeTo(
      ["x1", "y1", "x2", "y2"].map((n) => Number(attr(cw, "obj-0", n))),
      [140, 40, 140, 140],
    );
    expect(attr(cw, "obj-1", "transform")).toBe("translate(10 10)");
    expect(attr(cw, "obj-1", "x")).toBe("150");
    expect(attr(cw, "obj-1", "y")).toBe("80");
    closeTo(numbers(attr(cw, "obj-1", "data-px")), [140]);
    closeTo(numbers(attr(cw, "obj-1", "data-py")), [90]);
  });

  it("임자 꼭짓점은 그 꼭짓점이 같이 돌 때만 돈다 — 고르지 않은 선의 꼭짓점이면 그대로", () => {
    const svg = figure(
      `<line x1="100" y1="100" x2="200" y2="100" stroke="#111"/>` +
        `<line x1="300" y1="300" x2="400" y2="300" stroke="#111"/>` +
        `<text x="100" y="85" font-size="18" text-anchor="middle" data-px="100" data-py="100">A</text>` +
        `<text x="300" y="285" font-size="18" text-anchor="middle" data-px="300" data-py="300">B</text>`,
    );
    const cw = rotateFigureSelection(svg, ["obj-0", "obj-2", "obj-3"], "cw", {
      textCenters: new Map<string, Point>([
        ["obj-2", [100, 80]],
        ["obj-3", [300, 280]],
      ]),
    });
    // 상자: 선분 (100..200, 100) · 글자 가운데 (100, 80) · (300, 280) → 가운데 (200, 180)
    const R = rotation("cw", [200, 180]);
    // A 의 임자(100, 100)는 고른 선분의 끝점 — 같이 돈다
    closeTo(
      [attr(cw, "obj-2", "data-px"), attr(cw, "obj-2", "data-py")].map(Number),
      applyPoint(R, [100, 100]),
    );
    // B 의 임자(300, 300)는 고르지 않은 선분의 끝점 — 그대로
    expect(attr(cw, "obj-3", "data-px")).toBe("300");
    expect(attr(cw, "obj-3", "data-py")).toBe("300");
  });

  it("글자를 이미 끌어 옮겼으면 그 이동에 합쳐 적는다 — 네 번 돌면 이동도 원래대로", () => {
    const svg = figure(
      `<line x1="100" y1="100" x2="200" y2="100" stroke="#111"/>` +
        `<text x="150" y="80" transform="translate(3 4)" font-size="18" data-mj="A">A</text>`,
    );
    const once = rotateFigureSelection(svg, ids(svg), "cw");
    expect(attr(once, "obj-1", "transform")).toMatch(
      /^translate\([-\d.]+ [-\d.]+\)$/,
    );
    expect(
      attr(turn(svg, ids(svg), "cw", "cw", "cw", "cw"), "obj-1", "transform"),
    ).toBe("translate(3 4)");
  });

  it("묶음(붙여넣은 translate 안)·끌어 옮긴 요소도 그림에서 보이는 자리 그대로 돈다", () => {
    const svg = figure(
      `<g transform="translate(12 12)"><line x1="20" y1="300" x2="60" y2="340" transform="translate(5 -3)" stroke="#111"/></g>` +
        `<line x1="100" y1="100" x2="200" y2="100" stroke="#111"/>`,
    );
    const drawn = (source: string, id: string) => {
      const line = node(source, id);
      const m = elementMatrix(line);
      return [
        ...applyPoint(m, [
          Number(line.getAttribute("x1")),
          Number(line.getAttribute("y1")),
        ]),
        ...applyPoint(m, [
          Number(line.getAttribute("x2")),
          Number(line.getAttribute("y2")),
        ]),
      ];
    };
    const before = ids(svg).flatMap((id) => drawn(svg, id));
    // 보이는 자리: (37, 309)-(77, 349) · (100, 100)-(200, 100) → 상자 가운데 (118.5, 224.5)
    const R = rotation("cw", [118.5, 224.5]);
    const cw = rotateFigureSelection(svg, ids(svg), "cw");
    closeTo(
      ids(cw).flatMap((id) => drawn(cw, id)),
      [0, 2, 4, 6].flatMap((i) => applyPoint(R, [before[i], before[i + 1]])),
    );
    // 자기 이동(translate)은 그대로 두고 좌표를 돌린다
    expect(attr(cw, "obj-0", "transform")).toBe("translate(5 -3)");
  });

  it("여럿을 고르면 한 덩어리로 돈다 — 각자 제자리에서 돌지 않는다", () => {
    const svg = figure(
      `<line x1="0" y1="0" x2="20" y2="0" stroke="#111"/><line x1="100" y1="0" x2="120" y2="0" stroke="#111"/>`,
    );
    // 상자 x 0..120, y 0 → 가운데 (60, 0): 두 번째 선분이 첫 선분 아래로 간다
    const cw = rotateFigureSelection(svg, ids(svg), "cw");
    closeTo(
      ["x1", "y1", "x2", "y2"].map((n) => Number(attr(cw, "obj-0", n))),
      [60, -60, 60, -40],
    );
    closeTo(
      ["x1", "y1", "x2", "y2"].map((n) => Number(attr(cw, "obj-1", n))),
      [60, 40, 60, 60],
    );
  });

  it("함수 그래프는 식과 곡선이 맞도록 좌표 대신 자기 변환으로 돈다", () => {
    const svg = figure(
      `<path d="M 0 0 L 10 10 L 20 0" data-function='{"expression":"x"}' stroke="#111" fill="none"/>`,
    );
    const cw = rotateFigureSelection(svg, ["obj-0"], "cw");
    expect(attr(cw, "obj-0", "d")).toBe("M 0 0 L 10 10 L 20 0");
    // 상자 가운데 (10, 5)
    closeTo(elementMatrix(node(cw, "obj-0")), rotation("cw", [10, 5]));
    expectSameFigure(turn(svg, ["obj-0"], "cw", "cw", "cw", "cw"), svg);
  });

  it("가로·세로 배율이 다른 원은 원으로 못 적으니 자기 변환으로 돈다 — 보이는 모양은 같다", () => {
    const svg = figure(
      `<circle cx="10" cy="10" r="10" transform="scale(2 1)" stroke="#111" fill="none"/>`,
    );
    const before = elementMatrix(node(svg, "obj-0"));
    const cw = rotateFigureSelection(svg, ["obj-0"], "cw");
    // 보이는 상자: x 0..40, y 0..20 → 가운데 (20, 10)
    closeTo(
      elementMatrix(node(cw, "obj-0")),
      multiply(rotation("cw", [20, 10]), before),
    );
    expect(attr(cw, "obj-0", "r")).toBe("10");
  });
});

describe("회전 — 되돌아오기", () => {
  it("시계 네 번 · 반시계 네 번 = 원위치", () => {
    const all = ids(ALL);
    expectSameFigure(turn(ALL, all, "cw", "cw", "cw", "cw"), ALL);
    expectSameFigure(turn(ALL, all, "ccw", "ccw", "ccw", "ccw"), ALL);
  });

  it("반시계∘시계 = 원위치 · 시계∘반시계 = 원위치", () => {
    const all = ids(ALL);
    expectSameFigure(turn(ALL, all, "cw", "ccw"), ALL);
    expectSameFigure(turn(ALL, all, "ccw", "cw"), ALL);
  });

  it("요소 하나씩 돌려도 원위치로 온다", () => {
    for (const id of ids(ALL)) {
      expectSameFigure(turn(ALL, [id], "cw", "cw", "cw", "cw"), ALL);
      expectSameFigure(turn(ALL, [id], "ccw", "cw"), ALL);
    }
  });

  it("두 번 돌리면 180° — 모든 좌표가 가운데를 두고 뒤집힌다", () => {
    const svg = figure(
      `<line x1="100" y1="100" x2="200" y2="140" stroke="#111"/>`,
    );
    const half = turn(svg, ["obj-0"], "cw", "cw");
    closeTo(
      ["x1", "y1", "x2", "y2"].map((n) => Number(attr(half, "obj-0", n))),
      [200, 140, 100, 100],
    );
  });
});

describe("회전 — 면(채우기)", () => {
  const triangle = figure(
    `<line x1="100" y1="200" x2="200" y2="200" stroke="#111"/>` +
      `<line x1="200" y1="200" x2="150" y2="100" stroke="#111"/>` +
      `<line x1="150" y1="100" x2="100" y2="200" stroke="#111"/>`,
  );
  const filled = bucketFill(triangle, { x: 150, y: 170 }, "#d9d9d9").svg;
  const face = () => figureObjects(filled).find((o) => o.attrs["data-face"])!;

  it("둘러싼 선을 다 돌리면 선을 따라가는 면도 같이 돈다 — 씨앗 점까지", () => {
    const lines = figureObjects(filled)
      .filter((o) => o.type === "line")
      .map((o) => o.id);
    const cw = rotateFigureSelection(filled, lines, "cw");
    // 상자 x 100..200, y 100..200 → 가운데 (150, 150). 씨앗은 채우기 통이 적어 둔 칸 안의 점
    const R = rotation("cw", [150, 150]);
    const [sx, sy] = numbers(face().attrs["data-face-seed"]);
    closeTo(
      numbers(attr(cw, face().id, "data-face-seed")),
      applyPoint(R, [sx, sy]),
    );
    // 면의 꼭짓점도 돈 삼각형의 꼭짓점이다
    const want = [
      [100, 200],
      [200, 200],
      [150, 100],
    ].map((p) => applyPoint(R, p as Point));
    const hasVertices = (source: string) => {
      const got = numbers(attr(source, face().id, "d"));
      for (const [x, y] of want)
        expect(
          got.some(
            (value, i) =>
              i % 2 === 0 &&
              Math.abs(value - x) < 0.01 &&
              Math.abs(got[i + 1] - y) < 0.01,
          ),
        ).toBe(true);
    };
    hasVertices(cw);
    // 편집기 commit 의 면 맞추기가 돈 씨앗으로 같은 칸을 다시 찾는다
    hasVertices(syncFigureFaces(cw).svg);
  });

  it("면만 고르면 돌리지 않는다 — 면은 둘러싼 선을 따라간다", () => {
    expect(rotationBlock(figureObjects(filled), [face().id])).toBe(
      ROTATE_BLOCKED.face,
    );
    expect(rotateFigureSelection(filled, [face().id], "cw")).toBe(filled);
  });
});

describe("회전 — 막을 때", () => {
  const svg = figure(
    `<line x1="100" y1="100" x2="200" y2="100" stroke="#111" data-size-locked="true"/>` +
      `<line x1="0" y1="0" x2="20" y2="0" stroke="#111"/>` +
      `<text x="10" y="10" font-size="18">A</text>`,
  );

  it("크기 고정 요소가 하나라도 섞이면 돌리지 않는다", () => {
    const objects = figureObjects(svg);
    expect(rotationBlock(objects, ["obj-0", "obj-1"])).toBe(
      ROTATE_BLOCKED.locked,
    );
    expect(rotationBlock(objects, ["obj-0"])).toBe(ROTATE_BLOCKED.locked);
    expect(rotateFigureSelection(svg, ["obj-0", "obj-1"], "cw")).toBe(svg);
    expect(rotationBlock(objects, ["obj-1"])).toBeNull();
  });

  it("글자 하나만 고르면 돌 것이 없다 — 글자는 기울지 않는다", () => {
    const objects = figureObjects(svg);
    expect(rotationBlock(objects, ["obj-2"])).toBe(ROTATE_BLOCKED.text);
    expect(rotationBlock(objects, ["obj-1", "obj-2"])).toBeNull();
    expect(rotationBlock(objects, [])).toBeNull();
  });
});
