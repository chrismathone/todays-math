import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AppChrome } from "@/components/chrome/AppChrome";
import { MastheadSkeleton } from "@/components/ui/skeletons/shared";

describe("AppChrome", () => {
  it("places production navigation in the left sidebar and keeps the skip link", () => {
    render(
      <AppChrome activeNav="classes" classesHref="/branch?tab=classes">
        <main>반 관리 본문</main>
      </AppChrome>,
    );

    const sidebar = screen.getByRole("complementary");
    const navigation = within(sidebar).getByRole("navigation", {
      name: "주 메뉴",
    });
    expect(
      within(navigation).getByRole("link", { name: "수업·학생 관리" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(navigation).getByRole("link", { name: "수업·학생 관리" }),
    ).toHaveAttribute("href", "/branch?tab=classes");
    expect(
      within(navigation).getByRole("link", { name: "오늘의시험" }),
    ).toHaveAttribute("href", "/exam");
    expect(screen.getByRole("link", { name: "오늘 수학" })).toHaveAttribute(
      "href",
      "/",
    );

    const skip = screen.getByRole("link", { name: "본문으로 건너뛰기" });
    const target = document.querySelector(skip.getAttribute("href")!);
    expect(target).toHaveAttribute("tabindex", "-1");
    expect(target).toContainElement(screen.getByRole("main"));
  });

  it("keeps page actions on the right of the top bar", () => {
    render(
      <AppChrome
        dateLabel="2026.08.14. 금"
        remaining={2}
        extraNav={<button type="button">전체 표 ⇄</button>}
      >
        <p>본문</p>
      </AppChrome>,
    );

    const header = screen.getByRole("banner");
    expect(
      within(header).getByRole("button", { name: "전체 표 ⇄" }),
    ).toBeInTheDocument();
    expect(within(header).getByText("남은 작업 2")).toBeInTheDocument();
    expect(within(header).getByText("2026.08.14. 금")).toBeInTheDocument();
  });

  it("marks the exam menu when the exam is open", () => {
    render(
      <AppChrome tab="exam">
        <p>시험 본문</p>
      </AppChrome>,
    );
    const navigation = screen.getByRole("navigation", { name: "주 메뉴" });
    expect(
      within(navigation).getByRole("link", { name: "오늘의시험" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(navigation).getByRole("link", { name: "오늘의 작업" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("opens account settings and sign out from the bottom profile menu", async () => {
    render(
      <AppChrome>
        <p>본문</p>
      </AppChrome>,
    );
    const sidebar = screen.getByRole("complementary");
    const profile = within(sidebar).getByRole("button", {
      name: "내정보 메뉴",
    });
    expect(profile).toHaveAttribute("aria-expanded", "false");
    expect(
      await within(sidebar).findByTestId("account-email"),
    ).toHaveTextContent("teacher@example.com");
    await userEvent.click(profile);
    expect(profile).toHaveAttribute("aria-expanded", "true");
    expect(
      within(sidebar).getByRole("link", { name: "내정보 설정" }),
    ).toHaveAttribute("href", "/account");
    expect(
      within(sidebar).getByRole("button", { name: "로그아웃" }),
    ).toBeInTheDocument();
  });

  it("uses the same sidebar during route loading", () => {
    render(
      <MastheadSkeleton tab="exam">
        <main>불러오는 중</main>
      </MastheadSkeleton>,
    );
    expect(
      screen.getByRole("navigation", { name: "주 메뉴" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "오늘의시험" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
