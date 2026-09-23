import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import RouteRecovery from "@/components/ui/RouteRecovery";

it("retries a failed screen and preserves the student home destination", () => {
  const retry = vi.fn();
  render(
    <RouteRecovery
      title="불러오기 실패"
      description="다시 시도해 주세요."
      retry={retry}
      homeHref="/learn"
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
  expect(retry).toHaveBeenCalledOnce();
  expect(screen.getByRole("link", { name: "홈으로 돌아가기" })).toHaveAttribute(
    "href",
    "/learn",
  );
});
