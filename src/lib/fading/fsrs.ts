/**
 * FSRS-5 long-term schedule (day granularity, no same-day steps, no fuzz).
 * Pure numbers only — callers turn dates into whole elapsed days.
 * Formulas, rounding points and defaults follow ts-fsrs v4.7.1 (see PROVENANCE.md);
 * the reference vectors in `fadingFsrs.test.ts` lock that equivalence.
 */

export const FSRS_RATINGS = ["again", "hard", "good", "easy"] as const;
export type FsrsRating = (typeof FSRS_RATINGS)[number];

/** `stability` is the number of days until recall probability falls to 90%. */
export type FsrsMemory = { stability: number; difficulty: number };
export type FsrsOutcome = { memory: FsrsMemory; intervalDays: number };
export type FsrsPreview = Record<FsrsRating, FsrsOutcome>;

export const FSRS_DEFAULT_WEIGHTS: readonly number[] = Object.freeze([
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575,
  0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655,
  0.6621,
]);

/** Recall probability the next interval aims at. Interval == stability at 0.9. */
export const FSRS_TARGET_RETENTION = 0.9;
export const FSRS_MAX_INTERVAL_DAYS = 36500;

const DECAY = -0.5;
const FACTOR = 19 / 81;
const MIN_STABILITY = 0.01;
const GRADE: Record<FsrsRating, number> = {
  again: 1,
  hard: 2,
  good: 3,
  easy: 4,
};

const round8 = (value: number) => +value.toFixed(8);
const clamp = (value: number, low: number, high: number) =>
  Math.min(Math.max(value, low), high);
const intervalModifier = round8(
  (Math.pow(FSRS_TARGET_RETENTION, 1 / DECAY) - 1) / FACTOR,
);

function assertElapsed(elapsedDays: number) {
  if (!Number.isInteger(elapsedDays) || elapsedDays < 0)
    throw new Error("경과 일수는 0 이상의 정수여야 합니다.");
}

/** Probability (0..1) of recalling after `elapsedDays` with the given stability. */
export function fsrsRetrievability(
  elapsedDays: number,
  stability: number,
): number {
  assertElapsed(elapsedDays);
  if (!(stability >= MIN_STABILITY))
    throw new Error("기억 안정도가 올바르지 않습니다.");
  return round8(Math.pow(1 + (FACTOR * elapsedDays) / stability, DECAY));
}

function constrainDifficulty(difficulty: number) {
  return Math.min(Math.max(round8(difficulty), 1), 10);
}

function initialDifficulty(w: readonly number[], grade: number) {
  return constrainDifficulty(w[4]! - Math.exp((grade - 1) * w[5]!) + 1);
}

function nextDifficulty(
  w: readonly number[],
  difficulty: number,
  grade: number,
) {
  const delta = -w[6]! * (grade - 3);
  const damped = difficulty + round8((delta * (10 - difficulty)) / 9);
  // Mean reversion pulls toward the first-easy difficulty.
  return constrainDifficulty(
    round8(w[7]! * initialDifficulty(w, 4) + (1 - w[7]!) * damped),
  );
}

function recallStability(
  w: readonly number[],
  memory: FsrsMemory,
  retrievability: number,
  grade: number,
) {
  const hardPenalty = grade === 2 ? w[15]! : 1;
  const easyBonus = grade === 4 ? w[16]! : 1;
  return round8(
    clamp(
      memory.stability *
        (1 +
          Math.exp(w[8]!) *
            (11 - memory.difficulty) *
            Math.pow(memory.stability, -w[9]!) *
            (Math.exp((1 - retrievability) * w[10]!) - 1) *
            hardPenalty *
            easyBonus),
      MIN_STABILITY,
      FSRS_MAX_INTERVAL_DAYS,
    ),
  );
}

function forgetStability(
  w: readonly number[],
  memory: FsrsMemory,
  retrievability: number,
) {
  return round8(
    clamp(
      w[11]! *
        Math.pow(memory.difficulty, -w[12]!) *
        (Math.pow(memory.stability + 1, w[13]!) - 1) *
        Math.exp((1 - retrievability) * w[14]!),
      MIN_STABILITY,
      FSRS_MAX_INTERVAL_DAYS,
    ),
  );
}

function intervalFor(stability: number) {
  return Math.min(
    Math.max(1, Math.round(stability * intervalModifier)),
    FSRS_MAX_INTERVAL_DAYS,
  );
}

/**
 * What each of the four ratings would do. `memory` is null for a first review.
 * Intervals are whole days, at least one, and strictly ordered again < hard < good < easy.
 */
export function fsrsPreview(
  memory: FsrsMemory | null,
  elapsedDays: number,
  weights: readonly number[] = FSRS_DEFAULT_WEIGHTS,
): FsrsPreview {
  assertElapsed(elapsedDays);
  if (weights.length !== 19 || weights.some((x) => !Number.isFinite(x)))
    throw new Error("FSRS 가중치는 19개여야 합니다.");
  const w = weights;

  let next: Record<FsrsRating, FsrsMemory>;
  if (memory === null) {
    const first = (rating: FsrsRating): FsrsMemory => ({
      stability: Math.max(w[GRADE[rating] - 1]!, 0.1),
      difficulty: initialDifficulty(w, GRADE[rating]),
    });
    next = {
      again: first("again"),
      hard: first("hard"),
      good: first("good"),
      easy: first("easy"),
    };
  } else {
    if (
      !(memory.stability >= MIN_STABILITY) ||
      !(memory.difficulty >= 1 && memory.difficulty <= 10)
    )
      throw new Error("기억 상태가 올바르지 않습니다.");
    const r = fsrsRetrievability(elapsedDays, memory.stability);
    const recalled = (rating: FsrsRating): FsrsMemory => ({
      stability: recallStability(w, memory, r, GRADE[rating]),
      difficulty: nextDifficulty(w, memory.difficulty, GRADE[rating]),
    });
    next = {
      // A lapse never leaves the memory more stable than it was.
      again: {
        stability: clamp(
          memory.stability,
          MIN_STABILITY,
          forgetStability(w, memory, r),
        ),
        difficulty: nextDifficulty(w, memory.difficulty, 1),
      },
      hard: recalled("hard"),
      good: recalled("good"),
      easy: recalled("easy"),
    };
  }

  const hardRaw = intervalFor(next.hard.stability);
  const again = Math.min(intervalFor(next.again.stability), hardRaw);
  const hard = Math.max(hardRaw, again + 1);
  const good = Math.max(intervalFor(next.good.stability), hard + 1);
  const easy = Math.max(intervalFor(next.easy.stability), good + 1);
  return {
    again: { memory: next.again, intervalDays: again },
    hard: { memory: next.hard, intervalDays: hard },
    good: { memory: next.good, intervalDays: good },
    easy: { memory: next.easy, intervalDays: easy },
  };
}
