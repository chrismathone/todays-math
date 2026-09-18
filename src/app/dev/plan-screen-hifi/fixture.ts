/**
 * `/dev/plan-screen-hifi` 픽스처 — 진도 계획 화면(D-131 «계기판 관»)을 **실제 교육과정**과 **제품 함수**로 채운다.
 *
 * 예정 줄은 서버와 **같은 함수**(`buildPlanSchedule` → `resolveDailyPlan`)로 편다 — 이 파일은 «가짜 서버» 자리다.
 * 화면 부품은 날짜를 펴지 않는다(그 규칙은 서버 한 곳). DB 는 읽지도 쓰지도 않는다.
 *
 * 묶음(`set`)
 * - `hifi`   시안 Hi-fi 2 그림 — 중2 A반 월·수·금 · 9/14 에 9/11 몫을 나가 **3일 밀림** · 오늘 9/16
 * - `stress` 가장 큰 데이터 — 매일 수업 · 한 수업 2차시 · 교육과정에서 **가장 긴 차시 이름** 구간 · 14칸
 * - `none`   계획 없는 반(「수업 계획이 없습니다.」)
 * 메인(`screen=main`)
 * - `hifi`   초안 5장 · 칩 셋 · 수업 없는 반 한 줄
 * - `stress` 밀림 날 여럿 · 범위 없음 · 수업 없는 반 일곱(긴 이름)
 * - `empty`  오늘 대상 0 — 「오늘 수업 계획이 없습니다.」
 */
import type { ClassEntity, StudentEntity } from "@/contracts/class.contract";
import type {
  PlanScheduleEntity,
  ProgressPlanEntity,
} from "@/contracts/dailyAutoTest.contract";
import type { DailyReviewResponse } from "@/contracts/test.contract";
import {
  buildPlanSchedule,
  planScheduleWindow,
} from "@/lib/daily/planSchedule";
import type { ProgressPlanRule } from "@/lib/daily/progressPlan";
import type { ProgressRecordLike } from "@/lib/progressResolver";

export type PlanHifiSet = "hifi" | "stress" | "none";
export type MainHifiSet = "hifi" | "stress" | "empty" | "outside";

export interface FixtureUnit {
  id: string;
  grade: string;
  chapter: string;
  section: string;
  orderIndex: number;
}

const uid = (head: string, n: number) =>
  `${head}-0000-4000-8000-${String(n).padStart(12, "0")}`;

export const unitIdOf = (orderIndex: number) => uid("7a000000", orderIndex);

const RATIO = { 연산: 1, 기본: 2, 응용: 3, 심화하: 2, 심화중: 0, 심화상: 0 };
const AT = "2026-03-02T00:00:00.000Z";
const OWNER = uid("10000000", 1);

export const HIFI_CLASSES: ClassEntity[] = [
  {
    id: uid("5c000000", 1),
    userId: OWNER,
    name: "중2 A반",
    grade: "중2",
    defaultProblemCount: 8,
    difficultyRatio: RATIO,
    createdAt: AT,
    updatedAt: AT,
  },
  {
    id: uid("5c000000", 2),
    userId: OWNER,
    name: "중1 B반",
    grade: "중1",
    defaultProblemCount: 8,
    difficultyRatio: RATIO,
    createdAt: AT,
    updatedAt: AT,
  },
];

export const HIFI_STUDENTS: StudentEntity[] = [
  "김도윤",
  "이서준",
  "박하은",
  "최지우",
].map((name, i) => ({
  id: uid("5d000000", i + 1),
  classId: HIFI_CLASSES[0]!.id,
  name,
  useIndividualProgress: false,
  createdAt: AT,
  updatedAt: AT,
}));

interface PlanSeed {
  rule: ProgressPlanRule;
  records: ProgressRecordLike[];
}

const record = (
  classId: string,
  orderIndex: number,
  recordedAt: string,
): ProgressRecordLike => ({
  id: `${orderIndex}@${recordedAt}`,
  classId,
  studentId: null,
  unitId: unitIdOf(orderIndex),
  recordedAt,
  createdAt: `${recordedAt}T09:00:00.000Z`,
});

/** 교육과정에서 차시 이름이 가장 긴 곳 — 손으로 적지 않고 찾는다. */
function longestStart(units: readonly FixtureUnit[]): FixtureUnit {
  return [...units].sort(
    (a, b) =>
      b.section.length - a.section.length || a.orderIndex - b.orderIndex,
  )[0]!;
}

export function planSeed(
  set: PlanHifiSet,
  units: readonly FixtureUnit[],
): PlanSeed | null {
  const classId = HIFI_CLASSES[0]!.id;
  if (set === "none") return null;
  if (set === "hifi") {
    // 월·수·금, 9/7(월) 지수법칙(417)부터 한 차시 — 9/11 에 419 를 나가고, 9/14 에 419 를 다시(3일 밀림)
    return {
      rule: {
        weekdays: [1, 3, 5],
        unitsPerLesson: 1,
        startUnitId: unitIdOf(417),
        startDate: "2026-09-07",
        active: true,
      },
      records: [
        record(classId, 417, "2026-09-07"),
        record(classId, 418, "2026-09-09"),
        record(classId, 419, "2026-09-11"),
        record(classId, 419, "2026-09-14"),
      ],
    };
  }
  const start = longestStart(units);
  return {
    rule: {
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      unitsPerLesson: 2,
      startUnitId: start.id,
      // 🔴 창(이번 주 월요일부터)의 첫 칸에 가장 긴 이름이 서게 — 9/10 에 시작하면 긴 이름이 창 앞에서 지나간다(계측이 잡았다)
      startDate: "2026-09-14",
      active: true,
    },
    // 9/16 에 9/14 몫(첫 수업의 둘째 차시)을 나갔다 — 2일 밀림
    records: [record(classId, start.orderIndex + 1, "2026-09-16")],
  };
}

export function planEntity(
  seed: PlanSeed,
  classId: string,
): ProgressPlanEntity {
  return {
    id: uid("5e000000", 1),
    classId,
    studentId: null,
    ...seed.rule,
    weekdays: [...seed.rule.weekdays],
  };
}

/** 가짜 서버의 예정 — 서버 `loadPlanSchedule` 와 같은 조립(제품 함수 + 차시 이름). */
export function scheduleOf(
  rule: ProgressPlanRule,
  records: readonly ProgressRecordLike[],
  units: readonly FixtureUnit[],
  day: string,
): PlanScheduleEntity {
  const { from, to } = planScheduleWindow(day);
  const rows = buildPlanSchedule({
    rule,
    units,
    classProgress: records,
    from,
    to,
  });
  const refs = new Map(
    units.map((u) => [
      u.id,
      { id: u.id, grade: u.grade, chapter: u.chapter, section: u.section },
    ]),
  );
  const names = (ids: string[]) => ids.flatMap((id) => refs.get(id) ?? []);
  return {
    from,
    to,
    rows: rows.map((r) => ({
      date: r.date,
      weekday: r.weekday,
      lesson: r.lesson,
      planned: names(r.plannedUnitIds),
      actual: names(r.actualUnitIds),
      driftDays: r.driftDays,
      atCurriculumEnd: r.atCurriculumEnd,
    })),
  };
}

// ── 메인 «오늘의 확인테스트» ───────────────────────────────────────

const stu = (n: number, name: string, className = "중2 A반") => ({
  id: uid("5f000000", n),
  name,
  classId: HIFI_CLASSES[0]!.id,
  grade: "중2",
  className,
});

export function mainDaily(
  set: MainHifiSet,
  units: readonly FixtureUnit[],
): DailyReviewResponse["data"] {
  const u = (o: number) => unitIdOf(o);
  const base: DailyReviewResponse["data"] = {
    day: "2026-09-16",
    eywaOwner: false,
    sync: null,
    attended: 0,
    auto: [],
    lacking: [],
    examOrUnread: [],
    noRange: [],
    hasPlan: true,
    delayed: [],
    noLessonClasses: [],
    todayTests: [],
  };
  if (set === "empty") return base;

  const autoStudents = [1, 2, 3, 4, 5].map((n) =>
    stu(n, ["김도윤", "이서준", "박하은", "최지우", "정민재"][n - 1]!),
  );
  // 앞 셋은 아침 회차가 세운 초안(«자동 출제» 표지 — D-133 ⑵), 뒤 둘은 손으로 낸 초안
  const draft = autoStudents.map((s, i) => ({
    studentId: s.id,
    studentName: s.name,
    testId: uid("90000000", 700 + i),
    status: "draft" as const,
    autoDraft: i < 3,
  }));
  if (set === "hifi" || set === "outside") {
    const hifi: DailyReviewResponse["data"] = {
      ...base,
      attended: 9,
      auto: [
        {
          key: `${u(417)}~${u(420)}`,
          rangeStartUnitId: u(417),
          rangeEndUnitId: u(420),
          startedFrom: "last-review",
          unitCount: 4,
          neededCount: 8,
          capacity: 11,
          students: autoStudents,
        },
      ],
      lacking: [
        {
          key: `${u(421)}~${u(422)}`,
          rangeStartUnitId: u(421),
          rangeEndUnitId: u(422),
          startedFrom: "progress-start",
          unitCount: 2,
          neededCount: 8,
          capacity: 3,
          students: [stu(6, "한서윤"), stu(7, "윤지호")],
        },
      ],
      examOrUnread: [{ ...stu(8, "오하린"), lines: ["수학 내신대비"] }],
      delayed: [{ ...stu(9, "강민서"), days: 3 }],
      noLessonClasses: [
        { id: HIFI_CLASSES[1]!.id, name: "중1 B반", grade: "중1" },
      ],
      todayTests: draft,
    };
    if (set === "hifi") return hifi;
    // outside — 아침 초안이 선 뒤 자동 묶음 밖으로 바뀐 학생(D-133 후속): 문항 부족 한서윤은 아침 초안,
    // 시험기간 오하린은 손으로 낸 시험지. 검수 줄에 이름이 서고 두 줄의 «직접 출제»가 «검수»로 바뀐다.
    return {
      ...hifi,
      todayTests: [
        ...draft,
        {
          studentId: stu(6, "한서윤").id,
          studentName: "한서윤",
          testId: uid("90000000", 760),
          status: "draft" as const,
          autoDraft: true,
        },
        {
          studentId: stu(8, "오하린").id,
          studentName: "오하린",
          testId: uid("90000000", 780),
          status: "draft" as const,
          autoDraft: false,
        },
      ],
    };
  }

  // stress — 밀림 날 여럿 · 범위 없음 · 긴 반 이름 일곱
  const longClass = (n: number) =>
    `${["중1", "중2", "중3", "초5", "초6", "고1", "중2"][n]} 월수금 심화 내신대비 ${n + 1}반(토요 보강 포함)`;
  return {
    ...mainDaily("hifi", units),
    attended: 30,
    noRange: [stu(20, "서지안"), stu(21, "문하준")],
    delayed: [1, 2, 3, 5, 5, 8, 12, 12, 12].map((days, i) => ({
      ...stu(30 + i, `학생${i + 1}`),
      days,
    })),
    noLessonClasses: [0, 1, 2, 3, 4, 5, 6].map((n) => ({
      id: uid("5c100000", n + 1),
      name: longClass(n),
      grade: "중2",
    })),
  };
}
