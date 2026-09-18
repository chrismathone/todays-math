/**
 * 🔴 RED → 🟢 — **「이번 주 예정」** 목록 (매일 자동 출제 ④의 뒷단, D-129 ⑵).
 *
 * 구현: src/lib/daily/planSchedule.ts — 날짜 펴기는 `resolveDailyPlan` 을 **그대로 부른다**.
 * 브리프: docs/planning/tracks/briefs/daily-auto-test-plan-api.md §2 ⑵
 *
 * 무엇을 잠그나
 * 1. **며칠 치** — 이번 주 월요일부터 다음 주 일요일까지 14일(화면은 월요일부터 그린다, 22 §4 리드 ⑶).
 * 2. 줄은 **수업일 + 실제로 진도가 기록된 날**만. 수업 없는 날은 줄이 없다.
 * 3. 한 줄 = 날짜 · 예정 차시 · 실제로 나간 차시 · 밀림 일 수.
 * 4. 🔴 **실제 진도가 들어오면 그 지점부터 다시 편다** — 그 다음 수업부터 예정이 바뀐다.
 * 5. 「예정」은 **그날 아침 기준**이다 — 그날 기록된 진도가 그날의 예정을 덮어쓰지 않는다.
 *    덮어쓰면 예정과 실제가 늘 같아져 밀림이 목록에서 안 보인다.
 * 6. 적용 이력은 제품 함수(`applicableProgress`)가 고른다 — 개별 진도 학생은 개별 이력.
 */
import { describe, expect, it } from "vitest";

import type { PlanUnit, ProgressPlanRule } from "@/lib/daily/progressPlan";
import {
  PLAN_SCHEDULE_DAYS,
  buildPlanSchedule,
  planScheduleWindow,
} from "@/lib/daily/planSchedule";
import type { ProgressRecordLike } from "@/lib/progressResolver";

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

/** 2026-09-16(수) 이 든 주 — 9/14(월) ~ 9/27(일). */
const WINDOW = { from: "2026-09-14", to: "2026-09-27" };

const row = (
  unitId: string,
  recordedAt: string,
  over: Partial<ProgressRecordLike> = {},
): ProgressRecordLike => ({
  id: `${unitId}@${recordedAt}`,
  classId: "c1",
  studentId: null,
  unitId,
  recordedAt,
  createdAt: `${recordedAt}T10:00:00.000Z`,
  ...over,
});

const build = (
  over: {
    rule?: Partial<ProgressPlanRule>;
    classProgress?: ProgressRecordLike[];
    studentProgress?: ProgressRecordLike[];
    useIndividualProgress?: boolean;
    units?: PlanUnit[];
  } = {},
) =>
  buildPlanSchedule({
    rule: { ...MWF, ...over.rule },
    units: over.units ?? UNITS,
    classProgress: over.classProgress ?? [],
    studentProgress: over.studentProgress ?? [],
    useIndividualProgress: over.useIndividualProgress ?? false,
    ...WINDOW,
  });

const brief = (rows: ReturnType<typeof build>) =>
  rows.map((r) => [
    r.date,
    r.plannedUnitIds.join("+"),
    r.actualUnitIds.join("+"),
    r.driftDays,
  ]);

describe("[planSchedule] 며칠 치 — 이번 주 월요일부터 14일", () => {
  it("수요일이면 그 주 월요일 ~ 다음 주 일요일", () => {
    expect(PLAN_SCHEDULE_DAYS).toBe(14);
    expect(planScheduleWindow("2026-09-16")).toEqual(WINDOW);
  });

  it("월요일은 그날부터, 일요일은 **지난** 월요일부터(일요일은 주의 끝이다)", () => {
    expect(planScheduleWindow("2026-09-14")).toEqual(WINDOW);
    expect(planScheduleWindow("2026-09-20")).toEqual(WINDOW);
    expect(planScheduleWindow("2026-09-21")).toEqual({
      from: "2026-09-21",
      to: "2026-10-04",
    });
  });
});

describe("[planSchedule] 계획만 있을 때 — 수업일마다 한 줄", () => {
  it("월·수·금만 줄이 서고, 예정 차시가 한 수업에 하나씩 나아간다", () => {
    expect(brief(build())).toEqual([
      ["2026-09-14", "u4", "", 0],
      ["2026-09-16", "u5", "", 0],
      ["2026-09-18", "u6", "", 0],
      ["2026-09-21", "u7", "", 0],
      ["2026-09-23", "u8", "", 0],
      ["2026-09-25", "u9", "", 0],
    ]);
    const first = build()[0]!;
    expect(first.weekday).toBe(1);
    expect(first.lesson).toBe(true);
  });

  it("한 수업 두 차시면 두 차시씩 — 교육과정 끝에 닿으면 끝 차시에 멈추고 표시한다", () => {
    const rows = build({ rule: { unitsPerLesson: 2 } });
    expect(rows[0]!.plannedUnitIds).toEqual(["u7", "u8"]);
    expect(rows[1]!.plannedUnitIds).toEqual(["u9", "u10"]);
    expect(rows[1]!.atCurriculumEnd).toBe(false);
    expect(rows[2]!.atCurriculumEnd).toBe(true);
    expect(rows[2]!.plannedUnitIds).toEqual(["u9", "u10"]);
  });

  it("계획 시작 전 날짜에는 줄이 없다 — 조용히 첫 차시를 내지 않는다", () => {
    const rows = build({ rule: { startDate: "2026-09-21" } });
    expect(rows[0]!.date).toBe("2026-09-21");
    expect(rows[0]!.plannedUnitIds).toEqual(["u1"]);
  });

  it("꺼 둔 계획은 예정을 내지 않는다 — 자동 대상이 아니다", () => {
    expect(build({ rule: { active: false } })).toEqual([]);
  });

  it("단원 목록 순서에 기대지 않는다 — orderIndex 로 편다", () => {
    expect(brief(build({ units: [...UNITS].reverse() }))).toEqual(
      brief(build()),
    );
  });
});

describe("[planSchedule] 🔴 실제가 이긴다 — 진도가 들어오면 그 지점부터 다시 편다 (D-129 ⑵)", () => {
  it("9/16 에 u3 까지만 나갔다 → 9/18 부터 u4 로 다시 펴고, 밀림 5일이 이어진다", () => {
    const before = brief(build());
    const after = brief(build({ classProgress: [row("u3", "2026-09-16")] }));
    expect(after).toEqual([
      ["2026-09-14", "u4", "", 0],
      // 그날 아침의 예정은 u5 였다 — 기록이 예정을 덮어쓰지 않는다
      ["2026-09-16", "u5", "u3", -5],
      ["2026-09-18", "u4", "", -5],
      ["2026-09-21", "u5", "", -5],
      ["2026-09-23", "u6", "", -5],
      ["2026-09-25", "u7", "", -5],
    ]);
    // 기록 전후로 **기록한 날 다음 수업부터** 달라진다
    expect(after.slice(0, 1)).toEqual(before.slice(0, 1));
    expect(after[2]).not.toEqual(before[2]);
  });

  it("앞서 나가도 같다 — 9/14 에 u6 까지 → 9/16 u7, 앞섬 +4일", () => {
    expect(
      brief(build({ classProgress: [row("u6", "2026-09-14")] })).slice(0, 3),
    ).toEqual([
      ["2026-09-14", "u4", "u6", 4],
      ["2026-09-16", "u7", "", 4],
      ["2026-09-18", "u8", "", 4],
    ]);
  });

  it("창 앞에서 기록된 진도도 기준점이다 — 9/11 에 u2 → 9/14 는 u3", () => {
    expect(
      brief(build({ classProgress: [row("u2", "2026-09-11")] })).slice(0, 2),
    ).toEqual([
      ["2026-09-14", "u3", "", -2],
      ["2026-09-16", "u4", "", -2],
    ]);
  });

  it("수업 요일이 아닌 날(보강)에 기록돼도 그 날 줄이 선다 — 예정은 비고 실제만 있다", () => {
    const rows = build({ classProgress: [row("u6", "2026-09-19")] });
    const sat = rows.find((r) => r.date === "2026-09-19")!;
    expect(sat.lesson).toBe(false);
    expect(sat.plannedUnitIds).toEqual([]);
    expect(sat.actualUnitIds).toEqual(["u6"]);
    expect(rows.find((r) => r.date === "2026-09-21")!.plannedUnitIds).toEqual([
      "u7",
    ]);
  });

  it("같은 날 여러 차시를 기록하면 기록 순서대로 싣고, 마지막 것에서 다시 편다", () => {
    const rows = build({
      classProgress: [
        row("u6", "2026-09-16", { createdAt: "2026-09-16T11:00:00.000Z" }),
        row("u5", "2026-09-16", { createdAt: "2026-09-16T10:00:00.000Z" }),
        row("u5", "2026-09-16", {
          id: "dup",
          createdAt: "2026-09-16T12:00:00.000Z",
        }),
      ],
    });
    const wed = rows.find((r) => r.date === "2026-09-16")!;
    expect(wed.actualUnitIds).toEqual(["u5", "u6"]);
    // 최신 기록(12:00 의 u5)이 기준점 — `findLatestProgress` 와 같은 판정
    expect(rows.find((r) => r.date === "2026-09-18")!.plannedUnitIds).toEqual([
      "u6",
    ]);
  });

  it("단원 목록 밖 차시를 기록했으면 계획으로 되돌아간다 — 0번째로 읽지 않는다", () => {
    expect(
      brief(build({ classProgress: [row("ghost", "2026-09-11")] }))[0],
    ).toEqual(["2026-09-14", "u4", "", 0]);
  });
});

describe("[planSchedule] 적용 이력 — 개별 진도 학생은 개별 이력 (`applicableProgress`)", () => {
  const classProgress = [row("u3", "2026-09-16")];
  const studentProgress = [row("u6", "2026-09-16", { studentId: "s1" })];

  it("개별 진도 학생이면 학생 기록에서 다시 편다", () => {
    const rows = build({
      classProgress,
      studentProgress,
      useIndividualProgress: true,
    });
    expect(rows.find((r) => r.date === "2026-09-18")!.plannedUnitIds).toEqual([
      "u7",
    ]);
  });

  it("개별 진도가 아니면 반 기록을 본다", () => {
    const rows = build({
      classProgress,
      studentProgress,
      useIndividualProgress: false,
    });
    expect(rows.find((r) => r.date === "2026-09-18")!.plannedUnitIds).toEqual([
      "u4",
    ]);
  });

  it("개별 진도인데 학생 기록이 아직 없으면 반 기록으로 되돌아간다", () => {
    const rows = build({
      classProgress,
      studentProgress: [],
      useIndividualProgress: true,
    });
    expect(rows.find((r) => r.date === "2026-09-18")!.plannedUnitIds).toEqual([
      "u4",
    ]);
  });

  it("입력 배열을 고쳐 쓰지 않는다", () => {
    const cp = [row("u3", "2026-09-16"), row("u2", "2026-09-11")];
    const snapshot = structuredClone(cp);
    build({ classProgress: cp });
    expect(cp).toEqual(snapshot);
  });
});

/**
 * 🔴 RED → 🟢 — 예정 목록도 **같은 경계**를 쓴다 (2026-09-18 시뮬레이션 결함 ⑵).
 * 목록만 경계 너머(문항 0건)로 걸어 가면 「목록에는 공통수학1 인데 아침 초안은 중3 마지막 차시」가 된다.
 */
describe("[planSchedule] 경계 — 문항이 있는 마지막 차시", () => {
  // 월수금 한 차시씩: 9/14 u4 · 9/16 u5 · 9/18 u6 · 9/21 u7 …
  it("경계를 넘는 날의 예정은 경계 차시이고 끝 표시가 붙는다", () => {
    const rows = buildPlanSchedule({
      rule: MWF,
      units: UNITS,
      classProgress: [],
      ...WINDOW,
      lastTeachableUnitId: "u5",
    });
    const fri = rows.find((r) => r.date === "2026-09-18")!;
    expect(fri.plannedUnitIds).toEqual(["u5"]);
    expect(fri.atCurriculumEnd).toBe(true);
    const wed = rows.find((r) => r.date === "2026-09-16")!;
    expect(wed.plannedUnitIds).toEqual(["u5"]);
    expect(wed.atCurriculumEnd).toBe(false);
  });

  it("경계를 안 주면 예전과 같다", () => {
    const rows = buildPlanSchedule({
      rule: MWF,
      units: UNITS,
      classProgress: [],
      ...WINDOW,
    });
    expect(rows.find((r) => r.date === "2026-09-18")!.plannedUnitIds).toEqual([
      "u6",
    ]);
  });
});
