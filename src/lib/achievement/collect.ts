/**
 * **성취 팩터 수집** — 한 학생 × 한 기간. **순수 함수다** (D-134 트랙 2, 브리프 §1.1).
 *
 * DB 접근은 부르는 쪽(`load.ts`)이 한다. 이 층은 행을 받아 «무엇을 정직하게 말할 수 있는가»만
 * 정한다 — 그래서 실DB 없이도 전 경계를 시험할 수 있다(`achievementFactors.test.ts`).
 *
 * ## 이 파일이 지키는 것 넷
 *
 * ⑴ 🔴 **`null`(기록 없음) 과 `0`(기록이 있는데 0) 을 절대 섞지 않는다.** 타입이 먼저 막고
 *    (`types.ts`) 시험이 네 쌍을 짝으로 건다. 빈칸을 0으로 그리면 리포트가 거짓말을 한다(23 §4 ③).
 * ⑵ 🔴 **최소 표본을 함수가 지킨다** — 누적 12문항 미만인 단원은 정답률을 **안 낸다**.
 *    숨기는 게 아니라 «표본 부족»이라는 값으로 낸다(23 §4 ①).
 * ⑶ 🔴 **팩터를 하나의 점수로 합치지 않는다**(23 §2.4). 가중치를 정당화할 근거가 없다.
 * ⑷ 🔴 **누적은 «문항 합산»이다 — 회차 평균이 아니다.** 회차마다 문항 수가 달라
 *    회차 평균을 내면 2문항짜리 회차가 8문항짜리와 같은 무게를 갖는다.
 *
 * ## 🔴 왜 `AnalysisReport.unitScores` 를 안 읽나
 *
 * 브리프는 «`unitScores` 합산»이라 적었는데, 그 칸은 **정답률(0~100)만** 담는다 — 문항 수가 없다.
 * 비율만으로는 ⑷(문항 합산)도 ⑵(12문항 문턱)도 **구조적으로 불가능**하다. 그래서 같은 채점에서
 * 나온 **문항 단위 기록**(`ProblemAnswer` × `Problem.unitId`)을 입력으로 받는다. `AnalysisReport`
 * 에서 읽는 것은 비율로 환원되지 않는 `recommendedUnits` 하나뿐이다.
 */
import type { Difficulty } from "@/contracts/difficulty";
import {
  type ActualProgress,
  resolveDailyPlan,
  type ProgressPlanRule,
} from "@/lib/daily/progressPlan";

import { type Period, previousPeriod, withinPeriod } from "./period";
import {
  ACHIEVEMENT_BANDS,
  type AchievementBand,
  type AchievementFactors,
  type AchievementStudent,
  type BandAccuracy,
  bandOf,
  type Comparison,
  type ComparisonMetric,
  type CoveredUnit,
  type LearnedFactors,
  MIN_UNIT_PROBLEMS,
  type PlanDriftGap,
  type ReviewUnit,
  type ScoredFactors,
  type ScoredRound,
  type SelfStudyFactors,
  type UnderSampledUnit,
  type UnitAccuracy,
  type UnitRef,
} from "./types";

// ─────────────────────────────────────────────
// 입력 — 부르는 쪽이 DB 에서 읽어 넘긴다
// ─────────────────────────────────────────────

/** 진도 한 줄. `recordedAt` 은 **달력 날짜**(YYYY-MM-DD) — 시각이 아니다. */
export interface ProgressRow {
  unitId: string;
  recordedAt: string;
}

/** 교육과정 차시 — 이름(화면용)과 차례(`orderIndex`, 밀림 셈용)를 같이 갖는다. */
export interface AchievementUnitRow extends UnitRef {
  orderIndex: number;
}

/** 채점된 문항 하나 — `ProblemAnswer` × `Problem`. */
export interface ScoredItem {
  unitId: string;
  difficulty: Difficulty;
  isCorrect: boolean;
}

/**
 * 한 회차의 채점 기록.
 *
 * 🔴 `score` 가 `nullable` 이고 `absent` 가 있는 것은 **트랙 1(`grading-input`)이 스키마에 더할
 *    모양을 미리 전제**한 것이다(브리프 §2). 지금 스키마는 `score` 가 NOT NULL 이고 `absent` 칸이
 *    없어서, 읽는 쪽(`load.ts`)이 «결시면 점수가 없다»로 옮겨 담는다. 이 층은 그 뒤만 본다.
 */
export interface ResultRow {
  testId: string;
  /** 시험 예정일 YYYY-MM-DD — 기간 판정은 이 날짜로 한다. */
  testDate: string;
  /** 채점 입력 시각 (ISO) */
  takenAt: string;
  score: number | null;
  maxScore: number | null;
  absent: boolean;
  items: ScoredItem[];
  /** `AnalysisReport.recommendedUnits`. **리포트가 없으면 `null`** — 빈 배열이 아니다. */
  recommendedUnitIds: string[] | null;
}

export interface LectureTargetRow {
  lectureId: string;
}

export interface LectureViewRow {
  lectureId: string;
  /** 0~100 */
  percent: number;
  /** 처음 완료한 시각 — 안 끝냈으면 `null`. */
  completedAt: string | null;
}

/** 비교군 요청 — **기본값은 «미사용»** 이다(23 §4 ④). 전국·석차는 만들지 않는다. */
export type ComparisonRequest =
  | { kind: "미사용" }
  | {
      kind: "지난기간";
      /** 직전 같은 길이 기간의 진도 — 여기서 다시 거른다. */
      progress: ProgressRow[];
      results: ResultRow[];
    }
  | {
      kind: "반평균";
      students: {
        id: string;
        progress: ProgressRow[];
        results: ResultRow[];
      }[];
    };

export interface AchievementInput {
  student: AchievementStudent;
  period: Period;
  /** 이 학생에게 **유효한** 진도(반 진도 포함) — 기간 밖이 섞여도 여기서 다시 거른다. */
  progress: ProgressRow[];
  /** 이름과 차례를 붙일 교육과정. */
  units: AchievementUnitRow[];
  /** 이 학생에게 적용되는 진도 계획 — 없으면 `null`. */
  plan: ProgressPlanRule | null;
  results: ResultRow[];
  lectures: { targets: LectureTargetRow[]; views: LectureViewRow[] };
  comparison?: ComparisonRequest;
}

// ─────────────────────────────────────────────
// 잔손
// ─────────────────────────────────────────────

/** 소수 첫째 자리 — 「10문제 중 6문제」 쪽으로 읽히는 리포트라 그보다 잘게 쪼갤 이유가 없다. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function percent(correct: number, total: number): number {
  return total > 0 ? round1((correct / total) * 100) : 0;
}

/** 값이 있는 사람만 평균한다 — **분모를 같이 낸다**(「평균 뒤에 최저가 있다」 2026-08-19). */
function metricOf(values: (number | null)[]): ComparisonMetric {
  const known = values.filter((v): v is number => v !== null);
  if (known.length === 0) return { value: null, sample: 0 };
  const sum = known.reduce((a, b) => a + b, 0);
  return { value: round1(sum / known.length), sample: known.length };
}

// ─────────────────────────────────────────────
// ① 무엇을 배웠나
// ─────────────────────────────────────────────

function learnedFactors(
  period: Period,
  progress: ProgressRow[],
  units: AchievementUnitRow[],
  plan: ProgressPlanRule | null,
): LearnedFactors {
  const rows = progress.filter((r) => withinPeriod(period, r.recordedAt));
  const byId = new Map(units.map((u) => [u.unitId, u]));

  // 🔴 진도가 0행이면 `null` 이다 — 빈 배열도 «0차시»도 아니다.
  const covered: CoveredUnit[] | null =
    rows.length === 0
      ? null
      : (() => {
          const counts = new Map<string, number>();
          for (const r of rows)
            counts.set(r.unitId, (counts.get(r.unitId) ?? 0) + 1);
          return [...counts.entries()]
            .map(([unitId, lessons]) => ({
              ...unitRefOf(unitId, byId),
              lessons,
            }))
            .sort(
              (a, b) =>
                (byId.get(a.unitId)?.orderIndex ?? Number.MAX_SAFE_INTEGER) -
                (byId.get(b.unitId)?.orderIndex ?? Number.MAX_SAFE_INTEGER),
            );
        })();

  const { days, gap } = planDrift(period, rows, units, plan, byId);

  return {
    units: covered,
    lessons: rows.length === 0 ? null : rows.length,
    planDriftDays: days,
    planDriftGap: gap,
  };
}

/**
 * 계획 대비 밀림 — 🔴 **못 재는 경우를 «0일»로 적지 않는다.**
 *
 * `resolveDailyPlan` 은 계획을 못 펴는 경우(꺼짐·요일 없음·시작 차시 목록 밖)에도 `driftDays: 0`
 * 을 낸다. 그 0을 그대로 내보내면 **계획이 없는 반이 「계획대로 가고 있다」로 읽힌다** — 지금
 * `progress_plan` 이 0행이라 **전원이** 그렇게 읽힌다. 그래서 걸러야 하는 자리를 여기서 먼저 센다.
 */
function planDrift(
  period: Period,
  rows: ProgressRow[],
  units: AchievementUnitRow[],
  plan: ProgressPlanRule | null,
  byId: Map<string, AchievementUnitRow>,
): { days: number | null; gap: PlanDriftGap | null } {
  if (plan === null) return { days: null, gap: "계획없음" };
  if (!plan.active || plan.weekdays.length === 0)
    return { days: null, gap: "계획꺼짐" };
  if (rows.length === 0) return { days: null, gap: "진도없음" };

  // 기준점은 **기간 안 마지막 진도**다 — 같은 날이 여럿이면 교육과정에서 뒤엣 차시가 이긴다.
  const anchor = [...rows].sort((a, b) => {
    if (a.recordedAt !== b.recordedAt)
      return a.recordedAt < b.recordedAt ? -1 : 1;
    return (
      (byId.get(a.unitId)?.orderIndex ?? -1) -
      (byId.get(b.unitId)?.orderIndex ?? -1)
    );
  })[rows.length - 1] as ProgressRow;

  const actual: ActualProgress = {
    unitId: anchor.unitId,
    recordedAt: anchor.recordedAt,
  };
  const plannedRun = resolveDailyPlan({
    rule: plan,
    units: units.map((u) => ({ id: u.unitId, orderIndex: u.orderIndex })),
    day: period.to,
    actual,
  });
  // 🔴 계획에 걸리지 못했으면(차시가 목록 밖 · 시작 차시가 목록 밖) 잰 값이 아니다.
  if (plannedRun.anchoredOn !== "progress")
    return { days: null, gap: "차시밖" };
  return { days: plannedRun.driftDays, gap: null };
}

function unitRefOf(
  unitId: string,
  byId: Map<string, AchievementUnitRow>,
): UnitRef {
  const unit = byId.get(unitId);
  // 이름을 못 찾으면 **빈 이름으로 낸다** — 조용히 빠뜨리면 「몇 단원인가」가 갈린다.
  return {
    unitId,
    grade: unit?.grade ?? "",
    chapter: unit?.chapter ?? "",
    section: unit?.section ?? "",
  };
}

// ─────────────────────────────────────────────
// ② 얼마나 맞았나
// ─────────────────────────────────────────────

const toRound = (r: ResultRow): ScoredRound => ({
  testId: r.testId,
  testDate: r.testDate,
  takenAt: r.takenAt,
  score: r.absent ? null : r.score,
  maxScore: r.maxScore,
});

const byDate = (a: ResultRow, b: ResultRow) =>
  a.testDate === b.testDate
    ? a.takenAt.localeCompare(b.takenAt)
    : a.testDate.localeCompare(b.testDate);

/**
 * 응시 회차의 **배점 합산** 정답 비율(0~100).
 * 🔴 결시와 점수 없는 회차는 **분자에서도 분모에서도** 빠진다.
 */
function scorePercentOf(results: ResultRow[]): number | null {
  let earned = 0;
  let full = 0;
  for (const r of latestPerTest(results)) {
    if (r.absent || r.score === null || r.maxScore === null || r.maxScore <= 0)
      continue;
    earned += r.score;
    full += r.maxScore;
  }
  return full > 0 ? round1((earned / full) * 100) : null;
}

/**
 * 🔴 **재채점(정정)은 새 행이다** — 같은 `(testId, studentId)` 에 여러 행이 쌓이고
 * **최신은 `takenAt` 내림차순**이다(트랙 1 브리프 §1.2). 다 세면 한 회차가 두 번 실려
 * 평균도 문항 합산도 그 회차 쪽으로 기운다. 회차마다 **마지막 채점 하나만** 남긴다.
 */
function latestPerTest(rows: ResultRow[]): ResultRow[] {
  const latest = new Map<string, ResultRow>();
  for (const r of rows) {
    const kept = latest.get(r.testId);
    if (kept === undefined || kept.takenAt < r.takenAt) latest.set(r.testId, r);
  }
  return [...latest.values()];
}

function scoredFactors(
  period: Period,
  results: ResultRow[],
  byId: Map<string, AchievementUnitRow>,
): ScoredFactors {
  const rows = latestPerTest(
    results.filter((r) => withinPeriod(period, r.testDate)),
  );

  // 🔴 채점 기록이 0건이면 전부 `null` — 「기록이 없다」와 「0점이다」는 다른 말이다.
  if (rows.length === 0) {
    return {
      rounds: null,
      absentRounds: null,
      averagePercent: null,
      unitAccuracy: null,
      bandAccuracy: null,
      reviewUnits: null,
    };
  }

  const taken = rows.filter((r) => !r.absent).sort(byDate);
  const absent = rows.filter((r) => r.absent).sort(byDate);

  // 🔴 결시 회차의 문항은 어떤 누적에도 안 들어간다.
  const unitTally = new Map<string, { correct: number; total: number }>();
  const bandTally = new Map<
    AchievementBand,
    { correct: number; total: number }
  >();
  for (const r of taken) {
    for (const it of r.items) {
      const u = unitTally.get(it.unitId) ?? { correct: 0, total: 0 };
      u.total += 1;
      if (it.isCorrect) u.correct += 1;
      unitTally.set(it.unitId, u);

      const band = bandOf(it.difficulty);
      const b = bandTally.get(band) ?? { correct: 0, total: 0 };
      b.total += 1;
      if (it.isCorrect) b.correct += 1;
      bandTally.set(band, b);
    }
  }

  const order = (unitId: string) =>
    byId.get(unitId)?.orderIndex ?? Number.MAX_SAFE_INTEGER;

  const reported: UnitAccuracy[] = [];
  const underSampled: UnderSampledUnit[] = [];
  for (const [unitId, tally] of unitTally) {
    const ref = unitRefOf(unitId, byId);
    if (tally.total >= MIN_UNIT_PROBLEMS) {
      reported.push({
        ...ref,
        correct: tally.correct,
        total: tally.total,
        accuracy: percent(tally.correct, tally.total),
      });
    } else {
      // 숨기지 않는다 — 화면이 «표본 부족»이라 적을 수 있게 값으로 낸다.
      underSampled.push({
        ...ref,
        total: tally.total,
        needed: MIN_UNIT_PROBLEMS,
      });
    }
  }
  reported.sort((a, b) => order(a.unitId) - order(b.unitId));
  underSampled.sort((a, b) => order(a.unitId) - order(b.unitId));

  // 🔴 문항이 0인 밴드는 그 밴드만 `null` — 0% 가 아니다.
  const bandAccuracy = Object.fromEntries(
    ACHIEVEMENT_BANDS.map((band) => {
      const tally = bandTally.get(band);
      const value: BandAccuracy | null =
        tally && tally.total > 0
          ? {
              correct: tally.correct,
              total: tally.total,
              accuracy: percent(tally.correct, tally.total),
            }
          : null;
      return [band, value];
    }),
  ) as Record<AchievementBand, BandAccuracy | null>;

  return {
    rounds: taken.map(toRound),
    absentRounds: absent.map(toRound),
    averagePercent: scorePercentOf(taken),
    unitAccuracy: { reported, underSampled },
    bandAccuracy,
    reviewUnits: reviewUnitsOf(taken, unitTally, byId),
  };
}

/**
 * 복습이 필요한 단원 — 🔴 **«리포트가 0건»(null) 과 «꼽힌 단원이 없다»(빈 배열) 를 가른다.**
 */
function reviewUnitsOf(
  taken: ResultRow[],
  unitTally: Map<string, { correct: number; total: number }>,
  byId: Map<string, AchievementUnitRow>,
): ReviewUnit[] | null {
  const withReport = taken.filter((r) => r.recommendedUnitIds !== null);
  if (withReport.length === 0) return null;

  const flagged = new Map<string, number>();
  for (const r of withReport)
    for (const unitId of r.recommendedUnitIds ?? [])
      flagged.set(unitId, (flagged.get(unitId) ?? 0) + 1);

  const order = (unitId: string) =>
    byId.get(unitId)?.orderIndex ?? Number.MAX_SAFE_INTEGER;

  return [...flagged.entries()]
    .map(([unitId, flaggedRounds]) => {
      const tally = unitTally.get(unitId) ?? { correct: 0, total: 0 };
      return {
        ...unitRefOf(unitId, byId),
        flaggedRounds,
        problems: tally.total,
        // 표본이 모자라면 정답률을 **안 낸다** — 꼽혔다는 사실만 남는다.
        accuracy:
          tally.total >= MIN_UNIT_PROBLEMS
            ? percent(tally.correct, tally.total)
            : null,
      };
    })
    .sort(
      (a, b) =>
        b.flaggedRounds - a.flaggedRounds || order(a.unitId) - order(b.unitId),
    );
}

// ─────────────────────────────────────────────
// ③ 스스로 한 것
// ─────────────────────────────────────────────

function selfStudyFactors(
  lectures: AchievementInput["lectures"],
): SelfStudyFactors {
  const targets = new Set(lectures.targets.map((t) => t.lectureId));
  // 🔴 대상 강의가 0편이면 `null` — 「0편 봤다」와 다른 말이다.
  if (targets.size === 0) return { lectures: null, homework: null };

  const views = lectures.views.filter((v) => targets.has(v.lectureId));
  const completed = views.filter((v) => v.completedAt !== null).length;
  // 분모는 **대상 전체**다 — 본 것만으로 평균을 내면 한 편만 본 학생이 100% 가 된다.
  const sum = views.reduce((acc, v) => acc + v.percent, 0);

  return {
    lectures: {
      assigned: targets.size,
      completed,
      averagePercent: round1(sum / targets.size),
    },
    // 🔴 숙제는 표가 없다(23 §3 축 12). 자리만 비워 둔다.
    homework: null,
  };
}

// ─────────────────────────────────────────────
// 비교군
// ─────────────────────────────────────────────

const lessonsIn = (period: Period, progress: ProgressRow[]): number | null => {
  const n = progress.filter((r) => withinPeriod(period, r.recordedAt)).length;
  return n === 0 ? null : n;
};

function comparisonOf(
  period: Period,
  request: ComparisonRequest | undefined,
): Comparison | null {
  if (request === undefined || request.kind === "미사용") return null;

  if (request.kind === "지난기간") {
    const prev = previousPeriod(period);
    return {
      kind: "지난기간",
      sampleSize: 1,
      lessons: metricOf([lessonsIn(prev, request.progress)]),
      averagePercent: metricOf([
        scorePercentOf(
          request.results.filter((r) => withinPeriod(prev, r.testDate)),
        ),
      ]),
    };
  }

  return {
    kind: "반평균",
    // 🔴 반 최대 10명 — **표본 수를 반드시 같이 낸다.**
    sampleSize: request.students.length,
    lessons: metricOf(
      request.students.map((s) => lessonsIn(period, s.progress)),
    ),
    averagePercent: metricOf(
      request.students.map((s) =>
        scorePercentOf(
          s.results.filter((r) => withinPeriod(period, r.testDate)),
        ),
      ),
    ),
  };
}

// ─────────────────────────────────────────────
// 한 장에 모은다 — **한 숫자로 합치지 않는다**
// ─────────────────────────────────────────────

export function collectAchievement(
  input: AchievementInput,
): AchievementFactors {
  const byId = new Map(input.units.map((u) => [u.unitId, u]));
  return {
    student: input.student,
    period: input.period,
    learned: learnedFactors(
      input.period,
      input.progress,
      input.units,
      input.plan,
    ),
    scored: scoredFactors(input.period, input.results, byId),
    selfStudy: selfStudyFactors(input.lectures),
    // 🔴 ④ 선생님 의견 — 칸이 없다. 태도는 숫자가 아니라 문장으로 간다(23 §2.4 ②).
    teacherNote: null,
    comparison: comparisonOf(input.period, input.comparison),
  };
}
