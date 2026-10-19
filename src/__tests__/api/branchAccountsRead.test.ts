// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
import { studentListResponseSchema } from "@/contracts/class.contract";
import { accountRouteAllowed } from "@/lib/accountRouteAccess";
import {
  currentEnrollmentWhere,
  studentsInClassWhere,
} from "@/lib/classAccess";
import { managedRelationDb } from "../helpers/managedRelationDb";

const state = vi.hoisted(() => ({
  auth: vi.fn(),
  db: {} as Prisma.TransactionClient,
}));
vi.mock("@/lib/auth", () => ({ auth: state.auth }));
vi.mock("@/lib/db", () => ({
  db: new Proxy({}, { get: (_target, key) => Reflect.get(state.db, key) }),
}));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_route: string, handler: unknown) => handler,
}));

import { GET as listStudents } from "@/app/api/branch/students/route";
import { GET as listClasses } from "@/app/api/branch/classes/route";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const branchId = id(1);
const classId = id(2);
const otherClassId = id(3);
const bindingId = id(4);
const now = new Date("2026-10-19T03:00:00.000Z");
const day = new Date("2026-10-19T00:00:00.000Z");
const account: AccountAccess = {
  id: id(5),
  name: "지점 관리자",
  email: "manager@example.test",
  role: "director",
  branchId,
  branchRole: "manager",
  isAdmin: true,
  isSuperAdmin: false,
  approvalStatus: "approved",
  menus: [],
};
let fixture: ReturnType<typeof managedRelationDb>;

function setAccount(overrides: Partial<AccountAccess> = {}) {
  state.auth.mockResolvedValue({ user: { ...account, ...overrides } });
}
function students(query = `classId=${classId}`) {
  return listStudents(
    new Request(`http://localhost/api/branch/students?${query}`),
  );
}
function classes() {
  return listClasses(new Request("http://localhost/api/branch/classes"));
}
function student(n: number, overrides: Record<string, unknown> = {}) {
  return {
    id: id(n),
    classId,
    branchId,
    name: `학생 ${n}`,
    useIndividualProgress: false,
    createdAt: now,
    updatedAt: now,
    eywaBindingId: null,
    eywaWithdrawnAt: null,
    isTest: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  setAccount();
  fixture = managedRelationDb();
  state.db = fixture.tx;
  vi.spyOn(fixture.tx.class, "findFirst");
  vi.spyOn(fixture.tx.class, "findMany");
  vi.spyOn(fixture.tx.student, "findMany");
  vi.spyOn(fixture.tx.student, "count");
  fixture.tables.class.push({
    id: classId,
    branchId,
    userId: id(6),
    name: "운영 반",
    grade: "중1",
    active: true,
    closedAt: null,
    eywaBindingId: null,
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("GET /api/branch/students — 지점 계정 관리 범위", () => {
  it("수업 메뉴가 없는 관리자도 조회하고 기존 메뉴 관문은 그대로 둔다", async () => {
    expect(accountRouteAllowed(account, "GET", "/api/students")).toBe(false);
    expect(accountRouteAllowed(account, "GET", "/api/branch/students")).toBe(
      true,
    );
    const response = await students();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      data: [],
      meta: { page: 1, pageSize: 20, total: 0 },
    });
    expect(fixture.tx.class.findFirst).toHaveBeenCalledWith({
      where: { id: classId, branchId },
      select: { id: true },
    });
  });

  it.each(["owner", "manager"] as const)(
    "%s는 POST와 같은 정책으로 isAdmin 없이도 핸들러에서 허용한다",
    async (branchRole) => {
      setAccount({ branchRole, isAdmin: false });
      expect((await students()).status).toBe(200);
      expect(
        accountRouteAllowed(
          { ...account, branchRole, isAdmin: false },
          "GET",
          "/api/branch/students",
        ),
      ).toBe(false);
    },
  );

  it("기존 teacher 표지의 관리자도 POST와 같은 정책으로 허용한다", async () => {
    setAccount({ branchRole: "teacher" });
    expect((await students()).status).toBe(200);
  });

  it.each([
    { branchRole: "teacher" as const, isAdmin: false },
    { branchRole: null, isAdmin: false },
    { branchId: null },
    { branchId: null, isSuperAdmin: true },
    { approvalStatus: "pending" as const },
  ])("권한 또는 소속이 없는 계정은 조회 전에 403: %j", async (overrides) => {
    setAccount(overrides);
    const response = await students();
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: { code: "FORBIDDEN" },
    });
    expect(fixture.tx.class.findFirst).not.toHaveBeenCalled();
    expect(fixture.tx.student.findMany).not.toHaveBeenCalled();
    expect(fixture.tx.student.count).not.toHaveBeenCalled();
  });

  it("로그인하지 않은 요청은 401", async () => {
    state.auth.mockResolvedValue(null);
    expect((await students()).status).toBe(401);
    expect(fixture.tx.class.findFirst).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    "다른 지점 반은 최고관리자 여부(%s)와 관계없이 403",
    async (isSuperAdmin) => {
      setAccount({ isSuperAdmin });
      fixture.tables.class[0].branchId = id(99);
      expect((await students()).status).toBe(403);
      expect(fixture.tx.student.findMany).not.toHaveBeenCalled();
      expect(fixture.tx.student.count).not.toHaveBeenCalled();
    },
  );

  it("소속 없는 반과 없는 반도 학생 조회 전에 403", async () => {
    fixture.tables.class[0].branchId = null;
    expect((await students()).status).toBe(403);
    expect((await students(`classId=${id(99)}`)).status).toBe(403);
    expect(fixture.tx.student.findMany).not.toHaveBeenCalled();
  });

  it.each([
    "",
    "classId=invalid",
    `classId=${classId}&page=0`,
    `classId=${classId}&page=1.5`,
    `classId=${classId}&page=invalid`,
    `classId=${classId}&pageSize=0`,
    `classId=${classId}&pageSize=101`,
    `classId=${classId}&extra=1`,
  ])(
    "기존 목록 쿼리 계약으로 잘못된 요청을 400 처리한다: %s",
    async (query) => {
      const response = await students(query);
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: { code: "VALIDATION_ERROR" },
      });
      expect(fixture.tx.class.findFirst).not.toHaveBeenCalled();
      expect(fixture.tx.student.findMany).not.toHaveBeenCalled();
    },
  );

  it("페이지·메타와 기존 학생 직렬화를 보존한다", async () => {
    vi.mocked(fixture.tx.student.findMany).mockResolvedValueOnce([
      { ...student(10, { phoneLast4: "0042" }), enrollments: [] },
    ] as never);
    vi.mocked(fixture.tx.student.count).mockResolvedValueOnce(121);
    const response = await students(`classId=${classId}&page=2&pageSize=100`);
    expect(response.status).toBe(200);
    const body = studentListResponseSchema.parse(await response.json());
    expect(body).toEqual({
      data: [
        {
          id: id(10),
          classId,
          name: "학생 10",
          useIndividualProgress: false,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      ],
      meta: { page: 2, pageSize: 100, total: 121 },
    });
    expect(fixture.tx.student.findMany).toHaveBeenCalledWith({
      where: studentsInClassWhere(classId),
      include: {
        enrollments: {
          where: { classId, ...currentEnrollmentWhere(undefined, true) },
          orderBy: { startsOn: "desc" },
          take: 1,
        },
      },
      skip: 100,
      take: 100,
      orderBy: { createdAt: "asc" },
    });
    expect(fixture.tx.student.count).toHaveBeenCalledWith({
      where: studentsInClassWhere(classId),
    });
  });

  it("로컬 학생과 현재 수강 중인 연동 학생을 읽고 호환 classId를 요청 반으로 직렬화한다", async () => {
    fixture.tables.class[0].eywaBindingId = bindingId;
    fixture.tables.student.push(
      student(10),
      student(11, { classId: otherClassId, eywaBindingId: bindingId }),
      student(12, { eywaBindingId: bindingId }),
    );
    fixture.tables.studentEnrollment.push({
      studentId: id(11),
      classId,
      startsOn: day,
      endsOn: null,
      endedAt: null,
      onHold: true,
      isTransferred: false,
      eywaLastReportDate: day,
      eywaLastReportText: "현재 반의 기록",
    });
    const response = await students();
    expect(response.status).toBe(200);
    const body = studentListResponseSchema.parse(await response.json());
    expect(body.data.map((row) => [row.id, row.classId])).toEqual([
      [id(10), classId],
      [id(11), classId],
    ]);
    expect(body.meta.total).toBe(2);
  });

  it.each([
    { studentChange: { eywaWithdrawnAt: now }, enrollmentChange: {} },
    { studentChange: { isTest: true }, enrollmentChange: {} },
    { studentChange: {}, enrollmentChange: { endedAt: now } },
    {
      studentChange: {},
      enrollmentChange: { startsOn: new Date("2026-10-20") },
    },
    { studentChange: {}, enrollmentChange: { endsOn: new Date("2026-10-18") } },
    {
      studentChange: {},
      enrollmentChange: { endsOn: day, isTransferred: true },
    },
  ])(
    "현재 수강 대상이 아닌 연동 학생은 목록과 total에서 제외한다: %j",
    async ({ studentChange, enrollmentChange }) => {
      fixture.tables.student.push(
        student(10),
        student(11, { eywaBindingId: bindingId, ...studentChange }),
      );
      fixture.tables.studentEnrollment.push({
        studentId: id(11),
        classId,
        startsOn: day,
        endsOn: null,
        endedAt: null,
        onHold: false,
        isTransferred: false,
        ...enrollmentChange,
      });
      const body = studentListResponseSchema.parse(
        await (await students()).json(),
      );
      expect(body.data.map((row) => row.id)).toEqual([id(10)]);
      expect(body.meta.total).toBe(1);
    },
  );

  it("마지막 페이지 뒤에서도 빈 목록과 전체 건수를 보존한다", async () => {
    vi.mocked(fixture.tx.student.count).mockResolvedValueOnce(121);
    const body = await (
      await students(`classId=${classId}&page=3&pageSize=100`)
    ).json();
    expect(body).toEqual({
      data: [],
      meta: { page: 3, pageSize: 100, total: 121 },
    });
    expect(fixture.tx.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 200, take: 100 }),
    );
  });
});

describe("GET /api/branch/classes — 운영 반만", () => {
  it("같은 지점에서 active이고 종강일이 없거나 미래인 반만 반환한다", async () => {
    const base = fixture.tables.class[0];
    fixture.tables.class.push(
      {
        ...base,
        id: id(10),
        closedAt: new Date(now.getTime() + 1),
        eywaBindingId: bindingId,
      },
      { ...base, id: id(11), active: false },
      {
        ...base,
        id: id(12),
        active: false,
        closedAt: new Date(now.getTime() + 1),
      },
      { ...base, id: id(13), closedAt: new Date(now.getTime() - 1) },
      { ...base, id: id(14), closedAt: now },
      { ...base, id: id(15), branchId: id(99) },
    );
    const response = await classes();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body.data.map((row: { id: string }) => row.id)).toEqual([
      classId,
      id(10),
    ]);
    expect(fixture.tx.class.findMany).toHaveBeenCalledWith({
      where: {
        branchId,
        active: true,
        OR: [{ closedAt: null }, { closedAt: { gt: now } }],
      },
      select: {
        id: true,
        name: true,
        grade: true,
        userId: true,
        user: { select: { name: true } },
        _count: { select: { students: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    });
  });

  it("소비자가 쓰는 담당 강사·학생 수·응답 래퍼를 보존한다", async () => {
    const rows = [
      {
        id: classId,
        name: "운영 반",
        grade: "중1",
        userId: id(6),
        user: { name: "담당 강사" },
        _count: { students: 4 },
      },
    ];
    vi.mocked(fixture.tx.class.findMany).mockResolvedValueOnce(rows as never);
    expect(await (await classes()).json()).toEqual({ data: rows });
  });
});
