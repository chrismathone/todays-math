import type { UnitSeed } from "../../../prisma/seed-data/units";

import type { ElemTier } from "./difficulty";

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
  /**
   * 문형 id. 난이도(연산·기본·응용·심화)와 **직교**.
   * 파일럿 3소단원만 채운다. 적재기 `familyKey` 에는 안 실는다.
   */
  formId?: string;
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

/**
 * 한 소단원의 문형. id 는 난이도 이름이 아니다 — 핸들러 함수 이름을
 * 그대로 쓰면 넷이 이미 난이도라 갈래 수가 안 는다 (REPORT-02 §1).
 */
export type ElemForm = {
  id: string;
  tier: ElemTier;
  generate: ChapterHandler;
  /** false: author-reviewed short answer only; omitted preserves existing MC derivation. */
  allowMultipleChoice?: boolean;
};

export const ELEM_GRADES = ["초3", "초4", "초5", "초6"] as const;
