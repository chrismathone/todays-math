import { describe, expect, it } from "vitest";
import {
  figureNumbers,
  figureObjects,
  prepareFigureSvg,
  readFigureSvg,
  setFigureGroup,
} from "@/components/unified/figure-editor/figureSvgEditing";
import { describeFigureForEdit } from "@/components/unified/figure-editor/figureEditElements";
import { applyFigureEdits } from "@/components/unified/figure-editor/figureEditApply";
import { FigureEditFigureSchema } from "@/lib/dev-ai/figure-edit-contract";
import {
  addFigureTriangle,
  bucketFill,
} from "@/components/unified/figure-editor/figureFaceEditing";
import {
  figureAngleKinds,
  groupFigureObjects,
} from "@/components/unified/figure-editor/figureObjectGroups";
import { flipFigureCurve } from "@/components/unified/figure-editor/figureFlip";
import { buildFigureEditPrompt } from "@/lib/dev-ai/figure-edit-prompt";

/**
 * «요청대로 고치기»(원장님 2026-09-19) — AI 가 돌려준 수정 명령을 **지금 그림에** 편집기의 기존 편집 함수로 적용한다.
 * 명령에 없는 요소는 건드리지 않고, 크기 고정 요소는 모양을 바꾸지 않으며, 무엇을 바꿨는지 한 줄로 알린다.
 * 번호는 편집기 번호(요소 목록·그림 위 번호)와 같다 — `figureObjects` 차례 + 1.
 */
const NS = "http://www.w3.org/2000/svg";
const LABEL =
  'font-size="16.8" text-anchor="middle" fill="#111111" font-family="Cambria Math, serif"';
// 도형 엔진 v2 출력과 같은 짜임(삼각형 ABC · 직각 표시 · 라벨 넷 — 라벨은 data-px/py 로 꼭짓점을 적어 둔다)
const source = prepareFigureSvg(
  `<svg xmlns="${NS}" viewBox="0 0 300 240">
  <g>
    <line x1="37" y1="26" x2="37" y2="206" stroke="#111111" stroke-width="1.9"/>
    <line x1="37" y1="206" x2="277" y2="206" stroke="#111111" stroke-width="1.9"/>
    <line x1="277" y1="206" x2="37" y2="26" stroke="#111111" stroke-width="1.9" data-size-locked="true"/>
  </g>
  <g><path d="M 37 194 L 49 194 L 49 206" fill="none" stroke="#111111" stroke-width="0.72"/></g>
  <g>
    <text x="30" y="24" ${LABEL} data-px="37" data-py="26" data-mj="A">A</text>
    <text x="26" y="212" ${LABEL} data-px="37" data-py="206" data-mj="B">B</text>
    <text x="288" y="212" ${LABEL} data-px="277" data-py="206" data-mj="C">C</text>
    <text x="17" y="122" ${LABEL} data-px="17" data-py="116" data-mj="3">3</text>
  </g>
  <circle cx="150" cy="120" r="40" fill="none" stroke="#111111" data-size-locked="true"/>
  <g transform="translate(10 20)"><polygon points="200,40 240,40 220,70" fill="none" stroke="#111111"/></g>
</svg>`,
);
const ids = figureObjects(source).map((o) => o.id);
const node = (svg: string, id: string) =>
  [...readFigureSvg(svg).querySelectorAll("[data-object-id]")].find(
    (el) => el.getAttribute("data-object-id") === id,
  );
const xml = (svg: string, id: string) => {
  const el = node(svg, id);
  return el ? new XMLSerializer().serializeToString(el) : undefined;
};
const attr = (svg: string, n: number, name: string) =>
  node(svg, ids[n - 1])?.getAttribute(name);
/** 명령이 가리키지 않은 요소는 한 글자도 안 바뀐다. */
const untouched = (after: string, targets: number[]) => {
  for (const [i, id] of ids.entries())
    if (!targets.includes(i + 1))
      expect(xml(after, id), `${i + 1}번 요소`).toBe(xml(source, id));
};

describe("요소 목록 — 편집기 번호와 같은 번호", () => {
  const figure = describeFigureForEdit(source);

  it("lists every element in editor order with its kind and key coordinates", () => {
    expect(FigureEditFigureSchema.safeParse(figure).success).toBe(true);
    expect(figure.viewBox).toEqual([0, 0, 300, 240]);
    expect(figure.elements.map((e) => e.n)).toEqual(ids.map((_, i) => i + 1));
    expect(figure.elements.map((e) => e.kind)).toEqual([
      "선분",
      "선분",
      "선분",
      "직각",
      "글자",
      "글자",
      "글자",
      "글자",
      "원",
      "다각형",
    ]);
    expect(figure.elements[0]).toMatchObject({
      points: [
        [37, 26],
        [37, 206],
      ],
      color: "#111111",
      width: 1.9,
    });
    expect(figure.elements[3].points).toEqual([
      [37, 194],
      [49, 194],
      [49, 206],
    ]);
    expect(figure.elements[4]).toMatchObject({ text: "A", points: [[30, 24]] });
    expect(figure.elements[8]).toMatchObject({
      points: [[150, 120]],
      r: 40,
      locked: true,
    });
    expect(figure.elements[2].locked).toBe(true);
  });

  it("reports coordinates in the figure's own space, through group transforms", () => {
    expect(figure.elements[9].points).toEqual([
      [210, 60],
      [250, 60],
      [230, 90],
    ]);
  });

  it("names points from their labels, not side lengths", () => {
    expect(figure.names).toEqual([
      { name: "A", x: 37, y: 26 },
      { name: "B", x: 37, y: 206 },
      { name: "C", x: 277, y: 206 },
    ]);
  });

  // 편집기 목록의 역할 어림은 직각 표시를 축 화살촉으로 읽어 직각삼각형 변을 «x축»·«y축»으로 묶는다(2026-09-19 브라우저 확인).
  // AI 에게는 틀릴 수 있는 어림을 싣지 않고, 사용자가 이름 붙인 묶음만 싣는다.
  it("carries only the groups the user named, not the role guess", () => {
    expect(
      describeFigureForEdit(source).elements.every((e) => e.role === undefined),
    ).toBe(true);
    const grouped = setFigureGroup(source, [ids[0], ids[1]], "밑변과 높이");
    expect(
      describeFigureForEdit(grouped)
        .elements.slice(0, 3)
        .map((e) => e.role),
    ).toEqual(["밑변과 높이", "밑변과 높이", undefined]);
  });
});

describe("명령별 적용", () => {
  it("deletes only the named element", () => {
    const result = applyFigureEdits(source, [{ op: "delete", target: 2 }]);
    expect(figureObjects(result.svg)).toHaveLength(ids.length - 1);
    expect(node(result.svg, ids[1])).toBeUndefined();
    untouched(result.svg, [2]);
    expect(result.applied).toEqual(["2번 선분 삭제"]);
    expect(result.summary).toBe("2번 선분 삭제");
  });

  it("moves an element in figure units and says where", () => {
    const result = applyFigureEdits(source, [
      { op: "move", target: 5, dx: 0, dy: -10 },
    ]);
    expect(attr(result.svg, 5, "transform")).toBe("translate(0 -10)");
    untouched(result.svg, [5]);
    expect(result.summary).toBe("글자 A 위로 이동");
  });

  it("moves through a scaled group by the same on-figure distance", () => {
    const scaled = prepareFigureSvg(
      `<svg xmlns="${NS}" viewBox="0 0 300 240"><g transform="scale(2)"><line x1="10" y1="10" x2="60" y2="10" stroke="#111" transform="rotate(0)"/></g></svg>`,
    );
    const id = figureObjects(scaled)[0].id;
    const result = applyFigureEdits(scaled, [
      { op: "move", target: 1, dx: 10, dy: 6 },
    ]);
    expect(node(result.svg, id)?.getAttribute("transform")).toBe(
      "translate(5 3) rotate(0)",
    );
    expect(result.summary).toBe("1번 선분 오른쪽 아래로 이동");
  });

  it("changes a label's text", () => {
    const result = applyFigureEdits(source, [
      { op: "text", target: 6, text: "D" },
    ]);
    expect(attr(result.svg, 6, "data-mj")).toBe("D");
    expect(node(result.svg, ids[5])?.textContent).toBe("D");
    untouched(result.svg, [6]);
    expect(result.summary).toBe("글자 B → D");
  });

  it("changes format with the editor's own values", () => {
    const result = applyFigureEdits(source, [
      { op: "style", target: 2, dashed: true, color: "#d00000", width: 2.5 },
      { op: "style", target: 9, fill: "#eeeeee" },
      { op: "style", target: 5, color: "#0000ff", fontSize: 20 },
    ]);
    expect(attr(result.svg, 2, "stroke-dasharray")).toBe("5 4");
    expect(attr(result.svg, 2, "stroke")).toBe("#d00000");
    expect(attr(result.svg, 2, "stroke-width")).toBe("2.5");
    // 크기 고정 요소도 서식은 바꾼다(글자 크기·선 두께는 서식 — figureSizeLock.ts)
    expect(attr(result.svg, 9, "fill")).toBe("#eeeeee");
    // 글자 색은 fill 이다(편집기 색 칸과 같다)
    expect(attr(result.svg, 5, "fill")).toBe("#0000ff");
    expect(attr(result.svg, 5, "font-size")).toBe("20");
    untouched(result.svg, [2, 5, 9]);
    expect(result.applied).toEqual([
      "2번 선분 서식 변경(점선·색·두께)",
      "9번 원 서식 변경(채우기)",
      "글자 A 서식 변경(색·글자 크기)",
    ]);
    const solid = applyFigureEdits(result.svg, [
      { op: "style", target: 2, dashed: false },
    ]);
    expect(attr(solid.svg, 2, "stroke-dasharray")).toBeNull();
    expect(solid.summary).toBe("2번 선분 서식 변경(실선)");
  });

  it("moves an end point or a vertex, through group transforms", () => {
    const result = applyFigureEdits(source, [
      { op: "point", target: 2, vertex: 2, x: 250, y: 206 },
      { op: "point", target: 10, vertex: 1, x: 215, y: 65 },
    ]);
    expect(attr(result.svg, 2, "x2")).toBe("250");
    expect(attr(result.svg, 2, "x1")).toBe("37");
    expect(attr(result.svg, 10, "points")).toBe("205 45 240 40 220 70");
    untouched(result.svg, [2, 10]);
    expect(result.applied).toEqual([
      "2번 선분 끝점 이동",
      "10번 다각형 꼭짓점 1 이동",
    ]);
  });

  it("adds a segment between named points", () => {
    const result = applyFigureEdits(source, [
      { op: "addLine", from: "A", to: "C", dashed: true },
      { op: "addLine", from: { x: 37, y: 206 }, to: "C", arrow: true },
    ]);
    const added = figureObjects(result.svg).slice(ids.length);
    expect(added).toHaveLength(2);
    expect(added[0].attrs).toMatchObject({
      x1: "37",
      y1: "26",
      x2: "277",
      y2: "206",
      "stroke-dasharray": "5 4",
    });
    expect(added[1].attrs["marker-end"]).toMatch(/^url\(#/);
    untouched(result.svg, []);
    expect(result.applied).toEqual(["선분 A–C 추가", "화살표 추가"]);
  });

  it("adds a label centred on the given point in the figure's label size", () => {
    const result = applyFigureEdits(source, [
      { op: "addText", text: "H", x: 100, y: 60 },
    ]);
    const [text] = figureObjects(result.svg).slice(ids.length);
    expect(text.type).toBe("text");
    expect(text.attrs).toMatchObject({
      x: "100",
      y: "60",
      "data-mj": "H",
      "text-anchor": "middle",
      "dominant-baseline": "central",
      "font-size": "16.8",
    });
    expect(result.summary).toBe("글자 H 추가");
  });

  it("adds a dot with an optional name", () => {
    const result = applyFigureEdits(source, [
      { op: "addPoint", x: 100, y: 60, label: "H" },
      { op: "addPoint", x: 120, y: 60 },
    ]);
    const added = figureObjects(result.svg).slice(ids.length);
    expect(added.map((o) => o.type)).toEqual(["circle", "text", "circle"]);
    expect(added[0].attrs).toMatchObject({
      cx: "100",
      cy: "60",
      r: "3",
      fill: "#111111",
    });
    expect(added[0].attrs.stroke).toBeUndefined();
    expect(added[1].attrs["data-mj"]).toBe("H");
    expect(result.applied).toEqual(["점 H 추가", "점 추가"]);
  });
});

describe("검증 — 적용 못 한 명령은 이유와 함께", () => {
  it("rejects a number the editor does not show", () => {
    const result = applyFigureEdits(source, [{ op: "delete", target: 99 }]);
    expect(result.svg).toBe(source);
    expect(result.applied).toEqual([]);
    expect(result.rejected).toEqual(["99번: 그런 번호의 요소가 없습니다"]);
    expect(result.summary).toBe("바꾼 것 없음");
  });

  it.each([
    [
      { op: "addText", text: "H", x: 1000, y: 60 },
      "글자 H 추가: 좌표가 그림 밖입니다",
    ],
    [{ op: "addPoint", x: 10, y: -500 }, "점 추가: 좌표가 그림 밖입니다"],
    [
      { op: "move", target: 1, dx: 400, dy: 0 },
      "1번 선분: 옮기는 거리가 그림보다 큽니다",
    ],
    [
      { op: "point", target: 1, vertex: 1, x: 37, y: 900 },
      "1번 선분: 좌표가 그림 밖입니다",
    ],
    [
      { op: "addLine", from: "A", to: { x: -999, y: 0 } },
      "선분 추가: 좌표가 그림 밖입니다",
    ],
  ])("rejects out-of-figure coordinates %#", (command, reason) => {
    const result = applyFigureEdits(source, [command]);
    expect(result.svg).toBe(source);
    expect(result.rejected).toEqual([reason]);
  });

  it("refuses to change the shape of a size-locked element but still moves it", () => {
    const result = applyFigureEdits(source, [
      { op: "point", target: 3, vertex: 1, x: 250, y: 206 },
      { op: "move", target: 3, dx: 5, dy: 0 },
    ]);
    expect(attr(result.svg, 3, "x1")).toBe("277");
    expect(attr(result.svg, 3, "transform")).toBe("translate(5 0)");
    expect(result.rejected).toEqual([
      "3번 선분: 크기 고정이라 모양을 바꾸지 않았습니다",
    ]);
    expect(result.applied).toEqual(["3번 선분 오른쪽으로 이동"]);
  });

  it.each([
    [{ op: "text", target: 1, text: "B" }, "1번 선분: 글자 요소가 아닙니다"],
    [
      { op: "point", target: 9, vertex: 1, x: 10, y: 10 },
      "9번 원: 옮길 꼭짓점이 없습니다",
    ],
    [
      { op: "point", target: 2, vertex: 3, x: 10, y: 10 },
      "2번 선분: 꼭짓점은 2개뿐입니다",
    ],
    [
      { op: "style", target: 5, fill: "#eeeeee" },
      "글자 A: 채우기는 도형에만 바꿉니다",
    ],
    [
      { op: "style", target: 1, fontSize: 20 },
      "1번 선분: 글자 크기는 글자에만 바꿉니다",
    ],
    [
      { op: "style", target: 5, dashed: true },
      "글자 A: 선 두께·점선은 선에만 바꿉니다",
    ],
    [
      { op: "addLine", from: "Q", to: "A" },
      "선분 추가: 점 이름 Q — 그림에서 찾지 못했습니다",
    ],
    [{ op: "redraw", target: 1 }, "형식이 맞지 않는 명령"],
  ])("explains why a command does not fit %#", (command, reason) => {
    const result = applyFigureEdits(source, [command]);
    expect(result.svg).toBe(source);
    expect(result.rejected).toEqual([reason]);
  });

  it("reads every number against the figure as it was when the request was sent", () => {
    const result = applyFigureEdits(source, [
      { op: "delete", target: 2 },
      { op: "move", target: 3, dx: 0, dy: 10 },
      { op: "text", target: 2, text: "X" },
    ]);
    // 2번을 지운 뒤에도 «3번»은 처음 그림의 3번(빗변)이다
    expect(attr(result.svg, 3, "transform")).toBe("translate(0 10)");
    expect(result.applied).toEqual(["2번 선분 삭제", "3번 선분 아래로 이동"]);
    expect(result.rejected).toEqual(["2번 선분: 앞 명령에서 지웠습니다"]);
    untouched(result.svg, [2, 3]);
  });

  it("returns one final figure for one undo, leaving the input as it was", () => {
    const before = source;
    const result = applyFigureEdits(source, [
      { op: "delete", target: 1 },
      { op: "move", target: 5, dx: 0, dy: -8 },
      { op: "addText", text: "H", x: 100, y: 60 },
    ]);
    expect(source).toBe(before);
    expect(typeof result.svg).toBe("string");
    expect(result.summary).toBe(
      "1번 선분 삭제 · 글자 A 위로 이동 · 글자 H 추가",
    );
  });

  // 원장님 2026-09-19 «항상 모든 화면이 일치하도록» — 결과 줄도 요소 목록·보낸 목록과 같은 이름(각 표시는 직각·예각·둔각)
  it("names an angle mark by its kind, like the editor list and the sent element list", () => {
    const result = applyFigureEdits(source, [
      { op: "style", target: 4, color: "#ff0000" },
      { op: "delete", target: 4 },
      { op: "addText", text: "$x^2$", x: 100, y: 60 },
    ]);
    expect(result.applied).toEqual([
      "4번 직각 서식 변경(색)",
      "4번 직각 삭제",
      "수식 x^2 추가",
    ]);
  });
});

// 트랙 4(면 만들기, 2026-09-19): 면은 선 뒤(문서 앞)에 들어간다 — 번호는 **새로** 받아 선 번호를 밀지 않는다
// (번호 고정, 원장님 2026-09-21 «순서를 바꿔도 요소 번호가 안바뀌게»; 전에는 면이 1번이 되고 뒤가 하나씩 밀렸다) · 선을 따라가는 면은 스스로 옮기지 않는다
// · 삼각형·평행사변형(data-shape)은 노란 점으로 모양을 지킨다. 명령 적용이 표지 속성을 지우지 않는다(리드 2026-09-19).
describe("면 · 모양 · 표지 속성", () => {
  const withFace = bucketFill(
    prepareFigureSvg(
      `<svg xmlns="${NS}" viewBox="0 0 480 360"><line x1="120" y1="20" x2="20" y2="200" stroke="#111111" stroke-width="1.8"/><line x1="20" y1="200" x2="260" y2="200" stroke="#111111" stroke-width="1.8"/><line x1="260" y1="200" x2="120" y2="20" stroke="#111111" stroke-width="1.8" data-size-locked="true"/><text x="300" y="40" font-size="18" data-mj="A" data-text-bg="#ffff00">A</text></svg>`,
    ),
    { x: 130, y: 150 },
  ).svg;
  const withShape = addFigureTriangle(
    withFace,
    { x: 300, y: 220 },
    { x: 400, y: 320 },
  ).svg;
  const objects = figureObjects(withShape);
  // 번호는 요소에 붙은 고정 번호 — 편집기 목록·그림 위 번호표·AI 자료 목록과 같은 함수
  const numbers = figureNumbers(withShape);
  const n = (predicate: (o: (typeof objects)[number]) => boolean) =>
    numbers.get(objects.find(predicate)!.id)!;
  const numbered = (number: number) =>
    objects.find((o) => numbers.get(o.id) === number)!;
  const face = n((o) => o.attrs["data-face"] !== undefined);
  const shape = n((o) => o.attrs["data-shape"] === "triangle");
  const locked = n((o) => o.attrs["data-size-locked"] === "true");
  const label = n((o) => o.type === "text");

  it("names faces and shapes like the editor list", () => {
    const kind = (number: number) =>
      describeFigureForEdit(withShape).elements.find((e) => e.n === number)
        ?.kind;
    // 면은 선 뒤(문서 앞)에 들지만 번호는 새로 받는다 — 선 셋·글자 하나 다음인 5번. 선 번호는 안 밀린다.
    expect(figureObjects(withShape)[0].attrs["data-face"]).toBeDefined();
    expect(face).toBe(5);
    expect(n((o) => o.type === "line")).toBe(1);
    expect(kind(face)).toBe("면");
    expect(kind(shape)).toBe("삼각형");
  });

  it("does not move a face that follows its lines, nor bend a kept shape", () => {
    const result = applyFigureEdits(withShape, [
      { op: "move", target: face, dx: 10, dy: 0 },
      { op: "point", target: face, vertex: 1, x: 10, y: 10 },
      { op: "point", target: shape, vertex: 1, x: 310, y: 230 },
    ]);
    expect(result.svg).toBe(withShape);
    expect(result.rejected).toEqual([
      `${face}번 면: 선을 따라가는 면은 선을 옮기면 따라옵니다`,
      `${face}번 면: 선을 따라가는 면은 선을 옮기면 따라옵니다`,
      `${shape}번 삼각형: 모양을 지키는 도형이라 꼭짓점을 따로 옮기지 않았습니다`,
    ]);
  });

  it("keeps size lock, face, text background and shape marks through every edit", () => {
    const result = applyFigureEdits(withShape, [
      { op: "style", target: face, fill: "#ffcccc" },
      { op: "move", target: locked, dx: 0, dy: 4 },
      { op: "style", target: locked, width: 2.5 },
      { op: "text", target: label, text: "B" },
      { op: "move", target: label, dx: 3, dy: 0 },
      { op: "move", target: shape, dx: -5, dy: 0 },
      { op: "style", target: shape, dashed: true },
    ]);
    expect(result.rejected).toEqual([]);
    const after = figureObjects(result.svg);
    const byId = new Map(after.map((o) => [o.id, o]));
    const keep = (number: number, name: string) =>
      expect(
        byId.get(numbered(number).id)?.attrs[name],
        `${number}번 ${name}`,
      ).toBe(numbered(number).attrs[name]);
    keep(face, "data-face");
    keep(face, "data-face-seed");
    keep(locked, "data-size-locked");
    keep(locked, "id");
    keep(label, "data-text-bg");
    keep(shape, "data-shape");
    expect(byId.get(numbered(face).id)?.attrs.fill).toBe("#ffcccc");
  });
});

// 원장님 2026-09-19 «치수선 고치기가 제대로 안 되네.» — 평행사변형 ABCD, 밑변 BC 위쪽(안쪽)의 점선 치수 호와 «10».
// «선분 BC의 치수선을 선분 BC 아래로» 를 모델이 경로의 점을 하나씩 옮겨(`point`) 흉내 내다 호가 둘로 꺾였다.
// 도형 엔진 v2 와 같은 짜임 — 치수선은 값 자리에 틈을 낸 두 조각(`M 틈 Q … B  M 틈 Q … C`), 값 라벨은 곡선 위에 선다.
describe("뒤집기 — 치수 호를 반대쪽으로", () => {
  const DIM =
    'fill="none" stroke="#111111" stroke-width="0.72" stroke-dasharray="5 3" stroke-linecap="round"';
  const VALUE = `${LABEL} paint-order="stroke fill" stroke="#ffffff" stroke-width="5.6"`;
  const parallelogram = prepareFigureSvg(
    `<svg xmlns="${NS}" viewBox="0 0 300 240">
  <g>
    <line x1="80" y1="40" x2="280" y2="40" stroke="#111111" stroke-width="1.9"/>
    <line x1="280" y1="40" x2="240" y2="200" stroke="#111111" stroke-width="1.9"/>
    <line x1="240" y1="200" x2="40" y2="200" stroke="#111111" stroke-width="1.9"/>
    <line x1="40" y1="200" x2="80" y2="40" stroke="#111111" stroke-width="1.9"/>
  </g>
  <g>
    <path d="M 124 186.358 Q 82 188.24 40 200 M 156 186.358 Q 198 188.24 240 200" ${DIM}/>
    <path d="M 40 200 Q 32.84 113.21 80 40" ${DIM}/>
  </g>
  <g>
    <text x="140" y="191.376" ${VALUE} data-mj="10">10</text>
    <text x="46.42" y="121.98" ${VALUE} data-mj="6">6</text>
    <text x="74" y="30" ${LABEL} data-px="80" data-py="40" data-mj="A">A</text>
    <text x="30" y="214" ${LABEL} data-px="40" data-py="200" data-mj="B">B</text>
    <text x="250" y="214" ${LABEL} data-px="240" data-py="200" data-mj="C">C</text>
    <text x="288" y="30" ${LABEL} data-px="280" data-py="40" data-mj="D">D</text>
  </g>
</svg>`,
  );
  const pids = figureObjects(parallelogram).map((o) => o.id);
  const unchanged = (after: string, targets: number[]) => {
    for (const [i, id] of pids.entries())
      if (!targets.includes(i + 1))
        expect(xml(after, id), `${i + 1}번 요소`).toBe(xml(parallelogram, id));
  };
  const at = (svg: string, n: number, name: string) =>
    node(svg, pids[n - 1])?.getAttribute(name);

  it("flips the dimension arc below BC, keeps B and C, and takes «10» to the mirrored place", () => {
    const result = applyFigureEdits(parallelogram, [{ op: "flip", target: 5 }]);
    expect(at(result.svg, 5, "d")).toBe(
      "M 124 213.642 Q 82 211.76 40 200 M 156 213.642 Q 198 211.76 240 200",
    );
    // 글자는 똑바로 선 채 옮긴다(원장님 항목 22) — 돌리거나 뒤집지 않는다. 곡선 위 가운데(140, 186)가 (140, 214)로.
    expect(at(result.svg, 7, "transform")).toBe("translate(0 28)");
    // 다른 치수의 값 «6» · 꼭짓점 이름 B·C 는 가까워도 딸린 글자가 아니다
    unchanged(result.svg, [5, 7]);
    expect(result.applied).toEqual([
      "5번 곡선/경로 반대쪽으로 뒤집기(글자 10 함께)",
    ]);
    expect(result.rejected).toEqual([]);
  });

  it("flips each dimension with its own value", () => {
    const result = applyFigureEdits(parallelogram, [{ op: "flip", target: 6 }]);
    expect(at(result.svg, 6, "d")).toMatch(/^M 40 200 Q [\d.]+ [\d.]+ 80 40$/);
    const [, cx] = at(result.svg, 6, "d")!.match(/Q ([\d.]+)/)!;
    // 바깥(왼쪽)으로 부풀던 호가 안쪽(오른쪽)으로
    expect(Number(cx)).toBeGreaterThan(60);
    expect(at(result.svg, 8, "transform")).toMatch(
      /^translate\([\d.]+ [-\d.]+\)$/,
    );
    unchanged(result.svg, [6, 8]);
  });

  // 겹친 치수 — BM 의 «5» 는 BC 곡선에도 가깝지만 제 곡선(BM)이 더 가깝다. BC 의 «10» 은 꼭대기 너머에 선다.
  it("leaves a value that sits nearer another curve", () => {
    const stacked = prepareFigureSvg(
      `<svg xmlns="${NS}" viewBox="0 0 300 300"><line x1="40" y1="200" x2="240" y2="200" stroke="#111111"/><path d="M 40 200 Q 90 172 140 200" ${DIM}/><path d="M 40 200 Q 140 144 240 200" ${DIM}/><text x="90" y="191.376" ${VALUE} data-mj="5">5</text><text x="140" y="155.376" ${VALUE} data-mj="10">10</text></svg>`,
    );
    const result = applyFigureEdits(stacked, [{ op: "flip", target: 3 }]);
    const after = figureObjects(result.svg);
    expect(after[3].attrs.transform).toBeUndefined();
    expect(after[4].attrs.transform).toBe("translate(0 100)");
    expect(result.applied).toEqual([
      "3번 곡선/경로 반대쪽으로 뒤집기(글자 10 함께)",
    ]);
  });

  // 2026-09-19 브라우저 확인 — 엔진 그림은 틀(viewBox)이 도형에 꼭 맞아, 아래로 뒤집은 «10» 이 편집 화면 밑에서 잘렸다.
  // 편집기는 틀만 보여 준다. 뒤집은 곡선·글자가 틀 밖으로 나가면 그만큼(+ 여백) 넓힌다 — 줄이지는 않는다.
  it("widens the figure frame when the flipped value would fall outside it", () => {
    // 도형 엔진 v2 가 실제로 그린 것(평행사변형 ABCD · BC 위쪽 치수 «10» — 스펙 side "right")
    const engine = prepareFigureSvg(
      `<svg viewBox="0 0 307.116 174.183" xmlns="${NS}">
  <rect width="307.116" height="174.183" fill="#ffffff" />
  <g>
    <line x1="78.327" y1="26.807" x2="28.327" y2="156.807" stroke="#111111" stroke-width="1.9" />
    <line x1="28.327" y1="156.807" x2="228.327" y2="156.807" stroke="#111111" stroke-width="1.9" />
    <line x1="228.327" y1="156.807" x2="278.327" y2="26.807" stroke="#111111" stroke-width="1.9" />
    <line x1="278.327" y1="26.807" x2="78.327" y2="26.807" stroke="#111111" stroke-width="1.9" />
  </g>
  <g>
    <path d="M 113.717 143.125 Q 72.522 144.916 31.327 156.807 M 142.937 143.125 Q 184.132 144.916 225.327 156.807" fill="none" stroke="#111111" stroke-width="0.72" stroke-dasharray="5 3" stroke-linecap="round" />
  </g>
  <g>
    <text x="128.327" y="148.183" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111" paint-order="stroke fill" stroke="#ffffff" stroke-width="5.6" stroke-linejoin="round" data-mj="10"><tspan font-style="normal">10</tspan></text>
    <text x="17.603" y="162.183" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111" data-px="28.327" data-py="156.807" data-mj="B"><tspan font-style="normal">B</tspan></text>
  </g>
</svg>`,
    );
    const result = applyFigureEdits(engine, [{ op: "flip", target: 5 }]);
    const after = figureObjects(result.svg);
    expect(after[4].attrs.d).toBe(
      "M 113.717 170.489 Q 72.522 168.698 31.327 156.807 M 142.937 170.489 Q 184.132 168.698 225.327 156.807",
    );
    expect(after[5].attrs.transform).toBe("translate(0 28)");
    const view = readFigureSvg(result.svg)
      .documentElement.getAttribute("viewBox")!
      .split(" ")
      .map(Number);
    // 가로·위는 그대로, 아래만 «10» 의 글자 상자(가운데 170.8 + 반 글자 8.4) + 여백까지
    expect(view.slice(0, 3)).toEqual([0, 0, 307.116]);
    expect(view[3]).toBeGreaterThan(179.2);
    expect(view[3]).toBeLessThan(195);
    // 틀 안에 있으면 건드리지 않는다
    const inside = applyFigureEdits(parallelogram, [{ op: "flip", target: 5 }]);
    expect(
      readFigureSvg(inside.svg).documentElement.getAttribute("viewBox"),
    ).toBe("0 0 300 240");
  });

  it("gives the same result from the editor's own flip function", () => {
    const direct = flipFigureCurve(parallelogram, pids[4]);
    expect("svg" in direct && direct.svg).toBe(
      applyFigureEdits(parallelogram, [{ op: "flip", target: 5 }]).svg,
    );
    expect("svg" in direct && direct.labelId).toBe(pids[6]);
    // 거절 규칙도 같은 함수 — 편집기 단추가 AI 명령과 같은 이유를 낸다
    expect(flipFigureCurve(parallelogram, pids[2])).toEqual({
      reason: "곡선·꺾은선만 뒤집습니다",
    });
  });

  it("flips a curve with no value label on its own", () => {
    const bare = prepareFigureSvg(
      `<svg xmlns="${NS}" viewBox="0 0 300 240"><path d="M 40 200 Q 140 172 240 200" ${DIM}/><text x="30" y="30" ${LABEL} data-mj="7">7</text></svg>`,
    );
    const result = applyFigureEdits(bare, [{ op: "flip", target: 1 }]);
    expect(figureObjects(result.svg)[0].attrs.d).toBe(
      "M 40 200 Q 140 228 240 200",
    );
    expect(figureObjects(result.svg)[1].attrs.transform).toBeUndefined();
    expect(result.applied).toEqual(["1번 곡선/경로 반대쪽으로 뒤집기"]);
  });

  it.each([
    [{ op: "flip", target: 3 }, "3번 선분: 곡선·꺾은선만 뒤집습니다"],
    [{ op: "flip", target: 7 }, "글자 10: 곡선·꺾은선만 뒤집습니다"],
  ])("explains why a flip does not fit %#", (command, reason) => {
    const result = applyFigureEdits(parallelogram, [command]);
    expect(result.svg).toBe(parallelogram);
    expect(result.rejected).toEqual([reason]);
  });

  it("does not flip an angle mark or a size-locked curve", () => {
    const withMarks = prepareFigureSvg(
      `<svg xmlns="${NS}" viewBox="0 0 300 240"><line x1="40" y1="200" x2="240" y2="200" stroke="#111111"/><line x1="40" y1="200" x2="140" y2="40" stroke="#111111"/><path d="M 62 200 A 22 22 0 0 0 51.66 181.34" fill="none" stroke="#111111" stroke-width="0.72"/><path d="M 40 150 Q 140 120 240 150" ${DIM} data-size-locked="true"/></svg>`,
    );
    const result = applyFigureEdits(withMarks, [
      { op: "flip", target: 3 },
      { op: "flip", target: 4 },
    ]);
    expect(result.svg).toBe(withMarks);
    expect(result.rejected).toEqual([
      "3번 예각: 각 표시는 뒤집지 않습니다",
      "4번 곡선/경로: 크기 고정이라 모양을 바꾸지 않았습니다",
    ]);
  });

  // 원장님 결과 그대로 — 적용 목록 첫 줄이 «7번 곡선/경로 꼭짓점 1 이동 · …». 틈 두 끝만 아래로 옮기고 조절점은 위에
  // 남아 B 쪽은 처지고 C 쪽은 솟는 두 조각이 됐다. 조용히 망가진 그림을 내지 않고, 그 곡선의 점 옮기기를 모두 거절한다.
  it("refuses point moves that bend the curve across its chord, and says why", () => {
    const result = applyFigureEdits(parallelogram, [
      { op: "point", target: 5, vertex: 1, x: 124, y: 213.64 },
      { op: "point", target: 5, vertex: 3, x: 156, y: 213.64 },
      { op: "move", target: 7, dx: 0, dy: 28 },
    ]);
    expect(at(result.svg, 5, "d")).toBe(at(parallelogram, 5, "d"));
    expect(result.rejected).toEqual([
      "5번 곡선/경로: 꼭짓점 1·3 이동 — 곡선이 현을 가로질러 꺾입니다. 적용하지 않았습니다(반대쪽으로는 뒤집기)",
    ]);
    expect(result.applied).toEqual(["글자 10 아래로 이동"]);
  });

  it("still moves a curve's point when the curve stays on one side", () => {
    const result = applyFigureEdits(parallelogram, [
      { op: "point", target: 5, vertex: 1, x: 124, y: 180 },
    ]);
    expect(at(result.svg, 5, "d")).toBe(
      "M 124 180 Q 82 188.24 40 200 M 156 186.36 Q 198 188.24 240 200",
    );
    expect(result.applied).toEqual(["5번 곡선/경로 꼭짓점 1 이동"]);
  });
});

// 원장님 2026-09-19 둘째 보고 — 삼각형 ABD, BD 위의 점 C, 선분 AC·BE, «96°» 글자는 C 왼쪽에 있으나 각 호가 없다.
// «각 ACB에 각 표시» 가 422 였다(각 표시를 더하는 명령이 없어 모델이 빈 명령을 냈다).
describe("각 표시 더하기", () => {
  const angleSource = prepareFigureSvg(
    `<svg xmlns="${NS}" viewBox="0 0 340 260">
  <g>
    <line x1="167.77" y1="50.93" x2="40" y2="220" stroke="#111111" stroke-width="1.9"/>
    <line x1="167.77" y1="50.93" x2="300" y2="220" stroke="#111111" stroke-width="1.9"/>
    <line x1="40" y1="220" x2="300" y2="220" stroke="#111111" stroke-width="1.9"/>
    <line x1="167.77" y1="50.93" x2="150" y2="220" stroke="#111111" stroke-width="1.9"/>
    <line x1="40" y1="220" x2="233.885" y2="135.465" stroke="#111111" stroke-width="1.9"/>
  </g>
  <g>
    <text x="168" y="40" ${LABEL} data-px="167.77" data-py="50.93" data-mj="A">A</text>
    <text x="30" y="236" ${LABEL} data-px="40" data-py="220" data-mj="B">B</text>
    <text x="150" y="240" ${LABEL} data-px="150" data-py="220" data-mj="C">C</text>
    <text x="310" y="236" ${LABEL} data-px="300" data-py="220" data-mj="D">D</text>
    <text x="244" y="128" ${LABEL} data-px="233.885" data-py="135.465" data-mj="E">E</text>
    <text x="128" y="205" ${LABEL} data-mj="96°">96°</text>
  </g>
</svg>`,
  );
  const angleIds = figureObjects(angleSource).map((o) => o.id);
  const viewBox = [0, 0, 340, 260];
  const arc = (d: string) => {
    expect(d).toMatch(
      /^M [-\d.]+ [-\d.]+ A [-\d.]+ [-\d.]+ 0 0 [01] [-\d.]+ [-\d.]+$/,
    );
    const v = d.match(/[-\d.]+/g)!.map(Number);
    return { p0: [v[0], v[1]], r: v[2], sweep: v[6], p1: [v[7], v[8]] };
  };

  it("draws the arc of angle ACB at C between CA and CB, like the engine's angle arc", () => {
    const result = applyFigureEdits(angleSource, [
      { op: "addAngle", at: "C", from: "A", to: "B" },
    ]);
    const objects = figureObjects(result.svg);
    expect(objects).toHaveLength(angleIds.length + 1);
    const added = objects[angleIds.length];
    expect(added.type).toBe("path");
    expect(added.attrs).toMatchObject({
      fill: "none",
      stroke: "#111111",
      "stroke-width": "0.72",
    });
    const { p0, r, sweep, p1 } = arc(added.attrs.d);
    expect(r).toBe(22);
    const C = [150, 220];
    // 호의 두 끝이 CA 위·CB 위, C 에서 반지름만큼
    const along = (p: number[], to: number[]) => {
      const ux = to[0] - C[0],
        uy = to[1] - C[1];
      return {
        distance: Math.hypot(p[0] - C[0], p[1] - C[1]),
        off:
          Math.abs((p[0] - C[0]) * uy - (p[1] - C[1]) * ux) /
          Math.hypot(ux, uy),
      };
    };
    expect(along(p0, [167.77, 50.93]).distance).toBeCloseTo(22, 1);
    expect(along(p0, [167.77, 50.93]).off).toBeLessThan(0.02);
    expect(along(p1, [40, 220]).distance).toBeCloseTo(22, 1);
    expect(along(p1, [40, 220]).off).toBeLessThan(0.02);
    // 작은 쪽 — C 를 중심으로 p0 → p1 을 도는 방향이 sweep 과 맞다(SVG: sweep 1 은 각이 커지는 쪽, 화면 시계 방향)
    const cross =
      (p0[0] - C[0]) * (p1[1] - C[1]) - (p0[1] - C[1]) * (p1[0] - C[0]);
    expect(cross > 0 ? 1 : 0).toBe(sweep);
    // 편집기가 이미 읽는 각 표시와 같은 모양 — 종류 판정 · «각» 묶음
    expect(figureAngleKinds(objects, viewBox).get(added.id)).toBe("둔각");
    const group = groupFigureObjects(objects, viewBox).find(
      (g) => g.name === "각",
    );
    expect(group?.ids).toContain(added.id);
    expect(result.applied).toEqual(["각 ACB 표시 추가(둔각)"]);
    for (const id of angleIds)
      expect(xml(result.svg, id)).toBe(xml(angleSource, id));
  });

  it("takes the size and weight of the angle marks already in the figure", () => {
    // 맨 위 source — B 에 직각 표시(한 변 12, 굵기 0.72)가 있다. 호 반지름은 엔진처럼 한 변 ÷ 0.55
    const result = applyFigureEdits(source, [
      { op: "addAngle", at: "A", from: "B", to: "C" },
    ]);
    const added = figureObjects(result.svg)[ids.length];
    expect(arc(added.attrs.d).r).toBeCloseTo(21.82, 2);
    expect(added.attrs["stroke-width"]).toBe("0.72");
    expect(result.applied).toEqual(["각 BAC 표시 추가(예각)"]);
  });

  it("draws a square corner for a right angle, which the editor reads as 직각", () => {
    const corner = prepareFigureSvg(
      `<svg xmlns="${NS}" viewBox="0 0 300 240"><line x1="50" y1="200" x2="250" y2="200" stroke="#111111" stroke-width="1.9"/><line x1="50" y1="200" x2="50" y2="20" stroke="#111111" stroke-width="1.9"/><text x="40" y="214" ${LABEL} data-px="50" data-py="200" data-mj="O">O</text><text x="260" y="214" ${LABEL} data-px="250" data-py="200" data-mj="X">X</text><text x="40" y="18" ${LABEL} data-px="50" data-py="20" data-mj="Y">Y</text></svg>`,
    );
    const result = applyFigureEdits(corner, [
      { op: "addAngle", at: "O", from: "X", to: "Y" },
    ]);
    const objects = figureObjects(result.svg);
    const added = objects.at(-1)!;
    expect(added.attrs.d).toBe("M 62.1 200 L 62.1 187.9 L 50 187.9");
    expect(figureAngleKinds(objects, [0, 0, 300, 240]).get(added.id)).toBe(
      "직각",
    );
    expect(result.applied).toEqual(["각 XOY 표시 추가(직각)"]);
  });

  it.each([
    [
      { op: "addAngle", at: "C", from: "A", to: "B", right: true },
      "각 ACB 표시 추가: 그림의 각이 96°라 직각 표시를 하지 않았습니다",
    ],
    [
      { op: "addAngle", at: "C", from: "B", to: "D" },
      "각 BCD 표시 추가: 두 변이 한 직선이라 각 표시를 하지 않았습니다",
    ],
    [
      { op: "addAngle", at: "C", from: "C", to: "B" },
      "각 CCB 표시 추가: 각의 두 변이 있어야 합니다",
    ],
    [
      { op: "addAngle", at: "Q", from: "A", to: "B" },
      "각 AQB 표시 추가: 점 이름 Q — 그림에서 찾지 못했습니다",
    ],
  ])("explains why an angle mark does not fit %#", (command, reason) => {
    const result = applyFigureEdits(angleSource, [command]);
    expect(result.svg).toBe(angleSource);
    expect(result.rejected).toEqual([reason]);
  });

  it("does not add a second mark on an angle that already has one", () => {
    const result = applyFigureEdits(source, [
      { op: "addAngle", at: "B", from: "A", to: "C" },
    ]);
    expect(result.svg).toBe(source);
    expect(result.rejected).toEqual([
      "각 ABC 표시 추가: 이미 각 표시가 있습니다(4번 직각)",
    ]);
  });
});

/**
 * 원장님 2026-09-21 확정 — «그룹 A라고 따로 AI에게 지시하지 않는 이상 항상 그룹은 신경쓰지 않도록» ·
 * «마찬가지. 요소도 «요소 15» 등으로 정확하게 지정하지 않는 이상 신경쓰지 않음».
 *
 * 번호와 묶음 이름은 **부를 때만 쓰는 손잡이**다. 그러니 묶어도 AI 가 보는 것이 **한 가지도 줄지 않아야 한다**:
 * 요소는 전부 제 번호로 실리고, 묶음 이름은 이미 있던 `role` 한 칸에 덤으로 얹힐 뿐이다
 * (계약 `figure-edit-contract.ts` 도 지시문 `figure-edit-prompt.ts` 도 넓히지 않았다).
 * 화면 번호표만 묶음마다 하나로 합친다 — 그쪽은 `figureObjectNumbers.ts` 의 시험이 지킨다.
 */
describe("묶어도 AI 는 요소를 그대로 가리킨다 (원장님 2026-09-21)", () => {
  const grouped = setFigureGroup(source, [ids[0], ids[1]], "A");
  const request = {
    provider: "claude" as const,
    action: "figure-edit" as const,
    grade: "중학교 1학년",
  };

  it("요소는 전부 제 번호로 실린다 — 묶기 전과 번호·종류가 같다", () => {
    const before = describeFigureForEdit(source).elements;
    const after = describeFigureForEdit(grouped).elements;
    expect(after).toHaveLength(before.length);
    expect(after.map((e) => [e.n, e.kind])).toEqual(
      before.map((e) => [e.n, e.kind]),
    );
  });

  it("묶음 이름은 role 한 칸으로 덤이다 — 나머지 칸은 한 글자도 안 바뀜다", () => {
    const before = describeFigureForEdit(source).elements;
    describeFigureForEdit(grouped).elements.forEach((element, i) => {
      const { role, ...rest } = element;
      expect(rest).toEqual(before[i]);
      expect(role).toBe(i < 2 ? "A" : undefined);
    });
  });

  it("묶음 속 요소 하나를 가리힌 명령은 그 요소에만 닿는다 — 묶음 동무는 안 끕려간다", () => {
    const moved = applyFigureEdits(grouped, [
      { op: "move", target: 1, dx: 5, dy: 0 },
    ]).svg;
    expect(xml(moved, ids[0])).not.toBe(xml(grouped, ids[0]));
    expect(xml(moved, ids[1])).toBe(xml(grouped, ids[1]));
    // 묶음 표시는 그대로 남는다
    expect(moved).toContain('data-group="A"');
  });

  it("번호를 대지 않은 맨 말 요청도 지금과 똑같이 나간다", () => {
    // 원장님이 «사다리꼴 상자를 …» 처럼 말로만 가리키는 길 — 묶어도 지시문이 줄지 않는다
    const ask = "사다리꼴 상자를 왼쪽으로 옮겨 주세요";
    const plain = buildFigureEditPrompt({
      ...request,
      figure: describeFigureForEdit(source),
      content: ask,
    });
    const withGroups = buildFigureEditPrompt({
      ...request,
      figure: describeFigureForEdit(grouped),
      content: ask,
    });
    // 묶어서 달라지는 것은 role 칸뿐이다 — 요청 글도 요소 번호도 그대로다
    expect(withGroups.split(',"role":"A"').join("")).toBe(plain);
    expect(withGroups).toContain(ask);
    // 번호를 대라고 시키지 않는다 — 글자 라벨도 그대로 실려 말로 찾을 수 있다
    expect(withGroups).toContain('"text":"A"');
  });
});
