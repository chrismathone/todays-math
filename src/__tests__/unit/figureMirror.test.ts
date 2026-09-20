/**
 * 도형 편집기 — 고른 요소를 **좌우·상하·직선에 대해 대칭**(원장님 2026-09-20 «대칭(편집기 단추도)»).
 *
 * - 축은 셋: 세로(좌우 뒤집기) · 가로(상하 뒤집기) · 두 점이 정하는 직선(그림에 없어도 된다).
 * - 회전(figureRotate.ts)과 **같은 규칙**: 좌표를 그대로 적고(변환 행렬 덧씌우기 금지), 글자는 똑바로 선 채 자리만,
 *   면·노란 조절점·임자 꼭짓점이 따라가고, 크기 고정이 섞이면 막고, 넘치면 틀을 넓힌다.
 * - 거울이라 **방향이 뒤집힌다** — 호의 sweep 은 뒤집히고 큰/작은 쪽(large)은 그대로여야 곡선이 거울상이 된다.
 * - 두 번 대칭하면 원위치(좌표 문자열까지).
 * 화면과 무관한 순수 계산이다.
 */
import { describe, expect, it } from "vitest";

import { type Point } from "@/components/unified/figure-editor/figureEditGeometry";
import {
  bucketFill,
  syncFigureFaces,
} from "@/components/unified/figure-editor/figureFaceEditing";
import {
  mirrorAcross,
  sampleFigurePath,
} from "@/components/unified/figure-editor/figureFlip";
import {
  MIRROR_BLOCKED,
  mirrorBlock,
  mirrorFigureSelection,
  type MirrorAxis,
} from "@/components/unified/figure-editor/figureMirror";
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
const coords = (svg: string, id: string, names: string[]) =>
  names.map((name) => attr(svg, id, name));
const ids = (svg: string) => figureObjects(svg).map((o) => o.id);
const frameOf = (svg: string) =>
  numbers(read(svg).documentElement.getAttribute("viewBox"));
const mirror = (svg: string, list: readonly string[], ...axes: MirrorAxis[]) =>
  axes.reduce((source, axis) => mirrorFigureSelection(source, list, axis), svg);
const closeTo = (a: readonly number[], b: readonly number[], digits = 6) => {
  expect(a.length).toBe(b.length);
  a.forEach((value, i) => expect(value).toBeCloseTo(b[i], digits));
};

/** 두 번 대칭하면 속성 이름·값이 **글자까지** 원래와 같은가. */
function expectIdentical(after: string, before: string) {
  expect(figureObjects(after)).toEqual(figureObjects(before));
}

const DIAGONAL: MirrorAxis = [
  [0, 0],
  [100, 100],
];

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

describe("대칭 — 요소 종류별 좌표", () => {
  const line = figure(
    `<line x1="100" y1="100" x2="200" y2="140" stroke="#111"/>`,
  );

  it("좌우 대칭은 제 가운데를 지나는 세로선에 비춘다 — x 만 바뀐다", () => {
    // 가운데 x = 150 → x′ = 300 − x
    expect(
      coords(mirrorFigureSelection(line, ["obj-0"], "vertical"), "obj-0", [
        "x1",
        "y1",
        "x2",
        "y2",
      ]),
    ).toEqual(["200", "100", "100", "140"]);
  });

  it("상하 대칭은 가로선에 비춘다 — y 만 바뀐다", () => {
    // 가운데 y = 120 → y′ = 240 − y
    expect(
      coords(mirrorFigureSelection(line, ["obj-0"], "horizontal"), "obj-0", [
        "x1",
        "y1",
        "x2",
        "y2",
      ]),
    ).toEqual(["100", "140", "200", "100"]);
  });

  it("두 점이 정하는 직선에 대칭한다 — 그 직선이 그림에 없어도 된다", () => {
    // y = x 에 비추면 x 와 y 가 바뀐다
    const out = mirrorFigureSelection(line, ["obj-0"], DIAGONAL);
    closeTo(numbers(attr(out, "obj-0", "x1")), [100]);
    closeTo(numbers(attr(out, "obj-0", "y1")), [100]);
    closeTo(numbers(attr(out, "obj-0", "x2")), [140]);
    closeTo(numbers(attr(out, "obj-0", "y2")), [200]);
    // 이미 있는 점 대칭(figureFlip 의 mirrorAcross)과 같은 자리
    closeTo(
      [Number(attr(out, "obj-0", "x2")), Number(attr(out, "obj-0", "y2"))],
      mirrorAcross([200, 140], [0, 0], [100, 100]),
    );
  });

  it("사각형은 사각형으로 남고 폭·높이가 그대로다 — 세로선 x = 100 에 비추기", () => {
    const svg = figure(
      `<rect x="300" y="40" width="60" height="30" stroke="#111" fill="none"/>`,
    );
    const out = mirrorFigureSelection(
      svg,
      ["obj-0"],
      [
        [100, 0],
        [100, 10],
      ],
    );
    expect(coords(out, "obj-0", ["x", "y", "width", "height"])).toEqual([
      "-160",
      "40",
      "60",
      "30",
    ]);
    expect(attr(out, "obj-0", "transform")).toBeNull();
  });

  it("원·타원은 중심만 옮기고 반지름은 그대로다", () => {
    const svg = figure(
      `<circle cx="300" cy="200" r="25" stroke="#111" fill="none"/>` +
        `<ellipse cx="380" cy="260" rx="40" ry="20" stroke="#111" fill="none"/>`,
    );
    const out = mirrorFigureSelection(svg, ids(svg), [
      [300, 0],
      [300, 10],
    ]);
    expect(coords(out, "obj-0", ["cx", "cy", "r"])).toEqual([
      "300",
      "200",
      "25",
    ]);
    expect(coords(out, "obj-1", ["cx", "cy", "rx", "ry"])).toEqual([
      "220",
      "260",
      "40",
      "20",
    ]);
  });

  it("경로의 가로·세로 명령은 45° 직선 대칭에서 서로 바뀐다 — 명령 글자는 남는다", () => {
    const svg = figure(
      `<path d="M 10 20 H 40 V 30" stroke="#111" fill="none"/>`,
    );
    expect(
      attr(mirrorFigureSelection(svg, ["obj-0"], DIAGONAL), "obj-0", "d"),
    ).toBe("M 20 10 V 40 H 30");
  });

  it("좌우 대칭에서는 가로·세로 명령이 그대로다", () => {
    const svg = figure(
      `<path d="M 10 20 H 40 V 30" stroke="#111" fill="none"/>`,
    );
    // 가운데 x = 25 → x′ = 50 − x
    expect(
      attr(mirrorFigureSelection(svg, ["obj-0"], "vertical"), "obj-0", "d"),
    ).toBe("M 40 20 H 10 V 30");
  });

  it("글자는 똑바로 선 채 자리만 옮긴다 — 회전·기울임이 붙지 않는다", () => {
    const svg = figure(
      `<line x1="100" y1="100" x2="200" y2="100" stroke="#111"/>` +
        `<text x="300" y="200" font-size="18" data-mj="A">A</text>`,
    );
    const out = mirrorFigureSelection(svg, ids(svg), "vertical", {
      textCenters: new Map([["obj-1", [300, 200] as Point]]),
    });
    // 도형 상자 가운데 x = 150 → 글자 가운데 300 → 0
    expect(attr(out, "obj-1", "transform")).toBe("translate(-300 0)");
    expect(attr(out, "obj-1", "x")).toBe("300");
  });

  it("엔진 라벨의 임자 꼭짓점(data-px·data-py)은 그 꼭짓점이 같이 갈 때 따라간다", () => {
    const svg = figure(
      `<line x1="100" y1="100" x2="200" y2="100" stroke="#111"/>` +
        `<text x="205" y="96" font-size="18" data-px="200" data-py="100" data-mj="B">B</text>`,
    );
    const out = mirrorFigureSelection(svg, ids(svg), "vertical", {
      textCenters: new Map([["obj-1", [205, 96] as Point]]),
    });
    // 가운데 x = 150 → 임자 꼭짓점 200 → 100
    closeTo(numbers(attr(out, "obj-1", "data-px")), [100]);
    closeTo(numbers(attr(out, "obj-1", "data-py")), [100]);
  });
});

describe("대칭 — 거울이라 방향이 뒤집힌다", () => {
  /** 곡선 위의 점이 하나하나 거울상인가 — «모양이 그대로 보이는가»의 참 기준. */
  const expectMirroredCurve = (
    before: string,
    after: string,
    map: (p: Point) => Point,
  ) => {
    const a = sampleFigurePath(before, 24)!;
    const b = sampleFigurePath(after, 24)!;
    expect(b.length).toBe(a.length);
    a.forEach((piece, i) => {
      expect(b[i].length).toBe(piece.length);
      piece.forEach((p, k) => closeTo(b[i][k], map(p), 3));
    });
  };

  it("원호는 sweep 이 뒤집히고 큰/작은 쪽(large)은 그대로 — 곡선이 거울상이다", () => {
    const d = "M 110 100 A 10 10 0 0 0 100 90";
    const svg = figure(`<path d="${d}" stroke="#111" fill="none"/>`);
    const out = mirrorFigureSelection(svg, ["obj-0"], "vertical");
    expect(attr(out, "obj-0", "d")).toBe("M 100 100 A 10 10 0 0 1 110 90");
    // 끝점 상자 x 100..110 → 가운데 105 → x′ = 210 − x
    expectMirroredCurve(d, attr(out, "obj-0", "d")!, ([x, y]) => [210 - x, y]);
  });

  it("큰 쪽 호(large = 1)는 큰 쪽으로 남는다 — 함께 뒤집으면 모양이 달라진다", () => {
    const d = "M 110 100 A 10 10 0 1 0 100 90";
    const svg = figure(`<path d="${d}" stroke="#111" fill="none"/>`);
    const after = attr(
      mirrorFigureSelection(svg, ["obj-0"], "vertical"),
      "obj-0",
      "d",
    )!;
    const parts = after.split(/\s+/);
    expect(parts[7]).toBe("1"); // large 그대로
    expect(parts[8]).toBe("1"); // sweep 뒤집힘
    expectMirroredCurve(d, after, ([x, y]) => [210 - x, y]);
  });

  it("곡선(Q)도 점 하나하나가 거울상이다 — 직선 대칭에서도", () => {
    const d = "M 200 300 Q 240 260 280 300";
    const svg = figure(`<path d="${d}" stroke="#111" fill="none"/>`);
    const out = mirrorFigureSelection(svg, ["obj-0"], DIAGONAL);
    expectMirroredCurve(d, attr(out, "obj-0", "d")!, (p) =>
      mirrorAcross(p, [0, 0], [100, 100]),
    );
  });

  it("화살표는 같은 끝에 남는다 — 좌표를 적으니 변환이 붙지 않는다", () => {
    const svg = figure(
      `<defs><marker id="arrow" orient="auto" markerWidth="6" markerHeight="6" refX="5" refY="3">` +
        `<path d="M 0 0 L 6 3 L 0 6 z" fill="#111"/></marker></defs>` +
        `<line x1="100" y1="100" x2="200" y2="100" marker-end="url(#arrow)" stroke="#111"/>`,
    );
    const out = mirrorFigureSelection(svg, ["obj-0"], "vertical");
    expect(attr(out, "obj-0", "marker-end")).toBe("url(#arrow)");
    expect(attr(out, "obj-0", "transform")).toBeNull();
    // 화살촉이 붙은 끝(x2)이 대칭한 자리로 간다
    expect(attr(out, "obj-0", "x2")).toBe("100");
  });

  it("다각형은 점 차례를 지킨다 — 차례를 뒤집으면 노란 점이 다른 변으로 옮겨 간다", () => {
    const svg = figure(
      `<polygon points="120 40 220 40 200 90 100 90" data-shape="parallelogram" stroke="#111" fill="none"/>`,
    );
    const out = mirrorFigureSelection(svg, ["obj-0"], "vertical");
    // 가운데 x = 160 → x′ = 320 − x. 점 차례 그대로.
    expect(attr(out, "obj-0", "points")).toBe("200 40 100 40 120 90 220 90");
  });
});

describe("대칭 — 두 번이면 원위치", () => {
  it("요소 12종 한 그림: 좌우 두 번 · 상하 두 번 · 직선 두 번 모두 좌표 문자열까지 제자리", () => {
    for (const axis of ["vertical", "horizontal", DIAGONAL] as MirrorAxis[])
      expectIdentical(mirror(ALL, ids(ALL), axis, axis), ALL);
  });

  it("요소 하나씩 두 번 대칭해도 제자리", () => {
    for (const id of ids(ALL))
      for (const axis of ["vertical", "horizontal", DIAGONAL] as MirrorAxis[]) {
        const twice = mirror(ALL, [id], axis, axis);
        if (twice === ALL) continue; // 글자 하나만 고른 좌우·상하는 막힌다
        expectIdentical(twice, ALL);
      }
  });

  it("좌우 → 상하 는 180° 회전과 같다 — 그리고 되짚으면 제자리", () => {
    const half = mirror(ALL, ids(ALL), "vertical", "horizontal");
    // 상자 x 10..420(가운데 215) · y 10..349(가운데 179.5)
    expect(coords(half, "obj-0", ["x1", "y1", "x2", "y2"])).toEqual([
      "330",
      "259",
      "230",
      "259",
    ]);
    expectIdentical(mirror(half, ids(ALL), "horizontal", "vertical"), ALL);
  });
});

describe("대칭 — 면·노란 조절점", () => {
  it("평행사변형은 대칭 뒤에도 노란 점이 돌아간다", () => {
    const svg = figure(
      `<polygon points="120 40 220 40 200 90 100 90" data-shape="parallelogram" stroke="#111" fill="none"/>`,
    );
    const out = mirrorFigureSelection(svg, ["obj-0"], "horizontal");
    const shape = adjustableShape(figureObjects(out)[0])!;
    expect(shape.kind).toBe("parallelogram");
    expect(isParallelogram(shape.points)).toBe(true);
    // 가운데 y = 65 → y′ = 130 − y
    closeTo(
      shape.points.flatMap((p) => [p.x, p.y]),
      [120, 90, 220, 90, 200, 40, 100, 40],
    );
    const handle = adjustHandles(shape).find((h) => h.adjust)!;
    // 노란 점은 여전히 첫 두 점(같은 변)의 가운데
    closeTo([handle.x, handle.y], [170, 90]);
    const skewed = moveAdjustHandle(shape, ADJUST_KEY, {
      x: handle.x + 30,
      y: handle.y,
    });
    expect(isParallelogram(skewed)).toBe(true);
  });

  it("삼각형도 노란 점이 돌아간다", () => {
    const svg = figure(
      `<polygon points="150 60 200 140 100 140" data-shape="triangle" stroke="#111" fill="none"/>`,
    );
    const out = mirrorFigureSelection(svg, ["obj-0"], "vertical");
    const shape = adjustableShape(figureObjects(out)[0])!;
    expect(shape.kind).toBe("triangle");
    // 가운데 x = 150 → 꼭짓점 그대로, 밑변 좌우만 바뀐다
    closeTo(
      shape.points.flatMap((p) => [p.x, p.y]),
      [150, 60, 100, 140, 200, 140],
    );
    expect(adjustHandles(shape).find((h) => h.adjust)).toMatchObject({
      x: 150,
      y: 60,
    });
  });

  it("선을 따라가는 면은 둘러싼 선이 모두 대칭될 때 같이 간다 — 면 맞추기 뒤에도 남는다", () => {
    const triangle = figure(
      `<line x1="100" y1="200" x2="200" y2="200" stroke="#111"/>` +
        `<line x1="200" y1="200" x2="150" y2="100" stroke="#111"/>` +
        `<line x1="150" y1="100" x2="100" y2="200" stroke="#111"/>`,
    );
    const filled = bucketFill(triangle, { x: 150, y: 170 }, "#d9d9d9").svg;
    const face = figureObjects(filled).find((o) => o.attrs["data-face"])!;
    const lines = figureObjects(filled)
      .filter((o) => o.type === "line")
      .map((o) => o.id);
    const out = mirrorFigureSelection(filled, lines, "vertical");
    // 상자 x 100..200 → 가운데 150 → x′ = 300 − x
    const [sx, sy] = numbers(face.attrs["data-face-seed"]);
    closeTo(numbers(attr(out, face.id, "data-face-seed")), [300 - sx, sy]);
    // 편집기 commit 의 면 맞추기가 대칭한 씨앗으로 같은 칸을 다시 찾는다
    const synced = syncFigureFaces(out).svg;
    const after = figureObjects(synced).find((o) => o.id === face.id);
    expect(after).toBeDefined();
    expect(after!.attrs["data-face"]).toBe(face.attrs["data-face"]);
  });

  it("면만 고르면 막힌다", () => {
    const triangle = figure(
      `<line x1="100" y1="200" x2="200" y2="200" stroke="#111"/>` +
        `<line x1="200" y1="200" x2="150" y2="100" stroke="#111"/>` +
        `<line x1="150" y1="100" x2="100" y2="200" stroke="#111"/>`,
    );
    const filled = bucketFill(triangle, { x: 150, y: 170 }, "#d9d9d9").svg;
    const face = figureObjects(filled).find((o) => o.attrs["data-face"])!;
    expect(mirrorBlock(figureObjects(filled), [face.id], "vertical")).toBe(
      MIRROR_BLOCKED.face,
    );
    expect(mirrorFigureSelection(filled, [face.id], "vertical")).toBe(filled);
  });
});

describe("대칭 — 막을 때", () => {
  const svg = figure(
    `<line x1="100" y1="100" x2="200" y2="140" stroke="#111"/>` +
      `<rect x="300" y="40" width="60" height="30" data-size-locked="true" stroke="#111" fill="none"/>` +
      `<text x="250" y="150" font-size="18" data-mj="A">A</text>`,
  );

  it("크기 고정 요소가 섞이면 이유를 주고 원문 그대로다", () => {
    expect(
      mirrorBlock(figureObjects(svg), ["obj-0", "obj-1"], "vertical"),
    ).toBe(MIRROR_BLOCKED.locked);
    expect(mirrorFigureSelection(svg, ["obj-0", "obj-1"], "vertical")).toBe(
      svg,
    );
  });

  it("글자 하나만 고르면 좌우·상하는 막는다 — 제자리가 축이라 움직일 것이 없다", () => {
    expect(mirrorBlock(figureObjects(svg), ["obj-2"], "vertical")).toBe(
      MIRROR_BLOCKED.text,
    );
    expect(mirrorFigureSelection(svg, ["obj-2"], "horizontal")).toBe(svg);
  });

  it("직선 축이면 글자 하나도 대칭한 자리로 옮긴다 — 막지 않는다", () => {
    const axis: MirrorAxis = [
      [100, 0],
      [100, 10],
    ];
    expect(mirrorBlock(figureObjects(svg), ["obj-2"], axis)).toBeNull();
    const out = mirrorFigureSelection(svg, ["obj-2"], axis, {
      textCenters: new Map([["obj-2", [250, 150] as Point]]),
    });
    // x′ = 200 − x → 가운데 250 → −50
    expect(attr(out, "obj-2", "transform")).toBe("translate(-300 0)");
  });

  it("축의 두 점이 같으면 이유를 주고 원문 그대로다", () => {
    const axis: MirrorAxis = [
      [100, 100],
      [100, 100],
    ];
    expect(mirrorBlock(figureObjects(svg), ["obj-0"], axis)).toBe(
      MIRROR_BLOCKED.axis,
    );
    expect(mirrorFigureSelection(svg, ["obj-0"], axis)).toBe(svg);
  });

  it("아무것도 안 고르면 원문 그대로다", () => {
    expect(mirrorFigureSelection(svg, [], "vertical")).toBe(svg);
    expect(mirrorBlock(figureObjects(svg), [], "vertical")).toBeNull();
  });
});

describe("대칭 — 틀 넓히기", () => {
  it("틀 밖으로 나가면 넘친 쪽만 넓힌다", () => {
    const svg = figure(
      `<line x1="100" y1="100" x2="200" y2="140" stroke="#111"/>`,
    );
    const out = mirrorFigureSelection(
      svg,
      ["obj-0"],
      [
        [50, 0],
        [50, 10],
      ],
    );
    // x′ = 100 − x → −100 … 0. 왼쪽만 넓어지고 오른쪽 끝(480)은 그대로
    const [x, y, w, h] = frameOf(out);
    expect(x).toBe(-106);
    expect(y).toBe(0);
    expect(x + w).toBe(480);
    expect(h).toBe(360);
  });

  it("틀 안이면 틀을 건드리지 않는다", () => {
    const svg = figure(
      `<line x1="100" y1="100" x2="200" y2="140" stroke="#111"/>`,
    );
    expect(frameOf(mirrorFigureSelection(svg, ["obj-0"], "vertical"))).toEqual([
      0, 0, 480, 360,
    ]);
  });

  it("조판한 글자 상자를 주면 그 상자로 넓힌다", () => {
    const svg = figure(
      `<line x1="10" y1="100" x2="20" y2="100" stroke="#111"/>` +
        `<text x="30" y="60" font-size="18" data-mj="A">A</text>`,
    );
    const out = mirrorFigureSelection(
      svg,
      ids(svg),
      [
        [10, 0],
        [10, 10],
      ],
      {
        textBoxes: new Map([
          ["obj-1", { center: [30, 60] as Point, half: [20, 10] as Point }],
        ]),
      },
    );
    // x′ = 20 − x. 선은 10 … 0, 글자 가운데 30 → −10 이고 반폭 20 → 왼쪽 끝 −30, 여백 6
    expect(frameOf(out)[0]).toBe(-36);
  });
});
