/**
 * 성취 팩터의 **모양** — 「무엇을 정직하게 말할 수 있는가」를 타입에 박는다 (D-134 트랙 2).
 *
 * ## 🔴 이 파일의 유일한 규칙 — `null`(기록 없음) 과 `0`(기록이 있는데 0) 은 다른 값이다
 *
 * 팩터 넷 중 지금 숫자를 댈 수 있는 것은 **«진도» 하나**다(23 §1.1 — `test_result`·
 * `analysis_report`·`concept_lecture_view`·`progress_plan` 이 전부 0행). 빈칸을 0으로 그리면
 * 리포트가 거짓말을 한다(23 §4 ③). 이 저장소가 여러 번 낸 결함이라
 * (20번 «칸이 없다»를 0점으로 채우면 · «가드가 0을 내면 «없다»가 아니라 «못 센다»일 수 있다»)
 * **타입이 먼저 막는다**: 모든 팩터가 `| null` 이고, 시험은 두 경우를 **짝으로** 건다.
 *
 * ## 🔴 팩터를 하나의 점수로 합치지 않는다 (23 §2.4)
 *
 * 가중치를 정당화할 근거가 우리에게 없다. «종합»은 **한 장에 모으는 것**이지
 * **한 숫자로 합치는 것**이 아니다. 그래서 이 파일에는 `totalIndex` 같은 칸이 없고,
 * 앞으로도 두지 않는다.
 */
import type { Difficulty } from "@/contracts/difficulty";

import type { Period } from "./period";

// ─────────────────────────────────────────────
// 공통
// ─────────────────────────────────────────────

/** 소단원 한 칸 — 이름은 `Unit` 에서 온다. */
export interface UnitRef {
  unitId: string;
  grade: string;
  chapter: string;
  section: string;
}

/**
 * 리포트가 말하는 **난이도 4단**. 경쟁사에 없는 우리 축이다(23 §5).
 *
 * 🔴 사다리는 여섯 갈래인데(`DIFFICULTY_LADDER`) 리포트는 넷으로 말한다 —
 *    `심화하`·`심화중`·`심화상` 은 **«심화» 한 밴드로 합친다.** 버리는 게 아니라 합치는 것이다
 *    (지금 뒤의 둘은 어디에도 문항이 없지만 — D-113 — 생기는 날 조용히 사라지면 안 된다).
 */
export const ACHIEVEMENT_BANDS = ["연산", "기본", "응용", "심화"] as const;
export type AchievementBand = (typeof ACHIEVEMENT_BANDS)[number];

/** 사다리의 여섯 갈래를 리포트의 네 밴드로 접는다. */
export function bandOf(difficulty: Difficulty): AchievementBand {
  return difficulty.startsWith("심화")
    ? "심화"
    : (difficulty as AchievementBand);
}

/**
 * 🔴 **단원 축이 열리는 최소 문항 수.**
 *
 * 전 반이 `defaultProblemCount = 8` 이라 한 회차의 단원별 문항은 1~2개다(19 §5′ 실측).
 * 그것으로 그린 원 그래프는 「이 단원 0%」가 **문항 하나 틀린 것**이다 — 통계가 아니다(23 §4 ①).
 * 그래서 **기간 누적 12문항 미만인 단원은 정답률을 내지 않는다.** 숨기는 게 아니라
 * «표본 부족»이라는 값으로 낸다(`underSampled`) — 화면이 그 이유를 적을 수 있게.
 */
export const MIN_UNIT_PROBLEMS = 12;

// ─────────────────────────────────────────────
// ① 무엇을 배웠나 — 지금 **유일하게 실데이터가 있는** 영역
// ─────────────────────────────────────────────

export interface CoveredUnit extends UnitRef {
  /** 이 기간의 진도 행 수 — 같은 차시를 두 번 나가면 2 다. */
  lessons: number;
}

/** 밀림을 **못 재는** 까닭. `planDriftDays` 가 `null` 일 때만 값이 있다. */
export type PlanDriftGap = "계획없음" | "계획꺼짐" | "진도없음" | "차시밖";

export interface LearnedFactors {
  /** 이 기간에 나간 소단원. **진도 0행이면 `null`** — 빈 배열이 아니다. */
  units: CoveredUnit[] | null;
  /** 차시 수(진도 행 수). 진도 0행이면 `null`. */
  lessons: number | null;
  /**
   * 계획 대비 밀림(일) — **음수면 밀림 · 양수면 앞섬 · 0 이면 계획대로**
   * (`src/lib/daily/progressPlan.ts` 와 같은 부호).
   *
   * 🔴 계획이 없으면 `null` 이다 — **«0일 밀림»이 아니다.** 지금 `progress_plan` 은 0행이라
   *    이 값은 실데이터에서 늘 `null` 이고, 그것이 정직한 답이다.
   */
  planDriftDays: number | null;
  /** 왜 못 쟀나 — `planDriftDays` 가 `null` 일 때만. */
  planDriftGap: PlanDriftGap | null;
}

// ─────────────────────────────────────────────
// ② 얼마나 맞았나 — 채점 화면(트랙 1)이 생겨야 찬다
// ─────────────────────────────────────────────

export interface ScoredRound {
  testId: string;
  /** 시험 예정일 YYYY-MM-DD */
  testDate: string;
  /** 채점 입력 시각 (ISO) */
  takenAt: string;
  /** 🔴 **결시면 `null`.** 0점으로 적으면 평균·추이에 진짜 0점처럼 실린다(23 §4 ③). */
  score: number | null;
  /** 만점 — 배점이 없으면 `null`. 「몇 점 만점 중 몇 점」을 같이 적어야 이해도가 오른다(23 §2.3). */
  maxScore: number | null;
}

export interface UnitAccuracy extends UnitRef {
  correct: number;
  total: number;
  /** 0~100 */
  accuracy: number;
}

export interface UnderSampledUnit extends UnitRef {
  total: number;
  /** 몇 문항이면 열리나 — 값은 언제나 `MIN_UNIT_PROBLEMS` 다(화면이 문턱을 손으로 적지 않게). */
  needed: typeof MIN_UNIT_PROBLEMS;
}

export interface BandAccuracy {
  correct: number;
  total: number;
  /** 0~100 */
  accuracy: number;
}

export interface ReviewUnit extends UnitRef {
  /** 몇 회차가 이 단원을 복습으로 꼽았나. */
  flaggedRounds: number;
  /** 누적 문항 수. */
  problems: number;
  /** 누적 정답률(0~100) — **표본 부족이면 `null`** (문항 12개 미만). */
  accuracy: number | null;
}

export interface ScoredFactors {
  /** 응시 회차 — **결시는 빠진다.** 채점 기록이 0건이면 `null`, 있는데 전부 결시면 빈 배열. */
  rounds: ScoredRound[] | null;
  /** 결시 회차. 채점 기록이 0건이면 `null`, 있는데 결시가 없으면 빈 배열. */
  absentRounds: ScoredRound[] | null;
  /**
   * 평균 정답 비율(0~100) — 회차별 `score/maxScore` 를 **문항 배점 합산**으로 잰다.
   * 응시 회차가 없거나 만점을 모르면 `null`.
   */
  averagePercent: number | null;
  /**
   * 누적 단원별 정답률 — **회차 평균이 아니라 문항 합산**이다(회차마다 문항 수가 다르다).
   * 채점 기록이 0건이면 `null`.
   */
  unitAccuracy: {
    reported: UnitAccuracy[];
    /** 문항 12개 미만이라 **정답률을 내지 않은** 단원. 숨긴 게 아니라 여기 있다. */
    underSampled: UnderSampledUnit[];
  } | null;
  /**
   * 난이도 4단별 정답률. 채점 기록이 0건이면 전체가 `null` 이고,
   * **네 밴드 중 문항이 0인 밴드는 그 밴드만 `null`** 이다(0% 가 아니다).
   */
  bandAccuracy: Record<AchievementBand, BandAccuracy | null> | null;
  /**
   * 복습이 필요한 단원. **분석 리포트가 0건이면 `null`**, 리포트는 있는데 꼽힌 단원이
   * 없으면 **빈 배열**이다 — 이 둘을 섞지 않는다.
   */
  reviewUnits: ReviewUnit[] | null;
}

// ─────────────────────────────────────────────
// ③ 스스로 한 것 — 강의 0편 · 숙제는 표가 없다
// ─────────────────────────────────────────────

export interface LectureFactors {
  /** 대상 강의 편수(게시된 것). */
  assigned: number;
  /** 끝까지 본 편수. */
  completed: number;
  /** 평균 시청률(0~100) — **대상 전체**에 대한 평균이다(안 본 강의는 0%로 센다). */
  averagePercent: number;
}

export interface SelfStudyFactors {
  /**
   * 예습 영상. 🔴 **대상 강의가 0편이면 `null`** — 「안 봤다(0편 완료)」와 다른 말이다.
   * 지금 `concept_lecture` 가 0행이라 실데이터에서는 늘 `null` 이다.
   */
  lectures: LectureFactors | null;
  /**
   * 숙제 — 🔴 **표가 없다.** 언제나 `null` 이고, 자리만 비워 둔다(원장님 확정 대기 23 §7 Q1).
   * 칸을 만들기 전에는 어떤 값도 지어내지 않는다.
   */
  homework: null;
}

// ─────────────────────────────────────────────
// 비교군 — 기본값은 «미사용»
// ─────────────────────────────────────────────

/** 🔴 **전국·석차는 없다** — 표본이 없다(23 §4 ④). 우리가 댈 수 있는 것은 이 둘뿐이다. */
export type ComparisonKind = "지난기간" | "반평균";

/**
 * 비교군의 값 하나 — 🔴 **값과 그 분모를 같이 낸다.**
 *
 * 「반 평균 60%」가 **열 명 중 둘의 평균**일 수 있다. 분모를 안 내면 그 둘을 반 전체로 읽는다
 * (20번 «평균 뒤에 최저가 있다 — 「0%」는 표본이 안 건드린 것일 수 있다»).
 */
export interface ComparisonMetric {
  /** 값이 있는 사람들의 평균. 아무도 없으면 `null` — 0 이 아니다. */
  value: number | null;
  /** **그 평균의 분모** — 몇 사람의 값을 평균했나. */
  sample: number;
}

export interface Comparison {
  kind: ComparisonKind;
  /** 🔴 **표본 수를 반드시 같이 낸다** — 반 최대 10명이라 「반 평균」은 얇다. */
  sampleSize: number;
  /** 같은 길이 기간의 차시 수. */
  lessons: ComparisonMetric;
  /** 평균 정답 비율(0~100). */
  averagePercent: ComparisonMetric;
}

// ─────────────────────────────────────────────
// 한 장에 모은 것
// ─────────────────────────────────────────────

export interface AchievementStudent {
  id: string;
  name: string;
  className: string;
  classGrade: string;
}

export interface AchievementFactors {
  student: AchievementStudent;
  period: Period;
  learned: LearnedFactors;
  scored: ScoredFactors;
  selfStudy: SelfStudyFactors;
  /**
   * ④ 선생님 의견 — 🔴 **아직 칸이 없다.** 언제나 `null`.
   * 태도는 **숫자가 아니라 문장**으로 간다(23 §2.4 ②) — 별 세 개짜리 점수를 만들지 않는다.
   */
  teacherNote: null;
  /** 비교군 — **기본값은 «미사용»** 이라 `null` 이다. */
  comparison: Comparison | null;
}
