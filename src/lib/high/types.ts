import type { Difficulty } from "@/contracts/difficulty";

import type { Rng } from "../elementary/types";

/**
 * 고등 유형 엔진이 낸 한 문항. 정답은 생성기가 같은 숫자로 계산한다 (AI 아님).
 *
 * 중등 `MidProblem` 과 같은 모양에 **`distractors`** 하나를 더했다
 * (`docs/planning/tracks/high-engine-plan.md` §1-1).
 *
 * `facts` 는 생성기가 문항을 만들 때 쓴 **원 수치**다 — 시험이 발문·정답을 **다른 식**으로
 * 다시 세워 검산할 때 쓴다(동어반복 방지: 검산식은 시험 쪽에 따로 있다). DB 적재 대상이 아니다.
 */
export type HighProblem = {
  /** 우리 시드 과목명 — `공통수학1` */
  grade: string;
  /** 우리 `Unit.section` 정확한 이름 — 적재 시 단원 매칭 키 */
  unitSection: string;
  /** 색인 키 = 과목명 (`scripts/rpm/rpm-high-type-catalog.json`) */
  rpmBook: string;
  rpmMinor: string;
  rpmType: string;
  rpmTitle: string;
  content: string;
  answer: string;
  solution: string;
  difficulty: Difficulty;
  facts: Record<string, number>;
  /**
   * **객관식 오답 넷** — 정답이 수가 아닐 때(다항식·집합·구간 …) 생성기가 직접 낸다.
   *
   * 공용 오답 경로(`deriveFormats.numericMistakes`)는 **정답 속 첫 수**를 흔든다. 정답이
   * 다항식이면 그 첫 수가 **지수**일 때가 있어 `$-x^{1}+2x+2$`·`$-x^{0}+2x+2$` 가 보기로
   * 나간다(실측 2026-09-13). 객관식이 빠지는 것이 아니라 **보기가 흉해지는** 것이 문제다.
   * 오답은 무작위가 아니라 **그 풀이에서 틀리기 쉬운 자리**(부호·계수 자리 바꿈·한 조건
   * 빠뜨림)에서 낸다. 정답이 수이면 비워 둔다 — 그때는 공용 경로가 제 몫을 한다.
   */
  distractors?: readonly string[];
  /** 도형이 필요한 유형만 — FigureSpec v2 / elem-1 (09-figure-engine-guide). */
  figureSpec?: Record<string, unknown> | null;
};

export type HighTypeHandler = (rng: Rng) => HighProblem;

/** 유형 등록 한 건 — 색인 메타 + 생성기 */
export type HighTypeEntry = {
  /** `과목|중단원|번호` — 예: `"공통수학1|항등식과 나머지정리|03"` */
  key: string;
  grade: string;
  unitSection: string;
  rpmBook: string;
  rpmMinor: string;
  rpmType: string;
  rpmTitle: string;
  handler: HighTypeHandler;
};
