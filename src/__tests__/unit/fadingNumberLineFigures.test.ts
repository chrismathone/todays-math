import { describe, expect, it } from "vitest";
import { CONCEPT_BLANK_BANK } from "@/lib/concept-blank/bank";
import { buildFadingConcepts } from "@/lib/fading/concepts";
import { fadingFigureMap } from "@/lib/fading/figures";
import { FADING_GROUPS } from "@/lib/fading/groups";
import { fadingNumberLineForProposition } from "@/lib/fading/numberLineFigures";

const concepts = buildFadingConcepts(
  CONCEPT_BLANK_BANK.concepts,
  FADING_GROUPS,
);
const figures = fadingFigureMap(concepts, CONCEPT_BLANK_BANK.figures);
function sample(id: string) {
  const concept = concepts.find((c) =>
    c.propositions.some((p) => p.id === id),
  )!;
  return {
    figure: figures[concept.id]!,
    proposition: concept.propositions.find((p) => p.id === id)!,
  };
}
function diagram(id: string) {
  const { figure, proposition } = sample(id);
  const selected = fadingNumberLineForProposition(figure, proposition);
  expect(selected, id).not.toBeNull();
  return new DOMParser().parseFromString(
    `<svg>${selected!.svg}</svg>`,
    "image/svg+xml",
  );
}
function xOf(svg: Document, value: number) {
  return Number(
    [...svg.querySelectorAll("text")]
      .find((text) => text.textContent === String(value))!
      .getAttribute("x"),
  );
}

describe("H-01 문장별 수직선의 수학적 의미", () => {
  it.each([
    ["e5-2-1-1-c1", true, "right", 3],
    ["e5-2-1-1-c2", true, "left", 3],
    ["e5-2-1-1-xc3", true, "right", 3],
    ["e5-2-1-1-xc4", true, "left", 3],
    ["e5-2-1-2-c1", false, "right", 3],
    ["e5-2-1-2-c2", false, "left", 3],
    ["e5-2-1-2-xc3", false, "right", 3],
    ["e5-2-1-2-xc4", false, "left", 3],
    ["e5-2-1-1-xc8", true, "right", 3],
    ["e5-2-1-2-xc8", false, "left", 3],
    ["e5-2-1-1-xc16", true, "right", 90],
    ["e5-2-1-1-xc6", true, "left", 3],
    ["e5-2-1-1-xc12", true, "right", 3],
    ["e5-2-1-1-xc13", true, "left", 3],
    ["e5-2-1-1-xc24", true, "right", 3],
    ["e5-2-1-1-xc25", true, "left", 3],
    ["e5-2-1-2-xc5", false, "right", 3],
    ["e5-2-1-2-xc21", false, "right", 3],
    ["e5-2-1-2-xc22", false, "left", 3],
  ] as const)(
    "%s: 점 포함·방향·실제 기준값",
    (id, closed, direction, boundary) => {
      const svg = diagram(id);
      const points = svg.querySelectorAll("circle");
      expect(points).toHaveLength(1);
      expect(Number(points[0]!.getAttribute("cx"))).toBe(xOf(svg, boundary));
      expect(points[0]!.getAttribute("fill")).toBe(
        closed ? "#1F1F23" : "white",
      );
      const path = svg
        .querySelector('path[stroke="#A57F00"]')!
        .getAttribute("d")!;
      const [, start, end] = /^M([\d.]+) 61H([\d.]+)/.exec(path)!;
      if (direction === "right") {
        expect(Number(start)).toBe(xOf(svg, boundary));
        expect(Number(end)).toBeGreaterThan(xOf(svg, boundary));
        expect(path).toContain(`L${end} 61`);
      } else {
        expect(Number(start)).toBeLessThan(xOf(svg, boundary));
        expect(Number(end)).toBe(xOf(svg, boundary));
        expect(path).toContain(`L${start} 61`);
      }
    },
  );

  it.each([
    ["e5-2-1-1-xc9", 3, true, 7, true],
    ["e5-2-1-1-xc14", 2, true, 5, true],
    ["e5-2-1-1-xc11", 2, true, 5, true],
    ["e5-2-1-1-xc20", 2, true, 5, true],
    ["e5-2-1-2-xc9", 2, false, 5, false],
    ["e5-2-1-2-xc12", 2, false, 5, false],
    ["e5-2-1-2-xc19", 2, false, 5, true],
    ["e5-2-1-2-xc23", 4, false, 8, false],
    ["e5-2-1-2-xc27", 3, false, 4, false],
  ] as const)(
    "%s: 두 끝의 값과 포함 여부를 각각 지킨다",
    (id, low, lowClosed, high, highClosed) => {
      const svg = diagram(id);
      const points = [...svg.querySelectorAll("circle")];
      expect(points).toHaveLength(2);
      expect(points.map((p) => Number(p.getAttribute("cx")))).toEqual([
        xOf(svg, low),
        xOf(svg, high),
      ]);
      expect(points.map((p) => p.getAttribute("fill"))).toEqual([
        lowClosed ? "#1F1F23" : "white",
        highClosed ? "#1F1F23" : "white",
      ]);
      expect(
        svg.querySelector('path[stroke="#A57F00"]')!.getAttribute("d"),
      ).toBe(`M${xOf(svg, low)} 61H${xOf(svg, high)}`);
      // Equal numerical gaps have equal coordinate gaps, including both endpoints.
      const ticks = [...svg.querySelectorAll("text")];
      const gaps = ticks
        .slice(1)
        .map(
          (p, i) =>
            Number(p.getAttribute("x")) - Number(ticks[i]!.getAttribute("x")),
        );
      expect(new Set(gaps).size).toBe(1);
    },
  );

  it("단일 범위가 아닌 15문장에는 한쪽 그림을 재사용하지 않는다", () => {
    for (const id of [
      "e5-2-1-1-c3",
      "e5-2-1-1-xc7",
      "e5-2-1-1-xc10",
      "e5-2-1-1-xc15",
      "e5-2-1-1-xc18",
      "e5-2-1-1-xc22",
      "e5-2-1-2-c3",
      "e5-2-1-2-xc7",
      "e5-2-1-2-xc10",
      "e5-2-1-2-xc11",
      "e5-2-1-2-xc15",
      "e5-2-1-2-xc16",
      "e5-2-1-2-xc17",
      "e5-2-1-2-xc20",
      "e5-2-1-2-xc26",
    ]) {
      const { figure, proposition } = sample(id);
      expect(fadingNumberLineForProposition(figure, proposition)).toBeNull();
    }
  });

  it("같은 ID의 문장이 바뀌거나 모르는 문장이면 엉뚱한 그림으로 되돌아가지 않는다", () => {
    const { figure, proposition } = sample("e5-2-1-2-xc8");
    const changed = {
      ...proposition,
      pieces: [{ kind: "text" as const, text: "$4$ 미만인 수" }],
    };
    expect(fadingNumberLineForProposition(figure, changed)).toBeNull();
    expect(
      fadingNumberLineForProposition(figure, { ...proposition, id: "unknown" }),
    ).toBeNull();
    expect(fadingNumberLineForProposition(null, proposition)).toBeNull();
    const unrelated = { ...figure, id: "other-figure" };
    expect(fadingNumberLineForProposition(unrelated, proposition)).toBe(
      unrelated,
    );
  });

  it("검토한 두 소단원은 43문장 중 28개만 단일 수직선으로 그린다", () => {
    const rows = concepts
      .filter((c) => /^e5-2-1-[12]-/.test(c.id))
      .flatMap((c) =>
        c.propositions.map((p) =>
          fadingNumberLineForProposition(figures[c.id]!, p),
        ),
      );
    expect(rows).toHaveLength(43);
    expect(rows.filter(Boolean)).toHaveLength(28);
  });
});
