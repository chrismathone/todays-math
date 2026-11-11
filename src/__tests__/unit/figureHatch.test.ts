import { describe, expect, it } from "vitest";
import {
  DEFAULT_FIGURE_HATCH,
  figureHatchOf,
  setFigureHatch,
} from "@/components/unified/figure-editor/figureHatch";
import {
  cleanFigureForSave,
  prepareFigureSvg,
} from "@/components/unified/figure-editor/figureSvgEditing";
import {
  copyFigureSelection,
  pasteFigureSelection,
} from "@/components/unified/figure-editor/figureClipboard";

/**
 * 도형 채우기에 빗금(원장님 2026-11-11 «채우기에 빗금으로 채우기 추가» — «빗금» 단추 하나 · 방향과 간격을
 * 고른다 · 바탕은 투명). 빗금은 그 도형만의 `<pattern>` 이고 도형은 `fill="url(#…)"` 로 가리킨다(화살촉과 같은 꼴).
 */
const figure = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360">
  <rect data-object-id="box" x="10" y="10" width="100" height="80" stroke="#111111" fill="#dddddd"/>
  <circle data-object-id="dot" cx="200" cy="100" r="30" stroke="#111111" fill="none"/>
</svg>`;
const doc = (svg: string) =>
  new DOMParser().parseFromString(svg, "image/svg+xml");
const fillOf = (svg: string, id: string) =>
  doc(svg).querySelector(`[data-object-id="${id}"]`)!.getAttribute("fill");

describe("빗금 채우기", () => {
  it("켜면 그 도형만의 패턴을 만들고 채우기가 그 패턴을 가리킨다 — 바탕은 투명", () => {
    const svg = setFigureHatch(figure, "box", {
      ...DEFAULT_FIGURE_HATCH,
      color: "#111111",
    });
    const fill = fillOf(svg, "box")!;
    expect(fill).toMatch(/^url\(#[\w.-]+\)$/);
    const pattern = doc(svg).getElementById(/#([\w.-]+)/.exec(fill)![1])!;
    expect(pattern.localName).toBe("pattern");
    expect(pattern.getAttribute("patternUnits")).toBe("userSpaceOnUse");
    expect(pattern.querySelector("rect")).toBeNull();
    expect(pattern.querySelectorAll("line")).toHaveLength(1);
    expect(figureHatchOf(svg, "box")).toEqual({
      ...DEFAULT_FIGURE_HATCH,
      color: "#111111",
    });
    expect(figureHatchOf(svg, "dot")).toBeNull();
  });

  it("방향(／ · ＼ · ×)과 간격(촘촘 · 보통 · 성김)과 색을 바꾸면 같은 패턴을 고친다", () => {
    const on = setFigureHatch(figure, "box", {
      direction: "right",
      gap: "normal",
      color: "#111111",
    });
    const id = /#([\w.-]+)/.exec(fillOf(on, "box")!)![1];
    const tile = (svg: string) =>
      Number(doc(svg).getElementById(id)!.getAttribute("width"));
    const cross = setFigureHatch(on, "box", {
      direction: "cross",
      gap: "fine",
      color: "#2255aa",
    });
    expect(/#([\w.-]+)/.exec(fillOf(cross, "box")!)![1]).toBe(id);
    expect(figureHatchOf(cross, "box")).toEqual({
      direction: "cross",
      gap: "fine",
      color: "#2255aa",
    });
    expect(
      doc(cross).getElementById(id)!.querySelectorAll("line"),
    ).toHaveLength(2);
    expect(tile(cross)).toBeLessThan(tile(on));
    const left = setFigureHatch(cross, "box", {
      direction: "left",
      gap: "wide",
      color: "#2255aa",
    });
    expect(tile(left)).toBeGreaterThan(tile(on));
    expect(doc(left).getElementById(id)!.getAttribute("patternTransform")).toBe(
      "rotate(-45)",
    );
    expect(doc(on).getElementById(id)!.getAttribute("patternTransform")).toBe(
      "rotate(45)",
    );
  });

  it("끄면 패턴을 지우고 빗금 색 그대로 보통 채우기로 돌아간다", () => {
    const on = setFigureHatch(figure, "box", {
      ...DEFAULT_FIGURE_HATCH,
      color: "#2255aa",
    });
    const off = setFigureHatch(on, "box", null);
    expect(fillOf(off, "box")).toBe("#2255aa");
    expect(doc(off).querySelector("pattern")).toBeNull();
    expect(figureHatchOf(off, "box")).toBeNull();
  });

  it("다시 열기 · 저장의 정화를 지나도 빗금이 남는다", () => {
    const on = setFigureHatch(figure, "box", {
      direction: "left",
      gap: "fine",
      color: "#111111",
    });
    const reopened = prepareFigureSvg(cleanFigureForSave(on));
    const box = doc(reopened).querySelector("rect[fill^='url']")!;
    const id = box.getAttribute("data-object-id")!;
    expect(figureHatchOf(reopened, id)).toEqual({
      direction: "left",
      gap: "fine",
      color: "#111111",
    });
  });

  it("붙여넣은 도형은 제 빗금을 따로 가진다 — 원본의 빗금을 바꿔도 따라 바뀌지 않는다", () => {
    const on = setFigureHatch(figure, "box", {
      ...DEFAULT_FIGURE_HATCH,
      color: "#111111",
    });
    const copied = copyFigureSelection(on, ["box"])!;
    const pasted = pasteFigureSelection(on, copied)!;
    const [copy] = pasted.ids;
    expect(fillOf(pasted.svg, copy)).not.toBe(fillOf(pasted.svg, "box"));
    const recolored = setFigureHatch(pasted.svg, "box", {
      ...DEFAULT_FIGURE_HATCH,
      color: "#cc0000",
    });
    expect(figureHatchOf(recolored, copy)?.color).toBe("#111111");
  });
});
