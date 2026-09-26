// @vitest-environment node
/**
 * eywa 자동 로그인 표 판정 (`src/lib/eywaSso.ts`) — 순수 함수.
 * 표는 eywa 세션 브리프의 형식 그대로 여기서 직접 서명해 만든다(`sign`).
 */
import { createHmac } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  authorizeEywaSso,
  verifyEywaSsoToken,
  type EywaSsoDeps,
} from "@/lib/eywaSso";

const SECRET = "eywa-sso-test-secret-0123456789abcdef";
const NOW = new Date("2026-09-26T08:00:00.000Z");
const NOW_S = Math.floor(NOW.getTime() / 1000);
const TENANT = "0f0e0d0c-0b0a-4908-8706-050403020100";

const claims = (over: Record<string, unknown> = {}) => ({
  iss: "aywa",
  aud: "todays-math",
  email: "teacher@example.test",
  name: "김선생",
  tenantId: TENANT,
  iat: NOW_S,
  exp: NOW_S + 60,
  jti: "7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
  ...over,
});

function sign(payload: unknown, secret = SECRET): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const sig = createHmac("sha256", secret)
    .update(`v1.${body}`)
    .digest("base64url");
  return `v1.${body}.${sig}`;
}

const verify = (
  token: unknown,
  over: Partial<Parameters<typeof verifyEywaSsoToken>[1]> = {},
) => verifyEywaSsoToken(token, { secret: SECRET, now: NOW, ...over });

describe("표 판정 — 받는 것", () => {
  it("규약대로 서명한 60초 표는 받고, 담긴 칸을 그대로 돌려준다", () => {
    expect(verify(sign(claims()))).toStrictEqual({
      ok: true,
      claims: claims(),
    });
  });

  it("시계 오차 30초까지는 만료·미래 표를 받는다", () => {
    expect(verify(sign(claims({ iat: NOW_S - 90, exp: NOW_S - 30 }))).ok).toBe(
      true,
    );
    expect(verify(sign(claims({ iat: NOW_S + 30, exp: NOW_S + 90 }))).ok).toBe(
      true,
    );
  });

  it("허용 지점 목록이 있으면 그 지점 표만 받는다 (공백·빈 칸은 무시)", () => {
    const token = sign(claims());
    expect(verify(token, { allowedTenants: ` other , ${TENANT} ,` }).ok).toBe(
      true,
    );
    expect(verify(token, { allowedTenants: "" }).ok).toBe(true);
  });
});

describe("표 판정 — 거절 (이유까지 가른다)", () => {
  it.each([
    ["비밀 없음", undefined],
    ["비밀 16자 미만", "short-secret-15"],
  ])("🔴 %s — 기능 꺼짐, 올바른 표도 거절", (_label, secret) => {
    expect(verify(sign(claims()), { secret })).toStrictEqual({
      ok: false,
      reason: "disabled",
    });
  });

  it.each([
    ["문자열이 아님", 42],
    ["판 표시 없음", sign(claims()).slice(3)],
    ["다른 판", sign(claims()).replace(/^v1\./, "v2.")],
    ["조각 둘", "v1.abc"],
    ["패딩 문자", `${sign(claims())}=`],
    ["너무 김", `v1.${"a".repeat(5000)}.b`],
  ])("형식 틀림 — %s", (_label, token) => {
    expect(verify(token)).toStrictEqual({ ok: false, reason: "malformed" });
  });

  it("🔴 다른 비밀로 서명한 표 · 본문을 바꿔치기한 표는 서명에서 떨어진다", () => {
    expect(verify(sign(claims(), "another-secret-0123456789abcdef"))).toEqual({
      ok: false,
      reason: "signature",
    });
    const [, , sig] = sign(claims()).split(".");
    const forged = Buffer.from(
      JSON.stringify(claims({ email: "admin@example.test" })),
    ).toString("base64url");
    expect(verify(`v1.${forged}.${sig}`)).toEqual({
      ok: false,
      reason: "signature",
    });
    expect(verify(`v1.${forged}.`)).toEqual({ ok: false, reason: "malformed" });
  });

  it.each([
    ["발급자", { iss: "someone" }],
    ["받는 곳", { aud: "eywa" }],
    ["이메일 형식", { email: "not-an-email" }],
    ["대문자 이메일", { email: "Teacher@example.test" }],
    ["앞뒤 공백 이메일", { email: " teacher@example.test" }],
    ["지점 없음", { tenantId: "" }],
    ["만료가 발급보다 앞", { exp: NOW_S - 1 }],
    ["수명 5분 초과", { exp: NOW_S + 301 }],
    ["jti 없음", { jti: undefined }],
  ])("칸 틀림 — %s", (_label, over) => {
    expect(verify(sign(claims(over)))).toStrictEqual({
      ok: false,
      reason: "claims",
    });
  });

  it("JSON 이 아닌 본문도 칸 틀림이다 (서명은 맞아도)", () => {
    const body = Buffer.from("not json").toString("base64url");
    const sig = createHmac("sha256", SECRET)
      .update(`v1.${body}`)
      .digest("base64url");
    expect(verify(`v1.${body}.${sig}`)).toEqual({
      ok: false,
      reason: "claims",
    });
  });

  it("만료 + 30초를 넘긴 표 · 발급이 30초 넘게 미래인 표", () => {
    expect(
      verify(sign(claims({ iat: NOW_S - 91, exp: NOW_S - 31 }))),
    ).toStrictEqual({ ok: false, reason: "expired" });
    expect(
      verify(sign(claims({ iat: NOW_S + 31, exp: NOW_S + 91 }))),
    ).toStrictEqual({ ok: false, reason: "not-yet-valid" });
  });

  it("허용 지점 목록 밖의 지점 표", () => {
    expect(
      verify(sign(claims()), { allowedTenants: "some-other-tenant" }),
    ).toStrictEqual({ ok: false, reason: "tenant" });
  });
});

describe("authorize — 기존 계정만, 가입 없음", () => {
  const USER = {
    id: "10000000-0000-4000-8000-000000000001",
    email: "teacher@example.test",
    name: "선생님",
    role: "director" as const,
    passwordHash: "$2a$04$hash",
    deletedAt: null,
    suspendedAt: null,
    sessionVersion: 3,
  };
  const deps = (row: typeof USER | null): EywaSsoDeps => ({
    secret: SECRET,
    now: NOW,
    findUser: vi.fn(async () => row),
    audit: vi.fn(async () => {}),
  });

  it("이메일로 찾은 계정을 이메일 로그인과 같은 모양으로 돌려주고, SSO 표시로 감사를 남긴다", async () => {
    const d = deps(USER);
    await expect(authorizeEywaSso(sign(claims()), d)).resolves.toStrictEqual({
      id: USER.id,
      email: USER.email,
      name: USER.name,
      role: "director",
      sessionVersion: 3,
    });
    expect(d.findUser).toHaveBeenCalledWith("teacher@example.test");
    expect(d.audit).toHaveBeenCalledWith({
      userId: USER.id,
      actorId: USER.id,
      action: "auth.login",
      outcome: "success",
      details: { method: "eywa-sso", tenantId: TENANT },
    });
  });

  it.each([
    ["계정 없음", null],
    ["비밀번호 없는 계정", { ...USER, passwordHash: null }],
    ["지워진 계정", { ...USER, deletedAt: new Date() }],
    ["정지된 계정", { ...USER, suspendedAt: new Date() }],
  ])("🔴 %s — null, 감사 없음", async (_label, row) => {
    const d = deps(row as typeof USER | null);
    await expect(authorizeEywaSso(sign(claims()), d)).resolves.toBeNull();
    expect(d.audit).not.toHaveBeenCalled();
  });

  it("표가 틀리면 계정을 찾아보지도 않는다", async () => {
    const d = deps(USER);
    await expect(
      authorizeEywaSso(sign(claims(), "wrong-secret-0123456789abcdef"), d),
    ).resolves.toBeNull();
    expect(d.findUser).not.toHaveBeenCalled();
  });
});
