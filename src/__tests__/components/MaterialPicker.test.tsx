import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, expect, it, vi } from "vitest";
import MaterialPicker from "@/components/exam-builder/MaterialPicker";
import type { BankSourceMaterial } from "@/contracts/bankSource.contract";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
const material = (index: number, available = 4): BankSourceMaterial => ({
  id: `material-${index}`,
  bookId: "book",
  kind: "section",
  kindRaw: "소단원",
  title: `자료 ${index}`,
  chapterNo: null,
  middleNo: null,
  sectionNo: null,
  unitRaw: null,
  semester: null,
  round: null,
  levelRaw: null,
  sequence: index,
  held: 10,
  available,
});
it("blocks empty materials, drops stale empty selections and preserves selections across search", () => {
  const apply = vi.fn();
  render(
    <MaterialPicker
      materials={[material(1, 0), material(2), material(3)]}
      selected={["material-1", "material-2"]}
      bookNames={{ book: "수학 3" }}
      onApply={apply}
      onClose={vi.fn()}
    />,
  );
  expect(screen.getByRole("checkbox", { name: /^자료 1/ })).toBeDisabled();
  expect(screen.getByRole("checkbox", { name: /^자료 1/ })).not.toBeChecked();
  expect(screen.getByRole("checkbox", { name: /^자료 2/ })).toBeChecked();
  fireEvent.change(screen.getByLabelText("자료 검색"), {
    target: { value: "자료 3" },
  });
  fireEvent.click(screen.getByRole("checkbox", { name: /^자료 3/ }));
  fireEvent.click(screen.getByRole("button", { name: "2개 자료 적용" }));
  expect(apply).toHaveBeenCalledWith(["material-2", "material-3"]);
  fireEvent.click(screen.getByRole("button", { name: "선택 비우기" }));
  fireEvent.click(screen.getByRole("button", { name: "모든 자료로 적용" }));
  expect(apply).toHaveBeenLastCalledWith([]);
});
