/**
 * eywa 연계는 **소유자 계정 하나**의 것이다 (2026-09-07, 원장님 「eywa 배선 없이」).
 *
 * 새 계정으로 걸어 보니 메인에 원장님 학원의 동기화 상태(반 2개 · 학생 17 · 진도 331행)와
 * 「지금 가져오기」 버튼이 **그대로** 떴다. `POST /api/eywa-sync` 는 로그인만 돼 있으면
 * 누구나 부를 수 있었다. 소유자는 `EYWA_SYNC_OWNER_EMAIL` 하나로 정해져 있으니(`runSync.ts`)
 * 판정도 **그 값 하나**에서 나와야 한다 — 두 벌 두지 않는다.
 */
import { afterEach, describe, expect, it } from "vitest";

import { isEywaOwner } from "@/lib/eywa/owner";

const saved = process.env.EYWA_SYNC_OWNER_EMAIL;
afterEach(() => {
  if (saved === undefined) delete process.env.EYWA_SYNC_OWNER_EMAIL;
  else process.env.EYWA_SYNC_OWNER_EMAIL = saved;
});

describe("isEywaOwner", () => {
  it("소유자 이메일과 같으면 참 — 대소문자·양끝 공백은 무시한다", () => {
    process.env.EYWA_SYNC_OWNER_EMAIL = "Owner@Todaysmath.test";
    expect(isEywaOwner("owner@todaysmath.test")).toBe(true);
    expect(isEywaOwner("  OWNER@todaysmath.test ")).toBe(true);
  });

  it("다른 계정은 거짓", () => {
    process.env.EYWA_SYNC_OWNER_EMAIL = "owner@todaysmath.test";
    expect(isEywaOwner("walk@todaysmath.test")).toBe(false);
    expect(isEywaOwner("")).toBe(false);
  });

  it("🔴 소유자가 정해져 있지 않으면 **아무도** 소유자가 아니다 — 빈 값끼리 같다고 통과시키지 않는다", () => {
    delete process.env.EYWA_SYNC_OWNER_EMAIL;
    expect(isEywaOwner("")).toBe(false);
    expect(isEywaOwner("owner@todaysmath.test")).toBe(false);
    process.env.EYWA_SYNC_OWNER_EMAIL = "   ";
    expect(isEywaOwner("")).toBe(false);
  });
});
