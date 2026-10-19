import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ArithmeticReview from "@/components/arithmetic/ArithmeticReview";
import {
  buildArithmeticV2Sheet,
  listArithmeticV2Types,
} from "@/lib/arithmetic-v2";
import { arithmeticToStudioProblems } from "@/lib/arithmeticOutput";
import { arithmeticOutputGroups } from "@/lib/arithmeticOutputLayout";

vi.mock("@/components/unified/NativeProblem", () => ({
  default: ({ problem }: { problem: { content: string } }) => (
    <p>{problem.content}</p>
  ),
}));

const types = listArithmeticV2Types().slice(0, 2);
function setup(disabled = false) {
  const sheet = buildArithmeticV2Sheet({
    engineVersion: "arithmetic-engine-v2",
    catalogVersion: "arithmetic-catalog-v2",
    seed: "review-tabs",
    rounds: [1, 2].map(() => ({
      allocations: types.map((type) => ({ typeId: type.id, count: 2 })),
    })),
  });
  const rounds = arithmeticOutputGroups(arithmeticToStudioProblems(sheet));
  const regenerate = vi.fn();
  const props = {
    rounds,
    disabled,
    showAnswers: false,
    onRegenerate: regenerate,
  };
  const view = render(<ArithmeticReview {...props} />);
  return { regenerate, props, ...view };
}

describe("arithmetic review round tabs and scoped controls", () => {
  it("shows only the chosen round and supports arrow, Home and End navigation", () => {
    setup();
    const first = screen.getByRole("tab", { name: "1회차 4문항" });
    const second = screen.getByRole("tab", { name: "2회차 4문항" });
    expect(first).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(second).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("2회차 4문항");
    expect(screen.queryByLabelText("1번 문항 선택")).not.toBeInTheDocument();
    expect(screen.getByLabelText("5번 문항 선택")).toBeInTheDocument();
    fireEvent.keyDown(second, { key: "Home" });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: "End" });
    expect(second).toHaveFocus();
  });

  it("sends exactly checked saved orders from the active round and clears selection on round change", () => {
    const { regenerate } = setup();
    fireEvent.click(screen.getByLabelText("1번 문항 선택"));
    fireEvent.click(screen.getByLabelText("3번 문항 선택"));
    fireEvent.click(
      screen.getByRole("button", { name: "선택한 문항 숫자 바꾸기" }),
    );
    expect(regenerate).toHaveBeenLastCalledWith({ round: 1, orders: [1, 3] });
    fireEvent.click(screen.getByRole("tab", { name: "2회차 4문항" }));
    expect(
      screen.getByRole("button", { name: "선택한 문항 숫자 바꾸기" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByLabelText("6번 문항 선택"));
    fireEvent.click(
      screen.getByRole("button", { name: "선택한 문항 숫자 바꾸기" }),
    );
    expect(regenerate).toHaveBeenLastCalledWith({ round: 2, orders: [2] });
  });

  it("targets only a type section and supports section and round selection", () => {
    const { regenerate } = setup();
    fireEvent.click(screen.getByRole("tab", { name: "2회차 4문항" }));
    const section = screen.getByRole("region", { name: types[1].title });
    fireEvent.click(within(section).getByRole("button"));
    expect(regenerate).toHaveBeenLastCalledWith({ round: 2, orders: [3, 4] });
    fireEvent.click(screen.getByLabelText(`${types[1].title} 문항 모두 선택`));
    expect(screen.getByLabelText("7번 문항 선택")).toBeChecked();
    expect(screen.getByLabelText("8번 문항 선택")).toBeChecked();
    expect(screen.getByLabelText("5번 문항 선택")).not.toBeChecked();
    fireEvent.click(screen.getByLabelText("회차 전체 선택"));
    fireEvent.click(
      screen.getByRole("button", { name: "선택한 문항 숫자 바꾸기" }),
    );
    expect(regenerate).toHaveBeenLastCalledWith({
      round: 2,
      orders: [1, 2, 3, 4],
    });
  });

  it("locks selection and generation while busy without losing the current round", () => {
    const { props, rerender } = setup();
    fireEvent.click(screen.getByRole("tab", { name: "2회차 4문항" }));
    fireEvent.click(screen.getByLabelText("5번 문항 선택"));
    rerender(<ArithmeticReview {...props} disabled />);
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("2회차 4문항");
    for (const input of screen.getAllByRole("checkbox"))
      expect(input).toBeDisabled();
    for (const button of screen.getAllByRole("button"))
      expect(button).toBeDisabled();
    rerender(<ArithmeticReview {...props} />);
    expect(screen.getByLabelText("5번 문항 선택")).toBeChecked();
  });

  it("repeats the regeneration notice next to the section or round it was asked for", () => {
    // The page-top notice sits above a long list; the owner acted at the
    // section button and saw nothing (2026-10-16).
    const { props, rerender } = setup();
    expect(screen.queryByText(/자리만 바꿨습니다/)).toBeNull();
    rerender(
      <ArithmeticReview
        {...props}
        regeneration={{
          target: { round: 1, orders: [3, 4] },
          notice: "2문항은 선택한 문항끼리 자리만 바꿨습니다.",
        }}
      />,
    );
    const section = screen.getByRole("region", { name: types[1].title });
    expect(
      within(section).getByText("2문항은 선택한 문항끼리 자리만 바꿨습니다."),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: types[0].title })).queryByText(
        /자리만/,
      ),
    ).toBeNull();
    rerender(
      <ArithmeticReview
        {...props}
        regeneration={{
          target: { round: 1, orders: [1, 3] },
          notice: "2문항의 숫자를 바꿨습니다.",
        }}
      />,
    );
    const round = screen.getByRole("region", { name: "1회차 문항" });
    expect(
      within(round).getByText("2문항의 숫자를 바꿨습니다."),
    ).toBeInTheDocument();
    for (const type of types)
      expect(
        within(screen.getByRole("region", { name: type.title })).queryByText(
          /숫자를 바꿨습니다/,
        ),
      ).toBeNull();
    rerender(
      <ArithmeticReview
        {...props}
        regeneration={{
          target: { round: 2, orders: [1, 2] },
          notice: "다른 회차",
        }}
      />,
    );
    expect(screen.queryByText("다른 회차")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "2회차 4문항" }));
    expect(
      within(screen.getByRole("region", { name: types[0].title })).getByText(
        "다른 회차",
      ),
    ).toBeInTheDocument();
  });
});
