import type { FigureItem } from "@/contracts/conceptBlank.contract";
import type { FadingConcept } from "./concepts";

/**
 * 풀이 화면의 그림 판에 내려갈 그림 (`docs/planning/srs-overhaul-20261006.md` §17).
 * 시안의 풀이 화면에는 맨 위에 그 개념의 도형이 있다. 재료는 개념 백지 은행의 그림 문항이다 — 손으로 쓴 SVG 조각과 이름표의 자리 · 답.
 *
 * 그림은 **소단원**에 달려 있다(은행에는 «어느 묶음의 그림»이라는 표지가 없다). 그래서 그 개념의 소단원 · 난이도의 그림을 주고,
 * 그 난이도에 없으면 같은 소단원의 첫 그림을 준다. 소단원에 그림이 없으면 없다 — 은행의 소단원 360 가운데 175 에만 그림이 있다.
 * 🔴 이름표의 답은 빈칸의 답과 겹칠 수 있다. 화면은 1단계 정독과 단계를 마친 뒤의 대조에서만 답을 보이고, **빈칸을 채우는 2 ~ 4단계에서는
 * 이름표를 빈 상자로** 그린다. 물음(`prompt`)과 채점 줄(`lines`)은 종이 지면의 것이라 싣지 않는다.
 */
export type FadingFigure = {
  id: string;
  viewBox: string;
  /** 바깥 `<svg>` 없는 조각 — 은행의 시험이 스크립트 · 바깥 주소 · 이미지를 막아 둔 것이다. */
  svg: string;
  /** 이름표의 자리(viewBox 좌표 · 높이 18)와 답. */
  tags: { x: number; y: number; w: number; answer: string }[];
};

/** 그 개념의 그림 — 없으면 `null`. */
export function fadingFigureFor(
  concept: Pick<FadingConcept, "section" | "level">,
  figures: readonly FigureItem[],
): FadingFigure | null {
  const inSection = figures.filter((f) => f.section === concept.section);
  const picked =
    inSection.find((f) => f.level === concept.level) ?? inSection[0];
  if (!picked) return null;
  return {
    id: picked.id,
    viewBox: picked.viewBox,
    svg: picked.svg,
    tags: picked.tags.map((tag) => ({
      x: tag.x,
      y: tag.y,
      w: tag.w,
      answer: tag.answer,
    })),
  };
}

/** 개념 여럿의 그림 — 열쇠로. 서버 없이 도는 길(`createLocalFadingSource`)에 그대로 넘긴다. 그림이 없는 개념은 싣지 않는다. */
export function fadingFigureMap(
  concepts: readonly Pick<FadingConcept, "id" | "section" | "level">[],
  figures: readonly FigureItem[],
): Record<string, FadingFigure> {
  const map: Record<string, FadingFigure> = {};
  for (const concept of concepts) {
    const figure = fadingFigureFor(concept, figures);
    if (figure) map[concept.id] = figure;
  }
  return map;
}
