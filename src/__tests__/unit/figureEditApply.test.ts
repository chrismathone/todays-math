import { describe, expect, it } from "vitest";
import {
  figureObjects,
  prepareFigureSvg,
  readFigureSvg,
} from "@/components/unified/figure-editor/figureSvgEditing";
import { describeFigureForEdit } from "@/components/unified/figure-editor/figureEditElements";
import { applyFigureEdits } from "@/components/unified/figure-editor/figureEditApply";
import { FigureEditFigureSchema } from "@/lib/dev-ai/figure-edit-contract";

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
      "곡선/경로",
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

  it("carries the role group the editor list shows", () => {
    const dotted = prepareFigureSvg(
      `<svg xmlns="${NS}" viewBox="0 0 200 200"><line x1="10" y1="10" x2="190" y2="10" stroke="#111"/><circle cx="50" cy="50" r="2.5" fill="#111"/></svg>`,
    );
    expect(describeFigureForEdit(dotted).elements[1]).toMatchObject({
      kind: "원",
      role: "점",
    });
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
});
