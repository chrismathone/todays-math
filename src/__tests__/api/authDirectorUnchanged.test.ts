// @vitest-environment node
/**
 * ① **원장 로그인·세션이 그대로다** (브리프 `todays-concept-student-auth.md` §4 ①).
 *
 * 학생 갈래(D-124 ⑶)를 넣기 **전의** `src/lib/auth.ts` 에 대고 먼저 초록을 본 특성 시험이다.
 * 학생 갈래를 넣은 뒤에도 원장 토큰과 기존 권한 의미를 보존한다.
 * 2026-10-23 owner-approved additive exception: authenticated token sessionVersion
 * is now exposed to transaction writers, defaulting legacy tokens to zero.
 * 기존 비교의 나머지 칸은 그대로 유지한다 — 브리프가
 * «원장 토큰의 동작은 한 줄도 바뀌면 안 된다»고 했다.
 *
 * 진짜 next-auth·@auth/core 를 태운다(`../helpers/authRequestContext.ts` 머리말). 원장 토큰이 쿠키에
 * **실제로 무엇으로** 실리고, `auth()` 와 `/api/auth/session` 이 **실제로 무엇을** 돌려주는지를
 * 칸 이름까지 견준다(`toStrictEqual` — 칸 하나가 늘어도 빨개진다. 학생 칸 `student` 가 원장
 * 세션에 새어 들어와도 여기서 걸린다).
 */
import { hash } from "bcryptjs";
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

const savedEnv = vi.hoisted(() => {
  const before = {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
  };
  process.env.AUTH_SECRET = "student-auth-test-secret-0123456789abcdef";
  process.env.AUTH_URL = "http://localhost:3000";
  return before;
});

const store = vi.hoisted(() => ({
  users: new Map<string, Record<string, unknown>>(),
  audits: [] as Record<string, unknown>[],
}));

vi.mock("server-only", () => ({}));
vi.mock(
  "next/headers",
  async () => (await import("../helpers/authRequestContext")).nextHeadersModule,
);
vi.mock("next/navigation", async (orig) => ({
  ...(await orig<object>()),
  redirect: (await import("../helpers/authRequestContext")).redirectMock,
}));
vi.mock("@/lib/db", () => ({
  db: {
    eywaManagedAccount: {
      findUnique: vi.fn(async () => null),
      findFirst: vi.fn(async () => null),
    },
    user: {
      findUnique: vi.fn(
        async ({ where }: { where: { id?: string; email?: string } }) => {
          for (const row of store.users.values()) {
            if (where.id !== undefined && row.id === where.id) return row;
            if (where.email !== undefined && row.email === where.email)
              return row;
          }
          return null;
        },
      ),
    },
    accountAuditLog: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        store.audits.push(data);
        return data;
      }),
    },
  },
}));

import { CredentialsSignin } from "next-auth";

import { ALL_WORKSPACE_MENUS } from "@/contracts/accountAccess.contract";
import { auth, handlers, signIn } from "@/lib/auth";

import {
  assertTestAuthEnv,
  carryJarToNextRequest,
  cookieHeaderFor,
  decodeSessionToken,
  resetRequest,
  sessionCookieFromJar,
  TEST_ORIGIN,
  withoutJwtClaims,
} from "../helpers/authRequestContext";

const DIRECTOR_ID = "10000000-0000-4000-8000-000000000001";
const EMAIL = "teacher@example.test";
const PASSWORD = "correct-horse-battery";
let passwordHash = "";

function seedDirector(overrides: Record<string, unknown> = {}) {
  store.users.clear();
  store.users.set(DIRECTOR_ID, {
    id: DIRECTOR_ID,
    email: EMAIL,
    name: "선생님",
    passwordHash,
    role: "director",
    isAdmin: false,
    isSuperAdmin: false,
    branchId: null,
    branchRole: null,
    approvalStatus: "approved",
    disabledMenus: ["studio"],
    deletedAt: null,
    ...overrides,
  });
}

// Listening is an ordinary menu: a teacher who never disabled it has it, like the rest.
const MENUS_WITHOUT_STUDIO = ALL_WORKSPACE_MENUS.filter((m) => m !== "studio");

beforeAll(async () => {
  assertTestAuthEnv();
  passwordHash = await hash(PASSWORD, 4);
});
beforeEach(() => {
  vi.stubEnv("ENGLISH_LISTENING_ENABLED", "true");
  vi.stubEnv("ENGLISH_LISTENING_TEACHER_IDS", "");
  store.audits.length = 0;
  seedDirector();
  resetRequest();
});
afterEach(() => vi.unstubAllEnvs());
afterAll(() => {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

async function signInDirector(password = PASSWORD) {
  return signIn("credentials", { email: EMAIL, password, redirect: false });
}

describe("① 원장 로그인 — 쿠키에 실리는 토큰 모양", () => {
  it("🔴 로그인하면 원장 토큰은 정확히 이 칸들이다 (id·sub·권한 넷 + 이름·이메일)", async () => {
    await signInDirector();
    const cookie = sessionCookieFromJar();
    expect(cookie, "세션 쿠키가 안 실렸다").not.toBeNull();
    const token = withoutJwtClaims(await decodeSessionToken(cookie!));
    expect(token).toStrictEqual({
      name: "선생님",
      email: EMAIL,
      sub: DIRECTOR_ID,
      id: DIRECTOR_ID,
      role: "director",
      isAdmin: false,
      isSuperAdmin: false,
      branchId: null,
      branchRole: null,
      sessionVersion: 0,
      approvalStatus: "approved",
      menus: MENUS_WITHOUT_STUDIO,
    });
    expect(store.audits).toStrictEqual([
      {
        userId: DIRECTOR_ID,
        actorId: DIRECTOR_ID,
        action: "auth.login",
        outcome: "success",
        details: {},
      },
    ]);
  });

  it("틀린 비밀번호는 CredentialsSignin 으로 떨어지고 실패 감사가 남는다", async () => {
    const error = await signInDirector("wrong-password-123").catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(CredentialsSignin);
    expect(sessionCookieFromJar()).toBeNull();
    expect(store.audits).toStrictEqual([
      {
        userId: DIRECTOR_ID,
        action: "auth.login",
        outcome: "failed",
        details: {},
      },
    ]);
  });
});

describe("① 원장 세션 — auth() 와 /api/auth/session 이 돌려주는 모양", () => {
  const expectedSession = (menus = MENUS_WITHOUT_STUDIO) => ({
    user: {
      name: "선생님",
      email: EMAIL,
      id: DIRECTOR_ID,
      role: "director",
      isAdmin: false,
      isSuperAdmin: false,
      branchId: null,
      branchRole: null,
      approvalStatus: "approved",
      sessionVersion: 0,
      menus,
    },
    expires: expect.any(String),
  });

  it("🔴 로그인한 쿠키로 다음 요청의 auth() — 칸이 정확히 user·expires 둘이다", async () => {
    await signInDirector();
    carryJarToNextRequest();
    expect(await auth()).toStrictEqual(expectedSession());
  });

  it("🔴 /api/auth/session 도 같은 모양이다 (화면 머리 계정 구역이 읽는 자리)", async () => {
    await signInDirector();
    const cookie = sessionCookieFromJar()!;
    const res = await handlers.GET(
      new NextRequest(`${TEST_ORIGIN}/api/auth/session`, {
        headers: { cookie: `authjs.session-token=${cookie}` },
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toStrictEqual(expectedSession());
  });

  it("권한 변경(메뉴 끄기)은 다시 로그인하지 않아도 다음 요청에 반영된다", async () => {
    await signInDirector();
    carryJarToNextRequest();
    seedDirector({ disabledMenus: ["studio", "bank"] });
    expect(await auth()).toStrictEqual(
      expectedSession(MENUS_WITHOUT_STUDIO.filter((m) => m !== "bank")),
    );
  });

  it("검수 계정은 role 이 reviewer 로 실린다", async () => {
    seedDirector({ role: "reviewer" });
    resetRequest({
      cookie: await cookieHeaderFor({
        id: DIRECTOR_ID,
        name: "선생님",
        email: EMAIL,
      }),
    });
    const session = await auth();
    expect(session?.user?.role).toBe("reviewer");
    expect(Object.keys(session ?? {}).sort()).toEqual(["expires", "user"]);
  });

  it("최고관리자도 저장된 개인 메뉴 차단을 따른다", async () => {
    seedDirector({ isAdmin: true, isSuperAdmin: true });
    resetRequest({ cookie: await cookieHeaderFor({ id: DIRECTOR_ID }) });
    expect((await auth())?.user?.menus).toEqual(
      ALL_WORKSPACE_MENUS.filter((menu) => menu !== "studio"),
    );
  });
  it("refreshes branch menu policy through the existing session cookie without logout", async () => {
    seedDirector({
      isAdmin: true,
      isSuperAdmin: true,
      branchId: "branch-a",
      branchRole: "owner",
      branch: { disabledMenus: [], menuRevision: 1 },
    });
    await signInDirector();
    const cookie = `authjs.session-token=${sessionCookieFromJar()}`;
    resetRequest({ cookie });
    const before = await auth();
    expect(before?.user?.menus).toContain("bank");
    expect(before?.user?.menus).not.toContain("studio");
    const stored = store.users.get(DIRECTOR_ID)!;
    stored.branch = {
      disabledMenus: ["bank", "english-listening"],
      menuRevision: 2,
    };
    resetRequest({ cookie });
    const blocked = await auth();
    expect(blocked?.user?.id).toBe(DIRECTOR_ID);
    expect(blocked?.user?.isAdmin).toBe(true);
    expect(blocked?.user?.menus).not.toContain("bank");
    expect(blocked?.user?.menus).not.toContain("english-listening");
    stored.branch = { disabledMenus: [], menuRevision: 3 };
    resetRequest({ cookie });
    const restored = await auth();
    expect(restored?.user?.menus).toContain("bank");
    expect(restored?.user?.menus).not.toContain("studio");
  });

  it("an administrator's listening switch and the service switch refresh an existing teacher session", async () => {
    await signInDirector();
    carryJarToNextRequest();
    // No enrolment list: the account was never named in the former pilot list.
    expect((await auth())?.user?.menus).toContain("english-listening");
    for (const disabledMenus of [["english-listening"], ["english"]]) {
      seedDirector({ disabledMenus });
      resetRequest({ cookie: await cookieHeaderFor({ id: DIRECTOR_ID }) });
      expect((await auth())?.user?.menus).not.toContain("english-listening");
    }
    seedDirector({ disabledMenus: [] });
    resetRequest({ cookie: await cookieHeaderFor({ id: DIRECTOR_ID }) });
    expect((await auth())?.user?.menus).toContain("english-listening");
    vi.stubEnv("ENGLISH_LISTENING_ENABLED", "false");
    resetRequest({ cookie: await cookieHeaderFor({ id: DIRECTOR_ID }) });
    expect((await auth())?.user?.menus).not.toContain("english-listening");
  });

  it("🔴 role 없는 옛 토큰도 DB 행으로 다시 읽어 원장으로 선다", async () => {
    resetRequest({
      cookie: await cookieHeaderFor({
        sub: DIRECTOR_ID,
        name: "선생님",
        email: EMAIL,
      }),
    });
    expect(await auth()).toStrictEqual(expectedSession());
  });

  it("🔴 탈퇴(deletedAt)한 계정은 다음 요청에서 세션이 끊기고 쿠키를 지운다", async () => {
    await signInDirector();
    const cookie = `authjs.session-token=${sessionCookieFromJar()}`;
    seedDirector({ deletedAt: new Date() });
    const res = await handlers.GET(
      new NextRequest(`${TEST_ORIGIN}/api/auth/session`, {
        headers: { cookie },
      }),
    );
    expect(await res.json()).toBeNull();
    expect(res.headers.get("set-cookie") ?? "").toMatch(
      /authjs\.session-token=;/,
    );
    resetRequest({ cookie });
    expect(await auth()).toBeNull();
  });

  it("passes the authenticated token version to transactional writers and keeps legacy version zero", async () => {
    seedDirector({ sessionVersion: 7 });
    await signInDirector(); carryJarToNextRequest();
    expect((await auth())?.user?.sessionVersion).toBe(7);
    seedDirector({ sessionVersion: 8 });
    expect(await auth()).toBeNull();
  });

  it("정지 또는 비밀번호 재발급 시 기존 세션을 즉시 끝낸다", async () => {
    await signInDirector();
    carryJarToNextRequest();
    seedDirector({ suspendedAt: new Date() });
    expect(await auth()).toBeNull();

    resetRequest();
    seedDirector();
    await signInDirector();
    carryJarToNextRequest();
    seedDirector({ sessionVersion: 1 });
    expect(await auth()).toBeNull();
  });
});
