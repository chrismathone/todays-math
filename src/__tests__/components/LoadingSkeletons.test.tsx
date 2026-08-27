import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  AuthFormSkeleton,
  DashboardSkeleton,
  ProblemBankSkeleton,
  ReviewConsoleSkeleton,
} from "@/components/ui/PageSkeletons";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

describe("페이지 로딩 스켈레톤", () => {
  it("장식 블록은 보조 기술에서 숨긴다", () => {
    const { container } = render(
      <div>
        <Skeleton className="h-4" />
        <SkeletonText lines={3} />
      </div>,
    );

    expect(container.querySelectorAll(".skeleton")).toHaveLength(4);
    expect(
      Array.from(container.querySelectorAll(".skeleton")).every(
        (node) => node.getAttribute("aria-hidden") === "true",
      ),
    ).toBe(true);
  });

  it("메인 로딩 중에도 실제 이동 메뉴와 상태 안내가 남는다", () => {
    render(<DashboardSkeleton />);

    expect(
      screen.getByRole("status", { name: "화면을 불러오는 중" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "메인" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "문제은행" })).toHaveAttribute(
      "href",
      "/problems",
    );
  });

  it.each([
    ["계정 화면", <AuthFormSkeleton key="auth" />, "계정 화면을 불러오는 중"],
    [
      "문제은행",
      <ProblemBankSkeleton key="problems" />,
      "문제 목록을 불러오는 중",
    ],
    [
      "검수",
      <ReviewConsoleSkeleton key="review" />,
      "검수 대기열을 불러오는 중",
    ],
  ])("%s 스켈레톤은 무엇을 기다리는지 알린다", (_name, view, label) => {
    render(view);

    expect(screen.getByRole("status", { name: label })).toBeInTheDocument();
  });
});
