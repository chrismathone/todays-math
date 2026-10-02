import { BLANK_TREE } from "../../src/lib/concept-blank/sections";

/** 은행 학년 파일 → 교육과정 학년. 은행을 싣지 않는 가벼운 파일이다 — 사양(`*.spec.ts`)이 표본 이름을 지을 때도 쓴다. */
export const REAL_GRADES = {
  e3: "초3",
  e4: "초4",
  e5: "초5",
  e6: "초6",
  m1: "중1",
  m2: "중2",
  m3: "중3",
} as const;
export type RealGrade = keyof typeof REAL_GRADES;

/** 그 학년의 대단원 수 — `plusSheets` 를 대단원 하나씩 연다. */
export const gradeChapters = (part: RealGrade): number =>
  BLANK_TREE.find((g) => g.grade === REAL_GRADES[part])?.chapters.length ?? 0;
