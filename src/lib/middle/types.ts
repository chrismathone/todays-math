import type { Rng } from "../elementary/types";

/**
 * 중학 유형 엔진이 낸 한 문항. 정답은 생성기가 같은 숫자로 계산한다 (AI 아님).
 *
 * `facts` 는 생성기가 문항을 만들 때 쓴 **원 수치**다 — 테스트가 발문·정답을
 * 재계산으로 검산할 때 쓴다(동어반복 방지: 검산식은 테스트 쪽에 따로 있다).
 * DB 적재 대상이 아니다.
 */
export type MidProblem = {
  grade: string;
  /** 우리 `Unit.section` 정확한 이름 — 적재 시 단원 매칭 키 */
  unitSection: string;
  rpmBook: string;
  rpmMinor: string;
  rpmType: string;
  rpmTitle: string;
  content: string;
  answer: string;
  solution: string;
  difficulty: "easy" | "mid" | "hard";
  facts: Record<string, number>;
};

export type TypeHandler = (rng: Rng) => MidProblem;

/** 유형 등록 한 건 — 색인 메타 + 생성기 */
export type TypeEntry = {
  /** `책|중단원|번호` — 예: `"1-1|일차방정식의 활용|01"` */
  key: string;
  grade: string;
  unitSection: string;
  rpmBook: string;
  rpmMinor: string;
  rpmType: string;
  rpmTitle: string;
  handler: TypeHandler;
};
