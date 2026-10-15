import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GradeArithmeticWorkbench from "@/components/arithmetic/GradeArithmeticWorkbench";
import LegacyArithmeticWorkbench from "@/components/arithmetic/LegacyArithmeticWorkbench";

vi.mock("@/components/unified/WorksheetEditor", () => ({
  default: () => null,
}));

describe.each([
  ["grade", GradeArithmeticWorkbench, "학년별 연산 유형"],
  ["basic", LegacyArithmeticWorkbench, "연산 유형"],
] as const)("%s arithmetic basket", (_name, Workbench, catalogLabel) => {
  const basket = () =>
    within(screen.getByRole("region", { name: "담은 유형 목록" }));
  const checks = () => basket().getAllByRole("checkbox", { name: / 선택$/ });
  const all = () =>
    screen.getByRole("checkbox", { name: "담은 유형 전체 선택" });
  const remove = () => screen.getByRole("button", { name: "선택한 유형 빼기" });
  const cards = () =>
    within(screen.getByLabelText(catalogLabel)).getAllByRole("button");

  it("removes only checked rows across catalog filters, preserving counts, rounds and the generated draft", async () => {
    render(<Workbench canOutput preview />);
    fireEvent.click(cards()[1]);
    fireEvent.click(cards()[2]);
    const quantities = basket().getAllByRole("spinbutton", {
      name: / 문항 수$/,
    });
    const retainedName = quantities[0].getAttribute("aria-label")!;
    fireEvent.change(quantities[0], { target: { value: "7" } });
    fireEvent.change(quantities[2], { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("학습지 제목"), {
      target: { value: "남길 연습지" },
    });
    fireEvent.change(screen.getByLabelText("회차"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "연습지 만들기" }));
    const review = await screen.findByRole("region", {
      name: "생성한 문항 검토",
    });
    const snapshot = review.textContent;
    fireEvent.click(screen.getByRole("button", { name: "1 범위 설정" }));

    expect(remove()).toBeDisabled();
    fireEvent.click(checks()[1]);
    expect(all()).toBePartiallyChecked();
    fireEvent.click(checks()[2]);
    fireEvent.change(screen.getByLabelText("유형 찾기"), {
      target: { value: "없는 검색 결과" },
    });
    fireEvent.click(remove());
    expect(
      basket().getAllByRole("spinbutton", { name: / 문항 수$/ }),
    ).toHaveLength(1);
    expect(screen.getByLabelText(retainedName)).toHaveValue(7);
    expect(screen.getByLabelText("학습지 제목")).toHaveValue("남길 연습지");
    expect(screen.getByLabelText("회차")).toHaveValue(2);
    expect(screen.getByText(/회차당 7문항 · 총 14문항/)).toBeInTheDocument();
    expect(all()).not.toBeChecked();
    expect(all()).not.toBePartiallyChecked();
    expect(remove()).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "2 문항 검토" }));
    expect(
      screen.getByRole("region", { name: "생성한 문항 검토" }).textContent,
    ).toBe(snapshot);
  });

  it("supports select-all, partial selection, deselect-all and removing all without selecting newly added rows", () => {
    render(<Workbench canOutput preview />);
    fireEvent.click(cards()[1]);
    fireEvent.click(all());
    expect(checks().every((input) => (input as HTMLInputElement).checked)).toBe(
      true,
    );
    expect(all()).toBeChecked();
    fireEvent.click(checks()[0]);
    expect(all()).toBePartiallyChecked();
    fireEvent.click(all());
    expect(all()).toBeChecked();
    fireEvent.click(all());
    expect(
      checks().every((input) => !(input as HTMLInputElement).checked),
    ).toBe(true);
    expect(remove()).toBeDisabled();
    fireEvent.click(all());
    fireEvent.click(cards()[2]);
    expect(checks()[2]).not.toBeChecked();
    expect(all()).toBePartiallyChecked();
    fireEvent.click(all());
    fireEvent.click(remove());
    expect(
      basket().queryAllByRole("spinbutton", { name: / 문항 수$/ }),
    ).toHaveLength(0);
    expect(all()).toBeDisabled();
    expect(all()).not.toBeChecked();
    expect(
      screen.getByRole("button", { name: "연습지 만들기" }),
    ).toBeDisabled();
    fireEvent.click(cards()[0]);
    expect(checks()[0]).not.toBeChecked();
    expect(remove()).toBeDisabled();
  });

  it("forgets checked rows removed individually or through a catalog card before re-adding them", () => {
    render(<Workbench canOutput preview />);
    fireEvent.click(cards()[1]);
    fireEvent.click(checks()[1]);
    fireEvent.click(basket().getAllByRole("button", { name: / 빼기$/ })[1]);
    fireEvent.click(cards()[1]);
    expect(checks()[1]).not.toBeChecked();
    fireEvent.click(checks()[1]);
    fireEvent.click(cards()[1]);
    fireEvent.click(cards()[1]);
    expect(checks()[1]).not.toBeChecked();
    expect(remove()).toBeDisabled();
    expect(all()).not.toBePartiallyChecked();
  });
});
