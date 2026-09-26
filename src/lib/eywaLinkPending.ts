/**
 * eywa 연결 대기 쿠키 (D-139 ⑹) — 올바른 eywa 표를 들고 왔지만 그 `sub` 에 연결된 계정이 없을 때
 * 입구(`GET /api/sso/eywa`)가 심는다. 로그인 화면이 안내 줄을, 확인 화면이 질문을 이 값으로 그린다.
 *
 * 내용 `{sub, name, email, exp}` 는 비밀이 아니지만 **위조되면 안 된다** — 확인 화면의 [연결]이 이 `sub` 를
 * 계정에 묶는다. 그래서 `AUTH_SECRET` 에서 **따로 유도한 열쇠**(HKDF, 용도 문자열로 갈랐다)로 HMAC 서명한다.
 * 세션 쿠키용 열쇠와도, eywa 와 나눠 가진 `EYWA_SSO_SECRET` 과도 다른 열쇠다(eywa 가 이 쿠키를 지을 수 없다).
 *
 * 형식은 eywa 표와 같은 꼴 `v1.<payloadB64>.<sigB64>`(base64url · 패딩 없음). 수명 10분.
 * 🔴 `AUTH_SECRET` 이 없으면 봉인도 열기도 하지 않는다(null) — 입구는 그때 평소 로그인 화면으로 보낸다.
 */
import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";

import { z } from "zod";

export const EYWA_LINK_PENDING_COOKIE = "eywa-link-pending";
export const EYWA_LINK_PENDING_SECONDS = 600;

const KEY_INFO = "todays-math/eywa-link-pending/v1";
const MAX_VALUE_LENGTH = 2048;
const VALUE_PATTERN = /^v1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/;

const pendingSchema = z.strictObject({
  sub: z.uuid(),
  name: z.string().max(200),
  email: z.string().max(255),
  exp: z.number().int().nonnegative(),
});
export type EywaLinkPending = z.infer<typeof pendingSchema>;

type Keying = { secret: string | undefined; now: Date };

function keyFor(secret: string): Buffer {
  return Buffer.from(hkdfSync("sha256", secret, "", KEY_INFO, 32));
}

function signature(secret: string, payloadB64: string): Buffer {
  return createHmac("sha256", keyFor(secret))
    .update(`v1.${payloadB64}`)
    .digest();
}

/** 표에서 읽은 사람을 10분짜리 쿠키 값으로 봉인한다. 비밀이 없으면 null. */
export function sealEywaLinkPending(
  who: { sub: string; name: string; email: string },
  { secret, now }: Keying,
): string | null {
  if (!secret) return null;
  const payload: EywaLinkPending = {
    sub: who.sub,
    name: who.name,
    email: who.email,
    exp: Math.floor(now.getTime() / 1000) + EYWA_LINK_PENDING_SECONDS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  return `v1.${payloadB64}.${signature(secret, payloadB64).toString("base64url")}`;
}

/** 쿠키 값을 연다 — 서명·형식·만료 중 하나라도 어긋나면 null(없는 것과 같다). */
export function openEywaLinkPending(
  value: unknown,
  { secret, now }: Keying,
): EywaLinkPending | null {
  if (!secret) return null;
  if (typeof value !== "string" || value.length > MAX_VALUE_LENGTH) return null;
  const match = VALUE_PATTERN.exec(value);
  if (!match) return null;
  const [, payloadB64, signatureB64] = match;
  const expected = signature(secret, payloadB64);
  const provided = Buffer.from(signatureB64, "base64url");
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  )
    return null;
  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  const parsed = pendingSchema.safeParse(payload);
  if (!parsed.success) return null;
  if (Math.floor(now.getTime() / 1000) >= parsed.data.exp) return null;
  return parsed.data;
}

/** 요청 안에서 여는 한 줄 — 비밀은 `AUTH_SECRET`, 시각은 지금 */
export function openEywaLinkPendingNow(value: unknown): EywaLinkPending | null {
  return openEywaLinkPending(value, {
    secret: process.env.AUTH_SECRET,
    now: new Date(),
  });
}

/** 심을 쿠키 — httpOnly · SameSite=Lax(eywa 에서 넘어오는 첫 이동에도 실린다) · path=/ · 10분 */
export function eywaLinkPendingCookie(value: string, secure: boolean) {
  return {
    name: EYWA_LINK_PENDING_COOKIE,
    value,
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: EYWA_LINK_PENDING_SECONDS,
  };
}

/**
 * 지우는 쿠키 — 심을 때와 같은 속성(path=/ · Secure · SameSite)에 빈 값 · Max-Age=0.
 * 속성을 한 함수에서 뽑아, 심는 쪽과 지우는 쪽이 어긋날 자리를 두지 않는다.
 */
export function clearedEywaLinkPendingCookie(secure: boolean) {
  return { ...eywaLinkPendingCookie("", secure), maxAge: 0 };
}
