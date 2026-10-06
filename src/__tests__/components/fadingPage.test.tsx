import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ enabled: vi.fn(), student: vi.fn() }));
vi.mock("@/lib/fading/enabled", () => ({ fadingEnabled: mocks.enabled }));
vi.mock("@/lib/learn/studentRequest", () => ({
  getStudentSession: mocks.student,
}));
vi.mock("@/components/fading/StudentFadingApp", () => ({
  StudentFadingApp: () => null,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("404");
  },
  redirect: (url: string) => {
    throw new Error(url);
  },
}));
import Page from "@/app/learn/fading/page";
beforeEach(() => vi.clearAllMocks());
describe("오늘의 기억 페이지 문", () => {
  it("서버 문이 꺼졌으면 세션을 읽기도 전에 404다", async () => {
    mocks.enabled.mockReturnValue(false);
    await expect(Page()).rejects.toThrow("404");
    expect(mocks.student).not.toHaveBeenCalled();
  });
  it("열린 문에도 로그인과 첫 비밀번호를 확인한다", async () => {
    mocks.enabled.mockReturnValue(true);
    mocks.student.mockResolvedValue(null);
    await expect(Page()).rejects.toThrow("/learn/login");
    mocks.student.mockResolvedValue({ mustChangePassword: true });
    await expect(Page()).rejects.toThrow("/learn/password");
    mocks.student.mockResolvedValue({ mustChangePassword: false });
    expect(await Page()).toBeTruthy();
  });
});
