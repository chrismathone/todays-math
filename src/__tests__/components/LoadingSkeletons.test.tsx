import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  AuthFormSkeleton,
  DashboardSkeleton,
  ProblemBankSkeleton,
  ReviewConsoleSkeleton,
  TestSetupFieldsSkeleton,
  WorkroomHomeSkeleton,
} from "@/components/ui/PageSkeletons";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

const ROOT = process.cwd();

function collectBarrelExports(file: string): string[] {
  const src = readFileSync(file, "utf-8");
  const names: string[] = [];
  for (const m of src.matchAll(/^export \{([^}]+)\}/gm)) {
    for (const part of m[1]!.split(",")) {
      const name = part
        .trim()
        .split(/\s+as\s+/)[0]
        ?.trim();
      if (name) names.push(name);
    }
  }
  names.push(
    ...[...src.matchAll(/^export function (\w+)/gm)].map((m) => m[1]!),
  );
  return names;
}

function skeletonSources(): string[] {
  const dir = path.join(ROOT, "src/components/ui/skeletons");
  return [
    path.join(ROOT, "src/components/ui/PageSkeletons.tsx"),
    ...readdirSync(dir)
      .filter((name) => name.endsWith(".tsx"))
      .map((name) => path.join(dir, name)),
  ];
}

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
    expect(screen.getByRole("link", { name: "오늘의 작업" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "시험지 만들기" })).toHaveAttribute(
      "href",
      "/problems",
    );
    expect(screen.getByRole("link", { name: "자료 제작" })).toHaveAttribute(
      "href",
      "/studio",
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
    ["작업실", <WorkroomHomeSkeleton key="workroom" />, "작업실을 불러오는 중"],
  ])("%s 스켈레톤은 무엇을 기다리는지 알린다", (_name, view, label) => {
    render(view);

    expect(screen.getByRole("status", { name: label })).toBeInTheDocument();
  });

  it("작업실 스켈레톤은 가짜 단추를 두지 않는다", () => {
    const { container } = render(<WorkroomHomeSkeleton />);
    expect(container.querySelectorAll("button")).toHaveLength(0);
    expect(container.querySelector("[class*='inset']")).toBeNull();
  });

  it("출제 설정 스켈레톤은 난이도 6칸을 미리 잡는다", () => {
    const { container } = render(<TestSetupFieldsSkeleton />);
    expect(container.querySelectorAll(".skeleton").length).toBeGreaterThan(12);
  });

  it("로그인 스켈레톤은 2칸, 가입은 3칸이다", () => {
    const login = render(<AuthFormSkeleton />);
    expect(login.container.querySelectorAll("[data-auth-field]")).toHaveLength(
      2,
    );
    expect(login.getByRole("link", { name: "회원가입" })).toHaveAttribute(
      "href",
      "/signup",
    );
    login.unmount();
    const signup = render(<AuthFormSkeleton fields={3} />);
    expect(signup.container.querySelectorAll("[data-auth-field]")).toHaveLength(
      3,
    );
    expect(signup.getByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});

describe("[D-07] 시안 목록이 새지 않는다", () => {
  it("PageSkeletons 가 내보낸 자리는 전부 /dev/skeletons 에 실린다", () => {
    const page = readFileSync("src/app/dev/skeletons/page.tsx", "utf-8");
    const exported = collectBarrelExports(
      "src/components/ui/PageSkeletons.tsx",
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

describe("스켈레톤 자리 가드", () => {
  it("색 왼쪽 띠와 가짜 단추를 스켈레톤 구현에 다시 넣지 않는다", () => {
    const sources = skeletonSources().map((file) =>
      readFileSync(file, "utf-8"),
    );
    for (const src of sources) {
      expect(src).not.toMatch(/inset_5px_0_0/);
      expect(src).not.toMatch(/w-\[5px\]/);
      expect(src).not.toMatch(/cursor-pointer/);
      expect(src).not.toMatch(/<button/i);
    }
  });

  it("loading.tsx 가 맡은 스켈레톤과 어긋나지 않는다", () => {
    const wiring: Array<[string, string]> = [
      ["src/app/(main)/loading.tsx", "WorkroomHomeSkeleton"],
      ["src/app/studio/loading.tsx", "WorkroomHomeSkeleton"],
      ["src/app/(auth)/loading.tsx", "AuthLoading"],
      ["src/app/(auth)/login/loading.tsx", "AuthLoading"],
      ["src/app/(auth)/signup/loading.tsx", "AuthLoading"],
      ["src/app/(auth)/onboarding/loading.tsx", "OnboardingSkeleton"],
      ["src/app/(main)/classes/loading.tsx", "ClassesSkeleton"],
      ["src/app/(main)/problems/loading.tsx", "ProblemBankSkeleton"],
      ["src/app/(main)/exam/loading.tsx", "ExamListSkeleton"],
      ["src/app/(main)/exam/[id]/loading.tsx", "ExamDetailSkeleton"],
      ["src/app/(main)/tests/new/loading.tsx", "TestSetupSkeleton"],
      ["src/app/(main)/tests/[id]/loading.tsx", "TestReviewSkeleton"],
      ["src/app/(main)/tests/[id]/print/loading.tsx", "PrintPreviewSkeleton"],
      ["src/app/review/loading.tsx", "ReviewConsoleSkeleton"],
    ];
    for (const [file, name] of wiring) {
      const src = readFileSync(file, "utf-8");
      expect(src, file).toContain(name);
    }
  });
});
