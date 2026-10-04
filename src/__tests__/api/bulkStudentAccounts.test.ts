// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScopeViewer } from "@/lib/ownerScope";
import { managedRelationDb } from "../helpers/managedRelationDb";

const state = vi.hoisted(() => ({
  db: {} as object,
  session: vi.fn(),
  hash: vi.fn(),
  audit: vi.fn(),
  create: vi.fn(),
  lock: vi.fn(),
  accounts: [] as {
    studentId: string;
    loginId: string;
    passwordHash?: string;
  }[],
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ getSessionUser: state.session }));
vi.mock("@/lib/db", () => ({
  db: new Proxy({}, { get: (_target, key) => Reflect.get(state.db, key) }),
}));
vi.mock("@/lib/eywa/managedAccounts", () => ({
  refreshManagedBinding: vi.fn(),
  getManagedClassGrants: vi.fn(),
}));
vi.mock("@/lib/learn/pinHash", () => ({ hashStudentPin: state.hash }));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_path: string, handler: unknown) => handler,
}));
import { GET, POST } from "@/app/api/classes/[id]/student-accounts/route";
import { refreshManagedBinding } from "@/lib/eywa/managedAccounts";
import { planBulkStudentAccounts } from "@/lib/learn/bulkStudentAccounts";

const classId = "40000000-0000-4000-8000-000000000001";
const branchId = "50000000-0000-4000-8000-000000000001";
const bindingId = "60000000-0000-4000-8000-000000000001";
const now = new Date("2026-10-04T03:00:00Z");
const manager: ScopeViewer = {
  id: "manager",
  branchId,
  branchRole: "manager",
  isAdmin: false,
};
let fixture: ReturnType<typeof managedRelationDb>;
function addStudent(
  number: number,
  name = `김학생${number}`,
  phoneLast4: string | null = "0042",
) {
  const studentId = `30000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
  fixture.tables.student.push({
    id: studentId,
    name,
    phoneLast4,
    classId,
    branchId,
    eywaBindingId: bindingId,
    eywaWithdrawnAt: null,
    isTest: false,
    sourceStatus: "enrolled",
    studentAccount: null,
  });
  fixture.tables.studentEnrollment.push({
    id: `enrollment-${number}`,
    studentId,
    classId,
    bindingId,
    startsOn: new Date("2026-01-01"),
    endsOn: null,
    endedAt: null,
    onHold: false,
    isTransferred: false,
  });
  return fixture.tables.student.at(-1)!;
}
const request = (method = "POST", origin = "http://localhost") =>
  new NextRequest(`http://localhost/api/classes/${classId}/student-accounts`, {
    method,
    headers: { origin },
  });
const context = () => ({ params: Promise.resolve({ id: classId }) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.stubEnv("AUTH_URL", "http://localhost");
  fixture = managedRelationDb();
  fixture.tables.class.push({
    id: classId,
    branchId,
    eywaBindingId: bindingId,
    active: true,
    closedAt: null,
    name: "중2 A반",
  });
  fixture.tables.eywaBinding.push({
    id: bindingId,
    targetBranchId: branchId,
    enabled: true,
    healthy: true,
    mode: "active",
    retiredAt: null,
    leaseExpiresAt: new Date(now.getTime() + 60_000),
  });
  state.accounts = [];
  state.session.mockResolvedValue(manager);
  state.hash.mockImplementation(async (pin) => `hash:${pin}`);
  state.lock.mockResolvedValue([]);
  state.create.mockImplementation(async ({ data }) => {
    const item = data[0];
    if (
      state.accounts.some(
        (account) =>
          account.studentId === item.studentId ||
          account.loginId === item.loginId,
      )
    )
      return { count: 0 };
    state.accounts.push(item);
    const student = fixture.tables.student.find(
      (student) => student.id === item.studentId,
    )!;
    student.studentAccount = { loginId: item.loginId };
    return { count: 1 };
  });
  Object.assign(fixture.tx, {
    $queryRaw: state.lock,
    accountAuditLog: { create: state.audit },
    studentAccount: {
      findMany: vi.fn(async ({ where }) =>
        state.accounts.filter((account) =>
          where.loginId.in.includes(account.loginId),
        ),
      ),
      findUnique: vi.fn(
        async ({ where }) =>
          state.accounts.find(
            (account) => account.studentId === where.studentId,
          ) ?? null,
      ),
      createMany: state.create,
    },
  });
  state.db = { ...fixture.tx, $transaction: fixture.transaction };
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("class bulk account issuance", () => {
  it.each([
    manager,
    { ...manager, branchRole: "owner" as const },
    { id: "admin", branchId, isAdmin: true },
    { id: "global", isSuperAdmin: true },
  ])("creates only on explicit manager-or-higher POST: $id", async (viewer) => {
    state.session.mockResolvedValue(viewer);
    addStudent(1, "김민서", "0000");
    const preview = await GET(request("GET"), context());
    expect(preview.status).toBe(200);
    expect((await preview.json()).data.ready).toBe(1);
    expect(state.create).not.toHaveBeenCalled();
    expect(state.hash).not.toHaveBeenCalled();
    const response = await POST(request(), context());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.data).toMatchObject({
      issued: 1,
      existing: 0,
      ready: 0,
      skipped: 0,
    });
    expect(state.hash).toHaveBeenCalledWith("0000");
    expect(state.accounts[0]).toMatchObject({
      loginId: "김민서",
      issuedById: viewer.id,
      mustChangePassword: true,
    });
    expect(JSON.stringify(body)).not.toContain('0000"');
    expect(JSON.stringify(state.audit.mock.calls)).not.toContain("hash:");
    const original = { ...state.accounts[0] };
    const replay = await POST(request(), context());
    expect((await replay.json()).data).toMatchObject({
      issued: 0,
      existing: 1,
    });
    expect(state.accounts[0]).toEqual(original);
    expect(state.hash).toHaveBeenCalledTimes(1);
  });
  it.each([
    null,
    { id: "teacher", branchId, branchRole: "teacher" },
    { id: "admin-without-branch", isAdmin: true },
    { ...manager, branchId: "elsewhere" },
  ])(
    "denies unauthorized caller before credential writes: %j",
    async (viewer) => {
      state.session.mockResolvedValue(viewer);
      addStudent(1);
      expect((await POST(request(), context())).status).toBe(
        viewer ? 403 : 401,
      );
      expect(state.create).not.toHaveBeenCalled();
    },
  );
  it("rejects a cross-site request even from a manager", async () => {
    expect(
      (await POST(request("POST", "https://elsewhere.test"), context())).status,
    ).toBe(403);
    expect(refreshManagedBinding).not.toHaveBeenCalled();
  });
  it.each([{ active: false }, { closedAt: now }])(
    "rejects a closed class before source refresh: %j",
    async (fields) => {
      Object.assign(fixture.tables.class[0], fields);
      expect((await POST(request(), context())).status).toBe(409);
      expect(refreshManagedBinding).not.toHaveBeenCalled();
      expect(state.create).not.toHaveBeenCalled();
    },
  );
  it("requires a valid active binding", async () => {
    addStudent(1);
    fixture.tables.eywaBinding[0].leaseExpiresAt = now;
    expect((await POST(request(), context())).status).toBe(409);
    expect(state.create).not.toHaveBeenCalled();
  });
  it("excludes hold, withdrawn, test, transferred and future students", async () => {
    addStudent(1);
    addStudent(2);
    fixture.tables.studentEnrollment[1].onHold = true;
    addStudent(3).eywaWithdrawnAt = now;
    addStudent(4).isTest = true;
    addStudent(5);
    fixture.tables.studentEnrollment[4].startsOn = new Date("2026-11-01");
    addStudent(6);
    Object.assign(fixture.tables.studentEnrollment[5], {
      endsOn: new Date("2026-10-04"),
      isTransferred: true,
    });
    addStudent(7);
    fixture.tables.studentEnrollment[6].endsOn = new Date("2026-10-04");
    const body = await (await POST(request(), context())).json();
    expect(body.data.total).toBe(2);
    expect(body.data.issued).toBe(2);
  });
  it("reports missing phone and duplicate actual names without inventing IDs or PINs", async () => {
    addStudent(1, "홍길동");
    addStudent(2, "홍길동");
    addStudent(3, "김다름", null);
    addStudent(4, "기존학생").studentAccount = { loginId: "legacy01" };
    state.accounts.push({
      studentId: fixture.tables.student[3].id,
      loginId: "legacy01",
      passwordHash: "original",
    });
    const body = await (await POST(request(), context())).json();
    expect(body.data).toMatchObject({ issued: 0, existing: 1, skipped: 3 });
    expect(
      body.data.students.map((student: { status: string }) => student.status),
    ).toEqual([
      "duplicate_name",
      "duplicate_name",
      "missing_phone",
      "existing",
    ]);
    expect(state.hash).not.toHaveBeenCalled();
    expect(state.accounts[0].passwordHash).toBe("original");
  });
  it("rechecks enrollment after acquiring the student lock", async () => {
    addStudent(1);
    state.lock.mockImplementation(async (parts) => {
      if (parts[0].includes("FROM student"))
        fixture.tables.studentEnrollment[0].endedAt = now;
      return [];
    });
    expect((await (await POST(request(), context())).json()).data.total).toBe(
      0,
    );
    expect(state.create).not.toHaveBeenCalled();
  });
  it("handles a concurrent account insert without resetting its password", async () => {
    const student = addStudent(1);
    state.create.mockImplementationOnce(async () => {
      state.accounts.push({
        studentId: student.id,
        loginId: "previous-id",
        passwordHash: "racing-original",
      });
      return { count: 0 };
    });
    const body = await (await POST(request(), context())).json();
    expect(body.data.students[0]).toMatchObject({
      status: "existing",
      loginId: "previous-id",
    });
    expect(state.accounts[0].passwordHash).toBe("racing-original");
  });
  it("rejects a globally taken name but preserves already issued accounts", () => {
    const student = addStudent(1, "김민서");
    expect(
      planBulkStudentAccounts(
        [student as never],
        [{ studentId: "elsewhere", loginId: "김민서" }],
      )[0].status,
    ).toBe("duplicate_name");
  });
});
