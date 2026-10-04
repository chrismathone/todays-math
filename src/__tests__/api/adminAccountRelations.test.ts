// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { managedRelationDb } from "../helpers/managedRelationDb";
import { GET } from "@/app/api/admin/users/[id]/relations/route";
import { adminRelationsResponseSchema } from "@/contracts/adminRelations.contract";

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

const id = (n: number) =>
  `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const teacher = id(1),
  otherTeacher = id(2),
  branchA = id(3),
  branchB = id(4),
  binding = id(5);
const now = new Date("2026-10-03T15:30:00Z"); // Already October 4 in Korea.
let fixture: ReturnType<typeof managedRelationDb>;
const mutation = vi.fn(() => {
  throw new Error("Read-only endpoint attempted a mutation");
});
const branch = vi.fn();
const transaction = vi.fn();
const refresh = vi.hoisted(() => vi.fn());
vi.mock("@/lib/eywa/managedAccounts", () => ({
  refreshManagedBinding: refresh,
  getManagedClassGrants: refresh,
}));
function call(kind = "classes", query = "", target = teacher, scope = branchA) {
  return GET(
    new Request(
      `http://localhost/api/admin/users/${target}/relations?branchId=${scope}&kind=${kind}${query}`,
    ),
    { params: Promise.resolve({ id: target }) },
  );
}
function cls(
  n: number,
  userId = otherTeacher,
  branchId: string | null = branchA,
  managed = true,
) {
  const row = {
    id: id(n),
    userId,
    branchId,
    name: `반 ${n}`,
    grade: "중1",
    active: true,
    closedAt: null,
    eywaBindingId: managed ? binding : null,
    eywaClassId: managed ? id(n + 1000) : null,
  };
  fixture.tables.class.push(row);
  return row;
}
function member(n: number, classId: string, extra = {}) {
  fixture.tables.classMembership.push({
    id: id(n),
    classId,
    userId: teacher,
    bindingId: binding,
    role: "homeroom",
    capabilities: ["class:read", "student:read"],
    startsOn: null,
    endsOn: null,
    revokedAt: null,
    ...extra,
  });
}
function student(n: number, classId: string, extra = {}) {
  const row = {
    id: id(n),
    classId,
    branchId: branchA,
    eywaBindingId: binding,
    eywaStudentId: id(n + 1000),
    name: `학생 ${n}`,
    schoolLevel: "중",
    schoolGrade: 2,
    isTest: false,
    eywaWithdrawnAt: null,
    sourceStatus: "active",
    studentAccount: null,
    ...extra,
  };
  fixture.tables.student.push(row);
  return row;
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
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  fixture = managedRelationDb();
  fixture.tables.user.push({ id: teacher, branchId: branchA, deletedAt: null });
  fixture.tables.eywaBinding.push({
    id: binding,
    targetBranchId: branchA,
    enabled: true,
    healthy: true,
    mode: "active",
    retiredAt: null,
    leaseExpiresAt: null,
  });
  state.session = {
    user: {
      id: id(99),
      isAdmin: true,
      isSuperAdmin: true,
      approvalStatus: "approved",
      menus: [],
    },
  };
  branch.mockResolvedValue({ id: branchA });
  // Extend the existing query-evaluating fixture with the projections/order/pagination used by this endpoint.
  const client = fixture.tx;
  const classes = {
    ...client.class,
    findMany: vi.fn(async (args) => {
      const rows = await client.class.findMany(args);
      return rows
        .sort(
          (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
        )
        .slice(args.skip ?? 0, (args.skip ?? 0) + (args.take ?? rows.length));
    }),
  };
  const memberships = {
    ...client.classMembership,
    findMany: vi.fn((args) =>
      client.classMembership.findMany({ ...args, include: { class: true } }),
    ),
  };
  const students = {
    ...client.student,
    findMany: vi.fn(async (args) => {
      const rows = await client.student.findMany({
        ...args,
        include: {
          class: true,
          enrollments: {
            where: args.select.enrollments.where,
            include: { class: true },
          },
        },
      });
      return rows
        .sort(
          (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
        )
        .slice(args.skip ?? 0, (args.skip ?? 0) + (args.take ?? rows.length));
    }),
  };
  const tx = {
    ...client,
    class: classes,
    classMembership: memberships,
    student: students,
    branch: { findUnique: branch },
    $transaction: transaction,
  };
  for (const model of [classes, memberships, students]) {
    Object.assign(model, {
      create: mutation,
      createMany: mutation,
      update: mutation,
      updateMany: mutation,
      delete: mutation,
    });
  }
  transaction.mockImplementation((work) => work(tx));
  state.db = tx;
});
afterEach(() => {
  vi.useRealTimers();
});

describe("superadmin read-only account relationships", () => {
  it.each([
    null,
    { user: { id: teacher, isAdmin: true, approvalStatus: "approved" } },
    {
      user: {
        id: teacher,
        isAdmin: true,
        isSuperAdmin: true,
        approvalStatus: "pending",
      },
    },
  ])(
    "rejects an unauthorized identity before reading target data",
    async (session) => {
      state.session = session;
      expect((await call()).status).toBe(session ? 403 : 401);
      expect(transaction).not.toHaveBeenCalled();
      expect(branch).not.toHaveBeenCalled();
    },
  );
  it.each([
    "&page=0",
    "&page=-1",
    "&page=1.5",
    "&page=Infinity",
    "&page=100001",
    "&pageSize=51",
    "&pageSize=0",
    "&page=2&page=3",
    `&branchId=${branchB}`,
  ])("rejects invalid or ambiguous pagination/scope: %s", async (query) => {
    expect((await call("classes", query)).status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });
  it("validates UUID, required branch and kind before querying", async () => {
    expect((await call("classes", "", "bad")).status).toBe(400);
    expect((await call("unknown")).status).toBe(400);
    expect((await call("classes", "", teacher, "bad")).status).toBe(400);
    const r = await GET(
      new Request(
        `http://localhost/api/admin/users/${teacher}/relations?kind=students`,
      ),
      { params: Promise.resolve({ id: teacher }) },
    );
    expect(r.status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });
  it("returns 404 for a missing/deleted/moved account or missing branch", async () => {
    expect((await call("classes", "", id(90))).status).toBe(404);
    expect((await call("classes", "", teacher, branchB)).status).toBe(404);
    fixture.tables.user[0].deletedAt = now;
    expect((await call()).status).toBe(404);
    fixture.tables.user[0].deletedAt = null;
    branch.mockResolvedValue(null);
    expect((await call()).status).toBe(404);
  });
  it("includes only active owned or current teacher memberships, never the entire manager branch", async () => {
    const owned = cls(10, teacher, branchA, false),
      current = cls(11),
      sameBranch = cls(12),
      foreign = cls(13, teacher, branchB);
    member(30, current.id);
    member(31, current.id, { role: "slot" });
    member(32, foreign.id);
    const revoked = cls(14),
      future = cls(15),
      ended = cls(16),
      malformed = cls(17),
      mismatch = cls(18),
      closed = cls(19),
      noRead = cls(20);
    member(33, revoked.id, { revokedAt: now });
    member(34, future.id, { startsOn: new Date("2026-10-05") });
    member(35, ended.id, { endsOn: new Date("2026-10-03") });
    member(36, malformed.id, { role: "owner" });
    member(37, mismatch.id, { bindingId: id(100) });
    member(38, closed.id);
    closed.active = false;
    member(39, noRead.id, {
      role: "delegate",
      capabilities: ["progress:write"],
    });
    const endedOwned = cls(21, teacher, branchA, false);
    endedOwned.active = false;
    const closedOwned = cls(22, teacher, branchA, false);
    Object.assign(closedOwned, { closedAt: now });
    const body = await (await call()).json();
    expect(body.data.map((r: { id: string }) => r.id)).toEqual([
      owned.id,
      current.id,
    ]);
    expect(body.data[0]).toMatchObject({
      owner: true,
      memberships: [],
      sync: "local",
    });
    expect(body.data[1]).toMatchObject({
      owner: false,
      memberships: ["homeroom", "slot"],
    });
    expect(body.meta.total).toBe(2);
    expect(body.data.some((r: { id: string }) => r.id === sameBranch.id)).toBe(
      false,
    );
    expect(adminRelationsResponseSchema.safeParse(body).success).toBe(true);
    expect(mutation).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
  it("keeps unassigned ownership in the null branch and excludes historical branch classes", async () => {
    fixture.tables.user[0].branchId = null;
    const own = cls(10, teacher, null, false);
    cls(11, teacher);
    cls(12, otherTeacher, null, false);
    const body = await (
      await call("classes", "", teacher, "unassigned")
    ).json();
    expect(body.data.map((r: { id: string }) => r.id)).toEqual([own.id]);
    expect(branch).not.toHaveBeenCalled();
  });
  it("returns persistent class issuance counts including disabled accounts and distinct current enrollment identities", async () => {
    const c = cls(10, teacher);
    const issued = student(20, c.id, {
      sourceStatus: "enrolled",
      studentAccount: { disabledAt: now, lockedUntil: null },
    });
    enrollment(40, issued.id, c.id);
    enrollment(41, issued.id, c.id);
    const unissued = student(21, c.id, { sourceStatus: "enrolled" });
    enrollment(42, unissued.id, c.id);
    const held = student(22, c.id, { sourceStatus: "enrolled" });
    enrollment(43, held.id, c.id, { onHold: true });
    const foreign = student(23, c.id, {
      branchId: branchB,
      sourceStatus: "enrolled",
    });
    enrollment(44, foreign.id, c.id);
    const wrongBinding = student(24, c.id, {
      eywaBindingId: id(100),
      sourceStatus: "enrolled",
    });
    enrollment(45, wrongBinding.id, c.id);
    const withdrawn = student(25, c.id, { sourceStatus: "withdrawn" });
    enrollment(46, withdrawn.id, c.id);
    const body = await (await call()).json();
    expect(body.data[0].issuanceSummary).toEqual({
      total: 2,
      issued: 1,
      unissued: 1,
    });
    // A fresh read after issuing an account must update the persisted summary.
    Object.assign(unissued, {
      studentAccount: { disabledAt: now, lockedUntil: null },
    });
    const fresh = await (await call()).json();
    expect(fresh.data[0].issuanceSummary).toEqual({
      total: 2,
      issued: 2,
      unissued: 0,
    });
    expect(adminRelationsResponseSchema.safeParse(fresh).success).toBe(true);
    const select = (
      state.db as { student: { findMany: ReturnType<typeof vi.fn> } }
    ).student.findMany.mock.calls[0][0].select;
    expect(select.studentAccount).toEqual({ select: { studentId: true } });
    expect(JSON.stringify(select)).not.toMatch(/password|phone|loginId|email/);
    expect(mutation).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
  it("uses active multi-enrollment edges, not compatibility classId, and returns one student once", async () => {
    const a = cls(10),
      b = cls(11),
      unrelated = cls(12),
      foreign = cls(13, teacher, branchB);
    member(30, a.id);
    member(31, b.id);
    const shared = student(20, unrelated.id, {
      studentAccount: {
        disabledAt: null,
        lockedUntil: null,
        passwordHash: "secret",
        loginId: "private",
      },
    });
    enrollment(40, shared.id, a.id);
    enrollment(41, shared.id, b.id, { onHold: true });
    enrollment(42, shared.id, a.id); // Duplicate source records must not duplicate the identity/class.
    enrollment(44, shared.id, foreign.id); // A valid student identity must not expose a foreign class name.
    const pointerOnly = student(21, a.id);
    enrollment(43, pointerOnly.id, unrelated.id);
    const legacy = student(22, a.id, {
      eywaBindingId: null,
      eywaStudentId: null,
      schoolLevel: null,
      schoolGrade: null,
    });
    for (const [n, extra, edge] of [
      [23, { isTest: true }, {}],
      [24, { eywaWithdrawnAt: now }, {}],
      [25, { sourceStatus: "withdrawn" }, {}],
      [26, { branchId: branchB }, {}],
      [27, {}, { bindingId: id(100) }],
      [28, {}, { startsOn: new Date("2026-10-05") }],
      [29, {}, { endedAt: now }],
      [32, {}, { endsOn: new Date("2026-10-04"), isTransferred: true }],
      [34, { eywaBindingId: id(100) }, {}],
    ] as const) {
      const s = student(n, a.id, extra);
      enrollment(n + 100, s.id, a.id, edge);
    }
    const inclusive = student(33, unrelated.id);
    enrollment(133, inclusive.id, a.id, { endsOn: new Date("2026-10-04") });
    const body = await (await call("students")).json();
    expect(body.data.map((r: { id: string }) => r.id)).toEqual([
      shared.id,
      legacy.id,
      inclusive.id,
    ]);
    expect(body.data[0]).toMatchObject({
      grade: "중2",
      login: "enabled",
      classes: [
        { id: a.id, membership: "enrolled" },
        { id: b.id, membership: "on-hold" },
      ],
    });
    expect(body.data[1]).toMatchObject({
      grade: "중1",
      login: "unissued",
      sync: "local",
      classes: [{ membership: "legacy" }],
    });
    expect(JSON.stringify(body)).not.toMatch(
      /secret|private|passwordHash|loginId|schoolName|eywaLastReportText/,
    );
    expect(body.meta.total).toBe(3);
    expect(adminRelationsResponseSchema.safeParse(body).success).toBe(true);
    expect(JSON.stringify(body)).not.toContain(foreign.name);
    const select = (
      state.db as { student: { findMany: ReturnType<typeof vi.fn> } }
    ).student.findMany.mock.calls[0][0].select;
    expect(select.studentAccount).toEqual({
      select: { disabledAt: true, lockedUntil: true },
    });
  });
  it("paginates unique students in stable order and clamps a removed last page", async () => {
    const c = cls(10, teacher, branchA, false);
    for (let n = 20; n < 25; n++)
      student(n, c.id, {
        name: "동명이인",
        eywaBindingId: null,
        eywaStudentId: null,
      });
    const first = await (await call("students", "&pageSize=2")).json();
    const second = await (await call("students", "&pageSize=2&page=2")).json();
    expect(first.data.map((r: { id: string }) => r.id)).toEqual([
      id(20),
      id(21),
    ]);
    expect(second.data.map((r: { id: string }) => r.id)).toEqual([
      id(22),
      id(23),
    ]);
    const clamped = await (
      await call("students", "&pageSize=2&page=99999")
    ).json();
    expect(clamped.meta).toEqual({ total: 5, page: 3, pageSize: 2 });
    expect(clamped.data[0].id).toBe(id(24));
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "RepeatableRead",
    });
  });
  it("observes active/paused/expired sync state and distinguishes enabled/disabled/locked/unissued login settings without refresh", async () => {
    const c = cls(10, teacher);
    const row = fixture.tables.eywaBinding[0];
    Object.assign(row, {
      tenantId: id(80),
      sourceEpoch: id(81),
      securityRevision: BigInt(2),
      tenantRevocationGeneration: BigInt(3),
      leaseExpiresAt: new Date(now.getTime() + 60000),
      control: {
        schemaVersion: 2,
        bindingId: binding,
        tenantId: id(80),
        targetBranchId: branchA,
        sourceEpoch: id(81),
        securityRevision: "2",
        tenantRevocationGeneration: "3",
        enabled: true,
        healthy: true,
        mode: "active",
        validatedAt: now.toISOString(),
        nextEffectiveAt: null,
        users: [],
      },
    });
    for (const [n, account] of [
      [20, null],
      [21, { disabledAt: now, lockedUntil: null }],
      [22, { disabledAt: null, lockedUntil: new Date(now.getTime() + 60000) }],
      [23, { disabledAt: null, lockedUntil: new Date(now.getTime() - 1) }],
    ] as const) {
      const s = student(n, c.id, { studentAccount: account });
      enrollment(n + 100, s.id, c.id);
    }
    const response = await call("students");
    const active = await response.json();
    expect(
      active.data.map((s: { login: string; sync: string }) => [
        s.login,
        s.sync,
      ]),
    ).toEqual([
      ["unissued", "active"],
      ["disabled", "active"],
      ["locked", "active"],
      ["enabled", "active"],
    ]);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    row.enabled = false;
    expect((await (await call("students")).json()).data[0].sync).toBe("paused");
    row.enabled = true;
    row.leaseExpiresAt = now;
    expect((await (await call()).json()).data[0].sync).toBe("unverified");
    row.leaseExpiresAt = new Date(now.getTime() + 60000);
    row.control.securityRevision = "1";
    expect((await (await call()).json()).data[0].sync).toBe("unverified");
    expect(refresh).not.toHaveBeenCalled();
    expect(mutation).not.toHaveBeenCalled();
  });
  it("includes membership end day in Korea and independently paginates classes", async () => {
    const a = cls(10),
      b = cls(11),
      c = cls(12);
    for (const [n, row] of [
      [30, a],
      [31, b],
      [32, c],
    ] as const)
      member(n, row.id, {
        startsOn: new Date("2026-10-04"),
        endsOn: new Date("2026-10-04"),
      });
    const body = await (await call("classes", "&page=2&pageSize=2")).json();
    expect(body.meta).toEqual({ page: 2, pageSize: 2, total: 3 });
    expect(body.data[0].id).toBe(c.id);
  });
  it("filters the complete roster before pagination and sorts by current class rather than the compatibility pointer", async () => {
    const a = cls(10),
      b = cls(11),
      unrelated = cls(12);
    a.name = "가반";
    b.name = "나반";
    member(30, a.id);
    member(31, b.id);
    const first = student(20, unrelated.id, {
      name: "홍길동",
      schoolLevel: "초",
      schoolGrade: 6,
    });
    const second = student(21, unrelated.id, {
      name: "김학생",
      studentAccount: { disabledAt: null, lockedUntil: null },
    });
    const held = student(22, unrelated.id, { name: "휴원 학생" });
    enrollment(40, first.id, a.id);
    enrollment(41, second.id, b.id);
    enrollment(42, held.id, a.id, { onHold: true });
    const sorted = await (
      await call("students", "&sort=class&pageSize=1")
    ).json();
    expect(sorted.data[0].id).toBe(first.id);
    expect(sorted.meta.total).toBe(3);
    expect(sorted.filters.classes).toEqual([
      { id: a.id, name: "가반" },
      { id: b.id, name: "나반" },
    ]);
    const filtered = await (
      await call(
        "students",
        `&classId=${a.id}&enrollment=enrolled&login=unissued&grade=${encodeURIComponent("초6")}&q=${encodeURIComponent("홍")}&page=999`,
      )
    ).json();
    expect(filtered.meta).toEqual({ page: 1, pageSize: 20, total: 1 });
    expect(filtered.data[0].id).toBe(first.id);
    const onHold = await (
      await call("students", `&classId=${a.id}&enrollment=on-hold`)
    ).json();
    expect(onHold.data.map((s: { id: string }) => s.id)).toEqual([held.id]);
    const foreign = await (
      await call("students", `&classId=${unrelated.id}`)
    ).json();
    expect(foreign.meta.total).toBe(0);
    expect(foreign.data).toEqual([]);
  });
  it.each([
    "&sort=arbitrary",
    "&enrollment=withdrawn",
    "&classId=bad",
    "&login=unknown",
    "&direction=backwards",
    "&q=a&q=b",
  ])("rejects invalid student filters: %s", async (query) => {
    expect((await call("students", query)).status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });
});
