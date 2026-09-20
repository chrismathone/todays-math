import { describe, expect, it } from "vitest";
import {
  addFigureObject,
  editFigureObject,
  figureObjects,
  prepareFigureSvg,
  readFigureSvg,
} from "@/components/unified/figure-editor/figureSvgEditing";
import { applyFigureEdits } from "@/components/unified/figure-editor/figureEditApply";
import {
  figureAngleKinds,
  groupFigureObjects,
} from "@/components/unified/figure-editor/figureObjectGroups";
import { objectName } from "@/components/unified/figure-editor/figureObjectNames";
import { describeFigureForEdit } from "@/components/unified/figure-editor/figureEditElements";

/**
 * «요청대로 고치기» 동작 더하기 ④ — 직선·원(원장님 2026-09-20 «아직 없는 명령을 전부»).
 * 연장 · 평행선 · 수직이등분선 · 각의 이등분선 · 접선 · 외접원 · 내접원 · 원의 교점 · 호의 중점.
 *
 * - 좌표는 **점 이름으로 받고 코드가 계산한다** — 모델이 지은 외심·내심·접점을 믿지 않는다.
 *   그래서 외심·내심·접점·교점은 여기서 **다른 식으로 다시 풀어** 대조한다(같은 식을 두 번 쓰면 검산이 아니다).
 * - 새 요소는 편집기 도구가 짓는 것과 같은 모양이어야 한다 — 요소 이름·묶음·오른쪽 칸 제목이 손으로 그린 것과 같게.
 * - 그림은 도형 엔진 v2 가 실제로 그린 것(`scripts/figure/render_spec.py`, 2026-09-20).
 * - 검산의 허용 오차가 0.001 언저리인 것은 **새 좌표를 엔진처럼 소수 셋째 자리로 적기 때문**이다
 *   (figure_scene.py `_fmt`). 그보다 촘촘히 잠그면 반올림만으로 빨개진다.
 */
const NS = "http://www.w3.org/2000/svg";
const F =
  'font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111"';
const label = (name: string, x: number, y: number, px: number, py: number) =>
  `<text x="${x}" y="${y}" ${F} data-px="${px}" data-py="${py}" data-mj="${name}"><tspan font-style="normal">${name}</tspan></text>`;
const line = (x1: number, y1: number, x2: number, y2: number) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#111111" stroke-width="1.9" />`;

// 예각삼각형 ABC — A(78.327, 26.807) B(28.327, 176.807) C(258.327, 176.807)
const tri = prepareFigureSvg(`<svg viewBox="0 0 286.654 194.183" xmlns="${NS}">
  <rect width="286.654" height="194.183" fill="#ffffff" />
  <g>${line(78.327, 26.807, 28.327, 176.807)}${line(28.327, 176.807, 258.327, 176.807)}${line(258.327, 176.807, 78.327, 26.807)}</g>
  <g></g>
  <g>${label("A", 70.744, 24.6, 78.327, 26.807)}${label("B", 17.603, 182.183, 28.327, 176.807)}${label("C", 269.051, 182.183, 258.327, 176.807)}</g>
</svg>`);
// 원 O(반지름 70)와 원 위의 점 A(20°) · 원 밖의 점 P — 반지름은 그려져 있지 않다
const circleP =
  prepareFigureSvg(`<svg viewBox="0 0 230.158 165.9" xmlns="${NS}">
  <rect width="230.158" height="165.9" fill="#ffffff" />
  <g><circle cx="82.95" cy="82.95" r="70" fill="none" stroke="#111111" stroke-width="1.9" /></g>
  <g></g>
  <g>${label("A", 158.806, 60.717, 148.728, 59.009)}${label("O", 82.95, 77.602, 82.95, 82.95)}${label("P", 212.95, 37.602, 212.95, 42.95)}</g>
</svg>`);
// 만나는 두 원 — O(반지름 60) · P(반지름 50), 중심 거리 80
const twoCircles =
  prepareFigureSvg(`<svg viewBox="0 0 215.9 145.9" xmlns="${NS}">
  <rect width="215.9" height="145.9" fill="#ffffff" />
  <g>
    <circle cx="72.95" cy="72.95" r="60" fill="none" stroke="#111111" stroke-width="1.9" />
    <circle cx="152.95" cy="72.95" r="50" fill="none" stroke="#111111" stroke-width="1.9" />
  </g>
  <g></g>
  <g>${label("O", 72.95, 67.602, 72.95, 72.95)}${label("P", 152.95, 67.602, 152.95, 72.95)}</g>
</svg>`);
// 원 O(반지름 70)와 반지름 OA(20°)·OB(120°) — 부채꼴 호의 기준
const sector =
  prepareFigureSvg(`<svg viewBox="0 0 176.871 172.083" xmlns="${NS}">
  <rect width="176.871" height="172.083" fill="#ffffff" />
  <g>
    <circle cx="82.95" cy="89.133" r="70" fill="none" stroke="#111111" stroke-width="1.9" />
    ${line(82.95, 89.133, 148.728, 65.192)}${line(82.95, 89.133, 47.95, 28.511)}
  </g>
  <g></g>
  <g>${label("A", 158.806, 66.9, 148.728, 65.192)}${label("B", 42.588, 24.6, 47.95, 28.511)}${label("O", 75.367, 102.092, 82.95, 89.133)}</g>
</svg>`);

// 끝이 틀 가장자리에 붙은 외딴 선분 — 연장할 자리가 없는 경우
const edgeLine = prepareFigureSvg(`<svg viewBox="0 0 100 100" xmlns="${NS}">
  <rect width="100" height="100" fill="#ffffff" />
  <g>${line(10, 50, 97, 50)}</g>
</svg>`);

type XY = { x: number; y: number };
const ids = (svg: string) => figureObjects(svg).map((o) => o.id);
const added = (before: string, after: string) => {
  const old = new Set(ids(before));
  return figureObjects(after).filter((o) => !old.has(o.id));
};
const viewBoxOf = (svg: string) =>
  readFigureSvg(svg)
    .documentElement.getAttribute("viewBox")!
    .split(/\s+/)
    .map(Number);
/** 편집기 요소 목록의 이름(각 표시는 직각·예각·둔각) — 요소 목록·오른쪽 칸 제목·AI 요소 목록이 같이 쓴다. */
const nameIn = (svg: string, id: string) => {
  const objects = figureObjects(svg);
  return objectName(
    objects.find((o) => o.id === id)!,
    figureAngleKinds(objects, viewBoxOf(svg)),
  );
};
const groupOf = (svg: string, id: string) =>
  groupFigureObjects(figureObjects(svg), viewBoxOf(svg)).find((g) =>
    g.ids.includes(id),
  )?.name;
const ends = (o: { attrs: Record<string, string> }) => ({
  a: { x: Number(o.attrs.x1), y: Number(o.attrs.y1) },
  b: { x: Number(o.attrs.x2), y: Number(o.attrs.y2) },
});
const dot = (p: XY, q: XY) => p.x * q.x + p.y * q.y;
const sub = (p: XY, q: XY): XY => ({ x: p.x - q.x, y: p.y - q.y });
const len = (p: XY, q: XY) => Math.hypot(p.x - q.x, p.y - q.y);
const dotAt = (svg: string, at: XY) =>
  figureObjects(svg).find(
    (o) =>
      o.type === "circle" &&
      o.attrs.fill === "#111111" &&
      Math.hypot(Number(o.attrs.cx) - at.x, Number(o.attrs.cy) - at.y) < 0.01,
  );
const A = { x: 78.327, y: 26.807 },
  B = { x: 28.327, y: 176.807 },
  C = { x: 258.327, y: 176.807 };

describe("선분 연장 — 그림에 그려진 선분의 서식 그대로 잇는다", () => {
  it("extends BC past C and keeps it inside the frame when no length is given", () => {
    const result = applyFigureEdits(tri, [
      { op: "extendLine", from: "B", to: "C" },
    ]);
    const [grown] = added(tri, result.svg);
    // 기본은 그 선분 길이의 1/3(76.667) — 틀 안 여백 6 까지만 늘린다
    expect(ends(grown)).toEqual({
      a: { x: 258.327, y: 176.807 },
      b: { x: 280.654, y: 176.807 },
    });
    expect(result.applied).toEqual(["선분 BC 를 C 쪽으로 연장(길이 22.3)"]);
    expect(result.rejected).toEqual([]);
    // 틀은 그대로 — 기본 길이는 틀 안에서 정한다
    expect(viewBoxOf(result.svg)).toEqual([0, 0, 286.654, 194.183]);
  });

  it("copies the stroke of the segment it extends, so the joint does not show a step", () => {
    const [grown] = added(
      tri,
      applyFigureEdits(tri, [{ op: "extendLine", from: "B", to: "C" }]).svg,
    );
    expect(grown.attrs["stroke-width"]).toBe("1.9");
    expect(grown.attrs.stroke).toBe("#111111");
    expect(grown.attrs["stroke-dasharray"]).toBeUndefined();
    expect(nameIn(tri, ids(tri)[0])).toBe("선분");
  });

  it("draws the asked length and widens the frame when it leaves it", () => {
    const result = applyFigureEdits(tri, [
      { op: "extendLine", from: "B", to: "C", length: 40 },
    ]);
    const [grown] = added(tri, result.svg);
    expect(ends(grown).b).toEqual({ x: 298.327, y: 176.807 });
    expect(result.applied).toEqual(["선분 BC 를 C 쪽으로 연장(길이 40)"]);
    expect(viewBoxOf(result.svg)[2]).toBeGreaterThan(286.654);
    expect(viewBoxOf(result.svg)[3]).toBe(194.183);
  });

  it("stops at a point named earlier in the same request", () => {
    const result = applyFigureEdits(tri, [
      { op: "addPoint", x: 300, y: 176.807, label: "D" },
      { op: "extendLine", from: "B", to: "C", until: "D" },
    ]);
    const grown = added(tri, result.svg).find((o) => o.type === "line")!;
    expect(ends(grown).b).toEqual({ x: 300, y: 176.807 });
    expect(result.rejected).toEqual([]);
  });

  it("stops where the extension meets the given line", () => {
    const result = applyFigureEdits(tri, [
      {
        op: "extendLine",
        from: "B",
        to: "C",
        until: [
          { x: 278, y: 0 },
          { x: 278, y: 100 },
        ],
      },
    ]);
    const grown = added(tri, result.svg).find((o) => o.type === "line")!;
    expect(ends(grown).b).toEqual({ x: 278, y: 176.807 });
  });

  it("makes the extension dashed when asked", () => {
    const [grown] = added(
      tri,
      applyFigureEdits(tri, [
        { op: "extendLine", from: "B", to: "C", dashed: true },
      ]).svg,
    );
    expect(grown.attrs["stroke-dasharray"]).toBe("5 4");
  });

  it.each([
    [
      "그림에 없는 선분",
      {
        op: "extendLine",
        from: { x: 100, y: 60 },
        to: { x: 150, y: 70 },
      },
      "그림에 없는 선분입니다",
    ],
    [
      "두 점이 같음",
      { op: "extendLine", from: "C", to: "C" },
      "두 점이 같습니다",
    ],
    [
      "until 이 연장선 위가 아님",
      { op: "extendLine", from: "B", to: "C", until: "A" },
      "점 A 가 연장선 위에 있지 않습니다",
    ],
    [
      "until 이 연장 쪽이 아님",
      { op: "extendLine", from: "C", to: "B", until: { x: 300, y: 176.807 } },
      "연장 쪽에서 만나지 않습니다",
    ],
    [
      "until 직선이 연장선과 평행",
      {
        op: "extendLine",
        from: "B",
        to: "C",
        until: [
          { x: 0, y: 40 },
          { x: 100, y: 40 },
        ],
      },
      "연장선과 평행합니다",
    ],
  ])("rejects %s", (_name, command, reason) => {
    const result = applyFigureEdits(tri, [command]);
    expect(result.svg).toBe(tri);
    expect(result.applied).toEqual([]);
    expect(result.rejected).toEqual([expect.stringContaining(reason)]);
  });

  it("refuses when there is no room left inside the frame", () => {
    // 끝이 틀 가장자리에 붙은 선분 — 기본 길이의 1/5 도 안 남으면 늘리지 않는다
    const result = applyFigureEdits(edgeLine, [
      {
        op: "extendLine",
        from: { x: 10, y: 50 },
        to: { x: 97, y: 50 },
      },
    ]);
    expect(result.applied).toEqual([]);
    expect(result.rejected).toEqual([
      expect.stringContaining("그림 틀 안에 연장할 자리가 없습니다"),
    ]);
  });
});

describe("평행선 — 기준 선분을 그대로 평행이동", () => {
  it("moves BC up to pass through A", () => {
    const result = applyFigureEdits(tri, [
      { op: "addParallel", through: "A", to: ["B", "C"] },
    ]);
    const [parallel] = added(tri, result.svg);
    const { a, b } = ends(parallel);
    expect(a).toEqual({ x: 28.327, y: 26.807 });
    expect(b).toEqual({ x: 258.327, y: 26.807 });
    // 검산 — 기준과 평행하고 길이가 같으며 A 를 지난다
    expect(len(a, b)).toBeCloseTo(len(B, C), 6);
    expect(
      Math.abs((b.x - a.x) * (C.y - B.y) - (b.y - a.y) * (C.x - B.x)),
    ).toBeLessThan(1e-6);
    expect(
      Math.abs((A.x - a.x) * (b.y - a.y) - (A.y - a.y) * (b.x - a.x)),
    ).toBeLessThan(1e-6);
    expect(result.applied).toEqual(["A 를 지나 BC 에 평행한 직선 추가"]);
    expect(nameIn(result.svg, parallel.id)).toBe("선분");
    expect(groupOf(result.svg, parallel.id)).toBe("선분");
  });

  it("centres the asked length on the point", () => {
    const [parallel] = added(
      tri,
      applyFigureEdits(tri, [
        { op: "addParallel", through: "A", to: ["B", "C"], length: 120 },
      ]).svg,
    );
    expect(ends(parallel)).toEqual({
      a: { x: 18.327, y: 26.807 },
      b: { x: 138.327, y: 26.807 },
    });
  });

  it.each([
    [
      "지나는 점이 그 직선 위",
      { op: "addParallel", through: "B", to: ["B", "C"] },
      "그 점이 직선 위에 있습니다",
    ],
    [
      "기준 두 점이 같음",
      { op: "addParallel", through: "A", to: ["B", "B"] },
      "직선의 두 점이 같습니다",
    ],
    [
      "이름 못 찾음",
      { op: "addParallel", through: "Z", to: ["B", "C"] },
      "점 이름 Z",
    ],
  ])("rejects %s", (_name, command, reason) => {
    const result = applyFigureEdits(tri, [command]);
    expect(result.svg).toBe(tri);
    expect(result.rejected).toEqual([expect.stringContaining(reason)]);
  });
});

describe("수직이등분선 — 중점에서 직각으로", () => {
  it("crosses BC at its midpoint with a right-angle mark", () => {
    const result = applyFigureEdits(tri, [
      { op: "addPerpendicularBisector", from: "B", to: "C", label: "M" },
    ]);
    const bisector = added(tri, result.svg).find((o) => o.type === "line")!;
    const { a, b } = ends(bisector);
    // 위로는 반(115), 아래로는 틀 여백 6 까지(11.376)
    expect(a).toEqual({ x: 143.327, y: 61.807 });
    expect(b).toEqual({ x: 143.327, y: 188.183 });
    // 검산 — 두 끝이 B·C 에서 같은 거리이고 BC 와 직각이다
    for (const p of [a, b]) expect(len(p, B)).toBeCloseTo(len(p, C), 6);
    expect(dot(sub(b, a), sub(C, B))).toBeCloseTo(0, 6);
    expect(result.applied).toEqual(["BC 의 수직이등분선 추가(중점 M)"]);
    // 중점에 점과 이름
    expect(dotAt(result.svg, { x: 143.327, y: 176.807 })).toBeTruthy();
    expect(
      describeFigureForEdit(result.svg).names?.some((n) => n.name === "M"),
    ).toBe(true);
  });

  it("adds the right-angle mark the editor reads as 직각", () => {
    const result = applyFigureEdits(tri, [
      { op: "addPerpendicularBisector", from: "B", to: "C" },
    ]);
    const mark = added(tri, result.svg).find((o) => o.type === "path")!;
    expect(nameIn(result.svg, mark.id)).toBe("직각");
    expect(groupOf(result.svg, mark.id)).toBe("각");
    // 이름을 안 주면 중점에 점을 찍지 않는다
    expect(dotAt(result.svg, { x: 143.327, y: 176.807 })).toBeFalsy();
  });

  it("refuses a second bisector of the same segment", () => {
    const once = applyFigureEdits(tri, [
      { op: "addPerpendicularBisector", from: "B", to: "C" },
    ]);
    const twice = applyFigureEdits(once.svg, [
      { op: "addPerpendicularBisector", from: "C", to: "B" },
    ]);
    expect(twice.applied).toEqual([]);
    expect(twice.rejected).toEqual([
      expect.stringContaining("수직이등분선이 이미 있습니다"),
    ]);
  });

  it("refuses when the two points are the same", () => {
    const result = applyFigureEdits(tri, [
      { op: "addPerpendicularBisector", from: "B", to: "B" },
    ]);
    expect(result.rejected).toEqual([
      expect.stringContaining("두 점이 같습니다"),
    ]);
  });
});

describe("각의 이등분선", () => {
  it("bisects ∠BAC and stops inside the frame", () => {
    const result = applyFigureEdits(tri, [
      { op: "addAngleBisector", at: "A", from: "B", to: "C" },
    ]);
    const [bisector] = added(tri, result.svg);
    const { a, b } = ends(bisector);
    expect(a).toEqual(A);
    expect(b).toEqual({ x: 121.59, y: 178.887 });
    // 검산 — 두 변과 이루는 각이 같다
    const angle = (p: XY, q: XY) =>
      Math.acos(dot(sub(p, A), sub(q, A)) / (len(p, A) * len(q, A)));
    expect(angle(b, B)).toBeCloseTo(angle(b, C), 6);
    expect(result.applied).toEqual(["각 BAC 의 이등분선 추가"]);
  });

  it("stops where it meets the opposite side and names the point", () => {
    const result = applyFigureEdits(tri, [
      {
        op: "addAngleBisector",
        at: "A",
        from: "B",
        to: "C",
        until: ["B", "C"],
        label: "D",
      },
    ]);
    const bisector = added(tri, result.svg).find((o) => o.type === "line")!;
    const d = ends(bisector).b;
    expect(d).toEqual({ x: 120.998, y: 176.807 });
    // 검산 — 각의 이등분선 정리 BD : DC = AB : AC
    expect(len(d, B) / len(d, C)).toBeCloseTo(len(A, B) / len(A, C), 5);
    expect(result.applied).toEqual(["각 BAC 의 이등분선 추가(교점 D)"]);
    expect(dotAt(result.svg, d)).toBeTruthy();
  });

  it.each([
    [
      "평각",
      {
        op: "addAngleBisector",
        at: "B",
        from: { x: 0, y: 176.807 },
        to: "C",
      },
      "평각이라 이등분선을 그을 수 없습니다",
    ],
    [
      "두 변이 겹침",
      { op: "addAngleBisector", at: "A", from: "B", to: "B" },
      "두 변이 겹칩니다",
    ],
    [
      "until 과 만나지 않음",
      {
        op: "addAngleBisector",
        at: "A",
        from: "B",
        to: "C",
        until: [
          { x: 0, y: 10 },
          { x: 200, y: 10 },
        ],
      },
      "그 직선과 만나지 않습니다",
    ],
  ])("rejects %s", (_name, command, reason) => {
    const result = applyFigureEdits(tri, [command]);
    expect(result.svg).toBe(tri);
    expect(result.rejected).toEqual([expect.stringContaining(reason)]);
  });
});

describe("접선", () => {
  const O = { x: 82.95, y: 82.95 },
    P = { x: 212.95, y: 42.95 };
  it("draws the tangent at a point of the circle, square to the radius", () => {
    const result = applyFigureEdits(circleP, [
      { op: "addTangent", circle: "O", at: "A" },
    ]);
    const [tangent] = added(circleP, result.svg);
    const { a, b } = ends(tangent);
    expect(a).toEqual({ x: 129.576, y: 6.386 });
    expect(b).toEqual({ x: 167.882, y: 111.632 });
    // 검산 — 중심에서 이 직선까지 거리가 반지름과 같다(접한다)
    const u = { x: (b.x - a.x) / len(a, b), y: (b.y - a.y) / len(a, b) };
    const distance = Math.abs((O.x - a.x) * u.y - (O.y - a.y) * u.x);
    expect(distance).toBeCloseTo(70, 3);
    expect(result.applied).toEqual(["원 O 의 접선 추가"]);
    expect(nameIn(result.svg, tangent.id)).toBe("선분");
  });

  it("draws both tangents from a point outside and names the tangency points", () => {
    const result = applyFigureEdits(circleP, [
      { op: "addTangent", circle: "O", from: "P", labels: ["S", "T"] },
    ]);
    const lines = added(circleP, result.svg).filter((o) => o.type === "line");
    expect(lines).toHaveLength(2);
    const tips = lines.map((o) => ends(o).b);
    expect(tips[0]).toEqual({ x: 135.033, y: 129.719 });
    expect(tips[1]).toEqual({ x: 99.732, y: 14.991 });
    for (const [i, tip] of tips.entries()) {
      expect(ends(lines[i]).a).toEqual(P);
      // 검산 — 접점은 원 위이고 반지름과 접선이 직각이다
      expect(len(tip, O)).toBeCloseTo(70, 3);
      expect(
        dot(sub(P, tip), sub(O, tip)) / (len(P, tip) * len(O, tip)),
      ).toBeCloseTo(0, 4);
      expect(dotAt(result.svg, tip)).toBeTruthy();
    }
    expect(result.applied).toEqual([
      "점 P 에서 원 O 에 그은 접선 추가(접점 S·T)",
    ]);
    const names = describeFigureForEdit(result.svg).names ?? [];
    expect(names.map((n) => n.name)).toEqual(
      expect.arrayContaining(["S", "T"]),
    );
  });

  it("draws the radius and the right-angle mark when asked", () => {
    const result = applyFigureEdits(circleP, [
      { op: "addTangent", circle: "O", at: "A", rightAngle: true },
    ]);
    const grown = added(circleP, result.svg);
    const radius = grown.find(
      (o) =>
        o.type === "line" &&
        Math.hypot(Number(o.attrs.x1) - O.x, Number(o.attrs.y1) - O.y) < 0.01,
    );
    expect(radius).toBeTruthy();
    const mark = grown.find((o) => o.type === "path")!;
    expect(nameIn(result.svg, mark.id)).toBe("직각");
    expect(result.applied).toEqual(["원 O 의 접선 추가(반지름 OA, 직각 표시)"]);
  });

  it("does not draw the radius again when it is already in the figure", () => {
    const result = applyFigureEdits(sector, [
      { op: "addTangent", circle: "O", at: "A", rightAngle: true },
    ]);
    expect(
      added(sector, result.svg).filter((o) => o.type === "line"),
    ).toHaveLength(1);
    expect(result.applied).toEqual(["원 O 의 접선 추가(직각 표시)"]);
  });

  it("treats a point on the circle given as from like at", () => {
    const result = applyFigureEdits(circleP, [
      { op: "addTangent", circle: "O", from: "A" },
    ]);
    const [tangent] = added(circleP, result.svg);
    expect(ends(tangent)).toEqual({
      a: { x: 129.576, y: 6.386 },
      b: { x: 167.882, y: 111.632 },
    });
  });

  it.each([
    [
      "중심이 그 점인 원이 없음",
      { op: "addTangent", circle: "A", at: "A" },
      "중심이 그 점인 원이 없습니다",
    ],
    [
      "at 이 원 위가 아님",
      { op: "addTangent", circle: "O", at: "P" },
      "그 점이 원 위에 있지 않습니다",
    ],
    [
      "from 이 원 안",
      { op: "addTangent", circle: "O", from: { x: 100, y: 100 } },
      "점이 원 안에 있어 접선이 없습니다",
    ],
  ])("rejects %s", (_name, command, reason) => {
    const result = applyFigureEdits(circleP, [command]);
    expect(result.svg).toBe(circleP);
    expect(result.rejected).toEqual([expect.stringContaining(reason)]);
  });

  it("refuses the same tangent twice", () => {
    const once = applyFigureEdits(circleP, [
      { op: "addTangent", circle: "O", at: "A" },
    ]);
    const twice = applyFigureEdits(once.svg, [
      { op: "addTangent", circle: "O", at: "A" },
    ]);
    expect(twice.applied).toEqual([]);
    expect(twice.rejected).toEqual([
      expect.stringContaining("같은 접선이 이미 있습니다"),
    ]);
  });
});

describe("외접원·내접원 — 중심은 코드가 계산한다", () => {
  it("draws the circumcircle of ABC like the editor's circle tool", () => {
    const result = applyFigureEdits(tri, [
      { op: "addCircumcircle", points: ["A", "B", "C"], label: "O" },
    ]);
    const circle = added(tri, result.svg).find((o) => o.type === "circle")!;
    const centre = { x: Number(circle.attrs.cx), y: Number(circle.attrs.cy) };
    expect(centre).toEqual({ x: 143.327, y: 131.807 });
    expect(circle.attrs.r).toBe("123.491");
    // 검산 — 세 꼭짓점에서 거리가 같다(내가 쓴 식이 아니라 «같은 거리»라는 뜻으로)
    for (const p of [A, B, C]) expect(len(centre, p)).toBeCloseTo(123.49089, 4);
    // 편집기 원 도구가 그린 것과 같은 요소
    const tool = addFigureObject(tri, "circle", centre, {
      x: centre.x + 123.491,
      y: centre.y,
    });
    const expected = figureObjects(
      editFigureObject(tool.svg, tool.id, { r: "123.491" }),
    ).at(-1)!;
    expect(circle.type).toBe(expected.type);
    expect({ ...circle.attrs, "data-object-id": "" }).toEqual({
      ...expected.attrs,
      "data-object-id": "",
    });
    expect(result.applied).toEqual(["삼각형 ABC 의 외접원 추가(중심 O)"]);
    expect(nameIn(result.svg, circle.id)).toBe("원");
    expect(groupOf(result.svg, circle.id)).toBe("원");
    expect(dotAt(result.svg, centre)).toBeTruthy();
  });

  it("widens the frame so the whole circumcircle shows", () => {
    const result = applyFigureEdits(tri, [
      { op: "addCircumcircle", points: ["A", "B", "C"] },
    ]);
    const [, , , height] = viewBoxOf(result.svg);
    expect(height).toBeGreaterThan(131.807 + 123.491);
    expect(viewBoxOf(result.svg)[0]).toBe(0);
  });

  it("draws the incircle touching all three sides", () => {
    const result = applyFigureEdits(tri, [
      { op: "addIncircle", points: ["A", "B", "C"], label: "I" },
    ]);
    const circle = added(tri, result.svg).find((o) => o.type === "circle")!;
    const centre = { x: Number(circle.attrs.cx), y: Number(circle.attrs.cy) };
    expect(centre).toEqual({ x: 105.23, y: 121.378 });
    expect(circle.attrs.r).toBe("55.429");
    // 검산 — 세 변까지 거리가 모두 반지름과 같다(각의 이등분선 식을 다시 쓰지 않는다)
    for (const [p, q] of [
      [A, B],
      [B, C],
      [C, A],
    ] as const) {
      const L = len(p, q);
      const distance = Math.abs(
        ((q.x - p.x) * (p.y - centre.y) - (p.x - centre.x) * (q.y - p.y)) / L,
      );
      expect(distance).toBeCloseTo(55.428688, 3);
    }
    expect(result.applied).toEqual(["삼각형 ABC 의 내접원 추가(중심 I)"]);
    expect(circle.attrs["stroke-dasharray"]).toBeUndefined();
  });

  it("makes the circle dashed when asked", () => {
    const circle = added(
      tri,
      applyFigureEdits(tri, [
        { op: "addIncircle", points: ["A", "B", "C"], dashed: true },
      ]).svg,
    ).find((o) => o.type === "circle")!;
    expect(circle.attrs["stroke-dasharray"]).toBe("5 4");
  });

  it.each([
    [
      "세 점이 한 직선 위",
      {
        op: "addCircumcircle",
        points: ["B", { x: 143.327, y: 176.807 }, "C"],
      },
      "세 점이 한 직선 위에 있습니다",
    ],
    [
      "이름 못 찾음",
      { op: "addIncircle", points: ["A", "B", "Z"] },
      "점 이름 Z",
    ],
  ])("rejects %s", (_name, command, reason) => {
    const result = applyFigureEdits(tri, [command]);
    expect(result.svg).toBe(tri);
    expect(result.rejected).toEqual([expect.stringContaining(reason)]);
  });

  it("refuses the same circumcircle twice", () => {
    const once = applyFigureEdits(tri, [
      { op: "addCircumcircle", points: ["A", "B", "C"] },
    ]);
    const twice = applyFigureEdits(once.svg, [
      { op: "addCircumcircle", points: ["C", "B", "A"] },
    ]);
    expect(twice.rejected).toEqual([
      expect.stringContaining("같은 원이 이미 있습니다"),
    ]);
  });
});

describe("원의 교점", () => {
  it("finds where two circles cross", () => {
    const result = applyFigureEdits(twoCircles, [
      {
        op: "addCircleIntersection",
        circle: "O",
        other: "P",
        labels: ["X", "Y"],
      },
    ]);
    const centres = [
      { x: 72.95, y: 72.95 },
      { x: 152.95, y: 72.95 },
    ];
    for (const at of [
      { x: 119.825, y: 110.403 },
      { x: 119.825, y: 35.497 },
    ]) {
      expect(dotAt(result.svg, at)).toBeTruthy();
      // 검산 — 두 원 위에 모두 있다
      expect(len(at, centres[0])).toBeCloseTo(60, 3);
      expect(len(at, centres[1])).toBeCloseTo(50, 3);
    }
    expect(result.applied).toEqual(["원 O 와 원 P 의 교점 추가(X·Y)"]);
  });

  it("finds where a line cuts the circle", () => {
    const result = applyFigureEdits(twoCircles, [
      { op: "addCircleIntersection", circle: "O", line: ["O", "P"] },
    ]);
    for (const at of [
      { x: 12.95, y: 72.95 },
      { x: 132.95, y: 72.95 },
    ])
      expect(dotAt(result.svg, at)).toBeTruthy();
    expect(result.applied).toEqual(["원 O 와 직선 OP 의 교점 추가(2개)"]);
  });

  it.each([
    [
      "직선이 원과 만나지 않음",
      {
        op: "addCircleIntersection",
        circle: "O",
        line: [
          { x: 0, y: 5 },
          { x: 200, y: 5 },
        ],
      },
      "직선이 원과 만나지 않습니다",
    ],
    [
      "중심이 그 점인 원이 없음",
      { op: "addCircleIntersection", circle: { x: 10, y: 10 }, other: "P" },
      "중심이 그 점인 원이 없습니다",
    ],
  ])("rejects %s", (_name, command, reason) => {
    const result = applyFigureEdits(twoCircles, [command]);
    expect(result.svg).toBe(twoCircles);
    expect(result.rejected).toEqual([expect.stringContaining(reason)]);
  });
});

describe("호의 중점", () => {
  it("puts the dot half way along the shorter arc", () => {
    const result = applyFigureEdits(sector, [
      { op: "addArcMidpoint", center: "O", from: "A", to: "B", label: "M" },
    ]);
    const at = { x: 106.892, y: 23.355 };
    expect(dotAt(result.svg, at)).toBeTruthy();
    // 검산 — 원 위이고 두 끝에서 같은 거리(호의 중점)
    expect(len(at, { x: 82.95, y: 89.133 })).toBeCloseTo(70, 3);
    expect(len(at, { x: 148.728, y: 65.192 })).toBeCloseTo(
      len(at, { x: 47.95, y: 28.511 }),
      2,
    );
    expect(result.applied).toEqual(["호 AB 의 중점 M 추가"]);
    expect(
      describeFigureForEdit(result.svg).names?.some((n) => n.name === "M"),
    ).toBe(true);
  });

  it("takes the other arc when via is given", () => {
    const result = applyFigureEdits(sector, [
      {
        op: "addArcMidpoint",
        center: "O",
        from: "A",
        to: "B",
        via: { x: 12.95, y: 89.133 },
      },
    ]);
    expect(dotAt(result.svg, { x: 59.008, y: 154.911 })).toBeTruthy();
    expect(added(sector, result.svg)).toHaveLength(1);
  });

  it.each([
    [
      "끝이 중심에서 다른 거리",
      {
        op: "addArcMidpoint",
        center: "O",
        from: "A",
        to: { x: 100, y: 89.133 },
      },
      "두 끝이 중심에서 같은 거리가 아닙니다",
    ],
    [
      "반원인데 via 가 없음",
      {
        op: "addArcMidpoint",
        center: "O",
        from: { x: 12.95, y: 89.133 },
        to: { x: 152.95, y: 89.133 },
      },
      "반원이라 어느 쪽 호인지 정할 수 없습니다",
    ],
  ])("rejects %s", (_name, command, reason) => {
    const result = applyFigureEdits(sector, [command]);
    expect(result.svg).toBe(sector);
    expect(result.rejected).toEqual([expect.stringContaining(reason)]);
  });
});
