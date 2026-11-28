import "server-only";
import { getConceptBlankBank } from "@/lib/concept-blank/bank/runtime";
import { buildFadingConcepts, type FadingConcept } from "./concepts";
import { fadingFigureFor, type FadingFigure } from "./figures";
import { FADING_GROUPS } from "./groups";

/**
 * 은행 전체의 개념 — 서버에서만 쓴다(은행 9,119문장과 묶음 표를 같이 싣는다 · 화면 번들에 넣지 않는다).
 * 화면은 필요한 개념만 서버에서 받아 `concepts.ts` 의 꼴로 쓴다.
 */
let cache: { list: FadingConcept[]; byId: Map<string, FadingConcept> } | null =
  null;

function load() {
  if (!cache) {
    const list = buildFadingConcepts(
      getConceptBlankBank().concepts,
      FADING_GROUPS,
    );
    cache = { list, byId: new Map(list.map((c) => [c.id, c])) };
  }
  return cache;
}

/** 전 학년의 개념 — 묶음 표의 차례. */
export function fadingCatalog(): readonly FadingConcept[] {
  return load().list;
}

/** 열쇠 → 개념. 은행에 없는 열쇠는 없다. */
export function fadingConceptMap(): ReadonlyMap<string, FadingConcept> {
  return load().byId;
}

/** 그 개념의 그림 판에 그릴 그림 — 은행의 그림 문항에서(소단원에 그림이 없으면 `null`). */
export function fadingFigureOf(concept: FadingConcept): FadingFigure | null {
  return fadingFigureFor(concept, getConceptBlankBank().figures);
}
