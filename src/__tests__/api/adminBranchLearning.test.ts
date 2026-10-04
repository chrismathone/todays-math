// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/admin/branches/[id]/learning/route";
import { adminBranchLearningResponseSchema } from "@/contracts/adminBranchLearning.contract";
import { managedRelationDb } from "../helpers/managedRelationDb";

vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({
  db: {} as object,
  session: null as unknown,
}));
vi.mock("@/lib/auth", () => ({ auth: async () => state.session }));
vi.mock("@/lib/db", () => ({
  db: new Proxy({}, { get: (_t, k) => Reflect.get(state.db, k) }),
}));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_: string, handler: unknown) => handler,
}));
const refresh = vi.hoisted(() => vi.fn());
vi.mock("@/lib/eywa/managedAccounts", () => ({
  refreshManagedBinding: refresh,
  getManagedClassGrants: refresh,
}));

const id = (n: number) =>
  `20000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const branchA = id(1),
  branchB = id(2),
  teacher = id(3),
  otherTeacher = id(4),
  binding = id(5);
const now = new Date("2026-10-03T15:30:00Z"); // October 4 in Korea.
let fixture: ReturnType<typeof managedRelationDb>;
const transaction = vi.fn(),
  branch = vi.fn(),
  studentRead = vi.fn(),
  mutation = vi.fn();
function call(kind = "students", query = "", scope = branchA) {
  return GET(
    new Request(
      `http://localhost/api/admin/branches/${scope}/learning?kind=${kind}${query}`,
    ),
    { params: Promise.resolve({ id: scope }) },
  );
}
function cls(n: number, managed = false, extra = {}) {
  const row = {
    id: id(n),
    name: `반 ${n}`,
    grade: "중1",
    userId: teacher,
    branchId: branchA,
    active: true,
    closedAt: null,
    eywaBindingId: managed ? binding : null,
    ...extra,
  };
  fixture.tables.class.push(row);
  return row;
}
function student(n: number, classId: string, managed = false, extra = {}) {
  const row = {
    id: id(n),
    name: `학생 ${n}`,
    classId,
    branchId: branchA,
    useIndividualProgress: false,
    createdAt: now,
    updatedAt: now,
    schoolLevel: "중",
    schoolGrade: 2,
    sourceStatus: "enrolled",
    isTest: false,
    eywaBindingId: managed ? binding : null,
    eywaWithdrawnAt: null,
    studentAccount: null,
    phoneLast4: "1234",
    schoolName: "private school",
    ...extra,
  };
  fixture.tables.student.push(row);
  return row;
}
function account(extra = {}) {
  return {
    loginId: "김학생",
    issuedAt: now,
    lastLoginAt: null,
    disabledAt: null,
    lockedUntil: null,
    passwordHash: "private hash",
    initialPassword: "1234",
    ...extra,
  };
}
function enrollment(n: number, studentId: string, classId: string, extra = {}) {
  fixture.tables.studentEnrollment.push({
    id: id(n),
    studentId,
    classId,
    bindingId: binding,
    startsOn: new Date("2026-01-01"),
    endsOn: null,
    endedAt: null,
    onHold: false,
    isTransferred: false,
    ...extra,
  });
}
function member(n: number, classId: string, extra = {}) {
  fixture.tables.classMembership.push({
    id: id(n),
    classId,
    userId: otherTeacher,
    bindingId: binding,
    role: "homeroom",
    capabilities: ["class:read"],
    startsOn: null,
    endsOn: null,
    revokedAt: null,
    ...extra,
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  fixture = managedRelationDb();
  fixture.tables.user.push(
    {
      id: teacher,
      name: "담당 강사",
      branchId: branchA,
      deletedAt: null,
      email: "private@example.com",
    },
    {
      id: otherTeacher,
      name: "수업 강사",
      branchId: branchA,
      deletedAt: null,
      phone: "01012345678",
    },
  );
  state.session = {
    user: {
      id: id(99),
      isAdmin: true,
      isSuperAdmin: true,
      approvalStatus: "approved",
      menus: [],
    },
  };
  branch.mockImplementation(async ({ where }) =>
    [branchA, branchB].includes(where.id) ? { id: where.id } : null,
  );
  const client = fixture.tx;
  studentRead.mockImplementation((args) =>
    client.student.findMany({
      ...args,
      include: {
        class: true,
        enrollments: {
          where: args.select.enrollments.where,
          include: { class: true },
        },
      },
    }),
  );
  const classes = {
    ...client.class,
    findMany: vi.fn((args) =>
      client.class.findMany({ ...args, include: { user: true } }),
    ),
  };
  const memberships = {
    ...client.classMembership,
    findMany: vi.fn((args) =>
      client.classMembership.findMany({ ...args, include: { user: true } }),
    ),
  };
  const students = { ...client.student, findMany: studentRead };
  mutation.mockImplementation(() => {
    throw new Error("Read-only directory attempted a mutation");
  });
  for (const model of [classes, memberships, students])
    Object.assign(model, {
      create: mutation,
      createMany: mutation,
      update: mutation,
      updateMany: mutation,
      delete: mutation,
    });
  const tx = {
    ...client,
    branch: { findUnique: branch },
    class: classes,
    student: students,
    classMembership: memberships,
    $transaction: transaction,
    $queryRaw: mutation,
  };
  transaction.mockImplementation((work) => work(tx));
  state.db = tx;
});
afterEach(() => {
  expect(refresh).not.toHaveBeenCalled();
  expect(mutation).not.toHaveBeenCalled();
  vi.useRealTimers();
});

describe("superadmin canonical-branch learning directory", () => {
  it.each([
    null,
    { user: { id: teacher, isAdmin: false, approvalStatus: "approved" } },
    {
      user: {
        id: teacher,
        isAdmin: true,
        branchId: branchA,
        approvalStatus: "approved",
      },
    },
    {
      user: {
        id: teacher,
        isAdmin: true,
        branchId: branchB,
        approvalStatus: "approved",
      },
    },
    {
      user: {
        id: teacher,
        isAdmin: true,
        isSuperAdmin: true,
        approvalStatus: "pending",
      },
    },
    { student: { studentId: id(20) } },
  ])(
    "rejects unauthorized identities before any directory read",
    async (session) => {
      state.session = session;
      expect((await call()).status).toBe(
        !session || "student" in session ? 401 : 403,
      );
      expect(transaction).not.toHaveBeenCalled();
      expect(branch).not.toHaveBeenCalled();
    },
  );
  it.each([
    "&page=0",
    "&page=-1",
    "&page=1.2",
    "&page=Infinity",
    "&page=100001",
    "&pageSize=0",
    "&pageSize=51",
    "&page=2&page=3",
    "&login=unknown",
    "&classId=bad",
    "&q=" + "x".repeat(101),
    "&email=private",
    "&kind=classes",
  ])("rejects ambiguous/invalid queries %s", async (query) => {
    expect((await call("students", query)).status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });
  it("validates path/kind and fails closed for foreign or absent class filters", async () => {
    expect((await call("students", "", "bad")).status).toBe(400);
    expect((await call("unknown")).status).toBe(400);
    expect((await call("students", "", id(100))).status).toBe(404);
    const foreign = cls(10, false, { branchId: branchB });
    expect((await call("students", `&classId=${foreign.id}`)).status).toBe(404);
    expect((await call("classes", `&classId=${id(100)}`)).status).toBe(404);
    expect(studentRead).not.toHaveBeenCalled();
  });
  it("uses canonical Student and Class branches and deduplicates enrollment edges, preserving same-name identities", async () => {
    const a = cls(10, true),
      b = cls(11, true),
      pointer = cls(12, true),
      foreign = cls(13, true, { branchId: branchB });
    const shared = student(20, foreign.id, true, {
      name: "동명이인",
      useIndividualProgress: true,
    });
    enrollment(40, shared.id, a.id, { onHold: true });
    enrollment(41, shared.id, a.id);
    enrollment(42, shared.id, b.id, { onHold: true });
    enrollment(43, shared.id, foreign.id);
    enrollment(44, shared.id, pointer.id, { bindingId: id(100) });
    const duplicateName = student(21, pointer.id, true, { name: "동명이인" });
    enrollment(45, duplicateName.id, a.id);
    const foreignStudent = student(22, a.id, true, { branchId: branchB });
    enrollment(46, foreignStudent.id, a.id);
    const unassigned = student(23, a.id, false, { branchId: null });
    const test = student(24, a.id, true, { isTest: true });
    enrollment(47, test.id, a.id);
    const body = await (await call()).json();
    expect(body.data.map((s: { id: string }) => s.id)).toEqual([
      shared.id,
      duplicateName.id,
    ]);
    expect(body.data[0]).toMatchObject({
      classId: a.id,
      useIndividualProgress: true,
      classes: [
        { id: a.id, membership: "enrolled" },
        { id: b.id, membership: "on-hold" },
      ],
    });
    expect(JSON.stringify(body)).not.toContain(foreign.id);
    expect(JSON.stringify(body)).not.toContain(unassigned.id);
    expect(body.meta.total).toBe(2);
    const selected = await (await call("students", `&classId=${b.id}`)).json();
    expect(selected.meta.total).toBe(1);
    expect(selected.data[0].classId).toBe(b.id);
  });
  it("includes branch identities without current classes without leaking a foreign compatibility pointer", async () => {
    const foreign = cls(10, false, { branchId: branchB });
    const managed = student(20, foreign.id, true),
      local = student(21, foreign.id);
    const body = await (await call()).json();
    expect(body.data.map((s: { id: string }) => s.id)).toEqual([
      managed.id,
      local.id,
    ]);
    expect(
      body.data.every(
        (s: { classId: null; classes: unknown[] }) =>
          s.classId === null && !s.classes.length,
      ),
    ).toBe(true);
    expect(JSON.stringify(body)).not.toContain(foreign.id);
  });
  it("filters persisted issued/unissued/login states and login ID search before pagination, retaining withdrawn accounts", async () => {
    const c = cls(10);
    student(20, c.id);
    student(21, c.id, false, { studentAccount: account({ disabledAt: now }) });
    student(22, c.id, false, {
      studentAccount: account({ lockedUntil: new Date(now.getTime() + 1) }),
    });
    student(23, c.id, false, {
      studentAccount: account({ lockedUntil: now, loginId: "expired-lock" }),
    });
    student(24, c.id, false, {
      studentAccount: account({ loginId: "withdrawn" }),
      sourceStatus: "withdrawn",
      eywaWithdrawnAt: now,
    });
    expect(
      (await (await call("students", "&login=issued&pageSize=2&page=2")).json())
        .meta,
    ).toEqual({ total: 4, page: 2, pageSize: 2 });
    for (const [login, ids] of [
      ["unissued", [id(20)]],
      ["disabled", [id(21)]],
      ["locked", [id(22)]],
      ["enabled", [id(23), id(24)]],
    ] as const) {
      const body = await (await call("students", `&login=${login}`)).json();
      expect(body.data.map((s: { id: string }) => s.id)).toEqual(ids);
    }
    const body = await (await call("students", "&q=withdrawn")).json();
    expect(body.meta.total).toBe(1);
    expect(body.data[0]).toMatchObject({
      withdrawn: true,
      account: { loginId: "withdrawn", status: "enabled" },
    });
  });
  it("returns only safe account fields and prevents confidential projections, refreshes and writes", async () => {
    const c = cls(10);
    student(20, c.id, false, { studentAccount: account({ lastLoginAt: now }) });
    const response = await call();
    const body = await response.json();
    expect(body.data[0].account).toEqual({
      loginId: "김학생",
      status: "enabled",
      issuedAt: now.toISOString(),
      lastLoginAt: now.toISOString(),
    });
    expect(JSON.stringify(body)).not.toMatch(
      /password|hash|phone|1234|email|schoolName|private school/,
    );
    expect(JSON.stringify(studentRead.mock.calls[0][0].select)).not.toMatch(
      /phone|password|email|issuedBy|failedCount/,
    );
    expect(adminBranchLearningResponseSchema.safeParse(body).success).toBe(
      true,
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(refresh).not.toHaveBeenCalled();
    expect(mutation).not.toHaveBeenCalled();
  });
  it("counts current distinct enrolled students and persisted disabled accounts, excluding holds/withdrawals and KST transfer boundaries", async () => {
    const c = cls(10, true),
      ended = cls(11, true, { closedAt: now });
    const issued = student(20, c.id, true, {
      studentAccount: account({ disabledAt: now }),
    });
    enrollment(40, issued.id, c.id);
    enrollment(41, issued.id, c.id);
    const unissued = student(21, c.id, true);
    enrollment(42, unissued.id, c.id, { endsOn: new Date("2026-10-04") });
    const exclusions = [
      [{}, { onHold: true }],
      [{ sourceStatus: "withdrawn" }, {}],
      [{ eywaWithdrawnAt: now }, {}],
      [{ isTest: true }, {}],
      [{ branchId: branchB }, {}],
      [{}, { endedAt: now }],
      [{}, { startsOn: new Date("2026-10-05") }],
      [{}, { bindingId: id(100) }],
      [{}, { endsOn: new Date("2026-10-04"), isTransferred: true }],
    ];
    exclusions.forEach(([sExtra, eExtra], index) => {
      const s = student(25 + index, c.id, true, sExtra);
      enrollment(50 + index, s.id, c.id, eExtra);
    });
    enrollment(70, issued.id, ended.id);
    const body = await (await call("classes")).json();
    expect(body.data[0]).toMatchObject({
      id: c.id,
      active: true,
      enrolledCount: 2,
      issuanceSummary: { total: 2, issued: 1, unissued: 1 },
    });
    expect(body.data[1]).toMatchObject({
      id: ended.id,
      active: false,
      enrolledCount: 0,
      issuanceSummary: { total: 0, issued: 0, unissued: 0 },
    });
    expect(
      (await (await call("classes", "&login=disabled")).json()).meta.total,
    ).toBe(1);
    expect(adminBranchLearningResponseSchema.safeParse(body).success).toBe(
      true,
    );
  });
  it("shows only current safe teacher names and includes ended classes", async () => {
    const c = cls(10, true);
    member(30, c.id);
    member(31, c.id, { role: "slot" });
    member(32, c.id, { startsOn: new Date("2026-10-05"), userId: id(100) });
    fixture.tables.user.push({
      id: id(100),
      name: "미래 강사",
      branchId: branchA,
      deletedAt: null,
    });
    const foreignOwner = cls(11, false, { userId: id(101), active: false });
    fixture.tables.user.push({
      id: id(101),
      name: "타지점 강사",
      branchId: branchB,
      deletedAt: null,
    });
    const body = await (await call("classes")).json();
    expect(body.data[0].teachers).toEqual(["담당 강사", "수업 강사"]);
    expect(body.data[1]).toMatchObject({
      id: foreignOwner.id,
      active: false,
      teachers: [],
    });
    expect(JSON.stringify(body)).not.toMatch(
      /미래 강사|타지점 강사|private@example|01012345678|email|phone/,
    );
    expect(
      (await (await call("classes", "&q=수업 강사")).json()).meta.total,
    ).toBe(1);
  });
  it("paginates identities stably before clamping a removed last page; classes paginate independently", async () => {
    const c = cls(10);
    for (let n = 20; n < 25; n++) student(n, c.id, false, { name: "동명이인" });
    const first = await (await call("students", "&pageSize=2")).json();
    const second = await (await call("students", "&pageSize=2&page=2")).json();
    expect(first.data.map((s: { id: string }) => s.id)).toEqual([
      id(20),
      id(21),
    ]);
    expect(second.data.map((s: { id: string }) => s.id)).toEqual([
      id(22),
      id(23),
    ]);
    const last = await (
      await call("students", "&pageSize=2&page=99999")
    ).json();
    expect(last.meta).toEqual({ total: 5, page: 3, pageSize: 2 });
    cls(11);
    cls(12);
    expect(
      (await (await call("classes", "&pageSize=2&page=2")).json()).meta,
    ).toEqual({ total: 3, page: 2, pageSize: 2 });
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "RepeatableRead",
    });
  });
});
