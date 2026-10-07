// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { compare } from "bcryptjs";

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
        phone: "010-1234-0042",
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
  it("지점장은 소속 지점의 강사 계정을 발급마다 새로 뽑은 임시 비밀번호로 만든다", async () => {
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

  it("🔴 임시 비밀번호는 고정값이 아니다 — 발급마다 다르고, 옛 기본값으로는 못 들어온다", async () => {
    // 2026-10-07 검수: 모든 지점 직원 계정이 같은 기본 비밀번호로 발급돼 이메일만 알면 로그인됐다
    // (강제 변경 · 실패 잠금이 직원 계정에는 없다). 원장 · 관리자 발급은 관리 권한까지 열렸다.
    const first = (await (await post("owner")).json()).data;
    const second = (await (await post("owner")).json()).data;
    expect(first.initialPassword).not.toBe(second.initialPassword);
    for (const call of state.create.mock.calls)
      expect(await compare("q1w2e3r4", call[0].data.passwordHash)).toBe(false);
  });

  it("임시 비밀번호는 응답에 한 번만 — 감사 기록에는 안 남는다", async () => {
    const { data } = await (await post("teacher")).json();
    expect(JSON.stringify(state.audit.mock.calls)).not.toContain(
      data.initialPassword,
    );
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

  it("지점 관리자는 학생 등록만 하며 반별 전체 생성 전에는 계정을 만들지 않는다", async () => {
    state.account = { ...state.account, branchRole: "manager" };
    const response = await register();
    expect(response.status).toBe(201);
    const { data } = await response.json();
    expect(data).toMatchObject({
      id: studentId,
      name: "새 학생",
      classId,
    });
    expect(data).not.toHaveProperty("initialPassword");
    expect(data).not.toHaveProperty("loginId");
    const saved = state.studentCreate.mock.calls[0][0].data;
    expect(saved).toMatchObject({
      classId,
      name: "새 학생",
      phoneLast4: "0042",
    });
    expect(saved).not.toHaveProperty("studentAccount");
    expect(JSON.stringify(saved)).not.toContain("010-1234");
  });

  it("다른 지점 반에는 학생을 등록하지 않는다", async () => {
    state.classFindFirst.mockResolvedValueOnce(null);
    expect((await register()).status).toBe(404);
    expect(state.studentCreate).not.toHaveBeenCalled();
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
