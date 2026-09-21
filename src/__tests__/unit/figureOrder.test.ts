/**
 * 도형 편집기 — 요소 **순서**(맨 앞으로 · 앞으로 · 뒤로 · 맨 뒤로). 원장님 2026-09-21:
 *
 * > «요소 순서 조절 할 수 있어야겠어. ppt나 다른 곳을 보면 맨 뒤로 맨 앞으로, 뒤로, 앞으로 같은
 * >  순서를 이용해서 조절하는게 있는데, 우리 도형 편집기에는 그 기능이 없어서 지금 y축이 가려져버렸어.»
 *
 * SVG 는 **문서 차례가 곧 그리는 차례**다 — 뒤에 적힌 것이 위에 그려진다. 그래서 시험은 «단추가 있다»가 아니라
 * **원문의 실제 차례**(`[data-object-id]` 의 문서 차례)를 본다.
 * 화면과 무관한 순수 계산이다(겹침은 상자를 받아서 본다 — 화면에서 재는 쪽은 편집기가 한다).
 */
import { describe, expect, it } from "vitest";

import {
  ORDER_BLOCKED,
  orderBlock,
  orderFigureSelection,
  type OrderBox,
  type OrderMove,
} from "@/components/unified/figure-editor/figureOrder";
import { syncFigureFaces } from "@/components/unified/figure-editor/figureFaceEditing";
import {
  figureObjects,
  prepareFigureSvg,
  SVG_NS,
} from "@/components/unified/figure-editor/figureSvgEditing";

const figure = (body: string) =>
  prepareFigureSvg(
    `<svg xmlns="${SVG_NS}" viewBox="0 0 480 360">${body}</svg>`,
  );
const read = (svg: string) =>
  new DOMParser().parseFromString(svg, "image/svg+xml");
/** 그리는 차례 — 원문의 `[data-object-id]` 문서 차례. */
const order = (svg: string) => figureObjects(svg).map((o) => o.id);
const node = (svg: string, id: string) =>
  read(svg).querySelector(`[data-object-id="${id}"]`)!;
/** 요소의 조상(루트 제외)마다 속성 하나 — 모양을 정하는 조상 변환·물려받는 서식이 따라왔는지 본다. */
const ancestors = (svg: string, id: string, name: string) => {
  const found: (string | null)[] = [];
  for (
    let p = node(svg, id).parentElement;
    p?.parentElement;
    p = p.parentElement
  )
    found.push(p.getAttribute(name));
  return found;
};
const gCount = (svg: string) => read(svg).querySelectorAll("g").length;
const move = (
  svg: string,
  ids: string[],
  kind: OrderMove,
  options: Parameters<typeof orderFigureSelection>[3] = {},
) => orderFigureSelection(svg, ids, kind, options);
const box = (
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): OrderBox => ({
  minX,
  minY,
  maxX,
  maxY,
});

/**
 * 원장님 화면 그대로 — 포물선 · x축 · y축 · 포물선 안에 내접한 삼각형 ABC(회색 채움, 독립 다각형).
 * 삼각형이 y축 **뒤에 적혀** y축을 덮는다(원본은 y축이 삼각형 위로 지나간다).
 */
const parabola = figure(
  `<path d="M 60 40 Q 240 560 420 40" stroke="#111" fill="none"/>` +
    `<line x1="20" y1="300" x2="460" y2="300" stroke="#111"/>` +
    `<line x1="240" y1="340" x2="240" y2="20" stroke="#111"/>` +
    `<polygon points="120,160 360,160 240,300" fill="#d9d9d9" stroke="#111"/>`,
);
const [curve, xAxis, yAxis, triangle] = order(parabola);

describe("맨 뒤로 · 맨 앞으로 — 원장님 화면(채운 삼각형이 y축을 덮었다)", () => {
  it("삼각형을 맨 뒤로 — 모든 것 아래로, 나머지 차례는 그대로", () => {
    const next = move(parabola, [triangle], "back");
    expect(order(next)).toEqual([triangle, curve, xAxis, yAxis]);
    // y축이 이제 삼각형 **뒤에 적혀** 위에 그려진다
    expect(order(next).indexOf(yAxis)).toBeGreaterThan(
      order(next).indexOf(triangle),
    );
  });
  it("맨 앞으로 — 모든 것 위로", () => {
    expect(order(move(parabola, [curve], "front"))).toEqual([
      xAxis,
      yAxis,
      triangle,
      curve,
    ]);
  });
  it("모양·서식은 그대로 — 차례만 바뀐다", () => {
    const next = move(parabola, [triangle], "back");
    for (const id of [curve, xAxis, yAxis, triangle])
      expect(node(next, id).outerHTML).toBe(node(parabola, id).outerHTML);
  });
  it("이미 맨 뒤·맨 앞이면 원문 그대로(되돌리기 자리가 안 생긴다)", () => {
    expect(move(parabola, [curve], "back")).toBe(parabola);
    expect(move(parabola, [triangle], "front")).toBe(parabola);
  });
  it("아무것도 안 골랐으면 원문 그대로", () => {
    for (const kind of ["front", "forward", "backward", "back"] as const)
      expect(move(parabola, [], kind)).toBe(parabola);
  });
});

describe("묶음은 한 덩어리로 — 속 차례는 그대로 두고 덩어리째", () => {
  // 사각 + 이름 글자가 묶음 A(떨어져 적혀 있다), 가운데 원 둘은 묶음 밖
  const grouped = figure(
    `<rect x="20" y="20" width="80" height="40" stroke="#111" fill="#eee" data-group="A"/>` +
      `<circle cx="200" cy="100" r="30" stroke="#111" fill="none"/>` +
      `<text x="60" y="45" data-group="A" data-mj="P">P</text>` +
      `<circle cx="300" cy="100" r="30" stroke="#111" fill="none"/>`,
  );
  const [rect, c1, label, c2] = order(grouped);
  const groups = new Map([
    [rect, "A"],
    [label, "A"],
  ]);
  it("맨 앞으로 — 묶음 둘이 붙어서 맨 위, 사각이 글자 아래 그대로", () => {
    expect(order(move(grouped, [rect, label], "front", { groups }))).toEqual([
      c1,
      c2,
      rect,
      label,
    ]);
  });
  it("맨 뒤로 — 묶음 둘이 붙어서 맨 아래", () => {
    expect(order(move(grouped, [rect, label], "back", { groups }))).toEqual([
      rect,
      label,
      c1,
      c2,
    ]);
  });
  it("앞으로 한 칸 — 덩어리째 넘는다(묶음 밖 요소가 묶음 속으로 끼지 않는다)", () => {
    // 뒤 두 원이 겹친다(상자 없음 = 겹친다고 본다)
    const contiguous = figure(
      `<rect x="20" y="20" width="80" height="40" data-group="A"/>` +
        `<text x="60" y="45" data-group="A" data-mj="P">P</text>` +
        `<circle cx="200" cy="100" r="30"/>` +
        `<circle cx="300" cy="100" r="30"/>`,
    );
    const [r, t, a, b] = order(contiguous);
    const g = new Map([
      [r, "A"],
      [t, "A"],
    ]);
    expect(order(move(contiguous, [r, t], "forward", { groups: g }))).toEqual([
      a,
      r,
      t,
      b,
    ]);
  });
  it("묶음을 넘을 때도 덩어리째 — 묶음 한가운데로 끼어들지 않는다", () => {
    const ahead = figure(
      `<circle cx="60" cy="40" r="30"/>` +
        `<rect x="20" y="20" width="80" height="40" data-group="B"/>` +
        `<text x="60" y="45" data-group="B" data-mj="Q">Q</text>` +
        `<circle cx="300" cy="100" r="30"/>`,
    );
    const [c, r, t, far] = order(ahead);
    const g = new Map([
      [r, "B"],
      [t, "B"],
    ]);
    expect(order(move(ahead, [c], "forward", { groups: g }))).toEqual([
      r,
      t,
      c,
      far,
    ]);
    expect(order(move(ahead, [far], "backward", { groups: g }))).toEqual([
      c,
      far,
      r,
      t,
    ]);
  });
  it("묶음 속 하나만 골랐으면(요소 목록) 그것만 간다", () => {
    expect(order(move(grouped, [label], "back", { groups }))).toEqual([
      label,
      rect,
      c1,
      c2,
    ]);
  });
});

describe("앞으로 · 뒤로 한 칸 — 겹치는 것 사이의 한 칸", () => {
  // 가로로 늘어선 넷 — 0 은 2 와만 겹친다(1 은 멀리)
  const row = figure(
    `<rect x="0" y="0" width="40" height="40"/>` +
      `<rect x="300" y="300" width="40" height="40"/>` +
      `<rect x="20" y="20" width="40" height="40"/>` +
      `<rect x="100" y="0" width="40" height="40"/>`,
  );
  const [a, far, b, c] = order(row);
  const boxes = new Map([
    [a, box(0, 0, 40, 40)],
    [far, box(300, 300, 340, 340)],
    [b, box(20, 20, 60, 60)],
    [c, box(100, 0, 140, 40)],
  ]);
  it("안 겹치는 것은 건너뛰고 겹치는 것 하나 위로", () => {
    expect(order(move(row, [a], "forward", { boxes }))).toEqual([far, b, a, c]);
  });
  it("뒤로도 같다 — 겹치는 것 하나 아래로", () => {
    expect(order(move(row, [b], "backward", { boxes }))).toEqual([
      b,
      a,
      far,
      c,
    ]);
  });
  it("위에 겹치는 것이 없으면 원문 그대로 — 번호만 바뀌고 눈에 변화가 없는 일은 안 한다", () => {
    expect(move(row, [b], "forward", { boxes })).toBe(row);
    expect(move(row, [a], "backward", { boxes })).toBe(row);
  });
  it("상자를 못 잰 요소는 겹친다고 본다 — 문서 한 칸", () => {
    expect(order(move(row, [a], "forward"))).toEqual([far, a, b, c]);
  });
  it("여럿을 고르면 각자 한 칸씩 — 고른 것끼리는 서로 넘지 않는다", () => {
    const all = new Map([...boxes].map(([id]) => [id, box(0, 0, 400, 400)]));
    expect(order(move(row, [a, b], "forward", { boxes: all }))).toEqual([
      far,
      a,
      c,
      b,
    ]);
  });
  it("앞으로 · 뒤로를 번갈아 누르면 제자리로 온다", () => {
    // 겹치는 것끼리의 위아래가 돌아온다 — 안 겹치는 것(far)과의 차례는 눈에 안 보여 따지지 않는다
    let svg = move(row, [a], "forward", { boxes });
    expect(order(svg).indexOf(a)).toBeGreaterThan(order(svg).indexOf(b));
    svg = move(svg, [a], "backward", { boxes });
    expect(order(svg).indexOf(a)).toBeLessThan(order(svg).indexOf(b));
    // 다 겹치면(문서 한 칸) 원문까지 그대로 돌아온다
    expect(move(move(row, [a], "forward"), [a], "backward")).toBe(row);
  });
});

describe("겹겹이 싼 그림(엔진 층·붙여넣기 묶음) — 조상의 변환·서식을 잃지 않는다", () => {
  // 엔진은 선·표시·글자를 층(<g>)으로 싼다. 붙여넣기는 translate 를 건 <g> 에 싼다.
  const layered = figure(
    `<g><line x1="0" y1="0" x2="100" y2="0" stroke="#111"/></g>` +
      `<g transform="translate(10 0)" stroke="#f00" stroke-width="3">` +
      `<line x1="0" y1="10" x2="100" y2="10"/>` +
      `<line x1="0" y1="20" x2="100" y2="20"/>` +
      `</g>`,
  );
  const [first, red1, red2] = order(layered);
  it("변환한 묶음 속 요소를 맨 뒤로 — 조상 변환·물려받는 선 색이 같이 간다", () => {
    const next = move(layered, [red2], "back");
    expect(order(next)).toEqual([red2, first, red1]);
    expect(ancestors(next, red2, "transform")).toContain("translate(10 0)");
    expect(ancestors(next, red2, "stroke")).toContain("#f00");
    expect(ancestors(next, red2, "stroke-width")).toContain("3");
    // 남은 짝은 제자리 그대로
    expect(ancestors(next, red1, "transform")).toEqual(["translate(10 0)"]);
  });
  it("맨 앞으로 — 앞 묶음의 변환·서식을 **얻지 않는다**", () => {
    const next = move(layered, [first], "front");
    expect(order(next)).toEqual([red1, red2, first]);
    expect(ancestors(next, first, "transform").filter(Boolean)).toEqual([]);
    expect(ancestors(next, first, "stroke").filter(Boolean)).toEqual([]);
  });
  it("묶음 한가운데로 들어갈 때는 그 묶음을 쪼갠다 — 앞뒤 요소의 조상은 그대로", () => {
    const next = move(layered, [first], "forward");
    expect(order(next)).toEqual([red1, first, red2]);
    expect(ancestors(next, red1, "transform")).toEqual(["translate(10 0)"]);
    expect(ancestors(next, red2, "transform")).toEqual(["translate(10 0)"]);
    expect(ancestors(next, first, "transform").filter(Boolean)).toEqual([]);
  });
  it("조상의 id 는 복사하지 않는다(같은 id 가 둘이 되지 않는다)", () => {
    const named = figure(
      `<g id="layer"><line x1="0" y1="0" x2="9" y2="9"/><line x1="0" y1="5" x2="9" y2="5"/></g>` +
        `<line x1="0" y1="9" x2="9" y2="0"/>`,
    );
    const [, second] = order(named);
    const next = move(named, [second], "front");
    expect(read(next).querySelectorAll("#layer")).toHaveLength(1);
  });
  it("같은 모양의 층끼리는 다시 합친다 — 번갈아 옮겨도 <g> 가 불어나지 않는다", () => {
    const engine = figure(
      `<g><line x1="0" y1="0" x2="9" y2="9"/><line x1="0" y1="5" x2="9" y2="5"/></g>` +
        `<g><text x="4" y="4" data-mj="A">A</text><text x="6" y="6" data-mj="B">B</text></g>`,
    );
    const [line] = order(engine);
    let svg = engine;
    for (let i = 0; i < 6; i++)
      svg = move(svg, [line], i % 2 ? "backward" : "forward");
    expect(gCount(svg)).toBeLessThanOrEqual(gCount(engine));
    const once = move(engine, [line], "front");
    expect(gCount(once)).toBeLessThanOrEqual(gCount(engine));
    expect(order(once).at(-1)).toBe(line);
  });
  it("빈 층은 걷는다", () => {
    const lone = figure(
      `<g><line x1="0" y1="0" x2="9" y2="9"/></g><line x1="0" y1="9" x2="9" y2="0"/>`,
    );
    const [inner] = order(lone);
    const next = move(lone, [inner], "front");
    expect(read(next).querySelectorAll("g:empty")).toHaveLength(0);
  });
});

describe("따라가는 면 — 사용자가 고른 차례가 이긴다", () => {
  // 채우기 통으로 만든 면은 선 뒤에 들어간다(만들 때의 자리). 그 뒤의 차례는 사용자가 정한다.
  const tied = figure(
    `<path d="M 0 0 L 100 0 L 100 100 Z" fill="#d9d9d9" stroke="none" data-face="e-1" data-face-seed="50 20"/>` +
      `<polyline id="e-1" points="0,0 100,0 100,100 0,0" stroke="#111" fill="none"/>`,
  );
  const [face, edge] = order(tied);
  it("선을 맨 뒤로 보내면 면 아래로 간다 — 되돌리기로 돌아온다", () => {
    const next = move(tied, [edge], "back");
    expect(order(next)).toEqual([edge, face]);
  });
  it("차례를 바꿔도 면은 여전히 그 선을 따라간다", () => {
    const next = move(tied, [face], "front");
    expect(node(next, face).getAttribute("data-face")).toBe("e-1");
    expect(node(next, edge).getAttribute("id")).toBe("e-1");
    // 선을 따라 다시 잰 면 모양이 차례를 바꾸기 전과 같다
    const traced = (svg: string) =>
      node(syncFigureFaces(svg).svg, face).getAttribute("d");
    expect(traced(next)).toBe(traced(tied));
  });
});

describe("단추를 끌 때 — 이미 맨 앞·맨 뒤", () => {
  const objects = figureObjects(parabola);
  it("맨 위 요소는 앞으로·맨 앞으로가 꺼진다", () => {
    expect(orderBlock(objects, [triangle], "front")).toBe(ORDER_BLOCKED.front);
    expect(orderBlock(objects, [triangle], "forward")).toBe(
      ORDER_BLOCKED.front,
    );
    expect(orderBlock(objects, [triangle], "back")).toBeNull();
  });
  it("맨 아래 요소는 뒤로·맨 뒤로가 꺼진다", () => {
    expect(orderBlock(objects, [curve], "back")).toBe(ORDER_BLOCKED.back);
    expect(orderBlock(objects, [curve], "backward")).toBe(ORDER_BLOCKED.back);
    expect(orderBlock(objects, [curve], "front")).toBeNull();
  });
  it("고른 것들이 맨 위에 붙어 있으면 맨 앞이다", () => {
    expect(orderBlock(objects, [yAxis, triangle], "front")).toBe(
      ORDER_BLOCKED.front,
    );
    expect(orderBlock(objects, [xAxis, triangle], "front")).toBeNull();
  });
  it("아무것도 안 골랐으면 끈다", () => {
    expect(orderBlock(objects, [], "front")).not.toBeNull();
  });
});
