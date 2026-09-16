/**
 * 🔴 RED → 🟢 — **진도 계획을 날짜로 펴는 규칙** (매일 자동 출제 ②, D-129 ⑴⑵⑷).
 *
 * 구현: src/lib/daily/progressPlan.ts · 계약: src/contracts/dailyAutoTest.contract.ts
 * SSOT: docs/planning/22-daily-auto-test.md §3 · 브리프 tracks/briefs/daily-auto-test-backend.md §2 ②
 *
 * 무엇을 잠그나
 * 1. **규칙만 저장한다** — 날짜별 행을 쌓지 않는다. 한 줄(요일·한 수업당 차시 수·시작 차시·
 *    시작일·켜짐)에서 «그 날짜에 나갈 차시»를 센다.
 * 2. 🔴 **실제가 이긴다** — 진도 기록이 있으면 그 차시가 정본이고, 남은 계획은 **그 지점부터**
 *    다시 편다. 계획(규칙)은 고쳐 쓰지 않는다 — «어디서부터»만 옮긴다.
 * 3. **밀림/앞섬은 일 수**로 낸다 — 계획이 그 차시를 나가라던 날과 실제로 나간 날의 차.
 *    양수면 앞섬, 음수면 밀림. 나중에 화면이 쓴다.
 * 4. 휴일은 **다루지 않는다** — 요일만 본다(D-129 ⑷).
 * 5. 개별 진도 학생은 **학생 계획이 반 계획을 덮는다** — `getCurrentProgress` 와 같은 결.
 */
import { describe, expect, it } from "vitest";

import {
  pickProgressPlan,
  resolveDailyPlan,
  type PlanUnit,
  type ProgressPlanRule,
} from "@/lib/daily/progressPlan";

/** 교육과정 열 차시 — orderIndex 는 전역 연속값(D-27). */
const UNITS: PlanUnit[] = Array.from({ length: 10 }, (_, i) => ({
  id: `u${i + 1}`,
  orderIndex: 100 + i,
}));

/** 월·수·금 수업, 2026-09-07(월) 시작, 한 수업 한 차시. 0=일 … 6=토. */
const MWF: ProgressPlanRule = {
  weekdays: [1, 3, 5],
  unitsPerLesson: 1,
  startUnitId: "u1",
  startDate: "2026-09-07",
  active: true,
};

const plan = (over: Partial<ProgressPlanRule> = {}): ProgressPlanRule => ({
  ...MWF,
  ...over,
});

const run = (
  day: string,
  rule: ProgressPlanRule = MWF,
  actual: { unitId: string; recordedAt: string } | null = null,
  units: PlanUnit[] = UNITS,
) => resolveDailyPlan({ rule, units, day, actual });

describe("[progressPlan] 계획을 날짜로 편다 — 규칙 한 줄에서", () => {
  it("시작일 당일이 수업 요일이면 그 날 시작 차시를 나간다", () => {
    const r = run("2026-09-07");
    expect(r.lessonToday).toBe(true);
    expect(r.endUnitId).toBe("u1");
    expect(r.unitIds).toEqual(["u1"]);
    expect(r.lessonIndex).toBe(1);
    expect(r.anchoredOn).toBe("plan");
  });

  it("수업일마다 한 차시씩 나아간다 — 9/9 u2 · 9/11 u3 · 9/16 u5", () => {
    expect(run("2026-09-09").endUnitId).toBe("u2");
    expect(run("2026-09-11").endUnitId).toBe("u3");
    expect(run("2026-09-16").endUnitId).toBe("u5");
    expect(run("2026-09-16").lessonIndex).toBe(5);
  });

  it("시작일이 수업 요일이 아니면 그 뒤 첫 수업일에 시작한다", () => {
    const tue = plan({ startDate: "2026-09-08" }); // 화요일 — 월수금 계획
    expect(run("2026-09-08", tue).lessonToday).toBe(false);
    expect(run("2026-09-09", tue).lessonToday).toBe(true);
    expect(run("2026-09-09", tue).endUnitId).toBe("u1");
  });

  it("계획 시작 전에는 나갈 차시가 없다 — 조용히 첫 차시를 내지 않는다", () => {
    const r = run("2026-09-04", plan({ startDate: "2026-09-07" }));
    expect(r.lessonToday).toBe(false);
    expect(r.endUnitId).toBeNull();
    expect(r.lessonIndex).toBe(0);
  });

  it("수업 요일이 아닌 날은 수업일이 아니고, 끝 차시는 «마지막으로 나간 것»이다", () => {
    const r = run("2026-09-17"); // 목 — 월수금 계획
    expect(r.lessonToday).toBe(false);
    expect(r.unitIds).toEqual([]);
    expect(r.endUnitId).toBe("u5"); // 9/16(수)에 나간 차시
  });

  it("요일이 하나뿐인 반 — 주에 한 차시씩만 나간다", () => {
    const weekly = plan({ weekdays: [3] }); // 수요일만, 9/7(월) 시작 → 첫 수업 9/9
    expect(run("2026-09-09", weekly).endUnitId).toBe("u1");
    expect(run("2026-09-16", weekly).endUnitId).toBe("u2");
    expect(run("2026-09-23", weekly).endUnitId).toBe("u3");
    expect(run("2026-09-14", weekly).lessonToday).toBe(false);
  });

  it("한 수업에 두 차시면 그날 차시가 둘이고 끝은 뒤엣것이다", () => {
    const two = plan({ unitsPerLesson: 2 });
    const first = run("2026-09-07", two);
    expect(first.unitIds).toEqual(["u1", "u2"]);
    expect(first.endUnitId).toBe("u2");
    const second = run("2026-09-09", two);
    expect(second.unitIds).toEqual(["u3", "u4"]);
    expect(second.endUnitId).toBe("u4");
  });

  it("교육과정 끝에 닿으면 마지막 차시에 멈추고 그렇다고 말한다", () => {
    const r = run("2026-11-30", plan()); // 한참 뒤 — 10차시를 넘겼다
    expect(r.endUnitId).toBe("u10");
    expect(r.atCurriculumEnd).toBe(true);
    // 끝에 닿기 전에는 거짓이다 — 늘 참이면 이 칸이 아무것도 안 가른다
    expect(run("2026-09-16").atCurriculumEnd).toBe(false);
  });

  it("꺼 둔 계획은 수업일이 없다 — 자동 대상이 아니다", () => {
    const r = run("2026-09-16", plan({ active: false }));
    expect(r.lessonToday).toBe(false);
    expect(r.endUnitId).toBeNull();
  });

  it("입력한 규칙을 고쳐 쓰지 않는다 — 계획은 그대로 둔다", () => {
    const rule = plan();
    const before = JSON.stringify(rule);
    run("2026-09-16", rule, { unitId: "u8", recordedAt: "2026-09-14" });
    expect(JSON.stringify(rule)).toBe(before);
  });
});

describe("[progressPlan] 🔴 실제가 이긴다 — 진도 기록이 정본", () => {
  it("진도 기록이 하나도 없으면 계획 그대로다 — 밀림도 앞섬도 없다", () => {
    const r = run("2026-09-16", MWF, null);
    expect(r.anchoredOn).toBe("plan");
    expect(r.endUnitId).toBe("u5");
    expect(r.driftDays).toBe(0);
  });

  it("오늘 진도가 기록됐으면 오늘 차시는 **그 차시**다", () => {
    const r = run("2026-09-16", MWF, {
      unitId: "u3",
      recordedAt: "2026-09-16",
    });
    expect(r.anchoredOn).toBe("progress");
    expect(r.lessonToday).toBe(true);
    expect(r.endUnitId).toBe("u3");
  });

  it("뒤처져 있으면 뒤처진 대로 이어 간다 — 그 지점부터 다시 편다", () => {
    // 계획은 9/14 에 u4 였는데 실제는 u2 까지밖에 안 나갔다. 9/16 은 그 다음 한 차시.
    const r = run("2026-09-16", MWF, {
      unitId: "u2",
      recordedAt: "2026-09-14",
    });
    expect(r.endUnitId).toBe("u3");
    expect(r.anchoredOn).toBe("progress");
  });

  it("앞서 있으면 앞선 대로 이어 간다", () => {
    const r = run("2026-09-16", MWF, {
      unitId: "u8",
      recordedAt: "2026-09-14",
    });
    expect(r.endUnitId).toBe("u9");
  });

  it("보강 — 수업 요일이 아닌 날에 진도가 기록되면 그 날도 수업일로 본다", () => {
    const r = run("2026-09-17", MWF, {
      unitId: "u6",
      recordedAt: "2026-09-17",
    });
    expect(r.lessonToday).toBe(true);
    expect(r.endUnitId).toBe("u6");
  });

  it("진도 차시가 교육과정 목록 밖이면 계획으로 되돌아간다", () => {
    const r = run("2026-09-16", MWF, {
      unitId: "없는차시",
      recordedAt: "2026-09-14",
    });
    expect(r.anchoredOn).toBe("plan");
    expect(r.endUnitId).toBe("u5");
  });

  it("진도 뒤로 수업일이 여럿 지났으면 그만큼 나아간다 (한 수업 두 차시)", () => {
    const two = plan({ unitsPerLesson: 2 });
    // 9/9 에 u2 까지. 그 뒤 수업일은 9/11 · 9/14 · 9/16 → 세 수업 × 두 차시 = 여섯 차시
    const r = run("2026-09-16", two, {
      unitId: "u2",
      recordedAt: "2026-09-09",
    });
    expect(r.endUnitId).toBe("u8");
    expect(r.unitIds).toEqual(["u7", "u8"]);
  });
});

describe("[progressPlan] 밀림·앞섬은 일 수로", () => {
  it("계획대로면 0일이다", () => {
    // 계획: 9/14(월) = u4. 실제로 9/14 에 u4 를 나갔다.
    const r = run("2026-09-16", MWF, {
      unitId: "u4",
      recordedAt: "2026-09-14",
    });
    expect(r.driftDays).toBe(0);
  });

  it("밀렸으면 음수 — 그 차시를 계획보다 늦게 나갔다", () => {
    // 계획: u2 는 9/9. 실제로는 9/14 에 나갔다 → 9/9 − 9/14 = −5
    const r = run("2026-09-16", MWF, {
      unitId: "u2",
      recordedAt: "2026-09-14",
    });
    expect(r.driftDays).toBe(-5);
  });

  it("앞섰으면 양수 — 그 차시를 계획보다 일찍 나갔다", () => {
    // 계획: u8 은 9/23(수). 실제로는 9/14 에 나갔다 → 9/23 − 9/14 = +9
    const r = run("2026-09-16", MWF, {
      unitId: "u8",
      recordedAt: "2026-09-14",
    });
    expect(r.driftDays).toBe(9);
  });

  it("시작 차시보다 앞에 있으면 계획을 거꾸로 펴서 잰다 — «잴 수 없다»로 0을 내지 않는다", () => {
    const later = plan({ startUnitId: "u5" }); // 9/7 에 u5 로 시작하는 계획
    // u3 은 계획을 거꾸로 펴면 9/2(수). 실제로 9/14 에 나갔다 → 9/2 − 9/14 = −12
    const r = run("2026-09-16", later, {
      unitId: "u3",
      recordedAt: "2026-09-14",
    });
    expect(r.driftDays).toBe(-12);
  });
});

describe("[progressPlan] 학생 계획이 반 계획을 덮는다", () => {
  type PlanRow = ProgressPlanRule & { studentId: string | null };
  const classPlan: PlanRow = { ...MWF, studentId: null };
  const studentPlan: PlanRow = {
    ...plan({ weekdays: [2, 4] }),
    studentId: "s1",
  };

  it("개별 진도 학생은 학생 계획을 쓴다", () => {
    expect(
      pickProgressPlan({
        classPlan,
        studentPlan,
        useIndividualProgress: true,
      }),
    ).toBe(studentPlan);
  });

  it("개별 진도가 아니면 학생 계획이 있어도 반 계획을 쓴다", () => {
    expect(
      pickProgressPlan({
        classPlan,
        studentPlan,
        useIndividualProgress: false,
      }),
    ).toBe(classPlan);
  });

  it("개별 진도인데 학생 계획이 없으면 반 계획으로 되돌아간다", () => {
    expect(
      pickProgressPlan({
        classPlan,
        studentPlan: null,
        useIndividualProgress: true,
      }),
    ).toBe(classPlan);
  });

  it("계획이 아예 없으면 null — 자동 대상이 아니다", () => {
    expect(
      pickProgressPlan({
        classPlan: null,
        studentPlan: null,
        useIndividualProgress: true,
      }),
    ).toBeNull();
  });
});
