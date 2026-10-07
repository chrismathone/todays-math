// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import type { AppSettingTable } from "@/lib/journeyThemeStore";
import { managedRelationDb } from "../helpers/managedRelationDb";

const state = vi.hoisted(() => ({
  auth: vi.fn(),
  db: {} as Record<string, unknown>,
  access: vi.fn(),
  upsert: vi.fn(),
  read: vi.fn(),
  audit: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: state.auth }));
vi.mock("@/lib/db", () => ({
  db: new Proxy(
    {},
    {
      get: (_target, key) => {
        state.access(key);
        return Reflect.get(state.db, key);
      },
    },
  ),
}));
vi.mock("@/lib/eywa/managedAccounts", () => ({
  getManagedClassGrants: vi.fn(),
  refreshManagedBinding: vi.fn(),
}));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_path: string, handler: unknown) => handler,
}));

import { GET, PUT } from "@/app/api/students/[id]/learning-menus/route";
import { getManagedClassGrants } from "@/lib/eywa/managedAccounts";
import { saveManagedStudentLearningMenus } from "@/lib/learn/manageStudentLearningMenus";
import { studentLearningMenusKey } from "@/lib/learn/studentLearningMenusStore";

const studentA = "30000000-0000-4000-8000-000000000001";
const studentB = "30000000-0000-4000-8000-000000000002";
const classId = "40000000-0000-4000-8000-000000000001";
const branchId = "50000000-0000-4000-8000-000000000001";
const now = new Date("2026-10-07T03:00:00Z");
const manager = {
  id: "manager",
  branchId,
  branchRole: "manager" as const,
  isAdmin: false,
};
let fixture: ReturnType<typeof managedRelationDb>;
type SettingRow = NonNullable<
  Awaited<ReturnType<AppSettingTable["findUnique"]>>
>;
let rows: Map<string, SettingRow>;
let auditRows: unknown[];
const ctx = (id = studentA) => ({ params: Promise.resolve({ id }) });
const request = (
  method: string,
  body?: unknown,
  headers: Record<string, string> = { origin: "http://localhost" },
  id = studentA,
) =>
  new NextRequest(`http://localhost/api/students/${id}/learning-menus`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
const login = (user: Record<string, unknown> = manager) =>
  state.auth.mockResolvedValue({
    user: { approvalStatus: "approved", ...user },
  });
const csrfHeaders: Record<string, string>[] = [
  {},
  { origin: "http://evil.test" },
  { origin: "http://localhost", "sec-fetch-site": "cross-site" },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.stubEnv("AUTH_URL", "http://localhost");
  fixture = managedRelationDb();
  rows = new Map();
  auditRows = [];
  fixture.tables.class.push({
    id: classId,
    branchId,
    userId: "former-teacher",
    eywaBindingId: "binding",
    eywaClassId: "source-class",
    permissionRevision: BigInt(1),
    active: true,
    closedAt: null,
  });
  for (const id of [studentA, studentB]) {
    fixture.tables.student.push({
      id,
      classId,
      branchId,
      eywaBindingId: "binding",
      isTest: false,
      eywaWithdrawnAt: null,
    });
    fixture.tables.studentEnrollment.push({
      id: `enrollment-${id}`,
      studentId: id,
      classId,
      bindingId: "binding",
      startsOn: new Date("2026-01-01"),
      endsOn: null,
      endedAt: null,
      onHold: false,
      isTransferred: false,
    });
  }
  state.read.mockImplementation(
    async ({ where }) => rows.get(where.key) ?? null,
  );
  state.upsert.mockImplementation(async ({ where, create, update }) => {
    const existing = rows.get(where.key);
    const row = {
      ...(existing ?? create),
      ...(existing ? update : {}),
      updatedAt: now,
    };
    rows.set(where.key, row);
    return row;
  });
  state.audit.mockImplementation(async ({ data }) => {
    auditRows.push(data);
    return data;
  });
  Object.assign(fixture.tx, {
    appSetting: { findUnique: state.read, upsert: state.upsert },
    accountAuditLog: { create: state.audit },
  });
  state.transaction.mockImplementation(
    async (work: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
      const previousRows = structuredClone(rows);
      const previousAudit = structuredClone(auditRows);
      try {
        return await fixture.transaction(work);
      } catch (error) {
        rows = previousRows;
        auditRows = previousAudit;
        throw error;
      }
    },
  );
  state.db = { ...fixture.tx, $transaction: state.transaction };
  vi.mocked(getManagedClassGrants).mockResolvedValue(null);
  login();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("scoped per-student learning menu management", () => {
  it.each([
    ["anonymous", null, 401],
    ["student", { student: { id: studentA } }, 401],
    [
      "unapproved manager",
      { user: { ...manager, approvalStatus: "pending" } },
      401,
    ],
    [
      "rejected admin",
      { user: { ...manager, isAdmin: true, approvalStatus: "rejected" } },
      401,
    ],
    [
      "teacher",
      {
        user: {
          id: "teacher",
          branchId,
          branchRole: "teacher",
          approvalStatus: "approved",
        },
      },
      403,
    ],
    [
      "unscoped admin",
      { user: { id: "admin", isAdmin: true, approvalStatus: "approved" } },
      403,
    ],
  ])(
    "rejects %s before any operational DB access",
    async (_label, session, status) => {
      state.auth.mockResolvedValue(session);
      expect((await GET(request("GET"), ctx())).status).toBe(status);
      expect(
        (await PUT(request("PUT", { enabled: ["lectures"] }), ctx())).status,
      ).toBe(status);
      expect(state.access).not.toHaveBeenCalled();
      expect(state.read).not.toHaveBeenCalled();
      expect(state.upsert).not.toHaveBeenCalled();
      expect(state.audit).not.toHaveBeenCalled();
    },
  );

  it.each(csrfHeaders)(
    "denies missing/cross-site CSRF evidence before operational DB access: %j",
    async (headers) => {
      expect(
        (await PUT(request("PUT", { enabled: [] }, headers), ctx())).status,
      ).toBe(403);
      expect(state.access).not.toHaveBeenCalled();
    },
  );

  it.each([
    undefined,
    {},
    { enabled: "lectures" },
    { enabled: ["unsupported-menu"] },
    { enabled: ["lectures", "lectures"] },
    { enabled: ["unknown"] },
    { enabled: [], studentId: studentB },
    { enabled: [], version: 1 },
  ])(
    "rejects malformed/duplicate/unknown menus without DB access: %j",
    async (body) => {
      expect((await PUT(request("PUT", body), ctx())).status).toBe(400);
      expect(state.access).not.toHaveBeenCalled();
    },
  );

  it("rejects malformed JSON and student IDs before scope or settings queries", async () => {
    const malformed = new NextRequest(
      "http://localhost/api/students/x/learning-menus",
      {
        method: "PUT",
        headers: { origin: "http://localhost" },
        body: "{",
      },
    );
    expect((await PUT(malformed, ctx())).status).toBe(400);
    expect((await GET(request("GET"), ctx("../student"))).status).toBe(400);
    expect(
      (await PUT(request("PUT", { enabled: [] }), ctx("invalid"))).status,
    ).toBe(400);
    expect(state.access).not.toHaveBeenCalled();
  });

  it.each([
    manager,
    { ...manager, branchRole: "owner" },
    { ...manager, branchRole: "teacher", isAdmin: true },
    { id: "global", isSuperAdmin: true },
  ])(
    "allows the existing account policy for $id / $branchRole",
    async (viewer) => {
      login(viewer);
      const initial = await GET(request("GET"), ctx());
      expect(initial.status).toBe(200);
      expect(initial.headers.get("cache-control")).toBe("no-store");
      expect(await initial.json()).toEqual({
        data: { enabled: [], canManage: true, updatedAt: null },
      });
      const saved = await PUT(request("PUT", { enabled: ["lectures"] }), ctx());
      expect(saved.status).toBe(200);
      expect(await saved.json()).toEqual({
        data: {
          enabled: ["lectures"],
          canManage: true,
          updatedAt: now.toISOString(),
        },
      });
      expect(state.audit).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: viewer.id,
          action: "student.learning-menus.update",
          outcome: "success",
          details: {
            studentId: studentA,
            branchId,
            previousEnabled: [],
            enabled: ["lectures"],
          },
        }),
      });
    },
  );

  it("permits an explicit English grant and revokes it without affecting another student", async () => {
    expect(
      (await PUT(request("PUT", { enabled: ["english-listening"] }), ctx()))
        .status,
    ).toBe(200);
    expect((await GET(request("GET"), ctx())).status).toBe(200);
    expect(
      (await (await GET(request("GET"), ctx(studentB))).json()).data.enabled,
    ).toEqual([]);
    expect((await PUT(request("PUT", { enabled: [] }), ctx())).status).toBe(
      200,
    );
    expect(
      (await (await GET(request("GET"), ctx())).json()).data.enabled,
    ).toEqual([]);
  });
  it("keeps two students independent, replaces grants and disables everything with []", async () => {
    const studentsBefore = structuredClone(fixture.tables.student);
    expect(
      (await PUT(request("PUT", { enabled: ["lectures", "textbook"] }), ctx()))
        .status,
    ).toBe(200);
    expect(
      (
        await PUT(
          request("PUT", { enabled: ["textbook"] }, undefined, studentB),
          ctx(studentB),
        )
      ).status,
    ).toBe(200);
    expect((await PUT(request("PUT", { enabled: [] }), ctx())).status).toBe(
      200,
    );
    expect(await (await GET(request("GET"), ctx())).json()).toMatchObject({
      data: { enabled: [] },
    });
    expect(
      await (
        await GET(request("GET", undefined, undefined, studentB), ctx(studentB))
      ).json(),
    ).toMatchObject({ data: { enabled: ["textbook"] } });
    expect(rows.get(studentLearningMenusKey(studentA))).toMatchObject({
      value: { version: 1, enabled: [] },
      updatedById: manager.id,
    });
    expect(auditRows).toHaveLength(3);
    expect(auditRows[2]).toMatchObject({
      details: { previousEnabled: ["lectures", "textbook"], enabled: [] },
    });
    expect(fixture.tables.student).toEqual(studentsBefore);
  });

  it("rejects crossbranch admins without reading or writing any setting", async () => {
    login({ ...manager, branchId: "another-branch", isAdmin: true });
    expect((await GET(request("GET"), ctx())).status).toBe(403);
    expect(
      (await PUT(request("PUT", { enabled: ["lectures"] }), ctx())).status,
    ).toBe(403);
    expect(state.read).not.toHaveBeenCalled();
    expect(state.upsert).not.toHaveBeenCalled();
    expect(state.audit).not.toHaveBeenCalled();
  });

  it("rejects a student whose branch disagrees with its authorized class", async () => {
    fixture.tables.student[0].branchId = "another-branch";
    expect((await PUT(request("PUT", { enabled: [] }), ctx())).status).toBe(
      403,
    );
    expect(state.read).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing student and never creates an orphan setting", async () => {
    fixture.tables.student = [];
    expect((await GET(request("GET"), ctx())).status).toBe(404);
    expect((await PUT(request("PUT", { enabled: [] }), ctx())).status).toBe(
      404,
    );
    expect(state.upsert).not.toHaveBeenCalled();
  });

  it.each(["ended", "withdrawn", "test"])(
    "denies an invalid managed enrollment: %s",
    async (mode) => {
      if (mode === "ended") fixture.tables.studentEnrollment[0].endedAt = now;
      if (mode === "withdrawn") fixture.tables.student[0].eywaWithdrawnAt = now;
      if (mode === "test") fixture.tables.student[0].isTest = true;
      expect((await PUT(request("PUT", { enabled: [] }), ctx())).status).toBe(
        403,
      );
      expect(state.upsert).not.toHaveBeenCalled();
    },
  );

  it("uses current enrollment even when the compatibility class points to a different branch", async () => {
    fixture.tables.class.push({
      id: "legacy-class",
      branchId: "other",
      userId: "other",
      eywaBindingId: "binding",
    });
    fixture.tables.student[0].classId = "legacy-class";
    fixture.tables.studentEnrollment[0].onHold = true;
    expect(
      (await PUT(request("PUT", { enabled: ["textbook"] }), ctx())).status,
    ).toBe(200);
  });

  it("honors managed manager scope with isAdmin false", async () => {
    vi.mocked(getManagedClassGrants).mockResolvedValue({
      bindingId: "binding",
      sourceEpoch: "epoch",
      classListRevision: BigInt(1),
      leaseExpiresAt: new Date(now.getTime() + 60_000),
      sourceClasses: [],
      branchAdminScope: { branchId },
    });
    expect(
      (await PUT(request("PUT", { enabled: ["lectures"] }), ctx())).status,
    ).toBe(200);
  });

  it("denies a managed capability that expires during the write recheck", async () => {
    const grants = {
      bindingId: "binding",
      sourceEpoch: "epoch",
      classListRevision: BigInt(1),
      leaseExpiresAt: new Date(now.getTime() + 60_000),
      sourceClasses: [],
      branchAdminScope: { branchId },
    };
    vi.mocked(getManagedClassGrants)
      .mockResolvedValueOnce(grants)
      .mockResolvedValue({ ...grants, leaseExpiresAt: now });
    expect(
      (await PUT(request("PUT", { enabled: ["lectures"] }), ctx())).status,
    ).toBe(403);
    expect(state.upsert).not.toHaveBeenCalled();
    expect(state.audit).not.toHaveBeenCalled();
  });

  it.each(["enrollment", "class-branch", "student-branch"])(
    "rechecks %s after authorization and before writes",
    async (mode) => {
      state.transaction.mockImplementation(async (work) => {
        if (mode === "enrollment")
          fixture.tables.studentEnrollment[0].endedAt = now;
        if (mode === "class-branch")
          fixture.tables.class[0].branchId = "another-branch";
        if (mode === "student-branch")
          fixture.tables.student[0].branchId = "another-branch";
        return fixture.transaction(work);
      });
      expect(
        (await PUT(request("PUT", { enabled: ["lectures"] }), ctx())).status,
      ).toBe(403);
      expect(state.upsert).not.toHaveBeenCalled();
      expect(state.audit).not.toHaveBeenCalled();
    },
  );

  it("denies unauthorized direct service calls before accessing DB", async () => {
    const result = await saveManagedStudentLearningMenus(
      { id: "teacher", branchId, branchRole: "teacher" },
      studentA,
      [],
    );
    expect(result.ok).toBe(false);
    expect(state.access).not.toHaveBeenCalled();
  });

  it("propagates read/write failures and rolls back settings if the audit fails", async () => {
    state.read.mockRejectedValueOnce(new Error("offline"));
    await expect(GET(request("GET"), ctx())).rejects.toThrow("offline");
    state.upsert.mockRejectedValueOnce(new Error("write unavailable"));
    await expect(
      PUT(request("PUT", { enabled: ["lectures"] }), ctx()),
    ).rejects.toThrow("write unavailable");
    expect(rows.size).toBe(0);
    expect(auditRows).toEqual([]);
    state.audit.mockRejectedValueOnce(new Error("audit unavailable"));
    await expect(
      PUT(request("PUT", { enabled: ["textbook"] }), ctx()),
    ).rejects.toThrow("audit unavailable");
    expect(rows.size).toBe(0);
    expect(auditRows).toEqual([]);
  });
});
