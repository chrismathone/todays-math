/**
 * 🔴 RED → 🟢 — 오늘의 학생별 확인테스트 **계획 로직** (2단계 화면, D-63·D-64).
 *
 * 구현: src/lib/daily/planDailyReview.ts
 *
 * 무엇을 잠그나
 * 1. «오늘» 은 마지막 보고서 날짜로 가른다 — 어제 수업한 학생은 안 나온다.
 * 2. 보고서는 있는데 오늘 진도 행이 없으면 examOrUnread — **표시만**(D-64),
 *    원문 줄이 사유로 그대로 실린다.
 * 3. 같은 범위 학생은 한 묶음 — 묶음의 소단원 목록은 출제와 같은 함수(resolveRange).
 * 4. 직전 확인테스트가 있는 학생은 그 끝 **다음**부터(2회차 동작) —
 *    없는 학생은 대단원 제한(D-63).
 * 5. neededCount 는 구성원 반 기본 문항 수의 최댓값.
 * 6. **진도 계획이 있으면 보고서가 없어도 대상이다** (매일 자동 출제 ⑤, D-129 ⑷) —
 *    손으로 등록한 학생·고등도 들어온다. 「오늘 수업했나」를 `eywaLastReportDate` 로만
 *    재던 셈을 **계획(요일)** 으로 넓힌다.
 */
import { describe, expect, it } from "vitest";

import {
  planDailyReview,
  type DailyPlanRow,
  type DailyStudent,
} from "@/lib/daily/planDailyReview";

const UNITS = [
  { id: "u1", orderIndex: 100, grade: "중2", chapter: "2. 부등식" },
  { id: "u2", orderIndex: 101, grade: "중2", chapter: "2. 부등식" },
  { id: "u3", orderIndex: 102, grade: "중2", chapter: "3. 방정식" },
  { id: "u4", orderIndex: 103, grade: "중2", chapter: "3. 방정식" },
  { id: "u5", orderIndex: 104, grade: "중2", chapter: "3. 방정식" },
];

const student = (over: Partial<DailyStudent>): DailyStudent => ({
  id: "s1",
  name: "학생가",
  classId: "c1",
  className: "중등M 중2",
  classGrade: "중2",
  defaultProblemCount: 8,
  schoolLevel: "중",
  schoolGrade: 2,
  // eywa 연계 학생은 동기화가 늘 참으로 넣는다(`runSync.ts`) — 기존 갈래의 전제 그대로.
  useIndividualProgress: true,
  lastReportDate: "2026-08-21",
  lastReportText: "수학 진도",
  ...over,
});

const row = (
  studentId: string | null,
  unitId: string,
  recordedAt: string,
  classId = "c1",
) => ({
  classId,
  studentId,
  unitId,
  recordedAt,
  createdAt: `${recordedAt}T10:00:00Z`,
});

/** 2026-08-21 은 **금요일**이다 — 아래 계획들의 요일은 그 날을 겨눈다. */
const planRow = (over: Partial<DailyPlanRow> = {}): DailyPlanRow => ({
  classId: "c1",
  studentId: null,
  weekdays: [1, 3, 5], // 월·수·금
  unitsPerLesson: 1,
  startUnitId: "u1",
  startDate: "2026-08-14", // 금 — 8/14 u1 · 8/17 u2 · 8/19 u3 · 8/21 u4
  active: true,
  ...over,
});

describe("[planDailyReview] 오늘의 학생별 확인테스트 계획", () => {
  it("오늘 보고서가 없는 학생은 아예 안 나온다 — 어제 수업한 학생 제외", () => {
    const plan = planDailyReview({
      day: "2026-08-21",
      students: [
        student({ id: "s1", lastReportDate: "2026-08-21" }),
        student({ id: "s2", name: "학생나", lastReportDate: "2026-08-20" }),
      ],
      progressRows: [row("s1", "u3", "2026-08-21")],
      lastReviews: [],
      units: UNITS,
    });
    expect(plan.attended).toBe(1);
    expect(plan.groups.flatMap((g) => g.students.map((s) => s.id))).toEqual([
      "s1",
    ]);
  });

  /** 🔴 D-64 — 시험기간(내신대비)만 적힌 날: 표시만, 원문 줄이 사유로 실린다. */
  it.each([8, 12])("오늘 진도 행이 없으면 examOrUnread — 원문 줄 그대로, 중복 제거, 학생별 %i문항", (problemCount) => {
    const plan = planDailyReview({
      day: "2026-08-21",
      students: [
        student({
          id: "s1",
          lastReportText: "수학 내신대비\n수학 내신대비\n수학 모의고사",
          defaultProblemCount: problemCount,
        }),
      ],
      progressRows: [row("s1", "u3", "2026-08-20")], // 어제 것만 있다
      lastReviews: [],
      units: UNITS,
    });
    expect(plan.groups).toEqual([]);
    expect(plan.examOrUnread).toEqual([
      {
        id: "s1",
        name: "학생가",
        classId: "c1",
        grade: "중2",
        className: "중등M 중2",
        lines: ["수학 내신대비", "수학 모의고사"],
        problemCount, // 39f14382a: this student's request count, not a group maximum.
      },
    ]);
  });

  it("같은 범위 학생은 한 묶음 — 소단원 목록·neededCount 최댓값", () => {
    const plan = planDailyReview({
      day: "2026-08-21",
      students: [
        student({ id: "s1", name: "학생가", defaultProblemCount: 8 }),
        student({ id: "s2", name: "학생나", defaultProblemCount: 12 }),
      ],
      progressRows: [
        row("s1", "u3", "2026-08-20"),
        row("s1", "u4", "2026-08-21"),
        row("s2", "u3", "2026-08-20"),
        row("s2", "u4", "2026-08-21"),
      ],
      lastReviews: [],
      units: UNITS,
    });
    expect(plan.groups).toHaveLength(1);
    const g = plan.groups[0]!;
    expect(g.rangeStartUnitId).toBe("u3");
    expect(g.rangeEndUnitId).toBe("u4");
    expect(g.unitIds).toEqual(["u3", "u4"]);
    expect(g.neededCount).toBe(12);
    expect(g.students.map((s) => s.name)).toEqual(["학생가", "학생나"]);
  });

  /**
   * 🔴 2회차 동작 — 직전 확인테스트가 u3 까지면 시작은 u4 (대단원 제한 미적용).
   *    같은 현재 진도(u5)라도 직전 시험이 없는 학생은 D-63 으로 u3 부터 —
   *    **두 학생이 다른 묶음**이 된다.
   */
  it("직전 확인테스트 있으면 그 다음부터, 없으면 대단원 처음부터 — 묶음이 갈린다", () => {
    const plan = planDailyReview({
      day: "2026-08-21",
      students: [
        student({ id: "s1", name: "학생가" }),
        student({ id: "s2", name: "학생나" }),
      ],
      progressRows: [
        // 둘 다 이력이 u1(앞 대단원)부터 u5 까지
        ...["u1", "u3", "u4"].map((u) => row("s1", u, "2026-08-19")),
        row("s1", "u5", "2026-08-21"),
        ...["u1", "u3", "u4"].map((u) => row("s2", u, "2026-08-19")),
        row("s2", "u5", "2026-08-21"),
      ],
      lastReviews: [{ studentId: "s1", rangeEndUnitId: "u3" }],
      units: UNITS,
    });
    expect(plan.groups).toHaveLength(2);
    const byStudent = new Map(
      plan.groups.flatMap((g) => g.students.map((s) => [s.id, g] as const)),
    );
    expect(byStudent.get("s1")!.rangeStartUnitId).toBe("u4");
    expect(byStudent.get("s1")!.startedFrom).toBe("last-review");
    expect(byStudent.get("s2")!.rangeStartUnitId).toBe("u3"); // D-63 대단원 처음
    expect(byStudent.get("s2")!.startedFrom).toBe("chapter-start");
  });

  it("학년 표기는 학교 학년 우선, 없으면 반 학년", () => {
    const plan = planDailyReview({
      day: "2026-08-21",
      students: [
        student({
          id: "s1",
          schoolLevel: null,
          schoolGrade: null,
          classGrade: "초4",
        }),
      ],
      progressRows: [row("s1", "u3", "2026-08-21")],
      lastReviews: [],
      units: UNITS,
    });
    expect(plan.groups[0]!.students[0]!.grade).toBe("초4");
  });

  it("진도 행은 있는데 단원 목록에 없으면 noRange 로 센다 — 조용히 버리지 않는다", () => {
    const plan = planDailyReview({
      day: "2026-08-21",
      students: [student({ id: "s1" })],
      progressRows: [row("s1", "ghost-unit", "2026-08-21")],
      lastReviews: [],
      units: UNITS,
    });
    expect(plan.groups).toEqual([]);
    expect(plan.noRange.map((s) => s.id)).toEqual(["s1"]);
  });
});

/**
 * 🔴 매일 자동 출제 ⑤ — **계획이 있는 학생이면 전부 대상**(D-129 ⑷).
 *
 * 지금까지 「오늘 수업했나」는 eywa 보고서 날짜 하나였다. 그러면 손으로 등록한 학생과
 * 고등은 **영영 자동에 못 들어온다**(고등은 eywa 차시 체계에 아예 없다). 계획(요일)이
 * 그 자리를 대신한다 — 그리고 진도가 기록되면 **실제가 이긴다**(D-129 ⑵).
 */
describe("[planDailyReview] 진도 계획으로 대상을 넓힌다", () => {
  const DAY = "2026-08-21"; // 금

  it("보고서가 없어도 계획상 오늘이 수업일이면 대상이다 — 손 등록 학생·고등", () => {
    const plan = planDailyReview({
      day: DAY,
      students: [
        student({ id: "s1", lastReportDate: null, lastReportText: null }),
      ],
      progressRows: [],
      lastReviews: [],
      units: UNITS,
      plans: [planRow()],
    });
    expect(plan.attended).toBe(1);
    expect(plan.groups).toHaveLength(1);
    expect(plan.groups[0]!.students.map((s) => s.id)).toEqual(["s1"]);
  });

  it("계획상 수업일이 아니면 대상이 아니다 — 토요일엔 아무도 안 선다", () => {
    const plan = planDailyReview({
      day: "2026-08-22", // 토
      students: [
        student({ id: "s1", lastReportDate: null, lastReportText: null }),
      ],
      progressRows: [],
      lastReviews: [],
      units: UNITS,
      plans: [planRow()],
    });
    expect(plan.attended).toBe(0);
    expect(plan.groups).toEqual([]);
  });

  it("꺼 둔 계획은 대상이 아니다", () => {
    const plan = planDailyReview({
      day: DAY,
      students: [
        student({ id: "s1", lastReportDate: null, lastReportText: null }),
      ],
      progressRows: [],
      lastReviews: [],
      units: UNITS,
      plans: [planRow({ active: false })],
    });
    expect(plan.attended).toBe(0);
  });

  /**
   * 🔴 진도 이력이 **한 줄도 없는** 새 학생이 `current-only`(한 차시짜리 범위)로 떨어지지
   *    않는다 — 계획의 시작 차시가 「그 반이 나가기 시작한 데」 노릇을 하고, 그 위에
   *    D-63 대단원 제한이 그대로 걸린다.
   */
  it("계획의 시작 차시가 «이력 첫 단원» 노릇을 한다 — D-63 대단원 제한 그대로", () => {
    const plan = planDailyReview({
      day: DAY,
      students: [
        student({ id: "s1", lastReportDate: null, lastReportText: null }),
      ],
      progressRows: [],
      lastReviews: [],
      units: UNITS,
      plans: [planRow()], // 8/21 = 넷째 수업 → u4 (3. 방정식)
    });
    const g = plan.groups[0]!;
    expect(g.rangeEndUnitId).toBe("u4");
    expect(g.rangeStartUnitId).toBe("u3"); // 대단원 처음 — u1 까지 거슬러 가지 않는다
    expect(g.startedFrom).toBe("chapter-start");
  });

  it("🔴 실제가 이긴다 — 오늘 진도가 기록됐으면 계획이 아니라 그 차시가 범위 끝", () => {
    const plan = planDailyReview({
      day: DAY,
      students: [
        student({ id: "s1", lastReportDate: null, lastReportText: null }),
      ],
      progressRows: [row("s1", "u2", DAY)],
      lastReviews: [],
      units: UNITS,
      plans: [planRow()], // 계획대로면 u4
    });
    expect(plan.groups[0]!.rangeEndUnitId).toBe("u2");
  });

  it("학생 계획이 반 계획을 덮는다 — 개별 진도 학생만", () => {
    const plan = planDailyReview({
      day: DAY,
      students: [
        student({
          id: "s1",
          name: "학생가",
          useIndividualProgress: true,
          lastReportDate: null,
          lastReportText: null,
        }),
        student({
          id: "s2",
          name: "학생나",
          useIndividualProgress: false,
          lastReportDate: null,
          lastReportText: null,
        }),
      ],
      progressRows: [],
      lastReviews: [],
      units: UNITS,
      plans: [
        planRow(),
        // s1 전용 — 금요일만 나간다: 8/14 u1 · 8/21 u2
        planRow({ studentId: "s1", weekdays: [5] }),
        // s2 는 개별 진도가 아니라 이 줄이 있어도 반 계획을 쓴다
        planRow({ studentId: "s2", weekdays: [5] }),
      ],
    });
    const byStudent = new Map(
      plan.groups.flatMap((g) => g.students.map((s) => [s.id, g] as const)),
    );
    expect(byStudent.get("s1")!.rangeEndUnitId).toBe("u2");
    expect(byStudent.get("s2")!.rangeEndUnitId).toBe("u4");
  });

  it("개별 진도가 아닌 학생은 **반 진도**를 본다 — 실제가 이긴다도 반 행으로", () => {
    const plan = planDailyReview({
      day: DAY,
      students: [
        student({
          id: "s1",
          useIndividualProgress: false,
          lastReportDate: null,
          lastReportText: null,
        }),
      ],
      progressRows: [row(null, "u5", DAY)], // 반 전체 진도
      lastReviews: [],
      units: UNITS,
      plans: [planRow()],
    });
    expect(plan.groups[0]!.rangeEndUnitId).toBe("u5");
  });

  /** 🔴 D-64 가 계획보다 앞선다 — 보고서가 「내신대비」면 계획이 수업일이라도 표시만. */
  it("보고서는 오늘인데 진도 행이 없으면 계획이 있어도 examOrUnread", () => {
    const plan = planDailyReview({
      day: DAY,
      students: [student({ id: "s1", lastReportText: "수학 내신대비" })],
      progressRows: [],
      lastReviews: [],
      units: UNITS,
      plans: [planRow()],
    });
    expect(plan.groups).toEqual([]);
    expect(plan.examOrUnread.map((s) => s.id)).toEqual(["s1"]);
  });

  it("계획 대상과 보고서 대상을 합쳐 센다 — 같은 학생을 두 번 세지 않는다", () => {
    const plan = planDailyReview({
      day: DAY,
      students: [
        // 계획도 있고 오늘 보고서·진도도 있다 — 한 번만 센다
        student({ id: "s1", name: "학생가" }),
        // 계획만 있다
        student({ id: "s2", name: "학생나", lastReportDate: null }),
        // 보고서만 있다(계획 밖의 반)
        student({
          id: "s3",
          name: "학생다",
          classId: "c2",
          lastReportDate: DAY,
        }),
      ],
      progressRows: [row("s1", "u4", DAY), row("s3", "u4", DAY, "c2")],
      lastReviews: [],
      units: UNITS,
      plans: [planRow()],
    });
    expect(plan.attended).toBe(3);
    const everyone = plan.groups.flatMap((g) => g.students.map((s) => s.id));
    expect(everyone.sort()).toEqual(["s1", "s2", "s3"]);
  });

  it("계획이 없으면 지금 그대로다 — 보고서 날짜가 「오늘」을 가른다", () => {
    const plan = planDailyReview({
      day: DAY,
      students: [
        student({ id: "s1", lastReportDate: DAY }),
        student({ id: "s2", name: "학생나", lastReportDate: "2026-08-20" }),
      ],
      progressRows: [row("s1", "u4", DAY), row("s2", "u4", "2026-08-20")],
      lastReviews: [],
      units: UNITS,
      plans: [],
    });
    expect(plan.attended).toBe(1);
    expect(plan.groups.flatMap((g) => g.students.map((s) => s.id))).toEqual([
      "s1",
    ]);
  });
});

/**
 * 🔴 **밀림** — 메인 «오늘의 확인테스트» 칩 「N일 밀림 M명」(D-131 · 05 §8.10).
 *
 * 밀림 셈은 `resolveDailyPlan` 한 곳이다(계획이 그 차시를 나가라던 날 − 실제로 나간 날).
 * 여기서 보는 것은 «누구를 세나»다: **오늘 대상**이고 **계획이 있고** 음수인 학생만.
 * 시험기간·미분류(D-64)는 세지 않는다 — 진도를 안 나가는 까닭이 이미 따로 표시된다.
 */
describe("[planDailyReview] 밀림 — 계획보다 늦은 오늘의 대상", () => {
  const DAY = "2026-08-21";
  // 월·수·금, 8/14(금) 시작: 8/14 u1 · 8/17 u2 · 8/19 u3 · 8/21 u4 · 8/24 u5
  it("오늘 대상 중 계획보다 늦은 학생만 days(양수)와 함께 — 제때·앞섬·계획 없음은 없다", () => {
    const plan = planDailyReview({
      day: DAY,
      students: [
        student({ id: "s1", name: "가", lastReportDate: null }),
        student({ id: "s2", name: "나", lastReportDate: null }),
        student({ id: "s3", name: "다", lastReportDate: null }),
        student({ id: "s4", name: "라", lastReportDate: null }),
        // 계획이 없는 반 — 보고서로 들어온 대상. 밀림을 잴 계획이 없다.
        student({ id: "s5", name: "마", classId: "c2", lastReportDate: DAY }),
      ],
      progressRows: [
        row("s1", "u2", "2026-08-19"), // u2 는 8/17 몫 → 2일 밀림
        row("s2", "u2", DAY), // 8/17 몫을 8/21 에 → 4일 밀림
        row("s3", "u4", DAY), // 제때
        row("s4", "u5", DAY), // 8/24 몫을 8/21 에 → 앞섬
        row("s5", "u1", DAY, "c2"),
      ],
      lastReviews: [],
      units: UNITS,
      plans: [planRow()],
    });
    expect(plan.attended).toBe(5);
    expect(
      plan.delayed
        .map((s) => [s.id, s.days])
        .sort(([a], [b]) => String(a).localeCompare(String(b))),
    ).toEqual([
      ["s1", 2],
      ["s2", 4],
    ]);
    expect(plan.delayed[0]).toMatchObject({
      classId: "c1",
      className: "중등M 중2",
      grade: "중2",
    });
  });

  it("오늘 수업이 아닌 학생은 밀려 있어도 세지 않는다 — 오늘의 칩이다", () => {
    const plan = planDailyReview({
      day: DAY,
      students: [student({ id: "s1", lastReportDate: null })],
      progressRows: [row("s1", "u1", "2026-08-19")],
      lastReviews: [],
      units: UNITS,
      plans: [planRow({ weekdays: [2, 4], startDate: "2026-08-11" })],
    });
    expect(plan.attended).toBe(0);
    expect(plan.delayed).toEqual([]);
  });

  it("시험기간·미분류(D-64)는 밀림으로 세지 않는다 — 까닭이 이미 따로 선다", () => {
    const plan = planDailyReview({
      day: DAY,
      students: [
        student({
          id: "s1",
          lastReportDate: DAY,
          lastReportText: "수학 내신대비",
        }),
      ],
      progressRows: [row("s1", "u1", "2026-08-17")],
      lastReviews: [],
      units: UNITS,
      plans: [planRow()],
    });
    expect(plan.examOrUnread.map((s) => s.id)).toEqual(["s1"]);
    expect(plan.delayed).toEqual([]);
  });
});

/**
 * 🔴 RED → 🟢 — 경계(`lastTeachableUnitId`)를 **계획에 그대로 넘긴다** (2026-09-18 시뮬레이션 결함 ⑵).
 *
 * 부르는 쪽(아침 회차 · 오늘의 확인테스트 화면)이 «문항이 있는 마지막 차시»를 넘기면, 계획이 그 너머
 * (문항 0건 구간)로 범위 끝을 내지 않는다. 직전 확인테스트가 그 차시에서 끝났으면 범위는
 * `current-only`(그 차시 한 개)로 서서 시험이 **계속 선다** — 예전에는 범위가 전부 «고등 안»이 되어
 * 영구히 「문항 부족」이었다.
 */
describe("[planDailyReview] 경계 — 문항이 있는 마지막 차시", () => {
  const DAY = "2026-08-21"; // 금 — 계획대로면 u4

  it("경계를 주면 범위 끝이 경계 차시다", () => {
    const plan = planDailyReview({
      day: DAY,
      students: [
        student({ id: "s1", lastReportDate: null, lastReportText: null }),
      ],
      progressRows: [],
      lastReviews: [],
      units: UNITS,
      plans: [planRow()],
      lastTeachableUnitId: "u3",
    });
    expect(plan.groups).toHaveLength(1);
    expect(plan.groups[0]!.rangeEndUnitId).toBe("u3");
    expect(plan.groups[0]!.unitIds).not.toContain("u4");
  });

  it("직전 확인테스트가 경계에서 끝났으면 그 차시 하나로 계속 선다(영구 정지 아님)", () => {
    const plan = planDailyReview({
      day: DAY,
      students: [
        student({ id: "s1", lastReportDate: null, lastReportText: null }),
      ],
      progressRows: [],
      lastReviews: [{ studentId: "s1", rangeEndUnitId: "u3" }],
      units: UNITS,
      plans: [planRow()],
      lastTeachableUnitId: "u3",
    });
    expect(plan.noRange).toHaveLength(0);
    expect(plan.groups[0]!.unitIds).toEqual(["u3"]);
    expect(plan.groups[0]!.startedFrom).toBe("current-only");
  });

  it("경계를 안 주면 예전과 같다", () => {
    const plan = planDailyReview({
      day: DAY,
      students: [
        student({ id: "s1", lastReportDate: null, lastReportText: null }),
      ],
      progressRows: [],
      lastReviews: [],
      units: UNITS,
      plans: [planRow()],
    });
    expect(plan.groups[0]!.rangeEndUnitId).toBe("u4");
  });
});
