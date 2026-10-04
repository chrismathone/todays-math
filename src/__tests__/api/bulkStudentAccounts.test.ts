// @vitest-environment node
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScopeViewer } from "@/lib/ownerScope";
import type { IssuedAccount } from "@/lib/learn/issueStudentAccount";
import { managedRelationDb } from "../helpers/managedRelationDb";

const state = vi.hoisted(() => ({
  db: {} as object,
  session: vi.fn(),
  hash: vi.fn(),
  audit: vi.fn(),
  create: vi.fn(),
  singleCreate: vi.fn(),
  lock: vi.fn(),
  accounts: [] as (Partial<IssuedAccount> & {
    studentId: string;
    loginId: string;
    passwordHash?: string;
  })[],
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
import { POST as issueOne } from "@/app/api/students/[id]/account/route";
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
    eywaStudentId: `70000000-0000-4000-8000-${String(number).padStart(12, "0")}`,
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
const posted = (body: string) =>
  new NextRequest(`http://localhost/api/classes/${classId}/student-accounts`, {
    method: "POST",
    headers: {
      origin: "http://localhost",
      "content-type": "application/json",
    },
    body,
  });
const context = () => ({ params: Promise.resolve({ id: classId }) });

const secondClassId = "40000000-0000-4000-8000-000000000002";
function addSecondEnrollment(studentId: string) {
  if (!fixture.tables.class.some((row) => row.id === secondClassId))
    fixture.tables.class.push({
      ...fixture.tables.class[0],
      id: secondClassId,
      name: "중2 B반",
    });
  fixture.tables.studentEnrollment.push({
    ...fixture.tables.studentEnrollment[0],
    id: `second-${studentId}`,
    studentId,
    classId: secondClassId,
  });
}
const postSecondClass = () =>
  POST(
    new NextRequest(
      `http://localhost/api/classes/${secondClassId}/student-accounts`,
      { method: "POST", headers: { origin: "http://localhost" } },
    ),
    { params: Promise.resolve({ id: secondClassId }) },
  );

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
  state.singleCreate.mockImplementation(async ({ data }) => {
    if (
      state.accounts.some(
        (row) =>
          row.studentId === data.studentId || row.loginId === data.loginId,
      )
    )
      throw new Prisma.PrismaClientKnownRequestError(
        "synthetic unique collision",
        {
          code: "P2002",
          clientVersion: "6.19.3",
        },
      );
    const account = {
      ...data,
      id: "synthetic-account",
      issuedAt: now,
      mustChangePassword: true,
      disabledAt: null,
      passwordChangedAt: null,
      lastLoginAt: null,
      lockedUntil: null,
      failedCount: 0,
    };
    state.accounts.push(account);
    fixture.tables.student.find(
      (row) => row.id === data.studentId,
    )!.studentAccount = { loginId: data.loginId };
    return account;
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
          state.accounts.find((account) =>
            where.studentId
              ? account.studentId === where.studentId
              : account.loginId === where.loginId,
          ) ?? null,
      ),
      createMany: state.create,
      create: state.singleCreate,
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
  it("preserves one account across sequential issuance in two enrolled classes", async () => {
    const student = addStudent(1);
    addSecondEnrollment(student.id);
    expect((await (await POST(request(), context())).json()).data.issued).toBe(
      1,
    );
    const original = structuredClone(state.accounts);
    const second = await postSecondClass();
    expect(second.status).toBe(200);
    expect((await second.json()).data).toMatchObject({
      total: 1,
      issued: 0,
      existing: 1,
      students: [{ studentId: student.id, status: "existing" }],
    });
    expect(state.accounts).toEqual(original);
    expect(state.hash).toHaveBeenCalledOnce();
    expect(state.audit).toHaveBeenCalledOnce();
  });
  it("settles simultaneous POSTs for one student in two classes as issued and existing", async () => {
    const student = addStudent(1);
    addSecondEnrollment(student.id);
    let release!: () => void;
    const bothHashing = new Promise<void>((resolve) => {
      release = resolve;
    });
    let arrivals = 0;
    state.hash.mockImplementation(async () => {
      if (++arrivals === 2) release();
      await bothHashing;
      return "synthetic-hash";
    });
    const responses = await Promise.all([
      POST(request(), context()),
      postSecondClass(),
    ]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    const bodies = await Promise.all(
      responses.map((response) => response.json()),
    );
    expect(bodies.map((body) => body.data.students[0].status).sort()).toEqual([
      "existing",
      "issued",
    ]);
    expect(state.accounts).toHaveLength(1);
    expect(state.create).toHaveBeenCalledTimes(2);
    expect(state.create.mock.calls.every(([args]) => args.skipDuplicates)).toBe(
      true,
    );
    expect(state.audit).toHaveBeenCalledOnce();
  });
  it.each(["bulk", "single"])(
    "preserves the %s winner when bulk and single issuance race with different login IDs",
    async (winner) => {
      const student = addStudent(1);
      addSecondEnrollment(student.id);
      // Unique failures occur before any fixture write. A losing request must
      // not roll back another request's committed rows from a shared snapshot.
      state.db = {
        ...fixture.tx,
        $transaction: (
          run: (tx: Prisma.TransactionClient) => Promise<unknown>,
        ) => run(fixture.tx),
      };
      let releaseBoth!: () => void;
      let releaseLoser!: () => void;
      const bothWriting = new Promise<void>((resolve) => {
        releaseBoth = resolve;
      });
      const winnerInserted = new Promise<void>((resolve) => {
        releaseLoser = resolve;
      });
      let arrivals = 0;
      const bulkInsert = state.create.getMockImplementation()!;
      const singleInsert = state.singleCreate.getMockImplementation()!;
      const insert =
        (kind: string, write: typeof bulkInsert) => async (args: object) => {
          if (++arrivals === 2) releaseBoth();
          await bothWriting;
          if (winner !== kind) await winnerInserted;
          const result = await write(args);
          if (winner === kind) releaseLoser();
          return result;
        };
      state.create.mockImplementation(insert("bulk", bulkInsert));
      state.singleCreate.mockImplementation(insert("single", singleInsert));
      const [bulkResponse, singleResponse] = await Promise.all([
        postSecondClass(),
        issueOne(
          new NextRequest(
            `http://localhost/api/students/${student.id}/account`,
            {
              method: "POST",
              headers: {
                origin: "http://localhost",
                "content-type": "application/json",
              },
              body: JSON.stringify({ loginId: "custom-student-id" }),
            },
          ),
          { params: Promise.resolve({ id: student.id }) },
        ),
      ]);
      expect(bulkResponse.status).toBe(200);
      expect(singleResponse.status).toBe(winner === "single" ? 201 : 409);
      const bulk = await bulkResponse.json();
      expect(bulk.data.students[0]).toMatchObject({
        studentId: student.id,
        status: winner === "bulk" ? "issued" : "existing",
        loginId: winner === "bulk" ? student.name : "custom-student-id",
      });
      if (winner === "bulk")
        expect((await singleResponse.json()).error.message).toBe(
          "이미 계정이 있습니다.",
        );
      expect(state.accounts).toHaveLength(1);
      expect(state.accounts[0].loginId).toBe(bulk.data.students[0].loginId);
      expect(state.audit).toHaveBeenCalledOnce();
      const original = structuredClone(state.accounts);
      const hashCalls = state.hash.mock.calls.length;
      expect((await (await postSecondClass()).json()).data).toMatchObject({
        issued: 0,
        existing: 1,
      });
      expect(state.accounts).toEqual(original);
      expect(state.hash).toHaveBeenCalledTimes(hashCalls);
      expect(state.audit).toHaveBeenCalledOnce();
    },
  );
  it("treats a disabled account as existing in every class without resetting account state", async () => {
    const student = addStudent(1);
    addSecondEnrollment(student.id);
    student.studentAccount = { loginId: "legacy-id" };
    state.accounts.push({
      studentId: student.id,
      loginId: "legacy-id",
      passwordHash: "synthetic-original-hash",
      disabledAt: now,
      mustChangePassword: false,
      passwordChangedAt: now,
      lastLoginAt: now,
      failedCount: 5,
      lockedUntil: new Date(now.getTime() + 60_000),
    });
    const original = structuredClone(state.accounts);
    for (const response of [
      await POST(request(), context()),
      await postSecondClass(),
    ]) {
      expect((await response.json()).data).toMatchObject({
        issued: 0,
        existing: 1,
      });
    }
    expect(state.accounts).toEqual(original);
    expect(state.create).not.toHaveBeenCalled();
    expect(state.hash).not.toHaveBeenCalled();
    expect(state.audit).not.toHaveBeenCalled();
  });
  it("issues a repeated selected studentId only once", async () => {
    const student = addStudent(1);
    const response = await POST(
      posted(
        JSON.stringify({ studentIds: [student.id, student.id, student.id] }),
      ),
      context(),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({ total: 1, issued: 1 });
    expect(state.accounts).toHaveLength(1);
    expect(state.create).toHaveBeenCalledOnce();
    expect(state.hash).toHaveBeenCalledOnce();
  });
  it("rechecks stale preview eligibility and preserves accounts issued since preview", async () => {
    const issuedElsewhere = addStudent(1);
    const departed = addStudent(2);
    const preview = await (await GET(request("GET"), context())).json();
    expect(preview.data.ready).toBe(2);
    issuedElsewhere.studentAccount = { loginId: "individually-issued" };
    state.accounts.push({
      studentId: issuedElsewhere.id,
      loginId: "individually-issued",
      passwordHash: "synthetic-original-hash",
    });
    fixture.tables.studentEnrollment[1].endedAt = now;
    const original = structuredClone(state.accounts);
    const response = await POST(
      posted(JSON.stringify({ studentIds: [issuedElsewhere.id, departed.id] })),
      context(),
    );
    expect((await response.json()).data).toMatchObject({
      total: 1,
      issued: 0,
      existing: 1,
    });
    expect(state.accounts).toEqual(original);
    expect(state.hash).not.toHaveBeenCalled();
    expect(state.create).not.toHaveBeenCalled();
  });
  it("rechecks a changed name and contact after acquiring the student lock", async () => {
    const student = addStudent(1, "이전이름", "0042");
    expect(
      (await (await GET(request("GET"), context())).json()).data.ready,
    ).toBe(1);
    state.lock.mockImplementation(async (parts) => {
      if (parts[0].includes("FROM student")) {
        student.name = "변경이름";
        student.phoneLast4 = "0000";
      }
      return [];
    });
    const body = await (
      await POST(
        posted(JSON.stringify({ studentIds: [student.id] })),
        context(),
      )
    ).json();
    expect(body.data.students[0]).toMatchObject({
      studentId: student.id,
      loginId: "변경이름",
      status: "issued",
    });
    expect(state.hash).toHaveBeenCalledExactlyOnceWith("0000");
  });
  it("does not merge different students with the same name across simultaneous class POSTs", async () => {
    const first = addStudent(1, "동명이인");
    const second = addStudent(2, "동명이인");
    addSecondEnrollment(second.id);
    fixture.tables.studentEnrollment[1].endedAt = now;
    let release!: () => void;
    const bothHashing = new Promise<void>((resolve) => {
      release = resolve;
    });
    let arrivals = 0;
    state.hash.mockImplementation(async () => {
      if (++arrivals === 2) release();
      await bothHashing;
      return "synthetic-hash";
    });
    const responses = await Promise.all([
      POST(request(), context()),
      postSecondClass(),
    ]);
    const bodies = await Promise.all(
      responses.map((response) => response.json()),
    );
    expect(bodies.map((body) => body.data.students[0].status).sort()).toEqual([
      "duplicate_name",
      "issued",
    ]);
    expect(bodies[0].data.students[0].studentId).toBe(first.id);
    expect(bodies[1].data.students[0].studentId).toBe(second.id);
    expect(state.accounts).toHaveLength(1);
    expect(fixture.tables.student).toHaveLength(2);
  });
  it("issues nobody for an empty selection and rejects a present malformed body", async () => {
    addStudent(1, "김민서", "0042");
    const empty = await POST(posted('{"studentIds":[]}'), context());
    expect(empty.status).toBe(200);
    expect((await empty.json()).data).toMatchObject({ issued: 0, total: 0 });
    expect(state.create).not.toHaveBeenCalled();
    for (const body of [
      "{",
      "[]",
      "{}",
      "null",
      "   ",
      '{"studentIds":"one"}',
      '{"studentIds":[],"extra":1}',
    ]) {
      const response = await POST(posted(body), context());
      expect(response.status, body).toBe(400);
    }
    expect(state.create).not.toHaveBeenCalled();
    expect(state.hash).not.toHaveBeenCalled();
  });
  it("intersects the confirmed ids with the current roster", async () => {
    const first = addStudent(1, "김민서", "0042");
    const second = addStudent(2, "이서연", "0099");
    const unknown = "30000000-0000-4000-8000-000000000099";
    const response = await POST(
      posted(JSON.stringify({ studentIds: [first.id, unknown] })),
      context(),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({ issued: 1, existing: 0 });
    expect(state.accounts.map((account) => account.studentId)).toEqual([
      first.id,
    ]);
    expect(JSON.stringify(body)).not.toContain("0042");
    expect(JSON.stringify(body)).not.toContain("password");
    expect(JSON.stringify(state.audit.mock.calls)).not.toContain("0042");
    const replay = await POST(
      posted(JSON.stringify({ studentIds: [first.id, second.id] })),
      context(),
    );
    const again = await replay.json();
    expect(again.data).toMatchObject({ issued: 1, existing: 1 });
    expect(state.accounts).toHaveLength(2);
  });
  it("keeps an unauthorized malformed body from issuing anyone", async () => {
    state.session.mockResolvedValue(null);
    addStudent(1);
    expect((await POST(posted("{"), context())).status).toBe(401);
    expect(state.create).not.toHaveBeenCalled();
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
