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
 * 초기 비밀번호는 고정 난수로 뽑게 해서(`generateInitialPassword` 대역) **그 번호를 찾아 다닌다.**
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
  });
  const classes = await prismaTestDouble.class.findMany({
    where: { userId: USER_OTHER_ID },
  });
  otherStudentId = (
    await prismaTestDouble.student.create({
      data: {
        classId: classes[0]!.id,
        name: "남의반학생",
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

describe("발급 — 원장만 · 한 명씩 (D-124 ⑷)", () => {
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
      initialPassword: PIN,
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
    expect(await compare(PIN, row!.passwordHash)).toBe(true);
  });

  it("이미 계정이 있으면 409 «이미 계정이 있습니다.»", async () => {
    await issue(MOCK_STUDENT_1.id, "seo01");
    const res = await issue(MOCK_STUDENT_1.id, "seo02");
    expect(res.status).toBe(409);
    expect(
      ((await res.json()) as { error: { message: string } }).error.message,
    ).toBe(STUDENT_LOGIN_MESSAGES.accountExists);
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
    for (const bad of ["abc", "김서준", "a b c d"]) {
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
    expect(body.data.initialPassword).toBe(PIN2);
    const [after] = learnRows.studentAccounts();
    expect(after).toMatchObject({
      id: before!.id,
      loginId: "seo01",
      mustChangePassword: true,
      failedCount: 0,
      lockedUntil: null,
    });
    expect(await compare(PIN2, after!.passwordHash)).toBe(true);
    expect(await compare(PIN, after!.passwordHash)).toBe(false);
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
    seedStudentAccount({
      studentId: MOCK_STUDENT_1.id,
      loginId: "seo01",
      passwordHash:
        "$2b$10$abcdefghijklmnopqrstuuWn8QbN8oZcG5d6r3pS1oPq9s7mQeYxW",
      failedCount: 5,
      lockedUntil: new Date(Date.now() + 60_000),
    });
    const panel = await panelOf(MOCK_STUDENT_1.id);
    expect(panel.withdrawn).toBe(false);
    expect(panel.account).toMatchObject({
      loginId: "seo01",
      locked: true,
      mustChangePassword: true,
      issuedByViewer: false,
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

describe("🔴 ⑥ 초기 비밀번호는 응답에 한 번 — DB · 로그 · 감사 기록 어디에도 평문으로 없다", () => {
  it("발급과 다시 발급을 거친 뒤 모든 흔적을 뒤진다", async () => {
    const first = await issue(MOCK_STUDENT_1.id, "seo01");
    const firstText = scrub(await first.text());
    expect(firstText.split(PIN).length - 1).toBe(1);

    const again = await reissueRoute(
      req("POST", MOCK_STUDENT_1.id, undefined, "/password"),
      ctx(MOCK_STUDENT_1.id),
    );
    expect(scrub(await again.text()).split(PIN2).length - 1).toBe(1);

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
