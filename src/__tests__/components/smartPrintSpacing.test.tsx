import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { PrintOptionsPanel } from "@/components/unified/print/PrintOptionsPanel";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
} from "@/components/unified/print/types";
vi.mock("@/components/unified/print/loadFonts", () => ({
  loadFontPreviews: vi.fn(),
}));

it("shows five spacing choices, maps saved 4 to narrow without changing it, and toggles smart", () => {
  const onOptions = vi.fn();
  render(
    <PrintOptionsPanel
      title="검수"
      setTitle={vi.fn()}
      meta={DEFAULT_PRINT_META}
      options={{ ...DEFAULT_PRINT_OPTIONS, smartSpacing: false, spacing: 4 }}
      onOptions={onOptions}
      onMeta={vi.fn()}
    />,
  );
  expect(screen.queryByRole("button", { name: "최소" })).toBeNull();
  const narrow = screen.getByRole("button", { name: "좁게" });
  expect(narrow.getAttribute("aria-pressed")).toBe("true");
  expect(onOptions).not.toHaveBeenCalled();
  for (const name of ["좁게", "보통", "넓게", "최대", "스마트"])
    expect(screen.getByRole("button", { name })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "스마트" }));
  expect(onOptions).toHaveBeenLastCalledWith({
    smartSpacing: true,
    spacing: 16,
  });
  fireEvent.click(narrow);
  expect(onOptions).toHaveBeenLastCalledWith({
    smartSpacing: false,
    spacing: 16,
  });
});
