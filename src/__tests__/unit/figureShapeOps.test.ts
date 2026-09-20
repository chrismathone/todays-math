import { describe, expect, it } from "vitest";
import {
  addFigureObject,
  figureObjects,
  prepareFigureSvg,
  readFigureSvg,
} from "@/components/unified/figure-editor/figureSvgEditing";
import { applyFigureEdits } from "@/components/unified/figure-editor/figureEditApply";
import { describeFigureForEdit } from "@/components/unified/figure-editor/figureEditElements";
import {
  addFigureTriangle,
  bucketFill,
  isTiedFace,
} from "@/components/unified/figure-editor/figureFaceEditing";
import { DEFAULT_FACE_FILL } from "@/components/unified/figure-editor/figureFaceSources";
import {
  figureAngleKinds,
  groupFigureObjects,
} from "@/components/unified/figure-editor/figureObjectGroups";
import { objectName } from "@/components/unified/figure-editor/figureObjectNames";
import { rotateFigureSelection } from "@/components/unified/figure-editor/figureRotate";

/**
 * «요청대로 고치기» 동작 더하기 ② — 도형·변환(원장님 2026-09-19 «추가할 수 있는 것 전부»).
 * 새 요소는 편집기가 이미 읽는 모양이어야 한다(요소 이름·묶음·오른쪽 칸 제목이 손으로 그린 것과 같게).
 * 좌표는 점 이름으로 받고 코드가 계산한다(수선의 발·원의 반지름·중점·교점) — 모델이 지은 좌표를 믿지 않는다.
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
// 둔각삼각형 ABC(B 가 둔각) — A 에서 BC 에 내린 수선의 발은 BC 의 연장선 위
const obtuse =
  prepareFigureSvg(`<svg viewBox="0 0 313.975 191.766" xmlns="${NS}">
  <rect width="313.975" height="191.766" fill="#ffffff" />
  <g>${line(25.648, 26.807, 85.648, 166.807)}${line(85.648, 166.807, 285.648, 166.807)}${line(285.648, 166.807, 25.648, 26.807)}</g>
  <g></g>
  <g>${label("A", 18.065, 24.6, 25.648, 26.807)}${label("B", 78.065, 179.766, 85.648, 166.807)}${label("C", 296.372, 172.183, 285.648, 166.807)}</g>
</svg>`);
// 원 O(반지름 70)와 반지름 OA·OB — A 는 20°, B 는 120°(엔진 on_circle)
const circle =
  prepareFigureSvg(`<svg viewBox="0 0 176.871 172.083" xmlns="${NS}">
  <rect width="176.871" height="172.083" fill="#ffffff" />
  <g>
    <circle cx="82.95" cy="89.133" r="70" fill="none" stroke="#111111" stroke-width="1.9" />
    ${line(82.95, 89.133, 148.728, 65.192)}${line(82.95, 89.133, 47.95, 28.511)}
  </g>
  <g></g>
  <g>${label("A", 158.806, 66.9, 148.728, 65.192)}${label("B", 42.588, 24.6, 47.95, 28.511)}${label("O", 75.367, 102.092, 82.95, 89.133)}</g>
</svg>`);

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
/** 새로 매긴 요소 번호(`obj-…`)와 경계 열쇠(`e-…`)를 나온 차례로 바꾼다 — 채우기 통 결과와 견주려고. */
const normalized = (svg: string) => {
  const seen = new Map<string, string>();
  return svg.replace(
    /\b(?:obj-[0-9a-f-]{36}|e-[0-9a-f]{8})\b/g,
    (id) => seen.get(id) ?? (seen.set(id, `#${seen.size}`), seen.get(id)!),
  );
};
/** 요소마다 직렬화한 글 — 틀(루트 viewBox) 말고 요소가 같은가. */
const elementsXml = (svg: string) =>
  [...readFigureSvg(svg).querySelectorAll("[data-object-id]")].map((el) =>
    new XMLSerializer().serializeToString(el),
  );
const unchanged = (before: string, after: string) => {
  const xml = (svg: string) =>
    new Map(
      [...readFigureSvg(svg).querySelectorAll("[data-object-id]")].map((el) => [
        el.getAttribute("data-object-id"),
        new XMLSerializer().serializeToString(el),
      ]),
    );
  const now = xml(after);
  for (const [id, text] of xml(before)) expect(now.get(id)).toBe(text);
};

describe("원 더하기 — 편집기 원 도구와 같은 요소", () => {
  it("draws the circle centred at O with the given radius, like the editor's circle tool", () => {
    const result = applyFigureEdits(circle, [
      { op: "addCircle", center: "O", r: 35 },
    ]);
    const [circleAdded] = added(circle, result.svg);
    const tool = addFigureObject(
      circle,
      "circle",
      { x: 82.95, y: 89.133 },
      { x: 117.95, y: 89.133 },
    );
    const toolCircle = figureObjects(tool.svg).find((o) => o.id === tool.id)!;
    expect({ ...circleAdded.attrs, "data-object-id": "" }).toEqual({
      ...toolCircle.attrs,
      "data-object-id": "",
    });
    expect(circleAdded.attrs).toMatchObject({
      cx: "82.95",
      cy: "89.133",
      r: "35",
    });
    expect(nameIn(result.svg, circleAdded.id)).toBe("원");
    expect(groupOf(result.svg, circleAdded.id)).toBe("원");
    expect(result.applied).toEqual(["원 추가(중심 O, 반지름 35)"]);
    unchanged(circle, result.svg);
  });

  it("measures the radius OA from the points, not from the model", () => {
    const result = applyFigureEdits(tri, [
      { op: "addCircle", center: "A", through: "B", dashed: true },
    ]);
    const [circleAdded] = added(tri, result.svg);
    // |AB| = √(50² + 150²) = 158.114 — 요소 목록의 0.1 반올림이 아니라 그림의 점 그대로
    expect(circleAdded.attrs).toMatchObject({
      cx: "78.327",
      cy: "26.807",
      r: "158.114",
      "stroke-dasharray": "5 4",
    });
    expect(result.applied).toEqual(["원 추가(중심 A, 반지름 AB)"]);
  });

  it.each([
    [
      { op: "addCircle", center: "O", through: "A" },
      "원 추가(중심 O, 반지름 OA): 같은 원이 이미 있습니다(1번 원)",
    ],
    [
      { op: "addCircle", center: "O", through: "O" },
      "원 추가(중심 O, 반지름 OO): 반지름이 0 입니다",
    ],
    [
      { op: "addCircle", center: "Q", r: 30 },
      "원 추가(중심 Q, 반지름 30): 점 이름 Q — 그림에서 찾지 못했습니다",
    ],
    [
      { op: "addCircle", center: "O", r: 900 },
      "원 추가(중심 O, 반지름 900): 반지름이 그림보다 큽니다",
    ],
  ])("explains why a circle is not added %#", (command, reason) => {
    const result = applyFigureEdits(circle, [command]);
    expect(result.svg).toBe(circle);
    expect(result.rejected).toEqual([reason]);
  });
});

describe("호 더하기 — 엔진 add_arc 와 같은 모양", () => {
  it("draws arc AB around O the short way, as the engine draws it", () => {
    const result = applyFigureEdits(circle, [
      { op: "addArc", center: "O", from: "A", to: "B" },
    ]);
    const [arc] = added(circle, result.svg);
    // 엔진이 같은 호(arcs: {circle: c, from: A, to: B, dir: ccw})를 그린 d — 끝은 반지름 위로 맞춘다
    expect(arc.type).toBe("path");
    expect(arc.attrs.d).toBe("M 148.728 65.192 A 70 70 0 0 0 47.95 28.511");
    expect(arc.attrs).toMatchObject({ fill: "none", stroke: "#111111" });
    // 원장님 2026-09-20 — AI 가 더한 호도 엔진의 호와 같은 이름 «호»(figureObjectNames.ts `isArcPath`)
    expect(nameIn(result.svg, arc.id)).toBe("호");
    expect(result.applied).toEqual(["호 AB 추가(중심 O)"]);
    unchanged(circle, result.svg);
  });

  it("sits on the circle already drawn when the centre comes as the listed (rounded) coordinates", () => {
    // 요소 목록은 원 중심을 0.1 로 반올림해 싣는다([83, 89.1]) — 모델이 그 좌표를 주어도 호는 그림의 원 위에
    const result = applyFigureEdits(circle, [
      { op: "addArc", center: { x: 83, y: 89.1 }, from: "A", to: "B" },
    ]);
    expect(added(circle, result.svg)[0].attrs.d).toBe(
      "M 148.728 65.192 A 70 70 0 0 0 47.95 28.511",
    );
    expect(result.applied).toEqual(["호 AB 추가"]);
  });

  it("ends exactly on the named point of a sector with no circle drawn", () => {
    // 엔진 부채꼴(원은 draw: false) — 끝점 반올림으로 |OA| = 89.9997, |OB| = 90.0006. 호는 A 에서 B 로, 이름 붙은 끝 그대로
    const sector = prepareFigureSvg(
      `<svg viewBox="0 0 180.679 131.413" xmlns="${NS}"><g>${line(67.965, 106.454, 152.537, 75.672)}${line(67.965, 106.454, 22.965, 28.511)}</g><g>${label("A", 162.614, 77.38, 152.537, 75.672)}${label("B", 17.603, 24.6, 22.965, 28.511)}${label("O", 60.382, 119.413, 67.965, 106.454)}</g></svg>`,
    );
    const result = applyFigureEdits(sector, [
      { op: "addArc", center: "O", from: "A", to: "B" },
    ]);
    expect(added(sector, result.svg)[0].attrs.d).toBe(
      "M 152.537 75.672 A 90 90 0 0 0 22.965 28.511",
    );
    // 반지름이 90 이라 호 꼭대기(y 16.45)가 틀 안 — 틀은 그대로
    expect(viewBoxOf(result.svg)).toEqual([0, 0, 180.679, 131.413]);
  });

  it("goes the long way when the arc must pass a given point", () => {
    const result = applyFigureEdits(circle, [
      {
        op: "addArc",
        center: "O",
        from: "A",
        to: "B",
        via: { x: 82.95, y: 159.133 },
        dashed: true,
      },
    ]);
    const [arc] = added(circle, result.svg);
    expect(arc.attrs.d).toBe("M 148.728 65.192 A 70 70 0 1 1 47.95 28.511");
    expect(arc.attrs["stroke-dasharray"]).toBe("5 4");
    expect(result.applied).toEqual(["호 AB 추가(중심 O)"]);
  });

  it.each([
    [
      { op: "addArc", center: "O", from: "A", to: { x: 100, y: 89.133 } },
      "호 추가(중심 O): 두 끝이 중심에서 같은 거리가 아닙니다",
    ],
    [
      {
        op: "addArc",
        center: "O",
        from: "A",
        to: { x: 17.172, y: 113.074 },
      },
      "호 추가(중심 O): 반원이라 어느 쪽 호인지 정할 수 없습니다",
    ],
    [
      { op: "addArc", center: "O", from: "O", to: "B" },
      "호 OB 추가(중심 O): 호의 끝이 중심과 같습니다",
    ],
  ])("explains why an arc is not added %#", (command, reason) => {
    const result = applyFigureEdits(circle, [command]);
    expect(result.svg).toBe(circle);
    expect(result.rejected).toEqual([reason]);
  });
});

describe("크기 바꾸기 — 원·타원·사각형·다각형, 크기 고정은 거절", () => {
  const shapes = addFigureTriangle(
    prepareFigureSvg(
      `<svg xmlns="${NS}" viewBox="0 0 300 200"><rect x="20" y="30" width="80" height="40" fill="none" stroke="#111111"/><ellipse cx="200" cy="60" rx="40" ry="20" fill="none" stroke="#111111"/>${line(20, 180, 120, 180)}<rect x="150" y="120" width="40" height="30" fill="none" stroke="#111111" data-size-locked="true"/><g transform="scale(2)"><circle cx="30" cy="70" r="10" fill="none" stroke="#111111"/></g></svg>`,
    ),
    { x: 220, y: 110 },
    { x: 260, y: 150 },
  ).svg;
  const attrsOf = (svg: string, n: number) =>
    figureObjects(svg).find((o) => o.id === ids(shapes)[n - 1])!.attrs;

  it("changes a circle's radius in figure units, and says from what to what", () => {
    const result = applyFigureEdits(circle, [
      { op: "resize", target: 1, r: 50 },
    ]);
    expect(figureObjects(result.svg)[0].attrs).toMatchObject({
      cx: "82.95",
      cy: "89.133",
      r: "50",
    });
    expect(result.applied).toEqual(["1번 원 반지름 70 → 50"]);
    // 커지게도
    expect(
      figureObjects(
        applyFigureEdits(circle, [{ op: "resize", target: 1, scale: 1.1 }]).svg,
      )[0].attrs.r,
    ).toBe("77");
  });

  it("scales about the centre — rectangle, ellipse and a kept triangle", () => {
    const result = applyFigureEdits(shapes, [
      { op: "resize", target: 1, scale: 1.5 },
      { op: "resize", target: 2, scale: 0.5 },
      { op: "resize", target: 6, scale: 2 },
    ]);
    expect(attrsOf(result.svg, 1)).toMatchObject({
      x: "0",
      y: "20",
      width: "120",
      height: "60",
    });
    expect(attrsOf(result.svg, 2)).toMatchObject({
      cx: "200",
      cy: "60",
      rx: "20",
      ry: "10",
    });
    // 삼각형(노란 점 모양)은 점 차례 그대로 두 배 — 무게 상자 가운데(240, 130) 기준
    expect(attrsOf(shapes, 6).points).toBe("240 110 260 150 220 150");
    expect(attrsOf(result.svg, 6).points).toBe("240 90 280 170 200 170");
    expect(attrsOf(result.svg, 6)["data-shape"]).toBe("triangle");
    expect(result.applied).toEqual([
      "1번 사각형 크기 1.5배",
      "2번 타원 크기 0.5배",
      "6번 삼각형 크기 2배",
    ]);
  });

  it("reads the radius through a scaled group", () => {
    // 원의 반지름 10 이 scale(2) 안 — 그림에서는 20. 30 으로 하려면 원래 좌표 15
    const result = applyFigureEdits(shapes, [
      { op: "resize", target: 5, r: 30 },
    ]);
    expect(attrsOf(result.svg, 5).r).toBe("15");
    expect(result.applied).toEqual(["5번 원 반지름 20 → 30"]);
  });

  it.each([
    [
      { op: "resize", target: 4, scale: 1.2 },
      "4번 사각형: 크기 고정이라 모양을 바꾸지 않았습니다",
    ],
    [
      { op: "resize", target: 3, scale: 2 },
      "3번 선분: 원·타원·사각형·다각형만 크기를 바꿉니다",
    ],
    [
      { op: "resize", target: 1, r: 30 },
      "1번 사각형: 반지름은 원에만 바꿉니다",
    ],
    [{ op: "resize", target: 2, scale: 8 }, "2번 타원: 그림 밖으로 나갑니다"],
    [{ op: "resize", target: 1, scale: 1 }, "1번 사각형: 크기가 그대로입니다"],
  ])("explains why a size is not changed %#", (command, reason) => {
    const result = applyFigureEdits(shapes, [command]);
    expect(result.svg).toBe(shapes);
    expect(result.rejected).toEqual([reason]);
  });
});

describe("회전 — 편집기 «시계 90°»·«반시계 90°» 단추와 같은 함수", () => {
  it("turns the whole figure exactly like the editor's button, and widens the frame to show it", () => {
    const result = applyFigureEdits(tri, [
      { op: "rotate", targets: "all", direction: "cw" },
    ]);
    const button = rotateFigureSelection(tri, ids(tri), "cw");
    // 요소는 단추와 한 글자도 다르지 않다 — 다른 것은 틀(루트 viewBox)뿐
    expect(elementsXml(result.svg)).toEqual(elementsXml(button));
    expect(elementsXml(result.svg)).not.toEqual(elementsXml(tri));
    // 가로 286.654 × 세로 194.183 을 돌리면 세로로 길다 — 편집 화면에서 잘리지 않게 위아래로 넓힌다(원장님: 회전은 «틀을 넓혀 다 보이게»)
    const [x, y, w, h] = viewBoxOf(result.svg);
    expect(x).toBe(0);
    expect(w).toBe(286.654);
    expect(y).toBeLessThan(0);
    expect(y + h).toBeGreaterThan(194.183);
    const lines = figureObjects(result.svg).filter((o) => o.type === "line");
    for (const o of lines)
      for (const key of ["y1", "y2"])
        expect(Number(o.attrs[key])).toBeGreaterThanOrEqual(y);
    expect(result.applied).toEqual(["그림 전체 시계 90° 회전"]);
  });

  it("turns the listed elements together, labels upright", () => {
    const three = ids(tri).slice(0, 3);
    const result = applyFigureEdits(tri, [
      { op: "rotate", targets: [1, 2, 3], direction: "ccw" },
    ]);
    expect(elementsXml(result.svg)).toEqual(
      elementsXml(rotateFigureSelection(tri, three, "ccw")),
    );
    expect(result.applied).toEqual(["3개 요소 반시계 90° 회전"]);
    expect(
      applyFigureEdits(tri, [{ op: "rotate", targets: [2], direction: "cw" }])
        .applied,
    ).toEqual(["2번 선분 시계 90° 회전"]);
  });

  it.each([
    [
      tri.replace(
        'stroke-width="1.9"',
        'stroke-width="1.9" data-size-locked="true"',
      ),
      { op: "rotate", targets: "all", direction: "cw" },
      "그림 전체: 크기 고정한 요소가 있어 회전할 수 없습니다",
    ],
    [
      tri,
      { op: "rotate", targets: [4], direction: "cw" },
      "글자 A: 글자는 기울지 않습니다. 함께 돌릴 요소를 같이 고르세요",
    ],
    [
      tri,
      { op: "rotate", targets: [9], direction: "cw" },
      "9번: 그런 번호의 요소가 없습니다",
    ],
    [
      tri,
      { op: "rotate", targets: [1, 9], direction: "cw" },
      "2개 요소: 9번 — 그런 번호의 요소가 없습니다",
    ],
  ])("refuses what the button refuses %#", (svg, command, reason) => {
    const prepared = prepareFigureSvg(svg);
    const result = applyFigureEdits(prepared, [command]);
    expect(result.svg).toBe(prepared);
    expect(result.rejected).toEqual([reason]);
  });
});

describe("색칠 — 편집기 채우기 통과 같은 면", () => {
  it("shades triangle ABC with the same face the fill bucket makes", () => {
    const result = applyFigureEdits(tri, [
      { op: "fillRegion", at: ["A", "B", "C"] },
    ]);
    const bucket = bucketFill(tri, { x: 120, y: 120 });
    expect(bucket.notice).toBeUndefined();
    expect(normalized(result.svg)).toBe(normalized(bucket.svg));
    const [face] = added(tri, result.svg);
    expect(face.attrs.fill).toBe(DEFAULT_FACE_FILL);
    expect(isTiedFace(face)).toBe(true);
    expect(nameIn(result.svg, face.id)).toBe("면");
    expect(result.applied).toEqual(["삼각형 ABC 색칠"]);
  });

  it("takes a point inside and a colour, like one click of the bucket", () => {
    const result = applyFigureEdits(tri, [
      { op: "fillRegion", at: { x: 120, y: 120 }, color: "#ffe08a" },
    ]);
    expect(normalized(result.svg)).toBe(
      normalized(bucketFill(tri, { x: 120, y: 120 }, "#ffe08a").svg),
    );
    expect(result.applied).toEqual(["칸 색칠"]);
  });

  it("shades every cell of a divided triangle, and recolours a shaded one", () => {
    const median = addFigureObject(
      tri,
      "line",
      { x: 78.327, y: 26.807 },
      { x: 143.327, y: 176.807 },
    ).svg;
    const result = applyFigureEdits(median, [
      { op: "fillRegion", at: ["A", "B", "C"] },
      { op: "fillRegion", at: ["A", "B", "C"], color: "#cfe3ff" },
    ]);
    const faces = added(median, result.svg);
    expect(faces).toHaveLength(2);
    expect(
      faces.every((o) => isTiedFace(o) && o.attrs.fill === "#cfe3ff"),
    ).toBe(true);
    expect(result.applied).toEqual([
      "삼각형 ABC 색칠(면 2개)",
      "삼각형 ABC 색칠(색 변경)",
    ]);
  });

  it.each([
    [
      { op: "fillRegion", at: { x: 270, y: 20 } },
      "칸 색칠: 닫힌 영역이 아닙니다",
    ],
    [
      { op: "fillRegion", at: "A" },
      "칸 색칠: 선 위의 점이라 칠할 칸을 정할 수 없습니다",
    ],
    [
      {
        op: "fillRegion",
        at: ["A", "B", { x: 258.327, y: 26.807 }],
      },
      "삼각형 색칠: 닫힌 영역이 아닙니다",
    ],
    [
      // 칸(삼각형 ABC)의 안쪽 점을 품지만 칸보다 작은 삼각형 — 선이 두른 칸이 아니다
      {
        op: "fillRegion",
        at: [
          { x: 120, y: 150 },
          { x: 160, y: 150 },
          { x: 140, y: 175 },
        ],
      },
      "삼각형 색칠: 닫힌 영역이 아닙니다",
    ],
    [
      { op: "fillRegion", at: ["A", "B", "Q"] },
      "삼각형 ABQ 색칠: 점 이름 Q — 그림에서 찾지 못했습니다",
    ],
  ])("explains why nothing is shaded %#", (command, reason) => {
    const result = applyFigureEdits(tri, [command]);
    expect(result.svg).toBe(tri);
    expect(result.rejected).toEqual([reason]);
  });
});

describe("수선 — 발은 코드가 계산하고 직각 표시를 단다", () => {
  it("drops the perpendicular from A to BC with a right-angle mark and names the foot", () => {
    const result = applyFigureEdits(tri, [
      { op: "addPerpendicular", from: "A", onto: ["B", "C"], foot: "H" },
    ]);
    const news = added(tri, result.svg);
    const perpendicular = news.find((o) => o.type === "line")!;
    expect(perpendicular.attrs).toMatchObject({
      x1: "78.327",
      y1: "26.807",
      x2: "78.327",
      y2: "176.807",
    });
    const mark = news.find((o) => o.type === "path")!;
    // 엔진 직각 표시(ㄱ자, 한 변 22 × 0.55) — 편집기가 «직각»으로 읽고 «각» 묶음에 넣는다
    expect(mark.attrs.d).toBe("M 78.33 164.71 L 90.43 164.71 L 90.43 176.81");
    expect(mark.attrs["stroke-width"]).toBe("0.72");
    expect(nameIn(result.svg, mark.id)).toBe("직각");
    expect(groupOf(result.svg, mark.id)).toBe("각");
    expect(nameIn(result.svg, perpendicular.id)).toBe("선분");
    // 발 이름 H 는 BC 건너편 — 다음 요청이 «H» 로 가리킬 수 있다
    const foot = news.find((o) => o.type === "text")!;
    expect(foot.attrs["data-mj"]).toBe("H");
    expect(Number(foot.attrs.y)).toBeGreaterThan(176.807);
    expect(describeFigureForEdit(result.svg).names).toContainEqual({
      name: "H",
      x: 78.3,
      y: 176.8,
    });
    expect(result.applied).toEqual(["A에서 BC에 내린 수선 추가(발 H)"]);
    unchanged(tri, result.svg);
    // 발 이름 H 는 틀(높이 194.183) 아래로 삐져나간다 — 편집 화면에서 잘리지 않게 아래만 넓힌다(뒤집기와 같은 규칙)
    const [x, y, w, h] = viewBoxOf(result.svg);
    expect([x, y, w]).toEqual([0, 0, 286.654]);
    expect(h).toBeGreaterThan(Number(foot.attrs.y) + 8);
    // 틀 안이면 건드리지 않는다
    expect(
      viewBoxOf(
        applyFigureEdits(tri, [
          { op: "addPerpendicular", from: "C", onto: ["A", "B"] },
        ]).svg,
      ),
    ).toEqual([0, 0, 286.654, 194.183]);
  });

  it("draws the extension of BC dashed when the foot falls outside the segment", () => {
    const result = applyFigureEdits(obtuse, [
      { op: "addPerpendicular", from: "A", onto: ["B", "C"] },
    ]);
    const lines = added(obtuse, result.svg).filter((o) => o.type === "line");
    const extension = lines.find((o) => o.attrs["stroke-dasharray"])!;
    expect(extension.attrs).toMatchObject({
      x1: "85.648",
      y1: "166.807",
      x2: "25.648",
      y2: "166.807",
      "stroke-dasharray": "5 4",
    });
    const perpendicular = lines.find((o) => o !== extension)!;
    expect(perpendicular.attrs).toMatchObject({
      x1: "25.648",
      y1: "26.807",
      x2: "25.648",
      y2: "166.807",
    });
    expect(perpendicular.attrs["stroke-dasharray"]).toBeUndefined();
    const mark = added(obtuse, result.svg).find((o) => o.type === "path")!;
    expect(mark.attrs.d).toBe("M 25.65 154.71 L 37.75 154.71 L 37.75 166.81");
    expect(nameIn(result.svg, mark.id)).toBe("직각");
    expect(result.applied).toEqual(["A에서 BC에 내린 수선 추가(연장선 점선)"]);
  });

  it.each([
    [
      { op: "addPerpendicular", from: "B", onto: ["B", "C"] },
      "B에서 BC에 내린 수선 추가: 점이 그 직선 위에 있어 수선을 그을 수 없습니다",
    ],
    [
      { op: "addPerpendicular", from: "A", onto: ["B", "B"] },
      "A에서 BB에 내린 수선 추가: 직선의 두 점이 같습니다",
    ],
    [
      { op: "addPerpendicular", from: "Q", onto: ["B", "C"] },
      "Q에서 BC에 내린 수선 추가: 점 이름 Q — 그림에서 찾지 못했습니다",
    ],
  ])("explains why a perpendicular is not drawn %#", (command, reason) => {
    const result = applyFigureEdits(tri, [command]);
    expect(result.svg).toBe(tri);
    expect(result.rejected).toEqual([reason]);
  });

  it("does not draw a perpendicular that is already there", () => {
    const right = prepareFigureSvg(
      `<svg xmlns="${NS}" viewBox="0 0 300 240">${line(37, 26, 37, 206)}${line(37, 206, 277, 206)}${line(277, 206, 37, 26)}${label("A", 30, 24, 37, 26)}${label("B", 26, 212, 37, 206)}${label("C", 288, 212, 277, 206)}</svg>`,
    );
    const result = applyFigureEdits(right, [
      { op: "addPerpendicular", from: "A", onto: ["B", "C"] },
    ]);
    expect(result.svg).toBe(right);
    expect(result.rejected).toEqual([
      "A에서 BC에 내린 수선 추가: 수선이 이미 있습니다(1번 선분)",
    ]);
  });
});

describe("중점·교점 찍기 — 점 더하기와 같은 점", () => {
  const para = prepareFigureSvg(
    `<svg xmlns="${NS}" viewBox="0 0 260 150">${line(50, 20, 20, 120)}${line(20, 120, 200, 120)}${line(200, 120, 230, 20)}${line(230, 20, 50, 20)}${line(50, 20, 200, 120)}${line(20, 120, 230, 20)}${label("A", 44, 14, 50, 20)}${label("B", 12, 134, 20, 120)}${label("C", 208, 134, 200, 120)}${label("D", 238, 14, 230, 20)}</svg>`,
  );

  it("marks the midpoint M of BC with the same dot and label as addPoint", () => {
    const result = applyFigureEdits(tri, [
      { op: "addMidpoint", from: "B", to: "C", label: "M" },
    ]);
    const byHand = applyFigureEdits(tri, [
      { op: "addPoint", x: 143.327, y: 176.807, label: "M" },
    ]);
    expect(normalized(result.svg)).toBe(normalized(byHand.svg));
    expect(result.applied).toEqual(["BC의 중점 M 추가"]);
  });

  it("marks where the diagonals AC and BD cross", () => {
    const result = applyFigureEdits(para, [
      {
        op: "addIntersection",
        lines: [
          ["A", "C"],
          ["B", "D"],
        ],
        label: "O",
      },
    ]);
    const byHand = applyFigureEdits(para, [
      { op: "addPoint", x: 125, y: 70, label: "O" },
    ]);
    expect(normalized(result.svg)).toBe(normalized(byHand.svg));
    expect(result.applied).toEqual(["AC·BD의 교점 O 추가"]);
  });

  it.each([
    [
      {
        op: "addIntersection",
        lines: [
          ["A", "D"],
          ["B", "C"],
        ],
      },
      "AD·BC의 교점 추가: 두 직선이 평행합니다",
    ],
    [
      { op: "addMidpoint", from: "A", to: "A" },
      "AA의 중점 추가: 두 끝이 같은 점입니다",
    ],
  ])("explains why no point is marked %#", (command, reason) => {
    const result = applyFigureEdits(para, [command]);
    expect(result.svg).toBe(para);
    expect(result.rejected).toEqual([reason]);
  });
});
