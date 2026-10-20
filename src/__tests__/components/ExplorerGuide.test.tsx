import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExplorerGuideProvider } from "@/components/math-explorers/ExplorerGuide";
import {
  DailyStudy,
  ExplorerStudyBook,
} from "@/components/math-explorers/ExplorerStudyBook";
import type { FadingDailyPlan } from "@/contracts/fadingDaily.contract";
import { getGuide, saveGuide } from "@/components/math-srs/guideApi";
vi.mock("@/components/math-srs/guideApi", () => ({
  getGuide: vi.fn(),
  saveGuide: vi.fn(),
}));
const plan = {
  status: "todo",
  next: "a",
  activities: [{ key: "a", start: "open" }],
  units: { recall: { done: 1 }, question: { done: 2 }, task: { done: 0 } },
} as unknown as FadingDailyPlan;
function Home({ done = false }) {
  return (
    <ExplorerStudyBook
      grade="초등 5학년"
      unit="소수의 곱셈"
      journey={<p>진도판</p>}
      study={
        <DailyStudy
          plan={{ ...plan, status: done ? "done" : "todo" }}
          busy={false}
          onStart={vi.fn()}
          startId="start"
        />
      }
    />
  );
}
describe("student chooses a guide", () => {
  beforeEach(() => vi.clearAllMocks());
  it("shows all five, saves only on confirmation and keeps a failed choice for this visit", async () => {
    vi.mocked(getGuide).mockResolvedValue({ ok: true, data: null });
    vi.mocked(saveGuide).mockResolvedValue({
      ok: false,
      status: 503,
      message: "실패",
    });
    const { rerender } = render(
      <ExplorerGuideProvider>
        <Home />
      </ExplorerGuideProvider>,
    );
    await screen.findByRole("heading", { name: "함께할 길잡이를 골라요" });
    for (const name of [
      "또래 기록가",
      "담비",
      "종이 제비",
      "책갈피 정령",
      "나무 조각 친구",
    ])
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "이 친구와 시작" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "종이 제비" }));
    expect(saveGuide).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "이 친구와 시작" }));
    await screen.findByRole("button", { name: "길잡이 바꾸기: 종이 제비" });
    expect(saveGuide).toHaveBeenCalledWith("paper-swallow");
    expect(
      screen.getByRole("button", { name: "오늘 공부 시작" }),
    ).toBeEnabled();
    rerender(
      <ExplorerGuideProvider>
        <Home done />
      </ExplorerGuideProvider>,
    );
    expect(screen.getByAltText("종이 제비의 축하")).toHaveAttribute(
      "src",
      "/images/guides/paper-swallow/done.webp",
    );
    expect(screen.getByAltText("종이 제비의 보상")).toBeInTheDocument();
    rerender(
      <ExplorerGuideProvider>
        <Home />
      </ExplorerGuideProvider>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "길잡이 바꾸기: 종이 제비" }),
    );
    expect(screen.getByRole("button", { name: "종이 제비" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
  it("loads a saved guide without opening the picker", async () => {
    vi.mocked(getGuide).mockResolvedValue({
      ok: true,
      data: { id: "marten", chosenAt: "2026-10-20T00:00:00Z" },
    });
    render(
      <ExplorerGuideProvider>
        <Home />
      </ExplorerGuideProvider>,
    );
    await screen.findByRole("button", { name: "길잡이 바꾸기: 담비" });
    expect(
      screen.queryByRole("heading", { name: "함께할 길잡이를 골라요" }),
    ).toBeNull();
  });
  it("keeps study available if the read fails and never assigns a default", async () => {
    vi.mocked(getGuide).mockResolvedValue({
      ok: false,
      status: 503,
      message: "실패",
    });
    render(
      <ExplorerGuideProvider>
        <Home />
      </ExplorerGuideProvider>,
    );
    await waitFor(() => expect(getGuide).toHaveBeenCalled());
    expect(
      screen.getByRole("button", { name: "오늘 공부 시작" }),
    ).toBeEnabled();
    expect(screen.queryByRole("img")).toBeNull();
  });
  it("asks again on the next visit after a failed save", async () => {
    vi.mocked(getGuide).mockResolvedValue({ ok: true, data: null });
    vi.mocked(saveGuide).mockResolvedValue({
      ok: false,
      status: 503,
      message: "실패",
    });
    const first = render(
      <ExplorerGuideProvider>
        <Home />
      </ExplorerGuideProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "담비" }));
    fireEvent.click(screen.getByRole("button", { name: "이 친구와 시작" }));
    await screen.findByRole("button", { name: "길잡이 바꾸기: 담비" });
    first.unmount();
    render(
      <ExplorerGuideProvider>
        <Home />
      </ExplorerGuideProvider>,
    );
    await screen.findByRole("heading", { name: "함께할 길잡이를 골라요" });
    expect(
      screen.getByRole("button", { name: "이 친구와 시작" }),
    ).toBeDisabled();
  });
  it("keeps workspace preview choices local", async () => {
    render(
      <ExplorerGuideProvider enabled={false}>
        <Home />
      </ExplorerGuideProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "길잡이 고르기" }));
    fireEvent.click(screen.getByRole("button", { name: "나무 조각 친구" }));
    fireEvent.click(screen.getByRole("button", { name: "이 친구와 시작" }));
    await screen.findByRole("button", {
      name: "길잡이 바꾸기: 나무 조각 친구",
    });
    expect(getGuide).not.toHaveBeenCalled();
    expect(saveGuide).not.toHaveBeenCalled();
  });
  it("starts study while a slow save is still pending", async () => {
    vi.mocked(getGuide).mockResolvedValue({ ok: true, data: null });
    let finish!: (value: Awaited<ReturnType<typeof saveGuide>>) => void;
    vi.mocked(saveGuide).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    render(
      <ExplorerGuideProvider>
        <Home />
      </ExplorerGuideProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "담비" }));
    fireEvent.click(screen.getByRole("button", { name: "이 친구와 시작" }));
    expect(
      screen.getByRole("button", { name: "오늘 공부 시작" }),
    ).toBeEnabled();
    finish({ ok: false, status: 503, message: "실패" });
    await screen.findByRole("button", { name: "길잡이 바꾸기: 담비" });
  });
});
