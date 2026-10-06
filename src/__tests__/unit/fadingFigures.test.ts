// «오늘의 기억» — 풀이 화면의 그림 판에 내려갈 그림을 고른다(`figures.ts`).
import { describe, expect, it } from "vitest";
import type { FigureItem } from "@/contracts/conceptBlank.contract";
import { CONCEPT_BLANK_BANK } from "@/lib/concept-blank/bank";
import { buildFadingConcepts } from "@/lib/fading/concepts";
import { fadingFigureFor, fadingFigureMap } from "@/lib/fading/figures";
import { FADING_GROUPS } from "@/lib/fading/groups";

const SECTION = "중2::5. 도형의 성질::삼각형의 외심";
const OTHER = "중2::5. 도형의 성질::삼각형의 내심";
const figure = (
  id: string,
  section: string,
  level: FigureItem["level"],
  tags: FigureItem["tags"] = [{ x: 10, y: 20, w: 40, answer: "외심" }],
): FigureItem => ({
  id,
  section,
  level,
  prompt: "그림을 보고 이름을 쓰시오.",
  viewBox: "0 0 200 120",
  svg: `<circle cx="100" cy="60" r="40" fill="none" stroke="#1F1F23"/><!-- ${id} -->`,
  tags,
  lines: [{ label: "이름", answer: "외접원의 중심이다." }],
});
const FIGURES = [
  figure("f-mid", SECTION, "중"),
  figure("f-low", SECTION, "하", []),
  figure("f-other", OTHER, "하"),
];
const concept = (id: string, section: string, level: FigureItem["level"]) => ({
  id,
  section,
  level,
});

describe("그림 고르기", () => {
  it("그 개념의 소단원 · 난이도의 그림을 준다 — 그림과 이름표의 자리 · 답만(물음과 채점 줄은 싣지 않는다)", () => {
    expect(fadingFigureFor(concept("a", SECTION, "중"), FIGURES)).toEqual({
      id: "f-mid",
      viewBox: "0 0 200 120",
      svg: FIGURES[0]!.svg,
      tags: [{ x: 10, y: 20, w: 40, answer: "외심" }],
    });
    expect(fadingFigureFor(concept("b", SECTION, "하"), FIGURES)).toMatchObject(
      {
        id: "f-low",
        tags: [],
      },
    );
  });

  it("그 난이도의 그림이 없으면 같은 소단원의 첫 그림을 준다 — 다른 소단원의 그림은 주지 않는다", () => {
    expect(fadingFigureFor(concept("c", SECTION, "상"), FIGURES)!.id).toBe(
      "f-mid",
    );
    expect(fadingFigureFor(concept("d", OTHER, "상"), FIGURES)!.id).toBe(
      "f-other",
    );
    expect(
      fadingFigureFor(
        concept("e", "중2::5. 도형의 성질::없는 단원", "하"),
        FIGURES,
      ),
    ).toBeNull();
    expect(fadingFigureFor(concept("f", SECTION, "하"), [])).toBeNull();
  });

  it("개념 여럿의 그림을 열쇠로 모은다 — 그림이 없는 개념은 싣지 않는다", () => {
    expect(
      fadingFigureMap(
        [
          concept("a", SECTION, "중"),
          concept("x", "중2::5. 도형의 성질::없는 단원", "하"),
        ],
        FIGURES,
      ),
    ).toEqual({ a: fadingFigureFor(concept("a", SECTION, "중"), FIGURES) });
  });
});

describe("그림 — 은행 전체", () => {
  const concepts = buildFadingConcepts(
    CONCEPT_BLANK_BANK.concepts,
    FADING_GROUPS,
  );
  const map = fadingFigureMap(concepts, CONCEPT_BLANK_BANK.figures);

  it("그림이 있는 소단원의 개념은 전부 그림을 받고, 없는 소단원의 개념은 받지 않는다", () => {
    const withFigure = new Set(
      CONCEPT_BLANK_BANK.figures.map((f) => f.section),
    );
    for (const c of concepts)
      expect(c.id in map, c.id).toBe(withFigure.has(c.section));
    expect(Object.keys(map).length).toBeGreaterThan(0);
  });

  it("받은 그림은 그 개념의 소단원의 것이다", () => {
    const sectionOf = new Map(
      CONCEPT_BLANK_BANK.figures.map((f) => [f.id, f.section]),
    );
    for (const c of concepts)
      if (map[c.id]) expect(sectionOf.get(map[c.id]!.id), c.id).toBe(c.section);
  });
});
