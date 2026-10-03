import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/dev/unified/overview/route";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  classCount: vi.fn(),
  studentCount: vi.fn(),
  classes: vi.fn(),
}));
vi.mock("@/lib/eywa/managedAccounts", () => ({
  getManagedClassGrants: async () => null,
}));
vi.mock("@/lib/session", () => ({ getSessionUser: mocks.session }));
vi.mock("@/lib/db", () => ({
  db: {
    class: { count: mocks.classCount, findMany: mocks.classes },
    student: { count: mocks.studentCount },
  },
}));

const owner = { id: "owner-a", name: "김수학", email: "private@example.com" };
const currentUnit = { chapter: "문자와 식", section: "일차방정식" };

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NODE_ENV", "development");
  mocks.session.mockResolvedValue(owner);
  mocks.classCount.mockResolvedValue(4);
  mocks.studentCount.mockResolvedValue(26);
  // `userId` · `user` 는 관리자 조회만 고르는 칸(담당, D-132)이다 — 실제 DB 는 고른 칸만 주지만 모킹은
  // 한 벌이라 둘 다 둔다. 관리자 아님 응답은 이 칸을 안 읽는다(`recentClasses.ts`).
  mocks.classes.mockResolvedValue([
    {
      id: "class-a",
      name: "중1 기본반",
      grade: "중1",
      userId: owner.id,
      user: { name: owner.name },
      _count: { students: 8 },
      progresses: [{ unit: currentUnit }],
    },
    {
      id: "class-b",
      name: "중2 심화반",
      grade: "중2",
      userId: owner.id,
      user: { name: owner.name },
      _count: { students: 6 },
      progresses: [],
    },
    {
      id: "class-c",
      name: "고1 시작반",
      grade: "고1",
      userId: owner.id,
      user: { name: owner.name },
      _count: { students: 7 },
      progresses: [],
    },
  ]);
});
afterEach(() => vi.unstubAllEnvs());

function expectNoDatabaseReads() {
  expect(mocks.classCount).not.toHaveBeenCalled();
  expect(mocks.studentCount).not.toHaveBeenCalled();
  expect(mocks.classes).not.toHaveBeenCalled();
}

describe("teaching overview access and query boundary", () => {
  it.each(["production", "test"])(
    "returns private 404 in %s before reading the session or database",
    async (mode) => {
      vi.stubEnv("NODE_ENV", mode);
      const response = await GET();
      expect(response.status).toBe(404);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(mocks.session).not.toHaveBeenCalled();
      expectNoDatabaseReads();
    },
  );

  it("returns private 401 anonymously before any database read", async () => {
    mocks.session.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expectNoDatabaseReads();
  });

  it("scopes all reads to the verified owner and selects at most three classes and one class unit each", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.classCount).toHaveBeenCalledWith({
      where: {
        userId: owner.id,
        eywaBindingId: null,
        OR: [{ branchId: null }],
      },
    });
    expect(mocks.studentCount).toHaveBeenCalledWith({
      where: expect.objectContaining({
        OR: expect.arrayContaining([
          expect.objectContaining({
            eywaBindingId: null,
            class: {
              userId: owner.id,
              eywaBindingId: null,
              OR: [{ branchId: null }],
            },
          }),
        ]),
      }),
    });
    expect(mocks.classes).toHaveBeenCalledWith({
      where: {
        userId: owner.id,
        eywaBindingId: null,
        OR: [{ branchId: null }],
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: 3,
      select: {
        id: true,
        name: true,
        grade: true,
        _count: { select: { students: true } },
        progresses: {
          where: { studentId: null, retiredAt: null },
          orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
          take: 1,
          select: { unit: { select: { chapter: true, section: true } } },
        },
      },
    });
    for (const read of [mocks.classCount, mocks.studentCount, mocks.classes]) {
      expect(mocks.session.mock.invocationCallOrder[0]).toBeLessThan(
        read.mock.invocationCallOrder[0]!,
      );
    }
    expect(await response.json()).toEqual({
      data: {
        user: { id: owner.id, name: owner.name },
        classCount: 4,
        studentCount: 26,
        classes: [
          {
            id: "class-a",
            name: "중1 기본반",
            grade: "중1",
            studentCount: 8,
            currentUnit,
          },
          {
            id: "class-b",
            name: "중2 심화반",
            grade: "중2",
            studentCount: 6,
            currentUnit: null,
          },
          {
            id: "class-c",
            name: "고1 시작반",
            grade: "고1",
            studentCount: 7,
            currentUnit: null,
          },
        ],
      },
    });
  });

  /**
   * D-130 — 관리자는 작업실 개요 숫자에서 소유 울타리를 넘는다. 위 시험(관리자 아님 = 소유자로
   * 좁힌다)과 **같은 뷰어에 표시 하나만** 다르다. 짝이 없으면 «항상 넓힌다»가 초록이다.
   */
  it("D-130: an admin session counts every class and student — the same owner without the flag stays scoped", async () => {
    mocks.session.mockResolvedValue({
      ...owner,
      isAdmin: true,
      isSuperAdmin: true,
    });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(mocks.classCount).toHaveBeenCalledWith({ where: {} });
    expect(mocks.studentCount).toHaveBeenCalledWith({
      where: expect.objectContaining({
        OR: expect.arrayContaining([
          expect.objectContaining({ eywaBindingId: null, class: {} }),
        ]),
      }),
    });
    expect(mocks.classes).toHaveBeenCalledWith(
      expect.objectContaining({ where: {}, take: 3 }),
    );

    vi.clearAllMocks();
    mocks.session.mockResolvedValue({ ...owner, isAdmin: false });
    expect((await GET()).status).toBe(200);
    expect(mocks.classCount).toHaveBeenCalledWith({
      where: {
        userId: owner.id,
        eywaBindingId: null,
        OR: [{ branchId: null }],
      },
    });
    expect(mocks.studentCount).toHaveBeenCalledWith({
      where: expect.objectContaining({
        OR: expect.arrayContaining([
          expect.objectContaining({
            eywaBindingId: null,
            class: {
              userId: owner.id,
              eywaBindingId: null,
              OR: [{ branchId: null }],
            },
          }),
        ]),
      }),
    });
  });

  it("uses each request's session for both totals and rows, without reusing another owner's result", async () => {
    const rows = [
      {
        userId: "owner-a",
        id: "class-a",
        name: "A의 반",
        grade: "중1",
        _count: { students: 8 },
        progresses: [],
      },
      {
        userId: "owner-b",
        id: "class-b",
        name: "B의 반",
        grade: "중2",
        _count: { students: 2 },
        progresses: [],
      },
    ];
    mocks.classes.mockImplementation(({ where }) =>
      rows.filter((row) => row.userId === where.userId),
    );
    mocks.classCount.mockImplementation(
      ({ where }) => rows.filter((row) => row.userId === where.userId).length,
    );
    mocks.studentCount.mockImplementation(({ where }) =>
      rows
        .filter((row) => row.userId === where.OR[0].class.userId)
        .reduce((total, row) => total + row._count.students, 0),
    );
    const first = await (await GET()).json();
    mocks.session.mockResolvedValue({ ...owner, id: "owner-b" });
    const second = await (await GET()).json();
    expect(first.data.studentCount).toBe(8);
    expect(first.data.classes.map((row: { id: string }) => row.id)).toEqual([
      "class-a",
    ]);
    expect(second.data.classCount).toBe(1);
    expect(second.data.studentCount).toBe(2);
    expect(second.data.classes.map((row: { id: string }) => row.id)).toEqual([
      "class-b",
    ]);
    expect(JSON.stringify(second)).not.toContain("class-a");
    expect(JSON.stringify(second)).not.toContain(owner.email);
  });

  it("returns real zero totals and no classes for an empty account", async () => {
    mocks.classCount.mockResolvedValue(0);
    mocks.studentCount.mockResolvedValue(0);
    mocks.classes.mockResolvedValue([]);
    expect(await (await GET()).json()).toEqual({
      data: {
        user: { id: owner.id, name: owner.name },
        classCount: 0,
        studentCount: 0,
        classes: [],
      },
    });
  });

  it("returns a private retryable failure without leaking database details", async () => {
    mocks.classes.mockRejectedValue(new Error("private connection string"));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.text()).not.toContain("private connection string");
  });

  it("does not query the database if the session check fails", async () => {
    mocks.session.mockRejectedValue(new Error("private session failure"));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private session failure");
    expectNoDatabaseReads();
  });
});
