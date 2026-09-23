/**
 * 🔴 RED → 🟢 — 인쇄 지면(`/tests/{id}/print`)의 시험지 조회 범위 (D-130).
 *
 * 지면 모양은 이 결정과 무관하다(D-07 — 건드리지 않는다). 여기서 보는 것은 **어느 시험지를
 * 읽느냐** 하나다: 관리자 아님은 자기 시험지만(지금 그대로), 관리자는 남의 반 시험지도.
 * 페이지가 서버 컴포넌트라 db 를 모킹해 where 모양을 짝으로 견준다.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  findFirst: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ getSessionUser: mocks.session }));
vi.mock("@/lib/db", () => ({ db: { test: { findFirst: mocks.findFirst } } }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));
vi.mock("@/components/print/TestPrint", () => ({ TestPrint: () => null }));

import TestPrintPage from "@/app/(main)/tests/[id]/print/page";

const TEST_ID = "90000000-0000-4000-8000-0000000000f1";
const VIEWER = {
  id: "10000000-0000-4000-8000-0000000000ad",
  email: "director@todaysmath.test",
  name: "원장",
};
const page = () => TestPrintPage({ params: Promise.resolve({ id: TEST_ID }) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findFirst.mockResolvedValue(null);
});

describe.each([
  {
    who: "관리자 아님",
    isAdmin: false,
    where: { id: TEST_ID, userId: VIEWER.id },
  },
  { who: "관리자", isAdmin: true, where: { id: TEST_ID } },
] as const)("인쇄 지면 조회 — $who", ({ isAdmin, where }) => {
  it("시험지 where", async () => {
    mocks.session.mockResolvedValue({
      ...VIEWER,
      isAdmin,
      isSuperAdmin: isAdmin,
    });
    await expect(page()).rejects.toThrow("NOT_FOUND");
    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where }),
    );
  });
});
