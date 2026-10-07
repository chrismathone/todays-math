// @vitest-environment node
// 하루 분량을 후보에 나누는 셈(`dailyPlan.ts`) — 수와 후보만으로 돈다.
import { describe, expect, it } from "vitest";
import { allocateDaily, type DailyCandidate } from "@/lib/fading/dailyPlan";

const many = (
  name: string,
  count: number,
  slots = 1,
  extra: Partial<DailyCandidate> = {},
): DailyCandidate[] =>
  Array.from({ length: count }, (_, i) => ({
    key: `${name}-${String(i + 1).padStart(2, "0")}`,
    slots,
    ...extra,
  }));
const slotsOf = (candidates: readonly DailyCandidate[], chosen: string[]) =>
  candidates
    .filter((c) => chosen.includes(c.key))
    .reduce((n, c) => n + c.slots, 0);

describe("분량은 넘지 않는 합계다", () => {
  it("받은 차례대로 넣고 분량에서 멈춘다 — 정해 둔 비율이 없다", () => {
    // 복습 묶음 넷(명제 5 · 4 · 3 · 5) → 선수 확인 하나(3) → 탐험 10문제 → 새 개념 둘.
    const candidates: DailyCandidate[] = [
      { key: "review-1", slots: 5 },
      { key: "review-2", slots: 4 },
      { key: "prerequisite-1", slots: 3 },
      { key: "block", slots: 10 },
      { key: "new-1", slots: 5 },
      { key: "new-2", slots: 3 },
    ];
    const plan = allocateDaily({ quota: 20, done: 0, candidates });
    // 5 + 4 + 3 = 12, 남은 8칸에 10문제 덩이는 안 들어간다 → 건너뛰고 새 개념 5 + 3 이 들어간다.
    expect(plan.chosen).toEqual([
      "review-1",
      "review-2",
      "prerequisite-1",
      "new-1",
      "new-2",
    ]);
    expect(plan.skipped).toEqual(["block"]);
    expect(plan.planned).toBe(20);
    expect(plan.unfilled).toBe(0);
    expect(plan.over).toBe(0);
  });

  it("앞선 것이 분량을 다 쓰면 뒤의 것은 0 이다", () => {
    const candidates = [...many("review", 6, 4), { key: "block", slots: 10 }];
    const plan = allocateDaily({ quota: 20, done: 0, candidates });
    expect(plan.chosen).toEqual(many("review", 5, 4).map((c) => c.key));
    expect(plan.skipped).toEqual(["review-06", "block"]);
    expect(plan.planned).toBe(20);
  });

  it("남은 칸에 통째로 안 들어가는 것은 줄여서 넣지 않는다 — 건너뛰고, 못 채운 칸을 낸다", () => {
    // 남은 4칸에 10문제 덩이를 넣지 않는다.
    const candidates = [...many("review", 4, 4), { key: "block", slots: 10 }];
    const plan = allocateDaily({ quota: 20, done: 0, candidates });
    expect(plan.chosen).toEqual(many("review", 4, 4).map((c) => c.key));
    expect(plan.skipped).toEqual(["block"]);
    expect(plan.planned).toBe(16);
    expect(plan.unfilled).toBe(4);
    expect(plan.over).toBe(0);
  });

  it("건너뛴 뒤의 더 작은 것은 들어간다(차례는 그대로)", () => {
    const candidates: DailyCandidate[] = [
      { key: "a", slots: 5 },
      { key: "b", slots: 5 },
      { key: "c", slots: 5 },
      { key: "d", slots: 3 },
      { key: "e", slots: 5 },
      { key: "f", slots: 4 },
    ];
    const plan = allocateDaily({ quota: 20, done: 0, candidates });
    // 15 + 3 = 18, 남은 2칸에는 5도 4도 안 들어간다.
    expect(plan.chosen).toEqual(["a", "b", "c", "d"]);
    expect(plan.skipped).toEqual(["e", "f"]);
    expect(plan.unfilled).toBe(2);
  });

  it("재료가 모자라면 채워 넣지 않는다", () => {
    const candidates = many("review", 3, 4);
    const plan = allocateDaily({ quota: 20, done: 0, candidates });
    expect(plan.planned).toBe(12);
    expect(plan.unfilled).toBe(8);
    expect(plan.skipped).toEqual([]);
    const empty = allocateDaily({ quota: 20, done: 0, candidates: [] });
    expect(empty).toEqual({
      chosen: [],
      skipped: [],
      planned: 0,
      unfilled: 20,
      over: 0,
    });
  });

  it("오늘 이미 한 칸은 분량에서 뺀다", () => {
    const candidates = many("review", 10, 2);
    const plan = allocateDaily({ quota: 20, done: 14, candidates });
    expect(plan.chosen).toEqual(many("review", 3, 2).map((c) => c.key));
    expect(plan.planned).toBe(6);
    expect(plan.unfilled).toBe(0);
    // 분량을 이미 채웠으면 더 넣지 않는다.
    const full = allocateDaily({ quota: 20, done: 20, candidates });
    expect(full.chosen).toEqual([]);
    expect(full.unfilled).toBe(0);
  });

  it("어떤 분량에서도 합계는 분량을 넘지 않는다(빚진 것이 없으면)", () => {
    const candidates = [
      ...many("a", 7, 5),
      ...many("b", 5, 4),
      { key: "block", slots: 12 },
      ...many("c", 9, 3),
    ];
    for (let quota = 0; quota <= 80; quota++)
      for (const done of [0, 3, 11]) {
        const plan = allocateDaily({ quota, done, candidates });
        expect(slotsOf(candidates, plan.chosen)).toBe(plan.planned);
        if (done <= quota) {
          expect(plan.over).toBe(0);
          expect(done + plan.planned + plan.unfilled).toBe(quota);
        } else {
          // 이미 한 것이 분량보다 많으면(분량을 줄였을 때) 더 넣지 않고, 넘은 만큼을 그대로 낸다.
          expect(plan.chosen).toEqual([]);
          expect(plan.over).toBe(done - quota);
        }
        expect(plan.chosen.length + plan.skipped.length).toBe(
          candidates.length,
        );
      }
  });

  it("같은 입력이면 같은 답이다", () => {
    const candidates = [...many("a", 7, 5), { key: "block", slots: 10 }];
    const a = allocateDaily({ quota: 20, done: 3, candidates });
    const b = allocateDaily({
      quota: 20,
      done: 3,
      candidates: structuredClone(candidates),
    });
    expect(b).toEqual(a);
  });
});

describe("빚진 것", () => {
  it("풀던 것은 남은 칸이 없어도 낸다 — 넘긴 칸을 낸다", () => {
    const candidates: DailyCandidate[] = [
      ...many("review", 3, 4),
      { key: "open", slots: 5, owed: true },
    ];
    const plan = allocateDaily({ quota: 20, done: 18, candidates });
    expect(plan.chosen).toEqual(["open"]);
    expect(plan.over).toBe(3);
    expect(plan.unfilled).toBe(0);
    expect(plan.skipped).toEqual(many("review", 3, 4).map((c) => c.key));
  });

  it("빚진 것이 먼저 칸을 쓰고, 남은 칸에 나머지가 차례대로 들어간다", () => {
    const candidates: DailyCandidate[] = [
      ...many("review", 5, 4),
      { key: "mission", slots: 6, owed: true },
    ];
    // 10문제 가운데 4문제를 푼 탐험: 한 것 4 · 남은 6칸은 빚진 것 → 복습은 남은 10칸에 둘(8칸).
    const plan = allocateDaily({ quota: 20, done: 4, candidates });
    expect(plan.chosen).toEqual(["mission", "review-01", "review-02"]);
    expect(plan.planned).toBe(14);
    expect(plan.unfilled).toBe(2);
    expect(plan.over).toBe(0);
  });

  it("칸이 0 인 빚(목표를 채우고 다시 풀 것만 남은 탐험)도 낸다", () => {
    const plan = allocateDaily({
      quota: 20,
      done: 20,
      candidates: [{ key: "retry", slots: 0, owed: true }],
    });
    expect(plan.chosen).toEqual(["retry"]);
    expect(plan.over).toBe(0);
  });
});
