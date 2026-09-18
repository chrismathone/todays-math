/**
 * 🔴 RED → 🟢 — **출제할 문항이 있는 마지막 차시** 찾기 (2026-09-18 시뮬레이션 결함 ⑵).
 *
 * 구현: src/lib/daily/teachableBoundary.ts
 * 근거: docs/planning/tracks/reports/daily-auto-test-simulation.md §3 ⑵
 *
 * 왜: 차시 차례(`orderIndex`)는 전역 연속값(D-27)이라 울타리가 없다. 중3(22차시) 반의 계획이
 * 중3 끝을 넘으면 다음 차시가 공통수학1(문항 0건)이고, 그 뒤로 범위가 전부 «고등 안»이라
 * **영구히 「문항 부족」** 이었다(실측 19 수업일 연속 0장). 계획이 이 차시를 넘지 않게 한다.
 *
 * 무엇을 잠그나
 * 1. 뒤쪽 꼬리가 비어 있으면 **문항이 있는 마지막 차시**를 낸다(차례는 orderIndex).
 * 2. 앞쪽이 비어 있는 것(초1·초2)은 상관없다 — 찾는 것은 «끝»뿐이다.
 * 3. 문항이 한 건도 없으면 null — 경계를 모른다(계획은 예전처럼 걷는다).
 * 4. 목록이 뒤섞여 들어와도 orderIndex 로 판정한다.
 * 5. 묻는 횟수가 차시 수에 비례하지 않는다(DB 왕복을 몇 번으로 끝낸다).
 */
import { describe, expect, it } from "vitest";

import { findLastTeachableUnitId } from "@/lib/daily/teachableBoundary";

const units = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `u${i}`, orderIndex: 10 + i }));

/** `withProblems` 에 든 차시에만 문항이 있다고 답하는 가짜 조회 — 물은 횟수를 센다. */
function probe(withProblems: Set<string>) {
  const calls: string[][] = [];
  const hasProblems = async (unitIds: string[]) => {
    calls.push(unitIds);
    return unitIds.some((id) => withProblems.has(id));
  };
  return { hasProblems, calls };
}

describe("[teachableBoundary] 문항이 있는 마지막 차시", () => {
  it("뒤쪽 꼬리가 비어 있으면 그 앞 마지막 차시를 낸다", async () => {
    const list = units(10);
    const { hasProblems } = probe(new Set(["u2", "u3", "u4", "u5", "u6"]));
    await expect(findLastTeachableUnitId(list, hasProblems)).resolves.toBe(
      "u6",
    );
  });

  it("앞쪽이 비어 있는 것은 상관없다 — 끝만 찾는다", async () => {
    const list = units(10);
    const { hasProblems } = probe(new Set(["u7", "u8", "u9"]));
    await expect(findLastTeachableUnitId(list, hasProblems)).resolves.toBe(
      "u9",
    );
  });

  it("가운데가 비어 있어도 끝은 끝이다", async () => {
    const list = units(10);
    const { hasProblems } = probe(new Set(["u1", "u8"]));
    await expect(findLastTeachableUnitId(list, hasProblems)).resolves.toBe(
      "u8",
    );
  });

  it("문항이 한 건도 없으면 null", async () => {
    const { hasProblems } = probe(new Set());
    await expect(
      findLastTeachableUnitId(units(5), hasProblems),
    ).resolves.toBeNull();
  });

  it("목록이 뒤섞여 들어와도 orderIndex 로 판정한다", async () => {
    const list = units(6).reverse();
    const { hasProblems } = probe(new Set(["u1", "u2"]));
    await expect(findLastTeachableUnitId(list, hasProblems)).resolves.toBe(
      "u2",
    );
  });

  it("735차시에서도 묻는 횟수는 열두 번 안쪽이다", async () => {
    const list = units(735);
    const { hasProblems, calls } = probe(
      new Set(list.slice(130, 490).map((u) => u.id)),
    );
    await expect(findLastTeachableUnitId(list, hasProblems)).resolves.toBe(
      "u489",
    );
    expect(calls.length).toBeLessThanOrEqual(12);
  });
});
