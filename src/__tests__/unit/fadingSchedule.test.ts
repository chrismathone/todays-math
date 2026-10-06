import { describe, expect, it } from "vitest";
import { fsrsPreview, fsrsRetrievability } from "@/lib/fading/fsrs";
import {
  FADING_DAILY_CAP,
  FADING_DAYS_KEPT,
  NO_FADING_STREAK,
  advanceFadingStreak,
  currentFadingStreak,
  FADING_LONG_BREAK_DAYS,
  fadingIdleDays,
  fadingLongBreak,
  daysUntilReview,
  fadingQueue,
  fadingRecall,
  forgettingRisk,
  nextReviewDay,
  overdueCount,
  recordFadingDay,
  standingStepCounts,
  toPercent,
  type FadingDay,
} from "@/lib/fading/numbers";
import {
  NEW_FADING_PROGRESS,
  applyFadingRating,
  fadingDateOf,
  fadingDayOf,
  previewFadingIntervals,
  type FadingProgress,
} from "@/lib/fading/schedule";

const TODAY = 20_732;

function rated(
  days: number[],
  ratings: ("again" | "hard" | "good" | "easy")[],
): FadingProgress {
  return ratings.reduce<FadingProgress>(
    (progress, rating, i) =>
      applyFadingRating(progress, progress.step, rating, days[i]!),
    NEW_FADING_PROGRESS,
  );
}

describe("하루의 경계 — 한국 날짜", () => {
  it("한국 자정에 날 번호가 넘어간다", () => {
    const before = fadingDayOf(new Date("2026-10-05T14:59:59Z"));
    const after = fadingDayOf(new Date("2026-10-05T15:00:00Z"));
    expect(after - before).toBe(1);
    expect(fadingDateOf(after)).toBe("2026-10-06");
    expect(fadingDateOf(before)).toBe("2026-10-05");
    expect(fadingDayOf(new Date("2026-10-06T03:00:00Z"))).toBe(after);
  });
});

describe("평가 → 다음 복습", () => {
  it("새 개념은 1단계에 서 있고 기억 값이 없다", () => {
    expect(NEW_FADING_PROGRESS).toEqual({
      step: 1,
      memory: null,
      reviewedDay: null,
      dueDay: null,
      reviews: 0,
      lapses: 0,
    });
  });

  it("첫 평가는 일정 계산기의 첫 값 그대로이고 4단계에 선다", () => {
    const first = fsrsPreview(null, 0);
    for (const rating of ["hard", "good", "easy"] as const)
      expect(applyFadingRating(NEW_FADING_PROGRESS, 1, rating, TODAY)).toEqual({
        step: 4,
        memory: first[rating].memory,
        reviewedDay: TODAY,
        dueDay: TODAY + first[rating].intervalDays,
        reviews: 1,
        lapses: 0,
      });
  });

  it("«다시»는 내일이다 — 기억 값은 계산기대로 떨어지고, 한 단계 앞에 선다", () => {
    const steady = rated(
      [TODAY - 60, TODAY - 57, TODAY - 40],
      ["good", "good", "good"],
    );
    const elapsed = TODAY - steady.reviewedDay!;
    const outcome = fsrsPreview(steady.memory, elapsed).again;
    expect(outcome.intervalDays).toBeGreaterThan(1);
    expect(applyFadingRating(steady, 4, "again", TODAY)).toEqual({
      step: 3,
      memory: outcome.memory,
      reviewedDay: TODAY,
      dueDay: TODAY + 1,
      reviews: 4,
      lapses: 1,
    });
    expect(applyFadingRating(steady, 3, "again", TODAY).step).toBe(2);
    expect(
      applyFadingRating(NEW_FADING_PROGRESS, 1, "again", TODAY),
    ).toMatchObject({ step: 2, dueDay: TODAY + 1, lapses: 1 });
  });

  it("지난 날 수는 마지막 평가 날에서 센다 — 늦게 복습할수록 간격이 더 는다", () => {
    const base = rated([TODAY - 30], ["good"]);
    const onTime = applyFadingRating(base, 4, "good", base.dueDay!);
    const late = applyFadingRating(base, 4, "good", base.dueDay! + 10);
    expect(late.dueDay! - late.reviewedDay!).toBeGreaterThan(
      onTime.dueDay! - onTime.reviewedDay!,
    );
    expect(onTime.memory).toEqual(
      fsrsPreview(base.memory, base.dueDay! - base.reviewedDay!).good.memory,
    );
  });

  it("시계가 뒤로 가 있어도 지난 날 수는 0 아래로 내려가지 않는다", () => {
    const base = rated([TODAY], ["good"]);
    expect(applyFadingRating(base, 4, "good", TODAY - 3).memory).toEqual(
      fsrsPreview(base.memory, 0).good.memory,
    );
  });

  it("단추에 적는 «N일 뒤»는 실제로 잡히는 간격과 같다", () => {
    const base = rated([TODAY - 12, TODAY - 9], ["good", "hard"]);
    const preview = previewFadingIntervals(base, TODAY);
    expect(preview.again).toBe(1);
    for (const rating of ["again", "hard", "good", "easy"] as const)
      expect(applyFadingRating(base, 4, rating, TODAY).dueDay).toBe(
        TODAY + preview[rating],
      );
    expect(preview.hard).toBeLessThan(preview.good);
    expect(preview.good).toBeLessThan(preview.easy);
    expect(previewFadingIntervals(NEW_FADING_PROGRESS, TODAY)).toEqual({
      again: 1,
      hard: 2,
      good: 3,
      easy: 16,
    });
  });

  it("날 번호가 정수가 아니면 거절한다", () => {
    expect(() =>
      applyFadingRating(NEW_FADING_PROGRESS, 1, "good", TODAY + 0.5),
    ).toThrow();
  });
});

describe("숫자 — 망각 위험 · 다음 복습", () => {
  const fresh = rated([TODAY], ["good"]);
  const old = rated([TODAY - 20], ["good"]);

  it("평가 전인 개념은 값이 없다", () => {
    expect(fadingRecall(NEW_FADING_PROGRESS, TODAY)).toBeNull();
    expect(forgettingRisk(NEW_FADING_PROGRESS, TODAY)).toBeNull();
    expect(daysUntilReview(NEW_FADING_PROGRESS, TODAY)).toBeNull();
  });

  it("떠올릴 확률은 일정 계산기의 곡선이고, 망각 위험은 그 나머지다", () => {
    expect(fadingRecall(fresh, TODAY)).toBe(1);
    const recall = fsrsRetrievability(20, old.memory!.stability);
    expect(fadingRecall(old, TODAY)).toBe(recall);
    expect(forgettingRisk(old, TODAY)).toBeCloseTo(1 - recall, 10);
    expect(forgettingRisk(fresh, TODAY)).toBe(0);
  });

  it("다음 복습은 오늘에서 센 날 수다 — 밀렸으면 음수", () => {
    expect(daysUntilReview(fresh, TODAY)).toBe(3);
    expect(daysUntilReview(old, TODAY)).toBe(-17);
  });

  it("퍼센트는 한 곳에서 반올림한다", () => {
    expect([0, 0.004, 0.006, 0.896, 1].map(toPercent)).toEqual([
      0, 0, 1, 90, 100,
    ]);
  });

  it("서 있는 단계마다 개념 수를 센다", () => {
    expect(
      standingStepCounts([
        NEW_FADING_PROGRESS,
        fresh,
        old,
        applyFadingRating(old, 4, "again", TODAY),
      ]),
    ).toEqual({ 1: 1, 2: 0, 3: 1, 4: 2 });
  });
});

describe("오늘의 대기열 — 망각 위험이 큰 것부터, 하루 상한까지", () => {
  const progress: Record<string, FadingProgress> = {
    soon: rated([TODAY - 1], ["good"]),
    stale: rated([TODAY - 40], ["good"]),
    due: rated([TODAY - 3], ["good"]),
    lapsed: rated([TODAY - 1], ["again"]),
    picked: NEW_FADING_PROGRESS,
    halfway: { ...NEW_FADING_PROGRESS, step: 3 },
  };

  it("복습일이 된 개념만 대기열에 들고, 위험이 큰 것이 먼저다", () => {
    const queue = fadingQueue(progress, TODAY);
    expect(queue.due).toEqual(["stale", "lapsed", "due"]);
    expect(queue.held).toEqual([]);
    const risks = queue.due.map((id) => forgettingRisk(progress[id]!, TODAY)!);
    expect(risks).toEqual([...risks].sort((a, b) => b - a));
  });

  it("아직 평가 전인 개념은 따로 나온다 — 풀다 만 것이 먼저", () => {
    expect(fadingQueue(progress, TODAY).unrated).toEqual(["halfway", "picked"]);
  });

  it("«나눠서»는 하루 상한까지만 내고 나머지는 미룬다 — 오늘 이미 한 복습은 상한에서 뺀다", () => {
    expect(fadingQueue(progress, TODAY, { cap: 2 })).toMatchObject({
      due: ["stale", "lapsed"],
      held: ["due"],
    });
    expect(
      fadingQueue(progress, TODAY, { cap: 2, reviewedToday: 1 }),
    ).toMatchObject({ due: ["stale"], held: ["lapsed", "due"] });
    expect(
      fadingQueue(progress, TODAY, { cap: 2, reviewedToday: 5 }),
    ).toMatchObject({ due: [], held: ["stale", "lapsed", "due"] });
  });

  it("«오늘 전부»는 상한을 보지 않는다", () => {
    expect(
      fadingQueue(progress, TODAY, { mode: "all", cap: 1, reviewedToday: 9 }),
    ).toMatchObject({ due: ["stale", "lapsed", "due"], held: [] });
  });

  it("위험이 같으면 열쇠 차례다 — 같은 날 같은 평가로 배운 개념들이 그렇다", () => {
    const same = rated([TODAY - 3], ["good"]);
    expect(fadingQueue({ b: same, a: same }, TODAY).due).toEqual(["a", "b"]);
  });

  it("상한의 처음 값은 스무 개다", () => {
    expect(FADING_DAILY_CAP).toBe(20);
    const many = Object.fromEntries(
      Array.from({ length: 25 }, (_, i) => [
        `c${String(i).padStart(2, "0")}`,
        rated([TODAY - 5 - i], ["good"]),
      ]),
    );
    const queue = fadingQueue(many, TODAY);
    expect([queue.due.length, queue.held.length]).toEqual([20, 5]);
  });
});

describe("날마다의 집계 · 연속 일수", () => {
  const day = (d: number, reviews = 1): FadingDay => ({
    day: d,
    reviews,
    passed: reviews,
    fresh: 0,
  });

  it("평가 하나를 그날의 줄에 더한다 — 줄이 없으면 만든다", () => {
    let days = recordFadingDay([], TODAY, { passed: true, fresh: true });
    days = recordFadingDay(days, TODAY, { passed: false, fresh: false });
    days = recordFadingDay(days, TODAY + 1, { passed: true, fresh: false });
    expect(days).toEqual([
      { day: TODAY, reviews: 2, passed: 1, fresh: 1 },
      { day: TODAY + 1, reviews: 1, passed: 1, fresh: 0 },
    ]);
  });

  it("받은 집계를 바꾸지 않고, 날짜 차례로 두고, 오래된 줄부터 버린다", () => {
    const before = [day(TODAY - 1)];
    const after = recordFadingDay(before, TODAY - 2, {
      passed: true,
      fresh: false,
    });
    expect(before).toEqual([day(TODAY - 1)]);
    expect(after.map((d) => d.day)).toEqual([TODAY - 2, TODAY - 1]);
    const full = Array.from({ length: FADING_DAYS_KEPT }, (_, i) => day(i + 1));
    const next = recordFadingDay(full, FADING_DAYS_KEPT + 1, {
      passed: true,
      fresh: false,
    });
    expect(next.length).toBe(FADING_DAYS_KEPT);
    expect(next[0]!.day).toBe(2);
  });

  it("연속은 어제에서 이어지면 하루 늘고, 끊겼으면 1 부터다 — 같은 날 또 닫아도 그대로다", () => {
    const one = advanceFadingStreak(NO_FADING_STREAK, TODAY - 2);
    expect(one).toEqual({ current: 1, best: 1, lastDay: TODAY - 2 });
    const two = advanceFadingStreak(one, TODAY - 1);
    expect(two).toEqual({ current: 2, best: 2, lastDay: TODAY - 1 });
    expect(advanceFadingStreak(two, TODAY - 1)).toBe(two);
    expect(advanceFadingStreak(two, TODAY + 3)).toEqual({
      current: 1,
      best: 2,
      lastDay: TODAY + 3,
    });
    expect(NO_FADING_STREAK).toEqual({ current: 0, best: 0, lastDay: null });
  });

  it("보여 줄 연속 일수 — 오늘 아직 안 했어도 어제까지 이어졌으면 그 수이고, 하루를 건너뛰었으면 0 이다", () => {
    const two = { current: 2, best: 5, lastDay: TODAY - 1 };
    expect(currentFadingStreak(NO_FADING_STREAK, TODAY)).toBe(0);
    expect(currentFadingStreak(two, TODAY - 1)).toBe(2);
    expect(currentFadingStreak(two, TODAY)).toBe(2);
    expect(currentFadingStreak(two, TODAY + 1)).toBe(0);
  });

  it("쉰 날 수는 마지막으로 평가를 닫은 날부터 센다 — 평가한 적이 없으면 없고, 이레부터 «오래 쉼»이다", () => {
    expect(fadingIdleDays(null, TODAY)).toBeNull();
    expect(fadingIdleDays(TODAY, TODAY)).toBe(0);
    expect(fadingIdleDays(TODAY - 9, TODAY)).toBe(9);
    // 날짜를 뒤로 옮겨 본 기록(테스트 도구판)에서도 음수를 내지 않는다.
    expect(fadingIdleDays(TODAY + 2, TODAY)).toBe(0);
    expect(FADING_LONG_BREAK_DAYS).toBe(7);
    expect(fadingLongBreak(null)).toBe(false);
    expect(fadingLongBreak(0)).toBe(false);
    expect(fadingLongBreak(6)).toBe(false);
    expect(fadingLongBreak(7)).toBe(true);
    expect(fadingLongBreak(30)).toBe(true);
  });

  it("밀린 복습과 다음 복습 — 밀린 것은 복습일이 지난 것만, 다음은 오늘보다 뒤의 가장 가까운 날과 그날의 개념 수", () => {
    const at = (dueDay: number | null): FadingProgress => ({
      ...NEW_FADING_PROGRESS,
      dueDay,
    });
    // 차례가 섞여 있어도(먼 날 → 가까운 날 → 더 먼 날) 가장 가까운 날을 고른다.
    const mixed = [
      at(TODAY + 9),
      at(null),
      at(TODAY - 3),
      at(TODAY + 2),
      at(TODAY),
      at(TODAY + 30),
      at(TODAY + 2),
      at(TODAY - 1),
    ];
    expect(overdueCount(mixed, TODAY)).toBe(2);
    expect(nextReviewDay(mixed, TODAY)).toEqual({ day: TODAY + 2, count: 2 });
    expect(nextReviewDay([...mixed].reverse(), TODAY)).toEqual({
      day: TODAY + 2,
      count: 2,
    });
    // 날이 지나면 지난 것은 밀린 것으로 넘어가고 다음은 그 뒤의 날이다.
    expect(overdueCount(mixed, TODAY + 2)).toBe(3);
    expect(nextReviewDay(mixed, TODAY + 2)).toEqual({
      day: TODAY + 9,
      count: 1,
    });
    expect(nextReviewDay(mixed, TODAY + 30)).toBeNull();
    expect(nextReviewDay([at(null), at(TODAY)], TODAY)).toBeNull();
    expect(nextReviewDay([], TODAY)).toBeNull();
    expect(overdueCount([], TODAY)).toBe(0);
  });
});
