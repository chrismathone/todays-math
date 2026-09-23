import { describe, expect, it } from "vitest";
import { learningInsights } from "@/lib/math-srs/insights";
import { createStore } from "@/lib/math-srs/storage";
import type { Attempt, Mission } from "@/lib/math-srs/types";

const attempt = (answeredAt: string): Attempt => ({
  answeredAt,
  problemId: answeredAt,
  conceptId: "balance",
  templateId: "fixture",
  kind: "warmup",
  submittedAnswer: "",
  correct: false,
  rating: "again",
  usedHint: false,
  elapsedSeconds: 3,
});
const mission = (
  date: string,
  attempts: Attempt[],
  completedAt: string | null = null,
): Mission => ({
  id: date,
  date,
  seed: 1,
  startedAt: `${date}T01:00:00Z`,
  completedAt,
  attempts,
  problems: [],
});

describe("Math SRS learning rhythm", () => {
  it("groups by the actual answer date in KST, including interrupted missions at midnight", () => {
    const learner = createStore().learners[0];
    learner.missions = [
      mission("2026-08-31", [
        attempt("2026-08-31T14:59:59Z"),
        attempt("2026-08-31T15:00:00Z"),
        attempt("2026-08-31T15:10:00Z"),
      ]),
    ];
    const result = learningInsights(learner, new Date("2026-08-31T16:00:00Z"));
    expect(result.week.map((day) => day.date)).toEqual([
      "2026-08-26",
      "2026-08-27",
      "2026-08-28",
      "2026-08-29",
      "2026-08-30",
      "2026-08-31",
      "2026-09-01",
    ]);
    expect(result.week[5]).toMatchObject({ count: 1, today: false });
    expect(result.week[6]).toMatchObject({
      count: 2,
      today: true,
      label: "화",
    });
    expect(result).toMatchObject({
      activeDays: 2,
      weeklyAttempts: 3,
      completed: 0,
    });
  });

  it("excludes older activity from seven-day figures while keeping actual lifetime totals", () => {
    const learner = createStore().learners[0];
    learner.missions = [
      mission(
        "2026-09-01",
        [attempt("2026-09-01T00:00:00Z")],
        "2026-09-01T00:00:00Z",
      ),
      mission("2026-09-22", [attempt("2026-09-22T00:00:00Z")]),
    ];
    const result = learningInsights(learner, new Date("2026-09-23T00:00:00Z"));
    expect(result).toMatchObject({
      activeDays: 1,
      weeklyAttempts: 1,
      completed: 1,
    });
    expect(result.attempts).toHaveLength(2);
    expect(result.week[6]).toMatchObject({ count: 0, today: true });
  });

  it("shows an honest empty rhythm for a new learner", () => {
    const result = learningInsights(
      createStore().learners[0],
      new Date("2026-09-23T00:00:00Z"),
    );
    expect(result).toMatchObject({
      activeDays: 0,
      weeklyAttempts: 0,
      completed: 0,
      correct: 0,
    });
    expect(result.week).toHaveLength(7);
    expect(result.week.every((day) => day.count === 0)).toBe(true);
  });
});
