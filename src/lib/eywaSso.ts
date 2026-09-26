/**
 * eywa → 오늘의 수학 자동 로그인(SSO) — 받는 쪽 판정 (원장님 2026-09-26, CLAUDE.md 절대 규칙 7 의 예외).
 *
 * eywa 가 로그인한 사람을 `GET /api/sso/eywa?token=<표>` 로 보낸다. 표는 두 곳이 나눠 가진
 * `EYWA_SSO_SECRET` 으로 서명한 60초짜리 1회용이다. 형식은 eywa 세션 브리프 그대로다:
 *   `v1.<payloadB64>.<sigB64>` · sig = base64url(HMAC-SHA256(secret, "v1." + payloadB64))
 *   payload = { iss:"aywa", aud:"todays-math", email, name, tenantId, iat, exp, jti }
 *
 * 🔴 **자동 가입 없음** — 같은 이메일의 기존 계정만 들어온다. 없으면 평소 로그인 화면으로.
 * 🔴 **로그인 규칙을 넓히지 않는다** — 비밀번호 없는 계정 · 지워진 계정 · 정지된 계정은 이메일 로그인과
 *    똑같이 못 들어온다. 승인 대기·메뉴·세션 버전은 Auth.js `jwt` 콜백이 원장 로그인과 같은 줄로 판정한다.
 * 🔴 비밀이 없거나 16자 미만이면 **늘 거절**한다(기능 꺼짐). 값은 코드·로그에 남기지 않는다.
 *
 * 1회용은 60초 만료로 대신한다(jti 기록 표 없음 — 1차안). 만료 판정에는 시계 오차 30초를 준다.
 * `EYWA_SSO_TENANT_IDS`(쉼표 목록)를 넣으면 그 eywa 지점의 표만 받는다 — 비어 있으면 모든 지점.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

import type { UserRole } from "@/contracts/problemReport.contract";

export const EYWA_SSO_PROVIDER_ID = "eywa-sso";
export const EYWA_SSO_PATH = "/api/sso/eywa";

const MIN_SECRET_LENGTH = 16;
const CLOCK_SKEW_SECONDS = 30;
/** 발급 규약은 60초다. 이보다 훨씬 긴 표는 발급 쪽 실수로 보고 받지 않는다 */
const MAX_LIFETIME_SECONDS = 300;
const MAX_TOKEN_LENGTH = 4096;
const TOKEN_PATTERN = /^v1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/;

const claimsSchema = z.object({
  iss: z.literal("aywa"),
  aud: z.literal("todays-math"),
  email: z
    .email()
    .max(255)
    .refine((email) => email === email.trim().toLowerCase()),
  name: z.string().max(200),
  tenantId: z.string().min(1).max(100),
  iat: z.number().int().nonnegative(),
  exp: z.number().int().nonnegative(),
  jti: z.string().min(1).max(100),
});
export type EywaSsoClaims = z.infer<typeof claimsSchema>;

export type EywaSsoRejection =
  | "disabled"
  | "malformed"
  | "signature"
  | "claims"
  | "expired"
  | "not-yet-valid"
  | "tenant";

export type EywaSsoOptions = {
  secret: string | undefined;
  now: Date;
  /** `EYWA_SSO_TENANT_IDS` — 쉼표로 가른 eywa 지점 id. 비었으면 지점을 가리지 않는다 */
  allowedTenants?: string;
};

export function verifyEywaSsoToken(
  token: unknown,
  { secret, now, allowedTenants }: EywaSsoOptions,
):
  | { ok: true; claims: EywaSsoClaims }
  | { ok: false; reason: EywaSsoRejection } {
  if (!secret || secret.length < MIN_SECRET_LENGTH)
    return { ok: false, reason: "disabled" };
  if (typeof token !== "string" || token.length > MAX_TOKEN_LENGTH)
    return { ok: false, reason: "malformed" };
  const match = TOKEN_PATTERN.exec(token);
  if (!match) return { ok: false, reason: "malformed" };
  const [, payloadB64, signatureB64] = match;

  // 서명부터 본다 — 서명이 안 맞는 본문은 읽지도 않는다
  const expected = createHmac("sha256", secret)
    .update(`v1.${payloadB64}`)
    .digest();
  const provided = Buffer.from(signatureB64, "base64url");
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  )
    return { ok: false, reason: "signature" };

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "claims" };
  }
  const parsed = claimsSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, reason: "claims" };
  const claims = parsed.data;
  if (
    claims.exp <= claims.iat ||
    claims.exp - claims.iat > MAX_LIFETIME_SECONDS
  )
    return { ok: false, reason: "claims" };

  const nowSeconds = Math.floor(now.getTime() / 1000);
  if (nowSeconds > claims.exp + CLOCK_SKEW_SECONDS)
    return { ok: false, reason: "expired" };
  if (claims.iat > nowSeconds + CLOCK_SKEW_SECONDS)
    return { ok: false, reason: "not-yet-valid" };

  const tenants = (allowedTenants ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (tenants.length && !tenants.includes(claims.tenantId))
    return { ok: false, reason: "tenant" };

  return { ok: true, claims };
}

type SsoUserRow = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  passwordHash: string | null;
  deletedAt: Date | null;
  suspendedAt: Date | null;
  sessionVersion: number;
};

export type EywaSsoDeps = EywaSsoOptions & {
  findUser: (email: string) => Promise<SsoUserRow | null>;
  audit: (entry: {
    userId: string;
    actorId: string;
    action: "auth.login";
    outcome: "success";
    details: { method: typeof EYWA_SSO_PROVIDER_ID; tenantId: string };
  }) => Promise<void>;
};

/**
 * Auth.js `eywa-sso` 공급자의 authorize — 돌려주는 모양은 이메일 로그인과 **같다**
 * ({id,email,name,role,sessionVersion}). 그 뒤는 `jwt` 콜백의 원장 줄이 그대로 처리한다.
 * 계정을 만들지 않는다 — 부르는 것은 `findUser` 하나뿐이다.
 */
export async function authorizeEywaSso(token: unknown, deps: EywaSsoDeps) {
  const verified = verifyEywaSsoToken(token, deps);
  if (!verified.ok) return null;
  const user = await deps.findUser(verified.claims.email);
  // 이메일 로그인과 같은 문턱 — 비밀번호 없는 계정(과거 구글 가입자 잔존분)도 못 들어온다
  if (!user?.passwordHash || user.deletedAt || user.suspendedAt) return null;
  await deps.audit({
    userId: user.id,
    actorId: user.id,
    action: "auth.login",
    outcome: "success",
    details: {
      method: EYWA_SSO_PROVIDER_ID,
      tenantId: verified.claims.tenantId,
    },
  });
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    sessionVersion: user.sessionVersion,
  };
}
