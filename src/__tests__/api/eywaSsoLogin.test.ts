// @vitest-environment node
/**
 * eywa 자동 로그인 — **진짜** next-auth·@auth/core 를 태워, `eywa-sso` 로 들어온 원장 토큰이
 * 이메일 로그인과 **칸 이름까지 같은지**, 그리고 라우트 `GET /api/sso/eywa` 의 보냄을 본다.
 * 요청 맥락은 `authDirectorUnchanged.test.ts` 와 같은 대역(`../helpers/authRequestContext.ts`)이다.
 *
 * 🔴 가입 없음: db 대역에 `user.create`·`upsert` 가 **없다** — 불리면 TypeError 로 빨개진다.
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
import { GET } from "@/app/api/sso/eywa/route";
import { signIn } from "@/lib/auth";

import {
  assertTestAuthEnv,
  cookieHeaderFor,
  decodeSessionToken,
  resetRequest,
  sessionCookieFromJar,
  withoutJwtClaims,
} from "../helpers/authRequestContext";

const SSO_SECRET = "eywa-sso-test-secret-0123456789abcdef";
const TENANT = "0f0e0d0c-0b0a-4908-8706-050403020100";
const DIRECTOR_ID = "10000000-0000-4000-8000-000000000001";
const OTHER_ID = "10000000-0000-4000-8000-000000000002";
const EMAIL = "teacher@example.test";
let passwordHash = "";

function seed(overrides: Record<string, unknown> = {}) {
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
    ...overrides,
  });
  store.users.set(OTHER_ID, {
    ...store.users.get(DIRECTOR_ID),
    id: OTHER_ID,
    email: "other@example.test",
    name: "다른 선생님",
  });
}

function ssoToken(over: Record<string, unknown> = {}, secret = SSO_SECRET) {
  const iat = Math.floor(Date.now() / 1000);
  const body = Buffer.from(
    JSON.stringify({
      iss: "aywa",
      aud: "todays-math",
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

const get = (query: string) =>
  (GET as unknown as (r: NextRequest) => Promise<Response>)(
    new NextRequest(`http://localhost:3000/api/sso/eywa${query}`),
  );

beforeAll(async () => {
  assertTestAuthEnv();
  passwordHash = await hash("correct-horse-battery", 4);
});
beforeEach(() => {
  process.env.EYWA_SSO_SECRET = SSO_SECRET;
  delete process.env.EYWA_SSO_TENANT_IDS;
  store.audits.length = 0;
  seed();
  resetRequest();
});
afterAll(() => {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe("eywa-sso 공급자 — 이메일 로그인과 같은 원장 토큰", () => {
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
      menus: ALL_WORKSPACE_MENUS.filter((m) => m !== "studio"),
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
  });

  it("승인 대기 계정도 그대로 들어오고 토큰이 «대기»를 싣는다 — 대기 갈래는 관문이 정한다", async () => {
    seed({ approvalStatus: "pending" });
    await signInSso(ssoToken());
    const token = await decodeSessionToken(sessionCookieFromJar()!);
    expect(token?.approvalStatus).toBe("pending");
  });

  it.each([
    ["계정 없는 이메일", {}, { email: "nobody@example.test" }],
    ["비밀번호 없는 계정", { passwordHash: null }, {}],
    ["지워진 계정", { deletedAt: new Date() }, {}],
    ["정지된 계정", { suspendedAt: new Date() }, {}],
  ])(
    "🔴 %s — CredentialsSignin · 쿠키 없음 · 계정 수 그대로",
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

  it("🔴 EYWA_SSO_SECRET 이 없으면 올바른 표도 거절한다 (기능 꺼짐)", async () => {
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

describe("GET /api/sso/eywa — 보냄", () => {
  it("올바른 표 → / 로 303, 세션 쿠키가 실린다", async () => {
    const res = await get(`?token=${ssoToken()}`);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
    const token = await decodeSessionToken(sessionCookieFromJar()!);
    expect(token?.id).toBe(DIRECTOR_ID);
  });

  it("🔴 다른 계정으로 로그인돼 있어도 표의 계정으로 바뀐다", async () => {
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

  it.each([
    ["표 없음", ""],
    ["빈 표", "?token="],
    ["틀린 서명", `?token=${ssoToken({}, "wrong-secret-0123456789abcdef")}`],
    ["없는 계정", `?token=${ssoToken({ email: "nobody@example.test" })}`],
  ])("%s → /login 으로 303, 쿠키 없음", async (_label, query) => {
    const res = await get(query);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login");
    expect(sessionCookieFromJar()).toBeNull();
  });
});
