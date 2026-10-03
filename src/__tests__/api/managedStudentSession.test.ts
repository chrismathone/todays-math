// @vitest-environment node
import { NextRequest } from "next/server";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { managedRelationDb } from "../helpers/managedRelationDb";
import type { Control } from "@/lib/eywa/sync-contract";

type AccountRow = {
  id: string;
  studentId: string;
  loginId: string;
  passwordHash: string;
  mustChangePassword: boolean;
  disabledAt: Date | null;
  failedCount: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  passwordChangedAt: Date | null;
};
const savedEnv = vi.hoisted(() => {
  const previous = {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
  };
  process.env.AUTH_SECRET = "student-auth-test-secret-0123456789abcdef";
  process.env.AUTH_URL = "http://localhost:3000";
  return previous;
});
const state = vi.hoisted(() => ({
  db: {} as object,
  account: {} as AccountRow,
  findAccount: vi.fn(),
  updateAccount: vi.fn(),
  createAccount: vi.fn(),
  deleteAccount: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock(
  "next/headers",
  async () => (await import("../helpers/authRequestContext")).nextHeadersModule,
);
vi.mock("next/navigation", async (original) => ({
  ...(await original<object>()),
  redirect: (await import("../helpers/authRequestContext")).redirectMock,
}));
vi.mock("@/lib/db", () => ({
  db: new Proxy({}, { get: (_target, key) => Reflect.get(state.db, key) }),
}));
vi.mock("@/lib/eywa/managedAccounts", () => ({
  refreshManagedBinding: vi.fn(),
  managedLoginAllowed: vi.fn(),
  isManagedIdentity: vi.fn(),
}));

import { CredentialsSignin } from "next-auth";
import { auth, handlers, signIn } from "@/lib/auth";
import { POST as changePassword } from "@/app/api/learn/password/route";
import { refreshManagedBinding } from "@/lib/eywa/managedAccounts";
import { managedStudentAccess } from "@/lib/eywa/managedStudentAccess";
import { hashStudentPin } from "@/lib/learn/pinHash";
import { studentLoginDeps } from "@/lib/learn/loginDeps";
import { loadStudentLoginAccount } from "@/lib/learn/prismaLoginStore";
import { verifyStudentPin } from "@/lib/learn/studentLogin";
import {
  cookieHeaderFor,
  decodeSessionToken,
  resetRequest,
  sessionCookieFromJar,
  TEST_ORIGIN,
  withoutJwtClaims,
} from "../helpers/authRequestContext";

const accountId = "10000000-0000-4000-8000-000000000001";
const studentId = "20000000-0000-4000-8000-000000000001";
const branchId = "30000000-0000-4000-8000-000000000001";
const bindingId = "40000000-0000-4000-8000-000000000001";
const tenantId = "50000000-0000-4000-8000-000000000001";
const epoch = "60000000-0000-4000-8000-000000000001";
const classId = "70000000-0000-4000-8000-000000000001";
const sourceStudentId = "80000000-0000-4000-8000-000000000001";
const now = new Date("2026-10-03T14:00:00Z");
const pin = "5809";
let passwordHash = "";
let fixture: ReturnType<typeof managedRelationDb>;
let source: Control;

function applySource() {
  Object.assign(fixture.tables.eywaBinding[0], {
    enabled: source.enabled,
    healthy: source.healthy,
    sourceEpoch: source.sourceEpoch,
    targetBranchId: source.targetBranchId,
    securityRevision: BigInt(source.securityRevision),
    tenantRevocationGeneration: BigInt(source.tenantRevocationGeneration),
    leaseExpiresAt: new Date(Date.parse(source.validatedAt) + 60_000),
    control: structuredClone(source),
  });
}
beforeAll(async () => {
  passwordHash = await hashStudentPin(pin);
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  resetRequest();
  fixture = managedRelationDb();
  source = {
    schemaVersion: 2,
    bindingId,
    tenantId,
    targetBranchId: branchId,
    sourceEpoch: epoch,
    securityRevision: "1",
    tenantRevocationGeneration: "0",
    enabled: true,
    healthy: true,
    mode: "active",
    validatedAt: now.toISOString(),
    nextEffectiveAt: null,
    users: [],
  };
  fixture.tables.eywaBinding.push({
    id: bindingId,
    tenantId,
    mode: "active",
    retiredAt: null,
  });
  applySource();
  fixture.tables.student.push({
    id: studentId,
    classId,
    name: "학생",
    eywaBindingId: bindingId,
    branchId,
    eywaStudentId: sourceStudentId,
    sourceStatus: "enrolled",
    isTest: false,
    eywaWithdrawnAt: null,
  });
  fixture.tables.class.push({
    id: classId,
    branchId,
    eywaBindingId: bindingId,
    active: true,
    closedAt: null,
  });
  fixture.tables.studentEnrollment.push({
    id: "enrollment",
    studentId,
    classId,
    bindingId,
    startsOn: new Date("2026-01-01"),
    endsOn: null,
    endedAt: null,
    onHold: false,
    isTransferred: false,
  });
  fixture.tables.progress.push({
    id: "history",
    studentId,
    classId,
    completed: true,
  });
  state.account = {
    id: accountId,
    studentId,
    loginId: "learner01",
    passwordHash,
    mustChangePassword: false,
    disabledAt: null,
    failedCount: 0,
    lockedUntil: null,
    lastLoginAt: null,
    passwordChangedAt: null,
  };
  state.findAccount.mockImplementation(
    async ({ where }: { where: Record<string, unknown> }) => {
      if (
        Object.entries(where).some(
          ([key, value]) => Reflect.get(state.account, key) !== value,
        )
      )
        return null;
      return {
        ...state.account,
        student:
          fixture.tables.student.find((row) => row.id === studentId) ?? null,
      };
    },
  );
  state.updateAccount.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => {
      const { failedCount, ...rest } = data;
      Object.assign(state.account, rest);
      if (typeof failedCount === "number")
        state.account.failedCount = failedCount;
      else if (failedCount && typeof failedCount === "object")
        state.account.failedCount += Reflect.get(failedCount, "increment");
      return { ...state.account };
    },
  );
  state.db = {
    ...fixture.tx,
    studentAccount: {
      findUnique: state.findAccount,
      update: state.updateAccount,
      updateMany: async () => ({ count: 0 }),
      create: state.createAccount,
      delete: state.deleteAccount,
    },
    studentLoginMiss: { findUnique: async () => null },
    accountAuditLog: { create: vi.fn(async () => ({})) },
  };
  vi.mocked(refreshManagedBinding).mockImplementation(async (id) => {
    expect(id).toBe(bindingId);
    applySource();
  });
});
afterEach(() => {
  vi.useRealTimers();
});
afterAll(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
const info = () => ({
  accountId,
  studentId,
  name: "학생",
  mustChangePassword: false,
});
async function login() {
  resetRequest();
  await signIn("student", {
    loginId: "learner01",
    password: pin,
    redirect: false,
  });
  const value = sessionCookieFromJar();
  expect(value).not.toBeNull();
  return `authjs.session-token=${value}`;
}
async function readSession(cookie: string) {
  resetRequest({ cookie });
  return auth();
}

describe("managed student password login and session revocation", () => {
  it("keeps the private revocation stamp in the JWT and out of both public session surfaces", async () => {
    const cookie = await login();
    const claims = withoutJwtClaims(
      await decodeSessionToken(cookie.split("=")[1]),
    );
    expect(claims).toEqual({
      student: info(),
      managedStudentStamp: expect.any(String),
    });
    expect(await readSession(cookie)).toEqual({
      student: info(),
      expires: expect.any(String),
    });
    const response = await handlers.GET(
      new NextRequest(`${TEST_ORIGIN}/api/auth/session`, {
        headers: { cookie },
      }),
    );
    expect(await response.json()).toEqual({
      student: info(),
      expires: expect.any(String),
    });
  });

  it("OFF suspends password login and an existing session without deleting accounts, hashes or learning history", async () => {
    const cookie = await login();
    const history = structuredClone(fixture.tables.progress);
    source.enabled = false;
    source.tenantRevocationGeneration = "1";
    applySource();
    expect(await readSession(cookie)).toBeNull();
    const response = await handlers.GET(
      new NextRequest(`${TEST_ORIGIN}/api/auth/session`, {
        headers: { cookie },
      }),
    );
    expect(await response.json()).toBeNull();
    expect(response.headers.get("set-cookie") ?? "").toMatch(
      /authjs\.session-token=;/,
    );
    await expect(login()).rejects.toThrow(CredentialsSignin);
    expect(state.account.passwordHash).toBe(passwordHash);
    expect(state.account.disabledAt).toBeNull();
    expect(fixture.tables.progress).toEqual(history);
    expect(state.createAccount).not.toHaveBeenCalled();
    expect(state.deleteAccount).not.toHaveBeenCalled();
  });

  it("OFF then ON invalidates an old token even when no session request occurred during OFF", async () => {
    const oldCookie = await login();
    source.enabled = false;
    source.tenantRevocationGeneration = "1";
    applySource();
    source.enabled = true;
    applySource();
    expect(await readSession(oldCookie)).toBeNull();
    const freshCookie = await login();
    expect(await readSession(freshCookie)).toEqual({
      student: info(),
      expires: expect.any(String),
    });
    expect(state.account.passwordHash).toBe(passwordHash);
    expect(state.account.disabledAt).toBeNull();
  });

  it("denies pre-stamp managed tokens and tokens whose managed identity became local", async () => {
    const unstamped = await cookieHeaderFor({ student: info() });
    expect(await readSession(unstamped)).toBeNull();
    const cookie = await login();
    fixture.tables.student[0].eywaBindingId = null;
    expect(await readSession(cookie)).toBeNull();
    expect(await readSession(await login())).toEqual({
      student: info(),
      expires: expect.any(String),
    });
  });

  it.each(["epoch", "branch"])(
    "rejects an old stamp after a valid %s replacement",
    async (change) => {
      const cookie = await login();
      if (change === "epoch")
        source.sourceEpoch = "60000000-0000-4000-8000-000000000002";
      else {
        source.targetBranchId = "30000000-0000-4000-8000-000000000002";
        fixture.tables.student[0].branchId = source.targetBranchId;
        fixture.tables.class[0].branchId = source.targetBranchId;
      }
      applySource();
      expect(await readSession(cookie)).toBeNull();
      expect(await readSession(await login())).not.toBeNull();
    },
  );

  it("refreshes an expired lease, fails closed during an outage, and permits a fresh login after recovery", async () => {
    const cookie = await login();
    fixture.tables.eywaBinding[0].leaseExpiresAt = now;
    vi.mocked(refreshManagedBinding).mockRejectedValueOnce(
      new Error("unavailable"),
    );
    expect(await readSession(cookie)).toBeNull();
    expect(state.account.passwordHash).toBe(passwordHash);
    expect(await readSession(await login())).not.toBeNull();
    expect(refreshManagedBinding).toHaveBeenCalledTimes(3);
  });

  it("uses a valid cached session lease during an outage but requires a fresh control read for password login", async () => {
    const cookie = await login();
    vi.mocked(refreshManagedBinding).mockRejectedValue(
      new Error("unavailable"),
    );
    expect(await readSession(cookie)).not.toBeNull();
    await expect(login()).rejects.toThrow(CredentialsSignin);
    expect(state.account.disabledAt).toBeNull();
  });

  it("refuses renewal that leaves the lease expired and honors the source's scheduled boundary", async () => {
    fixture.tables.eywaBinding[0].leaseExpiresAt = now;
    vi.mocked(refreshManagedBinding).mockResolvedValue(undefined);
    expect((await managedStudentAccess(studentId, bindingId)).allowed).toBe(
      false,
    );
    fixture.tables.eywaBinding[0].leaseExpiresAt = new Date(
      now.getTime() + 60_000,
    );
    source.nextEffectiveAt = now.toISOString();
    fixture.tables.eywaBinding[0].control = source;
    expect((await managedStudentAccess(studentId, bindingId)).allowed).toBe(
      false,
    );
  });

  it("denies current-password changes when force refresh discovers OFF behind a valid cached session", async () => {
    const cookie = await login();
    source.enabled = false;
    source.tenantRevocationGeneration = "1";
    resetRequest({ cookie });
    const response = await changePassword(
      new NextRequest(`${TEST_ORIGIN}/api/learn/password`, {
        method: "POST",
        headers: { origin: TEST_ORIGIN, "content-type": "application/json" },
        body: JSON.stringify({ currentPassword: pin, newPassword: "7314" }),
      }),
    );
    expect(response.status).toBe(401);
    expect(state.account.passwordHash).toBe(passwordHash);
    expect(state.account.passwordChangedAt).toBeNull();
  });

  it("the shared current-password verifier rejects managed suspension and ON preserves manual disabledAt", async () => {
    source.enabled = false;
    const row = {
      ...state.account,
      student: { eywaBindingId: bindingId, eywaWithdrawnAt: null },
    };
    const account = await loadStudentLoginAccount(row);
    expect(await verifyStudentPin(account, pin, studentLoginDeps())).toBe(
      "invalid",
    );
    source.enabled = true;
    source.tenantRevocationGeneration = "1";
    const disabledAt = new Date(now.getTime() - 60_000);
    state.account.disabledAt = disabledAt;
    await expect(login()).rejects.toThrow(CredentialsSignin);
    expect(state.account.disabledAt).toEqual(disabledAt);
    expect(state.account.passwordHash).toBe(passwordHash);
  });

  it("current-password refresh rejects an old session when OFF -> ON was discovered during that request", async () => {
    const cookie = await login();
    source.tenantRevocationGeneration = "1";
    resetRequest({ cookie });
    const response = await changePassword(
      new NextRequest(`${TEST_ORIGIN}/api/learn/password`, {
        method: "POST",
        headers: { origin: TEST_ORIGIN, "content-type": "application/json" },
        body: JSON.stringify({ currentPassword: pin, newPassword: "7314" }),
      }),
    );
    expect(response.status).toBe(401);
    expect(state.account.passwordHash).toBe(passwordHash);
    expect(state.account.passwordChangedAt).toBeNull();
  });

  const invalid = [
    [
      "withdrawal",
      () => {
        fixture.tables.student[0].eywaWithdrawnAt = now;
      },
    ],
    [
      "source withdrawal without timestamp",
      () => {
        fixture.tables.student[0].sourceStatus = "withdrawn";
      },
    ],
    [
      "missing source identity",
      () => {
        fixture.tables.student[0].eywaStudentId = null;
      },
    ],
    [
      "test student",
      () => {
        fixture.tables.student[0].isTest = true;
      },
    ],
    [
      "student branch mismatch",
      () => {
        fixture.tables.student[0].branchId = "elsewhere";
      },
    ],
    [
      "class branch mismatch",
      () => {
        fixture.tables.class[0].branchId = "elsewhere";
      },
    ],
    [
      "closed class",
      () => {
        fixture.tables.class[0].closedAt = now;
      },
    ],
    [
      "inactive class",
      () => {
        fixture.tables.class[0].active = false;
      },
    ],
    [
      "on-hold enrollment",
      () => {
        fixture.tables.studentEnrollment[0].onHold = true;
      },
    ],
    [
      "ended enrollment",
      () => {
        fixture.tables.studentEnrollment[0].endedAt = now;
      },
    ],
    [
      "future enrollment",
      () => {
        fixture.tables.studentEnrollment[0].startsOn = new Date("2026-10-05");
      },
    ],
    [
      "transfer end boundary",
      () => {
        Object.assign(fixture.tables.studentEnrollment[0], {
          endsOn: new Date("2026-10-03"),
          isTransferred: true,
        });
      },
    ],
    [
      "missing binding",
      () => {
        fixture.tables.eywaBinding.length = 0;
      },
    ],
    [
      "retired binding",
      () => {
        fixture.tables.eywaBinding[0].retiredAt = now;
      },
    ],
    [
      "shadow binding",
      () => {
        fixture.tables.eywaBinding[0].mode = "shadow";
      },
    ],
    [
      "unhealthy source",
      () => {
        source.healthy = false;
        applySource();
      },
    ],
  ] as const;
  it.each(invalid)(
    "rejects a live session and password login after %s",
    async (_name, change) => {
      const cookie = await login();
      change();
      expect(await readSession(cookie)).toBeNull();
      await expect(login()).rejects.toThrow(CredentialsSignin);
      expect(state.account.disabledAt).toBeNull();
      expect(state.account.passwordHash).toBe(passwordHash);
      expect(state.createAccount).not.toHaveBeenCalled();
      expect(state.deleteAccount).not.toHaveBeenCalled();
    },
  );
});
