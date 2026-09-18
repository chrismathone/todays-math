/**
 * **예시 ⓑ «다 찬 달»** — 🔴 **지어낸 값이다.** ① 진도만 실제 기록이고 ②③④는 예시다.
 *
 * ## 🔴 팩터를 손으로 적지 않는다 (Hi-fi 브리프 §1 #9)
 *
 * Wire 의 예시는 팩터를 손으로 적어서 **단원별 합계 35문항 ≠ 난이도별 합계 34문항**이었다 — 같은
 * 문항을 두 칸에 따로 적으면 둘이 갈라진다. 여기서는 **원시 행**(`ResultRow.items` · 강의 시청 ·
 * 숙제 확인)을 지어내고 `collectAchievement` 로 팩터를 **생성**한다. 합계는 한 원천에서 나온다.
 *
 * ## 무엇을 일부러 넣었나 — 규칙이 지면에서 보이도록
 *
 *   · 회차 9번(주 2회) 중 **결시 1번** — 날짜와 함께 한 줄, 평균에서 뺀다(§2 규칙 5)
 *   · 난이도 4단 중 **심화 8문항** — 12문항 미만이라 숫자만, 평가 보류(§2 규칙 4)
 *   · 단원 9개 중 **6개가 12문항 미만** — 학부모에게는 개수 한 줄(§2 규칙 6)
 *   · 영상 6편 중 **1편은 다음 달 1일에 끝냈다** — 월말까지 4편(§2 규칙 8, 경계 확인)
 *   · 숙제 **확인한 8번 중 2번** — 확인 안 한 날은 분모에 없다(§2 규칙 7)
 *   · **긴** 선생님 의견 — A4 한 장 실측을 위해
 *
 * 날짜는 **기간 시작일에서 센다** — Wire(최근 4주)와 Hi-fi(달력 한 달)가 같은 생성기를 쓴다.
 * 기간 밖으로 나가는 날은 버린다.
 */
import {
  type AchievementInput,
  type AchievementUnitRow,
  collectAchievement,
  type HomeworkCheckRow,
  type LectureViewRow,
  type ResultRow,
  type ScoredItem,
} from "@/lib/achievement/collect";
import { testMaxScore } from "@/lib/achievement/maxScore";
import {
  addDays,
  periodEndExclusive,
  withinPeriod,
} from "@/lib/achievement/period";
import type {
  AchievementBand,
  AchievementFactors,
  CoveredUnit,
} from "@/lib/achievement/types";

export const EXAMPLE_TEACHER_NOTE =
  "수업 중 질문이 눈에 띄게 늘었고, 계산 실수를 스스로 되짚는 습관이 자리를 잡아 가고 있습니다. " +
  "응용 문제에서는 식을 세우기 전에 손이 멈추는 편이라, 다음 달에는 수업 시작 5분 동안 문제를 소리 내어 " +
  "읽고 조건을 먼저 적는 연습을 함께 하겠습니다. 가정에서는 푼 문제 하나를 골라 풀이 과정을 말로 " +
  "설명해 보게 해 주시면 도움이 됩니다.";

/** 시험 날(기간 시작일에서 며칠 뒤) — 주 2회. 다섯째(인덱스 4)는 결시다. */
const TEST_OFFSETS = [2, 5, 9, 12, 16, 19, 23, 26, 29];
const ABSENT_INDEX = 4;
/** 숙제를 «오늘 확인함»으로 찍은 날 — 여덟 번. 셋째·일곱째에 안 해 왔다. */
const HOMEWORK_OFFSETS = [1, 4, 8, 11, 15, 18, 22, 25];
const HOMEWORK_MISSED = new Set([8, 22]);

/** 한 회차 8문항의 난이도 자리 — 연산 2 · 기본 3 · 응용 2 · 심화 1. */
const SLOT_BANDS: AchievementBand[] = [
  "연산",
  "연산",
  "기본",
  "기본",
  "기본",
  "응용",
  "응용",
  "심화",
];

/**
 * 응시 회차(0~7) × 자리(0~7)의 정오. 연산 15/16 · 기본 19/24 · 응용 6/16 · 심화 3/8.
 * «기본까지는 되는데 응용에서 막힌다» — 그리고 심화는 8문항이라 평가를 보류한다.
 */
function isCorrect(round: number, slot: number): boolean {
  const band = SLOT_BANDS[slot]!;
  if (band === "연산") return !(round === 2 && slot === 1);
  if (band === "기본")
    return ![
      [1, 4],
      [3, 3],
      [4, 4],
      [5, 2],
      [6, 4],
    ].some(([r, s]) => r === round && s === slot);
  if (band === "응용")
    return [
      [0, 5],
      [2, 5],
      [3, 6],
      [5, 5],
      [6, 5],
      [7, 5],
    ].some(([r, s]) => r === round && s === slot);
  return round === 1 || round === 4 || round === 7;
}

/** 진도가 없으면 세울 자리 — 이름에 «예시»를 박는다. */
function fallbackUnits(grade: string): CoveredUnit[] {
  return Array.from({ length: 9 }, (_, i) => ({
    unitId: `example-unit-${i}`,
    grade,
    chapter: "(예시 대단원)",
    section: `(예시 소단원 ${i + 1})`,
    lessons: 1,
  }));
}

/** `n` 개 중 고르게 `k` 개(앞뒤 포함). */
function spread<T>(list: T[], k: number): T[] {
  if (list.length <= k) return list;
  return Array.from(
    { length: k },
    (_, i) => list[Math.round((i * (list.length - 1)) / (k - 1))]!,
  );
}

/**
 * 실데이터 팩터 위에 **예시 원시 행**을 얹은 입력. ① 진도는 실데이터의 소단원·차시를 그대로 옮긴다.
 */
export function exampleInput(real: AchievementFactors): AchievementInput {
  const { period } = real;
  const covered = real.learned.units ?? fallbackUnits(real.student.classGrade);
  const units: AchievementUnitRow[] = covered.map((u, i) => ({
    unitId: u.unitId,
    grade: u.grade,
    chapter: u.chapter,
    section: u.section,
    orderIndex: i,
  }));
  // 차시 수는 실데이터 그대로 — 날짜는 셈에 안 쓰인다(계획이 없다).
  const progress = covered.flatMap((u) =>
    Array.from({ length: u.lessons }, () => ({
      unitId: u.unitId,
      recordedAt: period.from,
    })),
  );

  // 시험에 나온 단원 — 고르게 9개: 주 단원 셋(각 12문항 이상) + 곁 단원 여섯(12문항 미만)
  const picked = spread(covered, 9);
  const mains = [picked[1], picked[4], picked[7]].filter(
    (u): u is CoveredUnit => u !== undefined,
  );
  const sides = picked.filter((u) => !mains.includes(u));

  const days = TEST_OFFSETS.map((d) => addDays(period.from, d));
  const results: ResultRow[] = [];
  let taken = 0;
  days.forEach((day, i) => {
    if (!withinPeriod(period, day)) return;
    const testId = `example-test-${i + 1}`;
    const maxScore = testMaxScore(
      SLOT_BANDS.map(() => ({ adjustedScore: null, score: null })),
    );
    if (i === ABSENT_INDEX) {
      results.push({
        testId,
        testDate: day,
        takenAt: `${day}T09:00:00.000Z`,
        score: null,
        maxScore,
        absent: true,
        items: [],
        recommendedUnitIds: null,
      });
      return;
    }
    const round = taken++;
    const main = mains[Math.min(Math.floor((round * 3) / 8), mains.length - 1)];
    const side = sides[round % Math.max(sides.length, 1)];
    const mainSlots = round >= 6 ? 6 : 5;
    const items: ScoredItem[] = SLOT_BANDS.map((band, slot) => ({
      unitId: (slot < mainSlots ? main : side)?.unitId ?? covered[0]!.unitId,
      // 사다리 여섯 갈래 중 리포트 밴드와 같은 이름 — 심화는 «심화하»로 적는다
      difficulty: band === "심화" ? "심화하" : band,
      isCorrect: isCorrect(round, slot),
    }));
    const correct = items.filter((it) => it.isCorrect).length;
    results.push({
      testId,
      testDate: day,
      takenAt: `${day}T09:00:00.000Z`,
      // 균등 배분 — 8문항 × 12.5점(채점기 `gradeAnswers` 와 같은 규칙)
      score: (correct * (maxScore ?? 0)) / items.length,
      maxScore,
      absent: false,
      items,
      recommendedUnitIds: [
        ...new Set(items.filter((it) => !it.isCorrect).map((it) => it.unitId)),
      ],
    });
  });

  // 영상 6편 — 넷은 월말 전에 끝냈고, 하나는 **다음 달 1일**에 끝냈고(안 센다), 하나는 40%
  const end = periodEndExclusive(period).getTime();
  const lectureUnits = covered.slice(0, 6);
  const at = (ms: number) => new Date(ms).toISOString();
  const views: LectureViewRow[] = lectureUnits.map((_, i) => {
    const lectureId = `example-lecture-${i + 1}`;
    if (i === 4)
      return { lectureId, percent: 100, completedAt: at(end + 9 * 3_600_000) };
    if (i === 5) return { lectureId, percent: 40, completedAt: null };
    // 첫 편은 **지난달 말**에 미리 봤다 — 예습이라 아래 경계가 없다
    const day = addDays(period.from, i === 0 ? -3 : 3 + i * 6);
    return {
      lectureId,
      percent: 100,
      completedAt: `${day}T11:00:00.000Z`,
    };
  });

  const homework: HomeworkCheckRow[] = HOMEWORK_OFFSETS.map((d) => ({
    checkedOn: addDays(period.from, d),
    missed: HOMEWORK_MISSED.has(d),
  }));

  return {
    student: real.student,
    period,
    progress,
    units,
    plan: null,
    results,
    lectures: {
      targets: lectureUnits.map((_, i) => ({
        lectureId: `example-lecture-${i + 1}`,
      })),
      views,
    },
    homework,
  };
}

/** 예시 팩터 — **생성한다.** 손으로 적지 않는다. */
export function exampleFactors(real: AchievementFactors): AchievementFactors {
  return collectAchievement(exampleInput(real));
}
