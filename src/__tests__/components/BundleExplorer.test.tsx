import { StrictMode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import BundleExplorer from "@/components/lab/cube31/BundleExplorer";
import type { BundleExperiment } from "@/lib/lab/cube31/explorationTypes";

function experiment(
  counts: BundleExperiment["counts"],
  startPacked = false,
): BundleExperiment {
  return {
    kind: "bundles",
    prompt: "블록을 풀고 묶으며 같은 수를 만들어 보세요.",
    counts,
    startPacked,
  };
}

function expectCounts(counts: readonly number[]) {
  ["백", "십", "일"].forEach((place, index) => {
    expect(
      screen.getByLabelText(`${place} 블록 ${counts[index]}개`),
    ).toBeInTheDocument();
  });
  const total = counts[0] * 100 + counts[1] * 10 + counts[2];
  expect(screen.getByRole("math")).toHaveAccessibleName(
    `현재 블록의 식: ${counts[0] * 100} + ${counts[1] * 10} + ${counts[2]} = ${total}`,
  );
  expect(screen.getByRole("heading")).toHaveTextContent(`모두 ${total}`);
}

function click(name: string) {
  fireEvent.click(screen.getByRole("button", { name }));
}

describe("BundleExplorer", () => {
  it("unpacks the given total, splits actual blocks, and bundles back without changing the total", () => {
    render(
      <StrictMode>
        <BundleExplorer experiment={experiment([2, 10, 12], true)} />
      </StrictMode>,
    );
    expect(screen.queryByRole("math")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /312.*펼쳐 보기/ }),
    ).toBeInTheDocument();
    click("312 펼쳐 보기");
    expectCounts([2, 10, 12]);
    click("백 블록 1개 풀기");
    expectCounts([1, 20, 12]);
    expect(screen.getByRole("status")).toHaveTextContent(
      "백 1개를 십 10개로 풀었어요. 전체는 312 그대로예요.",
    );
    click("십 블록 1개 풀기");
    expectCounts([1, 19, 22]);
    click("일 블록 10개 묶기");
    expectCounts([1, 20, 12]);
    click("십 블록 10개를 백 블록 1개로 묶기");
    expectCounts([2, 10, 12]);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("bundles twelve loose ones and prevents exchanges with insufficient blocks", () => {
    render(<BundleExplorer experiment={experiment([0, 0, 12])} />);
    expect(screen.getByRole("status")).toHaveTextContent("낱개가 10개 이상");
    expect(
      screen.getByRole("button", { name: "십 블록 10개를 백 블록 1개로 묶기" }),
    ).toBeDisabled();
    click("일 블록 10개를 십 블록 1개로 묶기");
    expectCounts([0, 1, 2]);
    const unavailable = screen.getByRole("button", {
      name: "일 블록 10개를 십 블록 1개로 묶기",
    });
    expect(unavailable).toBeDisabled();
    fireEvent.click(unavailable);
    expectCounts([0, 1, 2]);
    click("십 블록 1개 풀기");
    expectCounts([0, 0, 12]);
  });

  it("undoes each exchange and unpacking, and resets to the original noncanonical counts", () => {
    render(<BundleExplorer experiment={experiment([2, 10, 12], true)} />);
    click("312 펼쳐 보기");
    click("백 블록 1개 풀기");
    click("일 블록 10개 묶기");
    expectCounts([1, 21, 2]);
    click("되돌리기");
    expectCounts([1, 20, 12]);
    click("되돌리기");
    expectCounts([2, 10, 12]);
    click("되돌리기");
    expect(screen.queryByRole("math")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "되돌리기" })).toBeDisabled();
    click("312 펼쳐 보기");
    click("십 블록 1개 풀기");
    click("처음으로");
    expect(screen.queryByRole("math")).not.toBeInTheDocument();
    click("312 펼쳐 보기");
    expectCounts([2, 10, 12]);
  });

  it("supports Enter, Space, and touch taps inside a form without submitting", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <BundleExplorer experiment={experiment([2, 0, 0])} />
      </form>,
    );
    screen.getByRole("button", { name: "백 블록 1개 풀기" }).focus();
    await user.keyboard("{Enter} ");
    expectCounts([0, 20, 0]);
    const merge = screen.getByRole("button", {
      name: "십 블록 10개를 백 블록 1개로 묶기",
    });
    merge.focus();
    await user.keyboard("{Enter}");
    expectCounts([1, 10, 0]);
    await user.pointer([
      {
        keys: "[TouchA>]",
        target: screen.getByRole("button", { name: "십 블록 1개 풀기" }),
      },
      { keys: "[/TouchA]" },
    ]);
    expectCounts([1, 9, 10]);
    expect(onSubmit).not.toHaveBeenCalled();
    screen
      .getAllByRole("button")
      .forEach((button) => expect(button).toHaveAttribute("type", "button"));
  });

  it("accepts adjacent drag exchanges but rejects external, same-place, and nonadjacent drops", () => {
    render(<BundleExplorer experiment={experiment([1, 0, 0])} />);
    const dataTransfer = { setData: vi.fn(), effectAllowed: "" };
    const hundred = () =>
      screen.getByRole("button", { name: "백 블록 1개 풀기" });
    const tens = screen.getByRole("group", { name: "십의 자리" });
    fireEvent.drop(tens, { dataTransfer });
    expectCounts([1, 0, 0]);
    fireEvent.dragStart(hundred(), { dataTransfer });
    fireEvent.drop(screen.getByRole("group", { name: "일의 자리" }), {
      dataTransfer,
    });
    expectCounts([1, 0, 0]);
    fireEvent.dragStart(hundred(), { dataTransfer });
    fireEvent.drop(screen.getByRole("group", { name: "백의 자리" }), {
      dataTransfer,
    });
    expectCounts([1, 0, 0]);
    fireEvent.dragStart(hundred(), { dataTransfer });
    fireEvent.dragOver(tens, { dataTransfer });
    fireEvent.drop(tens, { dataTransfer });
    expectCounts([0, 10, 0]);
    fireEvent.dragStart(
      screen.getByRole("button", { name: "십 블록 1개 풀기" }),
      { dataTransfer },
    );
    fireEvent.drop(screen.getByRole("group", { name: "백의 자리" }), {
      dataTransfer,
    });
    expectCounts([1, 0, 0]);
  });

  it("guards clicks, history controls, drag starts, and in-flight drops when disabled", () => {
    const given = experiment([2, 10, 12]);
    const { rerender } = render(<BundleExplorer experiment={given} />);
    click("백 블록 1개 풀기");
    const source = screen.getByRole("button", { name: "백 블록 1개 풀기" });
    const dataTransfer = { setData: vi.fn(), effectAllowed: "" };
    fireEvent.dragStart(source, { dataTransfer });
    rerender(<BundleExplorer experiment={given} disabled />);
    expect(source).toHaveAttribute("draggable", "false");
    fireEvent.drop(screen.getByRole("group", { name: "십의 자리" }), {
      dataTransfer,
    });
    expectCounts([1, 20, 12]);
    dataTransfer.setData.mockClear();
    fireEvent.dragStart(source, { dataTransfer });
    expect(dataTransfer.setData).not.toHaveBeenCalled();
    fireEvent.drop(screen.getByRole("group", { name: "십의 자리" }), {
      dataTransfer,
    });
    screen.getAllByRole("button").forEach((button) => {
      expect(button).toBeDisabled();
      fireEvent.click(button);
    });
    expectCounts([1, 20, 12]);
    rerender(<BundleExplorer experiment={given} />);
    click("되돌리기");
    expectCounts([2, 10, 12]);
  });

  it("does not unpack a disabled tile", () => {
    render(
      <BundleExplorer experiment={experiment([3, 0, 8], true)} disabled />,
    );
    const tile = screen.getByRole("button", { name: /308.*펼쳐 보기/ });
    expect(tile).toBeDisabled();
    fireEvent.click(tile);
    expect(screen.queryByRole("math")).not.toBeInTheDocument();
  });

  it("bounds the visible blocks through repeated splitting while all counts remain accurate", () => {
    const { container } = render(
      <BundleExplorer experiment={experiment([9, 9, 9])} />,
    );
    for (let count = 0; count < 9; count++) click("백 블록 1개 풀기");
    expectCounts([0, 99, 9]);
    for (let count = 0; count < 99; count++) click("십 블록 1개 풀기");
    expectCounts([0, 0, 999]);
    const ones = within(screen.getByRole("group", { name: "일의 자리" }));
    expect(ones.getByText("외 987개")).toBeInTheDocument();
    expect(container.querySelectorAll("*").length).toBeLessThan(120);
    click("처음으로");
    expectCounts([9, 9, 9]);
  });

  it("preserves state on an equivalent rerender and resets for a different experiment", () => {
    const { rerender } = render(
      <BundleExplorer experiment={experiment([1, 2, 3])} />,
    );
    click("백 블록 1개 풀기");
    rerender(<BundleExplorer experiment={experiment([1, 2, 3])} />);
    expectCounts([0, 12, 3]);
    rerender(<BundleExplorer experiment={experiment([4, 0, 2])} />);
    expectCounts([4, 0, 2]);
    expect(screen.getByRole("button", { name: "되돌리기" })).toBeDisabled();
  });
});
