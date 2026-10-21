import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FadingComparisonSheet } from "@/components/fading/FadingComparisonSheet";
import { FadingHome } from "@/components/fading/FadingHome";
import { FadingCardSessionScreen } from "@/components/fading/FadingCardSessionScreen";
import {
  DailyStudy,
  ExplorerStudyBook,
} from "@/components/math-explorers/ExplorerStudyBook";
import { prepareMemory } from "../../../scripts/qa/srs-m05-m06-memory/memory";
import { homePlan } from "../../../scripts/qa/srs-m02-m10-home/plans";

afterEach(cleanup);

describe("remaining student experience", () => {
  it("names the course target separately from today's concept bundle", () => {
    const plan = homePlan({
      workload: {
        kind: "explorers",
        route: "unit",
        unitId: "g5-decimals",
        title: "소수 곱셈과 어림",
        subtitle: "초등 5학년",
        goal: 15,
        answered: 0,
        retryRemaining: 0,
        status: "next",
        canStart: true,
      },
      quota: 15,
    });
    render(
      <ExplorerStudyBook
        grade="초등 5학년"
        unit="이상과 이하"
        journey={<p>지도</p>}
        study={
          <DailyStudy
            plan={plan}
            busy={false}
            onStart={vi.fn()}
            startId="start"
          />
        }
      />,
    );
    expect(screen.getByText("문제 진도")).toBeInTheDocument();
    expect(screen.getByText("오늘 개념 묶음")).toBeInTheDocument();
    expect(screen.getByText("소수 곱셈과 어림")).toBeInTheDocument();
  });

  it("uses input-neutral copy for both the comparison and the standalone home", async () => {
    const f = await prepareMemory();
    const view = render(
      <FadingComparisonSheet
        student
        concept={f.concept}
        result={{ step: 2, blanks: 1, missed: [] }}
        placements={[]}
        seed={42}
        traps={[]}
        figure={null}
        onClose={vi.fn()}
        onNext={vi.fn()}
      />,
    );
    expect(screen.getByText("내가 채운 답")).toBeInTheDocument();
    view.unmount();
    const empty = {
      ...f.state,
      summary: {
        ...f.state.summary,
        learned: 0,
        queue: { ...f.state.summary.queue, unrated: [] },
      },
    };
    render(
      <FadingHome
        student
        state={empty}
        busy={false}
        onCatalog={vi.fn()}
        onOpen={vi.fn()}
        onMode={vi.fn()}
        source={f.source}
      />,
    );
    expect(screen.getByText("단서를 지우며 빈칸 채우기")).toBeInTheDocument();
    expect(screen.queryByText(/칩 채우기/)).toBeNull();
  });

  it("describes an unwritten answer as empty after giving up in this visit", async () => {
    const f = await prepareMemory({ step: 4 });
    render(
      <FadingCardSessionScreen
        student
        source={f.source}
        state={f.state}
        onState={vi.fn()}
        onReconcile={vi.fn()}
        onExit={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "아직 모르겠어요" }));
    // Giving up a card advances to the next. Finish every card before comparison.
    for (let i = 1; i < f.concept.propositions.length; i++)
      fireEvent.click(
        await screen.findByRole("button", { name: "아직 모르겠어요" }),
      );
    expect(await screen.findByText(/쓴 답이 없어요/)).toBeInTheDocument();
    expect(screen.queryByText(/쓴 답을 다시 볼 수 없어요/)).toBeNull();
  });

  it("does not claim a missing saved original was left empty on a resumed rating", async () => {
    const f = await prepareMemory({ step: 4, rating: true });
    render(
      <FadingCardSessionScreen
        student
        source={f.source}
        state={f.state}
        onState={vi.fn()}
        onReconcile={vi.fn()}
        onExit={vi.fn()}
      />,
    );
    expect(
      await screen.findByText(/이전 답은 표시되지 않아요/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/쓴 답이 없어요/)).toBeNull();
  });
});
