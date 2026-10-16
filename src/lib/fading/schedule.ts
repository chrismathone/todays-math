import { kstDateOf } from "@/lib/kstDate";
import type { FadingStep } from "./erasure";
import {
  FSRS_RATINGS,
  fsrsPreview,
  type FsrsMemory,
  type FsrsRating,
} from "./fsrs";
import { FADING_PARTIAL_HARD_MAX_DAYS, stepAfterLapse } from "./session";

/**
 * 개념 하나의 기억 상태와, 평가가 그것을 어떻게 옮기는가 (`docs/planning/srs-overhaul-20261006.md` §3 · §4).
 * 날은 정수(날 번호)로 다룬다 — 하루의 경계는 한국 날짜다(`kstDate.ts` 한 곳).
 */
export type FadingProgress = {
  /** 서 있는 단계 — 다음 풀이가 시작하는 단계. */
  step: FadingStep;
  /** 일정 계산기의 기억 값. 아직 평가한 적이 없으면 `null`. */
  memory: FsrsMemory | null;
  reviewedDay: number | null;
  dueDay: number | null;
  reviews: number;
  /** «다시»로 끝난 횟수. */
  lapses: number;
};

export const NEW_FADING_PROGRESS: FadingProgress = Object.freeze({
  step: 1,
  memory: null,
  reviewedDay: null,
  dueDay: null,
  reviews: 0,
  lapses: 0,
});

const DAY_MS = 86_400_000;

/** 한국 날짜 글(YYYY-MM-DD)의 날 번호 — 하루에 1씩 는다. */
export function fadingDayOfDate(date: string): number {
  const day = Date.parse(`${date}T00:00:00Z`) / DAY_MS;
  if (!Number.isInteger(day))
    throw new Error(`날짜가 올바르지 않습니다: ${date}`);
  return day;
}

/** 그 시각의 날 번호 — 한국 날짜가 같으면 같은 수다. */
export function fadingDayOf(at: Date): number {
  return fadingDayOfDate(kstDateOf(at));
}

/** 날 번호의 한국 날짜(YYYY-MM-DD). */
export function fadingDateOf(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

function outcomes(progress: FadingProgress, today: number) {
  if (!Number.isInteger(today)) throw new Error("날 번호는 정수여야 합니다.");
  const elapsed =
    progress.reviewedDay === null
      ? 0
      : Math.max(0, today - progress.reviewedDay);
  return fsrsPreview(progress.memory, elapsed);
}

/**
 * 평가가 잡는 간격(날).
 * - «다시»는 내일이다 — 기억 값은 계산기대로 떨어뜨리되, 틀린 개념을 며칠 뒤로 미루지 않는다.
 * - 4단계 **부분 틀림**의 «어려움»(결정 1 · `partial`)은 2일을 넘지 않는다 — 다음 복습일까지의 완충일 뿐이다.
 *   기억 값은 계산기의 «어려움» 그대로 갱신되므로 과대평가가 풀린다고 할 수 없다(codex 검토 2026-10-16). 깨끗한 «어려움»은 자르지 않는다.
 */
const intervalOf = (rating: FsrsRating, computed: number, partial = false) =>
  rating === "again"
    ? 1
    : partial && rating === "hard"
      ? Math.min(computed, FADING_PARTIAL_HARD_MAX_DAYS)
      : computed;

/** 평가를 옮길 때의 표지 — `partial` 은 4단계 부분 틀림의 평가다(결정 1 · `session.ts` 의 `fadingPartialMiss`). */
export type FadingRatingOptions = { partial?: boolean };

/** 네 단추에 적는 «N일 뒤» — `applyFadingRating` 이 실제로 잡는 간격과 같다(같은 `partial` 을 주면). */
export function previewFadingIntervals(
  progress: FadingProgress,
  today: number,
  options: FadingRatingOptions = {},
): Record<FsrsRating, number> {
  const computed = outcomes(progress, today);
  return Object.fromEntries(
    FSRS_RATINGS.map((r) => [
      r,
      intervalOf(r, computed[r].intervalDays, options.partial),
    ]),
  ) as Record<FsrsRating, number>;
}

/** 풀이를 평가로 닫는다 — `startStep` 은 그 풀이를 시작할 때 서 있던 단계다. */
export function applyFadingRating(
  progress: FadingProgress,
  startStep: FadingStep,
  rating: FsrsRating,
  today: number,
  options: FadingRatingOptions = {},
): FadingProgress {
  const outcome = outcomes(progress, today)[rating];
  const lapsed = rating === "again";
  return {
    step: lapsed ? stepAfterLapse(startStep) : 4,
    memory: outcome.memory,
    reviewedDay: today,
    dueDay: today + intervalOf(rating, outcome.intervalDays, options.partial),
    reviews: progress.reviews + 1,
    lapses: progress.lapses + (lapsed ? 1 : 0),
  };
}
