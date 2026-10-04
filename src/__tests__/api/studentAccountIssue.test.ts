// @vitest-environment node
/**
 * 원장 — 학생 계정 발급 · 다시 발급 · 끄기 · 상태 (D-124 ⑷ · 브리프 §2.3 · §4 ⑤⑥).
 *
 *   POST  /api/students/{id}/account           발급 (아이디는 원장님이 직접 — D-125 ⑵)
 *   GET   /api/students/{id}/account           발급 칸이 읽는 것 — 퇴원 여부 + 계정(없으면 null)
 *   PATCH /api/students/{id}/account           끄기·켜기 — `disabledAt` 만, 지우지 않는다
 *   POST  /api/students/{id}/account/password  다시 발급 — 비밀번호만 새로
 *
 * 🔴 ⑤ 남의 반 학생에게 발급하면 거부 · ⑥ 초기 비밀번호가 DB·로그·감사 기록 어디에도 평문으로 안 남는다.
 * learn-screens 브리프 §1.3 이 더한 것: GET 은 계정이 없어도 **퇴원 여부**를 준다(칸이 «퇴원 — 로그인 막힘»을
 * 그린다) · 계정 상태에 «지금 보는 원장님이 발급했나»(시안 «9월 15일 · 원장님»).
 *
 * 다시 발급 번호는 고정 난수로 뽑게 해서(`generateInitialPassword` 대역) **그 번호를 찾아 다닌다.**
 * 네 자리 숫자는 UUID·bcrypt 해시·시각 안에 우연히 들어 있을 수 있어서, 그 셋을 먼저 걷어 내고 찾는다.
 */
import { compare } from "bcryptjs";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pins = vi.hoisted(() => ({ queue: [] as string[] }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
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

import {
  GET as statusRoute,
  PATCH as patchRoute,
  POST as issueRoute,
} from "@/app/api/students/[id]/account/route";
import { POST as reissueRoute } from "@/app/api/students/[id]/account/password/route";
import {
  STUDENT_ACCOUNT_WITHDRAWN_MESSAGES,
  STUDENT_LOGIN_MESSAGES,
  studentAccountIssueResponseSchema,
  studentAccountPanelResponseSchema,
  studentAccountStatusResponseSchema,
} from "@/contracts/studentAccount.contract";
import { getSessionUser } from "@/lib/session";
import {
  MOCK_STUDENT_1,
  MOCK_STUDENT_2,
  USER_OTHER_ID,
  USER_TEACHER_ID,
} from "@/mocks/data";
import { STUDENT_IDS } from "@/mocks/data/ids";
import {
  learnRows,
  patchStudentAccount,
  resetLearnTestDouble,
  seedStudentAccount,
} from "@/mocks/learnTestDouble";
import { prismaTestDouble } from "@/mocks/prismaTestDouble";

const ORIGIN = "http://localhost:3000";
const PIN = "7392";
const PIN2 = "4816";
const BRANCH_PASSWORD = "0042";
const BRANCH = "00000000-0000-4000-8000-000000000101";

/** 남의 반(USER_OTHER_ID 소유 CLASS_OTHER) 학생 — 픽스처에 없어 시험이 만든다 */
let otherStudentId = "";

const logs: string[] = [];
function captureConsole() {
  for (const level of ["log", "info", "warn", "error", "debug"] as const)
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      logs.push(
        args
          .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
          .join(" "),
      );
    });
}

beforeEach(async () => {
  vi.stubEnv("AUTH_URL", ORIGIN);
  resetLearnTestDouble();
  logs.length = 0;
  captureConsole();
  pins.queue = [PIN, PIN2];
  vi.mocked(getSessionUser).mockResolvedValue({
    id: USER_TEACHER_ID,
    email: "teacher@example.test",
    name: "선생님",
    isAdmin: true,
    branchId: BRANCH,
    branchRole: "owner",
  });
  for (const cls of await prismaTestDouble.class.findMany()) {
    await prismaTestDouble.class.update({
      where: { id: cls.id },
      data: {
        branchId: cls.userId === USER_TEACHER_ID ? BRANCH : "other-branch",
      },
    });
  }
  const students = (await prismaTestDouble.student.findMany()) as {
    id: string;
  }[];
  for (const student of students)
    await prismaTestDouble.student.update({
      where: { id: student.id },
      data: { phoneLast4: BRANCH_PASSWORD },
    });
  const classes = await prismaTestDouble.class.findMany({
    where: { userId: USER_OTHER_ID },
  });
  otherStudentId = (
    await prismaTestDouble.student.create({
      data: {
        classId: classes[0]!.id,
        name: "남의반학생",
        phoneLast4: BRANCH_PASSWORD,
        schoolLevel: null,
        schoolGrade: null,
        eywaStudentId: null,
        eywaWithdrawnAt: null,
        eywaLastReportDate: null,
        eywaLastReportText: null,
      },
    })
  ).id;
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

const req = (
  method: string,
  studentId: string,
  body?: unknown,
  suffix = "",
  origin = ORIGIN,
) =>
  new NextRequest(`${ORIGIN}/api/students/${studentId}/account${suffix}`, {
    method,
    headers: { origin, "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

const issue = (studentId: string, loginId: string, origin?: string) =>
  issueRoute(req("POST", studentId, { loginId }, "", origin), ctx(studentId));
const panelOf = async (studentId: string) =>
  studentAccountPanelResponseSchema.parse(
    await (await statusRoute(req("GET", studentId), ctx(studentId))).json(),
  ).data;

/** 네 자리 번호가 우연히 섞일 수 있는 것(UUID · bcrypt · 시각)을 걷어 낸다 */
function scrub(text: string): string {
  return text
    .replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      "<uuid>",
    )
    .replace(/\$2[aby]\$\d\d\$[./A-Za-z0-9]{53}/g, "<bcrypt>")
    .replace(/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z/g, "<time>");
}

describe("발급 — 지점 관리자 이상 · 한 명씩", () => {
  it("강사는 담당 반 학생이어도 로그인 계정을 발급할 수 없다", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      id: USER_TEACHER_ID,
      email: "teacher@example.test",
      name: "선생님",
      isAdmin: false,
      branchId: BRANCH,
      branchRole: "teacher",
    });
    const res = await issue(MOCK_STUDENT_1.id, "teacher-issued");
    expect(res.status).toBe(403);
    expect(learnRows.studentAccounts()).toEqual([]);
    expect(learnRows.audits()).toEqual([]);
  });
  it("🔴 로그인 안 한 요청은 401 이고 아무것도 안 만든다", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    expect((await issue(MOCK_STUDENT_1.id, "seo01")).status).toBe(401);
    expect(learnRows.studentAccounts()).toEqual([]);
  });

  it("🔴 ⑤ 남의 반 학생에게는 발급하지 않는다 — 403, 계정 0", async () => {
    const res = await issue(otherStudentId, "other01");
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      "FORBIDDEN",
    );
    expect(learnRows.studentAccounts()).toEqual([]);
  });

  it("없는 학생은 404", async () => {
    const res = await issue("30000000-0000-4000-8000-00000000abcd", "ghost01");
    expect(res.status).toBe(404);
  });

  it("발급하면 201 — 아이디는 정규화해 저장하고 초기 번호는 응답에 한 번만", async () => {
    const res = await issue(MOCK_STUDENT_1.id, "  Seo-01 ");
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = studentAccountIssueResponseSchema.parse(await res.json());
    expect(body.data).toMatchObject({
      studentId: MOCK_STUDENT_1.id,
      loginId: "seo-01",
      initialPassword: BRANCH_PASSWORD,
      mustChangePassword: true,
    });
    const [row] = learnRows.studentAccounts();
    expect(row).toMatchObject({
      studentId: MOCK_STUDENT_1.id,
      loginId: "seo-01",
      issuedById: USER_TEACHER_ID,
      mustChangePassword: true,
      disabledAt: null,
    });
    expect(await compare(BRANCH_PASSWORD, row!.passwordHash)).toBe(true);
  });

  it("지점 관리자 권한이 없는 독립 계정은 발급할 수 없다", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      id: USER_TEACHER_ID,
      email: "teacher@example.test",
      name: "선생님",
      isAdmin: false,
      branchId: null,
      branchRole: null,
    });
    const res = await issue(MOCK_STUDENT_1.id, "seo01");
    expect(res.status).toBe(403);
    expect(learnRows.studentAccounts()).toEqual([]);
  });

  it("이미 계정이 있으면 409 «이미 계정이 있습니다.»", async () => {
    await issue(MOCK_STUDENT_1.id, "seo01");
    const res = await issue(MOCK_STUDENT_1.id, "seo02");
    expect(res.status).toBe(409);
    expect(
      ((await res.json()) as { error: { message: string } }).error.message,
    ).toBe(STUDENT_LOGIN_MESSAGES.accountExists);
  });

  it("keeps a disabled account's password, login state and audit history on another issuance POST", async () => {
    await issue(MOCK_STUDENT_1.id, "existing-student");
    const [account] = learnRows.studentAccounts();
    patchStudentAccount(account!.id, {
      disabledAt: new Date("2026-10-01T00:00:00Z"),
      mustChangePassword: false,
      passwordChangedAt: new Date("2026-09-30T00:00:00Z"),
      lastLoginAt: new Date("2026-09-30T01:00:00Z"),
      failedCount: 5,
      lockedUntil: new Date(Date.now() + 60_000),
    });
    const before = structuredClone(learnRows.studentAccounts());
    const audits = structuredClone(learnRows.audits());
    expect((await issue(MOCK_STUDENT_1.id, "new-student-id")).status).toBe(409);
    expect(learnRows.studentAccounts()).toEqual(before);
    expect(learnRows.audits()).toEqual(audits);
  });

  it("returns account_exists for simultaneous POSTs with different IDs for one student", async () => {
    const responses = await Promise.all([
      issue(MOCK_STUDENT_1.id, "first-student-id"),
      issue(MOCK_STUDENT_1.id, "second-student-id"),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    const collision = responses.find((response) => response.status === 409)!;
    expect((await collision.json()).error.message).toBe(
      STUDENT_LOGIN_MESSAGES.accountExists,
    );
    expect(learnRows.studentAccounts()).toHaveLength(1);
    expect(learnRows.audits()).toHaveLength(1);
  });

  it("returns login_id_taken when different students race for one normalized ID", async () => {
    const responses = await Promise.all([
      issue(MOCK_STUDENT_1.id, "shared-student-id"),
      issue(MOCK_STUDENT_2.id, "SHARED-STUDENT-ID"),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    const collision = responses.find((response) => response.status === 409)!;
    expect((await collision.json()).error.message).toBe(
      STUDENT_LOGIN_MESSAGES.loginIdTaken,
    );
    expect(learnRows.studentAccounts()).toHaveLength(1);
    expect(learnRows.audits()).toHaveLength(1);
  });

  it("🔴 다른 학생이 쓰는 아이디는 409 «이미 쓰는 아이디입니다.» — 대소문자를 가리지 않는다", async () => {
    await issue(MOCK_STUDENT_1.id, "seo01");
    const res = await issue(MOCK_STUDENT_2.id, "SEO01");
    expect(res.status).toBe(409);
    expect(
      ((await res.json()) as { error: { message: string } }).error.message,
    ).toBe(STUDENT_LOGIN_MESSAGES.loginIdTaken);
    expect(learnRows.studentAccounts()).toHaveLength(1);
  });

  it("형식이 틀린 아이디는 400 — 계정 0", async () => {
    for (const bad of ["abc", "김서준@", "a b c d"]) {
      const res = await issue(MOCK_STUDENT_1.id, bad);
      expect(res.status, bad).toBe(400);
    }
    expect(learnRows.studentAccounts()).toEqual([]);
  });

  it("다른 사이트에서 온 요청은 403", async () => {
    const res = await issue(MOCK_STUDENT_1.id, "seo01", "https://evil.example");
    expect(res.status).toBe(403);
    expect(learnRows.studentAccounts()).toEqual([]);
  });
  it("연락처가 없으면 비밀번호를 임의 생성하지 않고 409로 안내한다", async () => {
    await prismaTestDouble.student.update({
      where: { id: MOCK_STUDENT_1.id },
      data: { phoneLast4: null },
    });
    const response = await issue(MOCK_STUDENT_1.id, "김민서");
    expect(response.status).toBe(409);
    expect((await response.json()).error.message).toContain("전화번호");
    expect(learnRows.studentAccounts()).toEqual([]);
  });
});

describe("다시 발급 · 끄기 · 상태", () => {
  it("다시 발급은 비밀번호만 새로 — 첫 로그인 표시·잠금을 되돌리고 옛 번호는 안 맞는다", async () => {
    await issue(MOCK_STUDENT_1.id, "seo01");
    const [before] = learnRows.studentAccounts();
    patchStudentAccount(before!.id, {
      mustChangePassword: false,
      failedCount: 3,
      lockedUntil: new Date(Date.now() + 60_000),
    });
    const res = await reissueRoute(
      req("POST", MOCK_STUDENT_1.id, undefined, "/password"),
      ctx(MOCK_STUDENT_1.id),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = studentAccountIssueResponseSchema.parse(await res.json());
    expect(body.data.initialPassword).toBe(PIN);
    const [after] = learnRows.studentAccounts();
    expect(after).toMatchObject({
      id: before!.id,
      loginId: "seo01",
      mustChangePassword: true,
      failedCount: 0,
      lockedUntil: null,
    });
    expect(await compare(PIN, after!.passwordHash)).toBe(true);
    expect(await compare(BRANCH_PASSWORD, after!.passwordHash)).toBe(false);
  });

  it("계정이 없는 학생을 다시 발급하면 404", async () => {
    const res = await reissueRoute(
      req("POST", MOCK_STUDENT_1.id, undefined, "/password"),
      ctx(MOCK_STUDENT_1.id),
    );
    expect(res.status).toBe(404);
  });

  it("🔴 끄기는 disabledAt 만 찍고 지우지 않는다 · 켜면 비운다", async () => {
    await issue(MOCK_STUDENT_1.id, "seo01");
    const off = await patchRoute(
      req("PATCH", MOCK_STUDENT_1.id, { disabled: true }),
      ctx(MOCK_STUDENT_1.id),
    );
    expect(off.status).toBe(200);
    const offBody = studentAccountStatusResponseSchema.parse(await off.json());
    expect(offBody.data.disabledAt).not.toBeNull();
    expect(learnRows.studentAccounts()).toHaveLength(1);
    expect(learnRows.studentAccounts()[0]!.disabledAt).toBeInstanceOf(Date);
    const on = await patchRoute(
      req("PATCH", MOCK_STUDENT_1.id, { disabled: false }),
      ctx(MOCK_STUDENT_1.id),
    );
    expect(
      studentAccountStatusResponseSchema.parse(await on.json()).data.disabledAt,
    ).toBeNull();
  });

  it("상태 — 계정이 없으면 account: null, 있으면 비밀번호 없는 모양 (발급 칸이 읽는다)", async () => {
    const none = await statusRoute(
      req("GET", MOCK_STUDENT_1.id),
      ctx(MOCK_STUDENT_1.id),
    );
    expect(await none.json()).toStrictEqual({
      data: { withdrawn: false, account: null },
    });
    const lockedUntil = new Date(Date.now() + 60_000);
    seedStudentAccount({
      studentId: MOCK_STUDENT_1.id,
      loginId: "seo01",
      passwordHash:
        "$2b$10$abcdefghijklmnopqrstuuWn8QbN8oZcG5d6r3pS1oPq9s7mQeYxW",
      failedCount: 5,
      lockedUntil,
    });
    const panel = await panelOf(MOCK_STUDENT_1.id);
    expect(panel.withdrawn).toBe(false);
    // 잠금이 끝나는 시각을 그대로 준다 — 발급 칸이 «잠김 — N분 뒤 풀림»을 센다(D-127 Q5)
    expect(panel.account).toMatchObject({
      loginId: "seo01",
      locked: true,
      lockedUntil: lockedUntil.toISOString(),
      mustChangePassword: true,
      issuedByViewer: false,
    });
  });

  it("잠기지 않은 계정은 lockedUntil: null", async () => {
    await issue(MOCK_STUDENT_1.id, "seo01");
    expect((await panelOf(MOCK_STUDENT_1.id)).account).toMatchObject({
      locked: false,
      lockedUntil: null,
    });
  });

  it("발급한 사람 — 지금 보는 원장님이 발급했으면 issuedByViewer (시안 «9월 15일 · 원장님»)", async () => {
    await issue(MOCK_STUDENT_1.id, "seo01");
    expect((await panelOf(MOCK_STUDENT_1.id)).account?.issuedByViewer).toBe(
      true,
    );
  });

  it("🔴 퇴원한 학생 — 계정이 없어도 withdrawn 을 준다(칸이 «퇴원 — 로그인 막힘»을 그린다)", async () => {
    await prismaTestDouble.student.update({
      where: { id: MOCK_STUDENT_1.id },
      data: { eywaWithdrawnAt: new Date() },
    });
    expect(await panelOf(MOCK_STUDENT_1.id)).toStrictEqual({
      withdrawn: true,
      account: null,
    });
    seedStudentAccount({
      studentId: MOCK_STUDENT_1.id,
      loginId: "seo01",
      passwordHash:
        "$2b$10$abcdefghijklmnopqrstuuWn8QbN8oZcG5d6r3pS1oPq9s7mQeYxW",
    });
    const panel = await panelOf(MOCK_STUDENT_1.id);
    expect(panel.withdrawn).toBe(true);
    expect(panel.account?.loginId).toBe("seo01");
  });

  it("🔴 ⑤ 남의 반 학생은 상태·끄기·다시 발급도 403", async () => {
    seedStudentAccount({
      studentId: otherStudentId,
      loginId: "other01",
      passwordHash:
        "$2b$10$abcdefghijklmnopqrstuuWn8QbN8oZcG5d6r3pS1oPq9s7mQeYxW",
    });
    expect(
      (await statusRoute(req("GET", otherStudentId), ctx(otherStudentId)))
        .status,
    ).toBe(403);
    expect(
      (
        await patchRoute(
          req("PATCH", otherStudentId, { disabled: true }),
          ctx(otherStudentId),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await reissueRoute(
          req("POST", otherStudentId, undefined, "/password"),
          ctx(otherStudentId),
        )
      ).status,
    ).toBe(403);
    expect(learnRows.studentAccounts()[0]!.disabledAt).toBeNull();
  });
});

describe("D-130 — 관리자는 남의 반 학생에게도 발급 · 다시 발급 · 끄기 · 상태 (원장님 2026-09-16)", () => {
  // 짝: 위 «🔴 ⑤ 남의 반 학생…» 둘이 같은 계정·같은 학생에 **관리자 표시만 없이** 403 을 본다.
  beforeEach(() => {
    vi.mocked(getSessionUser).mockResolvedValue({
      id: USER_TEACHER_ID,
      email: "teacher@example.test",
      name: "선생님",
      isAdmin: true,
      isSuperAdmin: true,
    });
  });

  it("남의 반 학생에게 발급하면 201 — 발급한 사람은 관리자 계정", async () => {
    const res = await issue(otherStudentId, "other01");
    expect(res.status).toBe(201);
    const [account] = learnRows.studentAccounts();
    expect(account).toMatchObject({
      studentId: otherStudentId,
      loginId: "other01",
      issuedById: USER_TEACHER_ID,
    });
    expect((await panelOf(otherStudentId)).account?.issuedByViewer).toBe(true);
  });

  it("다시 발급·끄기도 된다 — 감사 기록의 행위자는 관리자", async () => {
    await issue(otherStudentId, "other01");
    expect(
      (
        await reissueRoute(
          req("POST", otherStudentId, undefined, "/password"),
          ctx(otherStudentId),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await patchRoute(
          req("PATCH", otherStudentId, { disabled: true }),
          ctx(otherStudentId),
        )
      ).status,
    ).toBe(200);
    expect(learnRows.studentAccounts()[0]!.disabledAt).not.toBeNull();
    expect(
      learnRows.audits().map((a) => [a.action, a.userId, a.actorId]),
    ).toStrictEqual([
      ["student_account.issue", USER_TEACHER_ID, USER_TEACHER_ID],
      ["student_account.reissue", USER_TEACHER_ID, USER_TEACHER_ID],
      ["student_account.disable", USER_TEACHER_ID, USER_TEACHER_ID],
    ]);
  });

  it("관리자여도 없는 학생은 404 · 퇴원 학생은 409(넘는 것은 소유 울타리뿐)", async () => {
    expect(
      (await issue("30000000-0000-4000-8000-00000000abcd", "ghost01")).status,
    ).toBe(404);
    await prismaTestDouble.student.update({
      where: { id: otherStudentId },
      data: { eywaWithdrawnAt: new Date() },
    });
    expect((await issue(otherStudentId, "other01")).status).toBe(409);
    expect(learnRows.studentAccounts()).toEqual([]);
  });
});

describe("🔴 퇴원 학생에게는 발급 API 도 막는다 — 409 (D-127 · 리드 결정 · 보고서 §7-3)", () => {
  /**
   * 화면은 이미 퇴원 학생에게 발급 단추를 안 그린다 — 서버가 **같은 판정**(`accountBlock.ts` 의 퇴원 쪽)을 한다.
   * 발급 · 다시 발급 · 켜기는 409, 끄기는 된다(막는 쪽으로 가는 일이다).
   */
  const withdraw = (studentId = MOCK_STUDENT_1.id) =>
    prismaTestDouble.student.update({
      where: { id: studentId },
      data: { eywaWithdrawnAt: new Date("2026-09-14T00:00:00.000Z") },
    });
  const errorOf = async (res: Response) =>
    ((await res.json()) as { error: { code: string; message: string } }).error;
  const reissue = () =>
    reissueRoute(
      req("POST", MOCK_STUDENT_1.id, undefined, "/password"),
      ctx(MOCK_STUDENT_1.id),
    );
  const setDisabled = (disabled: boolean) =>
    patchRoute(
      req("PATCH", MOCK_STUDENT_1.id, { disabled }),
      ctx(MOCK_STUDENT_1.id),
    );

  it("발급 — 409 «퇴원한 학생은 계정을 만들 수 없습니다.» · 계정 0 · 감사 0 · 번호를 안 뽑는다", async () => {
    await withdraw();
    const res = await issue(MOCK_STUDENT_1.id, "seo01");
    expect(res.status).toBe(409);
    expect(await errorOf(res)).toMatchObject({
      code: "CONFLICT",
      message: STUDENT_ACCOUNT_WITHDRAWN_MESSAGES.issue,
    });
    expect(learnRows.studentAccounts()).toEqual([]);
    expect(learnRows.audits()).toEqual([]);
    expect(pins.queue).toStrictEqual([PIN, PIN2]);
  });

  it("다시 발급 · 켜기 — 409 같은 결의 문구 · 번호 · 잠금 · 꺼짐이 그대로", async () => {
    await issue(MOCK_STUDENT_1.id, "seo01");
    const [row] = learnRows.studentAccounts();
    const hashBefore = row!.passwordHash;
    const offAt = new Date("2026-09-15T02:00:00.000Z");
    const lockedUntil = new Date(Date.now() + 5 * 60_000);
    patchStudentAccount(row!.id, {
      disabledAt: offAt,
      failedCount: 5,
      lockedUntil,
    });
    await withdraw();

    const again = await reissue();
    expect(again.status).toBe(409);
    expect(await errorOf(again)).toMatchObject({
      code: "CONFLICT",
      message: STUDENT_ACCOUNT_WITHDRAWN_MESSAGES.reissue,
    });
    const on = await setDisabled(false);
    expect(on.status).toBe(409);
    expect(await errorOf(on)).toMatchObject({
      code: "CONFLICT",
      message: STUDENT_ACCOUNT_WITHDRAWN_MESSAGES.enable,
    });

    const [after] = learnRows.studentAccounts();
    expect(after!.passwordHash).toBe(hashBefore);
    expect(after).toMatchObject({
      disabledAt: offAt,
      failedCount: 5,
      lockedUntil,
    });
    expect(pins.queue).toStrictEqual([PIN, PIN2]);
    expect(learnRows.audits().map((a) => a.action)).toStrictEqual([
      "student_account.issue",
    ]);
  });

  it("끄기는 된다 — 퇴원 학생의 켜진 계정을 끈다", async () => {
    await issue(MOCK_STUDENT_1.id, "seo01");
    await withdraw();
    const off = await setDisabled(true);
    expect(off.status).toBe(200);
    expect(learnRows.studentAccounts()[0]!.disabledAt).toBeInstanceOf(Date);
    expect(learnRows.audits().map((a) => a.action)).toStrictEqual([
      "student_account.issue",
      "student_account.disable",
    ]);
  });

  it("퇴원 표시가 풀리면(동기화가 지우면) 다시 발급된다 — 막음은 표시를 따른다", async () => {
    await withdraw();
    expect((await issue(MOCK_STUDENT_1.id, "seo01")).status).toBe(409);
    await prismaTestDouble.student.update({
      where: { id: MOCK_STUDENT_1.id },
      data: { eywaWithdrawnAt: null },
    });
    expect((await issue(MOCK_STUDENT_1.id, "seo01")).status).toBe(201);
  });

  it("남의 반 퇴원 학생은 여전히 403 — 소유 판정이 먼저(퇴원 여부를 흘리지 않는다)", async () => {
    await withdraw(otherStudentId);
    expect((await issue(otherStudentId, "other01")).status).toBe(403);
  });
});

describe("🔴 ⑥ 초기 비밀번호는 응답에 한 번 — DB · 로그 · 감사 기록 어디에도 평문으로 없다", () => {
  it("발급과 다시 발급을 거친 뒤 모든 흔적을 뒤진다", async () => {
    const first = await issue(MOCK_STUDENT_1.id, "seo01");
    const firstText = scrub(await first.text());
    expect(firstText.split(BRANCH_PASSWORD).length - 1).toBe(1);

    const again = await reissueRoute(
      req("POST", MOCK_STUDENT_1.id, undefined, "/password"),
      ctx(MOCK_STUDENT_1.id),
    );
    expect(scrub(await again.text()).split(PIN).length - 1).toBe(1);

    const status = await statusRoute(
      req("GET", MOCK_STUDENT_1.id),
      ctx(MOCK_STUDENT_1.id),
    );
    const statusText = scrub(await status.text());

    const db = scrub(JSON.stringify(learnRows.studentAccounts()));
    const audits = scrub(JSON.stringify(learnRows.audits()));
    const console = scrub(logs.join("\n"));
    for (const [where, text] of [
      ["DB 계정 행", db],
      ["감사 기록", audits],
      ["콘솔", console],
      ["상태 응답", statusText],
    ] as const) {
      expect(text, where).not.toContain(BRANCH_PASSWORD);
      expect(text, where).not.toContain(PIN);
      expect(text, where).not.toContain(PIN2);
    }
    // 흔적을 찾을 자리가 **실제로 채워져 있었다** — 빈 곳을 뒤져 «없다»를 내지 않는다
    expect(learnRows.audits().length).toBeGreaterThanOrEqual(2);
    expect(learnRows.studentAccounts()[0]!.passwordHash).toMatch(
      /^\$2[aby]\$10\$/,
    );
  });

  it("감사 기록 — 누가 누구에게 무엇을 했나(번호 없이)", async () => {
    await issue(MOCK_STUDENT_1.id, "seo01");
    await reissueRoute(
      req("POST", MOCK_STUDENT_1.id, undefined, "/password"),
      ctx(MOCK_STUDENT_1.id),
    );
    await patchRoute(
      req("PATCH", MOCK_STUDENT_1.id, { disabled: true }),
      ctx(MOCK_STUDENT_1.id),
    );
    await patchRoute(
      req("PATCH", MOCK_STUDENT_1.id, { disabled: false }),
      ctx(MOCK_STUDENT_1.id),
    );
    const accountId = learnRows.studentAccounts()[0]!.id;
    expect(learnRows.audits()).toStrictEqual(
      [
        "student_account.issue",
        "student_account.reissue",
        "student_account.disable",
        "student_account.enable",
      ].map((action) => ({
        userId: USER_TEACHER_ID,
        actorId: USER_TEACHER_ID,
        action,
        outcome: "success",
        details: {
          studentId: MOCK_STUDENT_1.id,
          studentAccountId: accountId,
          loginId: "seo01",
        },
      })),
    );
  });
});

void STUDENT_IDS;
