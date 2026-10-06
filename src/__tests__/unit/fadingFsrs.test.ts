import { describe, expect, it } from "vitest";
import {
  FSRS_DEFAULT_WEIGHTS,
  FSRS_RATINGS,
  fsrsPreview,
  fsrsRetrievability,
  type FsrsMemory,
  type FsrsOutcome,
  type FsrsRating,
} from "@/lib/fading/fsrs";

/**
 * Reference vectors: ts-fsrs v4.7.1 `__tests__/impl/long-term_scheduler.test.ts`
 * (FSRS-5, `enable_short_term: false`, fuzz off). Every review happens on its due day.
 * The expectations come from that project, not from this implementation.
 */
const REFERENCE_WEIGHTS = [
  0.4197, 1.1869, 3.0412, 15.2441, 7.1434, 0.6477, 1.0007, 0.0674, 1.6597,
  0.1712, 1.1178, 2.0225, 0.0904, 0.3025, 2.1214, 0.2498, 2.9466, 0.4891,
  0.6468,
];

const VECTORS: {
  name: string;
  ratings: FsrsRating[];
  intervals: number[];
  stability: number[];
  difficulty: number[];
}[] = [
  {
    name: "test1",
    ratings: [
      "good",
      "good",
      "good",
      "good",
      "good",
      "good",
      "again",
      "again",
      "good",
      "good",
      "good",
      "good",
      "good",
    ],
    intervals: [3, 13, 48, 155, 445, 1158, 17, 3, 11, 37, 112, 307, 773],
    stability: [
      3.0412, 13.09130698, 48.15848988, 154.93732625, 445.05562739,
      1158.07779739, 16.63063166, 3.01732209, 11.42247264, 37.37521902,
      111.8752758, 306.5974569, 772.94031572,
    ],
    difficulty: [
      4.49094334, 4.26664289, 4.05746029, 3.86237659, 3.68044154, 3.51076891,
      4.69833071, 5.55956298, 5.26323756, 4.98688448, 4.72915759, 4.4888015,
      4.26464541,
    ],
  },
  {
    name: "test2",
    ratings: ["again", "hard", "good", "easy", "again", "hard", "good", "easy"],
    intervals: [1, 2, 6, 41, 4, 7, 21, 133],
    stability: [
      0.4197, 1.0344317, 5.5356759, 41.0033667, 4.46605519, 6.67743292,
      20.88868155, 132.81849454,
    ],
    difficulty: [
      7.1434, 7.03653841, 6.64066485, 5.92312772, 6.44779861, 6.45995078,
      6.10293922, 5.36588547,
    ],
  },
  {
    name: "test3",
    ratings: ["hard", "good", "easy", "again", "hard", "good", "easy", "again"],
    intervals: [2, 7, 54, 5, 8, 26, 171, 8],
    stability: [
      1.1869, 6.59167572, 53.76078737, 5.0853693, 8.09786749, 25.52991279,
      171.16195166, 8.11072373,
    ],
    difficulty: [
      6.23225985, 5.89059466, 5.14583392, 5.884097, 5.99269555, 5.667177,
      4.91430736, 5.71619151,
    ],
  },
  {
    name: "test4",
    ratings: ["good", "easy", "again", "hard", "good", "easy", "again", "hard"],
    intervals: [3, 33, 4, 7, 26, 193, 9, 14],
    stability: [
      3.0412, 32.65484522, 4.22256838, 7.23250123, 25.52681848, 193.36619432,
      8.63899858, 14.31323884,
    ],
    difficulty: [
      4.49094334, 3.69538259, 4.83221448, 5.12078462, 4.85403286, 4.07165035,
      5.1050878, 5.34697075,
    ],
  },
  {
    name: "test5",
    ratings: ["easy", "again", "hard", "good", "easy", "again", "hard", "good"],
    intervals: [15, 3, 6, 27, 240, 10, 17, 60],
    stability: [
      15.2441, 3.25621013, 6.32684549, 26.56339029, 239.70462771, 9.75621519,
      17.06035531, 59.59547542,
    ],
    difficulty: [
      1.16304343, 2.99573557, 3.59851762, 3.43436666, 2.60045771, 4.03816348,
      4.46259158, 4.24020203,
    ],
  },
];

describe("FSRS-5 long-term schedule — reference vectors", () => {
  it.each(VECTORS)("$name replays the reference history", (vector) => {
    let memory: FsrsMemory | null = null;
    let elapsed = 0;
    const intervals: number[] = [];
    const stability: number[] = [];
    const difficulty: number[] = [];
    for (const rating of vector.ratings) {
      const next: FsrsOutcome = fsrsPreview(memory, elapsed, REFERENCE_WEIGHTS)[
        rating
      ];
      intervals.push(next.intervalDays);
      stability.push(next.memory.stability);
      difficulty.push(next.memory.difficulty);
      memory = next.memory;
      elapsed = next.intervalDays;
    }
    expect(intervals).toEqual(vector.intervals);
    expect(stability).toEqual(vector.stability);
    expect(difficulty).toEqual(vector.difficulty);
  });
});

describe("FSRS-5 long-term schedule — properties", () => {
  it("has the 19 FSRS-5 default weights", () => {
    expect(FSRS_DEFAULT_WEIGHTS).toHaveLength(19);
    expect(FSRS_DEFAULT_WEIGHTS.slice(0, 4)).toEqual([
      0.40255, 1.18385, 3.173, 15.69105,
    ]);
  });

  it("retrievability is 1 at once and 0.9 after one stability", () => {
    expect(fsrsRetrievability(0, 7)).toBe(1);
    expect(fsrsRetrievability(7, 7)).toBe(0.9);
    expect(fsrsRetrievability(30, 7)).toBeLessThan(fsrsRetrievability(8, 7));
  });

  it("orders the four first intervals and keeps them at least a day", () => {
    const first = fsrsPreview(null, 0);
    expect(FSRS_RATINGS.map((r) => first[r].intervalDays)).toEqual([
      1, 2, 3, 16,
    ]);
  });

  it("keeps again < hard < good < easy after any review", () => {
    let memory: FsrsMemory | null = null;
    let elapsed = 0;
    for (const rating of ["good", "hard", "again", "easy", "good"] as const) {
      const preview = fsrsPreview(memory, elapsed);
      const days = FSRS_RATINGS.map((r) => preview[r].intervalDays);
      expect(days[0]).toBeGreaterThanOrEqual(1);
      expect(days[0]).toBeLessThan(days[1]!);
      expect(days[1]).toBeLessThan(days[2]!);
      expect(days[2]).toBeLessThan(days[3]!);
      memory = preview[rating].memory;
      elapsed = preview[rating].intervalDays;
    }
  });

  it("a lapse never raises stability", () => {
    const memory = fsrsPreview(null, 0).easy.memory;
    for (const elapsed of [0, 1, 16, 400]) {
      expect(
        fsrsPreview(memory, elapsed).again.memory.stability,
      ).toBeLessThanOrEqual(memory.stability);
    }
  });

  it("recalling later than due strengthens memory more than on time", () => {
    const memory = fsrsPreview(null, 0).good.memory;
    const onTime = fsrsPreview(memory, 3).good.memory.stability;
    const late = fsrsPreview(memory, 9).good.memory.stability;
    expect(late).toBeGreaterThan(onTime);
  });

  it("rejects impossible inputs instead of scheduling from them", () => {
    const memory = fsrsPreview(null, 0).good.memory;
    expect(() => fsrsPreview(memory, -1)).toThrow();
    expect(() => fsrsPreview(memory, 1.5)).toThrow();
    expect(() => fsrsPreview({ stability: 0, difficulty: 5 }, 1)).toThrow();
    expect(() => fsrsPreview({ stability: 3, difficulty: 0.5 }, 1)).toThrow();
    expect(() => fsrsPreview(null, 0, [1, 2, 3])).toThrow();
    expect(() => fsrsRetrievability(-1, 3)).toThrow();
  });
});
