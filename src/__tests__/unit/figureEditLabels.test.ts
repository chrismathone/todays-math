import { describe, expect, it } from "vitest";
import {
  figureObjects,
  prepareFigureSvg,
  readFigureSvg,
} from "@/components/unified/figure-editor/figureSvgEditing";
import {
  describeFigureForEdit,
  figurePointNames,
} from "@/components/unified/figure-editor/figureEditElements";
import { applyFigureEdits } from "@/components/unified/figure-editor/figureEditApply";
import { groupFigureObjects } from "@/components/unified/figure-editor/figureObjectGroups";

/**
 * «요청대로 고치기» 글자 명령(원장님 2026-09-20 «아직 없는 명령 전부») — 각의 크기 글자 · 점 이름.
 * 정답은 **도형 엔진 v2 가 실제로 그린 SVG**(`scripts/figure/render_spec.py`)다. 엔진이 글자까지 그린 그림에서 그 글자만
 * 뺀 같은 그림에 AI 명령으로 되그려, 새 글자가 엔진의 글자와 **같은 자리·같은 서식**인지 본다.
 */
const NS = "http://www.w3.org/2000/svg";
const FONT =
  'font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111"';
const svg = (viewBox: string, ...groups: string[]) =>
  `<svg viewBox="${viewBox}" xmlns="${NS}">${groups.map((g) => `<g>${g}</g>`).join("")}</svg>`;
const label = (name: string, x: number, y: number, px: number, py: number) =>
  `<text x="${x}" y="${y}" ${FONT} data-px="${px}" data-py="${py}" data-mj="${name}"><tspan font-style="normal">${name}</tspan></text>`;
/** 엔진 각 라벨 — 흰 테두리(paint-order="stroke")를 두르고 제 점은 안 적는다. */
const sizeLabel = (text: string, x: number, y: number) =>
  `<text x="${x}" y="${y}" ${FONT} font-style="italic" paint-order="stroke" stroke="#ffffff" stroke-width="3.15" stroke-linejoin="round" data-mj="${text}"><tspan font-style="normal">${text}</tspan></text>`;
const line = (x1: number, y1: number, x2: number, y2: number) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#111111" stroke-width="1.9"/>`;
const arc = (d: string) =>
  `<path d="${d}" fill="none" stroke="#111111" stroke-width="0.72"/>`;

// ── 엔진 그림 ────────────────────────────────────────────────────────────
// 삼각형 A(100,0) B(0,160) C(200,160) · 각 B 의 호(반지름 22) — 엔진은 «40°» 를 (63.481, 179.511) 에 놓는다
const TRI_SIDES =
  line(134.95, 29.948, 34.95, 189.948) +
  line(134.95, 29.948, 234.95, 189.948) +
  line(34.95, 189.948, 234.95, 189.948);
const TRI_LABELS =
  label("A", 134.95, 24.6, 134.95, 29.948) +
  label("B", 24.226, 195.324, 34.95, 189.948) +
  label("C", 245.674, 195.324, 234.95, 189.948);
const B_ARC = arc("M 46.6 171.3 A 22.0 22.0 0 0 1 57.0 189.9");
const TRI_VIEW = "0 0 263.277 224.898";
const TRI_ARC = svg(TRI_VIEW, TRI_SIDES, B_ARC, TRI_LABELS);
const TRI_ANGLE = svg(
  TRI_VIEW,
  TRI_SIDES,
  B_ARC,
  sizeLabel("40°", 63.481, 179.511) + TRI_LABELS,
);
// 같은 삼각형을 각 표시 없이 그린 엔진 그림(틀이 도형에 꼭 맞아 자리가 6.623 다르다)
const TRI_PLAIN = svg(
  "0 0 256.654 207.324",
  line(128.327, 29.948, 28.327, 189.948) +
    line(128.327, 29.948, 228.327, 189.948) +
    line(28.327, 189.948, 228.327, 189.948),
  label("A", 128.327, 24.6, 128.327, 29.948) +
    label("B", 17.603, 195.324, 28.327, 189.948) +
    label("C", 239.051, 195.324, 228.327, 189.948),
);

// 좁은 각(∠A = 8.53°) — 엔진은 «25°» 를 밖으로 끌어내고 호에서 지시선을 긋는다
const THIN_ARC = svg(
  "0 0 303.277 95.909",
  line(34.95, 34.95, 274.95, 34.95) +
    line(274.95, 34.95, 274.95, 70.95) +
    line(274.95, 70.95, 34.95, 34.95),
  arc("M 57.0 35.0 A 22.0 22.0 0 0 1 56.7 38.2"),
  label("A", 24.226, 40.326, 34.95, 34.95) +
    label("B", 285.674, 40.326, 274.95, 34.95) +
    label("C", 282.533, 83.909, 274.95, 70.95),
);

// 사각형 A(0,0) B(120,0) C(140,90) D(20,90) — 엔진은 D 의 이름을 (41.206, 129.766) 에 놓고 틀을 141.766 까지 넓힌다
const QUAD_SIDES =
  line(28.789, 26.807, 148.789, 26.807) +
  line(148.789, 26.807, 168.789, 116.807) +
  line(168.789, 116.807, 48.789, 116.807) +
  line(48.789, 116.807, 28.789, 26.807);
const QUAD_ABC = svg(
  "0 0 197.116 134.183",
  QUAD_SIDES,
  label("A", 18.065, 32.183, 28.789, 26.807) +
    label("B", 156.372, 24.6, 148.789, 26.807) +
    label("C", 179.513, 122.183, 168.789, 116.807),
);
const D_POINT = { x: 48.789, y: 116.807 };

// ── 헬퍼 ────────────────────────────────────────────────────────────────
const prepared = (source: string) => prepareFigureSvg(source);
/** 명령이 새로 만든 요소만. */
const added = (before: string, after: string) => {
  const ids = new Set(figureObjects(before).map((o) => o.id));
  return figureObjects(after).filter((o) => !ids.has(o.id));
};
const num = (value: string | undefined) => Number(value);
const viewBoxOf = (source: string) =>
  readFigureSvg(source)
    .documentElement.getAttribute("viewBox")!
    .split(/\s+/)
    .map(Number);
const numbers = (d: string) =>
  (d.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)/g) ?? []).map(Number);
const expectClose = (actual: number[], expected: number[], digits = 2) => {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((value, i) =>
    expect(value, `${i}번째 값`).toBeCloseTo(expected[i], digits),
  );
};
/** 요소 id → 묶음 이름(편집기 요소 목록). */
const groupNames = (source: string) =>
  new Map(
    groupFigureObjects(figureObjects(source), viewBoxOf(source)).flatMap(
      (group) => group.ids.map((id) => [id, group.name] as const),
    ),
  );
const kindOf = (source: string, id: string) => {
  const index = figureObjects(source).findIndex((o) => o.id === id);
  return describeFigureForEdit(source).elements[index].kind;
};

describe("각의 크기 글자(addAngle.text) — 엔진 `_angle_label_layout` 과 같은 자리", () => {
  it("writes 40° where the engine puts it, on an angle that already has the arc", () => {
    const source = prepared(TRI_ARC);
    const result = applyFigureEdits(source, [
      { op: "addAngle", at: "B", from: "A", to: "C", text: "40°" },
    ]);
    expect(result.rejected).toEqual([]);
    expect(result.applied).toEqual(["각 ABC 에 40° 표시 추가"]);
    const news = added(source, result.svg);
    // 표시는 이미 있으니 글자 하나만 는다
    expect(news.map((o) => o.type)).toEqual(["text"]);
    expectClose(
      [num(news[0].attrs.x), num(news[0].attrs.y)],
      [63.481, 179.511],
    );
    expect(news[0].attrs["data-mj"]).toBe("40°");
    expect(news[0].attrs["font-size"]).toBe("16.8");
    expect(news[0].attrs["text-anchor"]).toBe("middle");
    // 흰 테두리 — 엔진 각 라벨과 같은 paint-order
    expect(news[0].attrs["paint-order"]).toBe("stroke");
    expect(news[0].attrs.stroke).toBe("#ffffff");
    expect(news[0].attrs["stroke-width"]).toBe("3.15");
    // 글자는 똑바로(원장님 항목 22) — 돌리는 transform 이 없다
    expect(news[0].attrs.transform).toBeUndefined();
    // 틀 안이라 그대로
    expect(viewBoxOf(result.svg)).toEqual(viewBoxOf(source));
  });

  it("matches the engine's own drawing of the same figure", () => {
    const result = applyFigureEdits(prepared(TRI_ARC), [
      { op: "addAngle", at: "B", from: "A", to: "C", text: "40°" },
    ]);
    const mine = figureObjects(result.svg).find(
      (o) => o.attrs["data-mj"] === "40°",
    )!;
    const theirs = figureObjects(prepared(TRI_ANGLE)).find(
      (o) => o.attrs["data-mj"] === "40°",
    )!;
    expectClose(
      [num(mine.attrs.x), num(mine.attrs.y)],
      [num(theirs.attrs.x), num(theirs.attrs.y)],
      2,
    );
    expect(mine.attrs["font-size"]).toBe(theirs.attrs["font-size"]);
    expect(mine.attrs["stroke-width"]).toBe(theirs.attrs["stroke-width"]);
  });

  it("draws the arc and the size together when the angle has no mark yet", () => {
    const source = prepared(TRI_PLAIN);
    const result = applyFigureEdits(source, [
      { op: "addAngle", at: "B", from: "A", to: "C", text: "40°" },
    ]);
    expect(result.rejected).toEqual([]);
    expect(result.applied).toEqual(["각 ABC 에 40° 표시 추가(예각)"]);
    const news = added(source, result.svg);
    expect(news.map((o) => o.type)).toEqual(["path", "text"]);
    // 이 그림은 틀이 6.623 왼쪽으로 옮겨져 있다 — 꼭짓점에서 잰 자리는 엔진과 같다
    expectClose(
      [num(news[1].attrs.x) - 28.327, num(news[1].attrs.y) - 189.948],
      [63.481 - 34.95, 179.511 - 189.948],
    );
  });

  it("pulls a narrow angle's size outside and draws the engine's leader", () => {
    const source = prepared(THIN_ARC);
    const result = applyFigureEdits(source, [
      { op: "addAngle", at: "A", from: "B", to: "C", text: "25°" },
    ]);
    expect(result.rejected).toEqual([]);
    expect(result.applied).toEqual(["각 BAC 에 25° 표시 추가(지시선)"]);
    const news = added(source, result.svg);
    expect(news.map((o) => o.type).sort()).toEqual(["path", "text"]);
    const text = news.find((o) => o.type === "text")!;
    const leader = news.find((o) => o.type === "path")!;
    expectClose([num(text.attrs.x), num(text.attrs.y)], [67.931, 66.589]);
    // 엔진: M 56.889 36.586 Q 57.555 45.334 63.643 51.651 (호에서 시작해 글자 앞에서 끊기고 살짝 휜다)
    expectClose(
      numbers(leader.attrs.d),
      [56.889, 36.586, 57.555, 45.334, 63.643, 51.651],
      2,
    );
    expect(leader.attrs["stroke-width"]).toBe("0.72");
    expect(leader.attrs["stroke-linecap"]).toBe("round");
    expect(leader.attrs.fill).toBeUndefined();
  });

  it("keeps the size clear of a dimension curve that is already drawn", () => {
    // 엔진은 각 라벨을 치수보다 **먼저** 놓아 점선을 못 본다 — 우리는 이미 그려진 것 위에 얹지 않는다
    const crossing =
      '<path d="M 54 178 Q 62 177.5 72 178" fill="none" stroke="#111111" stroke-width="0.72" stroke-dasharray="5 3"/>';
    const source = prepared(
      svg(TRI_VIEW, TRI_SIDES, B_ARC + crossing, TRI_LABELS),
    );
    const result = applyFigureEdits(source, [
      { op: "addAngle", at: "B", from: "A", to: "C", text: "40°" },
    ]);
    expect(result.rejected).toEqual([]);
    const text = added(source, result.svg)[0];
    // 사다리를 두 칸 더 올라간다 — 흰 테두리 반폭(2.075)까지 넓힌 상자가 점선에 닿지 않는 첫 칸(17.5 + 4×7.56)
    expectClose([num(text.attrs.x), num(text.attrs.y)], [76.705, 172.181]);
  });

  it("refuses a second size on the same angle", () => {
    const source = prepared(TRI_ANGLE);
    const result = applyFigureEdits(source, [
      { op: "addAngle", at: "B", from: "A", to: "C", text: "50°" },
    ]);
    expect(result.applied).toEqual([]);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]).toContain("이미 각의 크기 글자가 있습니다");
    expect(result.rejected[0]).toContain("글자 40°");
    expect(result.svg).toBe(source);
  });

  it("still refuses a second mark when no size is asked for", () => {
    const result = applyFigureEdits(prepared(TRI_ARC), [
      { op: "addAngle", at: "B", from: "A", to: "C" },
    ]);
    expect(result.applied).toEqual([]);
    expect(result.rejected[0]).toContain("이미 각 표시가 있습니다");
  });

  it("keeps the track 18 refusals for a straight or folded angle", () => {
    const result = applyFigureEdits(prepared(TRI_ARC), [
      {
        op: "addAngle",
        at: { x: 134.95, y: 109.948 },
        from: { x: 134.95, y: 29.948 },
        to: { x: 134.95, y: 189.948 },
        text: "40°",
      },
      { op: "addAngle", at: "B", from: "A", to: "A", text: "40°" },
      { op: "addAngle", at: "Z", from: "A", to: "C", text: "40°" },
    ]);
    expect(result.applied).toEqual([]);
    expect(result.rejected[0]).toContain("한 직선");
    expect(result.rejected[1]).toContain("겹쳐");
    expect(result.rejected[2]).toContain("점 이름 Z");
    expect(result.svg).toBe(prepared(TRI_ARC));
  });

  it("reads as a text element in the 글자 group, like a hand-typed label", () => {
    const source = prepared(TRI_ARC);
    const result = applyFigureEdits(source, [
      { op: "addAngle", at: "B", from: "A", to: "C", text: "40°" },
    ]);
    const id = added(source, result.svg)[0].id;
    expect(kindOf(result.svg, id)).toBe("글자");
    expect(groupNames(result.svg).get(id)).toBe("글자");
  });
});

describe("점 이름(addLabel) — 엔진 꼭짓점 라벨 규칙", () => {
  it("names D exactly where the engine draws it, and widens the frame", () => {
    const source = prepared(QUAD_ABC);
    const result = applyFigureEdits(source, [
      { op: "addLabel", at: D_POINT, text: "D" },
    ]);
    expect(result.rejected).toEqual([]);
    expect(result.applied).toEqual(["점 이름 D 추가"]);
    const news = added(source, result.svg);
    expect(news.map((o) => o.type)).toEqual(["text"]);
    expectClose(
      [num(news[0].attrs.x), num(news[0].attrs.y)],
      [41.206, 129.766],
    );
    expect(news[0].attrs["font-size"]).toBe("16.8");
    expect(news[0].attrs["text-anchor"]).toBe("middle");
    // 흰 테두리는 각 라벨만 — 꼭짓점 이름에는 없다(엔진과 같다)
    expect(news[0].attrs["paint-order"]).toBeUndefined();
    // 틀 안에 드는 글자는 틀을 안 건드린다(엔진은 캔버스를 141.766 까지 잡지만 그것은 여백 12 를 다시 두기 때문이다)
    expect(viewBoxOf(result.svg)).toEqual(viewBoxOf(source));
  });

  it("widens the frame when the name would fall outside it", () => {
    // 틀이 선에 꼭 맞는 그림 — B 의 이름은 오른쪽 밖으로 나간다
    const tight = prepared(
      svg(
        "0 0 190 24",
        line(20, 12, 180, 12),
        label("A", 9.276, 17.376, 20, 12),
      ),
    );
    const result = applyFigureEdits(tight, [
      { op: "addLabel", at: { x: 180, y: 12 }, text: "B" },
    ]);
    expect(result.rejected).toEqual([]);
    const news = added(tight, result.svg)[0];
    expectClose([num(news.attrs.x), num(news.attrs.y)], [190.724, 17.376]);
    // 넘친 쪽만, 엔진 여백 12 를 두고 — 위아래는 그대로
    expectClose(viewBoxOf(result.svg), [0, 0, 208.324, 24], 2);
  });

  it("writes its own point so the next request can call it by name", () => {
    const source = prepared(QUAD_ABC);
    const result = applyFigureEdits(source, [
      { op: "addLabel", at: D_POINT, text: "D" },
    ]);
    const news = added(source, result.svg)[0];
    expectClose(
      [num(news.attrs["data-px"]), num(news.attrs["data-py"])],
      [D_POINT.x, D_POINT.y],
      3,
    );
    const names = figurePointNames(result.svg).find((n) => n.name === "D");
    expect(names).toBeDefined();
    expectClose([names!.x, names!.y], [D_POINT.x, D_POINT.y], 3);
    expect(describeFigureForEdit(result.svg).names).toContainEqual({
      name: "D",
      x: 48.8,
      y: 116.8,
    });
  });

  it("lets a later command in the same request use the new name", () => {
    const source = prepared(QUAD_ABC);
    const result = applyFigureEdits(source, [
      { op: "addLabel", at: D_POINT, text: "D" },
      { op: "addTick", from: "A", to: "D" },
    ]);
    expect(result.rejected).toEqual([]);
    expect(result.applied).toEqual([
      "점 이름 D 추가",
      "선분 AD 같은 길이 표시 추가",
    ]);
  });

  it("pins the side when position is given", () => {
    const source = prepared(QUAD_ABC);
    const result = applyFigureEdits(source, [
      { op: "addLabel", at: D_POINT, text: "D", position: "S" },
    ]);
    expect(result.rejected).toEqual([]);
    const news = added(source, result.svg)[0];
    // 7.7 + 0.18×16.8 = 10.724 아래, 밑선은 거기서 0.32×16.8
    expectClose(
      [num(news.attrs.x), num(news.attrs.y)],
      [48.789, 116.807 + 10.724 + 5.376],
    );
  });

  it("snaps to the drawn vertex when the model rounds the coordinates", () => {
    const source = prepared(QUAD_ABC);
    const result = applyFigureEdits(source, [
      { op: "addLabel", at: { x: 48.8, y: 116.8 }, text: "D" },
    ]);
    const news = added(source, result.svg)[0];
    expectClose(
      [num(news.attrs["data-px"]), num(news.attrs["data-py"])],
      [D_POINT.x, D_POINT.y],
      3,
    );
  });

  it("follows the figure's own label size", () => {
    const big = prepared(
      svg(
        "0 0 400 280",
        line(40, 40, 240, 40) + line(40, 40, 40, 200),
        `<text x="26" y="34" font-family="Times New Roman, serif" font-size="24" text-anchor="middle" fill="#111111" data-px="40" data-py="40" data-mj="A"><tspan>A</tspan></text>`,
      ),
    );
    const result = applyFigureEdits(big, [
      { op: "addLabel", at: { x: 240, y: 40 }, text: "B" },
    ]);
    const news = added(big, result.svg)[0];
    expect(news.attrs["font-size"]).toBe("24");
    expect(news.attrs["font-family"]).toBe("Times New Roman, serif");
    // 거리도 같은 비율로 — 7.7 × (24 ÷ 16.8) + 0.18 × 24 = 15.32
    expectClose(
      [Math.hypot(num(news.attrs.x) - 240, num(news.attrs.y) - 40 - 0.32 * 24)],
      [15.32],
      2,
    );
  });

  it("refuses a point that already has a name, and a name already in the figure", () => {
    const source = prepared(QUAD_ABC);
    const result = applyFigureEdits(source, [
      { op: "addLabel", at: { x: 28.789, y: 26.807 }, text: "D" },
      { op: "addLabel", at: D_POINT, text: "A" },
      { op: "addLabel", at: "Z", text: "D" },
    ]);
    expect(result.applied).toEqual([]);
    expect(result.rejected[0]).toContain("이미 점 이름이 있습니다");
    expect(result.rejected[0]).toContain("글자 A");
    expect(result.rejected[1]).toContain("이미 그림에 있는 이름입니다");
    expect(result.rejected[2]).toContain("점 이름 Z");
    expect(result.svg).toBe(source);
  });

  it("reads as a text element in the 글자 group", () => {
    const source = prepared(QUAD_ABC);
    const result = applyFigureEdits(source, [
      { op: "addLabel", at: D_POINT, text: "D" },
    ]);
    const id = added(source, result.svg)[0].id;
    expect(kindOf(result.svg, id)).toBe("글자");
    expect(groupNames(result.svg).get(id)).toBe("글자");
  });

  it("steps away from the lines instead of sitting on them", () => {
    // D 바로 아래(S)는 비어 있고, 바깥 차례의 첫 칸(SW)도 비어 있다 — 안쪽(NE)을 고르면 두 변을 밟는다
    const source = prepared(QUAD_ABC);
    const result = applyFigureEdits(source, [
      { op: "addLabel", at: D_POINT, text: "D" },
    ]);
    const news = added(source, result.svg)[0];
    const x = num(news.attrs.x),
      y = num(news.attrs.y) - 0.32 * 16.8;
    // 사각형 안쪽이 아니라 바깥(왼쪽 아래)
    expect(x).toBeLessThan(D_POINT.x);
    expect(y).toBeGreaterThan(D_POINT.y);
  });
});
