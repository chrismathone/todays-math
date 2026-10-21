import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DailyStudy,
  ExplorerStudyBook,
} from "@/components/math-explorers/ExplorerStudyBook";
import { ExplorerGuideProvider } from "@/components/math-explorers/ExplorerGuide";
import { getGuide, saveGuide } from "@/components/math-srs/guideApi";
import type { FadingDailyPlan } from "@/contracts/fadingDaily.contract";
import {
  homePlan,
  completedWorkload,
} from "../../../scripts/qa/srs-m02-m10-home/plans";

vi.mock("@/components/math-srs/guideApi", () => ({
  getGuide: vi.fn(),
  saveGuide: vi.fn(),
}));
function Home({ plan = homePlan() }: { plan?: FadingDailyPlan }) {
  return (
    <ExplorerStudyBook
      grade="초등 5학년"
      unit={plan.prerequisite!.target.title}
      journey={<p>진도판</p>}
      study={
        <DailyStudy
          plan={plan}
          busy={false}
          onStart={vi.fn()}
          startId="start"
        />
      }
    />
  );
}
const completedLabel = /학년 · 이상과 이하/;
beforeEach(() => vi.clearAllMocks());
describe("M-02 completed home reads completed activity provenance", () => {
  it("keeps the finished mission name when only the teacher target changes", async () => {
    const { rerender } = render(
      <Home plan={homePlan({ target: "이상과 이하" })} />,
    );
    expect(await screen.findByText(completedLabel)).toBeInTheDocument();
    rerender(<Home plan={homePlan({ target: "초과와 미만" })} />);
    expect(await screen.findByText(completedLabel)).toBeInTheDocument();
    expect(screen.queryByText("초과와 미만")).toBeNull();
  });
  it("shows each completed mission/recall label once and excludes blocked work", async () => {
    const plan = homePlan({ recalls: 2, quota: 12 });
    const recall = plan.activities.find((a) => a.kind === "recall")!;
    plan.activities.push({ ...recall, key: "same-section-second-bundle" });
    plan.activities.push({
      ...plan.activities.find((a) => a.kind === "practice")!,
      key: "blocked",
      state: "blocked",
      source: {
        ...completedWorkload,
        selection: "expedition",
        title: "아직 안 한 단원",
      },
    } as FadingDailyPlan["activities"][number]);
    render(<Home plan={plan} />);
    expect(await screen.findByText(completedLabel)).toBeInTheDocument();
    expect(
      screen.getAllByText("수의 범위와 어림하기 · 이상과 이하"),
    ).toHaveLength(1);
    expect(
      screen.getByText("수의 범위와 어림하기 · 초과와 미만"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/아직 안 한 단원/)).toBeNull();
  });
  it.each([1, 10])(
    "uses recall sections for memory-only completion with quota %i",
    (quota) => {
      const plan = homePlan({ recalls: 1, workload: null, quota });
      expect(plan.status).toBe(quota === 1 ? "done" : "short");
      render(<Home plan={plan} />);
      expect(
        screen.getByText("수의 범위와 어림하기 · 이상과 이하"),
      ).toBeInTheDocument();
      expect(screen.queryByText("초과와 미만")).toBeNull();
    },
  );
  it("omits a short ending's unit line when there is no completed activity", () => {
    const plan = homePlan();
    plan.status = "short";
    plan.activities = plan.activities.map((a) => ({ ...a, state: "blocked" }));
    render(<Home plan={plan} />);
    expect(screen.queryByText("초과와 미만")).toBeNull();
    expect(screen.queryByText(completedLabel)).toBeNull();
  });
  it("shows today's plan again for an unfinished next day, without yesterday's recall", () => {
    const { rerender } = render(
      <Home plan={homePlan({ recalls: 1, workload: null, quota: 1 })} />,
    );
    expect(
      screen.getByText("수의 범위와 어림하기 · 이상과 이하"),
    ).toBeInTheDocument();
    const plan = homePlan({
      date: "2026-10-22",
      recalls: 1,
      workload: {
        ...completedWorkload,
        status: "next",
        answered: 0,
        canStart: true,
      },
    });
    expect(plan.status).toBe("todo");
    rerender(<Home plan={plan} />);
    expect(screen.getByText("초과와 미만")).toBeInTheDocument();
    expect(screen.queryByText("수의 범위와 어림하기 · 이상과 이하")).toBeNull();
    expect(
      screen.getByRole("button", { name: "오늘 공부 시작" }),
    ).toBeEnabled();
  });
});
describe("M-10 completed home uses the existing guide picker", () => {
  it.each([false, true])(
    "opens with keyboard, returns to the celebration after choice (failed save=%s)",
    async (failed) => {
      vi.mocked(getGuide).mockResolvedValue({
        ok: true,
        data: { id: "marten", chosenAt: "2026-10-20T00:00:00Z" },
      });
      vi.mocked(saveGuide).mockResolvedValue(
        failed
          ? { ok: false, status: 503, message: "실패" }
          : {
              ok: true,
              data: { id: "paper-swallow", chosenAt: "2026-10-21T00:00:00Z" },
            },
      );
      const user = userEvent.setup();
      const { rerender } = render(
        <ExplorerGuideProvider>
          <Home />
        </ExplorerGuideProvider>,
      );
      const change = await screen.findByRole("button", {
        name: "길잡이 바꾸기: 담비",
      });
      expect(screen.getByAltText("담비의 축하")).toBeInTheDocument();
      change.focus();
      await user.keyboard("{Enter}");
      expect(
        screen.getByRole("heading", { name: "함께할 길잡이를 골라요" }),
      ).toHaveFocus();
      expect(screen.getByRole("button", { name: "담비" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await user.click(screen.getByRole("button", { name: "종이 제비" }));
      await user.click(screen.getByRole("button", { name: "이 친구와 시작" }));
      await screen.findByRole("button", { name: "길잡이 바꾸기: 종이 제비" });
      expect(saveGuide).toHaveBeenCalledTimes(1);
      expect(saveGuide).toHaveBeenCalledWith("paper-swallow");
      expect(screen.getByText("오늘 공부를 마쳤어요")).toBeInTheDocument();
      expect(screen.getByAltText("종이 제비의 축하")).toBeInTheDocument();
      expect(screen.getByAltText("종이 제비의 보상")).toBeInTheDocument();
      rerender(
        <ExplorerGuideProvider>
          <Home
            plan={homePlan({
              workload: {
                ...completedWorkload,
                status: "next",
                answered: 0,
                canStart: true,
              },
            })}
          />
        </ExplorerGuideProvider>,
      );
      expect(
        screen.getByRole("button", { name: "오늘 공부 시작" }),
      ).toBeEnabled();
      expect(
        screen.getByRole("button", { name: "길잡이 바꾸기: 종이 제비" }),
      ).toBeInTheDocument();
    },
  );
  it("can choose from a completed home after a failed guide read", async () => {
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
    fireEvent.click(
      await screen.findByRole("button", { name: "길잡이 고르기" }),
    );
    expect(
      screen.getByRole("button", { name: "이 친구와 시작" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "나무 조각 친구" }),
    ).toBeInTheDocument();
  });
});
