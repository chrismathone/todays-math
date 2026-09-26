// @vitest-environment node
/**
 * eywa 연결 대기 쿠키 (`src/lib/eywaLinkPending.ts`, D-139 ⑹) — 순수 함수.
 *
 * 올바른 eywa 표를 들고 왔지만 연결된 계정이 없을 때 입구가 심는 쿠키다. 내용({sub,name,email,exp})은
 * 비밀이 아니지만 **위조되면 안 된다** — 확인 화면이 이 값을 계정에 묶기 때문이다. 열쇠는 `AUTH_SECRET`
 * 에서 **따로 유도한** 것이라, 세션 쿠키용 열쇠와도 eywa 표용 비밀과도 다르다.
 */
import { createHmac, hkdfSync } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  clearedEywaLinkPendingCookie,
  EYWA_LINK_PENDING_COOKIE,
  eywaLinkPendingCookie,
  openEywaLinkPending,
  sealEywaLinkPending,
} from "@/lib/eywaLinkPending";

const SECRET = "student-auth-test-secret-0123456789abcdef";
const NOW = new Date("2026-09-26T08:00:00.000Z");
const NOW_S = Math.floor(NOW.getTime() / 1000);
const WHO = {
  sub: "5b1c7e9a-2d4f-4a6b-9c8d-0e1f2a3b4c5d",
  name: "김선생",
  email: "teacher@example.test",
};

const seal = (secret: string | undefined = SECRET, now = NOW) =>
  sealEywaLinkPending(WHO, { secret, now });
const open = (value: unknown, secret: string | undefined = SECRET, now = NOW) =>
  openEywaLinkPending(value, { secret, now });

describe("봉인 → 열기", () => {
  it("봉인한 값은 10분 동안 그대로 열린다", () => {
    const value = seal();
    expect(value).toMatch(/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(open(value)).toStrictEqual({ ...WHO, exp: NOW_S + 600 });
    expect(
      open(value, SECRET, new Date(NOW.getTime() + 599_000)),
    ).not.toBeNull();
  });

  it("🔴 10분이 지나면 무효", () => {
    const value = seal();
    expect(open(value, SECRET, new Date(NOW.getTime() + 600_000))).toBeNull();
  });

  it("🔴 AUTH_SECRET 이 없으면 봉인하지 않고 열지도 않는다", () => {
    // 기본값이 끼어들지 않게 함수를 바로 부른다
    expect(
      sealEywaLinkPending(WHO, { secret: undefined, now: NOW }),
    ).toBeNull();
    expect(sealEywaLinkPending(WHO, { secret: "", now: NOW })).toBeNull();
    expect(
      openEywaLinkPending(seal(), { secret: undefined, now: NOW }),
    ).toBeNull();
  });
});

describe("🔴 위조 · 다른 열쇠 → 무효", () => {
  it("다른 AUTH_SECRET 으로 봉인한 값", () => {
    expect(open(seal("another-auth-secret-0123456789abcdef"))).toBeNull();
  });

  it("AUTH_SECRET 을 그대로 열쇠로 쓴 값 (따로 유도한 열쇠가 아니면 안 된다)", () => {
    const body = Buffer.from(
      JSON.stringify({ ...WHO, exp: NOW_S + 600 }),
    ).toString("base64url");
    const sig = createHmac("sha256", SECRET)
      .update(`v1.${body}`)
      .digest("base64url");
    expect(open(`v1.${body}.${sig}`)).toBeNull();
  });

  it("본문을 바꿔치기한 값 (서명은 원래 것)", () => {
    const [, , sig] = seal()!.split(".");
    const forged = Buffer.from(
      JSON.stringify({
        ...WHO,
        sub: "6c2d8f0b-3e5a-4b7c-8d9e-1f2a3b4c5d6e",
        exp: NOW_S + 600,
      }),
    ).toString("base64url");
    expect(open(`v1.${forged}.${sig}`)).toBeNull();
  });

  it("만료를 늘려 다시 쓴 값", () => {
    const [, , sig] = seal()!.split(".");
    const later = Buffer.from(
      JSON.stringify({ ...WHO, exp: NOW_S + 86_400 }),
    ).toString("base64url");
    expect(open(`v1.${later}.${sig}`)).toBeNull();
  });

  it.each([
    ["없음", undefined],
    ["빈 값", ""],
    ["문자열 아님", 42],
    ["판 표시 없음", "abc.def"],
    ["다른 판", (seal() ?? "").replace(/^v1\./, "v2.")],
    ["너무 김", `v1.${"a".repeat(5000)}.b`],
  ])("형식 틀림 — %s", (_label, value) => {
    expect(open(value)).toBeNull();
  });

  it("열쇠는 맞아도 칸이 틀리면 무효 (sub 가 uuid 아님)", () => {
    const key = Buffer.from(
      hkdfSync("sha256", SECRET, "", "todays-math/eywa-link-pending/v1", 32),
    );
    const body = Buffer.from(
      JSON.stringify({ ...WHO, sub: "not-a-uuid", exp: NOW_S + 600 }),
    ).toString("base64url");
    const sig = createHmac("sha256", key)
      .update(`v1.${body}`)
      .digest("base64url");
    expect(open(`v1.${body}.${sig}`)).toBeNull();
  });
});

describe("쿠키 속성", () => {
  it("httpOnly · SameSite=Lax · path=/ · 10분 · https 일 때만 Secure", () => {
    expect(eywaLinkPendingCookie("v1.a.b", true)).toStrictEqual({
      name: EYWA_LINK_PENDING_COOKIE,
      value: "v1.a.b",
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 600,
    });
    expect(eywaLinkPendingCookie("v1.a.b", false).secure).toBe(false);
  });

  it("🔴 지울 때도 path=/ (경로가 다르면 브라우저가 다른 쿠키로 본다) · 나머지 속성도 심을 때와 같다", () => {
    expect(clearedEywaLinkPendingCookie(true)).toStrictEqual({
      name: EYWA_LINK_PENDING_COOKIE,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 0,
    });
  });
});
