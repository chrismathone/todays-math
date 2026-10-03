// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScopeViewer } from "@/lib/ownerScope";
import { managedRelationDb } from "../helpers/managedRelationDb";

const state = vi.hoisted(() => ({
  db: {} as object,
  session: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  read: vi.fn(),
  audit: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ getSessionUser: state.session }));
vi.mock("@/lib/db", () => ({
  db: new Proxy({}, { get: (_target, key) => Reflect.get(state.db, key) }),
}));
vi.mock("@/lib/eywa/managedAccounts", () => ({
  getManagedClassGrants: vi.fn(),
  refreshManagedBinding: vi.fn(),
}));
vi.mock("@/lib/audit", () => ({ recordAudit: state.audit }));
vi.mock("@/lib/learn/pinHash", () => ({
  hashStudentPin: vi.fn(async () => "hash"),
}));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_path: string, handler: unknown) => handler,
}));

import { GET, POST, PATCH } from "@/app/api/students/[id]/account/route";
import { POST as reissue } from "@/app/api/students/[id]/account/password/route";
import { getManagedClassGrants } from "@/lib/eywa/managedAccounts";
import { requireOwnedStudent } from "@/lib/ownership";
import { studentIssueDeps } from "@/lib/learn/issueDeps";
import {
  issueStudentAccount,
  reissueStudentPassword,
  setStudentAccountDisabled,
} from "@/lib/learn/issueStudentAccount";

const studentId = "30000000-0000-4000-8000-000000000001";
const classId = "40000000-0000-4000-8000-000000000001";
const branchId = "50000000-0000-4000-8000-000000000001";
const now = new Date("2026-10-03T03:00:00Z");
const teacher: ScopeViewer = { id: "teacher", branchId, branchRole: "teacher" };
const manager: ScopeViewer = {
  id: "manager",
  branchId,
  branchRole: "manager",
  isAdmin: false,
};
let fixture: ReturnType<typeof managedRelationDb>;
const ctx = () => ({ params: Promise.resolve({ id: studentId }) });
const request = (method: string, body?: unknown) =>
  new NextRequest(`http://localhost/api/students/${studentId}/account`, {
    method,
    headers: { origin: "http://localhost" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.stubEnv("AUTH_URL", "http://localhost");
  fixture = managedRelationDb();
  fixture.tables.class.push({
    id: classId,
    branchId,
    eywaBindingId: "binding",
    eywaClassId: "source-class",
    userId: "former-teacher",
    permissionRevision: BigInt(1),
    active: true,
    closedAt: null,
  });
  fixture.tables.student.push({
    id: studentId,
    classId,
    branchId,
    eywaBindingId: "binding",
    isTest: false,
    eywaWithdrawnAt: null,
  });
  fixture.tables.studentEnrollment.push({
    id: "enrollment",
    studentId,
    classId,
    bindingId: "binding",
    startsOn: new Date("2026-01-01"),
    endsOn: null,
    endedAt: null,
    onHold: false,
    isTransferred: false,
  });
  fixture.tables.classMembership.push({
    id: "membership",
    userId: teacher.id,
    classId,
    bindingId: "binding",
    startsOn: null,
    endsOn: null,
    revokedAt: null,
    role: "homeroom",
    capabilities: ["student:read", "student:account"],
  });
  Object.assign(fixture.tx, {
    studentAccount: {
      findUnique: state.read,
      create: state.create,
      update: state.update,
    },
  });
  state.db = { ...fixture.tx, $transaction: fixture.transaction };
  state.read.mockResolvedValue(null);
  state.create.mockImplementation(async ({ data }) => ({
    ...data,
    id: "account",
    issuedAt: now,
    mustChangePassword: true,
    disabledAt: null,
    lockedUntil: null,
    failedCount: 0,
  }));
  state.session.mockResolvedValue(manager);
  vi.mocked(getManagedClassGrants).mockImplementation(async (id) =>
    id === teacher.id
      ? {
          bindingId: "binding",
          sourceEpoch: "epoch",
          classListRevision: BigInt(1),
          leaseExpiresAt: new Date(now.getTime() + 60_000),
          sourceClasses: [
            {
              id: "source-class",
              permissionRevision: "1",
              capabilities: ["student:read", "student:account"],
              validUntil: null,
            },
          ],
        }
      : null,
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("student account issuance requires branch administration", () => {
  it("keeps a managed teacher's roster readable but denies every account endpoint despite source capability", async () => {
    state.session.mockResolvedValue(teacher);
    expect(
      (await requireOwnedStudent(studentId, teacher, "student:read")).ok,
    ).toBe(true);
    expect(
      (await requireOwnedStudent(studentId, teacher, "student:account")).ok,
    ).toBe(true);
    expect(
      (await POST(request("POST", { loginId: "learner01" }), ctx())).status,
    ).toBe(403);
    expect((await reissue(request("POST"), ctx())).status).toBe(403);
    expect(
      (await PATCH(request("PATCH", { disabled: false }), ctx())).status,
    ).toBe(403);
    expect(
      (await PATCH(request("PATCH", { disabled: true }), ctx())).status,
    ).toBe(403);
    expect((await GET(request("GET"), ctx())).status).toBe(403);
    expect(state.create).not.toHaveBeenCalled();
    expect(state.update).not.toHaveBeenCalled();
    expect(state.audit).not.toHaveBeenCalled();
  });

  it.each([
    teacher,
    { id: "unscoped-admin", isAdmin: true },
    { id: "ordinary" },
    { id: "missing-role", branchId },
  ])(
    "rejects unauthorized direct service callers even if the capability callback grants access: $id",
    async (director) => {
      const deps = studentIssueDeps();
      deps.authorizeStudent = vi.fn(async () => true);
      const input = { director, studentId };
      expect(
        await issueStudentAccount(deps, { ...input, loginId: "learner01" }),
      ).toEqual({ ok: false, reason: "not_owner" });
      expect(await reissueStudentPassword(deps, input)).toEqual({
        ok: false,
        reason: "not_owner",
      });
      expect(
        await setStudentAccountDisabled(deps, { ...input, disabled: false }),
      ).toEqual({ ok: false, reason: "not_owner" });
      expect(deps.authorizeStudent).not.toHaveBeenCalled();
      expect(state.create).not.toHaveBeenCalled();
      expect(state.update).not.toHaveBeenCalled();
    },
  );

  it.each([
    manager,
    { ...manager, branchRole: "owner" as const },
    { id: "admin", branchId, isAdmin: true },
    {
      id: "legacy-admin",
      branchId,
      isAdmin: true,
      branchRole: "teacher" as const,
    },
    { id: "global", isSuperAdmin: true },
  ])(
    "issues for an enrolled student after explicit POST by $id / $branchRole",
    async (viewer) => {
      state.session.mockResolvedValue(viewer);
      const before = await GET(request("GET"), ctx());
      expect(before.status).toBe(200);
      expect(await before.json()).toEqual({
        data: { withdrawn: false, account: null },
      });
      expect(state.create).not.toHaveBeenCalled();
      expect(
        (await POST(request("POST", { loginId: "learner01" }), ctx())).status,
      ).toBe(201);
      expect(state.create).toHaveBeenCalledOnce();
      expect(state.create.mock.calls[0][0].data).toMatchObject({
        studentId,
        issuedById: viewer.id,
      });
    },
  );

  it.each(["manager", "owner", "teacher", null] as const)(
    "blocks a different branch even for an admin with role %s",
    async (branchRole) => {
      state.session.mockResolvedValue({
        ...manager,
        branchRole,
        isAdmin: true,
        branchId: "another-branch",
      });
      expect(
        (await POST(request("POST", { loginId: "learner01" }), ctx())).status,
      ).toBe(403);
      expect((await reissue(request("POST"), ctx())).status).toBe(403);
      expect(state.create).not.toHaveBeenCalled();
      expect(state.update).not.toHaveBeenCalled();
    },
  );

  it("rejects a student branch that disagrees with its authorized class", async () => {
    fixture.tables.student[0].branchId = "another-branch";
    expect(
      (await POST(request("POST", { loginId: "learner01" }), ctx())).status,
    ).toBe(403);
    expect(state.create).not.toHaveBeenCalled();
  });

  it("rechecks enrollment and branch at the write boundary", async () => {
    const deps = studentIssueDeps();
    expect(await deps.authorizeStudent!(manager, studentId)).toBe(true);
    fixture.tables.studentEnrollment[0].endedAt = now;
    await expect(
      deps.createAccount({
        studentId,
        loginId: "learner01",
        passwordHash: "hash",
        issuedById: manager.id,
      }),
    ).rejects.toThrow("반 접근 권한");
    expect(state.create).not.toHaveBeenCalled();
    fixture.tables.studentEnrollment[0].endedAt = null;
    expect(await deps.authorizeStudent!(manager, studentId)).toBe(true);
    fixture.tables.class[0].branchId = "another-branch";
    await expect(
      deps.createAccount({
        studentId,
        loginId: "learner01",
        passwordHash: "hash",
        issuedById: manager.id,
      }),
    ).rejects.toThrow("반 접근 권한");
    expect(state.create).not.toHaveBeenCalled();
  });
});
