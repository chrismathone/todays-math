/** 관리자 «학습 관리» — 진도판 테마(학원 전체 한 벌). 누르면 바로 저장 · 실패하면 앞 선택으로 되돌린다. */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import JourneyThemePicker from "@/components/math-srs/JourneyThemePicker";

const ok = (theme: string, updatedAt: string | null = null) =>
  new Response(JSON.stringify({ data: { theme, updatedAt } }), { status: 200 });

let calls: { url: string; init?: RequestInit }[] = [];
beforeEach(() => {
  calls = [];
});
afterEach(() => vi.unstubAllGlobals());

function stub(...replies: Response[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return replies.shift() ?? ok("classic");
    }),
  );
}

describe("JourneyThemePicker", () => {
  it("shows the six boards and marks the saved one", async () => {
    stub(ok("sea", "2026-09-30T02:00:00.000Z"));
    render(<JourneyThemePicker />);
    const sea = await screen.findByRole("radio", { name: /바다 항해/ });
    await waitFor(() => expect(sea).toBeChecked());
    expect(screen.getAllByRole("radio")).toHaveLength(6);
    expect(screen.getByRole("radio", { name: /기본 판/ })).not.toBeChecked();
    expect(calls[0].url).toBe("/api/admin/journey-theme");
  });

  it("saves a choice at once and says so", async () => {
    stub(ok("classic"), ok("shapes", "2026-09-30T02:00:00.000Z"));
    render(<JourneyThemePicker />);
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: /기본 판/ })).toBeChecked(),
    );
    await userEvent.click(screen.getByRole("radio", { name: /도형 마을/ }));
    await screen.findByText("저장했습니다. 학생 화면은 새로 열 때 바뀝니다.");
    expect(screen.getByRole("radio", { name: /도형 마을/ })).toBeChecked();
    expect(calls[1]).toMatchObject({
      url: "/api/admin/journey-theme",
      init: { method: "PUT", body: JSON.stringify({ theme: "shapes" }) },
    });
  });

  it("goes back to the saved board when saving fails", async () => {
    stub(
      ok("sky"),
      new Response(
        JSON.stringify({ error: { code: "FORBIDDEN", message: "관리자만 사용할 수 있습니다." } }),
        { status: 403 },
      ),
    );
    render(<JourneyThemePicker />);
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: /하늘섬/ })).toBeChecked(),
    );
    await userEvent.click(screen.getByRole("radio", { name: /숲길 탐험/ }));
    await screen.findByText("관리자만 사용할 수 있습니다.");
    expect(screen.getByRole("radio", { name: /하늘섬/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /숲길 탐험/ })).not.toBeChecked();
  });
});
