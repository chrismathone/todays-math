// @vitest-environment node
/**
 * 🔴 학생 세션은 기존 코드에게 **«로그인 안 한 사람»**으로 보여야 한다 (브리프 §2.1 · §4 ②④).
 *
 * 진짜 next-auth · @auth/core 를 태운다 — `auth()` 를 모킹하면 next-auth 의 `getSession` 겹
 * (`{ user: args[0].user ?? args[0].token, ...session }`)이 안 보인다. 우리 콜백이 `user` 칸을
 * 빼 두기만 하면 **토큰 통째가 `session.user` 가 되어** `if (!session?.user)` 자리를 학생이 지난다.
 * 그 자리는 실제로 있다 — `src/lib/devPageAccess.ts` 37행(`/dev` 화면 가림막).
 *
 * 여기서 보는 것:
 *  - 학생 토큰에 `id`·`sub`·이름·이메일이 **없다** — 학생 정보는 `student` 칸에만.
 *  - `auth()` · `/api/auth/session` 이 `user` 없이 `student` 만 준다.
 *  - 기존 세션 도우미 넷(`getSessionUser`·`getAccountAccess`·`authorizeStudio`·`devPageVisible`)이 전부 «없음».
 *  - ④ 꺼진 계정 · 지워진 학생은 **다음 요청에서** 세션이 끊기고 쿠키를 지운다.
 *  - 첫 로그인 표시(`mustChangePassword`)가 요청마다 DB 에서 다시 읽힌다.
 *  - 학생 공급자의 실패는 한 가지 문구 코드(`invalid`)와 잠금(`locked`)뿐이다.
 */
import { NextRequest } from "next/server";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const savedEnv = vi.hoisted(() => {
  const before = {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
  };
  process.env.AUTH_SECRET = "student-auth-test-secret-0123456789abcdef";
  process.env.AUTH_URL = "http://localhost:3000";
  return before;
});

vi.mock("server-only", () => ({}));
vi.mock(
  "next/headers",
  async () => (await import("../helpers/authRequestContext")).nextHeadersModule,
);
vi.mock("next/navigation", async (orig) => ({
  ...(await orig<object>()),
  redirect: (await import("../helpers/authRequestContext")).redirectMock,
}));
vi.mock("@/lib/db", async () => {
  const { prismaTestDouble } = await import("@/mocks/prismaTestDouble");
  const { composeLearnDb } = await import("@/mocks/learnTestDouble");
  return { db: composeLearnDb(prismaTestDouble) };
});

import { CredentialsSignin } from "next-auth";

import { getAccountAccess } from "@/lib/accountAccess";
import { auth, handlers, signIn } from "@/lib/auth";
import { devPageVisible } from "@/lib/devPageAccess";
import { hashStudentPin } from "@/lib/learn/pinHash";
import { getSessionUser } from "@/lib/session";
import { authorizeStudio } from "@/lib/studio-ai/guard";
import { MOCK_STUDENT_1 } from "@/mocks/data";
import { prismaTestDouble } from "@/mocks/prismaTestDouble";
import {
  cascadeDeleteStudent,
  learnRows,
  patchStudentAccount,
  resetLearnTestDouble,
  seedStudentAccount,
} from "@/mocks/learnTestDouble";

import {
  assertTestAuthEnv,
  carryJarToNextRequest,
  decodeSessionToken,
  resetRequest,
  sessionCookieFromJar,
  TEST_ORIGIN,
  withoutJwtClaims,
} from "../helpers/authRequestContext";

const PIN = "5809";
let pinHash = "";
let accountId = "";

beforeAll(async () => {
  assertTestAuthEnv();
  pinHash = await hashStudentPin(PIN);
});
beforeEach(() => {
  resetLearnTestDouble();
  resetRequest();
  accountId = seedStudentAccount({
    studentId: MOCK_STUDENT_1.id,
    loginId: "seo01",
    passwordHash: pinHash,
    mustChangePassword: true,
  }).id;
});
afterAll(() => {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

async function signInStudent(loginId = "seo01", password = PIN) {
  return signIn("student", { loginId, password, redirect: false });
}

async function sessionEndpoint(cookie: string) {
  return handlers.GET(
    new NextRequest(`${TEST_ORIGIN}/api/auth/session`, {
      headers: { cookie },
    }),
  );
}

const studentInfo = (mustChangePassword = true) => ({
  accountId,
  studentId: MOCK_STUDENT_1.id,
  name: MOCK_STUDENT_1.name,
  mustChangePassword,
});

describe("🔴 학생 토큰 — user.id 가 없다 (브리프 §2.1)", () => {
  it("로그인하면 쿠키의 토큰은 student 칸 하나뿐이다 — id·sub·이름·이메일 없음", async () => {
    await signInStudent(" SEO01 ");
    const cookie = sessionCookieFromJar();
    expect(cookie, "세션 쿠키가 안 실렸다").not.toBeNull();
    const token = withoutJwtClaims(await decodeSessionToken(cookie!));
    expect(token).toStrictEqual({ student: studentInfo() });
  });

  it("🔴 auth() 는 user 없이 student 만 준다 — next-auth 의 겹이 토큰을 user 로 씌우지 않는다", async () => {
    await signInStudent();
    carryJarToNextRequest();
    const session = await auth();
    expect(session).toStrictEqual({
      student: studentInfo(),
      expires: expect.any(String),
    });
    expect(session && "user" in session).toBe(false);
  });

  it("/api/auth/session 도 같은 모양이다 (학생 화면이 «지금 누구인가»를 묻는 자리)", async () => {
    await signInStudent();
    const res = await sessionEndpoint(
      `authjs.session-token=${sessionCookieFromJar()}`,
    );
    expect(await res.json()).toStrictEqual({
      student: studentInfo(),
      expires: expect.any(String),
    });
  });

  it("🔴 기존 세션 도우미 넷이 전부 «로그인 안 함»이다", async () => {
    await signInStudent();
    carryJarToNextRequest();
    // 학생 세션이 **서 있어야** 아래 넷이 뜻을 가진다 — 로그인이 조용히 실패해도 넷 다 null 이다
    expect(
      (await auth())?.student?.accountId,
      "학생 세션이 안 섰다 — 아래 단언이 헛돈다",
    ).toBe(accountId);
    expect(await getSessionUser()).toBeNull();
    expect(await getAccountAccess()).toBeNull();
    const studio = await authorizeStudio(
      new Request(`${TEST_ORIGIN}/api/studio/overview`),
    );
    expect(studio.response?.status).toBe(401);
    vi.stubEnv("NODE_ENV", "production");
    try {
      // `if (!session?.user)` 만 보는 유일한 자리 — 학생이 여길 지나면 /dev 화면이 열린다
      expect(await devPageVisible({ directorOnly: true })).toBe(false);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("④ 꺼진 계정 · 지워진 학생 — 다음 요청에서 세션이 끊긴다", () => {
  it("🔴 원장님이 계정을 끄면 다음 요청의 세션은 null 이고 쿠키를 지운다", async () => {
    await signInStudent();
    const cookie = `authjs.session-token=${sessionCookieFromJar()}`;
    resetRequest({ cookie });
    expect(
      (await auth())?.student?.accountId,
      "끄기 전에 세션이 서 있어야 한다",
    ).toBe(accountId);
    patchStudentAccount(accountId, { disabledAt: new Date() });
    const res = await sessionEndpoint(cookie);
    expect(await res.json()).toBeNull();
    expect(res.headers.get("set-cookie") ?? "").toMatch(
      /authjs\.session-token=;/,
    );
    resetRequest({ cookie });
    expect(await auth()).toBeNull();
  });

  it("🔴 학생을 지우면(계정도 같이 지워진다) 다음 요청의 세션은 null", async () => {
    await signInStudent();
    const cookie = `authjs.session-token=${sessionCookieFromJar()}`;
    resetRequest({ cookie });
    expect(
      (await auth())?.student?.accountId,
      "지우기 전에 세션이 서 있어야 한다",
    ).toBe(accountId);
    cascadeDeleteStudent(MOCK_STUDENT_1.id);
    resetRequest({ cookie });
    expect(await auth()).toBeNull();
  });

  it("🔴 ⑥ 퇴원 처리(eywaWithdrawnAt)되면 이미 든 세션도 다음 요청에서 null 이고 쿠키를 지운다 (D-126 ⑺)", async () => {
    await signInStudent();
    const cookie = `authjs.session-token=${sessionCookieFromJar()}`;
    resetRequest({ cookie });
    expect(
      (await auth())?.student?.accountId,
      "퇴원 전에 세션이 서 있어야 한다",
    ).toBe(accountId);
    await prismaTestDouble.student.update({
      where: { id: MOCK_STUDENT_1.id },
      data: { eywaWithdrawnAt: new Date() },
    });
    const res = await sessionEndpoint(cookie);
    expect(await res.json()).toBeNull();
    expect(res.headers.get("set-cookie") ?? "").toMatch(
      /authjs\.session-token=;/,
    );
    resetRequest({ cookie });
    expect(await auth()).toBeNull();
  });

  it("🔴 ⑥ 퇴원한 학생은 맞는 번호로도 새로 못 들어온다 — 공급자 실패 코드는 invalid", async () => {
    await prismaTestDouble.student.update({
      where: { id: MOCK_STUDENT_1.id },
      data: { eywaWithdrawnAt: new Date() },
    });
    const e = await signInStudent().catch((error: unknown) => error);
    expect(e).toBeInstanceOf(CredentialsSignin);
    expect((e as CredentialsSignin).code).toBe("invalid");
    expect(sessionCookieFromJar()).toBeNull();
  });

  it("다시 켜면 새로 로그인할 수 있다 (끄기는 지우지 않는다)", async () => {
    patchStudentAccount(accountId, { disabledAt: new Date() });
    patchStudentAccount(accountId, { disabledAt: null });
    await signInStudent();
    expect(sessionCookieFromJar()).not.toBeNull();
  });

  it("첫 로그인 표시는 요청마다 DB 에서 다시 읽는다 — 바꾸고 나면 다음 요청부터 풀린다", async () => {
    await signInStudent();
    carryJarToNextRequest();
    expect((await auth())?.student?.mustChangePassword).toBe(true);
    patchStudentAccount(accountId, { mustChangePassword: false });
    expect((await auth())?.student).toStrictEqual(studentInfo(false));
  });
});

describe("학생 공급자의 실패 — 문구 코드는 invalid 하나, 잠금은 locked", () => {
  const codeOf = async (p: Promise<unknown>) => {
    const e = await p.catch((error: unknown) => error);
    expect(e).toBeInstanceOf(CredentialsSignin);
    return (e as CredentialsSignin).code;
  };

  it("틀린 번호 · 없는 아이디 · 꺼진 계정 · 형식이 틀린 입력이 모두 invalid 다", async () => {
    expect(await codeOf(signInStudent("seo01", "0001"))).toBe("invalid");
    expect(await codeOf(signInStudent("ghost-id", PIN))).toBe("invalid");
    expect(await codeOf(signInStudent("ab", PIN))).toBe("invalid");
    expect(await codeOf(signInStudent("seo01", "58090"))).toBe("invalid");
    patchStudentAccount(accountId, { disabledAt: new Date() });
    expect(await codeOf(signInStudent("seo01", PIN))).toBe("invalid");
    expect(sessionCookieFromJar()).toBeNull();
  });

  it("🔴 다섯 번 틀리면 locked — 있는 아이디도 없는 아이디도", async () => {
    for (let i = 0; i < 4; i += 1) await codeOf(signInStudent("seo01", "0001"));
    expect(await codeOf(signInStudent("seo01", "0001"))).toBe("locked");
    expect(await codeOf(signInStudent("seo01", PIN))).toBe("locked");
    for (let i = 0; i < 4; i += 1)
      await codeOf(signInStudent("ghost-id", "0001"));
    expect(await codeOf(signInStudent("ghost-id", "0001"))).toBe("locked");
  });

  it("🔴 DB 어디에도 번호가 평문으로 없다 — 계정 행·없는 아이디 행·감사 기록", async () => {
    await signInStudent("seo01", PIN);
    await codeOf(signInStudent("seo01", "7314"));
    await codeOf(signInStudent("7314", PIN));
    const dump = JSON.stringify({
      accounts: learnRows.studentAccounts().map((a) => ({
        ...a,
        passwordHash: a.passwordHash.startsWith("$2")
          ? "<bcrypt>"
          : a.passwordHash,
      })),
      misses: learnRows.studentLoginMisses(),
      audits: learnRows.audits(),
    });
    expect(dump).not.toContain(PIN);
    expect(dump).not.toContain('"7314"');
    expect(learnRows.studentAccounts()[0]!.passwordHash).toMatch(
      /^\$2[aby]\$10\$/,
    );
    for (const m of learnRows.studentLoginMisses())
      expect(m.keyHash).toMatch(/^[0-9a-f]{64}$/);
  });
});
