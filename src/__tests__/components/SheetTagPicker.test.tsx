import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import SheetTagPicker from "@/components/unified/print/SheetTagPicker";

afterEach(cleanup);

describe("3단계 «시험 종류» (W8 · Hi-fi 1)", () => {
  it("is one pressed choice among 없음 + the eight, and explains printing and None", () => {
    const onChange = vi.fn();
    render(<SheetTagPicker value="일일TEST" onChange={onChange} />);
    const group = screen.getByRole("group", { name: "시험 종류" });
    expect(
      within(group)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual([
      "없음",
      "일일TEST",
      "주간TEST",
      "단원TEST",
      "숙제",
      "복습",
      "오답",
      "입학TEST",
      "내신대비",
    ]);
    expect(
      within(group).getAllByRole("button", { pressed: true }),
    ).toHaveLength(1);
    expect(
      within(group).getByRole("button", { name: "일일TEST" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(group).toHaveTextContent(
      "모든 양식에 표시합니다. «없음»을 고르면 지면에서 생략합니다.",
    );
    fireEvent.click(within(group).getByRole("button", { name: "숙제" }));
    expect(onChange).toHaveBeenLastCalledWith("숙제");
    fireEvent.click(within(group).getByRole("button", { name: "없음" }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
