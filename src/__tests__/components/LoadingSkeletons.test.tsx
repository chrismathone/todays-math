import { readFileSync } from "node:fs";

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

/**
 * 🔴 `/dev/skeletons` 시안은 목록을 **손으로 적는다.** 자리를 더하고 거기 안 적으면
 *    그 자리는 시안에서 **구조적으로 0이 된다** — 원장님이 못 보시고, 못 보신 것은
 *    확정될 수 없다(절대 규칙 1). 손 목록은 샌다는 것을 이 저장소가 여러 번 겪었다.
 *
 * 그래서 「내보낸 것이 시안에 전부 실렸는가」를 **글자로** 대조한다. 여기서는
 * 지켜야 할 대상 자체가 «import 목록»이라 글자 검사가 동어반복이 아니다.
 */
describe("[D-07] 시안 목록이 새지 않는다", () => {
  it("PageSkeletons 가 내보낸 자리는 전부 /dev/skeletons 에 실린다", () => {
    const src = readFileSync("src/components/ui/PageSkeletons.tsx", "utf-8");
    const page = readFileSync("src/app/dev/skeletons/page.tsx", "utf-8");
    const exported = [...src.matchAll(/^export function (\w+)/gm)].map(
      (m) => m[1]!,
    );
    expect(exported.length, "내보낸 자리를 하나도 못 찾았다").toBeGreaterThan(
      5,
    );
    const missing = exported.filter(
      (name) => !new RegExp(String.raw`\b${name}\b`).test(page),
    );
    expect(missing, "시안에 안 실린 자리").toEqual([]);
  });
});
