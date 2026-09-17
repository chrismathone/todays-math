/**
 * 🔴 RED → 🟢 — 관리자는 학원 운영 데이터를 전부 본다·고친다, 개인 작업물은 아니다 (D-130).
 *
 * 헬퍼: src/lib/ownerScope.ts (판정 한 곳 — 단위 시험은 unit/ownerScope.test.ts)
 * 브리프: docs/planning/tracks/briefs/admin-sees-all.md §4
 *
 * ## 짝으로 둔다 — 같은 픽스처 · 같은 뷰어 · **관리자 표시 하나만** 다르다
 *
 * 역할 계정(`USER_OTHER_ID` = 공유 DB 의 test_t 자리)이 반·학생·진도·계획·시험지를 가진다.
 * 들어오는 계정(`VIEWER`)은 **반이 0개**다 — 공유 DB 의 원장님 계정(st2000423@gmail.com)과 같은 모양.
 * 같은 요청을 `isAdmin: false` 와 `isAdmin: true` 로 나란히 보낸다.
 *
 *   · 관리자 아님 — **넓히기 전과 같다.** 남의 반은 403, 목록에는 안 나온다(2026-09-07 재판 막기).
 *   · 관리자     — 전부 보이고 고칠 수 있다.
 *
 * «관리자면 넓힌다»만 보면 «항상 넓힌다»가 초록이고, 반대만 보면 «항상 좁힌다»가 초록이다.
 * 변이 하네스 `scripts/qa/mutate-admin-scope.ts` 가 두 방향을 다 뒤집어 본다.
 *
 * ## 개인 작업물은 짝이 **같은 답**을 내야 한다 (D-130 ⑶)
 *
 * 장바구니 · 예측 회차 — 관리자여도 남의 것은 안 보이고, 장바구니에서 남의 반으로 시험지를
 * 만드는 길도 지금 그대로 막혀 있다(브리프 §3 «개인 작업물 라우트는 건드리지 마라»).
 * (작업실 문서·자료는 `privateAccounts.test.ts` 가 같은 짝을 둔다 — 그 파일의 db 모킹이 다르다.)
 */
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sessionState = vi.hoisted(() => ({
  user: null as {
    id: string;
    email: string;
    name: string;
    isAdmin: boolean;
  } | null,
}));
vi.mock("@/lib/session", () => ({
  getSessionUser: vi.fn(async () => sessionState.user),
}));

import { GET as getBasket, POST as addToBasket } from "@/app/api/basket/route";
import { POST as makeTestFromBasket } from "@/app/api/basket/test/route";
import {
  GET as listClasses,
  POST as createClass,
} from "@/app/api/classes/route";
import {
  DELETE as deleteClass,
  GET as getClass,
  PATCH as patchClass,
} from "@/app/api/classes/[id]/route";
import { GET as getMetrics } from "@/app/api/metrics/route";
import { GET as getPredictionRun } from "@/app/api/predictions/[id]/route";
import { POST as advanceProgress } from "@/app/api/progress/advance/route";
import {
  GET as getProgress,
  POST as recordProgress,
} from "@/app/api/progress/route";
import { GET as suggestProgress } from "@/app/api/progress/suggest/route";
import {
  GET as listStudents,
  POST as createStudent,
} from "@/app/api/students/route";
import {
  DELETE as deleteStudent,
  PATCH as patchStudent,
} from "@/app/api/students/[id]/route";
import { GET as autoDraftCron } from "@/app/api/tests/auto-draft/cron/route";
import { GET as dailyReview } from "@/app/api/tests/daily-review/route";
import { GET as defaultRange } from "@/app/api/tests/default-range/route";
import { POST as generateTest } from "@/app/api/tests/generate/route";
import { GET as listTests } from "@/app/api/tests/route";
import { POST as confirmTest } from "@/app/api/tests/[id]/confirm/route";
import { POST as printTest } from "@/app/api/tests/[id]/print/route";
import { PUT as replaceProblem } from "@/app/api/tests/[id]/problems/[seq]/route";
import { GET as listResults } from "@/app/api/tests/[id]/results/route";
import { GET as getTest } from "@/app/api/tests/[id]/route";
import {
  GET as gradeSheet,
  POST as saveGrades,
} from "@/app/api/tests/[id]/grade/route";
import { POST as submitResult } from "@/app/api/tests/[id]/submit/route";

import { autoDraftRunResponseSchema } from "@/contracts/dailyAutoTest.contract";
import {
  classListResponseSchema,
  studentListResponseSchema,
} from "@/contracts/class.contract";
import {
  dailyReviewResponseSchema,
  defaultReviewRangeResponseSchema,
  testListResponseSchema,
} from "@/contracts/test.contract";
import { metricsResponseSchema } from "@/contracts/metrics.contract";
import { findEligibleProblems } from "@/lib/findEligibleProblems";
import {
  CLASS_A_ID,
  CLASS_OTHER_ID,
  MOCK_CLASS_A,
  MOCK_CURRENT_PROGRESS_UNIT,
  MOCK_PROGRESS_CLASS_A,
  MOCK_TEST_PROBLEMS_BY_TEST_ID,
  MOCK_UNITS,
  TEST_DRAFT_ID,
  TEST_RESULT_PROBLEM_ESSAY_ID,
  TEST_RESULT_PROBLEM_OBJECTIVE_CORRECT_ID,
  TEST_RESULT_PROBLEM_OBJECTIVE_WRONG_ID,
  USER_OTHER_ID,
} from "@/mocks/data";
import {
  prismaTestDouble as db,
  resetPrismaTestDouble,
  seedPredictionRuns,
  seedUsers,
} from "@/mocks/prismaTestDouble";

/** 들어오는 계정 — 반이 0개인 원장 계정(공유 DB 의 원장님 계정 모양). */
const VIEWER = {
  id: "10000000-0000-4000-8000-0000000000ad",
  email: "director@todaysmath.test",
  name: "원장",
};
/** 역할 계정(test_t 자리) — `CLASS_OTHER_ID` 의 소유자. */
const ROLE_OWNER = USER_OTHER_ID;

const CASES = [
  { who: "관리자 아님", isAdmin: false },
  { who: "관리자", isAdmin: true },
] as const;

/** 2026-08-21 은 금요일 — 계획의 수업 요일이 이 날을 겨눈다. */
const FRIDAY = "2026-08-21";

function req(url: string, method = "GET", body?: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers:
      body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const withId = (id: string) => ({ params: Promise.resolve({ id }) });

interface RoleFixture {
  studentId: string;
  draftId: string;
  confirmedId: string;
  givenReviewId: string;
  printedId: string;
}

/**
 * 역할 계정의 학원 한 벌 — 반 A 와 같은 설정·같은 진도 이력을 반 `CLASS_OTHER` 에 깐다
 * (출제가 **실제로 서야** «관리자는 된다»가 참인지 볼 수 있다).
 */
async function seedRoleAcademy(): Promise<RoleFixture> {
  await db.class.update({
    where: { id: CLASS_OTHER_ID },
    data: {
      defaultProblemCount: MOCK_CLASS_A.defaultProblemCount,
      difficultyRatio: MOCK_CLASS_A.difficultyRatio,
    },
  });
  const student = await db.student.create({
    data: {
      classId: CLASS_OTHER_ID,
      name: "역할반학생",
      schoolLevel: null,
      schoolGrade: null,
      eywaStudentId: null,
      eywaWithdrawnAt: null,
      eywaLastReportDate: null,
      eywaLastReportText: null,
    },
  });
  // 반 진도 413 → 416 — 반 A 와 같은 이력(현재 진도 416, 2026-08-01)
  for (const row of MOCK_PROGRESS_CLASS_A)
    await db.progress.create({
      data: {
        classId: CLASS_OTHER_ID,
        studentId: null,
        unitId: row.unitId,
        recordedAt: new Date(`${row.recordedAt}T00:00:00Z`),
      },
    });

  const draft = await db.test.create({
    data: {
      userId: ROLE_OWNER,
      classId: CLASS_OTHER_ID,
      testType: "daily",
      rangeEndUnitId: MOCK_CURRENT_PROGRESS_UNIT.id,
      status: "draft",
      testDate: new Date("2026-08-13T00:00:00Z"),
    },
  });
  for (const item of MOCK_TEST_PROBLEMS_BY_TEST_ID[TEST_DRAFT_ID]!)
    await db.testProblem.create({
      data: {
        testId: draft.id,
        problemId: item.problemId,
        orderIndex: item.orderIndex,
        replaced: false,
      },
    });

  // 확정 시험지 — 채점 픽스처의 세 문항(인쇄·채점·결과 목록)
  const confirmed = await db.test.create({
    data: {
      userId: ROLE_OWNER,
      classId: CLASS_OTHER_ID,
      testType: "daily",
      rangeEndUnitId: MOCK_CURRENT_PROGRESS_UNIT.id,
      status: "confirmed",
      testDate: new Date("2026-08-13T00:00:00Z"),
    },
  });
  for (const [i, problemId] of [
    TEST_RESULT_PROBLEM_OBJECTIVE_CORRECT_ID,
    TEST_RESULT_PROBLEM_OBJECTIVE_WRONG_ID,
    TEST_RESULT_PROBLEM_ESSAY_ID,
  ].entries())
    await db.testProblem.create({
      data: {
        testId: confirmed.id,
        problemId,
        orderIndex: i + 1,
        replaced: false,
      },
    });

  // 실제로 낸 확인테스트 — 끝이 414. 기본 범위의 시작이 «그 다음»(415)이 되는지로
  // 시험지 조회가 넓혀졌는지를 가른다(반 소유만 넓히고 시험지를 안 넓히면 413 부터다).
  const givenReview = await db.test.create({
    data: {
      userId: ROLE_OWNER,
      classId: CLASS_OTHER_ID,
      testType: "review",
      rangeStartUnitId: MOCK_UNITS[0]!.id,
      rangeEndUnitId: MOCK_UNITS[1]!.id,
      status: "printed",
      testDate: new Date("2026-07-01T00:00:00Z"),
      printedAt: new Date("2026-07-01T09:00:00Z"),
    },
  });

  // 인쇄 지표 창(2026-08-10 주) 안에 인쇄된 시험지
  const printed = await db.test.create({
    data: {
      userId: ROLE_OWNER,
      classId: CLASS_OTHER_ID,
      testType: "daily",
      rangeEndUnitId: MOCK_CURRENT_PROGRESS_UNIT.id,
      status: "printed",
      testDate: new Date("2026-08-12T00:00:00Z"),
      printedAt: new Date("2026-08-12T01:00:00Z"),
    },
  });

  // 진도 계획 — 반 계획 한 줄, 금요일 수업(D-129)
  await db.progressPlan.create({
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

  return {
    studentId: student.id,
    draftId: draft.id,
    confirmedId: confirmed.id,
    givenReviewId: givenReview.id,
    printedId: printed.id,
  };
}

let role: RoleFixture;

beforeEach(async () => {
  resetPrismaTestDouble();
  role = await seedRoleAcademy();
  // eywa 갈래는 이 결정과 무관하다(D-130 ⑸) — 꺼 두어 계획 갈래만 보이게 한다
  delete process.env.EYWA_SYNC_OWNER_EMAIL;
});
afterEach(() => {
  sessionState.user = null;
});

describe.each(CASES)("D-130 읽기 — $who", ({ isAdmin }) => {
  beforeEach(() => {
    sessionState.user = { ...VIEWER, isAdmin };
  });

  it("반 목록", async () => {
    const res = await listClasses(req("/api/classes?pageSize=100"));
    expect(res.status).toBe(200);
    const body = classListResponseSchema.parse(await res.json());
    const ids = body.data.map((c) => c.id);
    if (isAdmin) {
      expect(ids).toContain(CLASS_OTHER_ID);
      expect(ids).toContain(CLASS_A_ID);
      expect(body.meta.total).toBe(ids.length);
    } else {
      // 반이 0개인 계정 — 남의 반이 하나도 안 섞인다
      expect(ids).toEqual([]);
      expect(body.meta.total).toBe(0);
    }
  });

  it("반 단건", async () => {
    const res = await getClass(
      req(`/api/classes/${CLASS_OTHER_ID}`),
      withId(CLASS_OTHER_ID),
    );
    expect(res.status).toBe(isAdmin ? 200 : 403);
  });

  it("학생 목록", async () => {
    const res = await listStudents(
      req(`/api/students?classId=${CLASS_OTHER_ID}`),
    );
    expect(res.status).toBe(isAdmin ? 200 : 403);
    if (isAdmin) {
      const body = studentListResponseSchema.parse(await res.json());
      expect(body.data.map((s) => s.id)).toEqual([role.studentId]);
    }
  });

  it("현재 진도 · 시작점 제안", async () => {
    const current = await getProgress(
      req(`/api/progress?classId=${CLASS_OTHER_ID}`),
    );
    expect(current.status).toBe(isAdmin ? 200 : 403);
    const suggest = await suggestProgress(
      req(`/api/progress/suggest?classId=${CLASS_OTHER_ID}`),
    );
    expect(suggest.status).toBe(isAdmin ? 200 : 403);
  });

  it("시험지 목록", async () => {
    const res = await listTests(req("/api/tests?pageSize=100"));
    expect(res.status).toBe(200);
    const ids = testListResponseSchema
      .parse(await res.json())
      .data.map((t) => t.id);
    if (isAdmin) expect(ids).toContain(role.draftId);
    else expect(ids).toEqual([]);
  });

  it("시험지 단건 · 결과 목록", async () => {
    const one = await getTest(
      req(`/api/tests/${role.draftId}`),
      withId(role.draftId),
    );
    expect(one.status).toBe(isAdmin ? 200 : 403);
    const results = await listResults(
      req(`/api/tests/${role.confirmedId}/results`),
      withId(role.confirmedId),
    );
    expect(results.status).toBe(isAdmin ? 200 : 403);
  });

  it("기본 범위 — 남의 반 시험지까지 «직전 확인테스트»로 센다", async () => {
    const res = await defaultRange(
      req(`/api/tests/default-range?classId=${CLASS_OTHER_ID}`),
    );
    expect(res.status).toBe(isAdmin ? 200 : 403);
    if (isAdmin) {
      const body = defaultReviewRangeResponseSchema.parse(await res.json());
      expect(body.data).toMatchObject({
        startedFrom: "last-review",
        rangeStartUnitId: MOCK_UNITS[2]!.id, // 직전 확인(끝 414)의 다음
        rangeEndUnitId: MOCK_CURRENT_PROGRESS_UNIT.id,
      });
    }
  });

  it("「오늘의 확인테스트」 — 계획 갈래에 남의 반 학생", async () => {
    const res = await dailyReview(req(`/api/tests/daily-review?day=${FRIDAY}`));
    expect(res.status).toBe(200);
    const body = dailyReviewResponseSchema.parse(await res.json());
    const listed = [...body.data.auto, ...body.data.lacking].flatMap((g) =>
      g.students.map((s) => s.id),
    );
    if (isAdmin) {
      expect(listed).toContain(role.studentId);
      expect(body.data.attended).toBeGreaterThan(0);
    } else {
      expect(listed).toEqual([]);
      expect(body.data.attended).toBe(0);
    }
    // eywa 갈래는 관리자라도 그대로다(isEywaOwner — D-130 ⑸)
    expect(body.data.eywaOwner).toBe(false);
    expect(body.data.sync).toBeNull();
  });

  it("주간 지표 — 남의 반에서 인쇄한 시험지", async () => {
    const res = await getMetrics(req("/api/metrics?weekStart=2026-08-10"));
    expect(res.status).toBe(200);
    const body = metricsResponseSchema.parse(await res.json());
    // 창은 KST 2026-08-10 ~ 08-16 — 모든 계정이 그 창에 인쇄한 시험지 수
    const everyone = await db.test.count({
      where: {
        status: "printed",
        printedAt: {
          gte: new Date("2026-08-09T15:00:00Z"),
          lt: new Date("2026-08-16T15:00:00Z"),
        },
      },
    });
    const roleOnes = await db.test.count({
      where: {
        userId: ROLE_OWNER,
        status: "printed",
        printedAt: {
          gte: new Date("2026-08-09T15:00:00Z"),
          lt: new Date("2026-08-16T15:00:00Z"),
        },
      },
    });
    expect(roleOnes).toBe(1); // 픽스처가 겨누는 것이 창 안에 있다(자가 눈멂 막기)
    expect(body.data.printedCount).toBe(isAdmin ? everyone : 0);
  });
});

describe.each(CASES)("D-130 쓰기 — $who", ({ isAdmin }) => {
  beforeEach(() => {
    sessionState.user = { ...VIEWER, isAdmin };
  });

  it("남의 반에 진도를 기록한다 · 1클릭 진행", async () => {
    const recorded = await recordProgress(
      req("/api/progress", "POST", {
        classId: CLASS_OTHER_ID,
        unitId: MOCK_UNITS[4]!.id,
        recordedAt: "2026-08-20",
      }),
    );
    expect(recorded.status).toBe(isAdmin ? 201 : 403);
    const advanced = await advanceProgress(
      req("/api/progress/advance", "POST", { classId: CLASS_OTHER_ID }),
    );
    expect(advanced.status).toBe(isAdmin ? 201 : 403);

    const rows = await db.progress.findMany({
      where: { classId: CLASS_OTHER_ID },
    });
    // 관리자 아님: 한 줄도 안 늘었다(반 진도 넷 그대로)
    expect(rows).toHaveLength(isAdmin ? 6 : 4);
  });

  it("남의 반에 학생을 넣고 고치고 지운다", async () => {
    const created = await createStudent(
      req("/api/students", "POST", { classId: CLASS_OTHER_ID, name: "새학생" }),
    );
    expect(created.status).toBe(isAdmin ? 201 : 403);
    const patched = await patchStudent(
      req(`/api/students/${role.studentId}`, "PATCH", { name: "고친이름" }),
      withId(role.studentId),
    );
    expect(patched.status).toBe(isAdmin ? 200 : 403);
    const removed = await deleteStudent(
      req(`/api/students/${role.studentId}`, "DELETE"),
      withId(role.studentId),
    );
    expect(removed.status).toBe(isAdmin ? 200 : 403);
  });

  it("남의 반 설정을 고치고 지운다", async () => {
    const patched = await patchClass(
      req(`/api/classes/${CLASS_OTHER_ID}`, "PATCH", { name: "고친반" }),
      withId(CLASS_OTHER_ID),
    );
    expect(patched.status).toBe(isAdmin ? 200 : 403);
    const removed = await deleteClass(
      req(`/api/classes/${CLASS_OTHER_ID}`, "DELETE"),
      withId(CLASS_OTHER_ID),
    );
    expect(removed.status).toBe(isAdmin ? 200 : 403);
    expect(
      await db.class.findUnique({ where: { id: CLASS_OTHER_ID } }),
    ).toEqual(isAdmin ? null : expect.objectContaining({ id: CLASS_OTHER_ID }));
  });

  it("🔴 반을 만들면 **만든 계정의 반**이다 — 넓히기가 소유를 옮기지 않는다(D-130 ⑴)", async () => {
    const res = await createClass(
      req("/api/classes", "POST", { name: "새반", grade: "중2" }),
    );
    expect(res.status).toBe(201);
    const { data } = (await res.json()) as { data: { userId: string } };
    expect(data.userId).toBe(VIEWER.id);
  });

  it("남의 반에 출제한다 — 🔴 시험지 소유자는 **반의 소유자**다(역할 계정 화면에서도 보인다)", async () => {
    const res = await generateTest(
      req("/api/tests/generate", "POST", {
        classId: CLASS_OTHER_ID,
        testType: "daily",
        testDate: "2026-08-13",
      }),
    );
    expect(res.status).toBe(isAdmin ? 201 : 403);
    if (isAdmin) {
      const { data } = (await res.json()) as {
        data: { test: { id: string; userId: string } };
      };
      expect(data.test.userId).toBe(ROLE_OWNER);
    } else {
      // 한 장도 안 생겼다
      expect(await db.test.count({ where: { classId: CLASS_OTHER_ID } })).toBe(
        4,
      );
    }
  });

  /**
   * D-20(최근 14일 중복 제외)의 열쇠는 **시험지 소유자**다. 관리자가 남의 반에 낼 때 관리자
   * 자신의 최근 출제로 거르면, 그 반이 어제 낸 문항이 오늘 또 나간다.
   * 반 소유자가 어제 이 단원의 출제 가능 문항을 **전부** 냈다 → 오늘은 낼 게 없어야 한다.
   */
  it("🔴 남의 반 출제의 최근 중복 제외는 그 반 소유자 기준이다", async () => {
    if (!isAdmin) return; // 관리자 아님은 403 에서 끝난다(위 시험)
    const pool = await findEligibleProblems({
      unitIds: [MOCK_CURRENT_PROGRESS_UNIT.id],
    });
    expect(pool.length).toBeGreaterThan(0);
    const yesterday = await db.test.create({
      data: {
        userId: ROLE_OWNER,
        classId: CLASS_OTHER_ID,
        testType: "daily",
        rangeEndUnitId: MOCK_CURRENT_PROGRESS_UNIT.id,
        status: "printed",
        testDate: new Date("2026-08-19T00:00:00Z"),
        printedAt: new Date("2026-08-19T09:00:00Z"),
      },
    });
    for (const [i, p] of pool.entries())
      await db.testProblem.create({
        data: {
          testId: yesterday.id,
          problemId: p.id,
          orderIndex: i + 1,
          replaced: false,
        },
      });

    const res = await generateTest(
      req("/api/tests/generate", "POST", {
        classId: CLASS_OTHER_ID,
        testType: "daily",
        testDate: "2026-08-20",
      }),
    );
    expect(res.status).toBe(422);
  });

  /** 문항 교체도 D-20 을 지킨다 — 열쇠는 시험지 소유자다(관리자 자신이 아니다). */
  it("🔴 남의 시험지 문항 교체의 최근 중복 제외는 그 시험지 소유자 기준이다", async () => {
    if (!isAdmin) return; // 관리자 아님은 403 에서 끝난다(아래 시험)
    const [first] = MOCK_TEST_PROBLEMS_BY_TEST_ID[TEST_DRAFT_ID]!;
    const target = await db.problem.findUnique({
      where: { id: first!.problemId },
    });
    expect(target).not.toBeNull();
    // 교체 후보(같은 단원 · 전 난이도)를 소유자가 어제 **전부** 냈다 → 바꿀 것이 없어야 한다
    const candidates = await findEligibleProblems({
      unitIds: [target!.unitId],
    });
    expect(candidates.length).toBeGreaterThan(1);
    const yesterday = await db.test.create({
      data: {
        userId: ROLE_OWNER,
        classId: CLASS_OTHER_ID,
        testType: "daily",
        rangeEndUnitId: target!.unitId,
        status: "printed",
        testDate: new Date("2026-08-12T00:00:00Z"),
        printedAt: new Date("2026-08-12T09:00:00Z"),
      },
    });
    for (const [i, p] of candidates.entries())
      await db.testProblem.create({
        data: {
          testId: yesterday.id,
          problemId: p.id,
          orderIndex: i + 1,
          replaced: false,
        },
      });

    const res = await replaceProblem(
      req(`/api/tests/${role.draftId}/problems/1`, "PUT"),
      { params: Promise.resolve({ id: role.draftId, seq: "1" }) },
    );
    expect(res.status).toBe(422);
  });

  it("남의 시험지 문항을 바꾸고 확정하고 인쇄한다", async () => {
    const replaced = await replaceProblem(
      req(`/api/tests/${role.draftId}/problems/1`, "PUT"),
      { params: Promise.resolve({ id: role.draftId, seq: "1" }) },
    );
    expect(replaced.status).toBe(isAdmin ? 200 : 403);
    const confirmed = await confirmTest(
      req(`/api/tests/${role.draftId}/confirm`, "POST"),
      withId(role.draftId),
    );
    expect(confirmed.status).toBe(isAdmin ? 200 : 403);
    const printed = await printTest(
      req(`/api/tests/${role.confirmedId}/print`, "POST"),
      withId(role.confirmedId),
    );
    expect(printed.status).toBe(isAdmin ? 200 : 403);

    const after = await db.test.findUnique({ where: { id: role.confirmedId } });
    expect(after?.status).toBe(isAdmin ? "printed" : "confirmed");
  });

  it("남의 반 학생의 채점을 넣는다", async () => {
    const res = await submitResult(
      req(`/api/tests/${role.confirmedId}/submit`, "POST", {
        studentId: role.studentId,
        answers: [
          {
            problemId: TEST_RESULT_PROBLEM_OBJECTIVE_CORRECT_ID,
            selectedChoice: 2,
            essayScore: null,
            sequence: 1,
          },
          {
            problemId: TEST_RESULT_PROBLEM_OBJECTIVE_WRONG_ID,
            selectedChoice: 1,
            essayScore: null,
            sequence: 2,
          },
          {
            problemId: TEST_RESULT_PROBLEM_ESSAY_ID,
            selectedChoice: null,
            essayScore: 75,
            sequence: 3,
          },
        ],
      }),
      withId(role.confirmedId),
    );
    expect(res.status).toBe(isAdmin ? 201 : 403);
  });

  /**
   * 🔴 **채점 입력(A안)도 같은 울타리를 쓴다** — D-134 트랙 1 브리프 §1.2 «소유 범위는
   * `ownerScope.ts` 하나만 묻는다». 라우트가 `isAdmin` 을 새로 읽으면 이 짝이 한쪽만 초록이 된다.
   */
  it("남의 반 시험지의 채점표를 연다", async () => {
    const res = await gradeSheet(
      req(`/api/tests/${role.confirmedId}/grade`, "GET"),
      withId(role.confirmedId),
    );
    expect(res.status).toBe(isAdmin ? 200 : 403);
  });

  it("남의 반 시험지를 «틀린 번호만»으로 채점한다", async () => {
    const res = await saveGrades(
      req(`/api/tests/${role.confirmedId}/grade`, "POST", {
        entries: [
          {
            studentId: role.studentId,
            absent: false,
            wrongProblemIds: [TEST_RESULT_PROBLEM_OBJECTIVE_WRONG_ID],
          },
        ],
      }),
      withId(role.confirmedId),
    );
    expect(res.status).toBe(isAdmin ? 201 : 403);

    // 🔴 **막혔으면 행도 없어야 한다** — 403 을 내면서 쓰고 나가면 아무도 모른다.
    const rows = await db.testResult.findMany({
      where: { testId: role.confirmedId },
    });
    expect(rows.length).toBe(isAdmin ? 1 : 0);
  });
});

describe.each(CASES)(
  "D-130 ⑸ 아침 8시 자동 초안 — 소유자가 $who",
  ({ isAdmin }) => {
    const SECRET = "cron-secret-for-admin-scope";
    beforeEach(() => {
      seedUsers([{ ...VIEWER, isAdmin, deletedAt: null }]);
      process.env.CRON_SECRET = SECRET;
      process.env.AUTO_DRAFT_OWNER_EMAIL = VIEWER.email;
    });
    afterEach(() => {
      delete process.env.CRON_SECRET;
      delete process.env.AUTO_DRAFT_OWNER_EMAIL;
    });

    it(
      isAdmin
        ? "전 반을 돈다 — 시험지는 그 반 소유자 것"
        : "자기 반만 돈다 — 반이 0개면 0건",
      async () => {
        const res = await autoDraftCron(
          new NextRequest(
            `http://localhost/api/tests/auto-draft/cron?day=${FRIDAY}`,
            { headers: { authorization: `Bearer ${SECRET}` } },
          ),
        );
        expect(res.status).toBe(200);
        const body = autoDraftRunResponseSchema.parse(await res.json());
        const made = (await db.test.findMany({
          where: { testDate: new Date(`${FRIDAY}T00:00:00.000Z`) },
        })) as { classId: string; studentId: string | null; userId: string }[];

        if (isAdmin) {
          expect(body.data.created).toBeGreaterThan(0);
          const roleMade = made.filter((t) => t.classId === CLASS_OTHER_ID);
          expect(roleMade.map((t) => t.studentId)).toEqual([role.studentId]);
          expect(roleMade.every((t) => t.userId === ROLE_OWNER)).toBe(true);
        } else {
          expect(body.data.targets).toBe(0);
          expect(body.data.created).toBe(0);
          expect(made).toEqual([]);
        }
      },
    );
  },
);

describe.each(CASES)(
  "D-130 ⑶ 개인 작업물은 넘지 않는다 — $who",
  ({ isAdmin }) => {
    beforeEach(() => {
      sessionState.user = { ...VIEWER, isAdmin };
    });

    it("장바구니 — 남의 바구니는 안 보이고, 내 바구니로 남의 반 시험지를 못 만든다", async () => {
      // 역할 계정의 바구니에 한 문항
      await db.basketItem.upsert({
        where: {
          userId_problemId: {
            userId: ROLE_OWNER,
            problemId: TEST_RESULT_PROBLEM_OBJECTIVE_CORRECT_ID,
          },
        },
        create: {
          userId: ROLE_OWNER,
          problemId: TEST_RESULT_PROBLEM_OBJECTIVE_CORRECT_ID,
          orderIndex: 1,
        },
        update: {},
      });

      const mine = await getBasket();
      expect(mine.status).toBe(200);
      expect(JSON.stringify(await mine.json())).not.toContain(
        TEST_RESULT_PROBLEM_OBJECTIVE_CORRECT_ID,
      );

      const pool = await findEligibleProblems({
        unitIds: [MOCK_CURRENT_PROGRESS_UNIT.id],
      });
      const added = await addToBasket(
        req("/api/basket", "POST", { problemId: pool[0]!.id }),
      );
      expect(added.status).toBe(200);

      const made = await makeTestFromBasket(
        req("/api/basket/test", "POST", {
          classId: CLASS_OTHER_ID,
          testDate: "2026-08-20",
        }),
      );
      expect(made.status).toBe(403);
      expect(
        await db.test.count({
          where: {
            classId: CLASS_OTHER_ID,
            testDate: new Date("2026-08-20T00:00:00Z"),
          },
        }),
      ).toBe(0);
      // 역할 계정의 바구니는 그대로
      expect(await db.basketItem.count({ where: { userId: ROLE_OWNER } })).toBe(
        1,
      );
    });

    it("예측 회차 — 남의 회차는 403", async () => {
      const RUN_ID = "7a000000-0000-4000-8000-000000000001";
      seedPredictionRuns([
        {
          id: RUN_ID,
          userId: ROLE_OWNER,
          createdAt: new Date("2026-08-01T00:00:00Z"),
          engineVersion: "v0",
          school: "가람중",
          level: "중",
          grade: 2,
          subject: "중2",
          targetYear: 2026,
          targetSemester: 2,
          targetRound: "중간",
          cutoffYear: 2026,
          cutoffSemester: 1,
          cutoffRound: "기말",
          inputExamIds: [],
          params: {},
          predictedBlueprint: null,
          predictedScores: {},
          actualSchoolMean: null,
          actualSchoolStdev: null,
          actualRecordedAt: null,
        },
      ]);
      const res = await getPredictionRun(
        req(`/api/predictions/${RUN_ID}`),
        withId(RUN_ID),
      );
      expect(res.status).toBe(403);
    });
  },
);
