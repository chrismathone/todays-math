/**
 * 도형 편집기 «면 만들기»(트랙 4) 2단계 — 원문(SVG)을 고치는 쪽.
 * 채우기 통 · 묶음 안쪽 채우기 · 다각형 면 · 삼각형 · 노란 점 끌기 · 면이 선을 따라감 · 붙여넣기 뒤 열쇠.
 * 원문을 고치는 함수는 편집기와 같은 길(prepareFigureSvg → 고치기 → 문자열)을 탄다 — 되돌리기·저장이 같이 탄다.
 */
import { describe, expect, it } from "vitest";

import {
  addFigureTriangle,
  addPolygonFace,
  bucketFill,
  clearInnerFill,
  faceSourceObjects,
  faceTolerance,
  innerFillState,
  isTiedFace,
  moveShapeHandle,
  setInnerFill,
  shapeHandles,
  syncFigureFaces,
} from "@/components/unified/figure-editor/figureFaceEditing";
import { ringArea } from "@/components/unified/figure-editor/figureFaceGeometry";
import {
  DEFAULT_FACE_FILL,
  FACE_ATTR,
  FACE_SEED_ATTR,
} from "@/components/unified/figure-editor/figureFaceSources";
import { SHAPE_ATTR } from "@/components/unified/figure-editor/figureShapeAdjust";
import {
  copyFigureSelection,
  pasteFigureSelection,
  transformFigureSelection,
} from "@/components/unified/figure-editor/figureClipboard";
import {
  cleanFigureForSave,
  editFigureObject,
  figureObjects,
  prepareFigureSvg,
  SVG_NS,
} from "@/components/unified/figure-editor/figureSvgEditing";
import { objectName } from "@/components/unified/figure-editor/figureObjectNames";

const line = (x1: number, y1: number, x2: number, y2: number, extra = "") =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#111111" stroke-width="1.8"${extra}/>`;
// △ABC — A(120,20) B(20,200) C(260,200), AD 는 D(100,200)
const TRIANGLE =
  line(120, 20, 20, 200) + line(20, 200, 260, 200) + line(260, 200, 120, 20);
const svgOf = (body: string, viewBox = "0 0 480 360") =>
  prepareFigureSvg(`<svg xmlns="${SVG_NS}" viewBox="${viewBox}">${body}</svg>`);
const doc = (svg: string) =>
  new DOMParser().parseFromString(svg, "image/svg+xml");
const faces = (svg: string) => [...doc(svg).querySelectorAll(`[${FACE_ATTR}]`)];
const areaOf = (d: string) =>
  d
    .split("M")
    .map((part) => part.replace(/Z/g, "").replace(/L/g, " ").trim())
    .filter(Boolean)
    .map((part) => {
      const v = part.split(/\s+/).map(Number);
      return Math.abs(
        ringArea(v.flatMap((x, i) => (i % 2 ? [] : [{ x, y: v[i + 1] }]))),
      );
    })
    .reduce((a, b) => a + b, 0);
/** 문서 차례의 요소 이름 — 면이 선 앞에 들어갔는지 본다. */
const order = (svg: string) =>
  figureObjects(svg).map((o) =>
    o.attrs[FACE_ATTR] !== undefined ? "face" : o.type,
  );

describe("faceSourceObjects — 조상 변환·물려받은 선 색까지", () => {
  it("붙여넣은 묶음의 translate 와 <g stroke> 를 싣는다", () => {
    const svg = svgOf(
      `<g transform="translate(12 12)"><g stroke="#000"><line x1="0" y1="0" x2="10" y2="0"/></g></g>`,
    );
    const [o] = faceSourceObjects(svg);
    expect(o.parentMatrix).toEqual([1, 0, 0, 1, 12, 12]);
    expect(o.inheritedStroke).toBe("#000");
  });
});

describe("bucketFill — 채우기 통", () => {
  it("닫힌 칸을 누르면 선 앞(문서 차례)에 면이 생기고, 경계 선에 id 가 붙어 면이 그것을 가리킨다", () => {
    const svg = svgOf(TRIANGLE + `<text x="120" y="150">A</text>`);
    const result = bucketFill(svg, { x: 120, y: 150 });
    expect(result.notice).toBeUndefined();
    expect(order(result.svg)).toEqual(["face", "line", "line", "line", "text"]);
    const [face] = faces(result.svg);
    expect(face.localName).toBe("path");
    expect(face.getAttribute("fill")).toBe(DEFAULT_FACE_FILL);
    expect(face.getAttribute("stroke")).toBe("none");
    expect(face.getAttribute("fill-rule")).toBe("evenodd");
    expect(areaOf(face.getAttribute("d")!)).toBeCloseTo(21600, 6);
    const ids = [...doc(result.svg).querySelectorAll("line")].map((l) =>
      l.getAttribute("id"),
    );
    expect(ids.every((id) => /^e-/.test(id ?? ""))).toBe(true);
    expect(face.getAttribute(FACE_ATTR)!.split(" ").sort()).toEqual(
      [...ids].sort(),
    );
    expect(face.getAttribute(FACE_SEED_ATTR)).toMatch(/^[\d.]+ [\d.]+$/);
    expect(result.id).toBe(face.getAttribute("data-object-id"));
  });

  it("이미 칠한 칸을 다시 누르면 새 면 없이 그 면의 색만 바뀐다", () => {
    const first = bucketFill(svgOf(TRIANGLE), { x: 120, y: 150 });
    const second = bucketFill(first.svg, { x: 120, y: 150 }, "#f5e6b8");
    expect(faces(second.svg)).toHaveLength(1);
    expect(faces(second.svg)[0].getAttribute("fill")).toBe("#f5e6b8");
    expect(second.id).toBe(first.id);
  });

  it("바깥을 누르면 아무것도 안 만들고 «닫힌 영역이 아닙니다»", () => {
    const svg = svgOf(TRIANGLE);
    expect(bucketFill(svg, { x: 5, y: 5 })).toEqual({
      svg,
      notice: "닫힌 영역이 아닙니다",
    });
  });

  it("엔진 짜임(채움 묶음 · 선 묶음 · 글자 묶음) — 면은 루트 바로 아래, 선 묶음 앞에", () => {
    const svg = svgOf(
      `<g><path d="M0 0L5 0L5 5Z" fill="#f5e6b8" stroke="none"/></g><g>${TRIANGLE}</g><g><text x="0" y="0">A</text></g>`,
    );
    const result = bucketFill(svg, { x: 120, y: 150 });
    const root = doc(result.svg).documentElement;
    const kinds = [...root.children].map((child) =>
      child.hasAttribute(FACE_ATTR) ? "face" : child.localName,
    );
    expect(kinds).toEqual(["g", "face", "g", "g"]);
  });

  it("허용 오차는 그림 크기에 맞춘다(viewBox 긴 변의 0.4%)", () => {
    expect(faceTolerance(svgOf("", "0 0 480 360"))).toBeCloseTo(1.92, 6);
    expect(faceTolerance(svgOf("", "0 0 100 250"))).toBeCloseTo(1, 6);
  });
});

describe("syncFigureFaces — 면이 선을 따라간다", () => {
  it("경계 선을 옮기면(편집기의 translate) 면 경로가 따라 옮겨진다", () => {
    const filled = bucketFill(svgOf(TRIANGLE), { x: 120, y: 150 }).svg;
    const lines = figureObjects(filled).filter((o) => o.type === "line");
    const moved = transformFigureSelection(
      filled,
      lines.map((o) => ({ id: o.id, transform: "translate(30 0)" })),
    );
    const synced = syncFigureFaces(moved);
    const [face] = faces(synced.svg);
    expect(synced.changed).toEqual([face.getAttribute("data-object-id")]);
    const xs = face
      .getAttribute("d")!
      .match(/-?[\d.]+/g)!
      .map(Number)
      .filter((_, i) => i % 2 === 0);
    expect(Math.min(...xs)).toBeCloseTo(50, 6);
    expect(areaOf(face.getAttribute("d")!)).toBeCloseTo(21600, 6);
  });

  it("끝점을 고치면 새 칸을 따라가고, 고리가 끊기면 이전 면을 그대로 둔다", () => {
    const filled = bucketFill(svgOf(TRIANGLE), { x: 120, y: 150 }).svg;
    const [ab] = figureObjects(filled).filter((o) => o.type === "line");
    // A 를 (120,20) → (140,40) 로 — 세 선이 여전히 A 에서 만나려면 CA 도 옮겨야 한다. AB 만 옮기면 끊긴다.
    const broken = editFigureObject(filled, ab.id, { x1: "140", y1: "60" });
    const before = faces(filled)[0].getAttribute("d");
    expect(syncFigureFaces(broken)).toEqual({ svg: broken, changed: [] });
    expect(faces(broken)[0].getAttribute("d")).toBe(before);
    const [, , ca] = figureObjects(broken).filter((o) => o.type === "line");
    const rejoined = editFigureObject(broken, ca.id, { x2: "140", y2: "60" });
    const synced = syncFigureFaces(rejoined);
    expect(areaOf(faces(synced.svg)[0].getAttribute("d")!)).toBeCloseTo(
      Math.abs((20 - 140) * (200 - 60) - (260 - 140) * (200 - 60)) / 2,
      6,
    );
  });

  it("옮긴 요소가 면의 경계가 아니면 손대지 않는다", () => {
    const filled = bucketFill(svgOf(TRIANGLE + line(300, 300, 400, 300)), {
      x: 120,
      y: 150,
    }).svg;
    const stray = figureObjects(filled).find(
      (o) => o.type === "line" && o.attrs.x1 === "300",
    )!;
    const moved = editFigureObject(filled, stray.id, {
      transform: "translate(0 10)",
    });
    expect(syncFigureFaces(moved, [stray.id]).changed).toEqual([]);
  });
});

describe("묶음 안쪽 채우기", () => {
  it("닫힌 선 묶음 — 켜면 씨앗 없는 면(바깥 테두리), 색 바꾸기, 없애기", () => {
    const svg = svgOf(TRIANGLE + line(120, 20, 100, 200));
    const ids = figureObjects(svg).map((o) => o.id);
    expect(innerFillState(svg, ids)).toEqual({ ok: true });
    const on = setInnerFill(svg, ids, DEFAULT_FACE_FILL);
    const [face] = faces(on);
    expect(face.hasAttribute(FACE_SEED_ATTR)).toBe(false);
    expect(face.getAttribute(FACE_ATTR)!.split(" ")).toHaveLength(4);
    expect(areaOf(face.getAttribute("d")!)).toBeCloseTo(21600, 6);
    const lineIds = figureObjects(on)
      .filter((o) => o.type === "line")
      .map((o) => o.id);
    expect(innerFillState(on, lineIds)).toEqual({
      ok: true,
      faceId: face.getAttribute("data-object-id"),
      color: DEFAULT_FACE_FILL,
    });
    const recolored = setInnerFill(on, lineIds, "#d5e8f0");
    expect(faces(recolored)).toHaveLength(1);
    expect(faces(recolored)[0].getAttribute("fill")).toBe("#d5e8f0");
    expect(faces(clearInnerFill(recolored, lineIds))).toHaveLength(0);
  });

  it("닫히지 않은 묶음은 이유를 주고 아무것도 안 만든다 · 글자만이면 «선이 없습니다»", () => {
    const svg = svgOf(
      line(120, 20, 20, 200) +
        line(20, 200, 260, 200) +
        `<text x="0" y="0">A</text>`,
    );
    const [ab, bc, text] = figureObjects(svg).map((o) => o.id);
    expect(innerFillState(svg, [ab, bc])).toEqual({
      ok: false,
      reason: "닫힌 영역이 아닙니다",
    });
    expect(setInnerFill(svg, [ab, bc], DEFAULT_FACE_FILL)).toBe(svg);
    expect(innerFillState(svg, [text])).toEqual({
      ok: false,
      reason: "선이 없습니다",
    });
  });
});

describe("다각형 면 · 삼각형 · 노란 점", () => {
  it('다각형 도구의 면 — 따라가지 않는 면(data-face=""), 선 앞에', () => {
    const { svg, id } = addPolygonFace(svgOf(TRIANGLE), [
      { x: 10, y: 10 },
      { x: 60, y: 10 },
      { x: 30, y: 50 },
    ]);
    const [face] = faces(svg);
    expect(face.localName).toBe("polygon");
    expect(face.getAttribute(FACE_ATTR)).toBe("");
    expect(face.getAttribute("points")).toBe("10 10 60 10 30 50");
    expect(face.getAttribute("data-object-id")).toBe(id);
    expect(order(svg)[0]).toBe("face");
    expect(isTiedFace(figureObjects(svg)[0])).toBe(false);
  });

  it("삼각형 도구 — 상자 안의 이등변삼각형 다각형(data-shape=triangle), 노란 점은 꼭짓점", () => {
    const { svg, id } = addFigureTriangle(
      svgOf(""),
      { x: 10, y: 20 },
      { x: 110, y: 100 },
    );
    const [tri] = figureObjects(svg);
    expect(tri.id).toBe(id);
    expect(tri.type).toBe("polygon");
    expect(tri.attrs[SHAPE_ATTR]).toBe("triangle");
    expect(tri.attrs.points).toBe("60 20 110 100 10 100");
    expect(tri.attrs.fill).toBe("none");
    expect(objectName(tri)).toBe("삼각형");
    expect(shapeHandles(tri)!.map((h) => [h.key, !!h.adjust])).toEqual([
      ["corner-0", false],
      ["corner-1", false],
      ["corner-2", false],
      ["corner-3", false],
      ["adjust", true],
    ]);
    const moved = moveShapeHandle(svg, id, "adjust", { x: 10, y: 5 })!;
    expect(figureObjects(moved)[0].attrs.points).toBe("10 20 110 100 10 100");
  });

  it("옛 <rect> 의 노란 점 — 끌면 같은 번호의 평행사변형 다각형으로 바뀐다(서식 그대로)", () => {
    const svg = svgOf(
      `<rect x="10" y="20" width="100" height="50" stroke="#123456" stroke-width="2" fill="none" data-group="도형"/>`,
    );
    const [rect] = figureObjects(svg);
    expect(shapeHandles(rect)!.map((h) => h.key)).toEqual([
      "corner-0",
      "corner-1",
      "corner-2",
      "corner-3",
      "adjust",
    ]);
    expect(
      moveShapeHandle(svg, rect.id, "corner-2", { x: 0, y: 0 }),
    ).toBeNull();
    const skewed = moveShapeHandle(svg, rect.id, "adjust", { x: 90, y: 20 })!;
    const [poly] = figureObjects(skewed);
    expect(poly.id).toBe(rect.id);
    expect(poly.type).toBe("polygon");
    expect(poly.attrs[SHAPE_ATTR]).toBe("parallelogram");
    expect(poly.attrs.points).toBe("40 20 140 20 110 70 10 70");
    expect(poly.attrs.stroke).toBe("#123456");
    expect(poly.attrs["data-group"]).toBe("도형");
    expect(poly.attrs.x).toBeUndefined();
    expect(objectName(poly)).toBe("평행사변형");
    // 이제 모서리는 기울기를 지킨 채
    const resized = moveShapeHandle(skewed, rect.id, "corner-2", {
      x: 160,
      y: 120,
    })!;
    expect(figureObjects(resized)[0].attrs.points).toBe(
      "40 20 220 20 160 120 -20 120",
    );
  });

  it("둥근 사각형·표지 없는 다각형·면에는 노란 점이 없다", () => {
    const svg = svgOf(
      `<rect x="0" y="0" width="10" height="10" rx="3" stroke="#000" fill="none"/><polygon points="0 0 10 0 5 5" stroke="#000" fill="none"/>`,
    );
    for (const o of figureObjects(svg)) expect(shapeHandles(o)).toBeNull();
  });
});

describe("트랙 2 «엔진 흰 바탕 rect 걷기»와 맞물림", () => {
  // prepareFigureSvg 는 «루트 첫 그리는 자식 · 흰 채움 · 선 없음 · 전면 크기» rect 를 엔진 바탕으로 보고 지운다.
  // 면은 첫 잉크 앞(루트 첫 자식이 되기 쉽다)에 들어가고 흰색으로 칠할 수도 있다 — 그래도 지워지면 안 된다.
  const frame = `<rect x="0" y="0" width="480" height="360" stroke="#111111" stroke-width="1.8" fill="none"/>`;

  it("테두리 안을 흰색으로 채운 전면 크기 면(path)은 다시 열어도 남는다", () => {
    const filled = bucketFill(svgOf(frame), { x: 240, y: 180 }, "#ffffff");
    const root = doc(filled.svg).documentElement;
    const first = [...root.children][0];
    expect(first.hasAttribute(FACE_ATTR)).toBe(true);
    expect(first.getAttribute("fill")).toBe("#ffffff");
    expect(first.getAttribute("stroke")).toBe("none");
    expect(areaOf(first.getAttribute("d")!)).toBeCloseTo(480 * 360, 6);
    const reopened = prepareFigureSvg(cleanFigureForSave(filled.svg));
    expect(faces(reopened)).toHaveLength(1);
    expect(order(reopened)).toEqual(["face", "rect"]);
  });

  it("다각형 도구로 캔버스 전체를 흰색으로 덮은 면(polygon)도, 흰 사각형을 기울인 평행사변형도 남는다", () => {
    const whole = addPolygonFace(
      svgOf(""),
      [
        { x: 0, y: 0 },
        { x: 480, y: 0 },
        { x: 480, y: 360 },
        { x: 0, y: 360 },
      ],
      "#ffffff",
    ).svg;
    expect(faces(prepareFigureSvg(cleanFigureForSave(whole)))).toHaveLength(1);
    // 흰 사각형(선 있음)을 노란 점으로 기울이면 polygon — rect 가 아니므로 규칙 밖
    const white = svgOf(
      `<rect x="0" y="0" width="480" height="360" fill="#ffffff" stroke="#111111"/>`,
    );
    const [rect] = figureObjects(white);
    const skewed = moveShapeHandle(white, rect.id, "adjust", { x: 250, y: 0 })!;
    expect(
      figureObjects(prepareFigureSvg(cleanFigureForSave(skewed))).map(
        (o) => o.type,
      ),
    ).toEqual(["polygon"]);
  });
});

describe("저장·다시 열기 · 붙여넣기", () => {
  it("면·모양 표지는 저장하고 다시 열어도 남는다", () => {
    const filled = bucketFill(svgOf(TRIANGLE), { x: 120, y: 150 }).svg;
    const withTriangle = addFigureTriangle(
      filled,
      { x: 300, y: 20 },
      { x: 400, y: 100 },
    ).svg;
    const reopened = prepareFigureSvg(cleanFigureForSave(withTriangle));
    const [face] = faces(reopened);
    expect(face.getAttribute(FACE_ATTR)!.split(" ")).toHaveLength(3);
    expect(face.hasAttribute(FACE_SEED_ATTR)).toBe(true);
    expect(figureObjects(reopened).map((o) => objectName(o))).toEqual([
      "면",
      "선분",
      "선분",
      "선분",
      "삼각형",
    ]);
    // 다시 연 뒤에도 따라간다(열쇠는 저장되는 id 다 — data-object-id 는 열 때마다 새로 매긴다)
    const lines = figureObjects(reopened).filter((o) => o.type === "line");
    const moved = transformFigureSelection(
      reopened,
      lines.map((o) => ({ id: o.id, transform: "translate(0 20)" })),
    );
    expect(syncFigureFaces(moved).changed).toHaveLength(1);
  });

  it("면과 선을 같이 붙여넣으면 새 면은 새 선을 따라가고, 면만 붙여넣으면 따라가지 않는 면이 된다", () => {
    const filled = bucketFill(svgOf(TRIANGLE), { x: 120, y: 150 }).svg;
    const all = figureObjects(filled).map((o) => o.id);
    const pasted = pasteFigureSelection(
      filled,
      copyFigureSelection(filled, all)!,
    )!;
    const [original, copy] = faces(pasted.svg);
    const copyKeys = copy.getAttribute(FACE_ATTR)!.split(" ");
    expect(copyKeys.every((key) => /^paste-/.test(key))).toBe(true);
    expect(copyKeys).not.toEqual(original.getAttribute(FACE_ATTR)!.split(" "));
    // 붙여넣은 선을 옮기면 붙여넣은 면만 따라간다(붙여넣기 묶음의 translate 안에서도)
    const pastedLines = pasted.ids.filter(
      (id) =>
        figureObjects(pasted.svg).find((o) => o.id === id)!.type === "line",
    );
    const moved = transformFigureSelection(
      pasted.svg,
      pastedLines.map((id) => ({ id, transform: "translate(40 0)" })),
    );
    const synced = syncFigureFaces(moved);
    expect(synced.changed).toEqual([copy.getAttribute("data-object-id")]);
    const faceOnly = figureObjects(filled).find(
      (o) => o.attrs[FACE_ATTR] !== undefined,
    )!;
    const lone = pasteFigureSelection(
      filled,
      copyFigureSelection(filled, [faceOnly.id])!,
    )!;
    const loneFace = faces(lone.svg)[1];
    expect(loneFace.getAttribute(FACE_ATTR)).toBe("");
    expect(loneFace.hasAttribute(FACE_SEED_ATTR)).toBe(false);
  });
});
