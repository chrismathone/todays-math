import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PrintOptionsPanel } from "@/components/unified/print/PrintOptionsPanel";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
} from "@/components/unified/print/types";

describe("Mathgen print spacing presets", () => {
  it("represents legacy spacing with the nearest preset without rewriting it on render", () => {
    const onOptions = vi.fn();
    render(
      <PrintOptionsPanel
        title="시험지"
        setTitle={vi.fn()}
        options={{
          ...DEFAULT_PRINT_OPTIONS,
          spacing: 26,
          layoutMode: "spacing",
        }}
        meta={DEFAULT_PRINT_META}
        onOptions={onOptions}
        onMeta={vi.fn()}
      />,
    );
    const group = screen.getByRole("group", { name: "세로 배치" });
    expect(within(group).getByRole("button", { name: "보통" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(onOptions).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("spinbutton", { name: "문항 간 여백 (px)" }),
    ).not.toBeInTheDocument();
    for (const [label, spacing] of [
      ["최소", 4],
      ["좁게", 16],
      ["보통", 32],
      ["넓게", 56],
      ["최대", 88],
    ] as const) {
      fireEvent.click(within(group).getByRole("button", { name: label }));
      expect(onOptions).toHaveBeenLastCalledWith({ spacing });
    }
    fireEvent.click(
      within(group).getByRole("button", { name: "문항 수 지정" }),
    );
    expect(onOptions).toHaveBeenLastCalledWith({ layoutMode: "count" });
  });
});
