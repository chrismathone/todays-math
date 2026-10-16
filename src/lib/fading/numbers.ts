import { allocateDaily } from "./dailyPlan";
import { FADING_STEPS, type FadingStep } from "./erasure";
import { fsrsRetrievability } from "./fsrs";
import type { FadingProgress } from "./schedule";

/**
 * 화면에 싣는 숫자 — 한 이름에 한 계산 (`docs/planning/srs-overhaul-20261006.md` §3 · §4-9 · §13).
 * 개념마다 싣는 것은 둘이다: 다음 복습(오늘 · 밀림 · «N일 뒤»)과 망각 위험(추정). 나머지는 세는 값이다(오늘 한 복습 · 연속 · 단계별 수).
 * 🔴 **전체를 한 값으로 뭉친 «기억 보존율»은 내지 않는다**(codex 합의 2026-10-06) — 학생이 고른 개념의 구성과 스스로 매긴 평가에 따라
 * 움직이는 평균이라, 기억이 는 것처럼 읽히고 평가를 후하게 매길 까닭이 된다.
 * 화면은 여기서 낸 값을 그리기만 한다 — 같은 수를 다른 식으로 다시 세지 않는다.
 */

/**
 * 하루 분량의 상한(«나눠서») — 칸은 **명제**다(결정 4 · 2026-10-16): 홈과 «오늘의 학습» 계획이 같은 20칸을 쓴다.
 * 명제 비용을 모르는 부름(`fadingQueue` 에 `slots` 없음)은 지금까지처럼 개념 수로 센다.
 */
export const FADING_DAILY_CAP = 20;
/** 날마다의 집계를 남기는 날 수. */
export const FADING_DAYS_KEPT = 400;

/** 날 하나의 집계 — 답 하나하나가 아니라 그날 평가로 닫은 풀이의 수만 남긴다. */
export type FadingDay = {
  day: number;
  /** 평가로 닫은 풀이. */
  reviews: number;
  /** 그중 «다시»가 아닌 것. 🔴 정답률이 아니다 — 스스로 매긴 평가의 수다. */
  passed: number;
  /** 그중 그 개념의 첫 평가. */
  fresh: number;
};

export type FadingQueueMode = "split" | "all";

/** 지금 떠올릴 확률(0 ~ 1)의 추정. 평가한 적이 없으면 `null`. */
export function fadingRecall(
  progress: FadingProgress,
  today: number,
): number | null {
  if (!progress.memory || progress.reviewedDay === null) return null;
  return fsrsRetrievability(
    Math.max(0, today - progress.reviewedDay),
    progress.memory.stability,
  );
}

/** 망각 위험(0 ~ 1) — 떠올릴 확률의 나머지. 일정 계산기의 추정이지 잰 값이 아니다. */
export function forgettingRisk(
  progress: FadingProgress,
  today: number,
): number | null {
  const recall = fadingRecall(progress, today);
  return recall === null ? null : 1 - recall;
}

/** 다음 복습까지 남은 날 수 — 0 은 오늘, 음수는 밀린 날 수. */
export function daysUntilReview(
  progress: FadingProgress,
  today: number,
): number | null {
  return progress.dueDay === null ? null : progress.dueDay - today;
}

/** 밀린 복습의 수 — 복습일이 **지난** 것만 센다(오늘이 복습일인 것 · 평가 전인 것은 아니다). 교사 현황의 «밀린 개념»과 같은 셈이다. */
export function overdueCount(
  progress: readonly FadingProgress[],
  today: number,
): number {
  return progress.filter((p) => {
    const days = daysUntilReview(p, today);
    return days !== null && days < 0;
  }).length;
}

/**
 * 다음 복습 — 오늘보다 **뒤**의 가장 가까운 복습일(날 번호)과 그날이 복습일인 개념 수. 오늘 것 · 밀린 것은 «다음»이 아니다.
 * 평가한 개념이 없거나 앞날의 복습이 없으면 `null`.
 */
export function nextReviewDay(
  progress: readonly FadingProgress[],
  today: number,
): { day: number; count: number } | null {
  let day: number | null = null;
  let count = 0;
  for (const p of progress) {
    if (p.dueDay === null || p.dueDay <= today) continue;
    if (day === null || p.dueDay < day) {
      day = p.dueDay;
      count = 1;
    } else if (p.dueDay === day) count += 1;
  }
  return day === null ? null : { day, count };
}

/** 비율을 화면의 퍼센트로 — 반올림은 여기 한 곳에서만 한다. */
export function toPercent(ratio: number): number {
  return Math.round(ratio * 100);
}

export function standingStepCounts(
  progresses: Iterable<FadingProgress>,
): Record<FadingStep, number> {
  const counts = Object.fromEntries(FADING_STEPS.map((s) => [s, 0])) as Record<
    FadingStep,
    number
  >;
  for (const progress of progresses) counts[progress.step] += 1;
  return counts;
}

/**
 * 오늘의 대기열.
 * - `due` — 복습일이 된 개념, 망각 위험이 큰 것부터(같으면 열쇠 차례). «나눠서»는 하루 상한에서 오늘 이미 한 것을 뺀 만큼만 낸다.
 * - `held` — 상한 때문에 다음으로 미룬 것(«오늘 전부»면 비어 있다). 미룬 개념의 복습일은 그대로다.
 * - `unrated` — 골라 두었거나 풀다 만, 아직 평가 전인 개념. 풀다 만 것이 먼저다.
 *
 * **명제 칸(`slots` — 결정 4)** 을 주면 «오늘의 학습» 계획과 같은 셈이다(`dailyPlan.ts` 의 `allocateDaily`):
 * 칸은 개념의 명제 수 · 묶음은 쪼개지 않고 남은 칸에 안 들어가면 건너뛰고 다음 것을 본다 · `reviewedToday` 는 오늘 닫은 **명제** 수다(첫 평가 포함) ·
 * 복습 → 평가 전 개념의 차례로 넣고, 평가 전 개념도 남은 칸에 들어갈 때만 낸다 · 풀던 개념(`open`)은 빚진 것이라 넘어도 낸다 ·
 * «오늘 전부»면 복습을 다 낸다(평가 전 개념은 그래도 남은 칸에서만 — 계획과 같다).
 * 주지 않으면 지금까지의 개념 수 규칙이다(복습만 상한을 보고, 평가 전 개념은 다 낸다).
 */
export function fadingQueue(
  progressById: Readonly<Record<string, FadingProgress>>,
  today: number,
  options: {
    mode?: FadingQueueMode;
    cap?: number;
    reviewedToday?: number;
    /** 개념의 칸(명제 수) — 주면 명제 칸으로 나눈다(결정 4). */
    slots?: (id: string) => number;
    /** 풀던 개념(열린 풀이) — 명제 칸으로 나눌 때 빚진 것이다. */
    open?: string | null;
  } = {},
): { due: string[]; held: string[]; unrated: string[] } {
  const { mode = "split", cap = FADING_DAILY_CAP, reviewedToday = 0 } = options;
  const ready: { id: string; risk: number }[] = [];
  const unrated: { id: string; step: FadingStep }[] = [];
  for (const [id, progress] of Object.entries(progressById)) {
    const risk = forgettingRisk(progress, today);
    if (risk === null || progress.dueDay === null)
      unrated.push({ id, step: progress.step });
    else if (progress.dueDay <= today) ready.push({ id, risk });
  }
  const byId = (a: { id: string }, b: { id: string }) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  ready.sort((a, b) => b.risk - a.risk || byId(a, b));
  unrated.sort((a, b) => b.step - a.step || byId(a, b));
  if (options.slots) {
    const slots = options.slots;
    const allocation = allocateDaily({
      quota: cap,
      done: reviewedToday,
      candidates: [
        ...ready.map((r) => ({
          key: r.id,
          slots: slots(r.id),
          owed: mode === "all" || r.id === options.open,
        })),
        ...unrated.map((u) => ({
          key: u.id,
          slots: slots(u.id),
          owed: u.id === options.open,
        })),
      ],
    });
    const chosen = new Set(allocation.chosen);
    return {
      due: ready.filter((r) => chosen.has(r.id)).map((r) => r.id),
      held: ready.filter((r) => !chosen.has(r.id)).map((r) => r.id),
      unrated: unrated.filter((u) => chosen.has(u.id)).map((u) => u.id),
    };
  }
  const room = mode === "all" ? ready.length : Math.max(0, cap - reviewedToday);
  return {
    due: ready.slice(0, room).map((r) => r.id),
    held: ready.slice(room).map((r) => r.id),
    unrated: unrated.map((u) => u.id),
  };
}

/** 평가로 닫은 풀이 하나를 그날의 집계에 더한다. 받은 집계는 바꾸지 않는다. */
export function recordFadingDay(
  days: readonly FadingDay[],
  today: number,
  outcome: { passed: boolean; fresh: boolean },
): FadingDay[] {
  const current = days.find((d) => d.day === today) ?? {
    day: today,
    reviews: 0,
    passed: 0,
    fresh: 0,
  };
  const updated = {
    day: today,
    reviews: current.reviews + 1,
    passed: current.passed + (outcome.passed ? 1 : 0),
    fresh: current.fresh + (outcome.fresh ? 1 : 0),
  };
  return [...days.filter((d) => d.day !== today), updated]
    .sort((a, b) => a.day - b.day)
    .slice(-FADING_DAYS_KEPT);
}

/**
 * «N일 연속»의 요약 — 날마다의 집계(400일까지)와 따로 간다, 그보다 긴 연속도 세도록.
 * 하루는 **평가까지 닫은 풀이가 하나라도 있으면** 인정한다(«다시»여도). 같은 날 여럿을 닫아도 하루다.
 */
export type FadingStreak = {
  current: number;
  best: number;
  /** 마지막으로 평가를 닫은 날. */
  lastDay: number | null;
};

export const NO_FADING_STREAK: FadingStreak = Object.freeze({
  current: 0,
  best: 0,
  lastDay: null,
});

/** 오늘 평가 하나를 닫았을 때의 요약 — 어제에서 이어지면 하루 늘고, 끊겼으면 1 부터다. */
export function advanceFadingStreak(
  streak: FadingStreak,
  today: number,
): FadingStreak {
  if (streak.lastDay === today) return streak;
  const current = streak.lastDay === today - 1 ? streak.current + 1 : 1;
  return { current, best: Math.max(streak.best, current), lastDay: today };
}

/**
 * 오래 쉼 — 마지막으로 평가를 닫은 날부터 이만큼(날) 이상. 학생 홈의 «오래 쉬고 돌아옴»과 교사 현황의 «오래 쉼»이 **같은 값**을 쓴다.
 * 자료로 맞춘 값이 아니다(탐험 교사 보기에서 맞춘 값을 가져왔다 · `teacher.ts`). 바꾸면 교사 현황의 정책 판도 올린다.
 */
export const FADING_LONG_BREAK_DAYS = 7;

/** 쉰 날 수 — 마지막으로 평가를 닫은 날부터 오늘까지. 평가한 적이 없으면 `null` 이다(쉰 것이 아니라 시작 전). */
export function fadingIdleDays(
  lastDay: number | null,
  today: number,
): number | null {
  return lastDay === null ? null : Math.max(0, today - lastDay);
}

/** 오래 쉬었는가 — 화면은 이 값으로 가르고, 날 수로 문턱을 다시 짓지 않는다. */
export function fadingLongBreak(idleDays: number | null): boolean {
  return idleDays !== null && idleDays >= FADING_LONG_BREAK_DAYS;
}

/** 지금 보여 줄 연속 일수 — 오늘 아직 안 했어도 어제까지 이어졌으면 그 수다(오늘이 끝나기 전에는 끊기지 않는다). */
export function currentFadingStreak(
  streak: FadingStreak,
  today: number,
): number {
  return streak.lastDay !== null && streak.lastDay >= today - 1
    ? streak.current
    : 0;
}
