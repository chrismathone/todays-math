import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TestConsole } from "@/components/learn/TestConsole";

const state = {
  loginId: "test_s",
  studentName: "test_s",
  className: "테스트반",
  today: "2026-09-30",
  realToday: "2026-09-28",
  offsetDays: 2,
  revision: 4,
  explorer: { grade: 5, stars: 12, earned: 20, level: 1, cards: 3 },
  mission: null,
  course: null,
  counts: {
    srsMissions: 0,
    completedDays: 1,
    expeditionTiles: 1,
    lectureViews: 0,
  },
  sections: [{ id: "3-1-1-1", label: "초3-1 덧셈과 뺄셈 · 세 자리 수의 덧셈" }],
  payload: null,
  message: null,
};

const reply = (status: number, body: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );

afterEach(() => vi.unstubAllGlobals());

describe("테스트 도구판 화면", () => {
  it("떠 있는 버튼을 누르면 서랍이 열리고 계정·반을 보여 준다", async () => {
    const fetchMock = vi.fn(() => reply(200, { data: state }));
    vi.stubGlobal("fetch", fetchMock);
    render(<TestConsole />);
    const fab = screen.getByRole("button", { name: "테스트" });
    expect(fab).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(fab);
    expect(
      await screen.findByRole("complementary", { name: "테스트 도구판" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("test_s · 테스트반")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/learn/test-console",
      expect.anything(),
    );
  });

  it("시간 묶음 — «하루 뒤»는 지금 날 수 + 1 을 보낸다", async () => {
    const fetchMock = vi.fn((_: string, init?: RequestInit) =>
      reply(200, {
        data: init?.method === "POST" ? { ...state, offsetDays: 3 } : state,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<TestConsole />);
    fireEvent.click(screen.getByRole("button", { name: "테스트" }));
    fireEvent.click(await screen.findByRole("button", { name: /시간/ }));
    fireEvent.click(screen.getByRole("button", { name: "하루 뒤" }));
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([, init]) =>
            init?.body === JSON.stringify({ type: "clock", offsetDays: 3 }),
        ),
      ).toBe(true),
    );
  });

  it("전체 초기화는 두 번 눌러야 보낸다", async () => {
    const fetchMock = vi.fn(() => reply(200, { data: state }));
    vi.stubGlobal("fetch", fetchMock);
    render(<TestConsole />);
    fireEvent.click(screen.getByRole("button", { name: "테스트" }));
    const reset = await screen.findByRole("button", { name: "전체 초기화" });
    fireEvent.click(reset);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.click(
      screen.getByRole("button", { name: "한 번 더 누르면 모두 지웁니다" }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("도구판 계정이 아니면(404) 버튼까지 사라진다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => reply(404, { error: {} })),
    );
    render(<TestConsole />);
    fireEvent.click(screen.getByRole("button", { name: "테스트" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "테스트" }),
      ).not.toBeInTheDocument(),
    );
  });
});
