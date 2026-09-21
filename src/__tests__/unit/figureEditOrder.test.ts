/**
 * AI «요청대로 고치기»의 순서 명령(`order`) 적용 — 원장님 2026-09-21 «Ai 명령으로 순서 조절도 가능하게해».
 * 편집기 «맨 앞으로·앞으로·뒤로·맨 뒤로» 단추와 **같은 함수**(`orderFigureSelection`)를 부른다 — 두 벌이면 한쪽만
 * 고쳐져 어긋난다. 번호는 고정이라(`figureNumbers`) «요소 5»는 맨 뒤로 보낸 뒤에도 요소 5다.
 */
import { describe, expect, it } from "vitest";

import { applyFigureEdits } from "@/components/unified/figure-editor/figureEditApply";
import {
  orderFigureSelection,
  type OrderBox,
} from "@/components/unified/figure-editor/figureOrder";
import {
  figureNumbers,
  figureObjects,
  prepareFigureSvg,
  SVG_NS,
} from "@/components/unified/figure-editor/figureSvgEditing";

const figure = (body: string) =>
  prepareFigureSvg(
    `<svg xmlns="${SVG_NS}" viewBox="0 0 480 360">${body}</svg>`,
  );
const types = (svg: string) => figureObjects(svg).map((o) => o.type);

/** 원장님 화면 — 포물선(1) · x축(2) · y축(3) · 점(4) · 채운 삼각형(5) — 삼각형이 y축을 덮는다. */
const OLD = figure(
  `<path d="M 60 40 Q 240 560 420 40" stroke="#111" fill="none"/>` +
    `<line x1="20" y1="300" x2="460" y2="300" stroke="#111"/>` +
    `<line x1="240" y1="340" x2="240" y2="20" stroke="#111"/>` +
    `<circle cx="16" cy="16" r="4" stroke="#111" fill="none"/>` +
    `<polygon points="120,160 360,160 240,300" fill="#d9d9d9" stroke="#111"/>`,
);

describe("«요소 5를 맨 뒤로»", () => {
  it("요소 5(삼각형)가 맨 먼저 그려진다 — 결과 줄은 번호와 이름", () => {
    const result = applyFigureEdits(OLD, [
      { op: "order", targets: [5], to: "back" },
    ]);
    expect(result.rejected).toEqual([]);
    expect(types(result.svg)).toEqual([
      "polygon",
      "path",
      "line",
      "line",
      "circle",
    ]);
    expect(result.applied).toEqual(["5번 다각형 맨 뒤로"]);
  });
  it("번호는 그대로 — 같은 요청의 뒤 명령도 «5번»으로 삼각형을 가리킨다", () => {
    const result = applyFigureEdits(OLD, [
      { op: "order", targets: [5], to: "back" },
      { op: "style", target: 5, fill: "#ffcccc" },
    ]);
    expect(result.rejected).toEqual([]);
    const triangle = figureObjects(result.svg)[0];
    expect(triangle.type).toBe("polygon");
    expect(triangle.attrs.fill).toBe("#ffcccc");
    expect(figureNumbers(result.svg).get(triangle.id)).toBe(5);
  });
  it("편집기 단추와 같은 함수 — 결과 원문이 똑같다", () => {
    const triangle = figureObjects(OLD).at(-1)!.id;
    for (const to of ["front", "forward", "backward", "back"] as const) {
      const fromAi = applyFigureEdits(OLD, [
        { op: "order", targets: [3], to },
      ]).svg;
      const y = figureObjects(OLD)[2].id;
      expect(fromAi, to).toBe(orderFigureSelection(OLD, [y], to));
    }
    expect(
      applyFigureEdits(OLD, [{ op: "order", targets: [5], to: "back" }]).svg,
    ).toBe(orderFigureSelection(OLD, [triangle], "back"));
  });
  it("이미 맨 뒤면 거절 — 단추가 꺼지는 이유 그대로", () => {
    const result = applyFigureEdits(OLD, [
      { op: "order", targets: [1], to: "back" },
    ]);
    expect(result.svg).toBe(OLD);
    expect(result.rejected).toEqual(["1번 곡선/경로: 이미 맨 뒤입니다"]);
  });
  it("없는 번호는 거절", () => {
    const result = applyFigureEdits(OLD, [
      { op: "order", targets: [9], to: "back" },
    ]);
    expect(result.rejected).toEqual(["9번: 그런 번호의 요소가 없습니다"]);
  });
});

describe("«한 칸»은 편집기가 잰 화면 상자로 — 단추와 같다", () => {
  const boxes = new Map<string, OrderBox>(
    figureObjects(OLD).map((o, i) => [
      o.id,
      [
        { minX: 60, minY: 40, maxX: 420, maxY: 300 },
        { minX: 20, minY: 299, maxX: 460, maxY: 301 },
        { minX: 239, minY: 20, maxX: 241, maxY: 340 },
        { minX: 11, minY: 11, maxX: 21, maxY: 21 },
        { minX: 120, minY: 160, maxX: 360, maxY: 300 },
      ][i],
    ]),
  );
  it("«뒤로» — 안 겹치는 점은 건너뛰고 y축 밑으로", () => {
    const result = applyFigureEdits(
      OLD,
      [{ op: "order", targets: [5], to: "backward" }],
      { boxes },
    );
    expect(types(result.svg)).toEqual([
      "path",
      "line",
      "polygon",
      "line",
      "circle",
    ]);
  });
  it("겹칠 것이 없으면 거절 — 단추 알림과 같은 말", () => {
    const result = applyFigureEdits(
      OLD,
      [{ op: "order", targets: [4], to: "forward" }],
      { boxes },
    );
    expect(result.svg).toBe(OLD);
    expect(result.rejected).toEqual(["4번 원: 앞에 겹친 요소가 없습니다"]);
  });
});

describe("묶음 속 요소를 가리키면 덩어리째", () => {
  // 사각(1) + 사각 안 선분(3)이 묶음 A — 사이에 원(2)이 끼어 떨어져 적혀 있다
  const grouped = figure(
    `<rect x="20" y="30" width="60" height="40" stroke="#111" fill="#eee" data-group="A"/>` +
      `<circle cx="300" cy="60" r="20" stroke="#111" fill="none"/>` +
      `<line x1="24" y1="50" x2="76" y2="50" stroke="#111" data-group="A"/>` +
      `<polygon points="200,200 260,200 230,250" fill="#ccc" stroke="#111"/>`,
  );
  it("«요소 1을 맨 앞으로» — 묶음 A 둘이 붙어서 맨 위, 속 차례 그대로", () => {
    const result = applyFigureEdits(grouped, [
      { op: "order", targets: [1], to: "front" },
    ]);
    expect(result.rejected).toEqual([]);
    expect(types(result.svg)).toEqual(["circle", "polygon", "rect", "line"]);
  });
  it("번호는 그대로 — 사각 1·원 2·선분 3·다각형 4", () => {
    const result = applyFigureEdits(grouped, [
      { op: "order", targets: [3], to: "back" },
    ]);
    const numbers = figureNumbers(result.svg);
    expect(
      figureObjects(result.svg).map((o) => [o.type, numbers.get(o.id)]),
    ).toEqual([
      ["rect", 1],
      ["line", 3],
      ["circle", 2],
      ["polygon", 4],
    ]);
  });
});
