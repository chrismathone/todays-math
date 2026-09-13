import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/dev/unified/overview/route";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  classCount: vi.fn(),
  studentCount: vi.fn(),
  classes: vi.fn(),
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
  mocks.classes.mockResolvedValue([
    {
      id: "class-a",
      name: "중1 기본반",
      grade: "중1",
      _count: { students: 8 },
      progresses: [{ unit: currentUnit }],
    },
    {
      id: "class-b",
      name: "중2 심화반",
      grade: "중2",
      _count: { students: 6 },
      progresses: [],
    },
    {
      id: "class-c",
      name: "고1 시작반",
      grade: "고1",
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
      where: { userId: owner.id },
    });
    expect(mocks.studentCount).toHaveBeenCalledWith({
      where: { class: { userId: owner.id } },
    });
    expect(mocks.classes).toHaveBeenCalledWith({
      where: { userId: owner.id },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: 3,
      select: {
        id: true,
        name: true,
        grade: true,
        _count: { select: { students: true } },
        progresses: {
          where: { studentId: null },
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
        .filter((row) => row.userId === where.class.userId)
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
