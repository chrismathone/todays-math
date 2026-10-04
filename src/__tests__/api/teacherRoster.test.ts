// @vitest-environment node
/**
 * 강사는 자기 반의 학생을 등록하지만 로그인 계정 발급·재발급·변경은 지점 관리자 이상만 한다.
 * 학생 명부 등록만으로 로그인 계정이 생성되지 않는다.
 *
 * 판정: `ownerScope.ts` 의 `canManageClassStudents`(자기 반 학생) ↔ `canManageRoster`(반 만들기·지점 전체).
 * «자기 반»은 판정이 아니라 **소유 범위**(`withinOwnerScope` — `Class.userId` 가 나)가 정한다.
 *
 * 🔴 짝으로 둔다 — «강사가 된다»만 시험하면 «누구나 된다»가 초록이고, «남의 반은 안 된다»만 시험하면
 *    «아무도 안 된다»가 초록이다. 그래서 같은 강사 세션으로 자기 반·남의 반·다른 지점 반을 나란히 본다.
 */
import { compare } from "bcryptjs";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pins = vi.hoisted(() => ({ queue: [] as string[] }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", async () => {
  const { prismaTestDouble } = await import("@/mocks/prismaTestDouble");
  const { composeLearnDb } = await import("@/mocks/learnTestDouble");
  return { db: composeLearnDb(prismaTestDouble) };
});
vi.mock("@/lib/concept/initialPassword", async (orig) => ({
  ...(await orig<object>()),
  generateInitialPassword: vi.fn(() => {
    const next = pins.queue.shift();
    if (!next) throw new Error("시험이 뽑을 번호를 안 넣었다");
    return next;
  }),
}));

import { POST as createClassRoute } from "@/app/api/classes/route";
import {
  DELETE as deleteClassRoute,
  PATCH as patchClassRoute,
} from "@/app/api/classes/[id]/route";
import { POST as createStudentRoute } from "@/app/api/students/route";
import {
  DELETE as deleteStudentRoute,
  PATCH as patchStudentRoute,
} from "@/app/api/students/[id]/route";
import {
  GET as accountStatusRoute,
  PATCH as accountPatchRoute,
  POST as accountIssueRoute,
} from "@/app/api/students/[id]/account/route";
import { POST as reissueRoute } from "@/app/api/students/[id]/account/password/route";
import {
  GET as branchAccountsGet,
  POST as branchAccountsPost,
} from "@/app/api/branch/accounts/route";
import { GET as branchClassesGet } from "@/app/api/branch/classes/route";
import { PATCH as branchClassPatch } from "@/app/api/branch/classes/[id]/route";
import { POST as branchStudentsPost } from "@/app/api/branch/students/route";
import { PATCH as branchStudentPatch } from "@/app/api/branch/students/[id]/route";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
import { studentAccountIssueResponseSchema } from "@/contracts/studentAccount.contract";
import { accountRouteAllowed } from "@/lib/accountRouteAccess";
import { auth } from "@/lib/auth";
import { getSessionUser, type SessionUser } from "@/lib/session";
import { studentGateFor } from "@/lib/studentRouteAccess";
import { CLASS_A_ID, MOCK_STUDENT_1, USER_TEACHER_ID } from "@/mocks/data";
import { learnRows, resetLearnTestDouble } from "@/mocks/learnTestDouble";
import { prismaTestDouble, seedUsers } from "@/mocks/prismaTestDouble";

const ORIGIN = "http://localhost:3000";
const PIN = "7392";
const STUDENT_CONTACT_TAIL = "0042";
const BRANCH = "20000000-0000-4000-8000-0000000000b1";
const FAR_BRANCH = "20000000-0000-4000-8000-0000000000b2";
/** 같은 지점의 원장 — 강사가 아닌 반의 담당 */
const OWNER_ID = "10000000-0000-4000-8000-0000000000c1";
/** 다른 지점의 원장 */
const FAR_OWNER_ID = "10000000-0000-4000-8000-0000000000c2";
const MISSING_ID = "30000000-0000-4000-8000-00000000abcd";

/** 픽스처 반 A·B 의 담당(`USER_TEACHER_ID`)을 강사로 세운다 — 자기 반 = 반 A */
const TEACHER: SessionUser = {
  id: USER_TEACHER_ID,
  email: "teacher@example.test",
  name: "강사",
  isAdmin: false,
  isSuperAdmin: false,
  branchId: BRANCH,
  branchRole: "teacher",
};
const OWNER: SessionUser = {
  id: OWNER_ID,
  email: "owner@example.test",
  name: "원장",
  isAdmin: true,
  isSuperAdmin: false,
  branchId: BRANCH,
  branchRole: "owner",
};

let ownerClassId = "";
let ownerStudentId = "";
let farClassId = "";
let farStudentId = "";

async function makeStudent(classId: string, name: string) {
  return (
    await prismaTestDouble.student.create({
      data: {
        classId,
        name,
        schoolLevel: null,
        schoolGrade: null,
        eywaStudentId: null,
        eywaWithdrawnAt: null,
        eywaLastReportDate: null,
        eywaLastReportText: null,
      },
    })
  ).id;
}

async function makeClass(userId: string, name: string) {
  return (
    await prismaTestDouble.class.create({
      data: {
        userId,
        name,
        grade: "중2",
        defaultProblemCount: 8,
        difficultyRatio: { easy: 30, medium: 50, hard: 20 },
      },
    })
  ).id;
}

beforeEach(async () => {
  vi.stubEnv("AUTH_URL", ORIGIN);
  resetLearnTestDouble();
  pins.queue = [PIN];
  seedUsers([
    {
      id: OWNER_ID,
      email: OWNER.email,
      name: OWNER.name,
      isAdmin: true,
      branchId: BRANCH,
      branchRole: "owner",
      deletedAt: null,
    },
    {
      id: FAR_OWNER_ID,
      email: "far@example.test",
      name: "다른 지점 원장",
      isAdmin: true,
      branchId: FAR_BRANCH,
      branchRole: "owner",
      deletedAt: null,
    },
  ]);
  ownerClassId = await makeClass(OWNER_ID, "원장 반");
  ownerStudentId = await makeStudent(ownerClassId, "원장반학생");
  farClassId = await makeClass(FAR_OWNER_ID, "다른 지점 반");
  farStudentId = await makeStudent(farClassId, "다른지점학생");
  await prismaTestDouble.class.update({
    where: { id: CLASS_A_ID },
    data: { branchId: BRANCH },
  });
  vi.mocked(getSessionUser).mockResolvedValue(TEACHER);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

const json = (url: string, method: string, body?: unknown) =>
  new NextRequest(`${ORIGIN}${url}`, {
    method,
    headers: { origin: ORIGIN, "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

const register = (classId: string, name = "새학생") =>
  createStudentRoute(json("/api/students", "POST", { classId, name }));
const issue = (studentId: string, loginId: string) =>
  accountIssueRoute(
    json(`/api/students/${studentId}/account`, "POST", { loginId }),
    ctx(studentId),
  );
const reissue = (studentId: string) =>
  reissueRoute(
    json(`/api/students/${studentId}/account/password`, "POST"),
    ctx(studentId),
  );
const setDisabled = (studentId: string, disabled: boolean) =>
  accountPatchRoute(
    json(`/api/students/${studentId}/account`, "PATCH", { disabled }),
    ctx(studentId),
  );
const status = (studentId: string) =>
  accountStatusRoute(
    json(`/api/students/${studentId}/account`, "GET"),
    ctx(studentId),
  );
const studentsIn = (classId: string) =>
  prismaTestDouble.student.findMany({ where: { classId } });

describe("학생 등록 — 강사는 자기 반에만 (D-140)", () => {
  it("🔴 자기 반에 등록하면 201 — 그 반에 한 명 늘어난다", async () => {
    const before = (await studentsIn(CLASS_A_ID)).length;
    const res = await register(CLASS_A_ID, "강사가넣은학생");
    expect(res.status).toBe(201);
    const after = await studentsIn(CLASS_A_ID);
    expect(after).toHaveLength(before + 1);
    expect(after.map((s) => (s as { name: string }).name)).toContain(
      "강사가넣은학생",
    );
    expect(learnRows.studentAccounts()).toEqual([]);
    expect(learnRows.audits()).toEqual([]);
  });

  it("🔴 같은 지점 남의 반 · 다른 지점 반은 403 — 둘의 응답이 같아 지점을 흘리지 않는다 · 한 명도 안 늘어난다", async () => {
    const same = await register(ownerClassId);
    const far = await register(farClassId);
    expect(same.status).toBe(403);
    expect(far.status).toBe(403);
    expect(await same.json()).toStrictEqual(await far.json());
    expect(await studentsIn(ownerClassId)).toHaveLength(1);
    expect(await studentsIn(farClassId)).toHaveLength(1);
  });

  it("없는 반은 404", async () => {
    expect((await register(MISSING_ID)).status).toBe(404);
  });
});

describe("반 만들기 · 반 설정 · 학생 삭제·이름 바꾸기는 여전히 원장·관리자만", () => {
  it("🔴 강사가 반을 만들면 403 — 반이 안 는다", async () => {
    const before = (await prismaTestDouble.class.findMany({})).length;
    const res = await createClassRoute(
      json("/api/classes", "POST", { name: "강사반", grade: "중1" }),
    );
    expect(res.status).toBe(403);
    expect(await prismaTestDouble.class.findMany({})).toHaveLength(before);
  });

  it("자기 반이어도 반 설정·반 삭제는 403", async () => {
    expect(
      (
        await patchClassRoute(
          json(`/api/classes/${CLASS_A_ID}`, "PATCH", { name: "바꾼 이름" }),
          ctx(CLASS_A_ID),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await deleteClassRoute(
          json(`/api/classes/${CLASS_A_ID}`, "DELETE"),
          ctx(CLASS_A_ID),
        )
      ).status,
    ).toBe(403);
    expect(
      await prismaTestDouble.class.findUnique({ where: { id: CLASS_A_ID } }),
    ).not.toBeNull();
  });

  it("자기 반 학생이어도 이름 바꾸기·삭제는 403 — 결정 넷(등록·발급·다시 발급·끄기) 밖이다", async () => {
    expect(
      (
        await patchStudentRoute(
          json(`/api/students/${MOCK_STUDENT_1.id}`, "PATCH", {
            name: "바꾼이름",
          }),
          ctx(MOCK_STUDENT_1.id),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await deleteStudentRoute(
          json(`/api/students/${MOCK_STUDENT_1.id}`, "DELETE"),
          ctx(MOCK_STUDENT_1.id),
        )
      ).status,
    ).toBe(403);
    expect(
      await prismaTestDouble.student.findUnique({
        where: { id: MOCK_STUDENT_1.id },
      }),
    ).toMatchObject({ name: MOCK_STUDENT_1.name });
  });
});

describe("로그인 발급 · 다시 발급 · 끄기 — 강사는 담당 반 학생이어도 거부", () => {
  beforeEach(async () => {
    await prismaTestDouble.student.update({
      where: { id: MOCK_STUDENT_1.id },
      data: { phoneLast4: STUDENT_CONTACT_TAIL },
    });
  });

  it("자기 반 학생 발급 403 — 계정과 감사 기록이 생기지 않는다", async () => {
    const res = await issue(MOCK_STUDENT_1.id, "kang01");
    expect(res.status).toBe(403);
    expect(pins.queue).toStrictEqual([PIN]);
    expect(learnRows.studentAccounts()).toEqual([]);
    expect(learnRows.audits()).toEqual([]);
  });

  it("원장은 소속 지점 강사의 반 학생에게 계정을 발급할 수 있다", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(OWNER);
    const response = await issue(MOCK_STUDENT_1.id, "kang01");
    expect(response.status).toBe(201);
    const body = studentAccountIssueResponseSchema.parse(await response.json());
    expect(body.data.initialPassword).toBe(STUDENT_CONTACT_TAIL);
    const [row] = learnRows.studentAccounts();
    expect(row).toMatchObject({
      studentId: MOCK_STUDENT_1.id,
      loginId: "kang01",
      issuedById: OWNER_ID,
    });
    expect(await compare(STUDENT_CONTACT_TAIL, row!.passwordHash)).toBe(true);
  });

  it("강사는 원장이 발급한 계정의 비밀번호와 로그인 상태를 바꿀 수 없다", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(OWNER);
    expect((await issue(MOCK_STUDENT_1.id, "kang01")).status).toBe(201);
    const before = structuredClone(learnRows.studentAccounts());
    vi.mocked(getSessionUser).mockResolvedValue(TEACHER);
    expect((await reissue(MOCK_STUDENT_1.id)).status).toBe(403);
    expect((await setDisabled(MOCK_STUDENT_1.id, true)).status).toBe(403);
    expect((await setDisabled(MOCK_STUDENT_1.id, false)).status).toBe(403);
    expect((await status(MOCK_STUDENT_1.id)).status).toBe(403);
    expect(learnRows.studentAccounts()).toEqual(before);
    expect(pins.queue).toStrictEqual([PIN]);
    expect(
      learnRows.audits().map((a) => [a.action, a.userId, a.actorId]),
    ).toStrictEqual([["student_account.issue", OWNER_ID, OWNER_ID]]);
  });

  it("🔴 남의 반·다른 지점 학생은 발급 · 다시 발급 · 끄기 · 상태 전부 403 — 계정·감사가 안 생긴다", async () => {
    for (const studentId of [ownerStudentId, farStudentId]) {
      expect((await issue(studentId, `x${studentId.slice(-4)}`)).status).toBe(
        403,
      );
      expect((await reissue(studentId)).status).toBe(403);
      expect((await setDisabled(studentId, true)).status).toBe(403);
      expect((await status(studentId)).status).toBe(403);
    }
    expect(learnRows.studentAccounts()).toEqual([]);
    expect(learnRows.audits()).toEqual([]);
  });

  it("강사 권한을 먼저 거부해 학생 존재 여부를 공개하지 않는다", async () => {
    expect((await issue(MISSING_ID, "ghost01")).status).toBe(403);
    expect((await reissue(MISSING_ID)).status).toBe(403);
  });
});

describe("지점 관리(`/api/branch/**`)는 여전히 원장·관리자만", () => {
  const TEACHER_ACCOUNT: AccountAccess = {
    id: USER_TEACHER_ID,
    name: "강사",
    email: "teacher@example.test",
    role: "director",
    isAdmin: false,
    isSuperAdmin: false,
    branchId: BRANCH,
    branchRole: "teacher",
    approvalStatus: "approved",
    menus: ["home", "bank", "export", "studio", "teaching"],
  };

  beforeEach(() => {
    vi.mocked(auth).mockResolvedValue({
      user: { ...TEACHER_ACCOUNT },
      expires: "2099-01-01T00:00:00.000Z",
    } as never);
  });

  it("🔴 강사가 부르면 라우트가 403 — 메서드 전부", async () => {
    const body = { classId: CLASS_A_ID, name: "x", loginId: "x01" };
    const responses = await Promise.all([
      branchAccountsGet(json("/api/branch/accounts", "GET")),
      branchAccountsPost(
        json("/api/branch/accounts", "POST", {
          email: "t@example.test",
          name: "t",
          role: "teacher",
        }),
      ),
      branchClassesGet(json("/api/branch/classes", "GET")),
      branchClassPatch(
        json(`/api/branch/classes/${CLASS_A_ID}`, "PATCH", {
          teacherId: USER_TEACHER_ID,
        }),
        ctx(CLASS_A_ID),
      ),
      branchStudentsPost(json("/api/branch/students", "POST", body)),
      branchStudentPatch(
        json(`/api/branch/students/${MOCK_STUDENT_1.id}`, "PATCH", {
          classId: CLASS_A_ID,
        }),
        ctx(MOCK_STUDENT_1.id),
      ),
    ]);
    expect(responses.map((r) => r.status)).toStrictEqual([
      403, 403, 403, 403, 403, 403,
    ]);
  });

  it("관문도 막는다 — 강사의 `/api/branch/**` · `/branch` 는 허용 목록 밖", () => {
    for (const [method, path] of [
      ["GET", "/api/branch/accounts"],
      ["POST", "/api/branch/students"],
      ["PATCH", "/api/branch/classes/x"],
      ["GET", "/branch"],
    ])
      expect(accountRouteAllowed(TEACHER_ACCOUNT, method!, path!)).toBe(false);
    // 짝 — 같은 계정의 자기 반 학생 경로는 관문을 지난다(막는 것은 라우트의 소유 범위다)
    expect(accountRouteAllowed(TEACHER_ACCOUNT, "POST", "/api/students")).toBe(
      true,
    );
  });
});

describe("학생 세션 · 로그인 안 한 사람은 거절", () => {
  it("🔴 로그인 안 한 요청은 401 — 아무것도 안 만든다", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    expect((await register(CLASS_A_ID)).status).toBe(401);
    expect((await issue(MOCK_STUDENT_1.id, "anon01")).status).toBe(401);
    expect((await reissue(MOCK_STUDENT_1.id)).status).toBe(401);
    expect((await setDisabled(MOCK_STUDENT_1.id, true)).status).toBe(401);
    expect(learnRows.studentAccounts()).toEqual([]);
  });

  it("🔴 학생 세션은 관문에서 막힌다 — 등록·발급·다시 발급·끄기 경로 전부", () => {
    for (const [method, path] of [
      ["POST", "/api/students"],
      ["POST", `/api/students/${MOCK_STUDENT_1.id}/account`],
      ["PATCH", `/api/students/${MOCK_STUDENT_1.id}/account`],
      ["POST", `/api/students/${MOCK_STUDENT_1.id}/account/password`],
      ["GET", "/classes/manage"],
    ])
      for (const mustChange of [false, true])
        expect(studentGateFor(mustChange, method!, path!).kind).not.toBe(
          "allow",
        );
  });
});
