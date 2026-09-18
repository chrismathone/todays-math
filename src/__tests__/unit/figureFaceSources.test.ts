/**
 * 도형 편집기 «면 만들기»(트랙 4) — 편집기 요소를 경계 꺾은선으로 펴고, 채우기 통·안쪽 채우기·다각형 도구가 쓸 판단을 한다.
 *
 * 요소는 `figureObjects()` 가 내는 모양({id, type, attrs}) 그대로다. 편집기는 요소를 옮길 때 `transform="translate(…)"`
 * 를 붙이므로(FigureEditor move) 경계는 변환을 적용한 뒤의 자리에서 잰다. 원·타원·곡선·호·함수 그래프는 촘촘히 표본을 떠 근사한다.
 */
import { describe, expect, it } from "vitest";

import {
  pointInRegion,
  ringArea,
  type Point,
} from "@/components/unified/figure-editor/figureFaceGeometry";
import {
  applyMatrix,
  bucketAction,
  closedGroupFill,
  DEFAULT_FACE_FILL,
  drawsBoundary,
  FACE_ATTR,
  FACE_SEED_ATTR,
  faceAttrs,
  faceInsertBefore,
  facePathData,
  findFaceAt,
  nearestSnap,
  objectCurves,
  parseTransform,
  polygonToolCloses,
  recomputeFace,
  snapCandidates,
  type FaceSourceObject,
} from "@/components/unified/figure-editor/figureFaceSources";

const P = (x: number, y: number): Point => ({ x, y });
const obj = (
  id: string,
  type: string,
  attrs: Record<string, string>,
): FaceSourceObject => ({
  id,
  type,
  attrs: { stroke: "#111111", "stroke-width": "1.8", fill: "none", ...attrs },
});
const line = (id: string, a: Point, b: Point, attrs = {}) =>
  obj(id, "line", {
    x1: String(a.x),
    y1: String(a.y),
    x2: String(b.x),
    y2: String(b.y),
    ...attrs,
  });
const close = (a: Point, b: Point, digits = 6) => {
  expect(a.x).toBeCloseTo(b.x, digits);
  expect(a.y).toBeCloseTo(b.y, digits);
};
/** d 의 M…Z 고리들을 점 목록으로 — 면 경로를 되읽는다. */
const rings = (d: string) =>
  d
    .split("M")
    .map((part) => part.replace(/Z/g, "").trim())
    .filter(Boolean)
    .map((part) => {
      const values = part.replace(/L/g, " ").trim().split(/\s+/).map(Number);
      return values.flatMap((x, i) => (i % 2 ? [] : [P(x, values[i + 1])]));
    });

const A = P(120, 20),
  B = P(20, 200),
  C = P(260, 200),
  D = P(100, 200);
const triangleLines = [line("AB", A, B), line("BC", B, C), line("CA", C, A)];

describe("parseTransform — 편집기가 붙이는 변환을 행렬로", () => {
  it("평행 이동·합성 차례·중심 회전·행렬·빈 값", () => {
    close(applyMatrix(parseTransform("translate(10 20)"), P(1, 2)), P(11, 22));
    // 뒤의 것이 먼저 — scale 한 뒤 translate
    close(
      applyMatrix(parseTransform("translate(10 0) scale(2)"), P(1, 1)),
      P(12, 2),
    );
    close(
      applyMatrix(parseTransform("rotate(90 100 100)"), P(200, 100)),
      P(100, 200),
    );
    close(applyMatrix(parseTransform("matrix(1 0 0 1 5 6)"), P(0, 0)), P(5, 6));
    close(applyMatrix(parseTransform("translate(3,-4)"), P(0, 0)), P(3, -4));
    close(applyMatrix(parseTransform(""), P(7, 8)), P(7, 8));
    close(applyMatrix(parseTransform(undefined), P(7, 8)), P(7, 8));
  });
});

describe("objectCurves — 요소를 경계 꺾은선으로", () => {
  it("선분 — 옮긴 선분은 transform 을 적용한 자리", () => {
    const [plain] = objectCurves(line("a", P(0, 0), P(100, 50)));
    expect(plain.closed).toBe(false);
    expect(plain.points).toEqual([P(0, 0), P(100, 50)]);
    const [moved] = objectCurves(
      line("a", P(0, 0), P(100, 50), { transform: "translate(30 -10)" }),
    );
    expect(moved.points).toEqual([P(30, -10), P(130, 40)]);
    expect(moved.id).toBe("a");
  });

  it("사각형 — 모서리 넷(돌린 사각형은 돌린 자리)", () => {
    const [rect] = objectCurves(
      obj("r", "rect", { x: "10", y: "20", width: "100", height: "50" }),
    );
    expect(rect.closed).toBe(true);
    expect(rect.points).toEqual([P(10, 20), P(110, 20), P(110, 70), P(10, 70)]);
    const [turned] = objectCurves(
      obj("r", "rect", {
        x: "10",
        y: "20",
        width: "100",
        height: "50",
        transform: "rotate(90 10 20)",
      }),
    );
    close(turned.points[1], P(10, 120));
  });

  it("둥근 사각형 — 모서리를 둥글게 편다(원래 모서리 점은 경계에 없다)", () => {
    const [rounded] = objectCurves(
      obj("r", "rect", {
        x: "0",
        y: "0",
        width: "100",
        height: "60",
        rx: "20",
      }),
    );
    expect(rounded.points.length).toBeGreaterThan(8);
    expect(rounded.points.some((p) => Math.hypot(p.x, p.y) < 1e-6)).toBe(false);
    for (const p of rounded.points) {
      expect(p.x).toBeGreaterThanOrEqual(-1e-9);
      expect(p.x).toBeLessThanOrEqual(100 + 1e-9);
      expect(p.y).toBeGreaterThanOrEqual(-1e-9);
      expect(p.y).toBeLessThanOrEqual(60 + 1e-9);
    }
  });

  it("원·타원 — 표본점이 모두 원 위", () => {
    const [round] = objectCurves(
      obj("c", "circle", { cx: "50", cy: "60", r: "40" }),
    );
    expect(round.closed).toBe(true);
    expect(round.points.length).toBeGreaterThanOrEqual(24);
    for (const p of round.points)
      expect(Math.hypot(p.x - 50, p.y - 60)).toBeCloseTo(40, 9);
    const [oval] = objectCurves(
      obj("e", "ellipse", { cx: "0", cy: "0", rx: "80", ry: "30" }),
    );
    for (const p of oval.points)
      expect((p.x / 80) ** 2 + (p.y / 30) ** 2).toBeCloseTo(1, 9);
    expect(
      objectCurves(obj("c", "circle", { cx: "0", cy: "0", r: "0" })),
    ).toEqual([]);
  });

  it("꺾은선은 열리고 다각형은 닫힌다", () => {
    expect(
      objectCurves(obj("p", "polyline", { points: "0,0 10,0 10,10" }))[0],
    ).toMatchObject({ closed: false, points: [P(0, 0), P(10, 0), P(10, 10)] });
    expect(
      objectCurves(obj("p", "polygon", { points: "0 0 10 0 10 10" }))[0],
    ).toMatchObject({ closed: true, points: [P(0, 0), P(10, 0), P(10, 10)] });
  });

  it("경로 — 곡선(Q)은 표본, 끝점은 정확히", () => {
    const [curve] = objectCurves(
      obj("q", "path", { d: "M 0 0 Q 50 -50 100 0" }),
    );
    expect(curve.closed).toBe(false);
    expect(curve.points[0]).toEqual(P(0, 0));
    close(curve.points.at(-1)!, P(100, 0));
    expect(curve.points.length).toBeGreaterThan(4);
    for (const p of curve.points) expect(p.y).toBeLessThanOrEqual(1e-9);
  });

  it("경로 — 부채꼴(호 A)은 호 위의 점으로, 붙여 쓴 플래그도 같게", () => {
    const [sector] = objectCurves(
      obj("s", "path", { d: "M 100 100 L 200 100 A 100 100 0 0 1 100 200 Z" }),
    );
    expect(sector.closed).toBe(true);
    expect(sector.points[0]).toEqual(P(100, 100));
    for (const p of sector.points.slice(1)) {
      expect(Math.hypot(p.x - 100, p.y - 100)).toBeCloseTo(100, 6);
      expect(p.x).toBeGreaterThanOrEqual(100 - 1e-6);
      expect(p.y).toBeGreaterThanOrEqual(100 - 1e-6);
    }
    const [compact] = objectCurves(
      obj("s", "path", { d: "M100 100L200 100A100 100 0 01100 200Z" }),
    );
    expect(compact.points).toEqual(sector.points);
  });

  it("경로 — 상대 좌표·H/V·여러 조각·Z 뒤 이어 그리기", () => {
    expect(
      objectCurves(obj("r", "path", { d: "m 10 10 l 20 0 l 0 20 z" }))[0],
    ).toMatchObject({
      closed: true,
      points: [P(10, 10), P(30, 10), P(30, 30)],
    });
    expect(
      objectCurves(obj("h", "path", { d: "M 0 0 H 50 V 40 H 0 Z" }))[0].points,
    ).toEqual([P(0, 0), P(50, 0), P(50, 40), P(0, 40)]);
    const two = objectCurves(
      obj("t", "path", { d: "M 0 0 L 10 0 L 10 10 Z M 20 20 L 30 20" }),
    );
    expect(two.map((c) => c.closed)).toEqual([true, false]);
    const after = objectCurves(
      obj("z", "path", { d: "M 0 0 L 10 0 L 10 10 Z L 0 10" }),
    );
    expect(after[1].points).toEqual([P(0, 0), P(0, 10)]);
    expect(objectCurves(obj("x", "path", { d: "M 0 0 X 5" }))).toEqual([]);
  });

  it("조상 <g> 의 변환도 합친다(붙여넣은 요소는 translate 묶음 안에 든다)", () => {
    const [pasted] = objectCurves({
      ...line("a", P(0, 0), P(10, 0)),
      parentMatrix: parseTransform("translate(12 12)"),
    });
    expect(pasted.points).toEqual([P(12, 12), P(22, 12)]);
  });
});

describe("drawsBoundary — 무엇이 경계인가", () => {
  it("보이는 선만 경계다 — 글자·면·선 없는 채움·숨긴 것은 아니다", () => {
    expect(drawsBoundary(line("a", A, B))).toBe(true);
    expect(drawsBoundary(line("a", A, B, { stroke: "none" }))).toBe(false);
    expect(
      drawsBoundary(line("a", A, B, { stroke: "none", style: "stroke:#000" })),
    ).toBe(true);
    expect(drawsBoundary(line("a", A, B, { "stroke-width": "0" }))).toBe(false);
    expect(drawsBoundary(line("a", A, B, { display: "none" }))).toBe(false);
    expect(drawsBoundary(line("a", A, B, { style: "display:none" }))).toBe(
      false,
    );
    expect(drawsBoundary(line("a", A, B, { opacity: "0" }))).toBe(false);
    expect(drawsBoundary(obj("t", "text", { x: "0", y: "0" }))).toBe(false);
    expect(
      drawsBoundary(obj("f", "path", { d: "M0 0L1 0L1 1Z", [FACE_ATTR]: "" })),
    ).toBe(false);
    const bare = {
      id: "a",
      type: "line",
      attrs: { x1: "0", y1: "0", x2: "1", y2: "1" },
    };
    expect(drawsBoundary(bare)).toBe(false);
    expect(drawsBoundary({ ...bare, inheritedStroke: "#000" })).toBe(true);
  });
});

describe("findFaceAt · bucketAction — 채우기 통", () => {
  it("선분 셋으로 그린 삼각형 — 안을 누르면 새 면, 안의 글자는 경계가 아니다", () => {
    const objects = [
      ...triangleLines,
      obj("label", "text", { x: "120", y: "150", stroke: "#ffffff" }),
    ];
    const face = findFaceAt(objects, P(120, 150));
    expect(face?.area).toBeCloseTo(21600, 6);
    const action = bucketAction(objects, P(120, 150));
    expect(action.kind).toBe("create");
    if (action.kind !== "create") return;
    expect(action.region.area).toBeCloseTo(21600, 6);
    expect([...action.region.sourceIds].sort()).toEqual(["AB", "BC", "CA"]);
  });

  it("바깥을 누르면 아무것도 안 만들고 이유를 준다", () => {
    expect(bucketAction(triangleLines, P(5, 5))).toEqual({
      kind: "none",
      reason: "닫힌 영역이 아닙니다",
    });
  });

  it("이미 만든 면 안을 누르면 그 면의 색을 바꾼다", () => {
    const face = obj("face", "path", {
      d: "M 120 20 L 20 200 L 260 200 Z",
      fill: DEFAULT_FACE_FILL,
      stroke: "none",
      [FACE_ATTR]: "AB BC CA",
    });
    expect(bucketAction([face, ...triangleLines], P(120, 150))).toEqual({
      kind: "recolor",
      id: "face",
    });
  });

  it("큰 면(△ABC) 안의 작은 칸(△ABD)을 누르면 큰 면을 바꾸지 않고 새 면을 만든다", () => {
    const big = obj("big", "path", {
      d: "M 120 20 L 20 200 L 260 200 Z",
      stroke: "none",
      [FACE_ATTR]: "AB BC CA",
    });
    const action = bucketAction(
      [big, ...triangleLines, line("AD", A, D)],
      P(80, 140),
    );
    expect(action.kind).toBe("create");
    if (action.kind === "create")
      expect(action.region.area).toBeCloseTo(7200, 6);
  });

  it("선과 상관없는 다각형 면(다각형 도구) — 누르면 그 면의 색을 바꾼다, 겹치면 위의 것", () => {
    const free = obj("free", "polygon", {
      points: "300 300 400 300 400 400 300 400",
      stroke: "none",
      [FACE_ATTR]: "",
    });
    const top = obj("top", "polygon", {
      points: "350 350 450 350 450 450",
      stroke: "none",
      [FACE_ATTR]: "",
    });
    expect(bucketAction([free, ...triangleLines], P(350, 350))).toEqual({
      kind: "recolor",
      id: "free",
    });
    expect(bucketAction([free, top], P(390, 360))).toEqual({
      kind: "recolor",
      id: "top",
    });
  });
});

describe("closedGroupFill — 묶음 안쪽 채우기", () => {
  it("닫힌 영역이면 테두리, 아니면 짧은 이유", () => {
    const closed = closedGroupFill(triangleLines);
    expect(closed.ok).toBe(true);
    if (closed.ok) {
      expect(closed.regions).toHaveLength(1);
      expect(closed.regions[0].area).toBeCloseTo(21600, 6);
    }
    expect(closedGroupFill(triangleLines.slice(0, 2))).toEqual({
      ok: false,
      reason: "닫힌 영역이 아닙니다",
    });
    expect(closedGroupFill([obj("t", "text", { x: "0", y: "0" })])).toEqual({
      ok: false,
      reason: "선이 없습니다",
    });
  });
});

describe("recomputeFace — 면이 선을 따라간다", () => {
  it("묶음 면(씨앗 없음) — 선을 옮기면 테두리가 따라 옮겨진다", () => {
    const face = obj("face", "path", {
      d: "M 120 20 L 20 200 L 260 200 Z",
      stroke: "none",
      [FACE_ATTR]: "AB BC CA",
    });
    const moved = triangleLines.map((o) => ({
      ...o,
      attrs: { ...o.attrs, transform: "translate(30 0)" },
    }));
    const next = recomputeFace(face, moved);
    expect(next).not.toBeNull();
    expect(next!.seed).toBeUndefined();
    const [ring] = rings(next!.d);
    expect(Math.abs(ringArea(ring))).toBeCloseTo(21600, 6);
    expect(Math.min(...ring.map((p) => p.x))).toBeCloseTo(50, 6);
  });

  it("채우기 통 면(씨앗) — 끝점을 고치면 새 칸을 따라간다", () => {
    const face = obj("face", "path", {
      d: "M 120 20 L 20 200 L 100 200 Z",
      stroke: "none",
      [FACE_ATTR]: "AB BC AD",
      [FACE_SEED_ATTR]: "70 150",
    });
    const members = [
      line("AB", A, B),
      line("BC", B, C),
      line("AD", A, P(60, 200)),
    ];
    const next = recomputeFace(face, members)!;
    expect(Math.abs(ringArea(rings(next.d)[0]))).toBeCloseTo(3600, 6);
    // 씨앗이 새 칸 안에 그대로 있으면 바꾸지 않는다.
    expect(next.seed).toBe("70 150");
  });

  it("채우기 통 면 — 선을 통째로 멀리 옮겨 씨앗이 밖이 되어도 같은 칸을 찾는다", () => {
    const face = obj("face", "path", {
      d: "M 120 20 L 20 200 L 100 200 Z",
      stroke: "none",
      [FACE_ATTR]: "AB BC AD",
      [FACE_SEED_ATTR]: "70 150",
    });
    const members = [line("AB", A, B), line("BC", B, C), line("AD", A, D)].map(
      (o) => ({ ...o, attrs: { ...o.attrs, transform: "translate(500 0)" } }),
    );
    const next = recomputeFace(face, members)!;
    const [ring] = rings(next.d);
    expect(Math.abs(ringArea(ring))).toBeCloseTo(7200, 6);
    const [x, y] = next.seed!.split(" ").map(Number);
    expect(pointInRegion(P(x, y), ring)).toBe(true);
  });

  it("고리가 끊기면 null — 부르는 쪽이 이전 면을 그대로 둔다", () => {
    const face = obj("face", "path", {
      d: "M 120 20 L 20 200 L 260 200 Z",
      stroke: "none",
      [FACE_ATTR]: "AB BC CA",
    });
    expect(
      recomputeFace(face, [
        line("AB", A, B),
        line("BC", B, C),
        line("CA", C, P(200, 60)),
      ]),
    ).toBeNull();
  });
});

describe("faceAttrs · facePathData — 면 요소의 모양", () => {
  it("선 없는 채움 · evenodd · 경계 열쇠 · 씨앗(있을 때만) · 소수 둘째 자리", () => {
    const region = {
      outer: [P(1, 2), P(3.456, 4), P(5, 6)],
      holes: [[P(2, 3), P(3, 3), P(3, 4)]],
      area: 1,
      sourceIds: ["a"],
    };
    expect(facePathData([region])).toBe(
      "M 1 2 L 3.46 4 L 5 6 Z M 2 3 L 3 3 L 3 4 Z",
    );
    expect(
      faceAttrs([region], { edges: ["a", "b"], seed: P(1.5, 2.504) }),
    ).toEqual({
      d: "M 1 2 L 3.46 4 L 5 6 Z M 2 3 L 3 3 L 3 4 Z",
      fill: DEFAULT_FACE_FILL,
      stroke: "none",
      "fill-rule": "evenodd",
      [FACE_ATTR]: "a b",
      [FACE_SEED_ATTR]: "1.5 2.5",
    });
    expect(faceAttrs([region], { fill: "#ffe08a" })).toEqual({
      d: "M 1 2 L 3.46 4 L 5 6 Z M 2 3 L 3 3 L 3 4 Z",
      fill: "#ffe08a",
      stroke: "none",
      "fill-rule": "evenodd",
      [FACE_ATTR]: "",
    });
  });

  it("기본 채움은 흑백 인쇄에서도 보이는 옅은 회색(엔진 영역 채색 하한 0.78 위)", () => {
    const [r, g, b] = [1, 3, 5].map((i) =>
      Number.parseInt(DEFAULT_FACE_FILL.slice(i, i + 2), 16),
    );
    expect(r === g && g === b).toBe(true);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    expect(luminance).toBeGreaterThanOrEqual(0.78);
    expect(luminance).toBeLessThanOrEqual(0.9);
  });
});

describe("faceInsertBefore — 면은 잉크(선·글자) 뒤, 바탕·채움 앞", () => {
  it("첫 잉크 앞에 넣는다", () => {
    const fill = obj("fill", "path", {
      d: "M0 0L1 0L1 1Z",
      stroke: "none",
      fill: "#f5e6b8",
    });
    const label = obj("label", "text", { x: "0", y: "0", stroke: "none" });
    expect(faceInsertBefore([fill, label, line("a", A, B)])).toBe("label");
    const face = obj("face", "path", {
      d: "M0 0L1 0L1 1Z",
      stroke: "none",
      [FACE_ATTR]: "",
    });
    expect(faceInsertBefore([face, line("a", A, B), label])).toBe("a");
    expect(faceInsertBefore([face])).toBeNull();
  });
});

describe("snapCandidates · nearestSnap — 다각형 도구가 달라붙을 점", () => {
  it("끝점·꼭짓점·교점 — 원 위의 표본점은 아니다", () => {
    const cross = snapCandidates([
      line("a", P(0, 0), P(100, 100)),
      line("b", P(0, 100), P(100, 0)),
    ]);
    expect(cross).toHaveLength(5);
    const shapes = snapCandidates([
      obj("tri", "polygon", { points: "0 0 60 0 30 40" }),
      obj("rect", "rect", {
        x: "100",
        y: "0",
        width: "20",
        height: "10",
        transform: "translate(5 5)",
      }),
    ]);
    expect(shapes).toHaveLength(7);
    expect(shapes).toContainEqual(P(125, 15));
    const round = snapCandidates([
      obj("c", "circle", { cx: "200", cy: "200", r: "100" }),
      line("l", P(50, 190), P(350, 190)),
    ]);
    expect(round).toHaveLength(4);
  });

  it("허용 오차 안의 가장 가까운 후보, 밖이면 null", () => {
    const candidates = [P(50, 50), P(0, 0)];
    expect(nearestSnap(P(51, 49.5), candidates, 3)).toEqual(P(50, 50));
    expect(nearestSnap(P(51, 49.5), candidates, 1)).toBeNull();
  });

  it("다각형 도구 — 세 점 이상에서 첫 점 근처를 누르면 닫는다", () => {
    const points = [P(0, 0), P(100, 0), P(50, 80)];
    expect(polygonToolCloses(points, P(2, 1), 4)).toBe(true);
    expect(polygonToolCloses(points, P(20, 1), 4)).toBe(false);
    expect(polygonToolCloses(points.slice(0, 2), P(0, 0), 4)).toBe(false);
  });
});
