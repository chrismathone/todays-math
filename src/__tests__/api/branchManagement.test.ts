// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { compare } from "bcryptjs";
import { Prisma } from "@prisma/client";

const state = vi.hoisted(() => ({
  account: {
    id: "10000000-0000-4000-8000-000000000001",
    branchId: "20000000-0000-4000-8000-000000000002",
    branchRole: "owner",
    isAdmin: true,
  } as {
    id: string;
    branchId: string | null;
    branchRole: "owner" | "manager" | "teacher";
    isAdmin: boolean;
  },
  create: vi.fn(),
  findFirst: vi.fn(),
  classFindFirst: vi.fn(),
  classUpdate: vi.fn(),
  studentFindFirst: vi.fn(),
  studentUpdate: vi.fn(),
  studentCreate: vi.fn(),
  audit: vi.fn(),
}));
vi.mock("@/lib/accountAccess", () => ({
  authorizeAccount: vi.fn(async () => ({
    account: state.account,
    response: null,
  })),
}));
vi.mock("@/lib/db", () => ({
  db: {
    user: { create: state.create, findFirst: state.findFirst },
    class: { findFirst: state.classFindFirst, update: state.classUpdate },
    student: {
      findFirst: state.studentFindFirst,
      update: state.studentUpdate,
      create: state.studentCreate,
    },
  },
}));
vi.mock("@/lib/audit", () => ({ recordAudit: state.audit }));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_: string, handler: unknown) => handler,
}));

import { POST as createStaff } from "@/app/api/branch/accounts/route";
import { PATCH as assignClass } from "@/app/api/branch/classes/[id]/route";
import { PATCH as assignStudent } from "@/app/api/branch/students/[id]/route";
import { POST as registerStudent } from "@/app/api/branch/students/route";

const classId = "30000000-0000-4000-8000-000000000003";
const teacherId = "40000000-0000-4000-8000-000000000004";
const studentId = "50000000-0000-4000-8000-000000000005";
const targetClassId = "60000000-0000-4000-8000-000000000006";
const post = (role: string) =>
  createStaff(
    new Request("http://localhost/api/branch/accounts", {
      method: "POST",
      headers: { origin: "http://localhost" },
      body: JSON.stringify({ name: "새 직원", email: "NEW@EXAMPLE.COM", role }),
    }),
  );
const assign = () =>
  assignClass(
    new Request(`http://localhost/api/branch/classes/${classId}`, {
      method: "PATCH",
      headers: { origin: "http://localhost" },
      body: JSON.stringify({ teacherId }),
    }),
    { params: Promise.resolve({ id: classId }) },
  );
const moveStudent = () =>
  assignStudent(
    new Request(`http://localhost/api/branch/students/${studentId}`, {
      method: "PATCH",
      headers: { origin: "http://localhost" },
      body: JSON.stringify({ classId: targetClassId }),
    }),
    { params: Promise.resolve({ id: studentId }) },
  );
const register = () =>
  registerStudent(
    new Request("http://localhost/api/branch/students", {
      method: "POST",
      headers: { origin: "http://localhost" },
      body: JSON.stringify({
        classId,
        name: "새 학생",
        loginId: "NEW_STUDENT",
      }),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  state.account = {
    id: "10000000-0000-4000-8000-000000000001",
    branchId: "20000000-0000-4000-8000-000000000002",
    branchRole: "owner",
    isAdmin: true,
  };
  state.audit.mockResolvedValue(undefined);
  state.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => ({
      id: teacherId,
      email: data.email,
      name: data.name,
      branchRole: data.branchRole,
    }),
  );
  state.classFindFirst.mockResolvedValue({
    id: classId,
    userId: state.account.id,
  });
  state.findFirst.mockResolvedValue({ id: teacherId });
  state.classUpdate.mockResolvedValue({ id: classId });
  state.studentFindFirst.mockResolvedValue({ id: studentId, classId });
  state.studentUpdate.mockResolvedValue({
    id: studentId,
    classId: targetClassId,
  });
  state.studentCreate.mockImplementation(
    async ({
      data,
    }: {
      data: {
        classId: string;
        name: string;
        studentAccount: { create: { loginId: string } };
      };
    }) => ({
      id: studentId,
      classId: data.classId,
      name: data.name,
      studentAccount: {
        id: "70000000-0000-4000-8000-000000000007",
        issuedAt: new Date("2026-09-23T00:00:00.000Z"),
      },
    }),
  );
});

describe("지점 계정 발급과 반 배정", () => {
  it("지점장은 소속 지점의 강사 계정을 임시 비밀번호로 만든다", async () => {
    const response = await post("teacher");
    expect(response.status).toBe(201);
    const { data } = await response.json();
    expect(data.email).toBe("new@example.com");
    expect(data.initialPassword).toMatch(/^[-_A-Za-z0-9]{16}$/);
    const saved = state.create.mock.calls[0][0].data;
    expect(saved).toMatchObject({
      branchId: state.account.branchId,
      branchRole: "teacher",
      isAdmin: false,
      isSuperAdmin: false,
    });
    expect(await compare(data.initialPassword, saved.passwordHash)).toBe(true);
  });

  it("지점 관리자는 원장·관리자 계정을 만들 수 없다", async () => {
    state.account = { ...state.account, branchRole: "manager" };
    expect((await post("owner")).status).toBe(403);
    expect(state.create).not.toHaveBeenCalled();
  });

  it("강사는 직원 발급과 반 배정을 할 수 없다", async () => {
    state.account = { ...state.account, branchRole: "teacher", isAdmin: false };
    expect((await post("teacher")).status).toBe(403);
    expect((await assign()).status).toBe(403);
    expect((await moveStudent()).status).toBe(403);
    expect((await register()).status).toBe(403);
    expect(state.create).not.toHaveBeenCalled();
    expect(state.classUpdate).not.toHaveBeenCalled();
    expect(state.studentCreate).not.toHaveBeenCalled();
  });

  it("지점 관리자는 학생 명단과 로그인 계정을 한 번에 발급한다", async () => {
    state.account = { ...state.account, branchRole: "manager" };
    const response = await register();
    expect(response.status).toBe(201);
    const { data } = await response.json();
    expect(data).toMatchObject({
      id: studentId,
      name: "새 학생",
      classId,
      loginId: "new_student",
    });
    expect(data.initialPassword).toMatch(/^\d{4}$/);
    const saved = state.studentCreate.mock.calls[0][0].data;
    expect(saved).toMatchObject({
      classId,
      name: "새 학생",
      studentAccount: {
        create: { loginId: "new_student", issuedById: state.account.id },
      },
    });
    expect(
      await compare(
        data.initialPassword,
        saved.studentAccount.create.passwordHash,
      ),
    ).toBe(true);
  });

  it("다른 지점 반이나 중복 아이디는 학생을 등록하지 않는다", async () => {
    state.classFindFirst.mockResolvedValueOnce(null);
    expect((await register()).status).toBe(404);
    expect(state.studentCreate).not.toHaveBeenCalled();
    state.studentCreate.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "6.19.3",
      }),
    );
    expect((await register()).status).toBe(409);
  });

  it("학생은 소속 지점의 다른 반으로만 배정할 수 있다", async () => {
    state.classFindFirst.mockResolvedValue({ id: targetClassId });
    state.classFindFirst.mockResolvedValueOnce(null);
    expect((await moveStudent()).status).toBe(404);
    expect(state.studentUpdate).not.toHaveBeenCalled();
    expect((await moveStudent()).status).toBe(200);
    expect(state.studentUpdate).toHaveBeenCalledWith({
      where: { id: studentId },
      data: { classId: targetClassId },
    });
  });

  it("반과 강사가 같은 지점에 있을 때만 담당자를 변경한다", async () => {
    state.findFirst.mockResolvedValueOnce(null);
    expect((await assign()).status).toBe(404);
    expect(state.classUpdate).not.toHaveBeenCalled();
    expect((await assign()).status).toBe(200);
    expect(state.classUpdate).toHaveBeenCalledWith({
      where: { id: classId },
      data: { userId: teacherId },
    });
  });
});
