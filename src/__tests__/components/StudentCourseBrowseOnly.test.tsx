import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import StudentCourseSrs from "@/components/math-srs/StudentCourseSrs";
import { courseState } from "../../../scripts/qa/srs-m07-student-plan/data";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/learn",
  useSearchParams: () => new URLSearchParams(),
}));
afterEach(() => vi.unstubAllGlobals());

describe("M-07 actual student course client", () => {
  it.each(["ready", "paused", "setup"] as const)(
    "reads %s without emitting a plan write",
    async (mode) => {
      const saved = courseState(mode);
      const before = structuredClone(saved);
      const fetcher = vi
        .fn<(url: string, options?: RequestInit) => Promise<Response>>()
        .mockImplementation(async () => Response.json({ data: saved }));
      vi.stubGlobal("fetch", fetcher);
      render(<StudentCourseSrs />);
      await screen.findByText("로컬 검증 · 초5");
      expect(
        screen.queryByRole("button", { name: /학습 설정|시작 진도|저장/ }),
      ).not.toBeInTheDocument();
      expect(screen.queryByLabelText("학년")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("소단원")).not.toBeInTheDocument();
      if (mode === "ready") {
        expect(
          screen.getByRole("button", { name: "오늘의 추천 학습 시작" }),
        ).toBeEnabled();
        expect(
          screen.getByRole("progressbar", { name: "오늘 목표 진행" }),
        ).toHaveAttribute("max", "15");
      }
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(fetcher.mock.calls[0][0]).toBe("/api/learn/math-srs/course");
      expect(fetcher.mock.calls[0][1]?.method).toBeUndefined();
      expect(fetcher.mock.calls[0][1]?.body).toBeUndefined();
      expect(saved).toEqual(before);
    },
  );
});
