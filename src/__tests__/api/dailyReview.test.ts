/**
 * 🔴 RED → 🟢 — GET /api/tests/daily-review (오늘의 학생별 확인테스트, D-63·D-64).
 *
 * 구현: src/app/api/tests/daily-review/route.ts
 * 계획: src/lib/daily/planDailyReview.ts (규칙은 그쪽 단위 테스트가 잠근다)
 * 대응 계약: src/contracts/test.contract.ts (dailyReviewResponseSchema)
 *
 * 여기서 보는 것은 **배선**이다: 연계 학생만 보는가, 마지막 보고서 날짜(D-64)로
 * 「오늘」을 가르는가, 풀 세기가 부족 판정(neededCount)과 이어지는가, 동기화
 * 스트립이 실행 기록을 그대로 실어 나르는가.
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/session", () => ({
  getSessionUser: vi.fn(async () => ({
    id: "10000000-0000-4000-8000-000000000001",
    email: "teacher@todaysmath.test",
    name: "테스트 강사",
  })),
}));

import { GET as dailyReview } from "@/app/api/tests/daily-review/route";
import { dailyReviewResponseSchema } from "@/contracts/test.contract";
import { getSessionUser } from "@/lib/session";
import {
  CLASS_A_ID,
  CLASS_B_ID,
  CLASS_OTHER_ID,
  MOCK_CLASSES,
  MOCK_UNITS,
  MOCK_TEACHER,
  STUDENT_IDS,
  USER_OTHER_ID,
  USER_TEACHER_ID,
} from "@/mocks/data";
import {
  prismaTestDouble,
  resetPrismaTestDouble,
} from "@/mocks/prismaTestDouble";

const DAY = "2026-08-21";
/** orderIndex 427 «일차부등식의 활용(농도)» — mock 문제가 **0건**인 단원(픽스처 설계). */
const EMPTY_POOL_UNIT = MOCK_UNITS[14]!;

function get(query = `day=${DAY}`) {
  return dailyReview(
    new NextRequest(`http://localhost/api/tests/daily-review?${query}`),
  );
}

async function seed() {
  // s1 — 오늘 보고서 + 오늘 진도(문항 0건 단원) → «문항 부족» 묶음.
  await prismaTestDouble.student.update({
    where: { id: STUDENT_IDS[0]! },
    data: {
      eywaStudentId: "e0000000-0000-4000-8000-000000000001",
      eywaLastReportDate: new Date(`${DAY}T00:00:00Z`),
      eywaLastReportText: "수학 일차부등식의 활용(농도)",
      useIndividualProgress: true,
    },
  });
  await prismaTestDouble.progress.create({
    data: {
      classId: CLASS_A_ID,
      studentId: STUDENT_IDS[0]!,
      unitId: EMPTY_POOL_UNIT.id,
      recordedAt: new Date(`${DAY}T00:00:00Z`),
    },
  });
  // s2 — 오늘 보고서는 있는데 진도 행이 없다(시험기간) → 표시만(D-64).
  await prismaTestDouble.student.update({
    where: { id: STUDENT_IDS[1]! },
    data: {
      eywaStudentId: "e0000000-0000-4000-8000-000000000002",
      eywaLastReportDate: new Date(`${DAY}T00:00:00Z`),
      eywaLastReportText: "수학 내신대비\n수학 내신대비",
      useIndividualProgress: true,
    },
  });
  // s3(STUDENT_IDS[2])는 연계 안 됨 — 어디에도 나오면 안 된다.
  await prismaTestDouble.eywaSyncRun.create({
    data: {
      transport: "api",
      students: 193,
      classes: 62,
      progressRows: 13571,
      unresolvedLines: 3999,
      ambiguous: 97,
      examOnly: 1803,
    },
  });
}

describe("[2단계] GET /api/tests/daily-review — 오늘의 학생별 확인테스트", () => {
  beforeEach(async () => {
    resetPrismaTestDouble();
    await seed();
    // 🔴 소유자 게이트(2026-09-07) — 모킹된 세션(teacher@)을 소유자로 둔다.
    process.env.EYWA_SYNC_OWNER_EMAIL = "teacher@todaysmath.test";
  });

  it("🔴 eywa 소유자가 아니면 빈 응답 — 연계 학생·동기화 기록은 학원 하나의 것이라 남에게 안 준다", async () => {
    vi.mocked(getSessionUser).mockResolvedValueOnce({
      id: "10000000-0000-4000-8000-000000000002",
      email: "walk@todaysmath.test",
      name: "다른 선생님",
      isAdmin: false,
    });
    const res = await get();
    expect(res.status).toBe(200);
    const body = dailyReviewResponseSchema.parse(await res.json());
    expect(body.data.eywaOwner).toBe(false);
    expect(body.data.sync).toBeNull();
    expect(body.data.attended).toBe(0);
    expect(body.data.auto).toEqual([]);
    expect(body.data.lacking).toEqual([]);
    expect(body.data.examOrUnread).toEqual([]);
    expect(body.data.todayTests).toEqual([]);
  });

  it("소유자면 eywaOwner 가 참이다", async () => {
    const body = dailyReviewResponseSchema.parse(await (await get()).json());
    expect(body.data.eywaOwner).toBe(true);
  });

  it("세션이 없으면 401", async () => {
    vi.mocked(getSessionUser).mockResolvedValueOnce(null);
    const res = await get();
    expect(res.status).toBe(401);
  });

  it("연계 학생만, 마지막 보고서 날짜로 «오늘»을 가른다 — 비연계 학생은 안 나온다", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    const body = dailyReviewResponseSchema.parse(await res.json());
    expect(body.data.day).toBe(DAY);
    expect(body.data.attended).toBe(2);
    const everyone = [
      ...body.data.auto.flatMap((g) => g.students.map((s) => s.id)),
      ...body.data.lacking.flatMap((g) => g.students.map((s) => s.id)),
      ...body.data.examOrUnread.map((s) => s.id),
      ...body.data.noRange.map((s) => s.id),
    ];
    expect(everyone.sort()).toEqual([STUDENT_IDS[0]!, STUDENT_IDS[1]!].sort());
  });

  /** 🔴 풀 세기 배선 — 문항 0건 단원은 «부족» 묶음으로 가고, 기준은 반 기본 문항 수다. */
  it("문항이 모자란 묶음은 lacking — poolTotal 0, neededCount 는 반 기본값", async () => {
    const res = await get();
    const body = dailyReviewResponseSchema.parse(await res.json());
    expect(body.data.auto).toEqual([]);
    expect(body.data.lacking).toHaveLength(1);
    const g = body.data.lacking[0]!;
    expect(g.rangeEndUnitId).toBe(EMPTY_POOL_UNIT.id);
    expect(g.poolTotal).toBe(0);
    expect(g.neededCount).toBe(MOCK_CLASSES[0]!.defaultProblemCount);
    expect(g.students.map((s) => s.id)).toEqual([STUDENT_IDS[0]!]);
  });

  /** 🔴 D-64 — 시험기간 학생은 표시만: 원문 줄(중복 제거)이 사유로 실린다. */
  it("진도 행이 없는 학생은 examOrUnread 에 원문 줄과 함께 나온다", async () => {
    const res = await get();
    const body = dailyReviewResponseSchema.parse(await res.json());
    expect(body.data.examOrUnread).toEqual([
      expect.objectContaining({
        id: STUDENT_IDS[1]!,
        lines: ["수학 내신대비"],
      }),
    ]);
  });

  it("동기화 실행 기록이 스트립 데이터로 그대로 실린다", async () => {
    const res = await get();
    const body = dailyReviewResponseSchema.parse(await res.json());
    expect(body.data.sync).toEqual(
      expect.objectContaining({
        students: 193,
        progressRows: 13571,
        unresolvedLines: 3999,
        ambiguous: 97,
      }),
    );
  });
});

/**
 * 🔴 매일 자동 출제 ⑤ — **계획이 있는 학생이면 전부 대상**(D-129 ⑷).
 *
 * 지금까지 이 라우트는 `eywaStudentId != null` 인 학생만 읽었다. 그러면 손으로 등록한
 * 학생과 고등은 이 화면에 **영영 못 들어온다**(고등은 eywa 차시 체계에 아예 없다).
 * 계획(요일)이 그 자리를 대신한다 — 그리고 계획 갈래는 **소유 범위 안에서만** 본다.
 */
describe("[매일 자동 출제 ⑤] GET /api/tests/daily-review — 계획으로 넓힌 대상", () => {
  beforeEach(async () => {
    resetPrismaTestDouble();
    // 위 describe 와 **같은 씨앗**이다 — 계획을 얹기 전의 화면이 무엇이었는지가 분모다.
    await seed();
    process.env.EYWA_SYNC_OWNER_EMAIL = "teacher@todaysmath.test";
  });

  /** 반 A 금요일 계획 — 반 진도 416@2026-08-01 에서 이어 편다. 2026-08-21 은 금요일. */
  const seedPlan = (classId = CLASS_A_ID) =>
    prismaTestDouble.progressPlan.create({
      data: {
        classId,
        studentId: null,
        weekdays: [5],
        unitsPerLesson: 1,
        startUnitId: MOCK_UNITS[0]!.id,
        startDate: new Date("2026-08-14T00:00:00Z"),
        active: true,
      },
    });

  it("eywa 연계가 아닌 학생도 계획이 있으면 나온다 — 손 등록·고등", async () => {
    await seedPlan();
    const body = dailyReviewResponseSchema.parse(await (await get()).json());
    const everyone = [
      ...body.data.auto.flatMap((g) => g.students.map((s) => s.id)),
      ...body.data.lacking.flatMap((g) => g.students.map((s) => s.id)),
      ...body.data.examOrUnread.map((s) => s.id),
      ...body.data.noRange.map((s) => s.id),
    ];
    // STUDENT_IDS[2] 는 eywa 연계가 안 된 학생이다 — 계획으로 들어온다
    expect(everyone).toContain(STUDENT_IDS[2]!);
    expect(body.data.attended).toBe(3);
  });

  it("계획이 없으면 지금 그대로다 — 연계 학생 둘만", async () => {
    const body = dailyReviewResponseSchema.parse(await (await get()).json());
    expect(body.data.attended).toBe(2);
  });

  /** 🔴 계획 갈래는 계정 소유를 묻는다 — eywa 갈래와 달리 남의 반이 섞일 수 있다. */
  it("남의 계정 반의 계획 학생은 안 나온다", async () => {
    await prismaTestDouble.progressPlan.create({
      data: {
        classId: CLASS_OTHER_ID,
        studentId: null,
        weekdays: [5],
        unitsPerLesson: 1,
        startUnitId: MOCK_UNITS[0]!.id,
        startDate: new Date("2026-08-14T00:00:00Z"),
        active: true,
      },
    });
    const other = await prismaTestDouble.student.create({
      data: {
        classId: CLASS_OTHER_ID,
        name: "남의학생",
        schoolLevel: null,
        schoolGrade: null,
        eywaStudentId: null,
        eywaWithdrawnAt: null,
        eywaLastReportDate: null,
        eywaLastReportText: null,
      },
    });
    const body = dailyReviewResponseSchema.parse(await (await get()).json());
    const everyone = [
      ...body.data.auto.flatMap((g) => g.students.map((s) => s.id)),
      ...body.data.lacking.flatMap((g) => g.students.map((s) => s.id)),
      ...body.data.examOrUnread.map((s) => s.id),
      ...body.data.noRange.map((s) => s.id),
    ];
    expect(everyone).not.toContain(other.id);
  });

  /** eywa 소유자가 아니어도 **자기 계획 학생**은 본다 — 막는 것은 eywa 것뿐이다. */
  it("eywa 소유자가 아니어도 자기 반 계획 학생은 나온다 — 동기화 스트립만 없다", async () => {
    await seedPlan();
    process.env.EYWA_SYNC_OWNER_EMAIL = "someone-else@todaysmath.test";
    const body = dailyReviewResponseSchema.parse(await (await get()).json());
    expect(body.data.eywaOwner).toBe(false);
    expect(body.data.sync).toBeNull();
    expect(body.data.attended).toBe(3);
  });

  /**
   * 🔴 **반 진도를 읽는 배선**을 겨눈다. 규칙 자체는 `planDailyReview` 단위 시험이 잠그지만,
   *    라우트가 반 행(studentId=null)을 아예 안 읽어도 그 시험은 초록이다
   *    (변이 ⑦c 가 살아남았다 — 2026-09-16). 개별 진도를 끈 학생 하나로 배선을 본다.
   */
  it("개별 진도를 안 쓰는 학생은 **반 전체 진도**로 범위를 낸다", async () => {
    await seedPlan();
    await prismaTestDouble.student.update({
      where: { id: STUDENT_IDS[0]! },
      data: { useIndividualProgress: false },
    });
    // 반 전체 진도를 오늘 한 줄 더 적는다 — 계획(8/21 = 둘째 수업 → MOCK_UNITS[1])과 다른 자리
    await prismaTestDouble.progress.create({
      data: {
        classId: CLASS_A_ID,
        studentId: null,
        unitId: MOCK_UNITS[5]!.id,
        recordedAt: new Date(`${DAY}T00:00:00Z`),
      },
    });
    const body = dailyReviewResponseSchema.parse(await (await get()).json());
    const group = [...body.data.auto, ...body.data.lacking].find((g) =>
      g.students.some((s) => s.id === STUDENT_IDS[0]!),
    );
    expect(group?.rangeEndUnitId).toBe(MOCK_UNITS[5]!.id);
  });

  /** 🔴 오늘 이미 만든 시험은 화면이 건너뛴다 — 새로고침이 중복 초안을 만들지 않게. */
  it("오늘 이미 만든 학생별 시험이 todayTests 에 실린다", async () => {
    await seedPlan();
    const made = await prismaTestDouble.test.create({
      data: {
        userId: "10000000-0000-4000-8000-000000000001",
        classId: CLASS_A_ID,
        studentId: STUDENT_IDS[0]!,
        testType: "review",
        rangeStartUnitId: MOCK_UNITS[0]!.id,
        rangeEndUnitId: MOCK_UNITS[3]!.id,
        status: "draft",
        modified: false,
        testDate: new Date(`${DAY}T00:00:00.000Z`),
      },
    });
    const body = dailyReviewResponseSchema.parse(await (await get()).json());
    expect(body.data.todayTests).toEqual([
      {
        studentId: STUDENT_IDS[0]!,
        testId: made.id,
        status: "draft",
        autoDraft: false,
      },
    ]);
  });

  /**
   * 🔴 D-133 ⑵ — «자동 출제» 표지의 근거는 시험지 칸(`auto_draft_run_id`) **하나**다.
   *    시각으로 짐작하지 않는다 — 8시 무렵 손으로 낸 시험지가 섞인다.
   */
  it("🔴 todayTests[].autoDraft — 아침 회차가 세운 시험지만 참, 손으로 낸 것은 거짓", async () => {
    await seedPlan();
    const run = await prismaTestDouble.autoDraftRun.create({
      data: {
        day: new Date(`${DAY}T00:00:00.000Z`),
        targets: 2,
        created: 1,
        skipped: 1,
        skips: [{ studentId: STUDENT_IDS[1]!, reason: "exam-or-unread" }],
      },
    });
    const base = {
      userId: "10000000-0000-4000-8000-000000000001",
      classId: CLASS_A_ID,
      testType: "review" as const,
      rangeStartUnitId: MOCK_UNITS[0]!.id,
      rangeEndUnitId: MOCK_UNITS[3]!.id,
      status: "draft" as const,
      modified: false,
      testDate: new Date(`${DAY}T00:00:00.000Z`),
    };
    const auto = await prismaTestDouble.test.create({
      data: { ...base, studentId: STUDENT_IDS[0]!, autoDraftRunId: run.id },
    });
    const manual = await prismaTestDouble.test.create({
      data: { ...base, studentId: STUDENT_IDS[2]! },
    });
    const body = dailyReviewResponseSchema.parse(await (await get()).json());
    const byTest = new Map(
      body.data.todayTests.map((t) => [t.testId, t.autoDraft]),
    );
    expect(byTest.get(auto.id)).toBe(true);
    expect(byTest.get(manual.id)).toBe(false);
  });

  it("같은 학생에 손 시험지가 더 늦게 섰으면 최신 한 건(손)의 표지를 싣는다", async () => {
    await seedPlan();
    const run = await prismaTestDouble.autoDraftRun.create({
      data: {
        day: new Date(`${DAY}T00:00:00.000Z`),
        targets: 0,
        created: 0,
        skipped: 0,
        skips: [],
      },
    });
    const base = {
      userId: "10000000-0000-4000-8000-000000000001",
      classId: CLASS_A_ID,
      studentId: STUDENT_IDS[0]!,
      testType: "review" as const,
      rangeStartUnitId: MOCK_UNITS[0]!.id,
      rangeEndUnitId: MOCK_UNITS[3]!.id,
      status: "draft" as const,
      modified: false,
      testDate: new Date(`${DAY}T00:00:00.000Z`),
    };
    await prismaTestDouble.test.create({
      data: { ...base, autoDraftRunId: run.id },
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const later = await prismaTestDouble.test.create({ data: base });
    const body = dailyReviewResponseSchema.parse(await (await get()).json());
    expect(body.data.todayTests).toEqual([
      {
        studentId: STUDENT_IDS[0]!,
        testId: later.id,
        status: "draft",
        autoDraft: false,
      },
    ]);
  });
});

/**
 * 🔴 **화면 트랙이 더한 칸 셋** — 메인 «오늘의 확인테스트»(D-131 · 05 §8.10).
 *
 * · `hasPlan`         소유 범위 안에 계획이 하나라도 있나 — 섹션 문지기(«계획이 있으면 누구에게나»)
 * · `delayed`         오늘 대상 중 계획보다 늦은 학생 — 칩 「N일 밀림 M명」(규칙은 planDailyReview 단위 시험)
 * · `noLessonClasses` 오늘 대상이 한 명도 없는 소유 범위의 반 — 「오늘 수업 계획이 없습니다.」
 */
describe("[D-131] GET /api/tests/daily-review — 계획 유무 · 밀림 · 오늘 수업 없는 반", () => {
  beforeEach(async () => {
    resetPrismaTestDouble();
    await seed();
    process.env.EYWA_SYNC_OWNER_EMAIL = "teacher@todaysmath.test";
  });

  /** 반 A 금요일 계획 — 6/5(금) 시작. 박지호(개별 U5@7/20)는 7/10 몫을 7/20 에 → 10일 밀림. */
  const seedEarlyPlan = (over: Record<string, unknown> = {}) =>
    prismaTestDouble.progressPlan.create({
      data: {
        classId: CLASS_A_ID,
        studentId: null,
        weekdays: [5],
        unitsPerLesson: 1,
        startUnitId: MOCK_UNITS[0]!.id,
        startDate: new Date("2026-06-05T00:00:00Z"),
        active: true,
        ...over,
      },
    });

  it("계획이 없으면 hasPlan 거짓 · delayed 빈 배열", async () => {
    const body = dailyReviewResponseSchema.parse(await (await get()).json());
    expect(body.data.hasPlan).toBe(false);
    expect(body.data.delayed).toEqual([]);
  });

  it("🔴 소유 범위 안에 계획이 있으면 hasPlan 참 — eywa 소유자가 아니어도(섹션 문지기)", async () => {
    await seedEarlyPlan();
    process.env.EYWA_SYNC_OWNER_EMAIL = "someone-else@todaysmath.test";
    const body = dailyReviewResponseSchema.parse(await (await get()).json());
    expect(body.data.eywaOwner).toBe(false);
    expect(body.data.hasPlan).toBe(true);
  });

  it("꺼 둔 계획도 계획이다 — hasPlan 참(섹션은 선다)", async () => {
    await seedEarlyPlan({ active: false });
    process.env.EYWA_SYNC_OWNER_EMAIL = "someone-else@todaysmath.test";
    const body = dailyReviewResponseSchema.parse(await (await get()).json());
    expect(body.data.hasPlan).toBe(true);
  });

  it("🔴 남의 반 계획은 hasPlan 을 켜지 않는다 — 관리자가 아니면", async () => {
    await seedEarlyPlan({ classId: CLASS_OTHER_ID });
    const body = dailyReviewResponseSchema.parse(await (await get()).json());
    expect(body.data.hasPlan).toBe(false);
  });

  it("밀린 오늘의 대상이 days 와 함께 실린다 — 시험기간 학생은 빠진다", async () => {
    await seedEarlyPlan();
    const body = dailyReviewResponseSchema.parse(await (await get()).json());
    expect(body.data.delayed.map((s) => [s.id, s.days])).toEqual([
      [STUDENT_IDS[2]!, 10],
    ]);
    expect(body.data.examOrUnread.map((s) => s.id)).toContain(STUDENT_IDS[1]!);
  });

  it("🔴 오늘 대상이 한 명도 없는 소유 범위의 반만 noLessonClasses — 남의 반은 없다", async () => {
    await seedEarlyPlan();
    const body = dailyReviewResponseSchema.parse(await (await get()).json());
    const owned = MOCK_CLASSES.filter((c) => c.id !== CLASS_A_ID);
    expect(body.data.noLessonClasses.map((c) => c.id).sort()).toEqual(
      owned.map((c) => c.id).sort(),
    );
    expect(body.data.noLessonClasses.map((c) => c.id)).not.toContain(
      CLASS_OTHER_ID,
    );
    const b = body.data.noLessonClasses.find((c) => c.id === owned[0]!.id)!;
    expect(b).toEqual({
      id: owned[0]!.id,
      name: owned[0]!.name,
      grade: owned[0]!.grade,
    });
  });

  it("계획이 있어도 오늘 수업이 아니면 그 반은 noLessonClasses — 대상이 있는 반은 없다", async () => {
    // 반 B 월요일 계획 — 2026-08-21 은 금요일. 반 A 는 eywa 보고서로 오늘 대상이 있다.
    await seedEarlyPlan({ classId: CLASS_B_ID, weekdays: [1] });
    const body = dailyReviewResponseSchema.parse(await (await get()).json());
    expect(body.data.hasPlan).toBe(true);
    const ids = body.data.noLessonClasses.map((c) => c.id);
    expect(ids).toContain(CLASS_B_ID);
    expect(ids).not.toContain(CLASS_A_ID);
  });
});

describe("[D-132] GET /api/tests/daily-review — 학생 줄의 담당(관리자에게만)", () => {
  beforeEach(async () => {
    resetPrismaTestDouble();
    await seed();
    process.env.EYWA_SYNC_OWNER_EMAIL = "teacher@todaysmath.test";
  });

  const asViewer = (id: string, isAdmin: boolean) =>
    vi.mocked(getSessionUser).mockResolvedValueOnce({
      id,
      email: "teacher@todaysmath.test",
      name: "테스트 강사",
      isAdmin,
    });

  it("🔴 관리자가 아니면 넓히기 전과 같다 — classOwner 키가 없다", async () => {
    asViewer(USER_TEACHER_ID, false);
    const text = await (await get()).text();
    dailyReviewResponseSchema.parse(JSON.parse(text));
    expect(text).not.toContain('"classOwner"');
  });

  it("관리자면 시험기간 줄 · 부족 묶음 학생에 반의 담당 — 자기 반은 mine", async () => {
    asViewer(USER_TEACHER_ID, true);
    const body = dailyReviewResponseSchema.parse(await (await get()).json());
    const mine = { name: MOCK_TEACHER.name, mine: true };
    expect(body.data.examOrUnread[0]!.classOwner).toEqual(mine);
    expect(body.data.lacking[0]!.students[0]!.classOwner).toEqual(mine);
  });

  it("관리자가 남의 반 학생을 보면 담당 계정 이름 · mine 거짓", async () => {
    asViewer(USER_OTHER_ID, true);
    const body = dailyReviewResponseSchema.parse(await (await get()).json());
    expect(body.data.examOrUnread[0]!.classOwner).toEqual({
      name: MOCK_TEACHER.name,
      mine: false,
    });
  });
});
