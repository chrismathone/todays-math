import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/(auth)/login/page";
import SignupPage from "@/app/(auth)/signup/page";
import StudentLoginPage from "@/app/learn/login/page";

const auth = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
);
vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("next-auth/react", () => ({ signIn: vi.fn() }));
// 로그인 화면은 eywa 연결 대기 쿠키를 읽는다(D-139 ⑹) — 여기서는 늘 없다
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock("next/navigation", () => ({
  redirect,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe.each([
  ["login", LoginPage],
  ["signup", SignupPage],
] as const)("%s server page", (_name, Page) => {
  beforeEach(() => {
    auth.mockReset();
    redirect.mockClear();
  });

  it("renders the form for guests and retains a safe return URL", async () => {
    auth.mockResolvedValue(null);
    render(
      await Page({
        searchParams: Promise.resolve({
          callbackUrl: "/tests/new?classId=abc",
        }),
      }),
    );
    expect(
      screen.getByLabelText(
        _name === "login" ? "이메일 또는 학생 아이디" : "이메일",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      expect.stringContaining("callbackUrl=%2Ftests%2Fnew%3FclassId%3Dabc"),
    );
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects an authenticated director to the callback destination", async () => {
    auth.mockResolvedValue({
      user: { id: "director", role: "director", approvalStatus: "approved" },
    });
    await expect(
      Page({
        searchParams: Promise.resolve({
          callbackUrl: "/tests/new?classId=abc",
        }),
      }),
    ).rejects.toThrow("redirect:/tests/new?classId=abc");
  });

  it("redirects an authenticated reviewer to review", async () => {
    auth.mockResolvedValue({
      user: { id: "reviewer", role: "reviewer", approvalStatus: "approved" },
    });
    await expect(
      Page({ searchParams: Promise.resolve({ callbackUrl: "/tests/new" }) }),
    ).rejects.toThrow("redirect:/review");
  });

  it("normalizes unsafe destinations before redirecting an authenticated user", async () => {
    auth.mockResolvedValue({
      user: { id: "director", role: "director", approvalStatus: "approved" },
    });
    await expect(
      Page({
        searchParams: Promise.resolve({ callbackUrl: "https://evil.example" }),
      }),
    ).rejects.toThrow("redirect:/");
    expect(redirect).toHaveBeenCalledWith("/");
  });
});

it("기존 학생 로그인 주소를 통합 로그인으로 연결한다", async () => {
  await expect(
    StudentLoginPage({ searchParams: Promise.resolve({}) }),
  ).rejects.toThrow("redirect:/login");
});

it("교재 QR로 향하는 학생 로그인 주소를 보존한다", async () => {
  await expect(
    StudentLoginPage({
      searchParams: Promise.resolve({ returnTo: "/q/abcdefghijklmnop" }),
    }),
  ).rejects.toThrow("redirect:/login?callbackUrl=%2Fq%2Fabcdefghijklmnop");
});
