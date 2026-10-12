/**
 * 🔴 RED → 🟢 — D-140 ⑶ 로그인하면 강사는 «내 반»(원장님 2026-09-26).
 *
 *   구현: src/lib/loginLanding.ts · src/app/(main)/page.tsx · src/components/auth/AuthForm.tsx(한 줄)
 *
 * 로그인 화면은 역할을 모른다. 기본 목적지(`/`)로 가는 로그인은 `/` 에 **표지**를 달아 보내고,
 * `/` 가 계정을 읽어 첫 화면을 정한다. 🔴 짝으로 둔다 —
 *   · 강사 + 표지 → `/classes/manage`
 *   · 강사 + 표지 없음 → 작업실(작업실로 돌아오는 길을 막지 않는다)
 *   · 원장 · 관리자 · 독립 운영자 · 서비스 관리자 · 검수 → 예전과 같은 곳(표지는 떼어 낸다)
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ALL_WORKSPACE_MENUS,
  type AccountAccess,
} from "@/contracts/accountAccess.contract";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({ auth: vi.fn(), bootstrap: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
vi.mock("@/lib/unifiedPreview", () => ({
  loadUnifiedBankBootstrap: mocks.bootstrap,
}));
vi.mock("@/components/landing/LandingPage", () => ({
  default: "landing-page",
}));
vi.mock("@/components/unified/UnifiedWorkspace", () => ({
  default: "workspace",
}));

import MainPage from "@/app/(main)/page";
import WorkspacePage from "@/components/unified/WorkspacePage";
import {
  LOGIN_LANDING,
  TEACHER_HOME,
  isLoginEntry,
  landingAfterLogin,
} from "@/lib/loginLanding";

const BRANCH = "20000000-0000-4000-8000-000000000002";
const base: AccountAccess = {
  id: "teacher-one",
  name: "김선생",
  email: "teacher@example.com",
  role: "director",
  isAdmin: false,
  isSuperAdmin: false,
  branchId: BRANCH,
  branchRole: "teacher",
  approvalStatus: "approved",
  menus: ALL_WORKSPACE_MENUS.filter((m) => m !== "bank"),
};
const TEACHER = base;
const OWNER: AccountAccess = {
  ...base,
  isAdmin: true,
  branchRole: "owner",
  menus: ALL_WORKSPACE_MENUS,
};
const MANAGER: AccountAccess = { ...OWNER, branchRole: "manager" };
const INDEPENDENT: AccountAccess = {
  ...base,
  branchId: null,
  branchRole: null,
};
const SUPER: AccountAccess = {
  ...OWNER,
  isSuperAdmin: true,
  branchId: null,
  branchRole: null,
};
const REVIEWER: AccountAccess = {
  ...base,
  role: "reviewer",
  branchId: null,
  branchRole: null,
  menus: ["bank"],
};

const signedIn = (account: AccountAccess) =>
  mocks.auth.mockResolvedValue({ user: { ...account } });
const entry = (value?: string) =>
  MainPage({
    searchParams: Promise.resolve(value === undefined ? {} : { entry: value }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.bootstrap.mockResolvedValue({
    total: 0,
    grades: [],
    chapters: [],
    units: [],
  });
});

describe("landingAfterLogin — 로그인 직후 첫 화면", () => {
  it("🔴 강사는 내 반", () => {
    expect(landingAfterLogin(TEACHER)).toBe(TEACHER_HOME);
    expect(TEACHER_HOME).toBe("/classes/manage");
  });

  it("🔴 원장 · 관리자 · 독립 운영자 · 서비스 관리자 · 검수는 `/` 그대로", () => {
    for (const account of [OWNER, MANAGER, INDEPENDENT, SUPER, REVIEWER])
      expect(landingAfterLogin(account)).toBe("/");
  });

  it("반 관리 화면이 받아 주지 않는 강사(수업 메뉴 꺼짐·승인 전)는 `/` — 두 번 튕기지 않는다", () => {
    expect(
      landingAfterLogin({
        ...TEACHER,
        menus: TEACHER.menus.filter((m) => m !== "teaching"),
      }),
    ).toBe("/");
    expect(landingAfterLogin({ ...TEACHER, approvalStatus: "pending" })).toBe(
      "/",
    );
  });

  it("표지는 `/?entry=login` 하나 — 다른 값은 표지가 아니다", () => {
    expect(LOGIN_LANDING).toBe("/?entry=login");
    expect(isLoginEntry("login")).toBe(true);
    expect(isLoginEntry(["login", "x"])).toBe(true);
    expect(isLoginEntry(undefined)).toBe(false);
    expect(isLoginEntry("")).toBe(false);
    expect(isLoginEntry("LOGIN")).toBe(false);
  });
});

describe("`/` 페이지 — 표지가 있을 때만 첫 화면을 고른다", () => {
  it("🔴 강사 + 표지 → 내 반", async () => {
    signedIn(TEACHER);
    await expect(entry("login")).rejects.toThrow(`redirect:${TEACHER_HOME}`);
  });

  it("🔴 강사 + 표지 없음 → 작업실 그대로 — 작업실로 돌아오는 길을 막지 않는다", async () => {
    signedIn(TEACHER);
    const page = await entry();
    expect(page.type).toBe(WorkspacePage);
    // 인자 없이 부르는 예전 모양도 그대로
    expect((await MainPage()).type).toBe(WorkspacePage);
  });

  it("🔴 원장 · 관리자 · 독립 운영자 · 서비스 관리자 + 표지 → 표지만 떼고 `/`", async () => {
    for (const account of [OWNER, MANAGER, INDEPENDENT, SUPER]) {
      signedIn(account);
      await expect(entry("login")).rejects.toThrow(/^redirect:\/$/);
      // 표지 없이 다시 오면 작업실 — 예전 목적지와 같다
      expect((await entry()).type).toBe(WorkspacePage);
    }
  });

  it("검수 계정 · 승인 전 계정은 예전 갈래가 먼저다", async () => {
    signedIn(REVIEWER);
    await expect(entry("login")).rejects.toThrow("redirect:/review");
    signedIn({ ...TEACHER, approvalStatus: "pending" });
    await expect(entry("login")).rejects.toThrow("redirect:/approval-pending");
  });

  it("표지가 없으면 누구도 돌려보내지 않는다 — 다른 값의 entry 도", async () => {
    signedIn(TEACHER);
    expect((await entry("other")).type).toBe(WorkspacePage);
  });

  it("로그인 안 한 사람은 표지가 있어도 첫 화면(안내 화면)", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await entry("login")).type).toBe("landing-page");
  });
});
