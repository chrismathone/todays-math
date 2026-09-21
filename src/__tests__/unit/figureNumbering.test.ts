/**
 * 도형 편집기 — **요소 번호 고정**. 원장님 2026-09-21: «순서를 바꿔도 요소 번호가 안바뀌게 고정시켜».
 *
 * 번호는 그리는 차례(DOM 차례)에서 떼어 내 **요소에 붙은 값**(`data-n`)이 된다. 번호를 쓰는 자리가 여럿이라
 * (화면 번호표 · 요소 목록 · 오른쪽 칸 제목 · AI 자료 목록 · AI 그림 번호표 · AI 결과 되짚기) 한 곳만 고치면
 * 화면과 AI 가 다른 번호를 본다 — 모두 `figureNumbers` 한 함수를 읽는다. 여기서는 순수 계산 쪽을 잠근다.
 * - 옛 그림(번호가 안 적힌 것)은 처음 열 때 **지금 차례대로** 1·2·3 — 오늘 보이던 번호와 같다.
 * - 새 요소는 **마지막으로 준 번호 다음**. 지운 번호는 **비워 둔다**(다시 쓰면 «요소 15»가 딴 것을 가리킨다).
 *   마지막으로 준 번호는 루트의 `data-n-last` 에 적어 둔다 — 맨 끝 번호를 지워도 다음 요소가 그 번호를 안 받는다.
 * - 지면·HWPX 로 나가는 그림(저장의 `dataUrl`)에는 번호가 **안 실린다** — 편집 원문(`svg`)에만.
 */
import { describe, expect, it } from "vitest";

import { applyFigureEdits } from "@/components/unified/figure-editor/figureEditApply";
import { describeFigureForEdit } from "@/components/unified/figure-editor/figureEditElements";
import {
  copyFigureSelection,
  pasteFigureSelection,
  removeFigureSelection,
} from "@/components/unified/figure-editor/figureClipboard";
import { createFigureSaveResult } from "@/components/unified/figure-editor/figureDocument";
import { renumberAutoGroups } from "@/components/unified/figure-editor/figureObjectGroups";
import { orderFigureSelection } from "@/components/unified/figure-editor/figureOrder";
import {
  addFigureObject,
  cleanFigureForSave,
  figureNumbers,
  figureObjects,
  numberFigureObjects,
  prepareFigureSvg,
  SVG_NS,
  withoutFigureNumbers,
} from "@/components/unified/figure-editor/figureSvgEditing";
import { svgFromImage } from "@/components/unified/figure-editor/figureDocument";

const figure = (body: string) =>
  prepareFigureSvg(
    `<svg xmlns="${SVG_NS}" viewBox="0 0 480 360">${body}</svg>`,
  );
const read = (svg: string) =>
  new DOMParser().parseFromString(svg, "image/svg+xml");
/** 요소 종류 → 번호 — 그리는 차례와 무관하게 «무엇이 몇 번인가». */
const numbered = (svg: string) => {
  const numbers = figureNumbers(svg);
  return Object.fromEntries(
    figureObjects(svg).map((o) => [kindOf(o), numbers.get(o.id)]),
  );
};
const kindOf = (o: { type: string; attrs: Record<string, string> }) =>
  o.type === "line"
    ? Number(o.attrs.y1) === 300
      ? "x축"
      : "y축"
    : o.type === "path"
      ? "포물선"
      : o.type === "polygon"
        ? "삼각형"
        : o.type === "circle"
          ? "점"
          : o.type;
const idOf = (svg: string, kind: string) =>
  figureObjects(svg).find((o) => kindOf(o) === kind)!.id;

/** 원장님 화면 — 포물선 · x축 · y축 · 점 · 삼각형(요소 5). 번호가 안 적힌 옛 그림. */
const OLD = figure(
  `<path d="M 60 40 Q 240 560 420 40" stroke="#111" fill="none"/>` +
    `<line x1="20" y1="300" x2="460" y2="300" stroke="#111"/>` +
    `<line x1="240" y1="340" x2="240" y2="20" stroke="#111"/>` +
    `<circle cx="240" cy="300" r="2" fill="#111"/>` +
    `<polygon points="120,160 360,160 280,280" fill="#d9d9d9" stroke="#111"/>`,
);
const TODAY = { 포물선: 1, x축: 2, y축: 3, 점: 4, 삼각형: 5 };

describe("옛 그림 — 처음 열 때 지금 차례대로, 그 뒤로 고정", () => {
  it("번호가 안 적힌 그림은 오늘 보이던 번호(차례 + 1) 그대로 매겨진다", () => {
    expect(numbered(OLD)).toEqual(TODAY);
    const root = read(OLD).documentElement;
    expect(
      [...root.querySelectorAll("[data-object-id]")].map((n) =>
        n.getAttribute("data-n"),
      ),
    ).toEqual(["1", "2", "3", "4", "5"]);
    expect(root.getAttribute("data-n-last")).toBe("5");
  });
  it("저장하고 다시 열어도 같은 번호 — 편집 원문에 적혀 간다", () => {
    const back = orderFigureSelection(OLD, [idOf(OLD, "삼각형")], "back");
    const reopened = prepareFigureSvg(cleanFigureForSave(back));
    expect(figureObjects(reopened)[0].type).toBe("polygon");
    expect(numbered(reopened)).toEqual(TODAY);
  });
});

describe("순서를 바꿔도 번호는 그대로", () => {
  it("삼각형을 맨 뒤로 — 그리는 차례는 맨 먼저지만 번호는 5", () => {
    const back = orderFigureSelection(OLD, [idOf(OLD, "삼각형")], "back");
    expect(figureObjects(back)[0].type).toBe("polygon");
    expect(numbered(back)).toEqual(TODAY);
  });
  it("AI 자료 목록(n)도 같은 번호 — 번호 차례로 싣는다", () => {
    const back = orderFigureSelection(OLD, [idOf(OLD, "삼각형")], "back");
    const { elements } = describeFigureForEdit(back);
    expect(elements.map((e) => e.n)).toEqual([1, 2, 3, 4, 5]);
    expect(elements.find((e) => e.n === 5)?.kind).toBe("다각형");
  });
  it("AI 가 «5번»을 가리키면 맨 뒤로 보낸 뒤에도 삼각형이다", () => {
    const back = orderFigureSelection(OLD, [idOf(OLD, "삼각형")], "back");
    const result = applyFigureEdits(back, [{ op: "delete", target: 5 }]);
    expect(result.rejected).toEqual([]);
    expect(figureObjects(result.svg).map((o) => o.type)).not.toContain(
      "polygon",
    );
    expect(result.applied).toEqual(["5번 다각형 삭제"]);
    // 1번은 여전히 포물선이다(그리는 차례 첫째인 삼각형이 아니다)
    const first = applyFigureEdits(back, [{ op: "delete", target: 1 }]);
    expect(figureObjects(first.svg).map((o) => o.type)).not.toContain("path");
  });
  it("묶음 이름 A·B 도 번호 차례로 매긴다 — 순서를 바꿔도 이름이 안 뒤바뀐다", () => {
    const grouped = figure(
      `<line x1="0" y1="0" x2="9" y2="9" data-group="A"/>` +
        `<line x1="0" y1="5" x2="9" y2="5" data-group="A"/>` +
        `<circle cx="50" cy="50" r="5" data-group="B"/>` +
        `<circle cx="80" cy="50" r="5" data-group="B"/>`,
    );
    const b = figureObjects(grouped)
      .filter((o) => o.type === "circle")
      .map((o) => o.id);
    const back = orderFigureSelection(grouped, b, "back");
    expect(figureObjects(back)[0].type).toBe("circle");
    expect(renumberAutoGroups(back)).toBe(back);
  });
});

describe("새 요소 · 지운 요소 · 붙여넣기", () => {
  it("새 요소는 마지막 번호 다음", () => {
    const added = addFigureObject(OLD, "line", { x: 0, y: 0 }, { x: 9, y: 9 });
    const next = numberFigureObjects(added.svg);
    expect(figureNumbers(next).get(added.id)).toBe(6);
    expect(read(next).documentElement.getAttribute("data-n-last")).toBe("6");
  });
  it("번호를 매기기 전에도 같은 번호로 읽힌다 — 화면과 AI 가 같은 값을 본다", () => {
    const added = addFigureObject(OLD, "line", { x: 0, y: 0 }, { x: 9, y: 9 });
    expect(figureNumbers(added.svg).get(added.id)).toBe(6);
  });
  it("지운 번호는 비워 둔다 — 맨 끝 번호(5)를 지우고 더해도 새 요소는 6", () => {
    const removed = numberFigureObjects(
      removeFigureSelection(OLD, [idOf(OLD, "삼각형")]),
    );
    const added = addFigureObject(
      removed,
      "line",
      { x: 0, y: 0 },
      { x: 9, y: 9 },
    );
    const next = numberFigureObjects(added.svg);
    expect(figureNumbers(next).get(added.id)).toBe(6);
    // 남은 요소는 제 번호 그대로(새 선분은 종류 이름이 겹쳐 id 로 본다)
    for (const [kind, n] of Object.entries({
      포물선: 1,
      x축: 2,
      y축: 3,
      점: 4,
    }))
      expect(figureNumbers(next).get(idOf(OLD, kind))).toBe(n);
  });
  it("가운데 번호를 지우면 그 자리가 빈다 — 뒤 번호가 당겨지지 않는다", () => {
    const removed = numberFigureObjects(
      removeFigureSelection(OLD, [idOf(OLD, "y축")]),
    );
    expect(numbered(removed)).toEqual({
      포물선: 1,
      x축: 2,
      점: 4,
      삼각형: 5,
    });
  });
  it("붙여넣기·복제는 새 번호 — 원래 요소는 제 번호 그대로", () => {
    const source = copyFigureSelection(OLD, [idOf(OLD, "x축")])!;
    const pasted = pasteFigureSelection(OLD, source)!;
    const next = numberFigureObjects(pasted.svg);
    const numbers = figureNumbers(next);
    expect(numbers.get(pasted.ids[0])).toBe(6);
    expect(numbers.get(idOf(OLD, "x축"))).toBe(2);
    expect(new Set(numbers.values()).size).toBe(numbers.size);
  });
  it("번호가 겹치거나 틀린 원문 — 앞의 것이 제 번호를 갖고 뒤의 것은 새 번호", () => {
    const broken = figure(
      `<line x1="0" y1="0" x2="9" y2="9" data-n="2"/>` +
        `<line x1="0" y1="5" x2="9" y2="5" data-n="2"/>` +
        `<line x1="0" y1="7" x2="9" y2="7" data-n="abc"/>`,
    );
    expect([...figureNumbers(broken).values()]).toEqual([2, 3, 4]);
  });
  it("바꿀 것이 없으면 받은 원문 그대로(되돌리기 자리가 안 생긴다)", () => {
    expect(numberFigureObjects(OLD)).toBe(OLD);
  });
});

describe("지면·HWPX 로 나가는 그림에는 번호가 안 실린다", () => {
  it("저장 결과 — 편집 원문(svg)에는 남고 그림(dataUrl)에는 없다", () => {
    const saved = createFigureSaveResult(OLD, OLD);
    expect(saved.svg).toContain('data-n="5"');
    const image = svgFromImage(saved.dataUrl)!;
    expect(image).not.toMatch(/data-n(?:-last)?=/);
  });
  it("withoutFigureNumbers 는 번호 둘만 걷는다", () => {
    const stripped = withoutFigureNumbers(OLD);
    expect(stripped).not.toMatch(/data-n(?:-last)?=/);
    expect(stripped).toContain("data-object-id");
  });
});
