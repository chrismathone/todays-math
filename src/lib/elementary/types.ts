import type { UnitSeed } from "../../../prisma/seed-data/units";

/** 초등 엔진이 낸 한 문항. 정답은 생성기가 같은 숫자로 계산한다. */
export type ElemProblem = {
  grade: string;
  chapter: string;
  section: string;
  orderIndex: number;
  content: string;
  answer: string;
  solution: string;
  figureSpec: Record<string, unknown> | null;
};

/**
 * 기존 4단과 분리된 다중 개념 문항. `anchorKey` 가 현재 진도이고,
 * `conceptKeys` 의 나머지는 원장님이 승인한 선수 소단원이다.
 */
export type ElemComboProblem = ElemProblem & {
  kind: "combo";
  comboId: string;
  anchorKey: string;
  conceptKeys: readonly [string, string, ...string[]];
  familyId: string;
};

export type Rng = () => number;

export type ChapterHandler = (unit: UnitSeed, rng: Rng) => ElemProblem;

export const ELEM_GRADES = ["초3", "초4", "초5", "초6"] as const;
