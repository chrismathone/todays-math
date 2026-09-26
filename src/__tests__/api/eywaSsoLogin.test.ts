// @vitest-environment node
/**
 * eywa 자동 로그인 — 🔴 **잠금 확인** (2026-09-26). **진짜** next-auth·@auth/core 를 태워, 비밀이 켜져 있고
 * 서명·계정이 모두 멀쩡한 표도 `eywa-sso` 공급자와 `GET /api/sso/eywa` 가 **들이지 않는지** 본다.
 * 까닭: eywa 이메일은 본인 확인 값이 아니다(eywa 직원이 확인 없이 자기 이메일을 바꿀 수 있다 — eywa 세션 답변).
 * 이메일로 계정을 찾으면 오늘의 수학에만 있는 원장·관리자 계정을 가져갈 수 있다. 다음 판은 바뀌지 않는
 * eywa 사용자 id(`sub`)를 비밀번호로 한 번 연결하는 방식(원장님 결정 대기).
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

import { GET } from "@/app/api/sso/eywa/route";
import { signIn } from "@/lib/auth";
import { db } from "@/lib/db";

import {
  assertTestAuthEnv,
  cookieHeaderFor,
  resetRequest,
  sessionCookieFromJar,
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

describe("🔴 eywa-sso 공급자 — 잠금: 올바른 표도 들이지 않는다 (2026-09-26)", () => {
  // eywa 이메일은 본인 확인 값이 아니다 — eywa 직원이 확인 없이 자기 이메일을 이 계정의 이메일로 바꿀 수 있다.
  // 비밀이 켜져 있고 표가 완벽해도, 이메일로 계정을 찾아 들이면 그대로 계정 탈취다.
  it("비밀이 켜져 있고 표·계정이 모두 멀쩡해도 CredentialsSignin · 쿠키 없음 · 감사 없음 · 이메일 조회 없음", async () => {
    const findUnique = vi.mocked(db.user.findUnique);
    findUnique.mockClear();
    const error = await signInSso(ssoToken()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CredentialsSignin);
    expect(sessionCookieFromJar()).toBeNull();
    expect(store.audits).toStrictEqual([]);
    expect(findUnique).not.toHaveBeenCalled();
  });
});

describe("GET /api/sso/eywa — 잠금 중 보냄", () => {
  it("🔴 올바른 표도 /login 으로 303, 세션 쿠키 없음", async () => {
    const res = await get(`?token=${ssoToken()}`);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login");
    expect(sessionCookieFromJar()).toBeNull();
  });

  it("🔴 다른 계정으로 로그인돼 있으면 그 세션은 그대로다(표의 계정으로 바뀌지 않는다)", async () => {
    resetRequest({
      cookie: await cookieHeaderFor({
        sub: OTHER_ID,
        id: OTHER_ID,
        email: "other@example.test",
        sessionVersion: 0,
      }),
    });
    const res = await get(`?token=${ssoToken()}`);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login");
    expect(sessionCookieFromJar()).toBeNull();
  });

  it.each([
    ["표 없음", ""],
    ["빈 표", "?token="],
    ["틀린 서명", `?token=${ssoToken({}, "wrong-secret-0123456789abcdef")}`],
  ])("%s → /login 으로 303, 쿠키 없음", async (_label, query) => {
    const res = await get(query);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login");
    expect(sessionCookieFromJar()).toBeNull();
  });
});
