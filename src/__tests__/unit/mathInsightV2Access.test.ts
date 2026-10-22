// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const w = vi.hoisted(() => ({
  user: {} as Record<string, unknown>,
  student: {} as Record<string, unknown>,
  cls: {} as Record<string, unknown>,
  memberships: [] as Record<string, unknown>[],
  enrollments: [] as Record<string, unknown>[],
  managed: null as Record<string, unknown> | null,
}));
function matches(
  row: Record<string, unknown>,
  where: Record<string, unknown>,
): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (value === undefined) return true;
    if (key === "AND" || key === "OR") {
      const rows = (Array.isArray(value) ? value : [value]) as Record<
        string,
        unknown
      >[];
      return key === "AND"
        ? rows.every((x) => matches(row, x))
        : rows.some((x) => matches(row, x));
    }
    if (value && typeof value === "object" && !(value instanceof Date)) {
      const v = value as Record<string, unknown>;
      if ("in" in v) return (v.in as unknown[]).includes(row[key]);
      const n =
        row[key] instanceof Date
          ? (row[key] as Date).getTime()
          : (row[key] as number);
      if ("lte" in v) return n <= (v.lte as Date).getTime();
      if ("gte" in v) return n >= (v.gte as Date).getTime();
      if ("gt" in v) return n > (v.gt as Date).getTime();
      return matches((row[key] ?? {}) as Record<string, unknown>, v);
    }
    return (row[key] ?? null) === value;
  });
}
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn(async () => w.user) },
    eywaManagedAccount: { findUnique: vi.fn(async () => w.managed) },
    class: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        where.id === w.cls.id ? w.cls : null,
      ),
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
        matches(w.cls, where) ? w.cls : null,
      ),
    },
    student: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        where.id === w.student.id ? { ...w.student, class: w.cls } : null,
      ),
    },
    classMembership: {
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
        w.memberships
          .filter((r) => matches(r, where))
          .map((r) => ({ ...r, class: w.cls })),
      ),
    },
    studentEnrollment: {
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
        w.enrollments
          .filter((r) => matches({ ...r, class: w.cls }, where))
          .map((r) => ({ ...r, class: w.cls })),
      ),
      findFirst: vi.fn(
        async ({ where }: { where: Record<string, unknown> }) =>
          w.enrollments.find((r) => matches({ ...r, class: w.cls }, where)) ??
          null,
      ),
    },
  },
}));
vi.mock("@/lib/eywa/managedAccounts", () => ({
  getManagedClassGrants: vi.fn(async () => {
    if (!w.managed) return null;
    const { accountUsable } = await import("@/lib/eywa/managedPolicy");
    if (
      !accountUsable(
        w.user as never,
        w.managed as never,
        w.managed.binding as never,
      )
    )
      throw new Error("denied");
    return {
      bindingId: w.managed.bindingId,
      sourceClasses: w.managed.sourceClasses,
      leaseExpiresAt: w.managed.leaseExpiresAt,
      ...(w.user.isAdmin
        ? { branchAdminScope: { branchId: w.user.branchId } }
        : {}),
    };
  }),
}));
import {
  freshInsightV2Access,
  freshInsightV2Student,
} from "@/lib/math-insight/v2Access";
import {
  requireOwnedStudent,
  requireOwnedStudentInClass,
} from "@/lib/ownership";
import { db } from "@/lib/db";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const userId = id(1),
  classId = id(2),
  studentId = id(3),
  branchId = id(4),
  bindingId = id(5),
  sourceClassId = id(6);
const request = new Request(
  `http://localhost/api/students/${studentId}/math-srs/insight`,
  { headers: { "x-math-insight-version": "2" } },
);
const identity = () =>
  ({ ...w.user, menus: ["srs"] }) as unknown as AccountAccess;
const clock = new Date("2026-10-23T01:00:00Z");
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(clock);
  vi.clearAllMocks();
  w.user = {
    id: userId,
    name: "Synthetic teacher",
    email: "synthetic@example.test",
    role: "director",
    approvalStatus: "approved",
    isAdmin: false,
    isSuperAdmin: false,
    branchId,
    branchRole: "teacher",
    disabledMenus: [],
    branch: { disabledMenus: [], ownerDisabledMenus: [], menuRevision: 0 },
    sessionVersion: 0,
    deletedAt: null,
    suspendedAt: null,
    manualSuspendedAt: null,
    authSource: "local",
  };
  w.cls = {
    id: classId,
    userId,
    branchId,
    eywaBindingId: null,
    grade: "초3",
    name: "Synthetic class",
    active: true,
    closedAt: null,
    permissionRevision: BigInt(1),
    eywaClassId: sourceClassId,
  };
  w.student = {
    id: studentId,
    classId,
    branchId,
    name: "Synthetic student",
    eywaBindingId: null,
    isTest: false,
    eywaWithdrawnAt: null,
  };
  w.managed = null;
  w.memberships = [];
  w.enrollments = [];
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
function managed() {
  w.user.authSource = "eywa";
  w.cls.eywaBindingId = bindingId;
  w.student.eywaBindingId = bindingId;
  w.managed = {
    bindingId,
    status: "confirmed",
    currentUserId: userId,
    blockReasons: [],
    branchRoleOverride: null,
    leaseExpiresAt: new Date(clock.getTime() + 600_000),
    sourceEpoch: id(8),
    tenantRevocationGeneration: BigInt(1),
    accountRevocationGeneration: BigInt(1),
    securityRevision: BigInt(1),
    classListRevision: BigInt(1),
    sourceClasses: [
      {
        id: sourceClassId,
        permissionRevision: "1",
        capabilities: ["student:read"],
        validUntil: null,
      },
    ],
    user: w.user,
    binding: {
      id: bindingId,
      targetBranchId: branchId,
      retiredAt: null,
      mode: "active",
      enabled: true,
      healthy: true,
      leaseExpiresAt: new Date(clock.getTime() + 600_000),
      sourceEpoch: id(8),
      tenantRevocationGeneration: BigInt(1),
    },
  };
  w.memberships = [
    {
      classId,
      userId,
      bindingId,
      role: "homeroom",
      startsOn: new Date("2026-01-01"),
      endsOn: null,
      revokedAt: null,
      capabilities: ["student:read"],
    },
  ];
  w.enrollments = [
    {
      id: id(9),
      studentId,
      classId,
      bindingId,
      startsOn: new Date("2026-01-01"),
      endsOn: null,
      endedAt: null,
      isTransferred: false,
      onHold: false,
    },
  ];
}
async function parity(explicit = false) {
  const access = await freshInsightV2Access(request, identity());
  if (!access) return { fresh: false, existing: false };
  const existing = explicit
    ? await requireOwnedStudentInClass(
        studentId,
        classId,
        access.account,
        "student:read",
      )
    : await requireOwnedStudent(studentId, access.account, "student:read");
  const fresh = await freshInsightV2Student(
    studentId,
    explicit ? { classId } : {},
    access,
  );
  expect(!fresh.response).toBe(existing.ok);
  return { fresh: !fresh.response, existing: existing.ok };
}
describe("read-only ownership parity", () => {
  it.each([false, true])(
    "preserves local owner, branch manager and superadmin scopes (explicit=%s)",
    async (explicit) => {
      expect((await parity(explicit)).fresh).toBe(true);
      w.cls.userId = id(11);
      expect((await parity(explicit)).fresh).toBe(false);
      w.user.isAdmin = true;
      w.user.branchRole = "manager";
      expect((await parity(explicit)).fresh).toBe(true);
      w.cls.branchId = id(12);
      expect((await parity(explicit)).fresh).toBe(false);
      w.user.isSuperAdmin = true;
      expect((await parity(explicit)).fresh).toBe(true);
    },
  );
  it.each([false, true])(
    "preserves managed active grant/on-hold behavior (explicit=%s)",
    async (explicit) => {
      managed();
      expect((await parity(explicit)).fresh).toBe(true);
      w.enrollments[0].onHold = true;
      expect((await parity(explicit)).fresh).toBe(true);
      w.student.isTest = true;
      expect((await parity(explicit)).fresh).toBe(false);
    },
  );
  it.each([
    "revoked",
    "future-membership",
    "expired-membership",
    "missing-capability",
    "stale-source-revision",
    "source-expired",
    "inactive-class",
    "closed-class",
    "cross-branch",
    "future-enrollment",
    "ended-enrollment",
    "transfer-today",
    "withdrawn",
  ])("preserves managed denial %s", async (reason) => {
    managed();
    if (reason === "revoked") w.memberships[0].revokedAt = clock;
    if (reason === "future-membership")
      w.memberships[0].startsOn = new Date("2026-10-24");
    if (reason === "expired-membership")
      w.memberships[0].endsOn = new Date("2026-10-22");
    if (reason === "missing-capability")
      w.memberships[0].capabilities = ["test:read"];
    if (reason === "stale-source-revision")
      w.cls.permissionRevision = BigInt(2);
    if (reason === "source-expired")
      (
        w.managed!.sourceClasses as { validUntil: string | null }[]
      )[0].validUntil = "2026-10-22T00:00:00Z";
    if (reason === "inactive-class") w.cls.active = false;
    if (reason === "closed-class") w.cls.closedAt = clock;
    if (reason === "cross-branch") w.cls.branchId = id(12);
    if (reason === "future-enrollment")
      w.enrollments[0].startsOn = new Date("2026-10-24");
    if (reason === "ended-enrollment") w.enrollments[0].endedAt = clock;
    if (reason === "transfer-today") {
      w.enrollments[0].endsOn = new Date("2026-10-23");
      w.enrollments[0].isTransferred = true;
    }
    if (reason === "withdrawn") w.student.eywaWithdrawnAt = clock;
    expect((await parity()).fresh).toBe(false);
    expect((await parity(true)).fresh).toBe(false);
  });
  it("normal enrollment end is inclusive, transfer end is exclusive", async () => {
    managed();
    w.enrollments[0].endsOn = new Date("2026-10-23");
    expect((await parity()).fresh).toBe(true);
    w.enrollments[0].isTransferred = true;
    expect((await parity()).fresh).toBe(false);
  });
  it("managed branch administrator follows the existing local override", async () => {
    managed();
    w.user.isAdmin = true;
    w.user.branchRole = "manager";
    w.managed!.branchRoleOverride = "manager";
    w.memberships = [];
    expect((await parity()).fresh).toBe(true);
    w.cls.branchId = id(12);
    expect((await parity()).fresh).toBe(false);
  });
  it("denies an expired/revoked local lease without forced upstream refresh", async () => {
    managed();
    w.managed!.leaseExpiresAt = clock;
    expect(await freshInsightV2Access(request, identity())).toBeNull();
    w.managed!.leaseExpiresAt = new Date(clock.getTime() + 600_000);
    w.managed!.blockReasons = ["revoked"];
    expect(await freshInsightV2Access(request, identity())).toBeNull();
    expect(db.eywaManagedAccount.findUnique).toHaveBeenCalled();
  });
  it("re-reads a revoked local membership during inference without any grant cache", async () => {
    managed();
    const initial = await freshInsightV2Access(request, identity());
    expect(initial).not.toBeNull();
    expect(
      (await freshInsightV2Student(studentId, {}, initial!)).response,
    ).toBeNull();
    w.memberships[0].revokedAt = clock;
    expect(
      (await freshInsightV2Student(studentId, {}, initial!)).response?.status,
    ).toBe(403);
  });
});

vi.mock("@/lib/math-srs/courseTeacherRoutes", () => ({
  teacherGate: vi.fn(async () => ({ account: identity(), response: null })),
}));
vi.mock("@/lib/math-srs/serverStore", () => ({
  readSrsState: vi.fn(async () => ({
    revision: 0,
    state: (await import("@/lib/math-srs/serverState")).emptySrsState(),
  })),
}));
vi.mock("@/lib/studio-ai/api", () => ({ runModelApi: vi.fn() }));
import { handleInsightV2Request } from "@/lib/math-insight/v2Routes";
import { runModelApi } from "@/lib/studio-ai/api";
import { readSrsState } from "@/lib/math-srs/serverStore";
it.each(["membership", "enrollment", "lease"])(
  "POST revalidates current managed %s after inference",
  async (reason) => {
    managed();
    vi.stubEnv("GEMINI_API_KEY", "synthetic-key");
    vi.mocked(runModelApi).mockImplementationOnce(async (input) => {
      if (reason === "membership") w.memberships[0].revokedAt = clock;
      if (reason === "enrollment") w.enrollments[0].endedAt = clock;
      if (reason === "lease") w.managed!.leaseExpiresAt = clock;
      const data = JSON.parse(input.prompt.split("\n").at(-1)!);
      return JSON.stringify({
        snapshotId: data.snapshotId,
        intent: "context",
        factIds: [data.facts[0].id],
        evidenceIds: [],
        candidateIds: [],
      });
    });
    const req = new Request(request.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-math-insight-version": "2",
      },
      body: JSON.stringify({ query: "보존된 계획" }),
    });
    const response = await handleInsightV2Request(req, {
      params: Promise.resolve({ id: studentId }),
    });
    expect(response.status).toBe(403);
    expect(await response.json()).not.toHaveProperty("data");
    expect(readSrsState).toHaveBeenCalledTimes(1);
    expect(runModelApi).toHaveBeenCalledTimes(1);
    vi.unstubAllEnvs();
  },
);
