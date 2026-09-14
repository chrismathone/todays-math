import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/(auth)/login/page";
import SignupPage from "@/app/(auth)/signup/page";

const auth = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
);
vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("next-auth/react", () => ({ signIn: vi.fn() }));
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
    expect(screen.getByLabelText("이메일")).toBeInTheDocument();
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
