/**
 * 🔴 RED → 🟢 — **이 범위로 한 시험지에 몇 문항까지 낼 수 있나** (2026-09-18 시뮬레이션 결함 ⑴).
 *
 * 구현: src/lib/tests/draftCapacity.ts
 * 근거: docs/planning/tracks/reports/daily-auto-test-simulation.md §4 ⑴
 *
 * 무엇을 잠그나
 * 1. 상한은 **행이 아니라 갈래**다(D-105 — 한 시험지에 같은 갈래 1개). 행 228·갈래 10 인
 *    범위는 10문항까지다. 예전 판정(`countEligibleProblems >= neededCount`)은 228 을 보고
 *    「부족 아님」이라 했고, 출제가 422 로 죽었다 — 실측 17,100 학생-일 중 99.8%.
 * 2. 판정은 제품의 `familyIdOf` 한 곳을 따른다 — 키가 없으면 혼자, **단원이 다르면 다른 갈래**.
 * 3. **최근 출제(D-20)를 빼고** 센다 — 갈래의 행이 전부 최근에 나갔으면 그 갈래는 없다.
 *    일부만 나갔으면 남는다(남은 변형으로 낼 수 있다).
 */
import { describe, expect, it } from "vitest";

import { draftCapacityOf } from "@/lib/tests/draftCapacity";

const row = (id: string, unitId: string, familyKey: string | null) => ({
  id,
  unitId,
  familyKey,
});

describe("[draftCapacity] 한 시험지의 상한은 갈래 수다", () => {
  it("같은 갈래의 변형이 여럿이어도 한 문항으로 센다", () => {
    const rows = [
      row("p1", "u1", "A"),
      row("p2", "u1", "A"),
      row("p3", "u1", "A"),
      row("p4", "u1", "B"),
      row("p5", "u1", "B"),
    ];
    expect(draftCapacityOf(rows)).toBe(2);
  });

  it("키가 없는 행은 저마다 한 갈래다(D-105)", () => {
    const rows = [
      row("p1", "u1", null),
      row("p2", "u1", null),
      row("p3", "u1", "  "),
    ];
    expect(draftCapacityOf(rows)).toBe(3);
  });

  it("같은 키라도 단원이 다르면 다른 갈래다", () => {
    const rows = [row("p1", "u1", "A"), row("p2", "u2", "A")];
    expect(draftCapacityOf(rows)).toBe(2);
  });

  it("후보가 없으면 0", () => {
    expect(draftCapacityOf([])).toBe(0);
  });
});

describe("[draftCapacity] 최근 출제(D-20)를 빼고 센다", () => {
  const rows = [
    row("a1", "u1", "A"),
    row("a2", "u1", "A"),
    row("b1", "u1", "B"),
    row("c1", "u1", "C"),
  ];

  it("갈래의 행이 전부 최근에 나갔으면 그 갈래는 없다", () => {
    expect(draftCapacityOf(rows, ["b1"])).toBe(2);
  });

  it("일부만 나갔으면 남은 변형으로 그 갈래를 낼 수 있다", () => {
    expect(draftCapacityOf(rows, ["a1"])).toBe(3);
  });

  it("범위 밖 id 는 셈에 영향이 없다", () => {
    expect(draftCapacityOf(rows, ["zzz"])).toBe(3);
  });
});
