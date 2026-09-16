/**
 * 🔴 RED → 🟢 — GET /api/tests/auto-draft/cron (아침 8시 자동 초안, D-129 ⑶⑷).
 *
 * 구현: src/app/api/tests/auto-draft/cron/route.ts · src/lib/tests/runAutoDraft.ts
 * 계약: src/contracts/dailyAutoTest.contract.ts
 * 브리프: docs/planning/tracks/briefs/daily-auto-test-backend.md §2 ③
 *
 * 여기서 보는 것은 **배선**이다(규칙은 progressPlan·planDailyReview 단위 시험이 잠근다):
 * 문지기 없는 호출을 거부하나 · 소유자를 못 찾으면 **조용히 0건이 아니라 오류**인가 ·
 * 계획이 있는 학생에게 초안이 서나 · 같은 날 두 번 돌려도 하나인가 · 문항이 모자라면
 * 만들지 않고 **기록만** 남기나 · 🔴 **확정·인쇄를 절대 안 부르나**.
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { GET as autoDraftCron } from "@/app/api/tests/auto-draft/cron/route";
import { autoDraftRunResponseSchema } from "@/contracts/dailyAutoTest.contract";
import {
  CLASS_A_ID,
  CLASS_OTHER_ID,
  CLASS_STARVED_ID,
  MOCK_EMPTY_PROBLEM_UNIT,
  MOCK_TEACHER,
  MOCK_UNITS,
  STUDENT_IDS,
} from "@/mocks/data";
import {
  prismaTestDouble,
  resetPrismaTestDouble,
} from "@/mocks/prismaTestDouble";

interface MadeTest {
  classId: string;
  studentId: string | null;
  userId: string;
  testType: string;
  status: string;
  printedAt: Date | null;
}

/** 그날 만들어진 시험지 — 가짜 Prisma 는 `unknown[]` 을 준다(select 투영 때문에). */
async function madeOn(day: string): Promise<MadeTest[]> {
  return (await prismaTestDouble.test.findMany({
    where: { testDate: new Date(`${day}T00:00:00.000Z`) },
  })) as MadeTest[];
}

const SECRET = "cron-secret-for-test";
/** 2026-08-21 은 **금요일** — 아래 계획들의 수업 요일은 그 날을 겨눈다. */
const DAY = "2026-08-21";

function call({
  secret = SECRET,
  day = DAY,
}: { secret?: string | null; day?: string } = {}) {
  return autoDraftCron(
    new NextRequest(`http://localhost/api/tests/auto-draft/cron?day=${day}`, {
      headers:
        secret === null ? undefined : { authorization: `Bearer ${secret}` },
    }),
  );
}

/**
 * 반 A 에 **금요일 계획 한 줄**. 이 한 줄이 반 A 학생 셋을 서로 다른 자리로 보낸다 —
 * 한 회차 안에서 「만든다」와 「문항이 모자라 못 만든다」가 **둘 다** 일어나는 픽스처다.
 *
 *  · s1·s2 (개별 진도 아님) — 반 진도 416@2026-08-01 에서 금요일 셋(8/7·8/14·8/21)만큼
 *    나아가 **419**. 범위 413~419 → 풀 넉넉 → **초안 2장**.
 *  · s3 (개별 진도, 418@2026-07-20) — 금요일 다섯만큼 나아가 **423**(대단원이 바뀐다).
 *    D-63 으로 범위가 421~423 으로 좁혀지고 그 구간은 mock 문항이 얇다 → **lacking**.
 */
async function seedClassAPlan() {
  await prismaTestDouble.progressPlan.create({
    data: {
      classId: CLASS_A_ID,
      studentId: null,
      weekdays: [5],
      unitsPerLesson: 1,
      startUnitId: MOCK_UNITS[0]!.id,
      startDate: new Date("2026-08-14T00:00:00Z"),
      active: true,
    },
  });
}

describe("[매일 자동 출제 ③] GET /api/tests/auto-draft/cron — 아침 8시 초안", () => {
  beforeEach(() => {
    resetPrismaTestDouble();
    process.env.CRON_SECRET = SECRET;
    process.env.AUTO_DRAFT_OWNER_EMAIL = MOCK_TEACHER.email;
  });

  it("CRON_SECRET 이 없으면 503 — 잠긴 채로 배포된 것이다", async () => {
    delete process.env.CRON_SECRET;
    expect((await call()).status).toBe(503);
  });

  it("시크릿이 틀리면 401 — 세션이 아니라 시크릿이 문지기다", async () => {
    expect((await call({ secret: "wrong-secret" })).status).toBe(401);
    expect((await call({ secret: null })).status).toBe(401);
  });

  /** 🔴 조용히 0건으로 끝내면 「매일 도는데 아무것도 안 나오는」 상태를 아무도 못 본다. */
  it("소유자 계정이 정해져 있지 않으면 오류로 끝난다 — 0건 «성공»이 아니다", async () => {
    delete process.env.AUTO_DRAFT_OWNER_EMAIL;
    const res = await call();
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error?: { message?: string } };
    // 「설정 안 함」과 「계정 못 찾음」은 원장님이 할 일이 다르다 — 사유가 갈려야 한다
    expect(body.error?.message).toContain("설정되지 않았습니다");
  });

  it("소유자 이메일의 계정이 없으면 오류로 끝난다", async () => {
    process.env.AUTO_DRAFT_OWNER_EMAIL = "nobody@todaysmath.test";
    const res = await call();
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error?: { message?: string } };
    expect(body.error?.message).toContain("찾을 수 없습니다");
  });

  it("계획이 하나도 없으면 아무것도 안 만든다 — 회차는 남는다", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    const body = autoDraftRunResponseSchema.parse(await res.json());
    expect(body.data.day).toBe(DAY);
    expect(body.data.targets).toBe(0);
    expect(body.data.created).toBe(0);
    const runs = await prismaTestDouble.autoDraftRun.findMany();
    expect(runs).toHaveLength(1);
  });

  it("계획이 있는 학생에게 초안을 세운다 — 진도 기록을 기다리지 않는다", async () => {
    await seedClassAPlan();
    const res = await call();
    const body = autoDraftRunResponseSchema.parse(await res.json());
    expect(body.data.targets).toBe(3); // 반 A 학생 셋 — 아무도 오늘 진도를 안 적었다
    expect(body.data.created).toBe(2);
    expect(body.data.skips).toEqual([
      { studentId: STUDENT_IDS[2]!, reason: "lacking" },
    ]);

    const made = await madeOn(DAY);
    expect(made.map((t) => t.studentId).sort()).toEqual(
      [STUDENT_IDS[0]!, STUDENT_IDS[1]!].sort(),
    );
    // 반 A 학생이 대상이고, 시험지는 **학생별**이다(반 전체 한 장이 아니다)
    expect(made.every((t) => t.classId === CLASS_A_ID)).toBe(true);
    expect(made.every((t) => t.studentId !== null)).toBe(true);
    expect(made.every((t) => t.testType === "review")).toBe(true);
    // 시험지 소유자는 원장 계정 — cron 에는 세션이 없다
    expect(made.every((t) => t.userId === MOCK_TEACHER.id)).toBe(true);
  });

  /** 🔴 D-129 ⑶ — 자동은 **초안까지**. 잘못 나간 시험지가 그대로 학생에게 가지 않게. */
  it("초안까지만 — 확정·인쇄를 부르지 않는다", async () => {
    await seedClassAPlan();
    await call();
    const made = await madeOn(DAY);
    expect(made.length).toBeGreaterThan(0);
    expect(made.every((t) => t.status === "draft")).toBe(true);
    expect(made.every((t) => t.printedAt === null)).toBe(true);
  });

  it("같은 날 두 번 돌려도 하나다 — 이미 있으면 «already» 로 건너뛴다", async () => {
    await seedClassAPlan();
    const first = autoDraftRunResponseSchema.parse(await (await call()).json());
    expect(first.data.created).toBe(2);

    const second = autoDraftRunResponseSchema.parse(
      await (await call()).json(),
    );
    expect(second.data.created).toBe(0);
    // 어제 만든 둘은 «already», 문항이 모자란 하나는 여전히 «lacking» — 까닭이 갈린다
    expect(
      second.data.skips
        .filter((s) => s.reason === "already")
        .map((s) => s.studentId)
        .sort(),
    ).toEqual([STUDENT_IDS[0]!, STUDENT_IDS[1]!].sort());
    expect(second.data.skipped).toBe(3);

    const made = await madeOn(DAY);
    expect(made.length).toBe(first.data.created);
  });

  it("문항이 모자라면 만들지 않고 기록만 남긴다", async () => {
    // 등록 문제 0건인 단원(427)에 선 계획 — 반 「문제부족」에 학생 하나를 둔다.
    const student = await prismaTestDouble.student.create({
      data: {
        classId: CLASS_STARVED_ID,
        name: "굶은학생",
        schoolLevel: null,
        schoolGrade: null,
        eywaStudentId: null,
        eywaWithdrawnAt: null,
        eywaLastReportDate: null,
        eywaLastReportText: null,
      },
    });
    await prismaTestDouble.progressPlan.create({
      data: {
        classId: CLASS_STARVED_ID,
        studentId: null,
        weekdays: [5],
        unitsPerLesson: 1,
        startUnitId: MOCK_EMPTY_PROBLEM_UNIT.id,
        startDate: new Date("2026-08-14T00:00:00Z"),
        active: true,
      },
    });

    const body = autoDraftRunResponseSchema.parse(await (await call()).json());
    expect(body.data.created).toBe(0);
    expect(body.data.skips).toEqual([
      { studentId: student.id, reason: "lacking" },
    ]);
    const made = await madeOn(DAY);
    expect(made).toEqual([]);
  });

  it("회차 기록에 만든 수·건너뛴 까닭이 남는다", async () => {
    await seedClassAPlan();
    await call();
    await call();
    const runs = (await prismaTestDouble.autoDraftRun.findMany({
      orderBy: { ranAt: "asc" },
    })) as Array<{
      day: Date;
      targets: number;
      created: number;
      skipped: number;
      skips: { studentId: string; reason: string }[];
    }>;
    expect(runs).toHaveLength(2);
    expect(runs[0]!.day).toEqual(new Date(`${DAY}T00:00:00.000Z`));
    expect(runs[0]!.created).toBe(2);
    expect(runs[0]!.skipped).toBe(1);
    expect(runs[1]!.created).toBe(0);
    expect(runs[1]!.skipped).toBe(3);
    expect(runs[1]!.skips.filter((s) => s.reason === "already")).toHaveLength(
      2,
    );
    // 건너뛴 수와 까닭 목록의 길이는 늘 같다 — 합계만 남으면 왜 빠졌는지 못 센다
    expect(runs[1]!.skips).toHaveLength(runs[1]!.skipped);
  });

  /**
   * 🔴 **남의 반에도 계획이 있을 때**라야 이 가드를 겨눈다. 예전 판은 소유자 반에만 계획을
   *    두고 「만들어진 시험이 우리 학생인가」만 봤는데, 그러면 소유 필터를 통째로 꺼도
   *    초록이었다(변이 ⑥c 가 살아남았다 — 2026-09-16).
   */
  it("남의 계정 반에 계획이 있어도 건드리지 않는다 — 소유자 계정의 반만 돈다", async () => {
    await seedClassAPlan();
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
    const outsider = await prismaTestDouble.student.create({
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

    const body = autoDraftRunResponseSchema.parse(await (await call()).json());
    // 남의 학생은 **대상으로도 세지 않는다** — 읽지도 않는 쪽이 맞다
    expect(body.data.targets).toBe(3);
    expect(body.data.skips.map((s) => s.studentId)).not.toContain(outsider.id);

    const made = await madeOn(DAY);
    expect(made.map((t) => t.studentId)).not.toContain(outsider.id);
    expect(made.every((t) => STUDENT_IDS.includes(t.studentId ?? ""))).toBe(
      true,
    );
  });
});
