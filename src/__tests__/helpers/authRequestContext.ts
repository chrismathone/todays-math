/**
 * 진짜 Auth.js 를 태우는 시험의 **요청 맥락** — `next/headers` · `next/navigation` 대역과 세션 쿠키 도우미.
 *
 * 🔴 왜 있나: 세션의 모양은 우리 `session` 콜백 **혼자** 정하지 않는다. next-auth 의 서버 쪽
 *    `getSession` 이 그 위에 `{ user: args[0].user ?? args[0].token, ...session }` 을 한 겹 더
 *    씌운다(`node_modules/next-auth/lib/index.js` 30행). 콜백이 `user` 칸을 빼 두면 **토큰 통째가
 *    `session.user` 가 된다.** `auth` 를 모킹한 시험은 이 겹을 구조적으로 못 본다 —
 *    20번 교훈 2026-08-19 「AI 를 전부 모킹하면 실제로 실패하는 자리는 안 보인다」의 세션판이다.
 *    그래서 next-auth·@auth/core 는 **진짜로 두고**, Next 가 요청마다 채워 주는 두 자리
 *    (`headers()` · `cookies()`)만 대역으로 세운다.
 *
 * 쓰는 법 — 시험 파일 머리에(`vi.mock` 은 끌어올려지므로 공장 안에서 동적 import 한다):
 *
 *   const env = vi.hoisted(() => installTestAuthEnvInline());   // ← 아래 주석의 인라인 판
 *   vi.mock("next/headers", async () => (await import("../helpers/authRequestContext")).nextHeadersModule);
 *   vi.mock("next/navigation", async (orig) => ({
 *     ...(await orig<object>()),
 *     redirect: (await import("../helpers/authRequestContext")).redirectMock,
 *   }));
 *
 * ⚠️ `AUTH_SECRET` 은 `NextAuth(config)` 가 **모듈을 읽는 순간** 가져간다(`secret: process.env.AUTH_SECRET`).
 *    그래서 시험 파일의 `vi.hoisted` 에서 import 보다 먼저 넣는다. 여기 상수를 쓰지 않고 쿠키를 만들
 *    때마다 `process.env` 를 다시 읽는다 — 두 곳에 적은 비밀이 어긋나면 «복호화 실패 = 로그인 안 함»이
 *    되어 학생 시험이 **거짓 초록**이 된다.
 */
import { decode, encode, type JWT } from "next-auth/jwt";

/** 시험용 비밀 — 시험 파일의 `vi.hoisted` 가 같은 값을 넣는다(`assertTestAuthEnv` 가 대조). */
export const TEST_AUTH_SECRET = "student-auth-test-secret-0123456789abcdef";
export const TEST_ORIGIN = "http://localhost:3000";
/** http 라서 `__Secure-` 접두가 없다. 쿠키 이름이 곧 JWE 소금(salt)이다. */
export const SESSION_COOKIE = "authjs.session-token";

export function assertTestAuthEnv(): void {
  if (process.env.AUTH_SECRET !== TEST_AUTH_SECRET)
    throw new Error(
      "AUTH_SECRET 이 시험용 값이 아니다 — 시험 파일의 vi.hoisted 에서 import 전에 넣었는지 보라",
    );
  if (process.env.AUTH_URL !== TEST_ORIGIN)
    throw new Error("AUTH_URL 이 시험용 값이 아니다");
}

type CookieRecord = { value: string; options?: Record<string, unknown> };

/** 지금 요청 — `headers()` 가 돌려줄 머리와, `cookies().set` 이 쓰는 응답 쿠키 병 */
export const requestState = {
  headers: new Headers(),
  jar: new Map<string, CookieRecord>(),
};

/** 새 요청을 세운다. 쿠키 병도 비운다. */
export function resetRequest(init: { cookie?: string } = {}): void {
  requestState.headers = new Headers({
    host: "localhost:3000",
    "x-forwarded-proto": "http",
    origin: TEST_ORIGIN,
    ...(init.cookie ? { cookie: init.cookie } : {}),
  });
  requestState.jar = new Map();
}

/** 병에 담긴 세션 쿠키 — 지워진(값이 비었거나 만료) 쿠키는 없는 것으로 본다 */
export function sessionCookieFromJar(): string | null {
  const c = requestState.jar.get(SESSION_COOKIE);
  if (!c || c.value === "") return null;
  const maxAge = c.options?.maxAge;
  if (typeof maxAge === "number" && maxAge <= 0) return null;
  return c.value;
}

/** 병의 세션 쿠키가 «지우라»로 찍혔나 (Auth.js `sessionStore.clean()` 은 빈 값 + maxAge 0) */
export function sessionCookieCleared(): boolean {
  const c = requestState.jar.get(SESSION_COOKIE);
  return c !== undefined && (c.value === "" || c.options?.maxAge === 0);
}

/** 다음 요청 — 방금 받은 세션 쿠키를 들고 간다 */
export function carryJarToNextRequest(): void {
  const value = sessionCookieFromJar();
  resetRequest(value ? { cookie: `${SESSION_COOKIE}=${value}` } : {});
}

export async function encodeSessionToken(token: JWT): Promise<string> {
  return encode({
    token,
    secret: process.env.AUTH_SECRET ?? "",
    salt: SESSION_COOKIE,
  });
}

export async function decodeSessionToken(value: string): Promise<JWT | null> {
  return decode({
    token: value,
    secret: process.env.AUTH_SECRET ?? "",
    salt: SESSION_COOKIE,
  });
}

/** 토큰을 들고 오는 요청 — 쿠키 머리 한 줄 */
export async function cookieHeaderFor(token: JWT): Promise<string> {
  return `${SESSION_COOKIE}=${await encodeSessionToken(token)}`;
}

/** JWE 가 스스로 찍는 칸 — 모양을 견줄 때 뺀다 */
export function withoutJwtClaims(token: JWT | null): Record<string, unknown> {
  if (!token) return {};
  const rest: Record<string, unknown> = { ...token };
  delete rest.iat;
  delete rest.exp;
  delete rest.jti;
  return rest;
}

export const nextHeadersModule = {
  headers: async () => requestState.headers,
  cookies: async () => ({
    get: (name: string) => {
      const c = requestState.jar.get(name);
      return c ? { name, value: c.value } : undefined;
    },
    getAll: () =>
      [...requestState.jar.entries()].map(([name, c]) => ({
        name,
        value: c.value,
      })),
    has: (name: string) => requestState.jar.has(name),
    set: (name: string, value: string, options?: Record<string, unknown>) => {
      requestState.jar.set(name, { value, options });
    },
    delete: (name: string) => {
      requestState.jar.delete(name);
    },
  }),
};

/** `redirect()` 는 Next 에서 던져서 흐름을 끊는다 — 대역도 던진다(주소를 들고) */
export class RedirectSignal extends Error {
  constructor(readonly url: string) {
    super(`NEXT_REDIRECT ${url}`);
  }
}

export function redirectMock(url: string): never {
  throw new RedirectSignal(url);
}

resetRequest();
