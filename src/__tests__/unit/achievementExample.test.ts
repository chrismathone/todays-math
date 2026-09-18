/**
 * 🔴 RED → 🟢 — **예시 ⓑ 는 원시 문항 행에서 생성한다** (Hi-fi 브리프 §1 #9).
 *
 * 구현: src/app/dev/report-hifi/example.ts
 *
 * Wire 의 예시는 팩터를 **손으로** 적어서 단원별 합계 35문항 ≠ 난이도별 합계 34문항이었다.
 * 같은 문항을 두 칸에 따로 적으면 둘이 갈라진다 — 예시도 `ResultRow.items` 를 지어내고
 * `collectAchievement` 로 팩터를 만들어야 합계가 한 원천에서 나온다.
 */
import { describe, expect, it } from "vitest";

import { exampleFactors, exampleInput } from "@/app/dev/report-hifi/example";
import { collectAchievement } from "@/lib/achievement/collect";

const REAL = collectAchievement({
  student: {
    id: "s",
    name: "김하나",
    className: "초등M 초5 MS1A",
    classGrade: "초5",
  },
  period: { from: "2026-08-01", to: "2026-08-31" },
  progress: Array.from({ length: 17 }, (_, i) => ({
    unitId: `u${i}`,
    recordedAt: `2026-08-${String(3 + i).padStart(2, "0")}`,
  })),
  units: Array.from({ length: 17 }, (_, i) => ({
    unitId: `u${i}`,
    grade: "초5",
    chapter: `${1 + Math.floor(i / 5)}. 대단원`,
    section: `소단원 ${i}`,
    orderIndex: i,
  })),
  plan: null,
  results: [],
  lectures: { targets: [], views: [] },
});

describe("🔴 예시 ⓑ — 한 원천에서 나온 합계", () => {
  it("단원별 문항 합계와 난이도별 문항 합계가 같다", () => {
    const f = exampleFactors(REAL);
    const ua = f.scored.unitAccuracy!;
    const unitTotal =
      ua.reported.reduce((a, u) => a + u.total, 0) +
      ua.underSampled.reduce((a, u) => a + u.total, 0);
    const bandTotal = Object.values(f.scored.bandAccuracy!).reduce(
      (a, b) => a + (b?.total ?? 0),
      0,
    );
    expect(unitTotal).toBe(bandTotal);
  });

  it("🔴 예시 팩터는 원시 행에서 **생성**된 것이다 — 손으로 적은 팩터가 아니다", () => {
    expect(exampleFactors(REAL)).toEqual(
      collectAchievement(exampleInput(REAL)),
    );
    const input = exampleInput(REAL);
    expect(input.results.some((r) => r.items.length > 0)).toBe(true);
  });

  it("회차 점수가 그 회차 문항의 정오와 맞는다 (8문항 × 12.5점)", () => {
    for (const r of exampleInput(REAL).results) {
      if (r.absent) continue;
      const correct = r.items.filter((it) => it.isCorrect).length;
      expect(r.score).toBe((correct * (r.maxScore ?? 0)) / r.items.length);
    }
  });

  it("① 진도는 실데이터 그대로다 — 예시가 소단원·차시를 바꾸지 않는다", () => {
    const f = exampleFactors(REAL);
    expect(f.learned.units).toEqual(REAL.learned.units);
    expect(f.learned.lessons).toBe(REAL.learned.lessons);
  });

  it("규칙이 지면에서 보이도록 넣은 것들이 실제로 들어갔다", () => {
    const f = exampleFactors(REAL);
    expect(f.scored.absentRounds).toHaveLength(1);
    expect(f.scored.bandAccuracy?.심화?.total).toBeLessThan(12);
    expect(f.scored.unitAccuracy?.underSampled.length).toBeGreaterThan(0);
    expect(f.scored.unitAccuracy?.reported.length).toBeGreaterThan(0);
    // 다음 달 1일에 끝낸 한 편은 안 센다
    expect(f.selfStudy.lectures).toMatchObject({ assigned: 6, completed: 4 });
    expect(f.selfStudy.homework).toMatchObject({ checked: 8, missed: 2 });
  });
});
