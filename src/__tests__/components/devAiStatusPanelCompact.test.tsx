import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import DevAiStatusPanel from "@/components/unified/DevAiStatusPanel";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("production AI status panel", () => {
  it.each([false, true])(
    "does not mount any status UI when collapsed=%s",
    (collapsed) => {
      render(<DevAiStatusPanel collapsed={collapsed} onExpand={() => {}} />);

      expect(screen.queryByLabelText("AI 상태판")).toBeNull();
      expect(
        screen.queryByRole("button", { name: "AI 상태판 펼치기" }),
      ).toBeNull();
      expect(screen.queryByText(/AI 연결/)).toBeNull();
      expect(screen.queryByRole("button", { name: "다시 확인" })).toBeNull();
      expect(
        screen.queryByRole("button", { name: "연결 다시 확인" }),
      ).toBeNull();
    },
  );
});
