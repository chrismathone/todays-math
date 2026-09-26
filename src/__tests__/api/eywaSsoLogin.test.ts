// @vitest-environment node
/**
 * eywa 자동 로그인 2판 (D-139 ⑹) — **진짜** next-auth·@auth/core 를 태운다.
 *
 * 설계의 전부: eywa 이메일은 본인 확인 값이 아니다(직원이 확인 없이 자기 이메일을 바꾼다). 그래서
 * **이메일로 계정을 찾지 않는다.** 바뀌지 않는 eywa `sub` 를, 계정 주인이 비밀번호로 로그인한 뒤 확인 화면에서
 * [연결]을 눌러야만 계정에 묶는다. 여기서 보는 것:
 *   ⑴ `eywa-sso` 공급자 — 연결된 계정만, 토큰은 이메일 로그인과 **칸 이름까지** 같다 · 🔴 이메일 조회 0회
 *   ⑵ 입구 `GET /api/sso/eywa` — 연결됨 → `/` · 연결 안 됨 → 연결 대기 쿠키 + 세션 끊기 + 로그인으로
 *   ⑶ 🔴 이메일/비밀번호 로그인 자체는 연결을 만들지 않는다(쿠키가 있어도)
 *   ⑷ 끝에서 끝 — 연결 안 된 SSO → 비밀번호 로그인 → [연결] → 다음 SSO 가 곧장 로그인
 * 요청 맥락은 `authDirectorUnchanged.test.ts` 와 같은 대역(`../helpers/authRequestContext.ts`)이다.
 */
import { createHmac } from "node:crypto";

import { hash } from "bcryptjs";
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
    EYWA_SSO_SECRET: process.env.EYWA_SSO_SECRET,
    EYWA_SSO_TENANT_IDS: process.env.EYWA_SSO_TENANT_IDS,
  };
  process.env.AUTH_SECRET = "student-auth-test-secret-0123456789abcdef";
  process.env.AUTH_URL = "http://localhost:3000";
  delete process.env.EYWA_SSO_TENANT_IDS;
  return before;
});

type Row = Record<string, unknown>;
const store = vi.hoisted(() => ({
  users: new Map<string, Record<string, unknown>>(),
  audits: [] as Record<string, unknown>[],
}));

/** where 한 칸 맞춤 — `null` 은 «비었음», `{ not: null }` 은 «찼음» (Prisma 와 같은 뜻) */
function matches(row: Row, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, want]) => {
    if (want === null) return row[key] == null;
    if (typeof want === "object" && want !== null && "not" in want)
      return row[key] != null;
    return row[key] === want;
  });
}

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
  const { Prisma } = await import("@prisma/client");
  const user = {
    findUnique: vi.fn(
      async ({
        where,
      }: {
        where: { id?: string; email?: string; eywaUserId?: string };
      }) => {
        for (const row of store.users.values()) {
          if (where.id !== undefined && row.id === where.id) return row;
          if (where.email !== undefined && row.email === where.email)
            return row;
          if (
            where.eywaUserId !== undefined &&
            row.eywaUserId === where.eywaUserId
          )
            return row;
        }
        return null;
      },
    ),
    updateMany: vi.fn(
      async ({
        where,
        data,
      }: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => {
        let count = 0;
        for (const row of store.users.values()) {
          if (!matches(row, where)) continue;
          if (
            data.eywaUserId &&
            [...store.users.values()].some(
              (other) => other !== row && other.eywaUserId === data.eywaUserId,
            )
          )
            throw new Prisma.PrismaClientKnownRequestError("unique", {
              code: "P2002",
              clientVersion: "test",
            });
          Object.assign(row, data);
          count += 1;
        }
        return { count };
      },
    ),
    // 🔴 연결은 조건부 updateMany 로만 한다 — 이 둘이 불리면 로그인이 몰래 쓰고 있다는 뜻이다
    update: vi.fn(),
    upsert: vi.fn(),
  };
  const accountAuditLog = {
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      store.audits.push(data);
      return data;
    }),
  };
  const db = {
    user,
    accountAuditLog,
    $transaction: async (fn: (tx: unknown) => unknown) =>
      fn({ user, accountAuditLog }),
  };
  return { db };
});

import { CredentialsSignin } from "next-auth";

import { ALL_WORKSPACE_MENUS } from "@/contracts/accountAccess.contract";
import { POST as linkPost } from "@/app/api/account/eywa-link/route";
import { GET } from "@/app/api/sso/eywa/route";
import { signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  EYWA_LINK_PENDING_COOKIE,
  openEywaLinkPending,
} from "@/lib/eywaLinkPending";

import {
  assertTestAuthEnv,
  carryJarToNextRequest,
  cookieHeaderFor,
  decodeSessionToken,
  resetRequest,
  SESSION_COOKIE,
  sessionCookieCleared,
  sessionCookieFromJar,
  TEST_ORIGIN,
  withoutJwtClaims,
} from "../helpers/authRequestContext";

const SSO_SECRET = "eywa-sso-test-secret-0123456789abcdef";
const TENANT = "0f0e0d0c-0b0a-4908-8706-050403020100";
const DIRECTOR_ID = "10000000-0000-4000-8000-000000000001";
const OTHER_ID = "10000000-0000-4000-8000-000000000002";
const EMAIL = "teacher@example.test";
const PASSWORD = "correct-horse-battery";
/** eywa 사람 A 의 바뀌지 않는 id — 표의 `sub` */
const SUB = "5b1c7e9a-2d4f-4a6b-9c8d-0e1f2a3b4c5d";
let passwordHash = "";

function seed(overrides: Row = {}) {
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
    suspendedAt: null,
    sessionVersion: 0,
    eywaUserId: SUB,
    eywaLinkedAt: new Date("2026-09-26T00:00:00.000Z"),
    ...overrides,
  });
  store.users.set(OTHER_ID, {
    ...store.users.get(DIRECTOR_ID),
    id: OTHER_ID,
    email: "other@example.test",
    name: "다른 선생님",
    eywaUserId: null,
    eywaLinkedAt: null,
  });
}
const director = () => store.users.get(DIRECTOR_ID)!;

/** 표 — 이메일은 **이 계정과 같은** 주소다(탈취 시나리오: eywa 직원이 자기 이메일을 원장 이메일로 바꿨다) */
function ssoToken(over: Row = {}, secret = SSO_SECRET) {
  const iat = Math.floor(Date.now() / 1000);
  const body = Buffer.from(
    JSON.stringify({
      iss: "aywa",
      aud: "todays-math",
      sub: SUB,
      email: EMAIL,
      name: "김선생",
      tenantId: TENANT,
      iat,
      exp: iat + 60,
      jti: "7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
      ...over,
    }),
  ).toString("base64url");
  const sig = createHmac("sha256", secret)
    .update(`v1.${body}`)
    .digest("base64url");
  return `v1.${body}.${sig}`;
}

const signInSso = (token: string) =>
  signIn("eywa-sso", { token, redirect: false });

const get = (query: string, cookie?: string) =>
  (GET as unknown as (r: NextRequest) => Promise<Response>)(
    new NextRequest(`${TEST_ORIGIN}/api/sso/eywa${query}`, {
      headers: cookie ? { cookie } : {},
    }),
  );

const pendingOf = (res: Response) =>
  (res as unknown as { cookies: NextRequest["cookies"] }).cookies.get(
    EYWA_LINK_PENDING_COOKIE,
  );

/** 연결을 찾을 때 이메일을 열쇠로 쓴 호출 — 0 이어야 한다 */
const emailLookups = () =>
  vi
    .mocked(db.user.findUnique)
    .mock.calls.filter(
      ([args]) => (args as { where: Row }).where.email !== undefined,
    );

const MENUS_WITHOUT_STUDIO = ALL_WORKSPACE_MENUS.filter((m) => m !== "studio");

beforeAll(async () => {
  assertTestAuthEnv();
  passwordHash = await hash(PASSWORD, 4);
});
beforeEach(() => {
  process.env.EYWA_SSO_SECRET = SSO_SECRET;
  delete process.env.EYWA_SSO_TENANT_IDS;
  store.audits.length = 0;
  vi.mocked(db.user.findUnique).mockClear();
  vi.mocked(db.user.updateMany).mockClear();
  vi.mocked(db.user.update).mockClear();
  vi.mocked(db.user.upsert).mockClear();
  seed();
  resetRequest();
});
afterAll(() => {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe("⑴ eywa-sso 공급자 — 연결된 계정만", () => {
  it("🔴 토큰 칸이 이메일 로그인(authDirectorUnchanged)과 정확히 같다 · 감사에 SSO 표시", async () => {
    await signInSso(ssoToken());
    const cookie = sessionCookieFromJar();
    expect(cookie, "세션 쿠키가 안 실렸다").not.toBeNull();
    expect(withoutJwtClaims(await decodeSessionToken(cookie!))).toStrictEqual({
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
        details: { method: "eywa-sso", tenantId: TENANT },
      },
    ]);
    expect(emailLookups()).toStrictEqual([]);
  });

  it("🔴 표의 이메일이 다른 계정과 같아도 sub 로 연결된 계정으로 들어온다 (이메일은 표시용)", async () => {
    await signInSso(ssoToken({ email: "other@example.test" }));
    const token = await decodeSessionToken(sessionCookieFromJar()!);
    expect(token?.id).toBe(DIRECTOR_ID);
    expect(emailLookups()).toStrictEqual([]);
  });

  it("승인 대기 계정도 들어오고 토큰이 «대기»를 싣는다 — 대기 갈래는 관문이 정한다", async () => {
    seed({ approvalStatus: "pending" });
    await signInSso(ssoToken());
    const token = await decodeSessionToken(sessionCookieFromJar()!);
    expect(token?.approvalStatus).toBe("pending");
  });

  it("🔴 탈취 잠금 — 같은 이메일의 계정이 있어도 연결 안 됐으면 거절 · 이메일 조회 0회 · 쓰기 0회", async () => {
    seed({ eywaUserId: null, eywaLinkedAt: null });
    const error = await signInSso(ssoToken()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CredentialsSignin);
    expect(sessionCookieFromJar()).toBeNull();
    expect(store.audits).toStrictEqual([]);
    expect(emailLookups()).toStrictEqual([]);
    // 찾기는 했다 — 그 열쇠가 sub 였다 (0 회라서 초록인 것이 아니다)
    expect(
      vi
        .mocked(db.user.findUnique)
        .mock.calls.map(([args]) => (args as { where: Row }).where),
    ).toStrictEqual([{ eywaUserId: SUB }]);
    expect(db.user.updateMany).not.toHaveBeenCalled();
    expect(director().eywaUserId).toBeNull();
  });

  it.each([
    [
      "다른 eywa 사람의 표",
      {},
      { sub: "6c2d8f0b-3e5a-4b7c-8d9e-1f2a3b4c5d6e" },
    ],
    ["비밀번호 없는 계정", { passwordHash: null }, {}],
    ["지워진 계정", { deletedAt: new Date() }, {}],
    ["정지된 계정", { suspendedAt: new Date() }, {}],
  ])(
    "🔴 %s — CredentialsSignin · 쿠키 없음 · 감사 없음 · 계정 수 그대로",
    async (_label, row, claims) => {
      seed(row);
      const before = store.users.size;
      const error = await signInSso(ssoToken(claims)).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(CredentialsSignin);
      expect(sessionCookieFromJar()).toBeNull();
      expect(store.users.size).toBe(before);
      expect(store.audits).toStrictEqual([]);
    },
  );

  it("🔴 EYWA_SSO_SECRET 이 없으면 연결된 계정의 올바른 표도 거절한다 (기능 꺼짐)", async () => {
    delete process.env.EYWA_SSO_SECRET;
    const error = await signInSso(ssoToken()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CredentialsSignin);
    expect(sessionCookieFromJar()).toBeNull();
  });

  it("EYWA_SSO_TENANT_IDS 가 있으면 그 밖의 지점 표를 거절한다", async () => {
    process.env.EYWA_SSO_TENANT_IDS = "some-other-tenant";
    const error = await signInSso(ssoToken()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CredentialsSignin);
  });
});

describe("⑵ GET /api/sso/eywa — 보냄", () => {
  it("연결된 계정 → / 로 303, 세션 쿠키가 실리고 연결 대기 쿠키는 없다", async () => {
    const res = await get(`?token=${ssoToken()}`);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`${TEST_ORIGIN}/`);
    const token = await decodeSessionToken(sessionCookieFromJar()!);
    expect(token?.id).toBe(DIRECTOR_ID);
    expect(pendingOf(res)).toBeUndefined();
  });

  it("연결된 계정으로 들어오면 남아 있던 연결 대기 쿠키를 지운다 (path=/)", async () => {
    const res = await get(
      `?token=${ssoToken()}`,
      `${EYWA_LINK_PENDING_COOKIE}=v1.stale.value`,
    );
    expect(res.headers.get("location")).toBe(`${TEST_ORIGIN}/`);
    expect(pendingOf(res)).toMatchObject({ value: "", path: "/", maxAge: 0 });
  });

  it("🔴 연결 안 됨 → 연결 대기 쿠키(10분 · httpOnly · Lax · path=/) + /login?callbackUrl=/account/eywa-link", async () => {
    seed({ eywaUserId: null, eywaLinkedAt: null });
    const res = await get(`?token=${ssoToken()}`);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(
      `${TEST_ORIGIN}/login?callbackUrl=%2Faccount%2Feywa-link`,
    );
    const cookie = pendingOf(res);
    expect(cookie).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 600,
    });
    // 내용은 표의 sub·이름·이메일 — 위조 불가(AUTH_SECRET 에서 유도한 열쇠)
    expect(
      openEywaLinkPending(cookie!.value, {
        secret: process.env.AUTH_SECRET,
        now: new Date(),
      }),
    ).toMatchObject({ sub: SUB, name: "김선생", email: EMAIL });
    expect(sessionCookieFromJar()).toBeNull();
    expect(emailLookups()).toStrictEqual([]);
    expect(db.user.updateMany).not.toHaveBeenCalled();
  });

  it("🔴 원장 세션이 있어도 연결 안 된 표면 그 세션을 끊는다 — 연결은 새 비밀번호 로그인 뒤에만", async () => {
    seed({ eywaUserId: null, eywaLinkedAt: null });
    resetRequest({
      cookie: await cookieHeaderFor({
        sub: OTHER_ID,
        id: OTHER_ID,
        email: "other@example.test",
        sessionVersion: 0,
      }),
    });
    const res = await get(`?token=${ssoToken()}`);
    expect(res.headers.get("location")).toBe(
      `${TEST_ORIGIN}/login?callbackUrl=%2Faccount%2Feywa-link`,
    );
    expect(sessionCookieCleared()).toBe(true);
    expect(pendingOf(res)?.value).toBeTruthy();
  });

  it("🔴 학생 세션이어도 끊는다", async () => {
    seed({ eywaUserId: null, eywaLinkedAt: null });
    resetRequest({
      cookie: await cookieHeaderFor({
        student: {
          accountId: "20000000-0000-4000-8000-000000000001",
          studentId: "30000000-0000-4000-8000-000000000001",
          name: "이서준",
          mustChangePassword: false,
        },
      }),
    });
    await get(`?token=${ssoToken()}`);
    expect(sessionCookieCleared()).toBe(true);
  });

  it("다른 계정으로 로그인돼 있으면 연결된 표의 계정으로 바뀐다", async () => {
    resetRequest({
      cookie: await cookieHeaderFor({
        sub: OTHER_ID,
        id: OTHER_ID,
        email: "other@example.test",
        sessionVersion: 0,
      }),
    });
    await get(`?token=${ssoToken()}`);
    const token = await decodeSessionToken(sessionCookieFromJar()!);
    expect(token?.id).toBe(DIRECTOR_ID);
  });

  it("🔴 연결은 됐는데 정지된 계정 → /login, 연결 대기 쿠키 없음 (연결 안내를 띄우지 않는다)", async () => {
    seed({ suspendedAt: new Date() });
    const res = await get(`?token=${ssoToken()}`);
    expect(res.headers.get("location")).toBe(`${TEST_ORIGIN}/login`);
    expect(pendingOf(res)).toBeUndefined();
  });

  it.each([
    ["표 없음", ""],
    ["빈 표", "?token="],
    ["틀린 서명", `?token=${ssoToken({}, "wrong-secret-0123456789abcdef")}`],
    ["sub 없는 표", `?token=${ssoToken({ sub: undefined })}`],
  ])(
    "%s → /login 으로 303, 연결 대기 쿠키 없음 · 지금 세션은 그대로",
    async (_label, query) => {
      seed({ eywaUserId: null, eywaLinkedAt: null });
      resetRequest({
        cookie: await cookieHeaderFor({
          sub: OTHER_ID,
          id: OTHER_ID,
          email: "other@example.test",
          sessionVersion: 0,
        }),
      });
      const res = await get(query);
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe(`${TEST_ORIGIN}/login`);
      expect(pendingOf(res)).toBeUndefined();
      expect(sessionCookieCleared()).toBe(false);
    },
  );
});

describe("⑶ 🔴 이메일/비밀번호 로그인은 연결을 만들지 않는다", () => {
  it("연결 대기 쿠키를 들고 비밀번호로 로그인해도 DB 에 아무것도 안 쓴다", async () => {
    seed({ eywaUserId: null, eywaLinkedAt: null });
    const res = await get(`?token=${ssoToken()}`);
    const pending = pendingOf(res)!.value;
    resetRequest({ cookie: `${EYWA_LINK_PENDING_COOKIE}=${pending}` });
    await signIn("credentials", {
      email: EMAIL,
      password: PASSWORD,
      redirect: false,
    });
    expect(sessionCookieFromJar()).not.toBeNull();
    expect(db.user.updateMany).not.toHaveBeenCalled();
    expect(db.user.update).not.toHaveBeenCalled();
    expect(db.user.upsert).not.toHaveBeenCalled();
    expect(director().eywaUserId).toBeNull();
  });
});

describe("⑷ 끝에서 끝 — 연결 안 된 SSO → 비밀번호 로그인 → [연결] → 다음 SSO 는 곧장", () => {
  it("🔴 한 번 연결하면 다음 eywa 표가 곧장 그 계정으로 들인다", async () => {
    seed({ eywaUserId: null, eywaLinkedAt: null });

    // ① 연결 안 된 표 → 연결 대기 쿠키 + 로그인 화면
    const first = await get(`?token=${ssoToken()}`);
    expect(first.headers.get("location")).toContain("/login?callbackUrl=");
    const pending = pendingOf(first)!.value;

    // ② 계정 주인이 비밀번호로 로그인
    resetRequest({ cookie: `${EYWA_LINK_PENDING_COOKIE}=${pending}` });
    await signIn("credentials", {
      email: EMAIL,
      password: PASSWORD,
      redirect: false,
    });
    const session = sessionCookieFromJar();
    expect(session).not.toBeNull();
    carryJarToNextRequest();

    // ③ 확인 화면에서 [연결]
    const linked = await (
      linkPost as unknown as (r: NextRequest) => Promise<Response>
    )(
      new NextRequest(`${TEST_ORIGIN}/api/account/eywa-link`, {
        method: "POST",
        headers: {
          origin: TEST_ORIGIN,
          "content-type": "application/json",
          cookie: `${SESSION_COOKIE}=${session}; ${EYWA_LINK_PENDING_COOKIE}=${pending}`,
        },
        body: JSON.stringify({ action: "link" }),
      }),
    );
    expect(linked.status).toBe(200);
    expect(director().eywaUserId).toBe(SUB);
    expect(director().eywaLinkedAt).toBeInstanceOf(Date);
    expect(pendingOf(linked)).toMatchObject({ value: "", maxAge: 0 });

    // ④ 다른 브라우저(쿠키 없음)에서 다음 표 → 곧장 로그인
    resetRequest();
    const next = await get(`?token=${ssoToken()}`);
    expect(next.headers.get("location")).toBe(`${TEST_ORIGIN}/`);
    const token = await decodeSessionToken(sessionCookieFromJar()!);
    expect(token?.id).toBe(DIRECTOR_ID);
    expect(emailLookups().length).toBe(1); // ② 비밀번호 로그인의 한 번뿐 — SSO 쪽은 0
  });
});
