/**
 * 🔴 RED → 🟢 — 세션 사용자에 실리는 관리자 표시 (D-130).
 *
 * 소유 범위 판정(`ownerScope.ts`)은 `SessionUser.isAdmin` 을 읽는다. 그 값이 **어디서** 오는지를
 * 여기서 잠근다: Auth.js 세션의 `user.isAdmin` 이 boolean `true` 일 때만 참이다. 라우트 시험은
 * 전부 `getSessionUser` 를 모킹하므로 이 배선이 뒤집혀도(예: 늘 true) 아무도 못 본다.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));

import { getSessionUser } from "@/lib/session";

const base = {
  id: "10000000-0000-4000-8000-0000000000ad",
  email: "director@todaysmath.test",
  name: "원장",
  role: "director",
  approvalStatus: "approved",
  menus: [],
};

beforeEach(() => vi.clearAllMocks());

describe("getSessionUser — isAdmin", () => {
  it("세션이 관리자라고 하면 관리자", async () => {
    mocks.auth.mockResolvedValue({ user: { ...base, isAdmin: true } });
    expect(await getSessionUser()).toEqual({
      id: base.id,
      email: base.email,
      name: base.name,
      isAdmin: true,
    });
  });

  it("관리자가 아니면 false", async () => {
    mocks.auth.mockResolvedValue({ user: { ...base, isAdmin: false } });
    expect((await getSessionUser())?.isAdmin).toBe(false);
  });

  it("🔴 표시가 없거나 boolean true 가 아니면 false — 세션 모양 하나 틀린 날 전원이 관리자가 되지 않게", async () => {
    mocks.auth.mockResolvedValue({ user: { ...base } });
    expect((await getSessionUser())?.isAdmin).toBe(false);
    mocks.auth.mockResolvedValue({ user: { ...base, isAdmin: "true" } });
    expect((await getSessionUser())?.isAdmin).toBe(false);
  });

  it("승인 전 계정은 관리자 표시와 상관없이 null — 관문이 먼저다", async () => {
    mocks.auth.mockResolvedValue({
      user: { ...base, isAdmin: true, approvalStatus: "pending" },
    });
    expect(await getSessionUser()).toBeNull();
  });
});
