/**
 * 도형 편집기 — 고른 요소 **서로 맞추기**(정렬)와 **고르게 벌리기**
 * (원장님 2026-09-21 «요소별 각종 정렬 기능 넣어줄 수 있으면 넣어줘 — 왼쪽 정렬, 가운데 정렬, 우측 정렬, 중앙 정렬 등등»).
 *
 * - 기준은 **고른 것들의 바깥 상자**다 — 왼쪽 맞추기는 그중 가장 왼쪽에 다 같이 선다(그림 틀이 아니다).
 * - 요소가 «차지하는 자리»로 잰다 — 곡선은 조절점이 아니라 곡선이 닿는 끝, 글자는 조판한 상자.
 * - **좌표를 그 자리에 적는다**(변환 행렬을 덧씌우지 않는다) · 글자는 똑바로 선 채 자리만 ·
 *   면·노란 조절점·임자 꼭짓점이 따라온다 · 틀 밖이면 넘친 쪽만 넓힌다 — 회전·대칭과 **같은 한 엔진**(figureBake.ts).
 * - 크기 고정(figureSizeLock)은 **막지 않는다** — 고정은 «이동만 가능»이고 정렬은 옮기기뿐이다.
 * 화면과 무관한 순수 계산이다.
 */
import { describe, expect, it } from "vitest";

import {
  ALIGN_BLOCKED,
  alignBlock,
  alignFigureSelection,
  SPREAD_BLOCKED,
  spreadBlock,
  spreadFigureSelection,
  type AlignKind,
} from "@/components/unified/figure-editor/figureAlign";
import {
  bucketFill,
  syncFigureFaces,
} from "@/components/unified/figure-editor/figureFaceEditing";
import {
  adjustableShape,
  adjustHandles,
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
const box = (svg: string, id: string) =>
  ["x", "y", "width", "height"].map((n) => Number(attr(svg, id, n)));
const viewBox = (svg: string) =>
  numbers(read(svg).documentElement.getAttribute("viewBox"));

/** 사각 둘 — A [10,10]~[50,30] · B [100,100]~[160,140]. 바깥 상자 [10,10]~[160,140], 가운데 (85, 75). */
const two = figure(
  `<rect x="10" y="10" width="40" height="20" stroke="#111" fill="none"/>` +
    `<rect x="100" y="100" width="60" height="40" stroke="#111" fill="none"/>`,
);

describe("정렬 여섯 — 기준은 고른 것들의 바깥 상자", () => {
  const cases: [AlignKind, number[], number[]][] = [
    ["left", [10, 10, 40, 20], [10, 100, 60, 40]],
    ["centerX", [65, 10, 40, 20], [55, 100, 60, 40]],
    ["right", [120, 10, 40, 20], [100, 100, 60, 40]],
    ["top", [10, 10, 40, 20], [100, 10, 60, 40]],
    ["middleY", [10, 65, 40, 20], [100, 55, 60, 40]],
    ["bottom", [10, 120, 40, 20], [100, 100, 60, 40]],
  ];
  it.each(cases)("%s — 좌표를 그 자리에 적는다", (kind, first, second) => {
    const after = alignFigureSelection(two, ids(two), kind);
    expect(box(after, "obj-0")).toEqual(first);
    expect(box(after, "obj-1")).toEqual(second);
    // 변환 행렬을 덧씌우지 않는다 — 정밀 수치·조절점·면 계산이 새 자리를 그대로 읽는다
    expect(attr(after, "obj-0", "transform")).toBeNull();
    expect(attr(after, "obj-1", "transform")).toBeNull();
  });
  it("이미 맞아 있으면 원문 그대로 — 되돌리기 자리가 안 생긴다", () => {
    const left = alignFigureSelection(two, ids(two), "left");
    expect(alignFigureSelection(left, ids(left), "left")).toBe(left);
  });
  it("맞춰도 요소 차례·종류·속성 이름은 그대로다", () => {
    const after = alignFigureSelection(two, ids(two), "right");
    const before = figureObjects(two);
    figureObjects(after).forEach((o, i) => {
      expect(o.id).toBe(before[i].id);
      expect(o.type).toBe(before[i].type);
      expect(Object.keys(o.attrs).sort()).toEqual(
        Object.keys(before[i].attrs).sort(),
      );
    });
  });
});

describe("정렬 — 요소 종류", () => {
  it("선분·원은 좌표로 옮겨 적는다", () => {
    const svg = figure(
      `<line x1="20" y1="20" x2="60" y2="40" stroke="#111"/>` +
        `<circle cx="200" cy="200" r="30" stroke="#111" fill="none"/>`,
    );
    // 바깥 상자 x 20..230 — 왼쪽 맞추기는 원의 왼쪽 끝(170)이 20 으로 간다
    const after = alignFigureSelection(svg, ids(svg), "left");
    expect(
      ["x1", "y1", "x2", "y2"].map((n) => Number(attr(after, "obj-0", n))),
    ).toEqual([20, 20, 60, 40]);
    expect(Number(attr(after, "obj-1", "cx"))).toBe(50);
    expect(Number(attr(after, "obj-1", "cy"))).toBe(200);
    expect(Number(attr(after, "obj-1", "r"))).toBe(30);
  });
  it("곡선은 **곡선이 닿는 끝**으로 잰다 — 조절점이 아니다", () => {
    // Q 곡선의 조절점은 (150, -100) 으로 위로 멀리 있지만 곡선은 y 0 까지만 올라간다
    const svg = figure(
      `<path d="M100 100 Q150 -100 200 100" stroke="#111" fill="none"/>` +
        `<rect x="300" y="50" width="20" height="20" stroke="#111" fill="none"/>`,
    );
    const after = alignFigureSelection(svg, ids(svg), "top");
    // 곡선 꼭대기 y = 0 이 바깥 상자의 위 — 사각이 거기로 내려온다(조절점 −100 이었다면 −100 으로 갔다)
    expect(Number(attr(after, "obj-1", "y"))).toBe(0);
    expect(attr(after, "obj-0", "d")).toBe("M100 100 Q150 -100 200 100");
  });
});

describe("정렬 — 글자 · 임자 꼭짓점", () => {
  // 글자 «가» font-size 20 → 폭 20, 가운데 (210, 92.8), 상자 [200, 82.8]~[220, 102.8]
  const svg = figure(
    `<rect x="10" y="10" width="40" height="20" stroke="#111" fill="none"/>` +
      `<text x="200" y="100" font-size="20" data-mj="가">가</text>`,
  );
  it("글자는 똑바로 선 채 자리만 — 앞에 translate 만 붙고 회전이 없다", () => {
    const after = alignFigureSelection(svg, ids(svg), "left");
    // 바깥 상자의 왼쪽은 10 — 글자 상자의 왼쪽(200)이 10 으로 간다
    expect(attr(after, "obj-1", "transform")).toBe("translate(-190 0)");
    expect(attr(after, "obj-1", "x")).toBe("200");
    expect(attr(after, "obj-1", "y")).toBe("100");
  });
  it("화면에서 잰 글자 상자를 주면 그것으로 맞춘다", () => {
    const after = alignFigureSelection(svg, ids(svg), "left", {
      textBoxes: new Map([["obj-1", { center: [300, 90], half: [50, 12] }]]),
    });
    // 상자 왼쪽이 250 — 10 으로 간다
    expect(attr(after, "obj-1", "transform")).toBe("translate(-240 0)");
  });
  it("임자 꼭짓점은 **그 꼭짓점이 든 요소**를 따라간다 — 라벨이 아니다", () => {
    // 글자 «가» font-size 20 anchor middle → 상자 [90, 62.8]~[110, 82.8]. 선분 [100,100]~[200,100].
    const owned = figure(
      `<line x1="100" y1="100" x2="200" y2="100" stroke="#111"/>` +
        `<text x="100" y="80" font-size="20" text-anchor="middle" data-px="100" data-py="100" data-mj="가">가</text>` +
        `<rect x="10" y="300" width="20" height="20" stroke="#111" fill="none"/>`,
    );
    // 선분·글자를 왼쪽 맞추기 — 바깥 상자의 왼쪽은 90(글자), 선분만 dx = −10, 글자는 제자리
    const after = alignFigureSelection(owned, ["obj-0", "obj-1"], "left");
    expect(Number(attr(after, "obj-0", "x1"))).toBe(90);
    expect(attr(after, "obj-1", "transform")).toBeNull();
    // 임자 꼭짓점(100,100)은 선분의 끝점 — 라벨은 안 움직였지만 선분을 따라 90 으로 간다
    expect(numbers(attr(after, "obj-1", "data-px"))).toEqual([90]);
    expect(numbers(attr(after, "obj-1", "data-py"))).toEqual([100]);
    // 글자만 골라 옮기면 임자 꼭짓점은 선분에 남는다(선분이 안 움직였다)
    const moved = alignFigureSelection(owned, ["obj-1", "obj-2"], "left");
    expect(attr(moved, "obj-1", "transform")).toBe("translate(-80 0)");
    expect(numbers(attr(moved, "obj-1", "data-px"))).toEqual([100]);
    expect(numbers(attr(moved, "obj-1", "data-py"))).toEqual([100]);
  });
});

describe("정렬 — 면 · 노란 조절점 · 크기 고정", () => {
  const triangle = figure(
    `<line x1="100" y1="200" x2="200" y2="200" stroke="#111"/>` +
      `<line x1="200" y1="200" x2="150" y2="100" stroke="#111"/>` +
      `<line x1="150" y1="100" x2="100" y2="200" stroke="#111"/>` +
      `<rect x="300" y="100" width="40" height="100" stroke="#111" fill="none"/>`,
  );
  const filled = bucketFill(triangle, { x: 150, y: 170 }, "#d9d9d9").svg;
  const face = () => figureObjects(filled).find((o) => o.attrs["data-face"])!;

  it("둘러싼 선이 제각각 움직이면 면은 제자리 — 편집기 commit 의 면 맞추기가 새 선에 다시 맞춘다", () => {
    const lines = figureObjects(filled)
      .filter((o) => o.type === "line")
      .map((o) => o.id);
    // 세 변의 왼쪽 끝이 제각각(100 · 150 · 100)이라 변마다 옮기는 양이 다르다 — 면이 통째로 따라갈 자리가 없다
    const after = alignFigureSelection(filled, lines, "left");
    expect(attr(after, face().id, "data-face-seed")).toBe(
      face().attrs["data-face-seed"],
    );
    // 회전·대칭과 같이, 편집기는 같은 한 걸음에 면을 다시 맞춘다 — 새 선이 두른 칸으로
    const path = attr(syncFigureFaces(after).svg, face().id, "d")!;
    expect(path).not.toBe(attr(after, face().id, "d"));
    expect(path).toMatch(/^M[-\d. ]+(?:L[-\d. ]+)+Z$/);
  });
  it("면만 고르면 맞추지 않는다 — 면은 둘러싼 선을 따라간다", () => {
    expect(alignBlock(figureObjects(filled), [face().id])).toBe(
      ALIGN_BLOCKED.face,
    );
    expect(alignFigureSelection(filled, [face().id], "left")).toBe(filled);
  });
  it("노란 조절점(평행사변형)은 옮긴 꼭짓점을 그대로 따라간다", () => {
    const svg = figure(
      `<polygon points="60 40 160 40 140 120 40 120" data-shape="parallelogram" stroke="#111" fill="none"/>` +
        `<rect x="300" y="40" width="20" height="20" stroke="#111" fill="none"/>`,
    );
    const before = adjustHandles(adjustableShape(figureObjects(svg)[0])!).find(
      (h) => h.adjust,
    )!;
    const after = alignFigureSelection(svg, ids(svg), "right");
    const shape = adjustableShape(figureObjects(after)[0])!;
    expect(shape.kind).toBe("parallelogram");
    // 바깥 상자의 오른쪽은 320 — 다각형(오른쪽 160)이 dx = 160 만큼 간다
    expect(attr(after, "obj-0", "points")).toBe(
      "220 40 320 40 300 120 200 120",
    );
    expect(adjustHandles(shape).find((h) => h.adjust)).toMatchObject({
      x: before.x + 160,
      y: before.y,
    });
  });
  it("크기 고정 요소도 함께 간다 — 고정은 «이동만 가능»이고 정렬은 옮기기뿐이다", () => {
    const svg = figure(
      `<rect x="10" y="10" width="40" height="20" stroke="#111" fill="none"/>` +
        `<rect x="100" y="100" width="60" height="40" data-size-locked="true" stroke="#111" fill="none"/>`,
    );
    expect(alignBlock(figureObjects(svg), ids(svg))).toBeNull();
    const after = alignFigureSelection(svg, ids(svg), "left");
    // 자리만 바뀌고 크기는 그대로
    expect(box(after, "obj-1")).toEqual([10, 100, 60, 40]);
  });
});

describe("정렬 — 틀 밖이면 넘친 쪽만 넓힌다", () => {
  it("틀 밖으로 맞춘 요소만큼 viewBox 가 넓어진다", () => {
    const svg = figure(
      `<rect x="-40" y="20" width="30" height="20" stroke="#111" fill="none"/>` +
        `<rect x="100" y="20" width="30" height="20" stroke="#111" fill="none"/>`,
      "0 0 200 200",
    );
    const after = alignFigureSelection(svg, ids(svg), "left");
    expect(Number(attr(after, "obj-1", "x"))).toBe(-40);
    const [x, , width] = viewBox(after);
    expect(x).toBeLessThan(0);
    expect(x + width).toBeGreaterThanOrEqual(200);
  });
});

describe("정렬 — 막을 때", () => {
  it("고른 것이 하나뿐이거나 없으면 흐리다", () => {
    const objects = figureObjects(two);
    expect(alignBlock(objects, [])).toBe(ALIGN_BLOCKED.few);
    expect(alignBlock(objects, ["obj-0"])).toBe(ALIGN_BLOCKED.few);
    expect(alignBlock(objects, ids(two))).toBeNull();
    expect(alignFigureSelection(two, ["obj-0"], "left")).toBe(two);
  });
});

/** 고르게 벌리기 — 사각 셋(폭 20)이 x 0 · 30 · 200 에 선다. */
const three = figure(
  `<rect x="0" y="0" width="20" height="20" stroke="#111" fill="none"/>` +
    `<rect x="30" y="60" width="20" height="20" stroke="#111" fill="none"/>` +
    `<rect x="200" y="120" width="20" height="20" stroke="#111" fill="none"/>`,
);

describe("고르게 벌리기 — 사이 간격을 같게", () => {
  it("가로 — 양 끝은 제자리, 가운데가 간격을 맞춘다", () => {
    const after = spreadFigureSelection(three, ids(three), "horizontal");
    // 첫 오른쪽 20 ~ 끝 왼쪽 200 사이 180, 가운데 폭 20 → 간격 (180 − 20) / 2 = 80
    expect(Number(attr(after, "obj-0", "x"))).toBe(0);
    expect(Number(attr(after, "obj-1", "x"))).toBe(100);
    expect(Number(attr(after, "obj-2", "x"))).toBe(200);
    // 가로로 벌릴 때 세로는 건드리지 않는다
    expect(Number(attr(after, "obj-1", "y"))).toBe(60);
  });
  it("세로 — 차례는 위에서 아래로", () => {
    const after = spreadFigureSelection(three, ids(three), "vertical");
    // 위 0~20 · 120~140 사이 100, 가운데 높이 20 → 간격 40
    expect(Number(attr(after, "obj-1", "y"))).toBe(60);
    const moved = spreadFigureSelection(
      figure(
        `<rect x="0" y="0" width="20" height="20" stroke="#111" fill="none"/>` +
          `<rect x="30" y="30" width="20" height="20" stroke="#111" fill="none"/>` +
          `<rect x="200" y="120" width="20" height="20" stroke="#111" fill="none"/>`,
      ),
      ["obj-0", "obj-1", "obj-2"],
      "vertical",
    );
    expect(Number(attr(moved, "obj-1", "y"))).toBe(60);
    expect(Number(attr(moved, "obj-0", "y"))).toBe(0);
    expect(Number(attr(moved, "obj-2", "y"))).toBe(120);
  });
  it("이미 고르면 원문 그대로", () => {
    const once = spreadFigureSelection(three, ids(three), "horizontal");
    expect(spreadFigureSelection(once, ids(once), "horizontal")).toBe(once);
  });
  it("셋 미만이면 흐리다 — 벌릴 사이가 없다", () => {
    const objects = figureObjects(three);
    expect(spreadBlock(objects, ["obj-0", "obj-1"])).toBe(SPREAD_BLOCKED.few);
    expect(spreadBlock(objects, ids(three))).toBeNull();
    expect(spreadFigureSelection(three, ["obj-0", "obj-1"], "horizontal")).toBe(
      three,
    );
  });
});

/**
 * 묶음은 **한 덩어리로** 움직인다(ppt 와 같다) — 상자 하나가 사각 + 이름 글자 둘인 관계도에서
 * 요소마다 따로 맞추면 글자가 상자 밖으로 빠져나간다(브라우저 실측 2026-09-21).
 */
describe("정렬 — 묶음은 한 덩어리", () => {
  // 상자 A: 사각 [200,20]~[310,60] + 글자(anchor middle, font-size 20, «가») 상자 [245,27.8]~[265,47.8]
  // 상자 B: 사각 [40,120]~[150,160]
  const boxes = figure(
    `<rect x="200" y="20" width="110" height="40" stroke="#111" fill="none" data-group="A"/>` +
      `<text x="255" y="45" font-size="20" text-anchor="middle" data-mj="가" data-group="A">가</text>` +
      `<rect x="40" y="120" width="110" height="40" stroke="#111" fill="none"/>`,
  );
  const groups = new Map([
    ["obj-0", "A"],
    ["obj-1", "A"],
  ]);
  it("묶음 속 요소는 모두 같은 만큼 옮긴다 — 글자가 상자를 벗어나지 않는다", () => {
    const after = alignFigureSelection(boxes, ids(boxes), "left", { groups });
    // 바깥 상자의 왼쪽은 40(B) — 묶음 A 의 왼쪽(200)이 40 으로, 속 글자도 같은 −160
    expect(Number(attr(after, "obj-0", "x"))).toBe(40);
    expect(attr(after, "obj-1", "transform")).toBe("translate(-160 0)");
    expect(Number(attr(after, "obj-2", "x"))).toBe(40);
  });
  it("묶음을 안 주면 요소마다 따로 간다 — 글자가 상자 밖으로", () => {
    const after = alignFigureSelection(boxes, ids(boxes), "left");
    expect(Number(attr(after, "obj-0", "x"))).toBe(40);
    // 글자 상자의 왼쪽(245)이 40 으로 — 사각과 다른 양이다
    expect(attr(after, "obj-1", "transform")).toBe("translate(-205 0)");
  });
  it("묶음 하나만 골랐으면 흐리다 — 맞출 단위가 하나다", () => {
    const objects = figureObjects(boxes);
    expect(alignBlock(objects, ["obj-0", "obj-1"], groups)).toBe(
      ALIGN_BLOCKED.few,
    );
    expect(alignBlock(objects, ["obj-0", "obj-1"])).toBeNull();
    expect(alignBlock(objects, ids(boxes), groups)).toBeNull();
  });
  it("고르게 벌리기도 묶음을 한 덩어리로 센다", () => {
    const three = figure(
      `<rect x="0" y="0" width="20" height="20" stroke="#111" fill="none" data-group="A"/>` +
        `<rect x="20" y="0" width="20" height="20" stroke="#111" fill="none" data-group="A"/>` +
        `<rect x="60" y="0" width="20" height="20" stroke="#111" fill="none"/>` +
        `<rect x="200" y="0" width="20" height="20" stroke="#111" fill="none"/>`,
    );
    const map = new Map([
      ["obj-0", "A"],
      ["obj-1", "A"],
    ]);
    // 단위 셋 — A[0,40] · [60,80] · [200,220]. 사이 (200 − 40 − 20) / 2 = 70 → 가운데는 110
    const after = spreadFigureSelection(three, ids(three), "horizontal", {
      groups: map,
    });
    expect(Number(attr(after, "obj-2", "x"))).toBe(110);
    expect(Number(attr(after, "obj-0", "x"))).toBe(0);
    expect(Number(attr(after, "obj-1", "x"))).toBe(20);
    // 묶음을 안 주면 단위가 넷이라 결과가 다르다
    const loose = spreadFigureSelection(three, ids(three), "horizontal");
    expect(Number(attr(loose, "obj-2", "x"))).not.toBe(110);
  });
});
