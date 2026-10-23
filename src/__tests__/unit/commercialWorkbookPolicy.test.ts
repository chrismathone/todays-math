import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { createWorkbookPolicy } from "@/lib/commercialWorkbooks/server/policy";
vi.mock("@/lib/eywa/managedAccounts", () => ({
  getManagedClassGrants: async () => null,
}));
const actor = "10000000-0000-4000-8000-000000000004";
const classId = "10000000-0000-4000-8000-000000000001";
const studentId = "10000000-0000-4000-8000-000000000002";
let user: Record<string, unknown>;
let cls: Record<string, unknown>;
let student: Record<string, unknown>;
function client() {
  return {
    user: { findUnique: vi.fn(async () => user) },
    class: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        where.id === classId ? cls : null,
      ),
      findMany: vi.fn(async () => [cls]),
    },
    student: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        where.id === studentId ? student : null,
      ),
      findMany: vi.fn(async () =>
        student.classId === classId &&
        !student.isTest &&
        !student.eywaWithdrawnAt
          ? [student]
          : [],
      ),
    },
    $queryRaw: vi.fn(async () => []),
  } as unknown as Prisma.TransactionClient;
}
beforeEach(() => {
  user = {
    id: actor,
    role: "director",
    approvalStatus: "approved",
    deletedAt: null,
    suspendedAt: null,
    manualSuspendedAt: null,
    branchId: null,
    branchRole: null,
    isAdmin: false,
    isSuperAdmin: false,
    disabledMenus: [],
    branch: null,
  };
  cls = {
    id: classId,
    userId: actor,
    name: "내 반",
    active: true,
    closedAt: null,
    branchId: null,
    eywaBindingId: null,
  };
  student = {
    id: studentId,
    name: "학생",
    classId,
    isTest: false,
    eywaBindingId: null,
    eywaWithdrawnAt: null,
  };
});
describe("commercial workbook fresh policy", () => {
  it("requires current approved teaching account, including role, branch menu and suspension", async () => {
    const policy = createWorkbookPolicy(client(), actor);
    await policy.assertTeacher();
    user.disabledMenus = ["teaching"];
    await expect(policy.assertTeacher()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    user.disabledMenus = [];
    user.role = "reviewer";
    await expect(policy.assertTeacher()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    user.role = "director";
    user.branchId = crypto.randomUUID();
    user.branch = {
      disabledMenus: ["teaching"],
      ownerDisabledMenus: [],
      menuRevision: 1,
    };
    await expect(policy.assertTeacher()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    user.branchId = null;
    user.branch = null;
    user.suspendedAt = new Date();
    await expect(policy.assertTeacher()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
  it("rejects foreign branch/class, closed classes and students transferred after assignment creation", async () => {
    const policy = createWorkbookPolicy(client(), actor);
    await policy.assertTeacher();
    expect(
      (await policy.assertRoster(classId, [studentId], true)).students,
    ).toHaveLength(1);
    cls.userId = crypto.randomUUID();
    await expect(
      policy.assertRoster(classId, [studentId], true),
    ).rejects.toMatchObject({ code: "SCOPE_CHANGED" });
    cls.userId = actor;
    cls.branchId = crypto.randomUUID();
    await expect(
      policy.assertRoster(classId, [studentId], false),
    ).rejects.toMatchObject({ code: "SCOPE_CHANGED" });
    cls.branchId = null;
    cls.active = false;
    await expect(
      policy.assertRoster(classId, [studentId], true),
    ).rejects.toMatchObject({ code: "SCOPE_CHANGED" });
    cls.active = true;
    student.classId = crypto.randomUUID();
    await expect(
      policy.assertRoster(classId, [studentId], true),
    ).rejects.toMatchObject({ code: "SCOPE_CHANGED" });
    await expect(
      policy.assertRoster(classId, [studentId], false),
    ).rejects.toMatchObject({ code: "SCOPE_CHANGED" });
  });
});
