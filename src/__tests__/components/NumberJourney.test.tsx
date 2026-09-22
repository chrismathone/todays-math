import { StrictMode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import NumberJourney from "@/components/lab/cube31/NumberJourney";
import type { JourneyExperiment } from "@/lib/lab/cube31/explorationTypes";

function journey(start = 248, amount = 462): JourneyExperiment {
  return {
    kind: "journey",
    prompt: "칩으로 수를 이어 가요",
    start,
    steps: [{ amount, operation: "add" }],
  };
}

function move(amount: number) {
  fireEvent.click(
    screen.getByRole("button", {
      name: `${amount < 0 ? "−" : "+"}${Math.abs(amount)} 이동`,
    }),
  );
}

function expectCurrent(value: number) {
  expect(screen.getByLabelText("현재 수")).toHaveTextContent(`현재 ${value}`);
}

function click(name: string) {
  fireEvent.click(screen.getByRole("button", { name }));
}

describe("NumberJourney", () => {
  it.each([
    [400, 60, 2],
    [400, 2, 60],
    [60, 400, 2],
    [60, 2, 400],
    [2, 400, 60],
    [2, 60, 400],
  ])("conserves 462 in learner-selected order %s, %s, %s", (...order) => {
    render(<NumberJourney experiment={journey()} />);
    expectCurrent(248);
    expect(screen.getByLabelText("이동한 식")).toHaveTextContent(
      "248에서 출발",
    );
    expect(screen.queryByText(/도착한 수/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "도착 확인" })).toBeDisabled();
    let used = 0;
    for (const [index, amount] of order.entries()) {
      move(amount);
      used += amount;
      expectCurrent(248 + used);
      expect(screen.getByLabelText("남은 이동")).toHaveTextContent(
        `남은 이동 ${462 - used} · ${2 - index}개`,
      );
      expect(
        screen.getByRole("button", { name: `+${amount} 이동 완료` }),
      ).toBeDisabled();
    }
    expect(screen.getByLabelText("이동한 식")).toHaveTextContent(
      `248 ${order.map((amount) => `+${amount}`).join(" ")} = 710`,
    );
    expect(screen.queryByText("도착한 수 710")).not.toBeInTheDocument();
    click("도착 확인");
    expect(screen.getByText("도착한 수 710")).toBeInTheDocument();
  });

  it.each([
    { amount: 305, chunks: [300, 5] },
    { amount: 40, chunks: [40] },
    { amount: 7, chunks: [7] },
    { amount: 1000, chunks: [1000] },
  ])("omits zero places and conserves $amount", ({ amount, chunks }) => {
    render(<NumberJourney experiment={journey(0, amount)} />);
    expect(screen.getAllByRole("button", { name: /이동$/ })).toHaveLength(
      chunks.length,
    );
    chunks.forEach(move);
    expectCurrent(amount);
    expect(screen.getByLabelText("남은 이동")).toHaveTextContent(
      "남은 이동 0 · 0개",
    );
  });

  it("connects steps through the actual current state and undoes across the boundary", () => {
    const experiment: JourneyExperiment = {
      ...journey(100, 25),
      steps: [
        { amount: 25, operation: "add" },
        { amount: 12, operation: "subtract", label: "다시 돌아오기" },
      ],
    };
    render(<NumberJourney experiment={experiment} />);
    move(5);
    expect(screen.getByRole("button", { name: "다음 단계 →" })).toBeDisabled();
    move(20);
    click("다음 단계 →");
    expectCurrent(125);
    expect(screen.getByLabelText("이동한 식")).toHaveTextContent(
      "125에서 출발",
    );
    expect(screen.getByText(/앞에서 만든 125에서 계속/)).toBeInTheDocument();
    move(-2);
    expectCurrent(123);
    click("되돌리기");
    expectCurrent(125);
    click("되돌리기");
    expect(screen.getByRole("button", { name: "다음 단계 →" })).toBeEnabled();
    expect(screen.getByLabelText("이동한 식")).toHaveTextContent(
      "100 +5 +20 = 125",
    );
    click("되돌리기");
    expectCurrent(105);
    expect(screen.getByRole("button", { name: "+20 이동" })).toBeEnabled();
    move(20);
    click("다음 단계 →");
    move(-10);
    move(-2);
    expectCurrent(113);
    expect(screen.getByLabelText("이동한 식")).toHaveTextContent(
      "125 −10 −2 = 113",
    );
    click("도착 확인");
    expect(screen.getByText("도착한 수 113")).toBeInTheDocument();
  });

  it("moves left from a known result and continues through negative numbers", () => {
    const experiment: JourneyExperiment = {
      ...journey(42),
      steps: [{ amount: 65, operation: "subtract" }],
    };
    render(<NumberJourney experiment={experiment} />);
    const line = screen.getByRole("img", { name: /수직선/ });
    const marker = line.querySelector<HTMLElement>("span[style]:has(strong)")!;
    const startPosition = parseFloat(marker.style.left);
    move(-60);
    expectCurrent(-18);
    expect(parseFloat(marker.style.left)).toBeLessThan(startPosition);
    const secondPosition = parseFloat(marker.style.left);
    move(-5);
    expectCurrent(-23);
    expect(parseFloat(marker.style.left)).toBeLessThan(secondPosition);
    expect(line).toHaveAccessibleName("수직선: 42 → -18 → -23. 현재 수 -23");
  });

  it("ignores batched duplicate clicks and restores consumed chips on undo/reset", () => {
    render(
      <StrictMode>
        <NumberJourney experiment={journey(100, 25)} />
      </StrictMode>,
    );
    const chip = screen.getByRole("button", { name: "+20 이동" });
    act(() => {
      chip.click();
      chip.click();
    });
    expectCurrent(120);
    expect(screen.getByLabelText("남은 이동")).toHaveTextContent(
      "남은 이동 5 · 1개",
    );
    click("되돌리기");
    expectCurrent(100);
    expect(chip).toBeEnabled();
    move(20);
    move(5);
    click("도착 확인");
    click("되돌리기");
    expect(screen.queryByText("도착한 수 125")).not.toBeInTheDocument();
    expectCurrent(125);
    click("처음부터");
    expectCurrent(100);
    expect(screen.getByLabelText("남은 이동")).toHaveTextContent(
      "남은 이동 25 · 2개",
    );
    expect(screen.getByRole("button", { name: "되돌리기" })).toBeDisabled();
  });

  it("does not skip a step on a repeated next click, including zero amounts", () => {
    const experiment: JourneyExperiment = {
      ...journey(80),
      steps: [
        { amount: 0, operation: "add" },
        { amount: 0, operation: "subtract" },
        { amount: 5, operation: "add" },
      ],
    };
    render(<NumberJourney experiment={experiment} />);
    expect(
      screen.queryByRole("button", { name: /이동$/ }),
    ).not.toBeInTheDocument();
    const next = screen.getByRole("button", { name: "다음 단계 →" });
    act(() => {
      next.click();
      next.click();
    });
    expect(screen.getByText("2/3 단계")).toBeInTheDocument();
    expectCurrent(80);
    click("다음 단계 →");
    move(5);
    expectCurrent(85);
  });

  it("guards every control while disabled and resumes without losing progress", () => {
    const experiment = journey(100, 25);
    const { rerender } = render(
      <NumberJourney experiment={experiment} disabled />,
    );
    screen.getAllByRole("button").forEach((button) => {
      expect(button).toBeDisabled();
      fireEvent.click(button);
    });
    expectCurrent(100);
    rerender(<NumberJourney experiment={experiment} />);
    move(20);
    rerender(<NumberJourney experiment={experiment} disabled />);
    screen.getAllByRole("button").forEach((button) => {
      expect(button).toBeDisabled();
      fireEvent.click(button);
    });
    expectCurrent(120);
    expect(screen.getByLabelText("남은 이동")).toHaveTextContent(
      "남은 이동 5 · 1개",
    );
    rerender(<NumberJourney experiment={experiment} />);
    move(5);
    rerender(<NumberJourney experiment={experiment} disabled />);
    click("도착 확인");
    expect(screen.queryByText("도착한 수 125")).not.toBeInTheDocument();
  });

  it("supports keyboard and touch-style activation inside a form without changing its answer", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <input aria-label="내 답" defaultValue="" />
        <NumberJourney experiment={journey(100, 25)} />
      </form>,
    );
    screen
      .getAllByRole("button")
      .forEach((button) => expect(button).toHaveAttribute("type", "button"));
    screen.getByRole("button", { name: "+5 이동" }).focus();
    await user.keyboard("{Enter}");
    expectCurrent(105);
    await user.pointer([
      {
        keys: "[TouchA>]",
        target: screen.getByRole("button", { name: "+20 이동" }),
      },
      { keys: "[/TouchA]" },
    ]);
    expectCurrent(125);
    screen.getByRole("button", { name: "도착 확인" }).focus();
    await user.keyboard(" ");
    expect(screen.getByText("도착한 수 125")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "내 답" })).toHaveValue("");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("preserves a rerendered experiment and resets when its givens change", () => {
    const experiment = journey(100, 25);
    const { rerender } = render(<NumberJourney experiment={experiment} />);
    move(20);
    rerender(
      <NumberJourney
        experiment={{ ...experiment, steps: [...experiment.steps] }}
      />,
    );
    expectCurrent(120);
    rerender(<NumberJourney experiment={journey(300, 7)} />);
    expectCurrent(300);
    expect(screen.getByLabelText("남은 이동")).toHaveTextContent(
      "남은 이동 7 · 1개",
    );
    expect(screen.getByRole("button", { name: "되돌리기" })).toBeDisabled();
  });
});
