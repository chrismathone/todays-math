import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 학생의 첫 화면 — 서버 문이 켜져 있으면 «오늘의 기억»이다(원장님 2026-10-06 «새 SRS 로 보이도록»).
 * 기존 통합 탐험은 지우지 않았다: 문을 끄면 다시 첫 화면이 되고, 도감과 교재에서 넘어온 길은 켜져 있어도 그대로 열린다.
 */
const mocks = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
  usePathname: () => "/learn/lectures",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/learn/studentRequest", () => ({
  getStudentSession: mocks.session,
}));
vi.mock("@/lib/journeyThemeStore", () => ({
  readJourneyTheme: async () => ({ theme: "classic" }),
}));
vi.mock("@/components/math-explorers/StudentMathExplorers", () => ({
  default: "explorers",
}));
vi.mock("@/components/learn/textbook/TextbookReturnLink", () => ({
  TextbookReturnLink: "textbook-return",
}));

import LearnHomePage from "@/app/learn/page";
import { StudentMobileNav } from "@/components/learn/StudentMobileNav";

const open = (query: Record<string, string> = {}) =>
  LearnHomePage({ searchParams: Promise.resolve(query) });
const student = { studentId: "s1", mustChangePassword: false };

beforeEach(() => mocks.session.mockResolvedValue(student));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("학생의 첫 화면 `/learn`", () => {
  it.each([
    ["값이 없을 때", undefined],
    ["`on`", "on"],
  ])("서버 문이 켜져 있으면(%s) «오늘의 기억»으로 보낸다", async (_, value) => {
    vi.stubEnv("MATH_FADING", value);
    await expect(open()).rejects.toThrow("REDIRECT /learn/fading");
  });

  it.each(["off", "read", "true"])(
    "서버 문이 `%s` 면 기존 통합 탐험이 그대로 첫 화면이다",
    async (value) => {
      vi.stubEnv("MATH_FADING", value);
      const page = await open();
      expect(JSON.stringify(page)).toContain("explorers");
    },
  );

  it("켜져 있어도 도감과 교재에서 넘어온 길은 기존 화면에서 열린다 — 교재 개념백지가 그 화면에 기대고 있다", async () => {
    vi.stubEnv("MATH_FADING", "on");
    const queries: Record<string, string>[] = [
      { view: "collection" },
      { fromTextbook: "/learn/textbook/x/concepts/y" },
      { view: "collection", fromTextbook: "/learn/textbook/x/concepts/y" },
    ];
    for (const query of queries) {
      const page = await open(query);
      expect(JSON.stringify(page), JSON.stringify(query)).toContain(
        "explorers",
      );
    }
  });

  it("로그인과 첫 비밀번호가 먼저다 — 문이 켜져 있어도 그 차례는 그대로다", async () => {
    vi.stubEnv("MATH_FADING", "on");
    mocks.session.mockResolvedValue(null);
    await expect(open()).rejects.toThrow("REDIRECT /learn/login");
    mocks.session.mockResolvedValue({ ...student, mustChangePassword: true });
    await expect(open()).rejects.toThrow("REDIRECT /learn/password");
  });
});

describe("학생 아래 메뉴", () => {
  const tabs = () =>
    screen
      .getAllByRole("link")
      .map((link) => [link.textContent, link.getAttribute("href")]);

  it("서버 문이 켜져 있으면 «탐험 · 도감» 자리에 «오늘의 기억» 하나가 선다", () => {
    render(<StudentMobileNav fading />);
    expect(tabs()).toEqual([
      ["오늘의 기억", "/learn/fading"],
      ["강의", "/learn/lectures"],
      ["영어듣기", "/learn/english-listening"],
    ]);
    expect(screen.getByRole("link", { name: "강의" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "오늘의 기억" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("꺼져 있으면 지금까지의 네 탭이다", () => {
    render(<StudentMobileNav />);
    expect(tabs()).toEqual([
      ["탐험", "/learn"],
      ["도감", "/learn?view=collection"],
      ["강의", "/learn/lectures"],
      ["영어듣기", "/learn/english-listening"],
    ]);
  });
});
